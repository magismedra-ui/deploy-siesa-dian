const Resultado = require("../database/models/Resultado");
const Ejecucion = require("../database/models/Ejecucion");
const { Op, Sequelize } = require("sequelize");

// Crear un nuevo resultado
exports.createResultado = async (req, res) => {
  try {
    const {
      tipo_resultado,
      nit_proveedor,
      num_factura,
      prefijo,
      razon_social,
      fecha_emision,
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
      prefijo,
      razon_social,
      fecha_emision,
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

// Obtener todos los resultados con paginación y filtrado
exports.getResultados = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const estado = req.query.estado; // Filtro por estado (tipo_resultado)
    const nit_proveedor = req.query.nit_proveedor; // Filtro exacto por NIT proveedor
    const fecha_emision = req.query.fecha_emision; // Filtro exacto por fecha emisión
    const offset = (page - 1) * limit;

    // Construir condiciones de filtrado (búsqueda exacta)
    const { Sequelize } = require("sequelize");
    const whereConditions = [];
    
    if (estado) {
      whereConditions.push({ tipo_resultado: estado });
    }
    
    if (nit_proveedor) {
      whereConditions.push({
        nit_proveedor: { [Op.eq]: nit_proveedor }
      });
    }
    
    if (fecha_emision) {
      // Asegurar que la fecha esté en formato YYYY-MM-DD
      // Validar que tenga el formato correcto (10 caracteres: YYYY-MM-DD)
      const fechaFormat = fecha_emision.trim();
      if (fechaFormat.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // El campo fecha_emision es DATE en MySQL y DATEONLY en Sequelize
        // Se almacena como 'YYYY-MM-DD' sin componente de hora
        // Usar comparación directa sin DATE() ya que el campo ya es DATE
        whereConditions.push(
          Sequelize.literal(`fecha_emision = '${fechaFormat}'`)
        );
      } else {
        return res.status(400).json({
          success: false,
          error: `Formato de fecha inválido. Se espera YYYY-MM-DD, se recibió: ${fechaFormat}`,
        });
      }
    }
    
    // Construir el whereClause final usando Op.and si hay múltiples condiciones
    const whereClause = whereConditions.length > 1 
      ? { [Op.and]: whereConditions }
      : (whereConditions.length === 1 ? whereConditions[0] : {});

    // Obtener resultados con paginación
    const { count, rows: resultados } = await Resultado.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio"],
        },
      ],
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: resultados,
      total: count,
      page: page,
      limit: limit,
      totalPages: totalPages,
    });
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
      prefijo,
      razon_social,
      fecha_emision,
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
    resultado.prefijo = prefijo !== undefined ? prefijo : resultado.prefijo;
    resultado.razon_social = razon_social !== undefined ? razon_social : resultado.razon_social;
    resultado.fecha_emision = fecha_emision || resultado.fecha_emision;
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
