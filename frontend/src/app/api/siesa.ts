import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export interface SiesaSyncParams {
	fechaInicio: string // Formato YYYYMMDD
	fechaFin: string // Formato YYYYMMDD
	idCia?: string // Opcional, default: "5"
	nombreConsulta?: 'listar_facturas_servicios' | 'listar_facturas_proveedores' // Opcional, default: "listar_facturas_servicios"
	idProveedor?: string // Opcional, default: "I2D"
}

export interface SiesaSyncResponse {
	success: boolean
	message: string
	ejecucionId: number
	registrosProcesados: number
	parametrosUsados: {
		fechaInicio: string
		fechaFin: string
		idCia: string
		nombreConsulta: string
		idProveedor: string
	}
}

/**
 * Sincroniza facturas desde SIESA con parámetros personalizados
 * @param params - Parámetros de sincronización
 * @returns Respuesta del servidor
 */
export const syncSiesaConParametros = async (params: SiesaSyncParams): Promise<SiesaSyncResponse> => {
	try {
		const response = await clientHttpClient.post<SiesaSyncResponse>('/api/v1/siesa/sync-con-parametros', params)

		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al sincronizar facturas desde SIESA'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al sincronizar facturas desde SIESA')
	}
}
