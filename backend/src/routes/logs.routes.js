const { Router } = require('express');
const { getLogs, streamLogs } = require('../controllers/logs.controller');

const router = Router();

/**
 * @route GET /api/v1/logs
 * @desc Obtener logs históricos con filtros avanzados
 * @query {number} limit - Límite de resultados (default: 100, max: 1000)
 * @query {string} jobId - Filtrar por ID de job (opcional)
 * @query {string} niveles - Filtrar por niveles separados por comas: info,warn,error (opcional)
 * @query {number} from - Timestamp inicial en milisegundos (opcional)
 * @query {number} to - Timestamp final en milisegundos (opcional)
 * @query {number} duracionMin - Duración mínima en segundos (opcional)
 * @query {number} duracionMax - Duración máxima en segundos (opcional)
 */
router.get('/', getLogs);

/**
 * @route GET /api/v1/logs/stream
 * @desc Stream de logs en tiempo real usando Server-Sent Events (SSE)
 * @query {string} jobId - Filtrar por ID de job (opcional)
 * @query {string} niveles - Filtrar por niveles separados por comas: info,warn,error (opcional)
 */
router.get('/stream', streamLogs);

module.exports = router;

