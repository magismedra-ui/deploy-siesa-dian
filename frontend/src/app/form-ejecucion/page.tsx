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
			await uploadExcelFile(selectedFile)
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

			console.log('Cargando logs con filtros:', filters)
			const logs = await getLogs(filters)
			console.log('Logs recibidos:', logs)
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
		const url = `/api/logs/stream${queryString ? `?${queryString}` : ''}${separator}token=${token}`

		console.log('Conectando SSE a:', url)
		
		// Nota: EventSource no soporta headers personalizados, necesitamos pasar el token en la URL
		const eventSource = new EventSource(url, {
			withCredentials: false,
		})

		eventSource.onopen = () => {
			setSseConnected(true)
			setSseError(false)
			setSseErrorMessage('')
			console.log('SSE conectado exitosamente a:', url)
			console.log('SSE readyState:', eventSource.readyState) // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
		}
		
		// Listener adicional para debug
		eventSource.addEventListener('open', () => {
			console.log('SSE evento "open" recibido')
		})

		eventSource.onmessage = (event) => {
			if (ssePaused) {
				console.log('SSE pausado, ignorando mensaje')
				return
			}

			try {
				console.log('SSE mensaje recibido - tipo:', event.type)
				console.log('SSE mensaje recibido - data:', event.data)
				console.log('SSE mensaje recibido - lastEventId:', event.lastEventId)
				
				// Intentar parsear como JSON
				let logData = event.data
				
				// Si el data tiene el prefijo "data: ", removerlo
				if (typeof logData === 'string' && logData.startsWith('data: ')) {
					logData = logData.substring(6) // Remover "data: "
				}
				
				const log: LogEntry = JSON.parse(logData)
				console.log('SSE log parseado exitosamente:', log)
				
				setLogsTiempoReal((prev) => {
					const nuevo = [...prev, log]
					console.log('SSE - Total logs en tiempo real:', nuevo.length)
					return nuevo
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
				console.log('SSE evento "log" recibido:', event.data)
				const log: LogEntry = JSON.parse(event.data)
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
			console.error('Error SSE:', error)
			console.error('SSE readyState:', eventSource.readyState)
			console.error('SSE URL:', eventSource.url)
			
			// Solo cerrar y reconectar si realmente está cerrado
			if (eventSource.readyState === EventSource.CLOSED) {
				setSseConnected(false)
				setSseError(true)
				setSseErrorMessage('Error de conexión. Intentando reconectar...')
				eventSource.close()
				
				// Intentar reconectar después de 3 segundos
				setTimeout(() => {
					if (!ssePaused) {
						console.log('SSE - Intentando reconectar...')
						setSseErrorMessage('Reconectando...')
						conectarSSE()
					}
				}, 3000)
			} else if (eventSource.readyState === EventSource.CONNECTING) {
				console.log('SSE - Reconectando...')
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
					{/* COLUMNA 1: SUBIR DOCUMENTO */}
					<Grid2 size={{ xs: 12, md: 6 }}>
						<Paper sx={{ padding: 3 }}>
							<Typography variant="h6" sx={{ marginBottom: 2 }}>
								Subir Documento Excel
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
									style={{ display: 'none' }}
									id="excel-file-input"
								/>
								<label htmlFor="excel-file-input">
									<Paper
										elevation={3}
										sx={{
											p: 3,
											border: '2px dashed #ccc',
											textAlign: 'center',
											cursor: 'pointer',
											'&:hover': {
												backgroundColor: '#f5f5f5',
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
											disabled={uploading}
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

					{/* COLUMNA 2: FORMULARIO DE CONFIGURACIÓN DEL SCHEDULER */}
					<Grid2 size={{ xs: 12, md: 6 }}>
						<Paper sx={{ padding: 3 }}>
							<Typography variant="h6" sx={{ marginBottom: 2 }}>
								Configuración de Ejecución
							</Typography>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
									disabled={guardandoScheduler || !tiempoEjecucion.trim()}
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
