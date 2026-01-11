import { clientHttpClient, isAxiosError } from '@/lib/http'
import type { AxiosError } from 'axios'

export interface LoginRequest {
	email: string
	password: string
}

export interface LoginResponse {
	token: string
}

export interface ErrorResponse {
	message?: string
	error?: string
}

export interface DecodedToken {
	nombre?: string
	rol?: string
	exp?: number
	iat?: number
}

/**
 * Realiza el login del usuario
 * @param credentials - Credenciales de acceso (email y password)
 * @returns Token JWT
 */
export const login = async (credentials: LoginRequest): Promise<string> => {
	try {
		console.log('login - Iniciando login con:', { email: credentials.email })
		// Usar la ruta API de Next.js como proxy para evitar problemas de CORS
		const response = await clientHttpClient.post<LoginResponse>(
			'/api/auth/login',
			credentials
		)

		console.log('login - Respuesta recibida:', { 
			status: response.status,
			hasToken: !!response.data?.token,
			message: response.data?.message,
			responseData: response.data
		})

		if (!response.data?.token) {
			console.error('login - Token no presente en la respuesta:', response.data)
			throw new Error('Token no recibido del servidor')
		}

		return response.data.token
	} catch (error) {
		console.error('login - Error completo:', error)
		if (isAxiosError(error)) {
			const axiosError = error as AxiosError<ErrorResponse>
			console.error('login - Error Axios:', {
				status: axiosError.response?.status,
				data: axiosError.response?.data,
				message: axiosError.message
			})
			const errorMessage =
				axiosError.response?.data?.message ||
				axiosError.response?.data?.error ||
				axiosError.message ||
				'Error al realizar el login'
			throw new Error(errorMessage)
		}
		throw new Error('Error desconocido al realizar el login')
	}
}

/**
 * Guarda el token en localStorage con su tiempo de expiración
 * @param token - Token JWT a guardar
 */
export const saveToken = (token: string): void => {
	try {
		if (!token || typeof token !== 'string') {
			console.error('saveToken - Token inválido:', token)
			throw new Error('Token inválido')
		}

		console.log('saveToken - Token recibido:', token.substring(0, 20) + '...')
		
		// Limpiar datos antiguos primero
		localStorage.removeItem('auth_token')
		localStorage.removeItem('token_expiration')
		localStorage.removeItem('user_nombre')
		localStorage.removeItem('user_rol')
		
		const decoded = decodeToken(token)
		console.log('saveToken - Token decodificado:', { 
			id: decoded.id, 
			email: decoded.email, 
			nombre: decoded.nombre, 
			rol: decoded.rol,
			exp: decoded.exp 
		})
		
		const nombre = decoded.nombre || ''
		const rol = decoded.rol || ''
		
		if (!nombre) {
			console.warn('saveToken - Advertencia: El token no contiene nombre. Decodificado:', decoded)
		}
		
		if (decoded.exp) {
			const expirationTime = decoded.exp * 1000 // Convertir a milisegundos
			localStorage.setItem('auth_token', token)
			localStorage.setItem('token_expiration', expirationTime.toString())
			localStorage.setItem('user_nombre', nombre)
			localStorage.setItem('user_rol', rol)
		} else {
			// Si no hay expiración en el token, guardar indefinidamente
			localStorage.setItem('auth_token', token)
			localStorage.setItem('user_nombre', nombre)
			localStorage.setItem('user_rol', rol)
		}
		
		// Verificar que se guardó correctamente
		const savedToken = localStorage.getItem('auth_token')
		const savedNombre = localStorage.getItem('user_nombre')
		console.log('saveToken - Verificación post-guardado:', {
			token: savedToken ? 'existe (' + savedToken.length + ' caracteres)' : 'no existe',
			nombre: savedNombre || 'vacío',
			rol: localStorage.getItem('user_rol') || 'vacío'
		})
		
		// Disparar evento personalizado para notificar cambio de autenticación
		if (typeof window !== 'undefined') {
			// Usar un pequeño delay para asegurar que localStorage se actualizó
			setTimeout(() => {
				const event = new CustomEvent('authChange', { 
					detail: { authenticated: true, nombre, rol } 
				})
				console.log('saveToken - Disparando evento authChange con delay', { nombre, rol })
				window.dispatchEvent(event)
			}, 50)
		}
	} catch (error) {
		console.error('Error al guardar el token:', error)
		if (error instanceof Error) {
			console.error('Error details:', error.message, error.stack)
		}
		throw new Error('Error al guardar el token: ' + (error instanceof Error ? error.message : String(error)))
	}
}

/**
 * Decodifica un token JWT sin verificar la firma
 * @param token - Token JWT a decodificar
 * @returns Objeto con los datos decodificados del token
 */
export const decodeToken = (token: string): DecodedToken => {
	try {
		if (!token || typeof token !== 'string') {
			throw new Error('Token no es una cadena válida')
		}

		const parts = token.split('.')
		if (parts.length !== 3) {
			throw new Error('Token no tiene el formato JWT correcto (3 partes separadas por punto)')
		}

		const base64Url = parts[1]
		if (!base64Url) {
			throw new Error('Token no contiene payload')
		}

		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		)

		const decoded = JSON.parse(jsonPayload)
		console.log('decodeToken - Token decodificado exitosamente:', {
			hasId: !!decoded.id,
			hasEmail: !!decoded.email,
			hasNombre: !!decoded.nombre,
			hasRol: !!decoded.rol,
			nombre: decoded.nombre,
			rol: decoded.rol
		})

		return decoded as DecodedToken
	} catch (error) {
		console.error('Error al decodificar el token:', error)
		if (error instanceof Error) {
			console.error('Error details:', error.message, error.stack)
		}
		throw new Error('Token inválido: ' + (error instanceof Error ? error.message : String(error)))
	}
}

/**
 * Obtiene el token almacenado en localStorage
 * @returns Token JWT o null si no existe o está expirado
 */
export const getToken = (): string | null => {
	try {
		const token = localStorage.getItem('auth_token')
		const expirationTime = localStorage.getItem('token_expiration')

		if (!token) {
			return null
		}

		// Verificar si el token está expirado
		if (expirationTime) {
			const expiration = parseInt(expirationTime, 10)
			if (Date.now() >= expiration) {
				clearAuthData()
				return null
			}
		}

		return token
	} catch (error) {
		console.error('Error al obtener el token:', error)
		return null
	}
}

/**
 * Obtiene el nombre del usuario desde localStorage
 * @returns Nombre del usuario o null
 */
export const getUserNombre = (): string | null => {
	return localStorage.getItem('user_nombre')
}

/**
 * Obtiene el rol del usuario desde localStorage
 * @returns Rol del usuario o null
 */
export const getUserRol = (): string | null => {
	return localStorage.getItem('user_rol')
}

/**
 * Verifica si el usuario está autenticado
 * @returns true si el token existe, no está expirado y es válido
 */
export const isAuthenticated = (): boolean => {
	try {
		const token = getToken()
		if (!token) {
			return false
		}

		// Verificar que el token tenga la estructura correcta (incluyendo nombre)
		try {
			const decoded = decodeToken(token)
			// Si el token no tiene nombre, puede ser un token antiguo, limpiarlo
			if (!decoded.nombre && !decoded.email) {
				console.warn('isAuthenticated - Token inválido (sin nombre ni email), limpiando')
				clearAuthData()
				return false
			}
			return true
		} catch (error) {
			console.error('isAuthenticated - Error al decodificar token:', error)
			clearAuthData()
			return false
		}
	} catch (error) {
		console.error('isAuthenticated - Error:', error)
		return false
	}
}

/**
 * Limpia todos los datos de autenticación de localStorage
 */
export const clearAuthData = (): void => {
	localStorage.removeItem('auth_token')
	localStorage.removeItem('token_expiration')
	localStorage.removeItem('user_nombre')
	localStorage.removeItem('user_rol')
	
	// Disparar evento personalizado para notificar cambio de autenticación
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: false } }))
	}
}

/**
 * Verifica y limpia tokens inválidos o antiguos que no tengan la estructura correcta
 * Esta función debe llamarse al iniciar la aplicación
 */
export const validateAndCleanToken = (): void => {
	if (typeof window === 'undefined') {
		return
	}

	try {
		const token = localStorage.getItem('auth_token')
		if (!token) {
			return
		}

		try {
			const decoded = decodeToken(token)
			// Si el token no tiene nombre, es un token antiguo, limpiarlo
			if (!decoded.nombre) {
				console.warn('validateAndCleanToken - Token antiguo sin campo "nombre" detectado, limpiando')
				clearAuthData()
				return
			}

			// Verificar que el nombre guardado coincida con el del token
			const savedNombre = localStorage.getItem('user_nombre')
			if (decoded.nombre && savedNombre !== decoded.nombre) {
				console.log('validateAndCleanToken - Actualizando nombre en localStorage:', {
					anterior: savedNombre,
					nuevo: decoded.nombre
				})
				localStorage.setItem('user_nombre', decoded.nombre)
				localStorage.setItem('user_rol', decoded.rol || '')
				window.dispatchEvent(new CustomEvent('authChange', { detail: { authenticated: true, nombre: decoded.nombre } }))
			}
		} catch (error) {
			console.error('validateAndCleanToken - Error al validar token, limpiando:', error)
			clearAuthData()
		}
	} catch (error) {
		console.error('validateAndCleanToken - Error:', error)
	}
}
