const DocumentoStaging = require("../database/models/DocumentoStaging");
const Ejecucion = require("../database/models/Ejecucion");
const { Op } = require("sequelize");

// Crear un nuevo documento staging
exports.createDocumento = async (req, res) => {
  try {
    const {
      fuente,
      nit_proveedor,
      num_factura,
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

    const newDocumento = await DocumentoStaging.create({
      fuente,
      nit_proveedor,
      num_factura,
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
    documento.nit_proveedor = nit_proveedor || documento.nit_proveedor;
    documento.num_factura = num_factura || documento.num_factura;
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
