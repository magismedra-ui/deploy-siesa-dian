/**
 * Script de prueba para ejecutar el proceso de conciliación
 * Uso: node test-conciliacion.js [ejecucionId]
 * 
 * Ejemplo:
 *   node test-conciliacion.js          -> Procesa todos los documentos
 *   node test-conciliacion.js 123      -> Procesa documentos de la ejecución 123
 */

require('dotenv').config();
const { connectDB } = require('./src/database/connection');
const { procesarConciliacion } = require('./src/services/conciliacion.service');

const ejecutarPrueba = async () => {
	try {
		console.log('='.repeat(60));
		console.log('PRUEBA DE PROCESO DE CONCILIACIÓN');
		console.log('='.repeat(60));
		console.log('');

		// Conectar a la base de datos
		console.log('[Test] Conectando a la base de datos...');
		await connectDB();
		console.log('[Test] ✓ Conexión exitosa a la base de datos\n');

		// Obtener ejecucionId de argumentos de línea de comandos (opcional)
		const ejecucionId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
		
		if (ejecucionId) {
			console.log(`[Test] Procesando conciliación para ejecución ID: ${ejecucionId}\n`);
		} else {
			console.log('[Test] Procesando conciliación para todas las ejecuciones\n');
		}

		// Ejecutar el proceso de conciliación
		const inicio = Date.now();
		console.log('[Test] Iniciando proceso de conciliación...\n');
		
		const resultado = await procesarConciliacion(ejecucionId);

		const fin = Date.now();
		const duracionSegundos = ((fin - inicio) / 1000).toFixed(2);
		const duracionMinutos = (duracionSegundos / 60).toFixed(2);

		// Mostrar resultados
		console.log('');
		console.log('='.repeat(60));
		console.log('RESULTADOS DEL PROCESO DE CONCILIACIÓN');
		console.log('='.repeat(60));
		console.log(`✓ Proceso completado exitosamente`);
		console.log(`✓ Duración: ${duracionSegundos} segundos (${duracionMinutos} minutos)`);
		console.log(`✓ Registros procesados: ${resultado.registrosProcesados}`);
		console.log(`✓ Total de documentos pendientes: ${resultado.totalPendientes}`);
		console.log(`✓ Grupos emparejables: ${resultado.gruposEmparejables}`);
		console.log('='.repeat(60));

		process.exit(0);
	} catch (error) {
		console.error('');
		console.error('='.repeat(60));
		console.error('ERROR EN EL PROCESO DE CONCILIACIÓN');
		console.error('='.repeat(60));
		console.error(`✗ Error: ${error.message}`);
		if (error.stack) {
			console.error('\nStack trace:');
			console.error(error.stack);
		}
		console.error('='.repeat(60));
		process.exit(1);
	}
};

// Ejecutar la prueba
ejecutarPrueba();
