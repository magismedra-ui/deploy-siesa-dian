const uploadService = require('../services/upload.service');

const uploadExcelController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Falta archivo' });
    
    // ID temporal si no hay auth
    const userId = req.user?.id || req.body.usuario_id || 1; 
    
    const result = await uploadService.processExcelUpload(req.file.path, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStatusController = async (req, res) => {
  try {
    const result = await uploadService.getStatus(req.params.id);
    if(!result) return res.status(404).json({error: 'No encontrado'});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getErrorsController = async (req, res) => {
  try {
    const errores = await uploadService.getErrors(req.params.id);
    res.json({ ejecucion_id: req.params.id, errores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadExcelController,
  getStatusController,
  getErrorsController
};

