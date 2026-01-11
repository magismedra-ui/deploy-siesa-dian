import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import FormData from 'form-data'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function POST(request: NextRequest) {
	try {
		const authHeader = request.headers.get('authorization')

		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		const formData = await request.formData()
		const file = formData.get('file') as File | null

		if (!file) {
			return NextResponse.json(
				{ message: 'No se proporcionó ningún archivo' },
				{ status: 400 }
			)
		}

		// Validar que sea un archivo Excel
		const validMimeTypes = [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
		]
		const validExtensions = ['.xlsx', '.xls']
		const fileName = file.name.toLowerCase()
		const isValidType = validMimeTypes.includes(file.type)
		const isValidExtension = validExtensions.some((ext) => fileName.endsWith(ext))

		if (!isValidType && !isValidExtension) {
			return NextResponse.json(
				{ message: 'El archivo debe ser un Excel (.xlsx o .xls)' },
				{ status: 400 }
			)
		}

		// Convertir File a Buffer para FormData de Node.js
		const arrayBuffer = await file.arrayBuffer()
		const buffer = Buffer.from(arrayBuffer)

		// Crear FormData para axios (Node.js)
		const axiosFormData = new FormData()
		axiosFormData.append('file', buffer, {
			filename: file.name,
			contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		} as any)

		const response = await httpClient.post(
			'/api/v1/procesos/upload',
			axiosFormData,
			{
				headers: {
					'Authorization': authHeader,
					...axiosFormData.getHeaders(),
				},
				maxBodyLength: Infinity,
			}
		)

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en upload:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al subir el archivo'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al subir el archivo' },
			{ status: 500 }
		)
	}
}

