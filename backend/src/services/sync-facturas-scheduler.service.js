const cron = require('node-cron');
const { ejecutarSyncFacturas } = require('./sync-facturas.service');
const { getSchedulerEnabled } = require('../config/scheduler.config');

/**
 * Referencia al scheduler activo
 */
let syncSchedulerTask = null;

/**
 * Configurar scheduler de sincronización de facturas
 * Ejecuta cada 12 horas cuando schedulerEnabled === true
 */
const setupSyncFacturasScheduler = () => {
	// Detener scheduler existente si existe
	if (syncSchedulerTask) {
		syncSchedulerTask.stop();
		syncSchedulerTask = null;
		console.log('[Sync Scheduler] Scheduler anterior detenido');
	}

	// Verificar si está habilitado
	const schedulerEnabled = getSchedulerEnabled();

	if (schedulerEnabled !== true) {
		console.log(
			`[Sync Scheduler] Scheduler deshabilitado (schedulerEnabled = ${schedulerEnabled})`
		);
		return null;
	}

	// Expresión cron: cada 12 horas (0 */12 * * *)
	const cronExpression = '0 */12 * * *';

	console.log(
		`[Sync Scheduler] Configurando scheduler de sincronización con expresión: ${cronExpression} (cada 12 horas)`
	);

	// Validar expresión cron
	if (!cron.validate(cronExpression)) {
		console.error(
			`[Sync Scheduler] Expresión cron inválida: ${cronExpression}`
		);
		return null;
	}

	// Crear scheduler
	syncSchedulerTask = cron.schedule(
		cronExpression,
		async () => {
			try {
				console.log(
					'[Sync Scheduler] Ejecutando sincronización programada cada 12 horas...'
				);
				await ejecutarSyncFacturas('scheduler-12h');
			} catch (error) {
				console.error(
					'[Sync Scheduler] Error en ejecución programada:',
					error
				);
			}
		},
		{
			scheduled: true,
			timezone: 'America/Bogota',
		}
	);

	console.log('[Sync Scheduler] Scheduler de sincronización iniciado y activo');
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

