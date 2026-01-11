import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'

/**
 * Obtiene la URL base del API desde las variables de entorno
 * @returns URL base del API
 * Durante el build, usa un valor por defecto para evitar errores
 */
const getApiBaseUrl = (): string => {
	const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
	const isBuildTime = typeof window === 'undefined'

	// Durante el build (cuando no hay baseUrl definida o es una ruta relativa), usar un valor por defecto
	if (!baseUrl || baseUrl.startsWith('/')) {
		if (isBuildTime) {
			// Valor por defecto para tiempo de build - se usará el servicio 'api' en Docker
			return 'http://api:3000'
		}
		// En runtime, si es una ruta relativa, retornarla como está (para proxies)
		if (baseUrl.startsWith('/')) {
			return baseUrl.replace(/\/$/, '')
		}
		// Si no hay baseUrl en runtime, usar localhost
		return 'http://localhost:3000'
	}

	// Validar que tenga protocolo (http:// o https://)
	if (!baseUrl.match(/^https?:\/\//i)) {
		// Durante el build, permitir valores sin protocolo y agregar http://
		if (isBuildTime) {
			// Si parece ser un hostname sin protocolo, agregar http://
			if (baseUrl.includes('.') || baseUrl.includes(':')) {
				return `http://${baseUrl}`
			}
			// Si no parece ser un hostname válido, usar el servicio Docker
			return 'http://api:3000'
		}
		// En runtime, lanzar error si no tiene protocolo
		throw new Error(
			`NEXT_PUBLIC_API_BASE_URL debe incluir el protocolo (http:// o https://). ` +
			`Valor actual: ${baseUrl}. Debe ser algo como: http://localhost:3000`
		)
	}

	// Remover la barra final si existe para evitar dobles barras
	return baseUrl.replace(/\/$/, '')
}

/**
 * Cliente Axios centralizado para el servidor (usado en route.ts)
 * Este cliente se usa en las API routes de Next.js que actúan como proxy
 */
export const httpClient: AxiosInstance = axios.create({
	baseURL: getApiBaseUrl(),
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 30000, // 30 segundos
})

/**
 * Interceptor de requests para agregar headers comunes
 */
httpClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		// El token se pasa manualmente desde los route handlers
		// que lo reciben del header de la request de Next.js
		return config
	},
	(error: AxiosError) => {
		return Promise.reject(error)
	}
)

/**
 * Interceptor de responses para manejo global de errores
 */
httpClient.interceptors.response.use(
	(response) => {
		return response
	},
	(error: AxiosError) => {
		// El manejo de errores específico se hace en cada route handler
		return Promise.reject(error)
	}
)

/**
 * Cliente Axios para uso en componentes del cliente
 * Este cliente usa rutas relativas que Next.js maneja como proxy
 */
export const clientHttpClient: AxiosInstance = axios.create({
	baseURL: '', // Rutas relativas para usar las API routes de Next.js como proxy
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 30000,
})

/**
 * Interceptor para agregar token automáticamente desde localStorage
 * Solo funciona en el cliente (navegador)
 */
clientHttpClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		if (typeof window !== 'undefined') {
			try {
				const token = localStorage.getItem('auth_token')
				if (token) {
					config.headers.Authorization = `Bearer ${token}`
				}
			} catch (error) {
				console.error('Error al obtener token del localStorage:', error)
			}
		}
		return config
	},
	(error: AxiosError) => {
		return Promise.reject(error)
	}
)

/**
 * Interceptor de responses para manejo global de errores en el cliente
 */
clientHttpClient.interceptors.response.use(
	(response) => {
		return response
	},
	(error: AxiosError) => {
		// Manejo de errores 401 - No autorizado
		if (error.response?.status === 401) {
			if (typeof window !== 'undefined') {
				// Limpiar datos de autenticación
				localStorage.removeItem('auth_token')
				localStorage.removeItem('token_expiration')
				localStorage.removeItem('user_nombre')
				localStorage.removeItem('user_rol')
				// Redirigir al login
				window.location.href = '/'
			}
		}
		return Promise.reject(error)
	}
)

/**
 * Función helper para verificar si un error es un AxiosError
 * Útil para mantener compatibilidad con axios.isAxiosError
 */
export const isAxiosError = (error: any): error is AxiosError => {
	return axios.isAxiosError(error)
}

export default httpClient
