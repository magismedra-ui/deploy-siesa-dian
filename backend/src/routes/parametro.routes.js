const express = require("express");
const router = express.Router();
const parametroController = require("../controllers/parametro.controller");

// Rutas CRUD para parámetros
router.post("/", parametroController.createParametro);
router.get("/", parametroController.getParametros);
router.get("/:id", parametroController.getParametroById);
// Ruta adicional útil para buscar por clave: GET /api/v1/parametros/clave/:clave
router.get("/clave/:clave", parametroController.getParametroByClave);
router.put("/:id", parametroController.updateParametro);
router.delete("/:id", parametroController.deleteParametro);

module.exports = router;
