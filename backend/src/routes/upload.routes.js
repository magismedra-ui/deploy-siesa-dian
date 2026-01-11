const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
    uploadExcelController, 
    getStatusController, 
    getErrorsController 
} = require('../controllers/upload.controller');

const router = Router();

// Verificar carpeta uploads
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp-original
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Validar extensión o mimetype
        if (
            file.mimetype.includes('sheet') || 
            file.mimetype.includes('excel') ||
            file.originalname.endsWith('.xlsx')
        ) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos Excel (.xlsx)'));
        }
    }
});

// Rutas
router.post('/upload', upload.single('file'), uploadExcelController);
router.get('/status/:id', getStatusController);
router.get('/errors/:id', getErrorsController);

module.exports = router;

