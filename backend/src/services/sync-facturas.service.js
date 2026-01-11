const { log, calcularDuracionMinutos } = require('../logger/redisLogger');
const { syncFacturasInterno } = require('../controllers/siesa.controller');

/**
 * Instancia única de ejecución para evitar concurrencia
 */
let isRunning = false;
let lastExecution = null;

/**
 * Obtener fechas para la sincronización (últimos 30 días por defecto)
 */
const getSyncDateRange = () => {
	const fechaFin = new Date();
	const fechaInicio = new Date();
	fechaInicio.setDate(fechaInicio.getDate() - 30); // Últimos 30 días

	return {
		fechaInicio: fechaInicio.toISOString().split('T')[0], // YYYY-MM-DD
		fechaFin: fechaFin.toISOString().split('T')[0],
	};
};

/**
 * Ejecutar sincronización de facturas
 * Hace POST interno a /api/v1/siesa/facturas
 */
const ejecutarSyncFacturas = async (triggeredBy = 'manual') => {
	// Prevenir ejecuciones concurrentes
	if (isRunning) {
		const errorMsg = 'Sincronización ya está en ejecución. Espere a que finalice.';
		console.warn(`[Sync Facturas] ${errorMsg}`);
		await log({
			jobId: 'sync-facturas-concurrente',
			proceso: 'sync-facturas',
			nivel: 'warn',
			mensaje: errorMsg,
		});
		return {
			success: false,
			message: errorMsg,
			alreadyRunning: true,
		};
	}

	isRunning = true;
	const startTime = Date.now();
	const jobId = `sync-facturas-${Date.now()}`;

	try {
		// Log de inicio
		await log({
			jobId: jobId,
			proceso: 'sync-facturas',
			nivel: 'info',
			mensaje: `Inicio de sincronización de facturas. Triggered by: ${triggeredBy}`,
		});

		// Obtener rango de fechas (últimos 30 días)
		const { fechaInicio, fechaFin } = getSyncDateRange();

		console.log(
			`[Sync Facturas] Iniciando sincronización desde ${fechaInicio} hasta ${fechaFin}`
		);

		// Obtener usuario del sistema (usar ID 1 para sincronización automática)
		const usuarioId = 1;

		let resultado;
		let attempts = 0;
		const maxAttempts = 3;

		// Reintentos controlados
		while (attempts < maxAttempts) {
			try {
				attempts++;
				
				// Llamar función interna directamente (más eficiente que HTTP)
				resultado = await syncFacturasInterno(fechaInicio, fechaFin, usuarioId);
				break; // Éxito, salir del loop
			} catch (error) {
				if (attempts < maxAttempts) {
					const waitTime = Math.pow(2, attempts) * 1000; // Backoff exponencial: 2s, 4s, 8s
					console.warn(
						`[Sync Facturas] Intento ${attempts} falló. Reintentando en ${waitTime}ms...`
					);
					await log({
						jobId: jobId,
						proceso: 'sync-facturas',
						nivel: 'warn',
						mensaje: `Intento ${attempts} de sincronización falló: ${error.message}. Reintentando...`,
					});
					await new Promise((resolve) => setTimeout(resolve, waitTime));
				} else {
					// Todos los intentos fallaron
					throw error;
				}
			}
		}

		// Calcular duración
		const endTime = Date.now();
		const duracionMs = endTime - startTime;
		const duracionSegundos = duracionMs / 1000;
		const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

		// Log de éxito
		await log({
			jobId: jobId,
			proceso: 'sync-facturas',
			nivel: 'info',
			mensaje: `Sincronización completada exitosamente. Ejecución ID: ${resultado.ejecucionId}, Registros procesados: ${resultado.registrosProcesados}`,
			duracionSegundos: duracionSegundos,
			duracionMinutos: duracionMinutos,
		});

		lastExecution = {
			success: true,
			timestamp: new Date(),
			ejecucionId: resultado.ejecucionId,
			registrosProcesados: resultado.registrosProcesados,
			duracionSegundos,
		};

		console.log(
			`[Sync Facturas] Sincronización completada en ${duracionSegundos.toFixed(2)}s`
		);

		return {
			success: true,
			ejecucionId: resultado.ejecucionId,
			registrosProcesados: resultado.registrosProcesados,
			duracionSegundos,
			duracionMinutos,
			message: resultado.message,
		};
	} catch (error) {
		// Calcular duración parcial
		const endTime = Date.now();
		const duracionMs = endTime - startTime;
		const duracionSegundos = duracionMs / 1000;
		const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

		const errorMessage =
			error.response?.data?.message ||
			error.message ||
			'Error desconocido en sincronización';

		// Log de error
		await log({
			jobId: jobId,
			proceso: 'sync-facturas',
			nivel: 'error',
			mensaje: `Error en sincronización: ${errorMessage}. Intentos: ${attempts || 1}`,
			duracionSegundos: duracionSegundos,
			duracionMinutos: duracionMinutos,
		});

		console.error('[Sync Facturas] Error:', errorMessage);

		lastExecution = {
			success: false,
			timestamp: new Date(),
			error: errorMessage,
			duracionSegundos,
		};

		return {
			success: false,
			error: errorMessage,
			duracionSegundos,
			duracionMinutos,
			message: 'Sincronización falló',
		};
	} finally {
		isRunning = false;
	}
};

/**
 * Obtener estado de la última ejecución
 */
const getLastExecution = () => {
	return lastExecution;
};

/**
 * Verificar si hay una ejecución en curso
 */
const isSyncRunning = () => {
	return isRunning;
};

module.exports = {
	ejecutarSyncFacturas,
	getLastExecution,
	isSyncRunning,
};

