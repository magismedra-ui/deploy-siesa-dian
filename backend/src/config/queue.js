const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: function (times) {
    // Detener reintentos inmediatamente en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }
    // En producción, limitar reintentos
    if (times > 3) {
      return null;
    }
    return Math.min(times * 50, 2000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
  enableReadyCheck: false,
  connectTimeout: 1000, // Timeout corto para fallar rápido
  family: 4, // Solo usar IPv4 para evitar intentos duales
});

// Manejo de errores de conexión
connection.on('error', (err) => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Redis Queue] Redis connection failed:', err.message);
  }
  // En desarrollo, los errores se silencian aquí
});

connection.on('connect', () => {
  console.log('[Redis Queue] Redis conectado exitosamente');
});

const excelQueue = new Queue('excel-processing', { connection });
const conciliacionQueue = new Queue('conciliacion-process', { connection });

module.exports = {
  excelQueue,
  conciliacionQueue,
  redisConnection: connection
};

