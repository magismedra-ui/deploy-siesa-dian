const express = require("express");
const router = express.Router();
const ejecucionController = require("../controllers/ejecucion.controller");

// Rutas CRUD para ejecuciones
router.post("/", ejecucionController.createEjecucion);
router.get("/", ejecucionController.getEjecuciones);
router.get("/:id", ejecucionController.getEjecucionById);
router.put("/:id", ejecucionController.updateEjecucion);
router.delete("/:id", ejecucionController.deleteEjecucion);

module.exports = router;
