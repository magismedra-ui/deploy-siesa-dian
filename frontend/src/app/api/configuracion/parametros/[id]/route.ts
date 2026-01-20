import { NextRequest, NextResponse } from 'next/server'
import { httpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const authHeader = request.headers.get('authorization')
		const body = await request.json()
		const { id } = await params
		
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		const response = await httpClient.put(`/api/v1/parametros/${id}`, body, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json(response.data, { status: 200 })
	} catch (error) {
		console.error('Error en PUT parametros:', error)
		
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al actualizar parámetro'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al actualizar parámetro' },
			{ status: 500 }
		)
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const authHeader = request.headers.get('authorization')
		const { id } = await params
		
		if (!authHeader) {
			return NextResponse.json(
				{ message: 'No se proporcionó token de autenticación' },
				{ status: 401 }
			)
		}

		await httpClient.delete(`/api/v1/parametros/${id}`, {
			headers: {
				'Authorization': authHeader,
			},
		})

		return NextResponse.json({ message: 'Parámetro eliminado correctamente' }, { status: 200 })
	} catch (error) {
		console.error('Error en DELETE parametros:', error)
		
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const status = axiosError.response?.status || 500
			const message =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al eliminar parámetro'
			return NextResponse.json({ message }, { status })
		}

		return NextResponse.json(
			{ message: 'Error desconocido al eliminar parámetro' },
			{ status: 500 }
		)
	}
}
