const Ejecucion = require("../database/models/Ejecucion");
const Usuario = require("../database/models/Usuario");

// Crear una nueva ejecución
exports.createEjecucion = async (req, res) => {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      estado,
      docs_procesados,
      tolerancia_usada,
      usuario_id,
    } = req.body;

    // Verificar que el usuario exista
    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const newEjecucion = await Ejecucion.create({
      fecha_inicio,
      fecha_fin,
      estado,
      docs_procesados,
      tolerancia_usada,
      usuario_id,
    });

    return res.status(201).json(newEjecucion);
  } catch (error) {
    console.error("Error creando ejecución:", error);
    return res
      .status(500)
      .json({ message: "Error al crear la ejecución", error: error.message });
  }
};

// Obtener todas las ejecuciones
exports.getEjecuciones = async (req, res) => {
  try {
    const ejecuciones = await Ejecucion.findAll({
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nombre_completo", "email"],
        },
      ],
    });
    return res.status(200).json(ejecuciones);
  } catch (error) {
    console.error("Error obteniendo ejecuciones:", error);
    return res
      .status(500)
      .json({
        message: "Error al obtener las ejecuciones",
        error: error.message,
      });
  }
};

// Obtener una ejecución por ID
exports.getEjecucionById = async (req, res) => {
  try {
    const { id } = req.params;
    const ejecucion = await Ejecucion.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nombre_completo", "email"],
        },
      ],
    });

    if (!ejecucion) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }
    return res.status(200).json(ejecucion);
  } catch (error) {
    console.error("Error obteniendo ejecución:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener la ejecución", error: error.message });
  }
};

// Actualizar una ejecución
exports.updateEjecucion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha_inicio,
      fecha_fin,
      estado,
      docs_procesados,
      tolerancia_usada,
      usuario_id,
    } = req.body;

    const ejecucion = await Ejecucion.findByPk(id);
    if (!ejecucion) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }

    if (usuario_id) {
      const usuario = await Usuario.findByPk(usuario_id);
      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      ejecucion.usuario_id = usuario_id;
    }

    ejecucion.fecha_inicio = fecha_inicio || ejecucion.fecha_inicio;
    ejecucion.fecha_fin = fecha_fin || ejecucion.fecha_fin;
    ejecucion.estado = estado || ejecucion.estado;
    ejecucion.docs_procesados =
      docs_procesados !== undefined
        ? docs_procesados
        : ejecucion.docs_procesados;
    ejecucion.tolerancia_usada =
      tolerancia_usada !== undefined
        ? tolerancia_usada
        : ejecucion.tolerancia_usada;

    await ejecucion.save();

    return res.status(200).json(ejecucion);
  } catch (error) {
    console.error("Error actualizando ejecución:", error);
    return res
      .status(500)
      .json({
        message: "Error al actualizar la ejecución",
        error: error.message,
      });
  }
};

// Eliminar una ejecución
exports.deleteEjecucion = async (req, res) => {
  try {
    const { id } = req.params;
    const ejecucion = await Ejecucion.findByPk(id);

    if (!ejecucion) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }

    await ejecucion.destroy();
    return res
      .status(200)
      .json({ message: "Ejecución eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando ejecución:", error);
    return res
      .status(500)
      .json({
        message: "Error al eliminar la ejecución",
        error: error.message,
      });
  }
};
