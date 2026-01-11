/**
 * Configuración global del scheduler
 * Variables globales para control dinámico del sistema
 */

/**
 * Estado del scheduler
 * null: Deshabilitado, detener schedulers activos
 * false: Modo manual, no ejecutar automáticamente
 * true: Modo automático, ejecutar según configuración
 */
global.schedulerEnabled = process.env.SCHEDULER_ENABLED === 'true' 
	? true 
	: process.env.SCHEDULER_ENABLED === 'false' 
		? false 
		: null;

/**
 * Expresión cron para conciliación
 * Formato estándar cron: "segun formato cron de node-cron"
 */
global.cronExpressionn = process.env.CRON_EXPRESSIONN || '0 * * * *'; // Default: cada hora

/**
 * Obtener el estado actual del scheduler
 */
const getSchedulerEnabled = () => {
	return global.schedulerEnabled;
};

/**
 * Obtener la expresión cron actual
 */
const getCronExpressionn = () => {
	return global.cronExpressionn;
};

/**
 * Actualizar configuración del scheduler
 * @param {boolean|null} enabled - Estado del scheduler
 * @param {string} cronExpr - Expresión cron
 */
const updateSchedulerConfig = (enabled, cronExpr) => {
	if (enabled !== null && enabled !== false && enabled !== true) {
		throw new Error('schedulerEnabled debe ser null, false o true');
	}

	global.schedulerEnabled = enabled;

	if (cronExpr && typeof cronExpr === 'string') {
		global.cronExpressionn = cronExpr;
	}
};

/**
 * Validar expresión cron
 */
const validateCronExpression = (cronExpr) => {
	if (!cronExpr || typeof cronExpr !== 'string') {
		return false;
	}

	try {
		const cron = require('node-cron');
		return cron.validate(cronExpr);
	} catch (error) {
		return false;
	}
};

module.exports = {
	getSchedulerEnabled,
	getCronExpressionn,
	updateSchedulerConfig,
	validateCronExpression,
};

