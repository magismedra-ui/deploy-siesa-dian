const DocumentoStaging = require("../database/models/DocumentoStaging");
const Ejecucion = require("../database/models/Ejecucion");
const { Op, Sequelize } = require("sequelize");

// Crear un nuevo documento staging
exports.createDocumento = async (req, res) => {
  try {
    const {
      fuente,
      nit_proveedor,
      num_factura,
      prefijo,
      razon_social,
      fecha_emision,
      valor_total,
      impuestos,
      payload_original,
      ejecucion_id,
    } = req.body;

    // Verificar que la ejecución exista
    const ejecucion = await Ejecucion.findByPk(ejecucion_id);
    if (!ejecucion) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }

    const nitProveedorTrimmed =
      nit_proveedor != null ? String(nit_proveedor).trim() : nit_proveedor;

    const newDocumento = await DocumentoStaging.create({
      fuente,
      nit_proveedor: nitProveedorTrimmed,
      num_factura,
      prefijo,
      razon_social,
      fecha_emision,
      valor_total,
      impuestos,
      payload_original,
      ejecucion_id,
    });

    return res.status(201).json(newDocumento);
  } catch (error) {
    console.error("Error creando documento staging:", error);
    return res
      .status(500)
      .json({ message: "Error al crear el documento", error: error.message });
  }
};

// Obtener todos los documentos staging
exports.getDocumentos = async (req, res) => {
  try {
    const documentos = await DocumentoStaging.findAll({
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio"],
        },
      ],
    });
    return res.status(200).json(documentos);
  } catch (error) {
    console.error("Error obteniendo documentos staging:", error);
    return res
      .status(500)
      .json({
        message: "Error al obtener los documentos",
        error: error.message,
      });
  }
};

// Obtener un documento por ID
exports.getDocumentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const documento = await DocumentoStaging.findByPk(id, {
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio"],
        },
      ],
    });

    if (!documento) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }
    return res.status(200).json(documento);
  } catch (error) {
    console.error("Error obteniendo documento:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el documento", error: error.message });
  }
};

// Actualizar un documento
exports.updateDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fuente,
      nit_proveedor,
      num_factura,
      prefijo,
      razon_social,
      fecha_emision,
      valor_total,
      impuestos,
      payload_original,
      ejecucion_id,
    } = req.body;

    const documento = await DocumentoStaging.findByPk(id);
    if (!documento) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    if (ejecucion_id) {
      const ejecucion = await Ejecucion.findByPk(ejecucion_id);
      if (!ejecucion) {
        return res.status(404).json({ message: "Ejecución no encontrada" });
      }
      documento.ejecucion_id = ejecucion_id;
    }

    documento.fuente = fuente || documento.fuente;
    documento.nit_proveedor =
      nit_proveedor !== undefined
        ? String(nit_proveedor).trim()
        : documento.nit_proveedor;
    documento.num_factura = num_factura || documento.num_factura;
    documento.prefijo = prefijo !== undefined ? prefijo : documento.prefijo;
    documento.razon_social = razon_social !== undefined ? razon_social : documento.razon_social;
    documento.fecha_emision = fecha_emision || documento.fecha_emision;
    documento.valor_total =
      valor_total !== undefined ? valor_total : documento.valor_total;
    documento.impuestos =
      impuestos !== undefined ? impuestos : documento.impuestos;
    documento.payload_original =
      payload_original !== undefined
        ? payload_original
        : documento.payload_original;

    await documento.save();

    return res.status(200).json(documento);
  } catch (error) {
    console.error("Error actualizando documento:", error);
    return res
      .status(500)
      .json({
        message: "Error al actualizar el documento",
        error: error.message,
      });
  }
};

// Eliminar un documento
exports.deleteDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const documento = await DocumentoStaging.findByPk(id);

    if (!documento) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    await documento.destroy();
    return res
      .status(200)
      .json({ message: "Documento eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando documento:", error);
    return res
      .status(500)
      .json({
        message: "Error al eliminar el documento",
        error: error.message,
      });
  }
};

// Buscar documentos por nit_proveedor y num_factura
exports.buscarDocumento = async (req, res) => {
  try {
    const { nit_proveedor, num_factura } = req.query;

    // Validar que ambos parámetros estén presentes
    if (!nit_proveedor || !num_factura) {
      return res.status(400).json({
        success: false,
        error: "Los parámetros nit_proveedor y num_factura son requeridos",
      });
    }

    const documentos = await DocumentoStaging.findAll({
      where: {
        nit_proveedor: {
          [Op.eq]: nit_proveedor,
        },
        num_factura: {
          [Op.eq]: num_factura,
        },
      },
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio", "fecha_fin"],
        },
      ],
      order: [["createdAt", "DESC"]], // Ordenar por fecha de creación descendente
    });

    if (!documentos || documentos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron documentos",
        nit_proveedor,
        num_factura,
        total: 0,
      });
    }

    return res.status(200).json({
      success: true,
      total: documentos.length,
      documentos,
    });
  } catch (error) {
    console.error("Error buscando documentos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al buscar los documentos",
      error: error.message,
    });
  }
};

// Obtener documentos staging con paginación y filtrado por estado
exports.getDocumentosPorEstado = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    // Decodificar el estado en caso de que tenga espacios codificados
    // Express ya decodifica automáticamente, pero por si acaso lo hacemos explícito
    const estado = req.query.estado ? decodeURIComponent(String(req.query.estado)) : null;
    const nit_proveedor = req.query.nit_proveedor; // Filtro exacto por NIT proveedor
    const fecha_emision = req.query.fecha_emision; // Filtro exacto por fecha emisión
    const offset = (page - 1) * limit;

    // Validar que el estado esté presente
    if (!estado) {
      return res.status(400).json({
        success: false,
        error: "El parámetro estado es requerido",
      });
    }

    // Construir condiciones de filtrado (búsqueda exacta)
    const whereConditions = [
      { estado: estado }
    ];
    
    // Agregar filtros opcionales con búsqueda exacta
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
        console.error('[DocumentosStaging] Formato de fecha inválido:', fechaFormat);
        return res.status(400).json({
          success: false,
          error: `Formato de fecha inválido. Se espera YYYY-MM-DD, se recibió: ${fechaFormat}`,
        });
      }
    }
    
    // Construir el whereClause final usando Op.and si hay múltiples condiciones
    const whereClause = whereConditions.length > 1 
      ? { [Op.and]: whereConditions }
      : whereConditions[0];
    
    const { count, rows: documentos } = await DocumentoStaging.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Ejecucion,
          as: "ejecucion",
          attributes: ["id", "estado", "fecha_inicio", "fecha_fin"],
        },
      ],
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: documentos,
      total: count,
      page: page,
      limit: limit,
      totalPages: totalPages,
      estado: estado,
    });
  } catch (error) {
    console.error("Error obteniendo documentos por estado:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los documentos",
      error: error.message,
    });
  }
};
