const express = require("express");
const router = express.Router();
const resultadoController = require("../controllers/resultado.controller");

// Rutas CRUD para resultados
router.post("/", resultadoController.createResultado);
router.get("/", resultadoController.getResultados);
router.get("/:id", resultadoController.getResultadoById);
router.put("/:id", resultadoController.updateResultado);
router.delete("/:id", resultadoController.deleteResultado);

module.exports = router;
