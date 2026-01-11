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
		const nit_proveedor = searchParams.get('nit_proveedor')
		const num_factura = searchParams.get('num_factura')

		if (!nit_proveedor || !num_factura) {
			return NextResponse.json(
				{ message: 'nit_proveedor y num_factura son requeridos' },
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

		// Construir URL con parámetros de búsqueda
		const params = new URLSearchParams()
		params.append('nit_proveedor', nit_proveedor)
		params.append('num_factura', num_factura)

		// Hacer la petición al backend
		const response = await httpClient.get(`/api/v1/documentos-staging/buscar?${params.toString()}`, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en documentos-staging buscar API route:', error)

		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al buscar documentos staging'

			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al buscar documentos staging' },
			{ status: 500 }
		)
	}
}
