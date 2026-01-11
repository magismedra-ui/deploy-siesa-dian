const { Worker } = require("bullmq");
const { redisConnection } = require("../config/queue");
const ExcelJS = require("exceljs");
const fs = require("fs");
const Ejecucion = require("../database/models/Ejecucion");
const DocumentoStaging = require("../database/models/DocumentoStaging");
const { log, calcularDuracionMinutos } = require("../logger/redisLogger");

// Helper robusto para parsear fechas (acepta DD-MM-YYYY y YYYY-MM-DD)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;

  let parsedDate = new Date(dateStr);

  // Si new Date() falla o es inválida, intentar parseo manual para formato DD-MM-YYYY
  if (
    (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 1900) &&
    typeof dateStr === "string"
  ) {
    // Intentar separar por - o /
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // Asumir DD-MM-YYYY si el año está al final
      if (parts[2].length === 4) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-based
        const year = parseInt(parts[2], 10);
        parsedDate = new Date(year, month, day);
      }
    }
  }

  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Mapa para almacenar startTime por jobId (evitar bloquear workers)
const jobStartTimes = new Map();

const setupWorker = () => {
  console.log("Inicializando Worker de Excel...");
  const worker = new Worker(
    "excel-processing",
    async (job) => {
      const { filePath, ejecucionId, usuarioId } = job.data;
      const jobId = String(job.id);
      const startTime = Date.now();
      
      // Guardar startTime
      jobStartTimes.set(jobId, startTime);

      console.log(`Procesando Job ${job.id} para ejecución ${ejecucionId}`);

      // Log de inicio
      await log({
        jobId: jobId,
        proceso: "excel-processing",
        nivel: "info",
        mensaje: `Inicio de procesamiento de archivo Excel. Ejecución ID: ${ejecucionId}`,
      });

      try {
        // Validar que el archivo existe y es accesible
        if (!filePath || !fs.existsSync(filePath)) {
          throw new Error(`El archivo no existe o no es accesible: ${filePath}`);
        }

        // Validar extensión del archivo
        const fileExtension = filePath.toLowerCase().split('.').pop();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
          throw new Error(`El archivo debe ser un Excel (.xlsx o .xls). Extensión recibida: .${fileExtension}`);
        }

        // No cambiar el estado - debe permanecer en PENDIENTE para datos de DIAN
        const errores = [];
        let processedCount = 0;
        let batch = [];
        const BATCH_SIZE = 1000;

        let workbookReader;
        try {
          workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(
            filePath,
            {
              entries: "emit",
              sharedStrings: "cache",
              hyperlinks: "ignore",
              styles: "ignore",
            }
          );
        } catch (readError) {
          // Capturar errores específicos de lectura de archivo
          if (readError.message.includes('invalid signature') || readError.message.includes('0x')) {
            throw new Error('El archivo no es un archivo Excel válido o está corrupto. Por favor, verifica que el archivo sea un .xlsx válido.');
          }
          throw new Error(`Error al leer el archivo Excel: ${readError.message}`);
        }

        let headers = null;
        const COLUMNAS = {
          nit: ["nit emisor", "nit", "nit_proveedor"],
          cufe: ["cufe/cude", "cufe", "cude", "num_factura"],
          folio: ["folio", "folio factura"],
          fecha: ["fecha emisión", "fecha emision", "fecha", "fecha_emision"],
          total: ["total", "valor_total"],
          iva: ["iva", "impuestos"],
        };

        try {
          for await (const worksheetReader of workbookReader) {
            for await (const row of worksheetReader) {
            if (row.number === 1) {
              headers = row.values
                .slice(1)
                .map((h) => (h ? h.toString().trim() : ""));
              continue;
            }

            if (!headers) continue;

            const rowValues = row.values.slice(1);
            const rowData = {};
            headers.forEach((h, i) => (rowData[h] = rowValues[i]));

            try {
              const getValue = (keys) => {
                for (const key of keys) {
                  const found = headers.find(
                    (h) => h && h.toLowerCase().includes(key)
                  );
                  if (found && rowData[found] !== undefined)
                    return rowData[found];
                }
                return null;
              };

              const fechaRaw = getValue(COLUMNAS.fecha);
              const fechaEmision = parseDate(fechaRaw);

              // VALIDACIÓN PRE-BATCH
              if (!fechaEmision) {
                throw new Error(
                  `Fecha inválida o vacía: ${fechaRaw} (Esperado YYYY-MM-DD o DD-MM-YYYY)`
                );
              }

              let numFactura = getValue(COLUMNAS.folio)?.toString();
              if (!numFactura) numFactura = getValue(COLUMNAS.cufe)?.toString();

              const documento = {
                ejecucion_id: ejecucionId,
                fuente: "DIAN",
                nit_proveedor: getValue(COLUMNAS.nit)?.toString(),
                num_factura: numFactura,
                fecha_emision: fechaEmision,
                valor_total: parseFloat(getValue(COLUMNAS.total) || 0),
                impuestos: parseFloat(getValue(COLUMNAS.iva) || 0),
                payload_original: rowData,
              };

              if (!documento.nit_proveedor) throw new Error("Falta NIT");
              if (!documento.num_factura)
                throw new Error("Falta Número de Factura/CUFE");

              batch.push(documento);
              processedCount++;

              if (batch.length >= BATCH_SIZE) {
                try {
                  // ignoreDuplicates: true usa INSERT IGNORE en MySQL para saltar duplicados
                  await DocumentoStaging.bulkCreate(batch, {
                    ignoreDuplicates: true,
                  });

                  // Log de progreso cada lote
                  await log({
                    jobId: jobId,
                    proceso: "excel-processing",
                    nivel: "info",
                    mensaje: `Procesados ${processedCount} registros hasta el momento`,
                  });
                } catch (batchError) {
                  console.error("Error insertando Batch:", batchError.message);
                  throw new Error(
                    `Error insertando lote de ${BATCH_SIZE} registros: ${batchError.message}`
                  );
                } finally {
                  batch = []; // SIEMPRE LIMPIAR BATCH DESPUES DE INTENTO
                }

                // No actualizar docs_procesados - debe permanecer en 0 para datos de DIAN
              }
            } catch (rowError) {
              errores.push({
                fila: row.number,
                error: rowError.message,
                data: rowData,
              });
            }
          }
        }
        } catch (readError) {
          // Capturar errores durante la lectura/iteración del archivo
          if (readError.message && (readError.message.includes('invalid signature') || readError.message.includes('0x'))) {
            throw new Error('El archivo no es un archivo Excel válido o está corrupto. Por favor, verifica que el archivo sea un .xlsx válido y no esté dañado.');
          }
          throw new Error(`Error al procesar el archivo Excel: ${readError.message}`);
        }

        if (batch.length > 0) {
          try {
            await DocumentoStaging.bulkCreate(batch, {
              ignoreDuplicates: true,
            });
          } catch (e) {
            errores.push({
              fila: "BATCH_FINAL",
              error: e.message,
              data: "Remanentes",
            });
          }
        }

        // Calcular duración
        const endTime = Date.now();
        const duracionMs = endTime - startTime;
        const duracionSegundos = duracionMs / 1000;
        const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

        // Para datos de DIAN (Excel), mantener estado en PENDIENTE y docs_procesados en 0
        await Ejecucion.update(
          {
            estado: "PENDIENTE",
            docs_procesados: 0,
            errores: errores.length > 0 ? errores : null,
          },
          { where: { id: ejecucionId } }
        );

        // Log de finalización exitosa
        await log({
          jobId: jobId,
          proceso: "excel-processing",
          nivel: errores.length > 0 ? "warn" : "info",
          mensaje: `Procesamiento completado. Total procesados: ${processedCount}. Errores: ${errores.length}`,
          duracionSegundos: duracionSegundos,
          duracionMinutos: duracionMinutos,
        });

        // Limpiar startTime
        jobStartTimes.delete(jobId);
      } catch (error) {
        console.error("Error Worker:", error);
        
        // Calcular duración parcial
        const endTime = Date.now();
        const startTimeRecorded = jobStartTimes.get(jobId) || startTime;
        const duracionMs = endTime - startTimeRecorded;
        const duracionSegundos = duracionMs / 1000;
        const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

        // Mensaje de error más descriptivo
        const errorMessage = error.message || 'Error desconocido al procesar el archivo Excel';
        
        await Ejecucion.update(
          {
            estado: "FALLIDO",
            fecha_fin: new Date(),
            errores: [{ error_general: errorMessage }],
          },
          { where: { id: ejecucionId } }
        );

        // Log de error
        await log({
          jobId: jobId,
          proceso: "excel-processing",
          nivel: "error",
          mensaje: `Error en procesamiento: ${errorMessage}`,
          duracionSegundos: duracionSegundos,
          duracionMinutos: duracionMinutos,
        });

        // Limpiar startTime
        jobStartTimes.delete(jobId);
        throw error;
      } finally {
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => console.log(`Job ${job.id} OK`));
  worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} FAIL: ${err.message}`)
  );
};

module.exports = { setupWorker };
