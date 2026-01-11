import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const page = searchParams.get('page') || '1'
		const limit = searchParams.get('limit') || '10'

		// Obtener el token del header Authorization
		const authHeader = request.headers.get('authorization')
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'Token de autenticación requerido' },
				{ status: 401 }
			)
		}

		// Construir URL con parámetros de paginación
		const params = new URLSearchParams()
		params.append('page', page)
		params.append('limit', limit)

		// Hacer la petición al backend
		const response = await httpClient.get(`/api/v1/resultados?${params.toString()}`, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en resultados API route:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener resultados'

			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al obtener resultados' },
			{ status: 500 }
		)
	}
}
