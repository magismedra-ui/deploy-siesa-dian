'use client'
import { useState, useEffect, useRef } from 'react'
import {
	Container,
	Box,
	Grid2,
	Typography,
	Paper,
	Button,
	CircularProgress,
	Backdrop,
	FormControlLabel,
	TextField,
	Select,
	MenuItem,
	InputLabel,
	FormControl,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Chip,
	IconButton,
	Checkbox,
	LinearProgress,
	LinearProgressProps,
} from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import Encabezado from '../global-components/encabezado'
import MegaFooter from '../global-components/footer'
import ModalMessage from '../global-components/ModalMessage'
import BackButton from '../global-components/BackButton'
import { uploadExcelFile } from '@/app/api/ejecucion'
import { configurarScheduler, type SchedulerConfigRequest } from '@/app/api/scheduler'
import { getLogs, type LogEntry, type LogsFilters } from '@/app/api/logs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'

// Componente LinearProgress con label de porcentaje
function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
	return (
		<Box sx={{ display: 'flex', alignItems: 'center' }}>
			<Box sx={{ width: '100%', mr: 1 }}>
				<LinearProgress variant="determinate" {...props} />
			</Box>
			<Box sx={{ minWidth: 35 }}>
				<Typography
					variant="body2"
					sx={{ color: 'text.secondary' }}
				>{`${Math.round(props.value)}%`}</Typography>
			</Box>
		</Box>
	)
}

export default function EjecucionPage() {
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [schedulerEnabled, setSchedulerEnabled] = useState<boolean | null>(null)
	const [tiempoEjecucion, setTiempoEjecucion] = useState('')
	const [unidadTiempo, setUnidadTiempo] = useState<'segundos' | 'minutos' | 'horas'>('segundos')
	const [uploading, setUploading] = useState(false)
	const [guardandoScheduler, setGuardandoScheduler] = useState(false)
	const [modalMessage, setModalMessage] = useState(false)
	const [messageType, setMessageType] = useState<'success' | 'error'>('success')
	const [messageTitle, setMessageTitle] = useState('')
	const [messageText, setMessageText] = useState('')

	// Estados para logs
	const [logsHistoricos, setLogsHistoricos] = useState<LogEntry[]>([])
	const [logsTiempoReal, setLogsTiempoReal] = useState<LogEntry[]>([])
	const [loadingLogs, setLoadingLogs] = useState(false)
	
	// Estados para filtros
	const [fechaDesde, setFechaDesde] = useState<Dayjs | null>(null)
	const [fechaHasta, setFechaHasta] = useState<Dayjs | null>(null)
	const [nivelesSeleccionados, setNivelesSeleccionados] = useState<string[]>([])
	const [jobIdFiltro, setJobIdFiltro] = useState('')
	const [duracionMin, setDuracionMin] = useState('')
	const [duracionMax, setDuracionMax] = useState('')
	
	// Estados para SSE
	const [sseConnected, setSseConnected] = useState(false)
	const [ssePaused, setSsePaused] = useState(false)
	const [sseError, setSseError] = useState(false)
	const [sseErrorMessage, setSseErrorMessage] = useState('')
	const [logsPorMinuto, setLogsPorMinuto] = useState(0)
	const [autoScroll, setAutoScroll] = useState(true)
	const [autoScrollHistoricos, setAutoScrollHistoricos] = useState(true)
	const eventSourceRef = useRef<EventSource | null>(null)
	const tiempoRealRef = useRef<HTMLDivElement | null>(null)
	const historicosRef = useRef<HTMLDivElement | null>(null)
	const logsCountRef = useRef(0)
	const logsMinutoRef = useRef<NodeJS.Timeout | null>(null)

	// Estados para barra de progreso
	const [procesoActivo, setProcesoActivo] = useState<'insercion' | 'conciliacion' | null>(null)
	const [progresoVisible, setProgresoVisible] = useState(false)
	const [mensajeProgreso, setMensajeProgreso] = useState('')
	const [progresoPorcentaje, setProgresoPorcentaje] = useState(0)
	const procesosActivosRef = useRef<Set<string>>(new Set())
	const ultimoJobIdRef = useRef<string | null>(null)
	const inicioProcesoRef = useRef<number | null>(null)
	const totalRegistrosRef = useRef<number | null>(null)
	const registrosProcesadosRef = useRef<number>(0)

	const handleFileSelect = (field: string, value: File[]) => {
		if (value && value.length > 0) {
			const file = value[0]
			// Validar que sea Excel
			const validExtensions = [
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.ms-excel',
			]
			const validExtensions2 = ['.xlsx', '.xls']
			const fileName = file.name.toLowerCase()
			const isValidExtension =
				validExtensions.includes(file.type) ||
				validExtensions2.some((ext) => fileName.endsWith(ext))

			if (!isValidExtension) {
				mostrarMensaje('error', 'Error', 'Por favor seleccione un archivo Excel (.xlsx o .xls)')
				return
			}
			setSelectedFile(file)
		} else {
			setSelectedFile(null)
		}
	}

	const handleUpload = async () => {
		if (!selectedFile) {
			mostrarMensaje('error', 'Error', 'Por favor seleccione un archivo Excel')
			return
		}

		setUploading(true)
		
		try {
			const response = await uploadExcelFile(selectedFile)
			// Si la respuesta incluye un jobId o ejecucionId, lo guardamos
			if (response?.ejecucion_id) {
				ultimoJobIdRef.current = String(response.ejecucion_id)
				// Preparar para rastrear el proceso cuando lleguen los logs
				procesosActivosRef.current.add(`insercion-${response.ejecucion_id}`)
			}
			mostrarMensaje('success', 'Éxito', 'Archivo subido correctamente')
			setSelectedFile(null)
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al subir el archivo'
			)
		} finally {
			setUploading(false)
			// La barra de progreso se activará cuando lleguen los logs del proceso en segundo plano
		}
	}

	// Función para convertir tiempo y unidad a formato CRON
	const convertirACron = (tiempo: string, unidad: 'segundos' | 'minutos' | 'horas'): string => {
		const valor = parseInt(tiempo, 10)
		
		if (isNaN(valor) || valor <= 0) {
			throw new Error('El tiempo de ejecución debe ser un número positivo')
		}

		// Formato CRON: minuto hora día mes día-semana
		// */X * * * * = cada X minutos
		// * */X * * * = cada X horas
		
		if (unidad === 'segundos') {
			// CRON estándar no soporta segundos directamente
			// Si es múltiplo de 60, convertir a minutos
			if (valor % 60 === 0) {
				const minutos = valor / 60
				return `*/${minutos} * * * *`
			} else {
				// Si no es múltiplo de 60, usar cada minuto como aproximación
				// O podríamos usar formato extendido */X * * * * * para segundos
				// Por ahora, redondeamos hacia arriba a minutos
				return `*/1 * * * *`
			}
		} else if (unidad === 'minutos') {
			return `*/${valor} * * * *`
		} else if (unidad === 'horas') {
			return `* */${valor} * * *`
		}
		
		return `*/${valor} * * * *`
	}

	const handleGuardarScheduler = async () => {
		if (!tiempoEjecucion.trim()) {
			mostrarMensaje('error', 'Error', 'Por favor ingrese el tiempo de ejecución')
			return
		}

		setGuardandoScheduler(true)
		try {
			// Convertir tiempo y unidad a formato CRON
			const cronExpressionn = convertirACron(tiempoEjecucion, unidadTiempo)
			
			const data: SchedulerConfigRequest = {
				schedulerEnabled,
				cronExpressionn,
			}
		await configurarScheduler(data)
		mostrarMensaje('success', 'Éxito', 'Configuración del scheduler guardada correctamente')
		
		// La barra de progreso se activará cuando lleguen los logs del proceso en segundo plano
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error
					? error.message
					: 'Error al guardar la configuración del scheduler'
			)
		} finally {
			setGuardandoScheduler(false)
			// La barra de progreso se activará cuando lleguen los logs del proceso en segundo plano
		}
	}


	const mostrarMensaje = (
		type: 'success' | 'error',
		title: string,
		text: string
	) => {
		setMessageType(type)
		setMessageTitle(title)
		setMessageText(text)
		setModalMessage(true)
	}

	// Función para calcular porcentaje de progreso
	const calcularProgreso = (proceso: 'insercion' | 'conciliacion') => {
		if (proceso === 'insercion') {
			// Para inserción, usar registros procesados
			if (totalRegistrosRef.current && totalRegistrosRef.current > 0) {
				const porcentaje = Math.min(100, (registrosProcesadosRef.current / totalRegistrosRef.current) * 100)
				setProgresoPorcentaje(porcentaje)
			} else if (inicioProcesoRef.current) {
				// Si no tenemos total, usar tiempo transcurrido estimado (max 10 minutos)
				const tiempoTranscurrido = Date.now() - inicioProcesoRef.current
				const tiempoEstimado = 10 * 60 * 1000 // 10 minutos
				const porcentaje = Math.min(95, (tiempoTranscurrido / tiempoEstimado) * 100)
				setProgresoPorcentaje(porcentaje)
			}
		} else if (proceso === 'conciliacion') {
			// Para conciliación, usar tiempo transcurrido estimado (max 5 minutos)
			if (inicioProcesoRef.current) {
				const tiempoTranscurrido = Date.now() - inicioProcesoRef.current
				const tiempoEstimado = 5 * 60 * 1000 // 5 minutos
				const porcentajeCalculado = Math.min(95, (tiempoTranscurrido / tiempoEstimado) * 100)
				setProgresoPorcentaje(porcentajeCalculado)
			}
		}
	}

	// Función para detectar procesos activos basándose en los logs
	const detectarProcesoActivo = (log: LogEntry) => {
		const proceso = log.proceso?.toLowerCase()
		const nivel = log.nivel?.toLowerCase()
		const mensaje = log.mensaje?.toLowerCase() || ''
		const mensajeOriginal = log.mensaje || ''
		const jobId = log.jobId || ''

		if (!proceso) return

		// Proceso de inserción (excel-processing)
		if (proceso === 'excel-processing') {
			// Detectar inicio: cualquier log de info indica que el proceso está activo
			if (nivel === 'info' && (mensaje.includes('procesados') || mensaje.includes('registros') || mensaje.includes('procesamiento'))) {
				if (jobId) {
					// Reemplazar cualquier jobId temporal con el real
					const tempIds = Array.from(procesosActivosRef.current).filter(k => k.startsWith('insercion-') && !k.includes(`insercion-${jobId}`))
					tempIds.forEach(id => procesosActivosRef.current.delete(id))
					procesosActivosRef.current.add(`insercion-${jobId}`)
				}
				
				// Inicializar tiempo de inicio si no está establecido
				if (!inicioProcesoRef.current) {
					inicioProcesoRef.current = log.timestamp
				}
				
				setProcesoActivo('insercion')
				setProgresoVisible(true)
				
				// Extraer número de registros procesados del mensaje
				if (mensaje.includes('procesados')) {
					const match = mensajeOriginal.match(/(\d+)\s+registros?\s+procesados?/i) || mensajeOriginal.match(/procesados?\s+(\d+)/i)
					if (match && match[1]) {
						const procesados = parseInt(match[1], 10)
						registrosProcesadosRef.current = Math.max(registrosProcesadosRef.current, procesados)
					}
					setMensajeProgreso(`Inserción en curso: ${mensajeOriginal}`)
				} else {
					setMensajeProgreso('Procesando inserción de documentos en proc_documentos_staging...')
				}
				
				calcularProgreso('insercion')
			}
			
			// Detectar finalización: mensaje con "completado" o "procesamiento completado"
			if ((nivel === 'info' || nivel === 'warn') && mensaje.includes('procesamiento completado')) {
				if (jobId) {
					procesosActivosRef.current.delete(`insercion-${jobId}`)
				}
				
				// Extraer total de registros procesados del mensaje final
				const match = mensajeOriginal.match(/total\s+procesados?[:\s]+(\d+)/i) || mensajeOriginal.match(/procesados?[:\s]+(\d+)/i)
				if (match && match[1]) {
					registrosProcesadosRef.current = parseInt(match[1], 10)
					totalRegistrosRef.current = registrosProcesadosRef.current
				}
				
				setProgresoPorcentaje(100)
				
				// Si no hay más procesos activos de inserción, ocultar barra
				if (procesosActivosRef.current.size === 0 || !Array.from(procesosActivosRef.current).some(k => k.startsWith('insercion-'))) {
					setTimeout(() => {
						if (!Array.from(procesosActivosRef.current).some(k => k.startsWith('insercion-'))) {
							setProcesoActivo(null)
							setProgresoVisible(false)
							setMensajeProgreso('')
							setProgresoPorcentaje(0)
							inicioProcesoRef.current = null
							totalRegistrosRef.current = null
							registrosProcesadosRef.current = 0
						}
					}, 1500)
				}
			}
		}

		// Proceso de conciliación (conciliacion-process o scheduled-conciliacion)
		if (proceso === 'conciliacion-process' || proceso === 'scheduled-conciliacion' || proceso === 'conciliacion') {
			// Detectar inicio: "consultando" o "iniciando" o "procesando"
			if (nivel === 'info' && (mensaje.includes('consultando') || mensaje.includes('iniciando') || mensaje.includes('procesando') || mensaje.includes('ejecutando'))) {
				if (jobId) {
					// Reemplazar cualquier jobId temporal con el real
					const tempIds = Array.from(procesosActivosRef.current).filter(k => k.startsWith('conciliacion-') && !k.includes(`conciliacion-${jobId}`))
					tempIds.forEach(id => procesosActivosRef.current.delete(id))
					procesosActivosRef.current.add(`conciliacion-${jobId}`)
				}
				
				// Inicializar tiempo de inicio si no está establecido
				if (!inicioProcesoRef.current) {
					inicioProcesoRef.current = log.timestamp
				}
				
				setProcesoActivo('conciliacion')
				setProgresoVisible(true)
				setMensajeProgreso('Ejecutando proceso de conciliación...')
				
				calcularProgreso('conciliacion')
			}
			
			// Detectar finalización: mensaje con "conciliación completada" o "completada"
			if (nivel === 'info' && mensaje.includes('conciliación completada')) {
				if (jobId) {
					procesosActivosRef.current.delete(`conciliacion-${jobId}`)
				}
				
				setProgresoPorcentaje(100)
				
				// Si no hay más procesos activos de conciliación, ocultar barra
				if (procesosActivosRef.current.size === 0 || !Array.from(procesosActivosRef.current).some(k => k.startsWith('conciliacion-'))) {
					setTimeout(() => {
						if (!Array.from(procesosActivosRef.current).some(k => k.startsWith('conciliacion-'))) {
							setProcesoActivo(null)
							setProgresoVisible(false)
							setMensajeProgreso('')
							setProgresoPorcentaje(0)
							inicioProcesoRef.current = null
						}
					}, 1500)
				}
			}
		}

		// Detectar errores
		if (nivel === 'error') {
			if (proceso === 'excel-processing') {
				if (jobId) {
					procesosActivosRef.current.delete(`insercion-${jobId}`)
				}
				setTimeout(() => {
					if (!Array.from(procesosActivosRef.current).some(k => k.startsWith('insercion-'))) {
						setProcesoActivo(null)
						setProgresoVisible(false)
						setMensajeProgreso('')
						setProgresoPorcentaje(0)
						inicioProcesoRef.current = null
						totalRegistrosRef.current = null
						registrosProcesadosRef.current = 0
					}
				}, 2000)
			}
			if (proceso === 'conciliacion-process' || proceso === 'scheduled-conciliacion' || proceso === 'conciliacion') {
				if (jobId) {
					procesosActivosRef.current.delete(`conciliacion-${jobId}`)
				}
				setTimeout(() => {
					if (!Array.from(procesosActivosRef.current).some(k => k.startsWith('conciliacion-'))) {
						setProcesoActivo(null)
						setProgresoVisible(false)
						setMensajeProgreso('')
						setProgresoPorcentaje(0)
						inicioProcesoRef.current = null
					}
				}, 2000)
			}
		}
	}

	// ==================== LOGS HISTÓRICOS ====================

	const cargarLogsHistoricos = async () => {
		setLoadingLogs(true)
		try {
			const filters: LogsFilters = {
				limit: 100,
			}

			if (fechaDesde) {
				filters.from = fechaDesde.valueOf()
			}
			if (fechaHasta) {
				filters.to = fechaHasta.valueOf()
			}
			if (nivelesSeleccionados.length > 0) {
				filters.niveles = nivelesSeleccionados
			}
			if (jobIdFiltro) {
				filters.jobId = jobIdFiltro
			}
			if (duracionMin) {
				filters.duracionMin = parseInt(duracionMin)
			}
			if (duracionMax) {
				filters.duracionMax = parseInt(duracionMax)
			}

			const logs = await getLogs(filters)
			setLogsHistoricos(Array.isArray(logs) ? logs : [])
		} catch (error) {
			console.error('Error al cargar logs:', error)
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al cargar logs históricos'
			)
			setLogsHistoricos([])
		} finally {
			setLoadingLogs(false)
		}
	}

	// ==================== LOGS TIEMPO REAL (SSE) ====================

	const conectarSSE = () => {
		// Verificar que estamos en el cliente
		if (typeof window === 'undefined') {
			return
		}

		if (eventSourceRef.current) {
			eventSourceRef.current.close()
		}

		const token = localStorage.getItem('auth_token')
		if (!token) {
			console.warn('No hay token de autenticación para SSE')
			// No mostrar mensaje de error aquí, solo registrar en consola
			return
		}

		const params = new URLSearchParams()
		if (nivelesSeleccionados.length > 0) {
			params.append('niveles', nivelesSeleccionados.join(','))
		}
		if (jobIdFiltro) {
			params.append('jobId', jobIdFiltro)
		}

		const queryString = params.toString()
		const separator = queryString ? '&' : '?'
		const url = `/api/v1/logs/stream${queryString ? `?${queryString}` : ''}${separator}token=${token}`

		// Nota: EventSource no soporta headers personalizados, necesitamos pasar el token en la URL
		const eventSource = new EventSource(url, {
			withCredentials: false,
		})

		eventSource.onopen = () => {
			setSseConnected(true)
			setSseError(false)
			setSseErrorMessage('')
		}

		eventSource.onmessage = (event) => {
			if (ssePaused) {
				return
			}

			try {
				// Intentar parsear como JSON
				let logData = event.data
				
				// Si el data tiene el prefijo "data: ", removerlo
				if (typeof logData === 'string' && logData.startsWith('data: ')) {
					logData = logData.substring(6) // Remover "data: "
				}
				
				const log: LogEntry = JSON.parse(logData)
				
				// Detectar procesos activos según los logs
				detectarProcesoActivo(log)
				
				setLogsTiempoReal((prev) => {
					return [...prev, log]
				})
				
				logsCountRef.current += 1

				if (autoScroll && tiempoRealRef.current) {
					setTimeout(() => {
						if (tiempoRealRef.current) {
							tiempoRealRef.current.scrollTop = tiempoRealRef.current.scrollHeight
						}
					}, 100)
				}
			} catch (error) {
				console.error('Error al parsear log SSE:', error)
				console.error('Data recibida:', event.data)
				console.error('Tipo de data:', typeof event.data)
			}
		}
		
		// Manejar eventos con nombres específicos si el backend los usa
		eventSource.addEventListener('log', (event: any) => {
			if (ssePaused) return
			
			try {
				const log: LogEntry = JSON.parse(event.data)
				
				// Detectar procesos activos según los logs
				detectarProcesoActivo(log)
				
				setLogsTiempoReal((prev) => [...prev, log])
				logsCountRef.current += 1
				
				if (autoScroll && tiempoRealRef.current) {
					setTimeout(() => {
						if (tiempoRealRef.current) {
							tiempoRealRef.current.scrollTop = tiempoRealRef.current.scrollHeight
						}
					}, 100)
      }
    } catch (error) {
				console.error('Error al parsear evento log SSE:', error, 'Data:', event.data)
			}
		})

		eventSource.onerror = (error) => {
			// Solo cerrar y reconectar si realmente está cerrado
			if (eventSource.readyState === EventSource.CLOSED) {
				setSseConnected(false)
				setSseError(true)
				setSseErrorMessage('Error de conexión. Intentando reconectar...')
				eventSource.close()
				
				// Intentar reconectar después de 3 segundos
				setTimeout(() => {
					if (!ssePaused) {
						setSseErrorMessage('Reconectando...')
						conectarSSE()
					}
				}, 3000)
			} else if (eventSource.readyState === EventSource.CONNECTING) {
				setSseError(true)
				setSseErrorMessage('Reconectando...')
			} else {
				setSseError(true)
				setSseErrorMessage('Error de conexión con el servidor')
			}
		}

		eventSourceRef.current = eventSource
	}

	const desconectarSSE = () => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close()
			eventSourceRef.current = null
		}
		setSseConnected(false)
		setSseError(false)
		setSseErrorMessage('')
	}

	const togglePausaSSE = () => {
		setSsePaused((prev) => !prev)
	}

	const limpiarLogsTiempoReal = () => {
		setLogsTiempoReal([])
		logsCountRef.current = 0
		setLogsPorMinuto(0)
	}

	// Contador de logs por minuto
	useEffect(() => {
		if (sseConnected && !ssePaused) {
			logsMinutoRef.current = setInterval(() => {
				setLogsPorMinuto(logsCountRef.current)
				logsCountRef.current = 0
			}, 60000) // Cada minuto
		} else {
			if (logsMinutoRef.current) {
				clearInterval(logsMinutoRef.current)
				logsMinutoRef.current = null
			}
		}

		return () => {
			if (logsMinutoRef.current) {
				clearInterval(logsMinutoRef.current)
			}
		}
	}, [sseConnected, ssePaused])

	// Cargar logs históricos al montar solo una vez
	useEffect(() => {
		// Verificar que hay token antes de cargar logs
		const token = localStorage.getItem('auth_token')
		if (token) {
			cargarLogsHistoricos()
		} else {
			console.warn('No hay token de autenticación, no se pueden cargar logs')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Verificar procesos activos al montar y actualizar barra de progreso
	useEffect(() => {
		// Verificar si hay procesos activos basándose en los logs históricos recientes
		const verificarProcesosActivos = () => {
			// Revisar los últimos logs para detectar procesos activos
			const logsRecientes = [...logsHistoricos, ...logsTiempoReal]
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, 100) // Últimos 100 logs para mejor detección

			let procesoEncontrado: 'insercion' | 'conciliacion' | null = null
			let logCompletadoEncontrado = false

			for (const log of logsRecientes) {
				const proceso = log.proceso?.toLowerCase()
				const nivel = log.nivel?.toLowerCase()
				const mensaje = log.mensaje?.toLowerCase() || ''
				const timestamp = log.timestamp

				if (!proceso) continue

				// Verificar si el log es reciente (últimos 10 minutos)
				const ahora = Date.now()
				const tiempoTranscurrido = ahora - timestamp
				const esReciente = tiempoTranscurrido < 10 * 60 * 1000 // 10 minutos

				if (!esReciente) continue

				// Detectar proceso de inserción activo
				if (proceso === 'excel-processing') {
					// Si encontramos un log de completado, verificar si es el último
					if ((nivel === 'info' || nivel === 'warn') && mensaje.includes('procesamiento completado')) {
						if (!logCompletadoEncontrado) {
							logCompletadoEncontrado = true
							// Si hay un log de completado reciente, no hay proceso activo
							break
						}
					}
					// Si hay logs de progreso recientes, el proceso está activo
					if (nivel === 'info' && (mensaje.includes('procesados') || mensaje.includes('registros'))) {
						procesoEncontrado = 'insercion'
						// No romper, continuar verificando si hay completado después
					}
				}

				// Detectar proceso de conciliación activo
				if (proceso === 'conciliacion-process' || proceso === 'scheduled-conciliacion' || proceso === 'conciliacion') {
					// Si encontramos un log de completado, verificar si es el último
					if (nivel === 'info' && mensaje.includes('conciliación completada')) {
						if (!logCompletadoEncontrado) {
							logCompletadoEncontrado = true
							// Si hay un log de completado reciente, no hay proceso activo
							break
						}
					}
					// Si hay logs de inicio o progreso recientes, el proceso está activo
					if (nivel === 'info' && (mensaje.includes('consultando') || mensaje.includes('iniciando') || mensaje.includes('procesando') || mensaje.includes('ejecutando'))) {
						procesoEncontrado = 'conciliacion'
						// No romper, continuar verificando si hay completado después
					}
				}
			}

			// Solo establecer proceso activo si no encontramos un log de completado reciente
			if (procesoEncontrado && !logCompletadoEncontrado) {
				setProcesoActivo(procesoEncontrado)
				setProgresoVisible(true)
				setMensajeProgreso(
					procesoEncontrado === 'insercion'
						? 'Procesando inserción de documentos en proc_documentos_staging...'
						: 'Ejecutando proceso de conciliación...'
				)
			}
		}

		// Esperar un poco para que los logs se carguen
		const timer = setTimeout(() => {
			verificarProcesosActivos()
		}, 1500)

		return () => clearTimeout(timer)
	}, [logsHistoricos, logsTiempoReal])

	// Auto-scroll en tabla histórica
	useEffect(() => {
		if (autoScrollHistoricos && historicosRef.current && logsHistoricos.length > 0) {
			setTimeout(() => {
				if (historicosRef.current) {
					historicosRef.current.scrollTop = historicosRef.current.scrollHeight
				}
			}, 100)
		}
	}, [logsHistoricos, autoScrollHistoricos])

	// Reconectar SSE cuando cambian los filtros relevantes
	useEffect(() => {
		if (eventSourceRef.current) {
			desconectarSSE()
			setTimeout(() => {
				if (!ssePaused) {
					conectarSSE()
				}
			}, 500)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nivelesSeleccionados, jobIdFiltro])

	// Conectar SSE al montar
  useEffect(() => {
		conectarSSE()
		return () => {
			desconectarSSE()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Actualizar progreso periódicamente mientras hay procesos activos
	useEffect(() => {
		if (!progresoVisible || !procesoActivo || !inicioProcesoRef.current) return

		const interval = setInterval(() => {
			if (procesoActivo) {
				calcularProgreso(procesoActivo)
			}
		}, 1000) // Actualizar cada segundo

		return () => clearInterval(interval)
	}, [progresoVisible, procesoActivo])

	const toggleNivel = (nivel: string) => {
		setNivelesSeleccionados((prev) =>
			prev.includes(nivel)
				? prev.filter((n) => n !== nivel)
				: [...prev, nivel]
		)
	}

	const formatTimestamp = (timestamp: number) => {
		return new Date(timestamp).toLocaleString('es-ES')
	}

	const getNivelColor = (nivel: string | undefined | null) => {
		if (!nivel || typeof nivel !== 'string') {
			return 'default'
		}
		
		switch (nivel.toLowerCase()) {
			case 'error':
				return 'error'
			case 'warn':
			case 'warning':
				return 'warning'
			case 'info':
				return 'info'
			case 'debug':
				return 'default'
			default:
				return 'default'
		}
	}

	// Determinar si el formulario debe estar deshabilitado
	const formularioDeshabilitado = progresoVisible && procesoActivo !== null

  return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<Encabezado formTitulo="Ejecución de Procesos" />

      <Container
        sx={{
          marginBottom: 4,
					paddingBottom: '100px',
					marginTop: 4,
				}}
			>
				<Box sx={{ marginBottom: 3 }}>
					<BackButton />
				</Box>

				<Grid2 container spacing={3}>
					{/* COLUMNA IZQUIERDA: Subir Documento Excel */}
					<Grid2 size={{ xs: 12, md: 6 }}>
						<Paper sx={{ padding: 3 }}>
							<Typography variant="h6" sx={{ marginBottom: 2 }}>
								1. Subir Documento Excel
							</Typography>
							<Box>
								<input
									type="file"
									accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
									onChange={(e) => {
										const file = e.target.files?.[0]
										if (file) {
											handleFileSelect('excelFile', [file])
										}
									}}
									disabled={formularioDeshabilitado}
									style={{ display: 'none' }}
									id="excel-file-input"
								/>
								<label htmlFor="excel-file-input" style={{ pointerEvents: formularioDeshabilitado ? 'none' : 'auto', opacity: formularioDeshabilitado ? 0.6 : 1 }}>
									<Paper
										elevation={3}
										sx={{
											p: 3,
											border: '2px dashed #ccc',
											textAlign: 'center',
											cursor: formularioDeshabilitado ? 'not-allowed' : 'pointer',
											'&:hover': {
												backgroundColor: formularioDeshabilitado ? 'transparent' : '#f5f5f5',
											},
										}}
									>
										{selectedFile ? (
											<>
												<Typography variant="body1" sx={{ mb: 1 }}>
													Archivo seleccionado:
												</Typography>
												<Typography variant="body2" color="primary">
													{selectedFile.name}
												</Typography>
											</>
										) : (
											<>
												<Typography variant="body2" color="text.secondary">
													Haga clic para seleccionar un archivo Excel
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
													Formatos permitidos: .xlsx, .xls
												</Typography>
											</>
										)}
									</Paper>
								</label>
								{selectedFile && (
									<Box sx={{ marginTop: 2 }}>
										<Button
											variant="contained"
											onClick={handleUpload}
											disabled={uploading || formularioDeshabilitado}
											sx={{
												backgroundColor: '#004084',
												'&:hover': {
													backgroundColor: '#003366',
												},
											}}
										>
											{uploading ? (
												<>
													<CircularProgress size={20} sx={{ mr: 1 }} />
													Subiendo...
												</>
											) : (
												'Subir Archivo'
											)}
										</Button>
									</Box>
								)}
							</Box>
						</Paper>
					</Grid2>

					{/* COLUMNA DERECHA: Ejecutar Conciliación */}
					<Grid2 size={{ xs: 12, md: 6 }}>
						<Paper sx={{ padding: 3 }}>
							<Typography variant="h6" sx={{ marginBottom: 2 }}>
								2. Ejecutar Conciliación
							</Typography>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: formularioDeshabilitado ? 0.6 : 1, pointerEvents: formularioDeshabilitado ? 'none' : 'auto' }}>
								{/* Sección Scheduler */}
								<FormControl fullWidth variant="filled">
									<InputLabel>CONCILIACION</InputLabel>
									<Select
										value={
											schedulerEnabled === null
												? 'pausar'
												: schedulerEnabled === true
												? 'automatico'
												: 'manual'
										}
										onChange={(e) => {
											const value = e.target.value
											if (value === 'automatico') {
												setSchedulerEnabled(true)
											} else if (value === 'manual') {
												setSchedulerEnabled(false)
											} else {
												setSchedulerEnabled(null)
											}
										}}
										disabled={formularioDeshabilitado}
										label="CONCILIACION"
										sx={{
											'& .MuiFilledInput-root': {
												backgroundColor: '#ffffff00 !important',
												borderRadius: '0px',
											},
										}}
									>
										<MenuItem value="automatico">Automatico</MenuItem>
										<MenuItem value="manual">Manual</MenuItem>
										<MenuItem value="pausar">Pausar</MenuItem>
									</Select>
								</FormControl>

								<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
									<TextField
										fullWidth
										label="TIEMPO DE EJECUCION"
										type="number"
										value={tiempoEjecucion}
										onChange={(e) => setTiempoEjecucion(e.target.value)}
										placeholder="Ej: 30"
										variant="filled"
										disabled={formularioDeshabilitado}
										sx={{
											'& .MuiFilledInput-root': {
												backgroundColor: '#ffffff00 !important',
												borderRadius: '0px',
											},
											'& .MuiInputLabel-root': {
												color: 'gray',
											},
											'& .MuiFilledInput-root:hover': {
												backgroundColor: 'green',
											},
											'& .MuiFilledInput-root.Mui-focused': {
												backgroundColor: '#F5FAFF !important',
											},
										}}
									/>
									<FormControl variant="filled" sx={{ minWidth: 150 }}>
										<InputLabel>Unidad</InputLabel>
										<Select
											value={unidadTiempo}
											onChange={(e) =>
												setUnidadTiempo(
													e.target.value as 'segundos' | 'minutos' | 'horas'
												)
											}
											disabled={formularioDeshabilitado}
											label="Unidad"
											sx={{
												'& .MuiFilledInput-root': {
													backgroundColor: '#ffffff00 !important',
													borderRadius: '0px',
												},
											}}
										>
											<MenuItem value="segundos">Segundos</MenuItem>
											<MenuItem value="minutos">Minutos</MenuItem>
											<MenuItem value="horas">Horas</MenuItem>
										</Select>
									</FormControl>
								</Box>

								<Button
									variant="contained"
									onClick={handleGuardarScheduler}
									disabled={guardandoScheduler || !tiempoEjecucion.trim() || formularioDeshabilitado}
									sx={{
										backgroundColor: '#004084',
										paddingX: 3,
										paddingY: 1.5,
										'&:hover': {
											backgroundColor: '#003366',
										},
									}}
								>
									{guardandoScheduler ? (
										<>
											<CircularProgress size={20} sx={{ marginRight: 1 }} />
											Guardando...
										</>
									) : (
										'Enviar'
									)}
								</Button>
							</Box>
						</Paper>
					</Grid2>
            </Grid2>

				{/* SECCIÓN DE LOGS */}
				<Box sx={{ marginTop: 4 }}>
					{/* Barra de progreso */}
					{progresoVisible && (
						<Box sx={{ marginBottom: 3 }}>
							<Typography
								variant="body2"
								sx={{
									color: 'text.secondary',
									fontWeight: 500,
									fontSize: '0.875rem',
									mb: 1,
								}}
							>
								{mensajeProgreso || 'Procesando...'}
							</Typography>
							<LinearProgressWithLabel value={progresoPorcentaje} />
						</Box>
					)}

					{/* FILTROS */}
					<Paper sx={{ padding: 3, marginBottom: 3 }}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 2,
							}}
						>
							<Typography variant="h6">Filtros</Typography>
							<Button
								variant="contained"
								onClick={cargarLogsHistoricos}
								disabled={loadingLogs}
								sx={{ backgroundColor: '#004084' }}
							>
								{loadingLogs ? (
									<>
										<CircularProgress size={20} sx={{ mr: 1 }} />
										Cargando...
									</>
								) : (
									'Aplicar Filtros'
								)}
							</Button>
						</Box>
						<Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 3 }}>
								<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
									<DatePicker
										label="Desde"
										value={fechaDesde}
										onChange={(newValue) => setFechaDesde(newValue)}
										slotProps={{
											textField: {
												variant: 'filled',
												fullWidth: true,
											},
										}}
									/>
								</LocalizationProvider>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
								<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
									<DatePicker
										label="Hasta"
										value={fechaHasta}
										onChange={(newValue) => setFechaHasta(newValue)}
										slotProps={{
											textField: {
												variant: 'filled',
												fullWidth: true,
											},
										}}
									/>
								</LocalizationProvider>
							</Grid2>
							<Grid2 size={{ xs: 12, md: 3 }}>
								<TextField
									fullWidth
									label="Job ID"
									variant="filled"
									value={jobIdFiltro}
									onChange={(e) => setJobIdFiltro(e.target.value)}
              />
            </Grid2>
							<Grid2 size={{ xs: 12, md: 3 }}>
								<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
									{['error', 'warn', 'info', 'debug'].map((nivel) => (
										<Chip
											key={nivel}
											label={nivel}
											onClick={() => toggleNivel(nivel)}
											color={nivelesSeleccionados.includes(nivel) ? 'primary' : 'default'}
											variant={nivelesSeleccionados.includes(nivel) ? 'filled' : 'outlined'}
										/>
									))}
								</Box>
							</Grid2>
							<Grid2 size={{ xs: 12, md: 3 }}>
								<TextField
									fullWidth
									label="Duración Mín (seg)"
									variant="filled"
									type="number"
									value={duracionMin}
									onChange={(e) => setDuracionMin(e.target.value)}
              />
            </Grid2>
							<Grid2 size={{ xs: 12, md: 3 }}>
								<TextField
									fullWidth
									label="Duración Máx (seg)"
									variant="filled"
									type="number"
									value={duracionMax}
									onChange={(e) => setDuracionMax(e.target.value)}
              />
            </Grid2>
          </Grid2>
					</Paper>

					{/* TABLA LOGS HISTÓRICOS */}
					<Paper sx={{ padding: 3, marginBottom: 3 }}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 2,
							}}
						>
							<Typography variant="h6">Logs Históricos</Typography>
							<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
								<FormControlLabel
									control={
										<Checkbox
											checked={autoScrollHistoricos}
											onChange={(e) => setAutoScrollHistoricos(e.target.checked)}
										/>
									}
									label="Auto-scroll"
								/>
								<Button variant="outlined" onClick={cargarLogsHistoricos} disabled={loadingLogs}>
									{loadingLogs ? <CircularProgress size={20} /> : 'Actualizar'}
								</Button>
							</Box>
						</Box>
						<TableContainer
							ref={historicosRef}
							sx={{
								maxHeight: 400,
								overflowY: 'auto',
							}}
						>
							<Table size="small" stickyHeader>
								<TableHead
									sx={{
										position: 'sticky',
										top: 0,
										zIndex: 10,
										backgroundColor: 'white',
										'& .MuiTableCell-root': {
											backgroundColor: 'white',
											fontWeight: 'bold',
										},
									}}
								>
									<TableRow>
										<TableCell>Timestamp</TableCell>
										<TableCell>Nivel</TableCell>
										<TableCell>Proceso</TableCell>
										<TableCell>Job ID</TableCell>
										<TableCell>Mensaje</TableCell>
										<TableCell>Duración</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{loadingLogs ? (
										<TableRow>
											<TableCell colSpan={6} align="center">
												<CircularProgress />
											</TableCell>
										</TableRow>
									) : logsHistoricos.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} align="center">
												No hay logs históricos
											</TableCell>
										</TableRow>
									) : (
										logsHistoricos.map((log, index) => (
											<TableRow key={index}>
												<TableCell>{formatTimestamp(log.timestamp)}</TableCell>
												<TableCell>
													<Chip
														label={log.nivel || 'N/A'}
														color={getNivelColor(log.nivel) as any}
														size="small"
													/>
												</TableCell>
												<TableCell>{log.proceso || 'N/A'}</TableCell>
												<TableCell>{log.jobId || 'N/A'}</TableCell>
												<TableCell>{log.mensaje || 'N/A'}</TableCell>
												<TableCell>
													{log.duracionMinutos
														? `${log.duracionMinutos} min`
														: log.duracionSegundos
															? `${log.duracionSegundos} seg`
															: '-'}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Paper>

					{/* TABLA LOGS TIEMPO REAL */}
					<Paper sx={{ padding: 3 }}>
						<Box
							sx={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 2,
							}}
						>
							<Typography variant="h6">Logs en Tiempo Real</Typography>
							<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
								<Chip
									icon={
										sseConnected ? (
											<RadioButtonCheckedIcon sx={{ color: '#4caf50' }} />
										) : (
											<RadioButtonUncheckedIcon sx={{ color: '#f44336' }} />
										)
									}
									label={sseConnected ? 'Conectado' : 'Desconectado'}
									color={sseConnected ? 'success' : 'error'}
									variant="outlined"
								/>
								{sseError && (
									<Chip
										label={sseErrorMessage || 'Error de conexión'}
										color="error"
										variant="filled"
										size="small"
									/>
								)}
								<Typography variant="body2" color="text.secondary">
									{logsPorMinuto} logs/min
								</Typography>
								<FormControlLabel
									control={
										<Checkbox
											checked={autoScroll}
											onChange={(e) => setAutoScroll(e.target.checked)}
										/>
									}
									label="Auto-scroll"
								/>
								<IconButton
									onClick={togglePausaSSE}
									color={ssePaused ? 'default' : 'primary'}
								>
									{ssePaused ? <PlayArrowOutlinedIcon /> : <PauseIcon />}
								</IconButton>
								<Button variant="outlined" size="small" onClick={limpiarLogsTiempoReal}>
									Limpiar
								</Button>
							</Box>
						</Box>
						<TableContainer
							ref={tiempoRealRef}
							sx={{
								maxHeight: 400,
								overflowY: 'auto',
							}}
						>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										<TableCell>Timestamp</TableCell>
										<TableCell>Nivel</TableCell>
										<TableCell>Proceso</TableCell>
										<TableCell>Job ID</TableCell>
										<TableCell>Mensaje</TableCell>
										<TableCell>Duración</TableCell>
									</TableRow>
							</TableHead>
							<TableBody>
								{sseError && !sseConnected ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<Chip
												label={sseErrorMessage || 'Error de conexión con el servidor'}
												color="error"
												variant="filled"
											/>
										</TableCell>
									</TableRow>
								) : logsTiempoReal.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											Esperando logs en tiempo real...
										</TableCell>
									</TableRow>
								) : (
										logsTiempoReal.map((log, index) => (
											<TableRow key={index}>
												<TableCell>{formatTimestamp(log.timestamp)}</TableCell>
												<TableCell>
													<Chip
														label={log.nivel || 'N/A'}
														color={getNivelColor(log.nivel) as any}
														size="small"
													/>
												</TableCell>
												<TableCell>{log.proceso || 'N/A'}</TableCell>
												<TableCell>{log.jobId || 'N/A'}</TableCell>
												<TableCell>{log.mensaje || 'N/A'}</TableCell>
												<TableCell>
													{log.duracionMinutos
														? `${log.duracionMinutos} min`
														: log.duracionSegundos
															? `${log.duracionSegundos} seg`
															: '-'}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Paper>
				</Box>
      </Container>
      <MegaFooter />

			{/* MODAL MENSAJE */}
      <ModalMessage
				open={modalMessage}
				onClose={() => setModalMessage(false)}
				tipo={messageType}
				titulo={messageTitle}
				mensajeDestacado={messageText}
        textoBotonPrincipal="Aceptar"
				onPrimaryButtonClick={() => setModalMessage(false)}
			/>

			{/* LOADING BACKDROP */}
			<Backdrop
				sx={{
					color: '#fff',
					zIndex: (theme) => theme.zIndex.drawer + 1,
				}}
				open={uploading || guardandoScheduler}
			>
				<CircularProgress color="inherit" />
			</Backdrop>
    </Box>
	)
}
