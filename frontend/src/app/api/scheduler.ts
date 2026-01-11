import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export interface SchedulerConfigRequest {
	schedulerEnabled: boolean | null
	cronExpressionn: string
}

/**
 * Configura el scheduler del sistema
 * @param data - Configuración del scheduler
 * @returns Respuesta del servidor
 */
export const configurarScheduler = async (
	data: SchedulerConfigRequest
): Promise<any> => {
	try {
		const response = await clientHttpClient.post('/api/scheduler/config', data)

		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al configurar el scheduler'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al configurar el scheduler')
	}
}
