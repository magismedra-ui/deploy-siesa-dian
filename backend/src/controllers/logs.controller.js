const { redisConnection } = require('../config/queue');
const { STREAM_NAME } = require('../logger/redisLogger');

/**
 * Convertir entrada de Redis Stream a objeto normalizado
 */
const normalizeStreamEntry = (id, fields) => {
	const entry = {
		id: id,
		timestamp: null,
	};

	// Convertir array alternado [key1, val1, key2, val2, ...] a objeto
	for (let i = 0; i < fields.length; i += 2) {
		const key = fields[i];
		const value = fields[i + 1];

		// Convertir valores numéricos y timestamps
		if (key === 'timestamp' || key === 'duracionSegundos' || key === 'duracionMinutos') {
			entry[key] = parseFloat(value) || 0;
		} else {
			entry[key] = value;
		}
	}

	return entry;
};

/**
 * Aplicar filtros a los logs
 */
const applyFilters = (logs, filters) => {
	return logs.filter((log) => {
		// Filtro por jobId
		if (filters.jobId && log.jobId !== filters.jobId) {
			return false;
		}

		// Filtro por niveles
		if (filters.niveles && filters.niveles.length > 0) {
			if (!filters.niveles.includes(log.nivel)) {
				return false;
			}
		}

		// Filtro por rango de tiempo
		if (filters.from && log.timestamp < filters.from) {
			return false;
		}
		if (filters.to && log.timestamp > filters.to) {
			return false;
		}

		// Filtro por duración mínima
		if (
			filters.duracionMin !== undefined &&
			(log.duracionSegundos === undefined || log.duracionSegundos < filters.duracionMin)
		) {
			return false;
		}

		// Filtro por duración máxima
		if (
			filters.duracionMax !== undefined &&
			log.duracionSegundos !== undefined &&
			log.duracionSegundos > filters.duracionMax
		) {
			return false;
		}

		return true;
	});
};

/**
 * Endpoint GET /logs - Consulta histórica avanzada
 * Query params:
 * - limit (default 100, max 1000)
 * - jobId (opcional)
 * - niveles (info,warn,error) - separado por comas
 * - from (timestamp ms)
 * - to (timestamp ms)
 * - duracionMin (segundos, opcional)
 * - duracionMax (segundos, opcional)
 */
const getLogs = async (req, res, next) => {
	try {
		// Validar y parsear parámetros
		let limit = parseInt(req.query.limit || '100', 10);
		limit = Math.min(Math.max(limit, 1), 1000); // Entre 1 y 1000

		const jobId = req.query.jobId ? String(req.query.jobId) : null;

		let niveles = null;
		if (req.query.niveles) {
			niveles = String(req.query.niveles)
				.split(',')
				.map((n) => n.trim().toLowerCase())
				.filter((n) => ['info', 'warn', 'error'].includes(n));
			if (niveles.length === 0) {
				niveles = null;
			}
		}

		let from = null;
		if (req.query.from) {
			from = parseInt(req.query.from, 10);
			if (isNaN(from) || from < 0) {
				return res.status(400).json({
					success: false,
					error: 'Parámetro "from" debe ser un timestamp válido en milisegundos',
				});
			}
		}

		let to = null;
		if (req.query.to) {
			to = parseInt(req.query.to, 10);
			if (isNaN(to) || to < 0) {
				return res.status(400).json({
					success: false,
					error: 'Parámetro "to" debe ser un timestamp válido en milisegundos',
				});
			}
		}

		// Validar rango temporal
		if (from && to && from > to) {
			return res.status(400).json({
				success: false,
				error: 'El parámetro "from" debe ser menor o igual que "to"',
			});
		}

		let duracionMin = undefined;
		if (req.query.duracionMin) {
			duracionMin = parseFloat(req.query.duracionMin);
			if (isNaN(duracionMin) || duracionMin < 0) {
				return res.status(400).json({
					success: false,
					error: 'Parámetro "duracionMin" debe ser un número positivo',
				});
			}
		}

		let duracionMax = undefined;
		if (req.query.duracionMax) {
			duracionMax = parseFloat(req.query.duracionMax);
			if (isNaN(duracionMax) || duracionMax < 0) {
				return res.status(400).json({
					success: false,
					error: 'Parámetro "duracionMax" debe ser un número positivo',
				});
			}
		}

		// Validar rango de duración
		if (
			duracionMin !== undefined &&
			duracionMax !== undefined &&
			duracionMin > duracionMax
		) {
			return res.status(400).json({
				success: false,
				error: 'El parámetro "duracionMin" debe ser menor o igual que "duracionMax"',
			});
		}

		// Construir filtros
		const filters = {
			jobId,
			niveles,
			from,
			to,
			duracionMin,
			duracionMax,
		};

		// Leer desde el stream usando XREVRANGE (descendente por timestamp)
		// Leer más registros de los necesarios para compensar filtros
		const readLimit = Math.min(limit * 10, 10000); // Leer hasta 10x o 10000 como máximo

		let streamEntries;
		if (from && to) {
			// Si hay rango temporal, usar MINID y MAXID (convertir timestamps a IDs aproximados)
			const minId = (from - 0).toString();
			const maxId = (to + 1).toString();
			streamEntries = await redisConnection.xrevrange(
				STREAM_NAME,
				maxId,
				minId,
				'COUNT',
				readLimit
			);
		} else {
			// Leer los últimos N registros
			streamEntries = await redisConnection.xrevrange(
				STREAM_NAME,
				'+', // ID más reciente
				'-', // ID más antiguo
				'COUNT',
				readLimit
			);
		}

		// Normalizar entradas
		let logs = streamEntries.map(([id, fields]) => normalizeStreamEntry(id, fields));

		// Aplicar filtros
		logs = applyFilters(logs, filters);

		// Limitar resultados finales
		logs = logs.slice(0, limit);

		// Ordenar descendente por timestamp
		logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

		res.status(200).json({
			success: true,
			count: logs.length,
			logs: logs,
		});
	} catch (error) {
		console.error('[Logs Controller] Error obteniendo logs:', error);
		next(error);
	}
};

/**
 * Endpoint GET /logs/stream - Streaming en tiempo real con SSE
 * Query params opcionales:
 * - jobId (opcional)
 * - niveles (info,warn,error) - separado por comas
 */
const streamLogs = async (req, res, next) => {
	// Configurar headers SSE
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.setHeader('X-Accel-Buffering', 'no'); // Deshabilitar buffering en Nginx si existe

	// Parsear filtros
	let niveles = null;
	if (req.query.niveles) {
		niveles = String(req.query.niveles)
			.split(',')
			.map((n) => n.trim().toLowerCase())
			.filter((n) => ['info', 'warn', 'error'].includes(n));
		if (niveles.length === 0) {
			niveles = null;
		}
	}

	const jobId = req.query.jobId ? String(req.query.jobId) : null;

	let lastId = '$'; // Comenzar desde el último ID del stream

	const filters = {
		jobId,
		niveles,
	};

	// Función para enviar logs
	const sendLog = (log) => {
		// Aplicar filtros antes de enviar
		if (filters.jobId && log.jobId !== filters.jobId) {
			return;
		}
		if (filters.niveles && filters.niveles.length > 0) {
			if (!filters.niveles.includes(log.nivel)) {
				return;
			}
		}

		try {
			res.write(`data: ${JSON.stringify(log)}\n\n`);
		} catch (error) {
			console.error('[Logs Controller] Error enviando log en SSE:', error);
		}
	};

	// Función para enviar los últimos logs existentes al conectarse
	const sendRecentLogs = async () => {
		try {
			// Leer los últimos 50 logs del stream
			const streamEntries = await redisConnection.xrevrange(
				STREAM_NAME,
				'+', // ID más reciente
				'-', // ID más antiguo
				'COUNT',
				50
			);

			if (streamEntries && streamEntries.length > 0) {
				// Normalizar y enviar en orden cronológico (más antiguo primero)
				const logs = streamEntries
					.reverse() // Invertir para enviar del más antiguo al más reciente
					.map(([id, fields]) => normalizeStreamEntry(id, fields));

				// Enviar mensaje inicial indicando que se están enviando logs históricos
				res.write(
					`data: ${JSON.stringify({ type: 'history', count: logs.length, message: `Enviando ${logs.length} logs recientes...` })}\n\n`
				);

				// Enviar cada log
				for (const log of logs) {
					sendLog(log);
				}

				// Actualizar lastId al último ID enviado
				if (streamEntries.length > 0) {
					lastId = streamEntries[streamEntries.length - 1][0];
				}

				// Enviar mensaje de finalización de historial
				res.write(
					`data: ${JSON.stringify({ type: 'history_complete', message: 'Logs históricos enviados. Esperando nuevos logs...' })}\n\n`
				);
			} else {
				// No hay logs aún
				res.write(
					`data: ${JSON.stringify({ type: 'connected', message: 'Conectado al stream de logs. No hay logs históricos.' })}\n\n`
				);
			}
		} catch (error) {
			console.error('[Logs Controller] Error enviando logs recientes:', error);
			res.write(
				`data: ${JSON.stringify({ type: 'error', message: `Error cargando logs históricos: ${error.message}` })}\n\n`
			);
		}
	};

	// Enviar logs recientes al conectarse
	await sendRecentLogs();

	// Función de lectura continua
	const readStream = async () => {
		try {
			while (!res.writableEnded) {
				// Leer nuevos mensajes del stream
				// BLOCK 1000ms para evitar polling constante, pero no bloquear demasiado
				const streams = await redisConnection.xread(
					'BLOCK',
					1000,
					'STREAMS',
					STREAM_NAME,
					lastId
				);

				if (streams && streams.length > 0) {
					const [streamName, entries] = streams[0];

					if (entries && entries.length > 0) {
						for (const [id, fields] of entries) {
							lastId = id;
							const log = normalizeStreamEntry(id, fields);
							sendLog(log);
						}
					}
				}

				// Enviar keepalive solo si no hubo nuevos logs (cada 30 segundos aproximadamente)
				// Reducir frecuencia de keepalive para evitar ruido
				if (!streams || streams.length === 0) {
					// Solo enviar keepalive ocasionalmente, no en cada iteración
					const now = Date.now();
					if (!req._lastKeepalive || now - req._lastKeepalive > 30000) {
						res.write(': keepalive\n\n');
						req._lastKeepalive = now;
					}
				}
			}
		} catch (error) {
			if (!res.writableEnded) {
				console.error('[Logs Controller] Error en stream SSE:', error);
				try {
					res.write(
						`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
					);
				} catch (e) {
					// Cliente desconectado
				}
			}
		}
	};

	// Iniciar lectura del stream
	readStream();

	// Limpiar cuando el cliente se desconecta
	req.on('close', () => {
		res.end();
	});
};

module.exports = {
	getLogs,
	streamLogs,
};

