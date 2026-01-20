const { Op } = require('sequelize');
const DocumentoStaging = require('../database/models/DocumentoStaging');
const Resultado = require('../database/models/Resultado');
const Parametro = require('../database/models/Parametro');
const Ejecucion = require('../database/models/Ejecucion');
const { sequelize } = require('../database/connection');

/**
 * Helper para parsear tiempo de reintentos (ej: "1m" = 1 minuto, "30s" = 30 segundos)
 */
const parseRetryTime = (timeStr) => {
	if (!timeStr || typeof timeStr !== 'string') {
		return 30000; // Default 30 segundos
	}

	const trimmed = timeStr.trim().toLowerCase();
	const match = trimmed.match(/^(\d+)([smhd])$/);

	if (!match) {
		return 30000; // Default si no se puede parsear
	}

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 's':
			return value * 1000; // segundos a milisegundos
		case 'm':
			return value * 60 * 1000; // minutos a milisegundos
		case 'h':
			return value * 60 * 60 * 1000; // horas a milisegundos
		case 'd':
			return value * 24 * 60 * 60 * 1000; // días a milisegundos
		default:
			return 30000;
	}
};

/**
 * Obtiene los parámetros de configuración necesarios para la conciliación
 */
const obtenerParametros = async () => {
	try {
		const toleranciaParam = await Parametro.findOne({
			where: { clave: 'TOLERANCIA_COP' },
		});

		const reintentosParam = await Parametro.findOne({
			where: { clave: 'REINTENTOS_MAX' },
		});

		const VlrTolerancia = toleranciaParam
			? parseFloat(toleranciaParam.valor) || 0
			: 0;

		const VlrReintentos = reintentosParam
			? parseRetryTime(reintentosParam.valor)
			: 30000; // Default 30 segundos

		return { VlrTolerancia, VlrReintentos };
	} catch (error) {
		console.error('Error obteniendo parámetros:', error);
		return { VlrTolerancia: 0, VlrReintentos: 30000 };
	}
};

/**
 * Determina el estado del documento según la diferencia y tolerancia
 * Reglas:
 * - Si diferencia === 0 → CONCILIADO
 * - Si diferencia !== 0 (aunque esté dentro de la tolerancia) → CONCILIADO CON DIFERENCIA
 * - La tolerancia se usa solo para determinar si la diferencia es aceptable, pero cualquier diferencia > 0 marca como CONCILIADO CON DIFERENCIA
 */
const determinarEstadoDocumento = (diferencia, tolerancia) => {
	// Si diferencia es exactamente 0, es CONCILIADO
	if (diferencia === 0) {
		return 'CONCILIADO';
	}
	
	// Cualquier diferencia diferente de 0 (aunque esté dentro de la tolerancia) es CONCILIADO CON DIFERENCIA
	return 'CONCILIADO CON DIFERENCIA';
};

/**
 * Genera observación descriptiva según el estado del documento
 */
const generarObservacion = (estado, diferencia, tolerancia) => {
	const diferenciaAbs = Math.abs(diferencia);
	
	switch (estado) {
		case 'CONCILIADO':
			// Solo se ejecuta cuando diferencia === 0
			return 'Documento conciliado correctamente. Los valores coinciden exactamente.';
		case 'CONCILIADO CON DIFERENCIA':
			// Incluye todas las diferencias > 0, tanto dentro como fuera de la tolerancia
			if (diferenciaAbs <= tolerancia) {
				return `Documento conciliado con diferencia dentro de la tolerancia permitida (${tolerancia}). Diferencia: ${diferenciaAbs}`;
			}
			return `Documento conciliado con diferencia que excede la tolerancia permitida (${tolerancia}). Diferencia: ${diferenciaAbs}`;
		case 'NO CONCILIADO SOLO EN SIESA':
			return 'Documento presente solo en SIESA, no encontrado en DIAN.';
		case 'NO CONCILIADO SOLO EN DIAN':
			return 'Documento presente solo en DIAN, no encontrado en SIESA.';
		default:
			return 'Resultado de conciliación procesado.';
	}
};

/**
 * Procesa la conciliación de documentos pendientes
 */
const procesarConciliacion = async (ejecucionId = null) => {
	const transaction = await sequelize.transaction();

	try {
		console.log(
			`[Conciliación] Iniciando proceso de conciliación${ejecucionId ? ` para ejecución ${ejecucionId}` : ''}`
		);

		// 1. Obtener parámetros de configuración
		const { VlrTolerancia, VlrReintentos } = await obtenerParametros();
		console.log(
			`[Conciliación] Parámetros: Tolerancia=${VlrTolerancia}, Reintentos=${VlrReintentos}ms`
		);

		// 2. Obtener documentos pendientes o no conciliados agrupados por NIT y num_factura
		// Incluir PENDIENTE, NO CONCILIADO SOLO EN SIESA y NO CONCILIADO SOLO EN DIAN
		const whereClause = {
			estado: {
				[Op.in]: [
					'PENDIENTE',
					'NO CONCILIADO SOLO EN SIESA',
					'NO CONCILIADO SOLO EN DIAN',
				],
			},
		};
		
		if (ejecucionId) {
			whereClause.ejecucion_id = ejecucionId;
			console.log(
				`[Conciliación] Buscando documentos con ejecucion_id: ${ejecucionId}`
			);
		} else {
			console.log(
				`[Conciliación] Buscando documentos de todas las ejecuciones`
			);
		}
		
		const documentosPendientes = await DocumentoStaging.findAll({
			where: whereClause,
			order: [['nit_proveedor', 'ASC'], ['num_factura', 'ASC']],
			transaction,
		});

		console.log(
			`[Conciliación] Documentos pendientes/no conciliados encontrados: ${documentosPendientes.length}`
		);
		
		// Log detallado de documentos encontrados por estado
		if (documentosPendientes.length > 0) {
			const conteoPorEstado = documentosPendientes.reduce((acc, doc) => {
				acc[doc.estado] = (acc[doc.estado] || 0) + 1;
				return acc;
			}, {});
			console.log(
				`[Conciliación] Distribución de documentos por estado:`,
				conteoPorEstado
			);
		} else {
			console.warn(
				`[Conciliación] ⚠ No se encontraron documentos con estados: PENDIENTE, NO CONCILIADO SOLO EN SIESA, NO CONCILIADO SOLO EN DIAN${ejecucionId ? ` para ejecución ${ejecucionId}` : ''}`
			);
		}

		// 3. Agrupar documentos por NIT y num_factura
		// IMPORTANTE: Conservar TODOS los documentos, no agrupar múltiples documentos de la misma fuente
		// Cada documento debe procesarse individualmente
		const documentosAgrupados = {};
		for (const doc of documentosPendientes) {
			const key = `${doc.nit_proveedor}_${doc.num_factura}`;
			if (!documentosAgrupados[key]) {
				documentosAgrupados[key] = {
					dian: [],
					siesa: [],
				};
			}
			// Agregar TODOS los documentos según su fuente (no solo el primero)
			if (doc.fuente === 'DIAN') {
				documentosAgrupados[key].dian.push(doc);
			} else if (doc.fuente === 'SIESA') {
				documentosAgrupados[key].siesa.push(doc);
			}
		}

		// 4. Separar grupos emparejables y grupos no emparejables
		// Un grupo es emparejable si tiene al menos un documento DIAN y al menos un documento SIESA
		const gruposEmparejables = Object.entries(documentosAgrupados).filter(
			([_, grupo]) => grupo.dian.length > 0 && grupo.siesa.length > 0
		);
		
		const gruposNoEmparejables = Object.entries(documentosAgrupados).filter(
			([_, grupo]) => grupo.dian.length === 0 || grupo.siesa.length === 0
		);

		console.log(
			`[Conciliación] Grupos emparejables encontrados: ${gruposEmparejables.length}`
		);
		console.log(
			`[Conciliación] Grupos no emparejables encontrados: ${gruposNoEmparejables.length}`
		);
		
		// Log resumido de grupos no emparejables (sin detalle para evitar logs excesivos)

		let registrosProcesados = 0;
		const BATCH_SIZE = 500; // Tamaño de lote para bulkCreate
		let resultadosBatch = []; // Acumulador para resultados
		let updatesBatch = []; // Acumulador para actualizaciones

		// 5. Procesar cada grupo emparejable
		// IMPORTANTE: Emparejar documentos uno a uno, conservando todos los registros
		for (const [key, grupo] of gruposEmparejables) {
			try {
				// Emparejar documentos DIAN con documentos SIESA uno a uno
				// Si hay más documentos de una fuente que de la otra, los excedentes se procesarán como no emparejables
				const minLength = Math.min(grupo.dian.length, grupo.siesa.length);
				
				// Procesar emparejamientos uno a uno
				for (let i = 0; i < minLength; i++) {
					const docDian = grupo.dian[i];
					const docSiesa = grupo.siesa[i];

					// 5.1 Asignar valores
					const VlrDIAN = parseFloat(docDian.valor_total) || 0;
					const VlrSIESA = parseFloat(docSiesa.valor_total) || 0;

					// 5.2 Calcular diferencia
					const diferencia = VlrDIAN - VlrSIESA;

					// 5.3 Determinar estado del documento según diferencia y tolerancia
					const estadoDocumento = determinarEstadoDocumento(
						diferencia,
						VlrTolerancia
					);

					// 5.4 Generar observación
					const observacion = generarObservacion(
						estadoDocumento,
						diferencia,
						VlrTolerancia
					);

					// 5.5 Obtener ejecucion_id (usar el de DIAN o el proporcionado)
					const ejecId = ejecucionId || docDian.ejecucion_id;

					// 5.6 Agregar resultado al batch
					// Usar la fecha_emision del documento DIAN (ambos deberían tener la misma fecha)
					// Si por alguna razón no hay fecha, usar la fecha actual como fallback
					let fechaEmision = docDian.fecha_emision || docSiesa.fecha_emision;
					
					// Validar que la fecha esté presente y sea válida
					if (!fechaEmision) {
						console.warn(
							`[Conciliación] Advertencia: No se encontró fecha_emision para NIT ${docDian.nit_proveedor}, Factura ${docDian.num_factura}. Usando fecha actual.`
						);
						fechaEmision = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
					}
					
					// Asegurar que la fecha esté en formato YYYY-MM-DD (DATEONLY)
					if (fechaEmision instanceof Date) {
						fechaEmision = fechaEmision.toISOString().split('T')[0];
					} else if (typeof fechaEmision === 'string' && fechaEmision.includes('T')) {
						// Si viene con hora, extraer solo la fecha
						fechaEmision = fechaEmision.split('T')[0];
					}
					
					resultadosBatch.push({
						tipo_resultado: estadoDocumento,
						nit_proveedor: docDian.nit_proveedor,
						num_factura: docDian.num_factura,
						fecha_emision: fechaEmision, // Guardar fecha_emision
						valor_dian: VlrDIAN,
						valor_siesa: VlrSIESA,
						diferencia: diferencia,
						observacion: observacion,
						ejecucion_id: ejecId,
					});

					// 5.7 Agregar actualizaciones al batch
					updatesBatch.push(
						{ id: docDian.id, estado: estadoDocumento },
						{ id: docSiesa.id, estado: estadoDocumento }
					);
				}
				
				// Los documentos excedentes (si los hay) se procesarán como no emparejables más adelante
				// Agregar documentos excedentes a gruposNoEmparejables para procesarlos
				if (grupo.dian.length > minLength) {
					// Hay documentos DIAN excedentes
					for (let i = minLength; i < grupo.dian.length; i++) {
						const docExcedente = grupo.dian[i];
						// Solo procesar si está en estado PENDIENTE
						if (docExcedente.estado === 'PENDIENTE') {
							gruposNoEmparejables.push([
								`${docExcedente.nit_proveedor}_${docExcedente.num_factura}_excedente_dian_${i}`,
								{ dian: [docExcedente], siesa: [] }
							]);
						}
					}
				}
				
				if (grupo.siesa.length > minLength) {
					// Hay documentos SIESA excedentes
					for (let i = minLength; i < grupo.siesa.length; i++) {
						const docExcedente = grupo.siesa[i];
						// Solo procesar si está en estado PENDIENTE
						if (docExcedente.estado === 'PENDIENTE') {
							gruposNoEmparejables.push([
								`${docExcedente.nit_proveedor}_${docExcedente.num_factura}_excedente_siesa_${i}`,
								{ dian: [], siesa: [docExcedente] }
							]);
						}
					}
				}

				// 5.8 Procesar batch cuando alcance el tamaño máximo
				if (resultadosBatch.length >= BATCH_SIZE) {
					try {
						// Solo guardar resultados con estado CONCILIADO o CONCILIADO CON DIFERENCIA
						const resultadosParaGuardar = resultadosBatch.filter(
							resultado => 
								resultado.tipo_resultado === 'CONCILIADO' || 
								resultado.tipo_resultado === 'CONCILIADO CON DIFERENCIA'
						);
						
						if (resultadosParaGuardar.length > 0) {
							await Resultado.bulkCreate(resultadosParaGuardar, {
								transaction,
								ignoreDuplicates: false,
							});
						}
						resultadosBatch = [];
					} catch (batchError) {
						console.error(
							`[Conciliación] Error en bulkCreate de resultados:`,
							batchError.message
						);
						throw batchError;
					}
				}

				// 5.9 Procesar actualizaciones en batch y eliminar documentos conciliados
				if (updatesBatch.length >= BATCH_SIZE) {
					try {
						// Separar IDs de documentos conciliados (CONCILIADO y CONCILIADO CON DIFERENCIA)
						const idsConciliados = updatesBatch
							.filter(item => 
								item.estado === 'CONCILIADO' || 
								item.estado === 'CONCILIADO CON DIFERENCIA'
							)
							.map(item => item.id);

						// Actualizar estados primero
						for (const updateItem of updatesBatch) {
							await DocumentoStaging.update(
								{ estado: updateItem.estado },
								{
									where: { id: updateItem.id },
									transaction,
								}
							);
						}

						// Eliminar documentos conciliados de proc_documentos_staging
						if (idsConciliados.length > 0) {
							await DocumentoStaging.destroy({
								where: {
									id: {
										[Op.in]: idsConciliados,
									},
								},
								transaction,
							});
							console.log(
								`[Conciliación] Eliminados ${idsConciliados.length} documentos conciliados de proc_documentos_staging (batch intermedio)`
							);
						}

						updatesBatch = [];
					} catch (updateBatchError) {
						console.error(
							`[Conciliación] Error en batch de actualizaciones:`,
							updateBatchError.message
						);
						throw updateBatchError;
					}
				}

				// Contar cada emparejamiento procesado (2 documentos por emparejamiento: DIAN + SIESA)
				registrosProcesados += minLength * 2;
			} catch (errorGrupo) {
				console.error(
					`[Conciliación] Error procesando grupo ${key}:`,
					errorGrupo.message
				);
				// Continuar con el siguiente grupo
			}
		}

		// 5.10 Procesar batch final de resultados
		if (resultadosBatch.length > 0) {
			try {
				// Solo guardar resultados con estado CONCILIADO o CONCILIADO CON DIFERENCIA
				const resultadosParaGuardar = resultadosBatch.filter(
					resultado => 
						resultado.tipo_resultado === 'CONCILIADO' || 
						resultado.tipo_resultado === 'CONCILIADO CON DIFERENCIA'
				);
				
				if (resultadosParaGuardar.length > 0) {
					await Resultado.bulkCreate(resultadosParaGuardar, {
						transaction,
						ignoreDuplicates: false,
					});
					console.log(
						`[Conciliación] Guardados ${resultadosParaGuardar.length} resultados conciliados en repo_resultados`
					);
				}
				resultadosBatch = [];
			} catch (batchError) {
				console.error(
					`[Conciliación] Error en bulkCreate final de resultados:`,
					batchError.message
				);
				throw batchError;
			}
		}

		// 5.11 Procesar batch final de actualizaciones y eliminar documentos conciliados
		if (updatesBatch.length > 0) {
			try {
				// Separar IDs de documentos conciliados (CONCILIADO y CONCILIADO CON DIFERENCIA)
				const idsConciliados = updatesBatch
					.filter(item => 
						item.estado === 'CONCILIADO' || 
						item.estado === 'CONCILIADO CON DIFERENCIA'
					)
					.map(item => item.id);

				// Actualizar estados primero
				for (const updateItem of updatesBatch) {
					await DocumentoStaging.update(
						{ estado: updateItem.estado },
						{
							where: { id: updateItem.id },
							transaction,
						}
					);
				}

				// Eliminar documentos conciliados de proc_documentos_staging
				if (idsConciliados.length > 0) {
					await DocumentoStaging.destroy({
						where: {
							id: {
								[Op.in]: idsConciliados,
							},
						},
						transaction,
					});
					console.log(
						`[Conciliación] Eliminados ${idsConciliados.length} documentos conciliados de proc_documentos_staging`
					);
				}

				updatesBatch = [];
			} catch (updateBatchError) {
				console.error(
					`[Conciliación] Error en batch final de actualizaciones:`,
					updateBatchError.message
				);
				throw updateBatchError;
			}
		}

		// 6. Procesar grupos no emparejables (solo en SIESA o solo en DIAN)
		// IMPORTANTE: Solo cambiar el estado si el documento está en PENDIENTE
		// Si ya tiene estado NO CONCILIADO SOLO EN SIESA o NO CONCILIADO SOLO EN DIAN, no cambiarlo
		// NOTA: Estos documentos NO se guardan en repo_resultados, solo se actualizan en proc_documentos_staging
		let updatesNoEmparejablesBatch = [];

		for (const [key, grupo] of gruposNoEmparejables) {
			try {
				// Procesar TODOS los documentos SIESA sin par
				if (grupo.siesa && grupo.siesa.length > 0 && grupo.dian.length === 0) {
					for (const doc of grupo.siesa) {
						// Solo cambiar el estado si está en PENDIENTE
						if (doc.estado === 'PENDIENTE') {
							const estadoNoEmparejado = 'NO CONCILIADO SOLO EN SIESA';
							
							// Agregar actualización al batch
							updatesNoEmparejablesBatch.push({
								id: doc.id,
								estado: estadoNoEmparejado,
							});

							// Procesar actualizaciones en batch
							if (updatesNoEmparejablesBatch.length >= BATCH_SIZE) {
								try {
									for (const updateItem of updatesNoEmparejablesBatch) {
										await DocumentoStaging.update(
											{ estado: updateItem.estado },
											{
												where: { id: updateItem.id },
												transaction,
											}
										);
									}
									updatesNoEmparejablesBatch = [];
								} catch (updateBatchError) {
									console.error(
										`[Conciliación] Error en batch de actualizaciones no emparejables:`,
										updateBatchError.message
									);
									// Continuar procesando
								}
							}

							registrosProcesados++;
						}
					}
				}
				
				// Procesar TODOS los documentos DIAN sin par
				if (grupo.dian && grupo.dian.length > 0 && grupo.siesa.length === 0) {
					for (const doc of grupo.dian) {
						// Solo cambiar el estado si está en PENDIENTE
						if (doc.estado === 'PENDIENTE') {
							const estadoNoEmparejado = 'NO CONCILIADO SOLO EN DIAN';
							
							// Agregar actualización al batch
							updatesNoEmparejablesBatch.push({
								id: doc.id,
								estado: estadoNoEmparejado,
							});

							// Procesar actualizaciones en batch
							if (updatesNoEmparejablesBatch.length >= BATCH_SIZE) {
								try {
									for (const updateItem of updatesNoEmparejablesBatch) {
										await DocumentoStaging.update(
											{ estado: updateItem.estado },
											{
												where: { id: updateItem.id },
												transaction,
											}
										);
									}
									updatesNoEmparejablesBatch = [];
								} catch (updateBatchError) {
									console.error(
										`[Conciliación] Error en batch de actualizaciones no emparejables:`,
										updateBatchError.message
									);
									// Continuar procesando
								}
							}

							registrosProcesados++;
						}
					}
				}
			} catch (errorGrupo) {
				console.error(
					`[Conciliación] Error procesando grupo no emparejable ${key}:`,
					errorGrupo.message
				);
				// Continuar con el siguiente grupo
			}
		}

		// 6.1 Procesar batch final de actualizaciones no emparejables
		if (updatesNoEmparejablesBatch.length > 0) {
			try {
				for (const updateItem of updatesNoEmparejablesBatch) {
					await DocumentoStaging.update(
						{ estado: updateItem.estado },
						{
							where: { id: updateItem.id },
							transaction,
						}
					);
				}
			} catch (updateBatchError) {
				console.error(
					`[Conciliación] Error en batch final de actualizaciones no emparejables:`,
					updateBatchError.message
				);
			}
		}

		await transaction.commit();
		console.log(
			`[Conciliación] Proceso completado. Registros procesados: ${registrosProcesados}`
		);

		return {
			success: true,
			registrosProcesados,
			totalPendientes: documentosPendientes.length,
			gruposEmparejables: gruposEmparejables.length,
		};
	} catch (error) {
		await transaction.rollback();
		console.error('[Conciliación] Error en proceso:', error);
		throw error;
	}
};

module.exports = {
	procesarConciliacion,
	obtenerParametros,
	parseRetryTime,
};

