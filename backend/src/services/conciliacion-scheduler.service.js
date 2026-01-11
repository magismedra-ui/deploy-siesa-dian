const cron = require('node-cron');
const { conciliacionQueue } = require('../config/queue');
const { obtenerParametros, parseRetryTime } = require('./conciliacion.service');
const { getSchedulerEnabled, getCronExpressionn } = require('../config/scheduler.config');

/**
 * Referencia al scheduler activo de conciliación
 */
let conciliacionSchedulerTask = null;

/**
 * Función auxiliar para agregar un job de conciliación a la cola
 */
const ejecutarConciliacionUnaVez = async () => {
	try {
		console.log(
			'[Scheduler Conciliación] Ejecutando proceso de conciliación (modo manual - una sola vez)...'
		);

		// Obtener parámetros para configurar reintentos
		const { VlrReintentos } = await obtenerParametros();
		const maxRetries = Math.max(
			1,
			Math.ceil(VlrReintentos / 30000)
		);

		// Agregar job a la cola
		const job = await conciliacionQueue.add(
			'scheduled-conciliacion',
			{
				ejecucionId: null, // Procesar todos los documentos pendientes
				timestamp: new Date().toISOString(),
				triggeredBy: 'scheduler-manual',
			},
			{
				attempts: maxRetries,
				backoff: {
					type: 'exponential',
					delay: 30000,
				},
				removeOnComplete: {
					age: 3600,
					count: 100,
				},
				removeOnFail: {
					age: 24 * 3600,
				},
			}
		);

		console.log(
			`[Scheduler Conciliación] Job ${job.id} agregado a la cola (ejecución única)`
		);

		return job;
	} catch (error) {
		console.error(
			'[Scheduler Conciliación] Error al agregar job a la cola:',
			error
		);
		throw error;
	}
};

/**
 * Scheduler para ejecutar el proceso de conciliación de forma automática
 * Usa variables globales: schedulerEnabled y cronExpressionn
 * 
 * Comportamiento:
 * - schedulerEnabled === true: Ejecuta conciliación periódicamente según cronExpressionn
 * - schedulerEnabled === false: Ejecuta conciliación UNA SOLA VEZ inmediatamente (sin cron)
 * - schedulerEnabled === null: Deshabilitado completamente
 */
const setupConciliacionScheduler = () => {
	// Detener scheduler existente si existe
	if (conciliacionSchedulerTask) {
		conciliacionSchedulerTask.stop();
		conciliacionSchedulerTask = null;
		console.log('[Scheduler Conciliación] Scheduler anterior detenido');
	}

	// Verificar si el scheduler está habilitado usando variable global
	const schedulerEnabled = getSchedulerEnabled();

	// Si está completamente deshabilitado (null), no configurar scheduler
	if (schedulerEnabled === null) {
		console.log(
			`[Scheduler Conciliación] Scheduler deshabilitado (schedulerEnabled = null)`
		);
		return null;
	}

	// Modo manual (false): ejecutar una sola vez inmediatamente
	if (schedulerEnabled === false) {
		console.log(
			'[Scheduler Conciliación] Modo manual activado (schedulerEnabled=false). Ejecutando conciliación una sola vez...'
		);
		
		// Ejecutar de forma asíncrona sin bloquear
		setImmediate(async () => {
			try {
				await ejecutarConciliacionUnaVez();
			} catch (error) {
				console.error('[Scheduler Conciliación] Error en ejecución manual:', error);
			}
		});

		return null; // No retornar un task de cron porque no se está usando
	}

	// Modo automático (true): configurar scheduler cron periódico
	const cronExpression = getCronExpressionn();

	console.log(
		`[Scheduler Conciliación] Configurando scheduler en modo automático con expresión: ${cronExpression}`
	);

	// Validar expresión cron
	if (!cron.validate(cronExpression)) {
		console.error(
			`[Scheduler Conciliación] Expresión cron inválida: ${cronExpression}. Desactivando scheduler.`
		);
		return null;
	}

	const task = cron.schedule(
		cronExpression,
		async () => {
			try {
				console.log(
					'[Scheduler Conciliación] Ejecutando proceso de conciliación programado...'
				);

				// Obtener parámetros para configurar reintentos
				const { VlrReintentos } = await obtenerParametros();
				const maxRetries = Math.max(
					1,
					Math.ceil(VlrReintentos / 30000)
				);

				// Agregar job a la cola
				const job = await conciliacionQueue.add(
					'scheduled-conciliacion',
					{
						ejecucionId: null, // Procesar todos los documentos pendientes
						timestamp: new Date().toISOString(),
						triggeredBy: 'scheduler',
					},
					{
						attempts: maxRetries,
						backoff: {
							type: 'exponential',
							delay: 30000,
						},
						removeOnComplete: {
							age: 3600,
							count: 100,
						},
						removeOnFail: {
							age: 24 * 3600,
						},
					}
				);

				console.log(
					`[Scheduler Conciliación] Job ${job.id} agregado a la cola`
				);
			} catch (error) {
				console.error(
					'[Scheduler Conciliación] Error al programar job:',
					error
				);
			}
		},
		{
			scheduled: true, // Iniciar automáticamente ya que está habilitado
			timezone: 'America/Bogota', // Configurar timezone para Colombia
		}
	);

	console.log(`[Scheduler Conciliación] Scheduler iniciado y activo en modo automático. Ejecutará cada ${cronExpression}`);
	conciliacionSchedulerTask = task;
	return task;
};

/**
 * Detener scheduler de conciliación
 */
const stopConciliacionScheduler = () => {
	if (conciliacionSchedulerTask) {
		conciliacionSchedulerTask.stop();
		conciliacionSchedulerTask = null;
		console.log('[Scheduler Conciliación] Scheduler detenido');
		return true;
	}
	return false;
};

/**
 * Reiniciar scheduler con nueva configuración
 */
const restartConciliacionScheduler = () => {
	stopConciliacionScheduler();
	return setupConciliacionScheduler();
};

module.exports = {
	setupConciliacionScheduler,
	stopConciliacionScheduler,
	restartConciliacionScheduler,
};

