const { excelQueue } = require('../config/queue');
const Ejecucion = require('../database/models/Ejecucion');

class UploadService {
  async processExcelUpload(filePath, userId) {
    const ejecucion = await Ejecucion.create({
      usuario_id: userId,
      fecha_inicio: new Date(),
      estado: 'PENDIENTE',
      docs_procesados: 0
    });

    await excelQueue.add('process-excel', {
      filePath,
      ejecucionId: ejecucion.id,
      usuarioId: userId
    }, {
        removeOnComplete: true,
        removeOnFail: 500
    });

    return {
      message: 'Procesamiento iniciado',
      ejecucion_id: ejecucion.id,
      estado: 'PENDIENTE'
    };
  }

  async getStatus(ejecucionId) {
    return await Ejecucion.findByPk(ejecucionId);
  }

  async getErrors(ejecucionId) {
     const ejecucion = await Ejecucion.findByPk(ejecucionId, {
      attributes: ['id', 'errores']
    });
    return ejecucion?.errores || [];
  }
}

module.exports = new UploadService();

