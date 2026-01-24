const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const siesaAdapter = require("../services/siesa-adapter.service");
const dianAdapter = require("../services/dian-adapter.service");
const DocumentoStaging = require("../database/models/DocumentoStaging");
const Ejecucion = require("../database/models/Ejecucion");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: function (times) {
    // Detener reintentos inmediatamente en desarrollo si Redis no está disponible
    if (process.env.NODE_ENV !== 'production') {
      return null; // No reintentar en desarrollo
    }
    // En producción, limitar reintentos a 3 intentos
    if (times > 3) {
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true, // No conectar inmediatamente al instanciar
  enableOfflineQueue: false, // No encolar comandos cuando está offline
  enableReadyCheck: false, // No verificar si está listo antes de enviar comandos
});

// Manejo de errores de conexión silenciosos para no tumbar el server en dev
connection.on("error", (err) => {
  // Silenciar errores de conexión en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  console.warn(
    "[Redis Integration] Redis connection failed (Queue system will be unavailable):",
    err.message
  );
});

let integrationQueue;
let worker;

try {
  integrationQueue = new Queue("integration-process", { connection });

  worker = new Worker(
    "integration-process",
    async (job) => {
      // ... (resto del código del worker se mantiene igual, solo ajustamos el wrapper)
      const { id_ejecucion, fechaInicio, fechaFin } = job.data;

      try {
        console.log(`Procesando ejecución #${id_ejecucion}...`);

        // Ejecución en paralelo para optimizar tiempo
        const [siesaResults, dianResults] = await Promise.allSettled([
          siesaAdapter.getCompras(fechaInicio, fechaFin),
          dianAdapter.getDocumentosElectronicos(fechaInicio, fechaFin),
        ]);

        let siesaData = [];
        let dianData = [];

        if (siesaResults.status === "fulfilled") siesaData = siesaResults.value;
        else console.error("Fallo SIESA:", siesaResults.reason);

        if (dianResults.status === "fulfilled") dianData = dianResults.value;
        else console.error("Fallo DIAN:", dianResults.reason);

        // Preparar bulk insert
        const bulkSiesa = siesaData.map((item) => ({
          num_factura: item.idDocumento,
          nit_proveedor: item.nitProveedor,
          prefijo: item.docto_proveedor || null,
          razon_social: item.razon_social || null,
          fecha_emision: item.fechaEmision,
          valor_total: item.valorTotal,
          impuestos: item.iva,
          fuente: "SIESA",
          payload_original: item,
          ejecucion_id: id_ejecucion,
        }));

        const bulkDian = dianData.map((item) => ({
          num_factura: item.idDocumento,
          nit_proveedor: item.nitProveedor,
          prefijo: item.Prefijo || null,
          razon_social: item['Nombre Receptor'] || item.nombreReceptor || null,
          fecha_emision: item.fechaEmision,
          valor_total: item.valorTotal,
          impuestos: item.iva,
          fuente: "DIAN",
          payload_original: item,
          ejecucion_id: id_ejecucion,
        }));

        const allData = [...bulkSiesa, ...bulkDian];

        if (allData.length > 0) {
          await DocumentoStaging.bulkCreate(allData);
        }

        // No actualizar estado de ejecución - debe permanecer en PENDIENTE y docs_procesados en 0
        // cuando se guardan datos de SIESA o DIAN en staging
        // Solo se marca como FALLIDO si hay un error fatal

        console.log(
          `Ejecución #${id_ejecucion} - Documentos guardados en staging. Estado: PENDIENTE`
        );
      } catch (error) {
        console.error(`Error fatal en ejecución #${id_ejecucion}:`, error);

        await Ejecucion.update(
          { estado: "FALLIDO", fecha_fin: new Date() },
          { where: { id: id_ejecucion } }
        );

        throw error;
      }
    },
    { connection }
  );
} catch (error) {
  console.error("Failed to initialize BullMQ:", error);
}

module.exports = { integrationQueue };
