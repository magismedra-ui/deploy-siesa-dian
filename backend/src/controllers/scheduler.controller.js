const {
	getSchedulerEnabled,
	getCronExpressionn,
	updateSchedulerConfig,
	validateCronExpression,
} = require('../config/scheduler.config');
const {
	setupSyncFacturasScheduler,
	stopSyncFacturasScheduler,
	restartSyncFacturasScheduler,
} = require('../services/sync-facturas-scheduler.service');
const {
	setupConciliacionScheduler,
	stopConciliacionScheduler,
	restartConciliacionScheduler,
} = require('../services/conciliacion-scheduler.service');
const { ejecutarSyncFacturas, getLastExecution, isSyncRunning } = require('../services/sync-facturas.service');
const { log } = require('../logger/redisLogger');

/**
 * Endpoint POST /api/v1/scheduler/config
 * Configurar scheduler dinámicamente.
 * Los schedulers se ejecutan en el servidor de forma independiente;
 * cerrar el frontend no detiene las tareas programadas (sync SIESA cada 8h y conciliación).
 */
const configScheduler = async (req, res, next) => {
	try {
		const { schedulerEnabled, cronExpressionn } = req.body;

		// Validar schedulerEnabled
		if (schedulerEnabled !== undefined) {
			if (schedulerEnabled !== null && schedulerEnabled !== false && schedulerEnabled !== true) {
				return res.status(400).json({
					success: false,
					error: 'schedulerEnabled debe ser null, false o true',
				});
			}
		}

		// Validar cronExpressionn
		if (cronExpressionn !== undefined) {
			if (typeof cronExpressionn !== 'string' || !cronExpressionn.trim()) {
				return res.status(400).json({
					success: false,
					error: 'cronExpressionn debe ser un string válido',
				});
			}

			if (!validateCronExpression(cronExpressionn)) {
				return res.status(400).json({
					success: false,
					error: `Expresión cron inválida: ${cronExpressionn}`,
				});
			}
		}

		// Obtener valores actuales
		const currentEnabled = getSchedulerEnabled();
		const currentCron = getCronExpressionn();

		// Actualizar configuración
		const newEnabled = schedulerEnabled !== undefined ? schedulerEnabled : currentEnabled;
		const newCron = cronExpressionn !== undefined ? cronExpressionn : currentCron;

		updateSchedulerConfig(newEnabled, newCron);

		console.log(
			`[Scheduler Config] Configuración actualizada: schedulerEnabled=${newEnabled}, cronExpressionn=${newCron}`
		);

		// Aplicar cambios inmediatamente
		// Envolver cada operación en try-catch para que errores no impidan la respuesta

		// 1. Controlar scheduler de sincronización de facturas
		try {
			if (newEnabled === true) {
				// Habilitar scheduler de sincronización SIESA (cada 8 h, primera al activar)
				restartSyncFacturasScheduler();
			} else {
				// Deshabilitar (manual o pausar)
				stopSyncFacturasScheduler();
			}
		} catch (error) {
			console.error('[Scheduler Config] Error al controlar scheduler de sincronización:', error);
		}

		// 2. Controlar scheduler de conciliación
		try {
			if (newEnabled === true || newEnabled === false) {
				// Habilitar scheduler de conciliación con nueva expresión cron
				// Tanto para true como false, se ejecuta si hay cronExpressionn configurado
				// Reiniciar siempre para aplicar cambios de cron
				restartConciliacionScheduler();
			} else {
				// null = Pausar: detener completamente
				stopConciliacionScheduler();
			}
		} catch (error) {
			console.error('[Scheduler Config] Error al controlar scheduler de conciliación:', error);
		}

		// 3. Log en tiempo real cuando se activa Pausar (para que aparezca en el frontend)
		if (newEnabled === null) {
			console.log('[Scheduler Config] Modo pausa activado. Sincronización SIESA y conciliación programada detenidas.');
			try {
				await log({
					jobId: `scheduler-pausa-${Date.now()}`,
					proceso: 'scheduler-config',
					nivel: 'info',
					mensaje: 'Modo pausa activado. Sincronización SIESA (cada 8h) y conciliación programada han sido detenidas. No se ejecutarán tareas automáticas hasta que reactive Automatico o Manual.',
				});
			} catch (logErr) {
				console.warn('[Scheduler Config] No se pudo escribir log de pausa en Redis:', logErr.message);
			}
		}

		// Siempre enviar respuesta exitosa después de actualizar la configuración
		return res.status(200).json({
			success: true,
			message: 'Configuración del scheduler actualizada',
			config: {
				schedulerEnabled: newEnabled,
				cronExpressionn: newCron,
				previous: {
					schedulerEnabled: currentEnabled,
					cronExpressionn: currentCron,
				},
			},
		});
	} catch (error) {
		console.error('[Scheduler Config] Error:', error);
		next(error);
	}
};

/**
 * Endpoint GET /api/v1/scheduler/config
 * Obtener configuración actual del scheduler
 */
const getSchedulerConfig = async (req, res, next) => {
	try {
		const config = {
			schedulerEnabled: getSchedulerEnabled(),
			cronExpressionn: getCronExpressionn(),
		};

		res.status(200).json({
			success: true,
			config: config,
		});
	} catch (error) {
		console.error('[Scheduler Config] Error obteniendo configuración:', error);
		next(error);
	}
};

/**
 * Endpoint POST /api/v1/scheduler/sync-facturas
 * Ejecutar sincronización de facturas manualmente
 */
const ejecutarSyncFacturasManual = async (req, res, next) => {
	try {
		// Verificar si ya está ejecutándose
		if (isSyncRunning()) {
			return res.status(409).json({
				success: false,
				message: 'La sincronización ya está en ejecución. Espere a que finalice.',
				running: true,
			});
		}

		// Ejecutar de forma asíncrona para no bloquear la respuesta
		const resultado = await ejecutarSyncFacturas('manual-endpoint');

		if (resultado.success) {
			res.status(200).json({
				success: true,
				message: resultado.message,
				resultado: {
					ejecucionId: resultado.ejecucionId,
					registrosProcesados: resultado.registrosProcesados,
					duracionSegundos: resultado.duracionSegundos,
					duracionMinutos: resultado.duracionMinutos,
				},
			});
		} else {
			res.status(500).json({
				success: false,
				message: resultado.message,
				error: resultado.error,
				duracionSegundos: resultado.duracionSegundos,
			});
		}
	} catch (error) {
		console.error('[Scheduler] Error ejecutando sync manual:', error);
		next(error);
	}
};

/**
 * Endpoint GET /api/v1/scheduler/sync-facturas/status
 * Obtener estado de la última ejecución de sincronización
 */
const getSyncFacturasStatus = async (req, res, next) => {
	try {
		const lastExecution = getLastExecution();
		const running = isSyncRunning();

		res.status(200).json({
			success: true,
			running: running,
			lastExecution: lastExecution,
		});
	} catch (error) {
		console.error('[Scheduler] Error obteniendo estado:', error);
		next(error);
	}
};

module.exports = {
	configScheduler,
	getSchedulerConfig,
	ejecutarSyncFacturasManual,
	getSyncFacturasStatus,
};

