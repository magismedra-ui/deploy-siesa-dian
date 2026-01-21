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
		const estado = searchParams.get('estado') // Filtro por estado (requerido)
		const nit_proveedor = searchParams.get('nit_proveedor') // Filtro opcional por NIT proveedor
		const fecha_emision = searchParams.get('fecha_emision') // Filtro opcional por fecha emisión

		if (!estado) {
			return NextResponse.json(
				{ message: 'El parámetro estado es requerido' },
				{ status: 400 }
			)
		}

		// Obtener el token del header Authorization
		const authHeader = request.headers.get('authorization')
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'Token de autenticación requerido' },
				{ status: 401 }
			)
		}

		// Construir URL con parámetros de paginación y filtros
		const params = new URLSearchParams()
		params.append('page', page)
		params.append('limit', limit)
		params.append('estado', estado)
		if (nit_proveedor) {
			params.append('nit_proveedor', nit_proveedor)
		}
		if (fecha_emision) {
			params.append('fecha_emision', fecha_emision)
		}

		// Hacer la petición al backend
		const response = await httpClient.get(`/api/v1/documentos-staging/por-estado?${params.toString()}`, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener documentos staging por estado'

			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al obtener documentos staging por estado' },
			{ status: 500 }
		)
	}
}
