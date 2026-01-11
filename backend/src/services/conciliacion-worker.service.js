const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const { procesarConciliacion, obtenerParametros, parseRetryTime } = require('./conciliacion.service');
const { log, calcularDuracionMinutos } = require('../logger/redisLogger');

// Mapa para almacenar startTime por jobId
const jobStartTimes = new Map();

const setupConciliacionWorker = () => {
	console.log('Inicializando Worker de Conciliación...');

	const worker = new Worker(
		'conciliacion-process',
		async (job) => {
			const { ejecucionId } = job.data;
			const jobId = String(job.id);
			const startTime = Date.now();

			// Guardar startTime
			jobStartTimes.set(jobId, startTime);

			console.log(
				`[Worker Conciliación] Procesando Job ${job.id}${ejecucionId ? ` para ejecución ${ejecucionId}` : ''}`
			);

			// Log de inicio
			await log({
				jobId: jobId,
				proceso: 'conciliacion-process',
				nivel: 'info',
				mensaje: `Inicio de proceso de conciliación${ejecucionId ? `. Ejecución ID: ${ejecucionId}` : ' (todas las ejecuciones)'}`,
			});

			try {
				// Log de progreso al iniciar procesamiento
				await log({
					jobId: jobId,
					proceso: 'conciliacion-process',
					nivel: 'info',
					mensaje: 'Consultando documentos pendientes para conciliación...',
				});

				const resultado = await procesarConciliacion(ejecucionId);

				// Calcular duración
				const endTime = Date.now();
				const duracionMs = endTime - startTime;
				const duracionSegundos = duracionMs / 1000;
				const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

				console.log(
					`[Worker Conciliación] Job ${job.id} completado exitosamente`
				);

				// Log de finalización exitosa
				await log({
					jobId: jobId,
					proceso: 'conciliacion-process',
					nivel: 'info',
					mensaje: `Conciliación completada. Registros procesados: ${resultado.registrosProcesados}, Grupos emparejables: ${resultado.gruposEmparejables}`,
					duracionSegundos: duracionSegundos,
					duracionMinutos: duracionMinutos,
				});

				// Limpiar startTime
				jobStartTimes.delete(jobId);

				return resultado;
			} catch (error) {
				console.error(`[Worker Conciliación] Error en Job ${job.id}:`, error);

				// Calcular duración parcial
				const endTime = Date.now();
				const startTimeRecorded = jobStartTimes.get(jobId) || startTime;
				const duracionMs = endTime - startTimeRecorded;
				const duracionSegundos = duracionMs / 1000;
				const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

				// Log de error
				await log({
					jobId: jobId,
					proceso: 'conciliacion-process',
					nivel: 'error',
					mensaje: `Error en proceso de conciliación: ${error.message}`,
					duracionSegundos: duracionSegundos,
					duracionMinutos: duracionMinutos,
				});

				// Limpiar startTime
				jobStartTimes.delete(jobId);

				throw error;
			}
		},
		{
			connection: redisConnection,
			concurrency: 1, // Procesar un job a la vez para evitar conflictos
			limiter: {
				max: 1,
				duration: 1000, // Máximo 1 job por segundo
			},
		}
	);

	// Configurar reintentos dinámicos basados en parámetros
	worker.on('failed', async (job, err) => {
		console.error(
			`[Worker Conciliación] Job ${job?.id} falló: ${err.message}`
		);

		// Si el job tiene más reintentos disponibles, calcular backoff exponencial
		if (job && job.attemptsMade < job.opts.attempts) {
			const { VlrReintentos } = await obtenerParametros();
			const backoffDelay = Math.min(
				Math.pow(2, job.attemptsMade) * 30000, // Backoff exponencial base: 30s, 60s, 120s, etc.
				VlrReintentos || 300000 // Máximo según parámetro (default 5 minutos)
			);

			console.log(
				`[Worker Conciliación] Reintentando job ${job.id} en ${backoffDelay}ms (intento ${job.attemptsMade + 1}/${job.opts.attempts})`
			);
		}
	});

	worker.on('completed', async (job) => {
		console.log(`[Worker Conciliación] Job ${job.id} completado exitosamente`);
		// El log de finalización ya se maneja dentro del job handler
	});

	worker.on('error', async (err) => {
		console.error('[Worker Conciliación] Error en worker:', err);
		// Log de error crítico del worker
		await log({
			jobId: 'worker-error',
			proceso: 'conciliacion-process',
			nivel: 'error',
			mensaje: `Error crítico en worker de conciliación: ${err.message}`,
		});
	});

	return worker;
};

module.exports = { setupConciliacionWorker };

