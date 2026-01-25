const { Op } = require("sequelize");
const siesaAdapterService = require("../services/siesa-adapter.service");
const Ejecucion = require("../database/models/Ejecucion");
const DocumentoStaging = require("../database/models/DocumentoStaging");

/**
 * Obtiene las facturas de servicios o proveedores desde SIESA
 * @route GET /api/v1/siesa/facturas
 */
const getFacturas = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, consulta, idCia } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Parámetros requeridos faltantes",
        message: "Debe proporcionar 'fechaInicio' y 'fechaFin' (YYYYMMDD)",
      });
    }

    // Valor por defecto si no se envía consulta
    const nombreConsulta = consulta || "listar_facturas_servicios";

    const data = await siesaAdapterService.getFacturas(
      fechaInicio,
      fechaFin,
      nombreConsulta,
      idCia
    );

    res.status(200).json({
      success: true,
      count: data.length,
      consulta: nombreConsulta,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sincroniza las facturas desde SIESA hacia la base de datos local (Staging)
 * @route POST /api/v1/siesa/facturas
 */
const syncFacturas = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, consulta, idCia } = req.body;

    // Obtener usuario del token (inyectado por auth middleware)
    const usuarioId = req.user ? req.user.id : null;

    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Parámetros requeridos faltantes",
        message: "Debe proporcionar 'fechaInicio' y 'fechaFin' (YYYYMMDD)",
      });
    }

    // 1. Crear registro en proc_ejecuciones
    const ejecucion = await Ejecucion.create({
      usuario_id: usuarioId,
      fecha_inicio: new Date(),
      estado: "PENDIENTE",
      docs_procesados: 0,
      tolerancia_usada: 0,
    });

    // 2. Consultar SIESA
    // Valor por defecto si no se envía consulta
    const nombreConsulta = consulta || "listar_facturas_servicios";
    let dataSiesa = [];

    try {
      dataSiesa = await siesaAdapterService.getFacturas(
        fechaInicio,
        fechaFin,
        nombreConsulta,
        idCia
      );
    } catch (siesaError) {
      // Si falla la consulta a SIESA, marcamos la ejecución como FALLIDA
      await ejecucion.update({
        estado: "FALLIDO",
        fecha_fin: new Date(),
      });
      throw siesaError;
    }

    if (!dataSiesa || dataSiesa.length === 0) {
      // Mantener estado en PENDIENTE y docs_procesados en 0 para datos de SIESA
      // No actualizar el estado de la ejecución

      return res.status(200).json({
        success: true,
        message:
          "No se encontraron facturas en SIESA para el rango especificado",
        ejecucionId: ejecucion.id,
        count: 0,
      });
    }

    // 3. Preparar datos y realizar inserción por lotes
    const BATCH_SIZE = 1000;
    const documentosParaInsertar = dataSiesa.map((item) => {
      // Manejo de fecha: la respuesta de SIESA trae "fecha", "FechaEmision", etc.
      // El JSON de ejemplo muestra "fecha": "2025-11-18T00:00:00+01:00"
      let fechaEmision = item.fecha || item.FechaEmision;

      // Intentar convertir a YYYY-MM-DD
      if (fechaEmision && fechaEmision.length >= 10) {
        fechaEmision = fechaEmision.substring(0, 10);
      } else {
        fechaEmision = new Date().toISOString().slice(0, 10);
      }

      const nitRaw = item.id_tercero || item.NitProveedor;
      const nitProveedor = nitRaw != null ? String(nitRaw).trim() : null;

      return {
        fuente: "SIESA",
        nit_proveedor: nitProveedor, // Mapeo solicitado; sin espacios
        num_factura: item.numero_proveedor || item.NumeroDocumento || "SIN_REF", // Mapeo solicitado
        prefijo: item.docto_proveedor || null,
        razon_social: item.razon_social || null,
        fecha_emision: fechaEmision,
        valor_total: item.vlr_neto || item.ValorTotal || 0,
        impuestos: item.vlr_imp || item.Iva || 0,
        payload_original: item,
        ejecucion_id: ejecucion.id,
      };
    });

    let totalProcesados = 0;

    const keySiesa = (d) =>
      `${d.nit_proveedor || ''}|${d.num_factura || ''}|${d.prefijo ?? ''}`;

    const filtrarDuplicadosSiesa = async (lote) => {
      if (!lote || lote.length === 0) return [];
      const nits = [...new Set(lote.map((d) => d.nit_proveedor).filter(Boolean))];
      if (nits.length === 0) return lote;
      const existing = await DocumentoStaging.findAll({
        where: {
          fuente: "SIESA",
          nit_proveedor: { [Op.in]: nits },
        },
        attributes: ["nit_proveedor", "num_factura", "prefijo"],
        raw: true,
      });
      const existingKeys = new Set(
        existing.map((r) =>
          `${r.nit_proveedor || ''}|${r.num_factura || ''}|${r.prefijo ?? ''}`
        )
      );
      const seen = new Set();
      return lote.filter((d) => {
        const k = keySiesa(d);
        if (existingKeys.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    };

    // Procesar en chunks
    for (let i = 0; i < documentosParaInsertar.length; i += BATCH_SIZE) {
      const lote = documentosParaInsertar.slice(i, i + BATCH_SIZE);

      try {
        const aInsertar = await filtrarDuplicadosSiesa(lote);
        if (aInsertar.length > 0) {
          await DocumentoStaging.bulkCreate(aInsertar, {
            ignoreDuplicates: true,
          });
          totalProcesados += aInsertar.length;
        }
      } catch (err) {
        console.error("Error insertando lote:", err.message);
        throw err;
      }
    }

    // 4. No actualizar estado de ejecución - debe permanecer en PENDIENTE y docs_procesados en 0
    // para datos de SIESA, similar a los datos de DIAN

    res.status(200).json({
      success: true,
      message: "Proceso de sincronización completado exitosamente",
      ejecucionId: ejecucion.id,
      registrosProcesados: totalProcesados,
    });
  } catch (error) {
    // Intentar marcar ejecución como fallida si existe error y se creó la ejecución
    // (Esto requeriría mover la variable ejecucion fuera del try o buscarla,
    // pero por simplicidad dejamos que el global handler lo tome)
    next(error);
  }
};

/**
 * Función interna para sincronización (reutilizable sin HTTP)
 * Usada por el scheduler interno
 */
const syncFacturasInterno = async (fechaInicio, fechaFin, usuarioId = 1) => {
  // 1. Crear registro en proc_ejecuciones
  const ejecucion = await Ejecucion.create({
    usuario_id: usuarioId,
    fecha_inicio: new Date(),
    estado: "PENDIENTE",
    docs_procesados: 0,
    tolerancia_usada: 0,
  });

  // 2. Consultar SIESA
  const nombreConsulta = "listar_facturas_servicios";
  let dataSiesa = [];

  try {
    dataSiesa = await siesaAdapterService.getFacturas(
      fechaInicio,
      fechaFin,
      nombreConsulta,
      null
    );
  } catch (siesaError) {
    // Si falla la consulta a SIESA, marcamos la ejecución como FALLIDA
    await ejecucion.update({
      estado: "FALLIDO",
      fecha_fin: new Date(),
    });
    throw siesaError;
  }

  if (!dataSiesa || dataSiesa.length === 0) {
    return {
      success: true,
      message: "No se encontraron facturas en SIESA para el rango especificado",
      ejecucionId: ejecucion.id,
      registrosProcesados: 0,
    };
  }

  // 3. Preparar datos y realizar inserción por lotes
  const BATCH_SIZE = 1000;
  const documentosParaInsertar = dataSiesa.map((item) => {
    let fechaEmision = item.fecha || item.FechaEmision;
    if (fechaEmision && fechaEmision.length >= 10) {
      fechaEmision = fechaEmision.substring(0, 10);
    } else {
      fechaEmision = new Date().toISOString().slice(0, 10);
    }

    const nitRaw = item.id_tercero || item.NitProveedor;
    const nitProveedor = nitRaw != null ? String(nitRaw).trim() : null;

    return {
      fuente: "SIESA",
      nit_proveedor: nitProveedor,
      num_factura: item.numero_proveedor || item.NumeroDocumento || "SIN_REF",
      prefijo: item.docto_proveedor || null,
      razon_social: item.razon_social || null,
      fecha_emision: fechaEmision,
      valor_total: item.vlr_neto || item.ValorTotal || 0,
      impuestos: item.vlr_imp || item.Iva || 0,
      payload_original: item,
      ejecucion_id: ejecucion.id,
    };
  });

  let totalProcesados = 0;

  const keySiesa = (d) =>
    `${d.nit_proveedor || ''}|${d.num_factura || ''}|${d.prefijo ?? ''}`;

  const filtrarDuplicadosSiesa = async (lote) => {
    if (!lote || lote.length === 0) return [];
    const nits = [...new Set(lote.map((d) => d.nit_proveedor).filter(Boolean))];
    if (nits.length === 0) return lote;
    const existing = await DocumentoStaging.findAll({
      where: {
        fuente: "SIESA",
        nit_proveedor: { [Op.in]: nits },
      },
      attributes: ["nit_proveedor", "num_factura", "prefijo"],
      raw: true,
    });
    const existingKeys = new Set(
      existing.map((r) =>
        `${r.nit_proveedor || ''}|${r.num_factura || ''}|${r.prefijo ?? ''}`
      )
    );
    const seen = new Set();
    return lote.filter((d) => {
      const k = keySiesa(d);
      if (existingKeys.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // Procesar en chunks
  for (let i = 0; i < documentosParaInsertar.length; i += BATCH_SIZE) {
    const lote = documentosParaInsertar.slice(i, i + BATCH_SIZE);

    try {
      const aInsertar = await filtrarDuplicadosSiesa(lote);
      if (aInsertar.length > 0) {
        await DocumentoStaging.bulkCreate(aInsertar, {
          ignoreDuplicates: true,
        });
        totalProcesados += aInsertar.length;
      }
    } catch (err) {
      console.error("Error insertando lote:", err.message);
      throw err;
    }
  }

  return {
    success: true,
    message: "Proceso de sincronización completado exitosamente",
    ejecucionId: ejecucion.id,
    registrosProcesados: totalProcesados,
  };
};

/**
 * Sincroniza una única consulta SIESA a proc_documentos_staging (lógica reutilizable).
 * Usado por syncFacturasConParametros y por el sync automático cada 8h.
 * @param {string} fechaInicio - YYYYMMDD
 * @param {string} fechaFin - YYYYMMDD
 * @param {string} nombreConsulta - listar_facturas_servicios | listar_facturas_proveedores
 * @param {string} idCia - por defecto "5"
 * @param {string} idProveedor - por defecto "I2D"
 * @param {number} usuarioId - usuario del sistema (ej. 1 para automático)
 * @returns {Promise<{ ejecucionId: number, registrosProcesados: number, count: number }>}
 */
const syncFacturasUnaConsulta = async (
  fechaInicio,
  fechaFin,
  nombreConsulta,
  idCia,
  idProveedor,
  usuarioId
) => {
  const ejecucion = await Ejecucion.create({
    usuario_id: usuarioId,
    fecha_inicio: new Date(),
    estado: "PENDIENTE",
    docs_procesados: 0,
    tolerancia_usada: 0,
  });

  let dataSiesa = [];
  try {
    dataSiesa = await siesaAdapterService.getFacturas(
      fechaInicio,
      fechaFin,
      nombreConsulta,
      idCia,
      idProveedor
    );
  } catch (siesaError) {
    await ejecucion.update({
      estado: "FALLIDO",
      fecha_fin: new Date(),
    });
    throw siesaError;
  }

  if (!dataSiesa || dataSiesa.length === 0) {
    return {
      ejecucionId: ejecucion.id,
      registrosProcesados: 0,
      count: 0,
    };
  }

  const BATCH_SIZE = 1000;
  const documentosParaInsertar = dataSiesa.map((item) => {
    let fechaEmision = item.fecha || item.FechaEmision;
    if (fechaEmision && fechaEmision.length >= 10) {
      fechaEmision = fechaEmision.substring(0, 10);
    } else {
      fechaEmision = new Date().toISOString().slice(0, 10);
    }

    const nitRaw = item.id_tercero || item.NitProveedor;
    const nitProveedor = nitRaw != null ? String(nitRaw).trim() : null;

    return {
      fuente: "SIESA",
      nit_proveedor: nitProveedor,
      num_factura: item.numero_proveedor || item.NumeroDocumento || "SIN_REF",
      prefijo: item.docto_proveedor || null,
      razon_social: item.razon_social || null,
      fecha_emision: fechaEmision,
      valor_total: item.vlr_neto || item.ValorTotal || 0,
      impuestos: item.vlr_imp || item.Iva || 0,
      payload_original: item,
      ejecucion_id: ejecucion.id,
    };
  });

  let totalProcesados = 0;
  const keySiesa = (d) =>
    `${d.nit_proveedor || ''}|${d.num_factura || ''}|${d.prefijo ?? ''}`;

  const filtrarDuplicadosSiesa = async (lote) => {
    if (!lote || lote.length === 0) return [];
    const nits = [...new Set(lote.map((d) => d.nit_proveedor).filter(Boolean))];
    if (nits.length === 0) return lote;
    const existing = await DocumentoStaging.findAll({
      where: {
        fuente: "SIESA",
        nit_proveedor: { [Op.in]: nits },
      },
      attributes: ["nit_proveedor", "num_factura", "prefijo"],
      raw: true,
    });
    const existingKeys = new Set(
      existing.map((r) =>
        `${r.nit_proveedor || ''}|${r.num_factura || ''}|${r.prefijo ?? ''}`
      )
    );
    const seen = new Set();
    return lote.filter((d) => {
      const k = keySiesa(d);
      if (existingKeys.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  for (let i = 0; i < documentosParaInsertar.length; i += BATCH_SIZE) {
    const lote = documentosParaInsertar.slice(i, i + BATCH_SIZE);
    const aInsertar = await filtrarDuplicadosSiesa(lote);
    if (aInsertar.length > 0) {
      await DocumentoStaging.bulkCreate(aInsertar, {
        ignoreDuplicates: true,
      });
      totalProcesados += aInsertar.length;
    }
  }

  return {
    ejecucionId: ejecucion.id,
    registrosProcesados: totalProcesados,
    count: dataSiesa.length,
  };
};

/**
 * Sincroniza facturas desde SIESA con parámetros personalizados
 * @route POST /api/v1/siesa/sync-con-parametros
 */
const syncFacturasConParametros = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, idCia, nombreConsulta, idProveedor } = req.body;

    const usuarioId = req.user ? req.user.id : null;

    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: "Parámetros requeridos faltantes",
        message: "Debe proporcionar 'fechaInicio' y 'fechaFin' (formato YYYYMMDD)",
      });
    }

    const fechaRegex = /^\d{8}$/;
    if (!fechaRegex.test(fechaInicio) || !fechaRegex.test(fechaFin)) {
      return res.status(400).json({
        error: "Formato de fecha inválido",
        message: "Las fechas deben estar en formato YYYYMMDD (ej: 20250123)",
      });
    }

    const parseFecha = (fechaStr) => {
      const year = parseInt(fechaStr.substring(0, 4), 10);
      const month = parseInt(fechaStr.substring(4, 6), 10) - 1;
      const day = parseInt(fechaStr.substring(6, 8), 10);
      return new Date(year, month, day);
    };

    const fechaInicioDate = parseFecha(fechaInicio);
    const fechaFinDate = parseFecha(fechaFin);
    const fechaActual = new Date();
    fechaActual.setHours(0, 0, 0, 0);

    if (fechaFinDate > fechaActual) {
      return res.status(400).json({
        error: "Fecha fin inválida",
        message: "La fecha fin no debe exceder la fecha actual",
      });
    }

    if (fechaInicioDate > fechaFinDate) {
      return res.status(400).json({
        error: "Rango de fechas inválido",
        message: "La fecha de inicio debe ser igual o anterior a la fecha fin",
      });
    }

    const cia = idCia || "5";
    const consulta = nombreConsulta || "listar_facturas_servicios";
    const proveedorId = idProveedor || process.env.SIESA_PROVIDER_ID || "I2D";

    const consultasPermitidas = [
      "listar_facturas_servicios",
      "listar_facturas_proveedores",
    ];
    if (!consultasPermitidas.includes(consulta)) {
      return res.status(400).json({
        error: "Consulta no permitida",
        message: `La consulta debe ser una de: ${consultasPermitidas.join(", ")}`,
      });
    }

    const resultado = await syncFacturasUnaConsulta(
      fechaInicio,
      fechaFin,
      consulta,
      cia,
      proveedorId,
      usuarioId
    );

    return res.status(200).json({
      success: true,
      message:
        resultado.count === 0
          ? "No se encontraron facturas en SIESA para el rango especificado"
          : "Proceso de sincronización completado exitosamente",
      ejecucionId: resultado.ejecucionId,
      registrosProcesados: resultado.registrosProcesados,
      count: resultado.count,
      parametrosUsados: {
        fechaInicio,
        fechaFin,
        idCia: cia,
        nombreConsulta: consulta,
        idProveedor: proveedorId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacturas,
  syncFacturas,
  syncFacturasInterno,
  syncFacturasUnaConsulta,
  syncFacturasConParametros,
};
