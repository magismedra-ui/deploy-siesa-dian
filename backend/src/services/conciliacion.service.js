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
 * Determina el tipo de resultado según la diferencia y tolerancia
 */
const determinarTipoResultado = (diferencia, tolerancia) => {
	if (diferencia === 0) {
		return 'CONCILIADO';
	}
	if (diferencia < 0) {
		return 'NO_EN_SIESA';
	}
	if (diferencia > tolerancia) {
		return 'NO_EN_DIAN';
	}
	return 'DIFERENCIA_VALOR';
};

/**
 * Genera observación descriptiva según el tipo de resultado
 */
const generarObservacion = (tipoResultado, diferencia, tolerancia) => {
	switch (tipoResultado) {
		case 'CONCILIADO':
			return 'Documento conciliado correctamente. Los valores coinciden exactamente.';
		case 'NO_EN_SIESA':
			return `Documento presente en DIAN pero no en SIESA. Diferencia: ${Math.abs(
				diferencia
			)}`;
		case 'NO_EN_DIAN':
			return `Documento presente en SIESA pero no en DIAN, o diferencia excede tolerancia (${tolerancia}). Diferencia: ${diferencia}`;
		case 'DIFERENCIA_VALOR':
			return `Diferencia de valores dentro de la tolerancia permitida (${tolerancia}). Diferencia: ${diferencia}`;
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

		// 2. Obtener documentos pendientes agrupados por NIT y num_factura
		const documentosPendientes = await DocumentoStaging.findAll({
			where: {
				estado: 'PENDIENTE',
				...(ejecucionId && { ejecucion_id: ejecucionId }),
			},
			order: [['nit_proveedor', 'ASC'], ['num_factura', 'ASC']],
			transaction,
		});

		console.log(
			`[Conciliación] Documentos pendientes encontrados: ${documentosPendientes.length}`
		);

		// 3. Agrupar documentos por NIT y num_factura
		const documentosAgrupados = {};
		for (const doc of documentosPendientes) {
			const key = `${doc.nit_proveedor}_${doc.num_factura}`;
			if (!documentosAgrupados[key]) {
				documentosAgrupados[key] = {
					dian: null,
					siesa: null,
				};
			}
			if (doc.fuente === 'DIAN') {
				documentosAgrupados[key].dian = doc;
			} else if (doc.fuente === 'SIESA') {
				documentosAgrupados[key].siesa = doc;
			}
		}

		// 4. Filtrar solo los grupos que tienen ambas fuentes
		const gruposEmparejables = Object.entries(documentosAgrupados).filter(
			([_, grupo]) => grupo.dian && grupo.siesa
		);

		console.log(
			`[Conciliación] Grupos emparejables encontrados: ${gruposEmparejables.length}`
		);

		let registrosProcesados = 0;

		// 5. Procesar cada grupo emparejable
		for (const [key, grupo] of gruposEmparejables) {
			try {
				const docDian = grupo.dian;
				const docSiesa = grupo.siesa;

				// 5.1 Asignar valores
				const VlrDIAN = parseFloat(docDian.valor_total) || 0;
				const VlrSIESA = parseFloat(docSiesa.valor_total) || 0;

				// 5.2 Calcular diferencia
				const diferencia = VlrDIAN - VlrSIESA;

				// 5.3 Determinar tipo de resultado
				const tipoResultado = determinarTipoResultado(
					diferencia,
					VlrTolerancia
				);

				// 5.4 Generar observación
				const observacion = generarObservacion(
					tipoResultado,
					diferencia,
					VlrTolerancia
				);

				// 5.5 Obtener ejecucion_id (usar el de DIAN o el proporcionado)
				const ejecId = ejecucionId || docDian.ejecucion_id;

				// 5.6 Insertar resultado
				await Resultado.create(
					{
						tipo_resultado: tipoResultado,
						nit_proveedor: docDian.nit_proveedor,
						num_factura: docDian.num_factura,
						valor_dian: VlrDIAN,
						valor_siesa: VlrSIESA,
						diferencia: diferencia,
						observacion: observacion,
						ejecucion_id: ejecId,
					},
					{ transaction }
				);

				// 5.7 Actualizar estado de documentos a EMPAREJADO
				await DocumentoStaging.update(
					{ estado: 'EMPAREJADO' },
					{
						where: {
							id: {
								[Op.in]: [docDian.id, docSiesa.id],
							},
						},
						transaction,
					}
				);

				// 5.8 Actualizar docs_procesados en ejecución
				if (ejecId) {
					const ejecucion = await Ejecucion.findByPk(ejecId, {
						transaction,
					});
					if (ejecucion) {
						await Ejecucion.update(
							{
								docs_procesados: sequelize.literal(
									'docs_procesados + 1'
								),
							},
							{
								where: { id: ejecId },
								transaction,
							}
						);
					}
				}

				registrosProcesados++;
			} catch (errorGrupo) {
				console.error(
					`[Conciliación] Error procesando grupo ${key}:`,
					errorGrupo.message
				);
				// Continuar con el siguiente grupo
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

