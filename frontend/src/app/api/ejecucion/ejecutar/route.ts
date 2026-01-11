import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function POST(request: NextRequest) {
	try {
		const authHeader = request.headers.get('authorization')
		const body = await request.json()

		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		// Aquí puedes agregar el endpoint real cuando esté disponible
		const response = await httpClient.post(
			'/api/v1/procesos/ejecutar',
			body,
			{
				headers: {
					'Authorization': authHeader,
				},
			}
		)

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en ejecutar:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al ejecutar el proceso'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al ejecutar el proceso' },
			{ status: 500 }
		)
	}
}

