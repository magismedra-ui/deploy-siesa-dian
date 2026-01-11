const express = require("express");
const router = express.Router();
const emailReaderController = require("../controllers/email-reader.controller");
// const authMiddleware = require('../middlewares/auth.middleware'); // Descomentar si se requiere auth

// Ruta para activar la lectura manual de correos
// POST /api/v1/factura-email/check
router.post("/check", emailReaderController.checkEmails);

module.exports = router;
