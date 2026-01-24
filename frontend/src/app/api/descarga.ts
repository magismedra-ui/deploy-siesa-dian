import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

// ==================== INTERFACES ====================

export interface Resultado {
	id: number
	tipo_resultado: string
	nit_proveedor: string
	num_factura: string
	prefijo?: string
	razon_social?: string
	fecha_emision?: string
	valor_dian: number
	valor_siesa: number
	diferencia: number
	observacion?: string
	ejecucion_id: number
	createdAt: string
	updatedAt: string
}

export interface ResultadosResponse {
	data: Resultado[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface DocumentoStaging {
	id?: number
	nit_proveedor: string
	num_factura: string
	prefijo?: string
	razon_social?: string
	fuente: 'DIAN' | 'SIESA'
	estado?: string
	fecha_emision?: string
	valor_total?: number | string
	impuestos?: number | string
	payload_original?: Record<string, any>
	ejecucion_id?: number
	createdAt?: string
	updatedAt?: string
	[key: string]: any
}

export interface DocumentosStagingResponse {
	dian?: DocumentoStaging
	siesa?: DocumentoStaging
}

// ==================== RESULTADOS ====================

/**
 * Obtiene los resultados con paginación desde repo_resultados
 */
export const getResultados = async (
	page: number = 0,
	limit: number = 10,
	estado?: string,
	nit_proveedor?: string,
	fecha_emision?: string
): Promise<ResultadosResponse> => {
	try {
		const params = new URLSearchParams()
		params.append('page', (page + 1).toString()) // Backend generalmente usa página base 1
		params.append('limit', limit.toString())
		if (estado) {
			params.append('estado', estado)
		}
		if (nit_proveedor) {
			params.append('nit_proveedor', nit_proveedor)
		}
		if (fecha_emision) {
			params.append('fecha_emision', fecha_emision)
		}

		const response = await clientHttpClient.get(
			`/api/descarga/resultados?${params.toString()}`
		)
		
		// Si la respuesta es un array directo, convertirla al formato esperado
		if (Array.isArray(response.data)) {
			return {
				data: response.data,
				total: response.data.length,
				page,
				limit,
				totalPages: Math.ceil(response.data.length / limit),
			}
		}

		// Si la respuesta tiene la estructura esperada, retornarla directamente
		if (response.data && (response.data.data || Array.isArray(response.data))) {
			return {
				data: response.data.data || response.data,
				total: response.data.total || (Array.isArray(response.data) ? response.data.length : 0),
				page: response.data.page !== undefined ? response.data.page - 1 : page, // Convertir a base 0
				limit: response.data.limit || limit,
				totalPages: response.data.totalPages || Math.ceil((response.data.total || response.data.length || 0) / (response.data.limit || limit)),
			}
		}

		// Fallback: retornar estructura vacía
		return {
			data: [],
			total: 0,
			page,
			limit,
			totalPages: 0,
		}
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener resultados'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener resultados')
	}
}

/**
 * Transforma un Resultado de repo_resultados a DocumentoStaging para compatibilidad con la tabla
 */
const transformarResultadoADocumentoStaging = (resultado: Resultado): DocumentoStaging => {
	// Determinar fuente basándose en qué valor está presente
	// Si ambos están presentes, usar DIAN como predeterminado
	const fuente = resultado.valor_dian && resultado.valor_siesa 
		? 'DIAN' 
		: resultado.valor_dian 
			? 'DIAN' 
			: 'SIESA'
	
	// Usar el valor mayor o el promedio si ambos están presentes
	const valorTotal = resultado.valor_dian && resultado.valor_siesa
		? Math.max(resultado.valor_dian, resultado.valor_siesa)
		: resultado.valor_dian || resultado.valor_siesa || 0
	
	return {
		id: resultado.id,
		nit_proveedor: resultado.nit_proveedor,
		num_factura: resultado.num_factura,
		prefijo: resultado.prefijo,
		razon_social: resultado.razon_social,
		fuente: fuente as 'DIAN' | 'SIESA',
		estado: resultado.tipo_resultado,
		fecha_emision: resultado.fecha_emision || undefined,
		valor_total: valorTotal,
		impuestos: Math.abs(resultado.diferencia) || 0, // Mostrar diferencia como impuestos para visualización
		ejecucion_id: resultado.ejecucion_id,
		createdAt: resultado.createdAt,
		updatedAt: resultado.updatedAt,
		// Campos adicionales del resultado para mostrar en la tabla
		valor_dian: resultado.valor_dian,
		valor_siesa: resultado.valor_siesa,
		diferencia: resultado.diferencia,
		observacion: resultado.observacion,
	}
}

/**
 * Obtiene resultados de repo_resultados y los transforma a formato DocumentoStaging
 */
export const getResultadosComoDocumentosStaging = async (
	estado: string,
	page: number = 0,
	limit: number = 10,
	nit_proveedor?: string,
	fecha_emision?: string
): Promise<DocumentosStagingPorEstadoResponse> => {
	try {
		const resultadosResponse = await getResultados(page, limit, estado, nit_proveedor, fecha_emision)
		
		// Transformar resultados a formato DocumentoStaging
		const documentosStaging = resultadosResponse.data.map(transformarResultadoADocumentoStaging)
		
		return {
			data: documentosStaging,
			total: resultadosResponse.total,
			page: resultadosResponse.page,
			limit: resultadosResponse.limit,
			totalPages: resultadosResponse.totalPages,
			estado,
		}
	} catch (error) {
		console.error('Error en getResultadosComoDocumentosStaging:', error)
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener resultados como documentos staging'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener resultados como documentos staging')
	}
}

// ==================== DOCUMENTOS STAGING ====================

/**
 * Busca documentos staging por NIT y número de factura
 */
export const buscarDocumentosStaging = async (
	nit_proveedor: string,
	num_factura: string
): Promise<DocumentosStagingResponse> => {
	try {
		const params = new URLSearchParams()
		params.append('nit_proveedor', nit_proveedor)
		params.append('num_factura', num_factura)

		const response = await clientHttpClient.get(
			`/api/descarga/documentos-staging/buscar?${params.toString()}`
		)
		
		const data = response.data
		
		// Si la respuesta tiene la estructura { success, total, documentos: [...] }
		if (data && data.documentos && Array.isArray(data.documentos)) {
			const documentos = data.documentos
			const dianDoc = documentos.find((doc: any) => 
				doc.fuente === 'DIAN' || 
				doc.fuente === 'dian' || 
				doc.FUENTE === 'DIAN' || 
				doc.FUENTE === 'dian'
			)
			const siesaDoc = documentos.find((doc: any) => 
				doc.fuente === 'SIESA' || 
				doc.fuente === 'siesa' || 
				doc.FUENTE === 'SIESA' || 
				doc.FUENTE === 'siesa'
			)
			
			return {
				dian: dianDoc || undefined,
				siesa: siesaDoc || undefined,
			}
		}
		
		// Si la respuesta ya tiene la estructura esperada { dian: {...}, siesa: {...} }
		if (data && (data.dian || data.siesa)) {
			return {
				dian: data.dian || undefined,
				siesa: data.siesa || undefined,
			}
		}
		
		// Si la respuesta es un array directamente, separar por fuente
		if (Array.isArray(data)) {
			const dianDoc = data.find((doc: any) => 
				doc.fuente === 'DIAN' || 
				doc.fuente === 'dian' || 
				doc.FUENTE === 'DIAN' || 
				doc.FUENTE === 'dian'
			)
			const siesaDoc = data.find((doc: any) => 
				doc.fuente === 'SIESA' || 
				doc.fuente === 'siesa' || 
				doc.FUENTE === 'SIESA' || 
				doc.FUENTE === 'siesa'
			)
			
			return {
				dian: dianDoc || undefined,
				siesa: siesaDoc || undefined,
			}
		}
		
		// Si la respuesta es un objeto simple, verificar si tiene campo fuente
		if (data && typeof data === 'object' && !Array.isArray(data)) {
			const fuente = data.fuente || data.FUENTE
			if (fuente === 'DIAN' || fuente === 'dian') {
				return {
					dian: data as DocumentoStaging,
					siesa: undefined,
				}
			} else if (fuente === 'SIESA' || fuente === 'siesa') {
				return {
					dian: undefined,
					siesa: data as DocumentoStaging,
				}
			}
			
			// Si no tiene fuente pero tiene datos, asumir que es el formato esperado
			return {
				dian: data.dian || undefined,
				siesa: data.siesa || undefined,
			}
		}
		
		// Fallback: retornar estructura vacía
		console.warn('Formato de respuesta no reconocido:', data)
		return {
			dian: undefined,
			siesa: undefined,
		}
	} catch (error) {
		console.error('Error en buscarDocumentosStaging:', error)
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al buscar documentos staging'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al buscar documentos staging')
	}
}

// ==================== DOCUMENTOS STAGING POR ESTADO ====================

export interface DocumentosStagingPorEstadoResponse {
	data: DocumentoStaging[]
	total: number
	page: number
	limit: number
	totalPages: number
	estado: string
}

/**
 * Obtiene documentos staging filtrados por estado con paginación
 */
export const getDocumentosStagingPorEstado = async (
	estado: string,
	page: number = 0,
	limit: number = 10,
	nit_proveedor?: string,
	fecha_emision?: string
): Promise<DocumentosStagingPorEstadoResponse> => {
	try {
		const params = new URLSearchParams()
		params.append('page', (page + 1).toString()) // Backend generalmente usa página base 1
		params.append('limit', limit.toString())
		params.append('estado', estado)
		if (nit_proveedor) {
			params.append('nit_proveedor', nit_proveedor)
		}
		if (fecha_emision) {
			params.append('fecha_emision', fecha_emision)
		}

		const response = await clientHttpClient.get(
			`/api/descarga/documentos-staging/por-estado?${params.toString()}`
		)
		
		// Si la respuesta tiene la estructura esperada, retornarla directamente
		if (response.data && (response.data.data || Array.isArray(response.data))) {
			const result = {
				data: response.data.data || response.data,
				total: response.data.total || (Array.isArray(response.data) ? response.data.length : 0),
				page: response.data.page !== undefined ? response.data.page - 1 : page, // Convertir a base 0
				limit: response.data.limit || limit,
				totalPages: response.data.totalPages || Math.ceil((response.data.total || response.data.length || 0) / (response.data.limit || limit)),
				estado: response.data.estado || estado,
			}
			return result
		}

		// Fallback: retornar estructura vacía
		return {
			data: [],
			total: 0,
			page,
			limit,
			totalPages: 0,
			estado,
		}
	} catch (error) {
		console.error('Error en getDocumentosStagingPorEstado:', error)
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener documentos staging por estado'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener documentos staging por estado')
	}
}
