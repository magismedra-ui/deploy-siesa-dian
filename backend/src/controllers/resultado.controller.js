const Resultado = require("../database/models/Resultado");
const Ejecucion = require("../database/models/Ejecucion");

// Crear un nuevo resultado
exports.createResultado = async (req, res) => {
  try {
    const {
      tipo_resultado,
      nit_proveedor,
      num_factura,
      valor_dian,
      valor_siesa,
      diferencia,
      observacion,
      ejecucion_id,
    } = req.body;

    // Verificar que la ejecución exista
    const ejecucion = await Ejecucion.findByPk(ejecucion_id);
    if (!ejecucion) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }

    const newResultado = await Resultado.create({
      tipo_resultado,
      nit_proveedor,
      num_factura,
      valor_dian,
      valor_siesa,
      diferencia,
      observacion,
      ejecucion_id,
    });

    return res.status(201).json(newResultado);
  } catch (error) {
    console.error("Error creando resultado:", error);
    return res
      .status(500)
      .json({ message: "Error al crear el resultado", error: error.message });
  }
};

// Obtener todos los resultados
exports.getResultados = async (req, res) => {
  try {
    const resultados = await Resultado.findAll({
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio"],
        },
      ],
    });
    return res.status(200).json(resultados);
  } catch (error) {
    console.error("Error obteniendo resultados:", error);
    return res
      .status(500)
      .json({
        message: "Error al obtener los resultados",
        error: error.message,
      });
  }
};

// Obtener un resultado por ID
exports.getResultadoById = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await Resultado.findByPk(id, {
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio"],
        },
      ],
    });

    if (!resultado) {
      return res.status(404).json({ message: "Resultado no encontrado" });
    }
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error obteniendo resultado:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el resultado", error: error.message });
  }
};

// Actualizar un resultado
exports.updateResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo_resultado,
      nit_proveedor,
      num_factura,
      valor_dian,
      valor_siesa,
      diferencia,
      observacion,
      ejecucion_id,
    } = req.body;

    const resultado = await Resultado.findByPk(id);
    if (!resultado) {
      return res.status(404).json({ message: "Resultado no encontrado" });
    }

    if (ejecucion_id) {
      const ejecucion = await Ejecucion.findByPk(ejecucion_id);
      if (!ejecucion) {
        return res.status(404).json({ message: "Ejecución no encontrada" });
      }
      resultado.ejecucion_id = ejecucion_id;
    }

    resultado.tipo_resultado = tipo_resultado || resultado.tipo_resultado;
    resultado.nit_proveedor = nit_proveedor || resultado.nit_proveedor;
    resultado.num_factura = num_factura || resultado.num_factura;
    resultado.valor_dian =
      valor_dian !== undefined ? valor_dian : resultado.valor_dian;
    resultado.valor_siesa =
      valor_siesa !== undefined ? valor_siesa : resultado.valor_siesa;
    resultado.diferencia =
      diferencia !== undefined ? diferencia : resultado.diferencia;
    resultado.observacion =
      observacion !== undefined ? observacion : resultado.observacion;

    await resultado.save();

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error actualizando resultado:", error);
    return res.status(500).json({
      message: "Error al actualizar el resultado",
      error: error.message,
    });
  }
};

// Eliminar un resultado
exports.deleteResultado = async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await Resultado.findByPk(id);

    if (!resultado) {
      return res.status(404).json({ message: "Resultado no encontrado" });
    }

    await resultado.destroy();
    return res
      .status(200)
      .json({ message: "Resultado eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando resultado:", error);
    return res.status(500).json({
      message: "Error al eliminar el resultado",
      error: error.message,
    });
  }
};
