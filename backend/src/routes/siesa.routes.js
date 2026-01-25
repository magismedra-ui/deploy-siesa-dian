const express = require("express");
const router = express.Router();
const siesaController = require("../controllers/siesa.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Rutas protegidas con token (opcional, según requerimiento)
router.get("/facturas", verifyToken, siesaController.getFacturas);
router.post("/facturas", verifyToken, siesaController.syncFacturas);
router.post("/sync-con-parametros", verifyToken, siesaController.syncFacturasConParametros);

module.exports = router;
