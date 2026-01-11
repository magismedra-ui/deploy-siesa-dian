const { redisConnection } = require('../config/queue');

/**
 * Configuración del logger
 * Variables de entorno:
 * - LOGS_STREAM_NAME: Nombre del stream (default: 'logs-stream')
 * - LOGS_MAX_LENGTH: Máximo número de registros antes de rotación (default: 2000000)
 * - LOGS_TRIM_APPROXIMATE: Usar aproximación en XTRIM (default: true, más eficiente)
 * - LOGS_RETENTION_DAYS: Días de retención si se usa MINID (default: null, usa MAXLEN)
 */
const STREAM_NAME = process.env.LOGS_STREAM_NAME || 'logs-stream';
const MAX_LENGTH = parseInt(process.env.LOGS_MAX_LENGTH || '2000000', 10);
const TRIM_APPROXIMATE = process.env.LOGS_TRIM_APPROXIMATE !== 'false'; // default true
const RETENTION_DAYS = process.env.LOGS_RETENTION_DAYS
	? parseInt(process.env.LOGS_RETENTION_DAYS, 10)
	: null;

/**
 * Niveles válidos de log
 */
const VALID_LEVELS = ['info', 'warn', 'error'];

/**
 * Validar esquema del log
 */
const validateLogSchema = (data) => {
	const errors = [];

	if (!data.jobId || typeof data.jobId !== 'string') {
		errors.push('jobId es requerido y debe ser string');
	}
	if (!data.proceso || typeof data.proceso !== 'string') {
		errors.push('proceso es requerido y debe ser string');
	}
	if (!data.nivel || !VALID_LEVELS.includes(data.nivel)) {
		errors.push(`nivel debe ser uno de: ${VALID_LEVELS.join(', ')}`);
	}
	if (!data.mensaje || typeof data.mensaje !== 'string') {
		errors.push('mensaje es requerido y debe ser string');
	}

	if (data.duracionSegundos !== undefined && typeof data.duracionSegundos !== 'number') {
		errors.push('duracionSegundos debe ser number si se proporciona');
	}
	if (data.duracionMinutos !== undefined && typeof data.duracionMinutos !== 'number') {
		errors.push('duracionMinutos debe ser number si se proporciona');
	}

	return errors;
};

/**
 * Normalizar y preparar datos para inserción
 */
const normalizeLogData = (data) => {
	const timestamp = Date.now();

	const normalized = {
		jobId: String(data.jobId),
		proceso: String(data.proceso),
		nivel: String(data.nivel).toLowerCase(),
		mensaje: String(data.mensaje),
		timestamp: timestamp.toString(),
	};

	// Agregar duración si está presente
	if (data.duracionSegundos !== undefined) {
		normalized.duracionSegundos = Number(data.duracionSegundos).toString();
	}
	if (data.duracionMinutos !== undefined) {
		normalized.duracionMinutos = Number(data.duracionMinutos).toString();
	}

	return normalized;
};

/**
 * Aplicar política de rotación al stream
 * Ejecuta XTRIM con MAXLEN o MINID según configuración
 */
const applyRotation = async () => {
	try {
		if (RETENTION_DAYS) {
			// Rotación por tiempo: usar MINID
			const minIdTimestamp = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
			const minId = (minIdTimestamp - 0).toString(); // Convertir a ID mínimo

			await redisConnection.xtrim(
				STREAM_NAME,
				'MINID',
				TRIM_APPROXIMATE ? '~' : '=',
				minId
			);
		} else {
			// Rotación por cantidad: usar MAXLEN
			await redisConnection.xtrim(
				STREAM_NAME,
				'MAXLEN',
				TRIM_APPROXIMATE ? '~' : '=',
				MAX_LENGTH
			);
		}
	} catch (error) {
		// No bloquear si falla la rotación, solo loggear
		console.error('[RedisLogger] Error aplicando rotación:', error.message);
	}
};

/**
 * Función principal de logging
 * @param {Object} data - Datos del log
 * @param {string} data.jobId - ID del job
 * @param {string} data.proceso - Nombre del proceso
 * @param {string} data.nivel - Nivel de log (info|warn|error)
 * @param {string} data.mensaje - Mensaje del log
 * @param {number} [data.duracionSegundos] - Duración en segundos (opcional)
 * @param {number} [data.duracionMinutos] - Duración en minutos (opcional)
 * @returns {Promise<string|null>} - ID del log insertado o null si falla
 */
const log = async (data) => {
	try {
		// Validar esquema
		const validationErrors = validateLogSchema(data);
		if (validationErrors.length > 0) {
			console.error('[RedisLogger] Errores de validación:', validationErrors);
			return null;
		}

		// Normalizar datos
		const normalized = normalizeLogData(data);

		// Insertar en Redis Stream
		const logId = await redisConnection.xadd(
			STREAM_NAME,
			'*', // Auto-generar ID
			...Object.entries(normalized).flat()
		);

		// Aplicar rotación de forma asíncrona y no bloqueante
		// Usar setImmediate para no bloquear la ejecución actual
		setImmediate(() => {
			applyRotation().catch((err) => {
				console.error('[RedisLogger] Error en rotación asíncrona:', err.message);
			});
		});

		return logId;
	} catch (error) {
		// No lanzar error para no afectar el Worker
		console.error('[RedisLogger] Error insertando log:', error.message);
		return null;
	}
};

/**
 * Helper para calcular duración en minutos desde segundos
 * @param {number} segundos - Duración en segundos
 * @param {number} decimales - Número de decimales (default: 2)
 * @returns {number} - Duración en minutos
 */
const calcularDuracionMinutos = (segundos, decimales = 2) => {
	if (typeof segundos !== 'number' || segundos < 0) {
		return 0;
	}
	return Math.round((segundos / 60) * Math.pow(10, decimales)) / Math.pow(10, decimales);
};

/**
 * Inicializar el logger y verificar conectividad
 */
const initialize = async () => {
	try {
		// Verificar conexión
		await redisConnection.ping();
		console.log(`[RedisLogger] Inicializado - Stream: ${STREAM_NAME}`);
		if (RETENTION_DAYS) {
			console.log(
				`[RedisLogger] Política de retención: ${RETENTION_DAYS} días`
			);
		} else {
			console.log(
				`[RedisLogger] Política de retención: ${MAX_LENGTH} registros máximo`
			);
		}
		return true;
	} catch (error) {
		console.error('[RedisLogger] Error inicializando:', error.message);
		return false;
	}
};

module.exports = {
	log,
	calcularDuracionMinutos,
	initialize,
	STREAM_NAME,
};

