const { Router } = require('express');
const {
	configScheduler,
	getSchedulerConfig,
	ejecutarSyncFacturasManual,
	getSyncFacturasStatus,
} = require('../controllers/scheduler.controller');

const router = Router();

/**
 * @route POST /api/v1/scheduler/config
 * @desc Configurar scheduler dinámicamente
 * @body { schedulerEnabled: boolean|null, cronExpressionn: string }
 */
router.post('/config', configScheduler);

/**
 * @route GET /api/v1/scheduler/config
 * @desc Obtener configuración actual del scheduler
 */
router.get('/config', getSchedulerConfig);

/**
 * @route POST /api/v1/scheduler/sync-facturas
 * @desc Ejecutar sincronización de facturas manualmente
 */
router.post('/sync-facturas', ejecutarSyncFacturasManual);

/**
 * @route GET /api/v1/scheduler/sync-facturas/status
 * @desc Obtener estado de la última ejecución de sincronización
 */
router.get('/sync-facturas/status', getSyncFacturasStatus);

module.exports = router;

