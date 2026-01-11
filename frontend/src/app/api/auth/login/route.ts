import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()

		// Validar que se envíen email y password
		if (!body.email || !body.password) {
			return NextResponse.json(
				{ message: 'Email y contraseña son requeridos' },
				{ status: 400 }
			)
		}

		// Hacer la petición al backend
		const response = await httpClient.post(
			'/api/v1/auth/login',
			{
				email: body.email,
				password: body.password,
			}
		)

		// Devolver el token al frontend
		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en login API route:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al realizar el login'

			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al realizar el login' },
			{ status: 500 }
		)
	}
}

