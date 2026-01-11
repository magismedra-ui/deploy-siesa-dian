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
		const { schedulerEnabled, cronExpressionn } = body

		// Validar campos requeridos
		if (cronExpressionn === undefined || cronExpressionn === '') {
			return NextResponse.json(
				{ message: 'El campo cronExpressionn es requerido' },
				{ status: 400 }
			)
		}

		// Obtener el token del header de autorización
		const authHeader = request.headers.get('authorization')
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		// Preparar el body para el backend
		// schedulerEnabled puede ser: true (Automatico), false (Manual), null (Pausar)
		const backendBody: {
			schedulerEnabled: boolean | null
			cronExpressionn: string
		} = {
			schedulerEnabled:
				schedulerEnabled === null
					? null
					: typeof schedulerEnabled === 'boolean'
					? schedulerEnabled
					: schedulerEnabled === true,
			cronExpressionn,
		}

		// Hacer la petición al backend
		const response = await httpClient.post('/api/v1/scheduler/config', backendBody, {
			headers: {
				Authorization: authHeader,
			},
		})

		return NextResponse.json(response.data, { status: response.status })
	} catch (error) {
		console.error('Error en /api/scheduler/config:', error)
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al configurar el scheduler'
			return NextResponse.json(
				{ message },
				{ status }
			)
		}
		return NextResponse.json(
			{ message: 'Error desconocido al configurar el scheduler' },
			{ status: 500 }
		)
	}
}
