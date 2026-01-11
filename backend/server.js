const app = require('./app');
require('dotenv').config();
const responseTime = require('response-time');
const { connectDB } = require('./src/database/connection');
const { setupWorker } = require('./src/services/excel-worker.service');
const { setupConciliacionWorker } = require('./src/services/conciliacion-worker.service');
const { setupConciliacionScheduler } = require('./src/services/conciliacion-scheduler.service');
const { setupSyncFacturasScheduler } = require('./src/services/sync-facturas-scheduler.service');
const { ejecutarSyncFacturas } = require('./src/services/sync-facturas.service');
const { getSchedulerEnabled } = require('./src/config/scheduler.config');
const { initialize: initializeLogger } = require('./src/logger/redisLogger');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  
  // Inicializar datos básicos del sistema (roles y usuario admin)
  try {
    const { seedDatabase } = require('./src/database/seed');
    await seedDatabase();
  } catch (error) {
    console.error('[Server] Error al ejecutar seed:', error);
  }
  
  // Inicializar Logger
  await initializeLogger();
  
  // Inicializar Workers
  setupWorker(); // Worker de Excel
  setupConciliacionWorker(); // Worker de Conciliación
  
  // 1. Ejecutar sincronización de facturas al iniciar el servidor (siempre, de forma asíncrona)
  // Usar setImmediate para no bloquear el inicio del servidor
  setImmediate(() => {
    console.log('[Server] Ejecutando sincronización inicial de facturas...');
    ejecutarSyncFacturas('bootstrap').catch((error) => {
      console.error('[Server] Error en sincronización inicial:', error.message);
    });
  });
  
  // 2. Configurar schedulers según variables globales
  const schedulerEnabled = getSchedulerEnabled();
  
  if (schedulerEnabled === true) {
    // Modo automático: configurar todos los schedulers
    console.log('[Server] Modo automático activado. Configurando schedulers...');
    
    // Scheduler de sincronización (cada 12 horas)
    setupSyncFacturasScheduler();
    
    // Scheduler de conciliación (según cronExpressionn)
    setupConciliacionScheduler();
  } else if (schedulerEnabled === false) {
    // Modo manual: no ejecutar sync facturas automáticamente, pero sí conciliación si hay cronExpressionn
    console.log('[Server] Modo manual activado (schedulerEnabled=false).');
    console.log('[Server] Scheduler de sincronización de facturas deshabilitado.');
    console.log('[Server] Configurando scheduler de conciliación si hay cronExpressionn...');
    
    // Scheduler de conciliación (según cronExpressionn) - funciona en modo manual también
    setupConciliacionScheduler();
  } else {
    // null: completamente deshabilitado
    console.log('[Server] Schedulers deshabilitados (schedulerEnabled = null)');
  }

  app.use(responseTime());
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

