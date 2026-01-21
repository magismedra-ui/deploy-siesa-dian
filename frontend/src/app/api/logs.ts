import { clientHttpClient, isAxiosError } from '@/lib/http'
import { getToken } from './auth'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export interface LogEntry {
	id?: string
	jobId: string
	proceso: string
	nivel: string
	mensaje: string
	timestamp: number
	duracionSegundos?: number
	duracionMinutos?: number
}

export interface LogsFilters {
	limit?: number
	from?: number
	to?: number
	niveles?: string[]
	jobId?: string
	duracionMin?: number
	duracionMax?: number
}

/**
 * Obtiene logs históricos con filtros
 */
export const getLogs = async (filters: LogsFilters = {}): Promise<LogEntry[]> => {
	try {
		// Verificar que estamos en el cliente (localStorage disponible)
		if (typeof window === 'undefined') {
			throw new Error('Esta función solo está disponible en el cliente')
		}

		const token = getToken()
		if (!token) {
			// Intentar obtener directamente de localStorage como fallback
			const directToken = localStorage.getItem('auth_token')
			if (!directToken) {
				throw new Error('No hay token de autenticación. Por favor inicie sesión.')
			}
			// Si hay token directo pero getToken() falló, usar el directo
			console.warn('getToken() retornó null, usando token directo de localStorage')
			// Usaremos el token directo en el header más adelante
		}

		const params = new URLSearchParams()
		
		if (filters.limit) params.append('limit', filters.limit.toString())
		if (filters.from) params.append('from', filters.from.toString())
		if (filters.to) params.append('to', filters.to.toString())
		if (filters.niveles && filters.niveles.length > 0) {
			params.append('niveles', filters.niveles.join(','))
		}
		if (filters.jobId) params.append('jobId', filters.jobId)
		if (filters.duracionMin) params.append('duracionMin', filters.duracionMin.toString())
		if (filters.duracionMax) params.append('duracionMax', filters.duracionMax.toString())

		const queryString = params.toString()
		const url = `/api/v1/logs${queryString ? `?${queryString}` : ''}`

		// Usar el token obtenido o el directo de localStorage
		const tokenToUse = token || localStorage.getItem('auth_token')
		
		if (!tokenToUse) {
			throw new Error('No hay token de autenticación disponible')
		}

		const response = await clientHttpClient.get<LogEntry[] | ErrorResponse>(url, {
			validateStatus: function (status) {
				return status < 500 // No lanzar error para códigos 4xx, solo para 5xx
			},
		})

		// Si hay un error de autenticación o autorización
		if (response.status === 401 || response.status === 403) {
			throw new Error('No autorizado para obtener logs. Verifique su token.')
		}

		// Si hay otro error 4xx
		if (response.status >= 400 && response.status < 500) {
			const errorData = response.data as ErrorResponse
			const errorMsg =
				errorData?.message ||
				errorData?.error ||
				`Error ${response.status}`
			throw new Error(errorMsg)
		}

		// Verificar que la respuesta sea un array
		const responseData = response.data as LogEntry[] | ErrorResponse
		if (Array.isArray(responseData)) {
			return responseData
		}
		
		// Si la respuesta tiene estructura { success, count, logs: [] }
		if (responseData && typeof responseData === 'object' && 'logs' in responseData && Array.isArray((responseData as any).logs)) {
			return (responseData as any).logs
		}
		
		// Si la respuesta tiene estructura { data: [] }
		if (responseData && typeof responseData === 'object' && 'data' in responseData && Array.isArray((responseData as any).data)) {
			return (responseData as any).data
		}
		
		// Si no hay datos, retornar array vacío
		console.warn('Respuesta de logs no es un array ni tiene estructura esperada:', responseData)
		return []
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener logs históricos'
			
			throw new Error(errorMessage)
		}
		
		// Si es un Error estándar, pasar el mensaje
		if (error instanceof Error) {
			throw error
		}
		
		// Error desconocido
		console.error('Error desconocido al obtener logs:', error)
		throw new Error(`Error desconocido al obtener logs históricos: ${String(error)}`)
	}
}

