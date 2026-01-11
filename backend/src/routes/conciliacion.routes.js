const { Router } = require('express');
const {
	iniciarConciliacion,
	obtenerEstadoJob,
} = require('../controllers/conciliacion.controller');

const router = Router();

/**
 * @route POST /api/v1/conciliacion/iniciar
 * @desc Inicia el proceso de conciliación
 * @body { ejecucionId?: number } - ID de ejecución opcional
 */
router.post('/iniciar', iniciarConciliacion);

/**
 * @route GET /api/v1/conciliacion/estado/:jobId
 * @desc Obtiene el estado de un job de conciliación
 */
router.get('/estado/:jobId', obtenerEstadoJob);

module.exports = router;

