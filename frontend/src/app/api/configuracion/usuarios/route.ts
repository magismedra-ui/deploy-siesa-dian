import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function GET(request: NextRequest) {
	try {
		const authHeader = request.headers.get('authorization')
		
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		const response = await httpClient.get('/api/v1/usuarios', {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en GET usuarios:', error)
		
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener usuarios'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al obtener usuarios' },
			{ status: 500 }
		)
	}
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

		const response = await httpClient.post('/api/v1/usuarios', body, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 201 })
	} catch (error) {
		console.error('Error en POST usuarios:', error)
		
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al crear usuario'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al crear usuario' },
			{ status: 500 }
		)
	}
}

