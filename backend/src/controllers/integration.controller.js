const { integrationQueue } = require("../queues/integration.queue");
const Ejecucion = require("../database/models/Ejecucion");

const triggerIntegration = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res
        .status(400)
        .json({ error: "fechaInicio y fechaFin son requeridos" });
    }

    const log = await Ejecucion.create({
      fecha_inicio: new Date(),
      estado: "PENDIENTE",
      usuario_id: req.user?.id || 1, // Fallback a 1 si no hay id de usuario
    });

    if (integrationQueue) {
      await integrationQueue.add("sync-docs", {
        id_ejecucion: log.id,
        fechaInicio,
        fechaFin,
      });

      res.status(202).json({
        message: "Integración iniciada con éxito",
        executionId: log.id,
      });
    } else {
      // Fallback si Redis no está disponible (solo para propósitos de depuración/desarrollo sin colas)
      console.warn("Sistema de cola no disponible. Guardando registro pero no procesando.");
      res.status(503).json({
        message:
          "Integración registrada pero la cola de procesamiento no está disponible (Redis caído).",
        executionId: log.id,
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { triggerIntegration };
