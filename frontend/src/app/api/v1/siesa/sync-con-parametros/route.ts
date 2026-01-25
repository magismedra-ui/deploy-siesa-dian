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

		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		const body = await request.json()

		const response = await httpClient.post(
			'/api/v1/siesa/sync-con-parametros',
			body,
			{
				headers: {
					'Authorization': authHeader,
				},
			}
		)

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en sync-con-parametros:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al sincronizar facturas desde SIESA'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al sincronizar facturas desde SIESA' },
			{ status: 500 }
		)
	}
}
