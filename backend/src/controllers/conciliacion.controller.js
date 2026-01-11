const { conciliacionQueue } = require('../config/queue');
const { obtenerParametros, parseRetryTime } = require('../services/conciliacion.service');

/**
 * Endpoint para iniciar proceso de conciliación manualmente
 * @route POST /api/v1/conciliacion/iniciar
 */
const iniciarConciliacion = async (req, res, next) => {
	try {
		const { ejecucionId } = req.body;

		// Obtener parámetros para configurar reintentos
		const { VlrReintentos } = await obtenerParametros();
		const maxRetries = Math.max(1, Math.ceil(VlrReintentos / 30000)); // Convertir a número de reintentos (min 1)

		// Calcular backoff exponencial: 30s, 60s, 120s, etc.
		const getBackoff = (attemptsMade) => {
			return Math.min(
				Math.pow(2, attemptsMade) * 30000,
				VlrReintentos || 300000
			);
		};

		// Agregar job a la cola
		const job = await conciliacionQueue.add(
			'process-conciliacion',
			{
				ejecucionId: ejecucionId || null,
				timestamp: new Date().toISOString(),
			},
			{
				attempts: maxRetries,
				backoff: {
					type: 'exponential',
					delay: 30000, // Delay inicial de 30 segundos
				},
				removeOnComplete: {
					age: 3600, // Mantener jobs completados por 1 hora
					count: 100, // Mantener últimos 100 jobs
				},
				removeOnFail: {
					age: 24 * 3600, // Mantener jobs fallidos por 24 horas
				},
			}
		);

		res.status(202).json({
			success: true,
			message: 'Proceso de conciliación iniciado',
			jobId: job.id,
			ejecucionId: ejecucionId || null,
			maxRetries: maxRetries,
		});
	} catch (error) {
		console.error('Error iniciando conciliación:', error);
		next(error);
	}
};

/**
 * Endpoint para obtener el estado de un job de conciliación
 * @route GET /api/v1/conciliacion/estado/:jobId
 */
const obtenerEstadoJob = async (req, res, next) => {
	try {
		const { jobId } = req.params;

		const job = await conciliacionQueue.getJob(jobId);

		if (!job) {
			return res.status(404).json({
				success: false,
				message: 'Job no encontrado',
			});
		}

		const state = await job.getState();
		const progress = job.progress;

		res.status(200).json({
			success: true,
			jobId: job.id,
			state: state,
			progress: progress,
			data: job.data,
			result: job.returnvalue,
			failedReason: job.failedReason,
			attemptsMade: job.attemptsMade,
			timestamp: job.timestamp,
		});
	} catch (error) {
		console.error('Error obteniendo estado del job:', error);
		next(error);
	}
};

module.exports = {
	iniciarConciliacion,
	obtenerEstadoJob,
};

