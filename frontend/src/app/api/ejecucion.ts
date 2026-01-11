import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

/**
 * Sube un archivo Excel al servidor
 * @param file - Archivo Excel a subir
 * @returns Respuesta del servidor
 */
export const uploadExcelFile = async (file: File): Promise<any> => {
	try {
		const formData = new FormData()
		formData.append('file', file)

		const response = await clientHttpClient.post('/api/ejecucion/upload', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})

		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al subir el archivo'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al subir el archivo')
	}
}

export interface EjecucionRequest {
	conciliacion_automatica: boolean
	tiempo_ejecucion: string
}

/**
 * Ejecuta un proceso
 * @param data - Datos de ejecución
 * @returns Respuesta del servidor
 */
export const ejecutarProceso = async (data: EjecucionRequest): Promise<any> => {
	try {
		const response = await clientHttpClient.post('/api/ejecucion/ejecutar', data)

		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al ejecutar el proceso'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al ejecutar el proceso')
	}
}

