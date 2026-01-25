const cron = require('node-cron');
const { ejecutarSyncSiesaAutomatico } = require('./sync-facturas.service');
const { getSchedulerEnabled } = require('../config/scheduler.config');

/**
 * Referencia al scheduler activo (SIESA cada 8h en modo automático)
 */
let syncSchedulerTask = null;

/**
 * Configurar scheduler de sincronización SIESA en modo automático de conciliación.
 * - Primera ejecución al activar el modo automático (conteo desde activación).
 * - Luego cada 8 horas (expresión cron: minuto 0, cada 8 horas).
 * - Usa fechaFin = hoy, fechaInicio = hoy - 2 días (YYYYMMDD) y las dos consultas
 *   listar_facturas_servicios y listar_facturas_proveedores.
 */
const setupSyncFacturasScheduler = () => {
	if (syncSchedulerTask) {
		syncSchedulerTask.stop();
		syncSchedulerTask = null;
		console.log('[Sync Scheduler] Scheduler anterior detenido');
	}

	const schedulerEnabled = getSchedulerEnabled();

	if (schedulerEnabled !== true) {
		console.log(
			`[Sync Scheduler] Scheduler deshabilitado (schedulerEnabled = ${schedulerEnabled})`
		);
		return null;
	}

	// Cada 8 horas: 0:00, 8:00, 16:00 (America/Bogota)
	const cronExpression = '0 */8 * * *';

	if (!cron.validate(cronExpression)) {
		console.error(
			`[Sync Scheduler] Expresión cron inválida: ${cronExpression}`
		);
		return null;
	}

	console.log(
		'[Sync Scheduler] Modo automático: primera sincronización SIESA al activar; luego cada 8 horas.'
	);

	// Primera ejecución al activar el modo automático (conteo inicia aquí)
	setImmediate(async () => {
		try {
			console.log(
				'[Sync Scheduler] Ejecutando primera sincronización SIESA (activación modo automático)...'
			);
			await ejecutarSyncSiesaAutomatico('activacion-modo-automatico');
		} catch (error) {
			console.error(
				'[Sync Scheduler] Error en primera sincronización SIESA:',
				error
			);
		}
	});

	syncSchedulerTask = cron.schedule(
		cronExpression,
		async () => {
			try {
				console.log(
					'[Sync Scheduler] Ejecutando sincronización SIESA programada (cada 8h)...'
				);
				await ejecutarSyncSiesaAutomatico('scheduler-8h');
			} catch (error) {
				console.error(
					'[Sync Scheduler] Error en sincronización programada:',
					error
				);
			}
		},
		{
			scheduled: true,
			timezone: 'America/Bogota',
		}
	);

	console.log(
		'[Sync Scheduler] Scheduler SIESA cada 8h iniciado (modo automático)'
	);
	return syncSchedulerTask;
};

/**
 * Detener scheduler de sincronización
 */
const stopSyncFacturasScheduler = () => {
	if (syncSchedulerTask) {
		syncSchedulerTask.stop();
		syncSchedulerTask = null;
		console.log('[Sync Scheduler] Scheduler detenido');
		return true;
	}
	return false;
};

/**
 * Reiniciar scheduler con nueva configuración
 */
const restartSyncFacturasScheduler = () => {
	stopSyncFacturasScheduler();
	return setupSyncFacturasScheduler();
};

module.exports = {
	setupSyncFacturasScheduler,
	stopSyncFacturasScheduler,
	restartSyncFacturasScheduler,
};

