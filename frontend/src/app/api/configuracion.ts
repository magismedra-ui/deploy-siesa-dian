import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

interface ErrorResponse {
	message?: string
	error?: string
}

// ==================== INTERFACES ====================

export interface Parametro {
	id?: number
	clave: string
	valor: string
	tipo_dato: 'NUMERICO' | 'TEXTO' | 'BOOLEANO'
	descripcion: string
}

export interface Rol {
	id?: number
	nombre: string
	descripcion: string
}

export interface Usuario {
	id?: number
	estado: 'ACTIVO' | 'INACTIVO'
	nombre_completo: string
	email: string
	rol_id: number
	password_hash?: string
	createdAt?: string
	updatedAt?: string
}

// ==================== PARAMETROS ====================

/**
 * Obtiene todos los parámetros
 */
export const getParametros = async (): Promise<Parametro[]> => {
	try {
		const response = await clientHttpClient.get('/api/configuracion/parametros')
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener parámetros'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener parámetros')
	}
}

/**
 * Crea un nuevo parámetro
 */
export const createParametro = async (parametro: Parametro): Promise<Parametro> => {
	try {
		const response = await clientHttpClient.post('/api/configuracion/parametros', parametro)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al crear parámetro'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al crear parámetro')
	}
}

/**
 * Actualiza un parámetro existente
 */
export const updateParametro = async (id: number, parametro: Parametro): Promise<Parametro> => {
	try {
		// Remover el ID del objeto parametro antes de enviarlo (el ID va en la URL)
		const { id: _, ...parametroSinId } = parametro
		const response = await clientHttpClient.put(`/api/configuracion/parametros/${id}`, parametroSinId)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al actualizar parámetro'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al actualizar parámetro')
	}
}

// ==================== ROLES ====================

/**
 * Obtiene todos los roles
 */
export const getRoles = async (): Promise<Rol[]> => {
	try {
		const response = await clientHttpClient.get('/api/configuracion/roles')
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener roles'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener roles')
	}
}

/**
 * Crea un nuevo rol
 */
export const createRol = async (rol: Rol): Promise<Rol> => {
	try {
		const response = await clientHttpClient.post('/api/configuracion/roles', rol)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al crear rol'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al crear rol')
	}
}

/**
 * Actualiza un rol existente
 */
export const updateRol = async (id: number, rol: Rol): Promise<Rol> => {
	try {
		const response = await clientHttpClient.put(`/api/configuracion/roles/${id}`, rol)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al actualizar rol'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al actualizar rol')
	}
}

/**
 * Elimina un rol
 */
export const deleteRol = async (id: number): Promise<void> => {
	try {
		await clientHttpClient.delete(`/api/configuracion/roles/${id}`)
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al eliminar rol'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al eliminar rol')
	}
}

// ==================== USUARIOS ====================

/**
 * Obtiene todos los usuarios
 */
export const getUsuarios = async (): Promise<Usuario[]> => {
	try {
		const response = await clientHttpClient.get('/api/configuracion/usuarios')
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al obtener usuarios'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al obtener usuarios')
	}
}

/**
 * Crea un nuevo usuario
 */
export const createUsuario = async (usuario: Usuario): Promise<Usuario> => {
	try {
		const response = await clientHttpClient.post('/api/configuracion/usuarios', usuario)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al crear usuario'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al crear usuario')
	}
}

/**
 * Actualiza un usuario existente
 */
export const updateUsuario = async (id: number, usuario: Usuario): Promise<Usuario> => {
	try {
		const response = await clientHttpClient.put(`/api/configuracion/usuarios/${id}`, usuario)
		return response.data
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al actualizar usuario'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al actualizar usuario')
	}
}

/**
 * Elimina un usuario
 */
export const deleteUsuario = async (id: number): Promise<void> => {
	try {
		await clientHttpClient.delete(`/api/configuracion/usuarios/${id}`)
	} catch (error) {
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al eliminar usuario'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al eliminar usuario')
	}
}

