'use client'
import { useState, useEffect, useRef } from 'react'
import {
	Container,
	Box,
	Typography,
	Paper,
	Button,
	CircularProgress,
	Backdrop,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	TablePagination,
	Alert,
	Tabs,
	Tab,
	TextField,
} from '@mui/material'
import Grid2 from '@mui/material/Grid2'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)
import InfoIcon from '@mui/icons-material/Info'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CodeIcon from '@mui/icons-material/Code'
import Encabezado from '../global-components/encabezado'
import MegaFooter from '../global-components/footer'
import BackButton from '../global-components/BackButton'
import {
	getResultados,
	getResultadosComoDocumentosStaging,
	getDocumentosStagingPorEstado,
	buscarDocumentosStaging,
	type Resultado,
	type DocumentosStagingResponse,
	type DocumentoStaging,
} from '@/app/api/descarga'
import { isAuthenticated } from '@/app/api/auth'
import { useRouter } from 'next/navigation'
import DownloadIcon from '@mui/icons-material/Download'
import * as XLSX from 'xlsx'

interface TablaEstadoProps {
	estado: string
	titulo: string
	documentos: DocumentoStaging[]
	loading: boolean
	error: string | null
	page: number
	rowsPerPage: number
	total: number
	onPageChange: (event: unknown, newPage: number) => void
	onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void
	onOpenModal: (documento: DocumentoStaging) => void
	onDownload?: (estado: string, titulo: string) => void
	esConciliacion?: boolean // Indica si es tabla de conciliación (CONCILIADO o CONCILIADO CON DIFERENCIA)
}

function TablaEstado({
	estado,
	titulo,
	documentos,
	loading,
	error,
	page,
	rowsPerPage,
	total,
	onPageChange,
	onRowsPerPageChange,
	onOpenModal,
	onDownload,
	esConciliacion = false,
}: TablaEstadoProps) {
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString)
			return date.toLocaleString('es-ES', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			})
		} catch {
			return dateString
		}
	}

	return (
		<Paper sx={{ width: '100%', overflow: 'hidden', marginBottom: 4 }}>
			<Box sx={{ padding: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
				<Typography variant="h6" sx={{ fontWeight: 600 }}>
					{titulo}
				</Typography>
			</Box>
			{error && (
				<Alert severity="error" sx={{ margin: 2 }}>
					{error}
				</Alert>
			)}
			<TableContainer sx={{ maxHeight: 600 }}>
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
							<TableCell>ID</TableCell>
							<TableCell>Fuente</TableCell>
							<TableCell>NIT Proveedor</TableCell>
							<TableCell>Número Factura</TableCell>
							<TableCell>Prefijo</TableCell>
							<TableCell>Razón Social</TableCell>
							<TableCell>Fecha Emisión</TableCell>
							{esConciliacion ? (
								<>
									<TableCell align="right">Valor DIAN</TableCell>
									<TableCell align="right">Valor SIESA</TableCell>
									<TableCell align="right">Diferencia</TableCell>
								</>
							) : (
								<>
									<TableCell align="right">Valor Total</TableCell>
									<TableCell align="right">Impuestos</TableCell>
								</>
							)}
							<TableCell>Estado</TableCell>
							<TableCell>Ejecución ID</TableCell>
							<TableCell>Fecha Creación</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={esConciliacion ? 14 : 13} align="center">
									<CircularProgress />
								</TableCell>
							</TableRow>
						) : documentos.length === 0 ? (
							<TableRow>
								<TableCell colSpan={esConciliacion ? 14 : 13} align="center">
									No hay documentos disponibles
								</TableCell>
							</TableRow>
						) : (
							documentos.map((documento) => (
								<TableRow key={documento.id} hover>
									<TableCell>{documento.id}</TableCell>
									<TableCell>{documento.fuente}</TableCell>
									<TableCell>{documento.nit_proveedor}</TableCell>
									<TableCell>{documento.num_factura}</TableCell>
									<TableCell>{documento.prefijo || '-'}</TableCell>
									<TableCell>{documento.razon_social || '-'}</TableCell>
									<TableCell>
										{documento.fecha_emision
											? (() => {
												// Asegurar que la fecha se muestre correctamente
												// El backend envía fecha_emision como 'YYYY-MM-DD' (string)
												try {
													const fecha = dayjs(documento.fecha_emision)
													if (fecha.isValid()) {
														return fecha.format('DD/MM/YYYY')
													}
													// Fallback al método anterior si dayjs falla
													return new Date(documento.fecha_emision).toLocaleDateString('es-ES')
												} catch {
													return documento.fecha_emision
												}
											})()
											: '-'}
									</TableCell>
									{esConciliacion ? (
										<>
											<TableCell align="right">
												{typeof documento.valor_dian === 'number'
													? documento.valor_dian.toLocaleString('es-ES', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})
													: documento.valor_dian || '-'}
											</TableCell>
											<TableCell align="right">
												{typeof documento.valor_siesa === 'number'
													? documento.valor_siesa.toLocaleString('es-ES', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})
													: documento.valor_siesa || '-'}
											</TableCell>
											<TableCell align="right">
												{typeof documento.diferencia === 'number'
													? documento.diferencia.toLocaleString('es-ES', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})
													: documento.diferencia || '-'}
											</TableCell>
										</>
									) : (
										<>
											<TableCell align="right">
												{typeof documento.valor_total === 'number'
													? documento.valor_total.toLocaleString('es-ES', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})
													: documento.valor_total}
											</TableCell>
											<TableCell align="right">
												{typeof documento.impuestos === 'number'
													? documento.impuestos.toLocaleString('es-ES', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})
													: documento.impuestos || '-'}
											</TableCell>
										</>
									)}
									<TableCell>{documento.estado}</TableCell>
									<TableCell>{documento.ejecucion_id}</TableCell>
									<TableCell>{formatDate(documento.createdAt || '')}</TableCell>
									<TableCell align="center">
										<IconButton
											size="small"
											color="primary"
											onClick={() => onOpenModal(documento)}
											title="Ver información comparativa"
										>
											<InfoIcon />
										</IconButton>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={onPageChange}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={onRowsPerPageChange}
				rowsPerPageOptions={[5, 10, 25, 50, 100]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) =>
					`${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
				}
			/>
			{onDownload && total > 0 && (
				<Box sx={{ padding: 2, display: 'flex', justifyContent: 'flex-end' }}>
					<Button
						variant="contained"
						startIcon={<DownloadIcon />}
						onClick={() => onDownload(estado, titulo)}
						sx={{
							backgroundColor: '#004084',
							'&:hover': {
								backgroundColor: '#003366',
							},
						}}
					>
						Descargar Excel
					</Button>
				</Box>
			)}
		</Paper>
	)
}

export default function DescargaPage() {
	const router = useRouter()

	// Estados para cada tabla
	const estados = [
		{ valor: 'CONCILIADO', titulo: 'Conciliados' },
		{ valor: 'CONCILIADO CON DIFERENCIA', titulo: 'Conciliados con Diferencia' },
		{ valor: 'NO CONCILIADO SOLO EN SIESA', titulo: 'No Conciliados Solo en SIESA' },
		{ valor: 'NO CONCILIADO SOLO EN DIAN', titulo: 'No Conciliados Solo en DIAN' },
	]

	const [tabIndex, setTabIndex] = useState(0)
	const [documentosConciliados, setDocumentosConciliados] = useState<DocumentoStaging[]>([])
	const [documentosConDiferencia, setDocumentosConDiferencia] = useState<DocumentoStaging[]>([])
	const [documentosSoloSiesa, setDocumentosSoloSiesa] = useState<DocumentoStaging[]>([])
	const [documentosSoloDian, setDocumentosSoloDian] = useState<DocumentoStaging[]>([])

	const [loadingConciliados, setLoadingConciliados] = useState(false)
	const [loadingConDiferencia, setLoadingConDiferencia] = useState(false)
	const [loadingSoloSiesa, setLoadingSoloSiesa] = useState(false)
	const [loadingSoloDian, setLoadingSoloDian] = useState(false)

	const [errorConciliados, setErrorConciliados] = useState<string | null>(null)
	const [errorConDiferencia, setErrorConDiferencia] = useState<string | null>(null)
	const [errorSoloSiesa, setErrorSoloSiesa] = useState<string | null>(null)
	const [errorSoloDian, setErrorSoloDian] = useState<string | null>(null)

	const [pageConciliados, setPageConciliados] = useState(0)
	const [pageConDiferencia, setPageConDiferencia] = useState(0)
	const [pageSoloSiesa, setPageSoloSiesa] = useState(0)
	const [pageSoloDian, setPageSoloDian] = useState(0)

	const [rowsPerPage, setRowsPerPage] = useState(10)

	const [totalConciliados, setTotalConciliados] = useState(0)
	const [totalConDiferencia, setTotalConDiferencia] = useState(0)
	const [totalSoloSiesa, setTotalSoloSiesa] = useState(0)
	const [totalSoloDian, setTotalSoloDian] = useState(0)

	// Estados para el modal comparativo
	const [modalOpen, setModalOpen] = useState(false)
	const [selectedDocumento, setSelectedDocumento] = useState<DocumentoStaging | null>(null)
	const [documentos, setDocumentos] = useState<DocumentosStagingResponse | null>(null)
	const [loadingDocumentos, setLoadingDocumentos] = useState(false)
	const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null)
	const [showJsonDian, setShowJsonDian] = useState(false)
	const [showJsonSiesa, setShowJsonSiesa] = useState(false)

	// Estado para el loading de descarga
	const [saving, setSaving] = useState(false)

	// Estados para filtros (compartidos entre todas las tablas)
	const [filtroNitProveedor, setFiltroNitProveedor] = useState('')
	const [filtroFechaEmision, setFiltroFechaEmision] = useState<string | null>(null)

	// Función para cargar documentos por estado
	const cargarDocumentosPorEstado = async (
		estado: string,
		page: number,
		limit: number
	) => {
		try {
			const response = await getDocumentosStagingPorEstado(
				estado,
				page,
				limit,
				filtroNitProveedor || undefined,
				filtroFechaEmision || undefined
			)
			return response
		} catch (err) {
			console.error(`Error al cargar documentos con estado ${estado}:`, err)
			throw err
		}
	}

	// Cargar documentos conciliados desde repo_resultados
	const cargarConciliados = async () => {
		setLoadingConciliados(true)
		setErrorConciliados(null)
		try {
			// Usar getResultadosComoDocumentosStaging para obtener datos de repo_resultados
			const response = await getResultadosComoDocumentosStaging(
				'CONCILIADO',
				pageConciliados,
				rowsPerPage,
				filtroNitProveedor || undefined,
				filtroFechaEmision || undefined
			)
			setDocumentosConciliados(response.data || [])
			setTotalConciliados(response.total || 0)
		} catch (err) {
			setErrorConciliados(
				err instanceof Error ? err.message : 'Error al cargar documentos conciliados'
			)
			setDocumentosConciliados([])
		} finally {
			setLoadingConciliados(false)
		}
	}

	// Cargar documentos con diferencia desde repo_resultados
	const cargarConDiferencia = async () => {
		setLoadingConDiferencia(true)
		setErrorConDiferencia(null)
		try {
			// Usar getResultadosComoDocumentosStaging para obtener datos de repo_resultados
			const response = await getResultadosComoDocumentosStaging(
				'CONCILIADO CON DIFERENCIA',
				pageConDiferencia,
				rowsPerPage,
				filtroNitProveedor || undefined,
				filtroFechaEmision || undefined
			)
			setDocumentosConDiferencia(response.data || [])
			setTotalConDiferencia(response.total || 0)
		} catch (err) {
			setErrorConDiferencia(
				err instanceof Error ? err.message : 'Error al cargar documentos con diferencia'
			)
			setDocumentosConDiferencia([])
		} finally {
			setLoadingConDiferencia(false)
		}
	}

	// Cargar documentos solo en SIESA
	const cargarSoloSiesa = async () => {
		setLoadingSoloSiesa(true)
		setErrorSoloSiesa(null)
		try {
			const response = await cargarDocumentosPorEstado(
				'NO CONCILIADO SOLO EN SIESA',
				pageSoloSiesa,
				rowsPerPage
			)
			setDocumentosSoloSiesa(response.data || [])
			setTotalSoloSiesa(response.total || 0)
		} catch (err) {
			setErrorSoloSiesa(
				err instanceof Error ? err.message : 'Error al cargar documentos solo en SIESA'
			)
			setDocumentosSoloSiesa([])
		} finally {
			setLoadingSoloSiesa(false)
		}
	}

	// Cargar documentos solo en DIAN
	const cargarSoloDian = async () => {
		setLoadingSoloDian(true)
		setErrorSoloDian(null)
		try {
			const response = await cargarDocumentosPorEstado(
				'NO CONCILIADO SOLO EN DIAN',
				pageSoloDian,
				rowsPerPage
			)
			setDocumentosSoloDian(response.data || [])
			setTotalSoloDian(response.total || 0)
		} catch (err) {
			setErrorSoloDian(
				err instanceof Error ? err.message : 'Error al cargar documentos solo en DIAN'
			)
			setDocumentosSoloDian([])
		} finally {
			setLoadingSoloDian(false)
		}
	}

	// Verificar autenticación al montar el componente
	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			console.warn('No hay token de autenticación, redirigiendo al login')
			router.push('/')
		}
	}, [router])

	// Resetear páginas cuando cambian los filtros
	useEffect(() => {
		setPageConciliados(0)
		setPageConDiferencia(0)
		setPageSoloSiesa(0)
		setPageSoloDian(0)
	}, [filtroNitProveedor, filtroFechaEmision])

	// Cargar documentos cuando cambia la página, el tamaño o los filtros
	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			return
		}
		cargarConciliados()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageConciliados, rowsPerPage, filtroNitProveedor, filtroFechaEmision])

	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			return
		}
		cargarConDiferencia()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageConDiferencia, rowsPerPage, filtroNitProveedor, filtroFechaEmision])

	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			return
		}
		cargarSoloSiesa()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageSoloSiesa, rowsPerPage, filtroNitProveedor, filtroFechaEmision])

	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			return
		}
		cargarSoloDian()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageSoloDian, rowsPerPage, filtroNitProveedor, filtroFechaEmision])

	// Manejar cambio de tab
	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabIndex(newValue)
	}

	// Manejar cambio de página para cada tabla
	const handleChangePageConciliados = (_event: unknown, newPage: number) => {
		setPageConciliados(newPage)
	}

	const handleChangePageConDiferencia = (_event: unknown, newPage: number) => {
		setPageConDiferencia(newPage)
	}

	const handleChangePageSoloSiesa = (_event: unknown, newPage: number) => {
		setPageSoloSiesa(newPage)
	}

	const handleChangePageSoloDian = (_event: unknown, newPage: number) => {
		setPageSoloDian(newPage)
	}

	// Manejar cambio de filas por página
	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newRowsPerPage = parseInt(event.target.value, 10)
		setRowsPerPage(newRowsPerPage)
		setPageConciliados(0)
		setPageConDiferencia(0)
		setPageSoloSiesa(0)
		setPageSoloDian(0)
	}

	// Abrir modal y cargar documentos
	const handleOpenModal = async (documento: DocumentoStaging) => {
		setSelectedDocumento(documento)
		setModalOpen(true)
		setDocumentos(null)
		setErrorDocumentos(null)
		setLoadingDocumentos(true)
		setShowJsonDian(false)
		setShowJsonSiesa(false)

		try {
			// Verificar si el documento viene de resultados (tiene valor_dian y valor_siesa)
			const esResultado = documento.valor_dian !== undefined || documento.valor_siesa !== undefined

			if (esResultado) {
				// Construir estructura de documentos desde el resultado
				const docs: DocumentosStagingResponse = {
					dian: documento.valor_dian !== undefined ? {
						id: documento.id,
						nit_proveedor: documento.nit_proveedor,
						num_factura: documento.num_factura,
						fuente: 'DIAN',
						estado: documento.estado,
						valor_total: documento.valor_dian,
						ejecucion_id: documento.ejecucion_id,
						createdAt: documento.createdAt,
						updatedAt: documento.updatedAt,
					} : undefined,
					siesa: documento.valor_siesa !== undefined ? {
						id: documento.id,
						nit_proveedor: documento.nit_proveedor,
						num_factura: documento.num_factura,
						fuente: 'SIESA',
						estado: documento.estado,
						valor_total: documento.valor_siesa,
						ejecucion_id: documento.ejecucion_id,
						createdAt: documento.createdAt,
						updatedAt: documento.updatedAt,
					} : undefined,
				}

				setDocumentos(docs)
			} else {
				// Buscar documentos en staging (para estados NO CONCILIADO)
				const docs = await buscarDocumentosStaging(
					documento.nit_proveedor,
					documento.num_factura
				)

				setDocumentos(docs)
			}
		} catch (err) {
			console.error('Error al cargar documentos:', err)
			setErrorDocumentos(
				err instanceof Error ? err.message : 'Error al cargar documentos'
			)
		} finally {
			setLoadingDocumentos(false)
		}
	}

	// Cerrar modal
	const handleCloseModal = () => {
		setModalOpen(false)
		setSelectedDocumento(null)
		setDocumentos(null)
		setErrorDocumentos(null)
		setShowJsonDian(false)
		setShowJsonSiesa(false)
	}

	// Formatear JSON
	const formatJSON = (obj: any) => {
		try {
			return JSON.stringify(obj, null, 2)
		} catch {
			return String(obj)
		}
	}

	// Función para descargar datos en formato Excel
	const handleDownloadExcel = async (estado: string, titulo: string) => {
		setSaving(true)
		try {
			let todosLosDocumentos: DocumentoStaging[] = []
			
			// Detectar si es tabla de conciliación (CONCILIADO o CONCILIADO CON DIFERENCIA)
			const esConciliacion = 
				estado === 'CONCILIADO' || estado === 'CONCILIADO CON DIFERENCIA'
			
			if (esConciliacion) {
				// Obtener todos los registros de resultados (repo_resultados)
				// Hacer múltiples llamadas paginadas para obtener todos los registros
				let page = 0
				const limit = 1000 // Límite razonable por página
				let hasMore = true
				
				while (hasMore) {
					const response = await getResultadosComoDocumentosStaging(
						estado,
						page,
						limit,
						filtroNitProveedor || undefined,
						filtroFechaEmision || undefined
					)
					todosLosDocumentos = [...todosLosDocumentos, ...(response.data || [])]
					
					// Si no hay más páginas o no hay más datos, detener
					if (response.data.length < limit || page >= response.totalPages - 1) {
						hasMore = false
					} else {
						page++
					}
				}
			} else {
				// Obtener todos los registros de documentos staging
				// Hacer múltiples llamadas paginadas para obtener todos los registros
				let page = 0
				const limit = 1000 // Límite razonable por página
				let hasMore = true
				
				while (hasMore) {
					const response = await getDocumentosStagingPorEstado(
						estado,
						page,
						limit,
						filtroNitProveedor || undefined,
						filtroFechaEmision || undefined
					)
					todosLosDocumentos = [...todosLosDocumentos, ...(response.data || [])]
					
					// Si no hay más páginas o no hay más datos, detener
					if (response.data.length < limit || page >= response.totalPages - 1) {
						hasMore = false
					} else {
						page++
					}
				}
			}
			
			if (todosLosDocumentos.length === 0) {
				alert('No hay datos para descargar')
				return
			}

			// Preparar datos para Excel
			const datosExcel = todosLosDocumentos.map((doc) => {
				const baseData = {
					ID: doc.id,
					Fuente: doc.fuente,
					'NIT Proveedor': doc.nit_proveedor,
					'Número Factura': doc.num_factura,
					Prefijo: doc.prefijo || '',
					'Razón Social': doc.razon_social || '',
					'Fecha Emisión': doc.fecha_emision
						? new Date(doc.fecha_emision).toLocaleDateString('es-ES')
						: '',
					Estado: doc.estado,
					'Ejecución ID': doc.ejecucion_id,
					'Fecha Creación': doc.createdAt
						? new Date(doc.createdAt).toLocaleString('es-ES')
						: '',
				}

				if (esConciliacion) {
					return {
						...baseData,
						'Valor DIAN':
							typeof doc.valor_dian === 'number'
								? doc.valor_dian.toFixed(2)
								: doc.valor_dian || '',
						'Valor SIESA':
							typeof doc.valor_siesa === 'number'
								? doc.valor_siesa.toFixed(2)
								: doc.valor_siesa || '',
						Diferencia:
							typeof doc.diferencia === 'number'
								? doc.diferencia.toFixed(2)
								: doc.diferencia || '',
					}
				} else {
					return {
						...baseData,
						'Valor Total':
							typeof doc.valor_total === 'number'
								? doc.valor_total.toFixed(2)
								: doc.valor_total || '',
						Impuestos:
							typeof doc.impuestos === 'number'
								? doc.impuestos.toFixed(2)
								: doc.impuestos || '',
					}
				}
			})

			// Crear workbook y worksheet
			const wb = XLSX.utils.book_new()
			const ws = XLSX.utils.json_to_sheet(datosExcel)

			// Ajustar anchos de columna según el tipo de tabla
			const columnWidths = esConciliacion
				? [
						{ wch: 10 }, // ID
						{ wch: 12 }, // Fuente
						{ wch: 15 }, // NIT Proveedor
						{ wch: 20 }, // Número Factura
						{ wch: 12 }, // Prefijo
						{ wch: 30 }, // Razón Social
						{ wch: 15 }, // Fecha Emisión
						{ wch: 15 }, // Valor DIAN
						{ wch: 15 }, // Valor SIESA
						{ wch: 15 }, // Diferencia
						{ wch: 25 }, // Estado
						{ wch: 15 }, // Ejecución ID
						{ wch: 20 }, // Fecha Creación
					]
				: [
						{ wch: 10 }, // ID
						{ wch: 12 }, // Fuente
						{ wch: 15 }, // NIT Proveedor
						{ wch: 20 }, // Número Factura
						{ wch: 12 }, // Prefijo
						{ wch: 30 }, // Razón Social
						{ wch: 15 }, // Fecha Emisión
						{ wch: 15 }, // Valor Total
						{ wch: 15 }, // Impuestos
						{ wch: 25 }, // Estado
						{ wch: 15 }, // Ejecución ID
						{ wch: 20 }, // Fecha Creación
					]
			ws['!cols'] = columnWidths

			// Agregar worksheet al workbook
			XLSX.utils.book_append_sheet(wb, ws, 'Documentos')

			// Generar nombre de archivo
			const fechaActual = new Date().toISOString().split('T')[0]
			const nombreArchivo = `${titulo.replace(/\s+/g, '_')}_${fechaActual}.xlsx`

			// Descargar archivo
			XLSX.writeFile(wb, nombreArchivo)
		} catch (error) {
			console.error('Error al generar Excel:', error)
			alert(
				error instanceof Error
					? `Error al generar el archivo Excel: ${error.message}`
					: 'Error al generar el archivo Excel. Por favor intente nuevamente.'
			)
		} finally {
			setSaving(false)
		}
	}

	// Renderizar campo del documento
	const renderCampo = (label: string, value: any) => {
		if (value === null || value === undefined || value === '') return null

		// Si es un array, mostrar como lista
		if (Array.isArray(value)) {
			if (value.length === 0) return null
			return (
				<Box sx={{ marginBottom: 1.5 }}>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
						{label}:
					</Typography>
					<Box sx={{ paddingLeft: 1 }}>
						{value.map((item, index) => (
							<Typography key={index} variant="body2" sx={{ fontWeight: 400 }}>
								• {String(item)}
							</Typography>
						))}
					</Box>
				</Box>
			)
		}

		// Si es un objeto (pero no un array), mostrar como JSON formateado
		if (typeof value === 'object') {
			return (
				<Box sx={{ marginBottom: 1.5 }}>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
						{label}:
					</Typography>
					<Box
						sx={{
							backgroundColor: '#f5f5f5',
							padding: 1,
							borderRadius: 1,
							fontSize: '0.75rem',
							fontFamily: 'monospace',
							maxHeight: 150,
							overflow: 'auto',
						}}
					>
						{formatJSON(value)}
					</Box>
				</Box>
			)
		}

		return (
			<Box sx={{ marginBottom: 1.5 }}>
				<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
					{label}:
				</Typography>
				<Typography variant="body2" sx={{ fontWeight: 500 }}>
					{String(value)}
				</Typography>
			</Box>
		)
	}

	return (
		<>
			<Encabezado formTitulo="Descargas" />
			<Container
				maxWidth="xl"
				sx={{
					marginTop: 4,
					marginBottom: 4,
					paddingBottom: '100px',
				}}
			>
				<BackButton />
				<Typography variant="h4" sx={{ marginBottom: 3, fontWeight: 500 }}>
					Resultados de Conciliación
				</Typography>

				{/* Filtros */}
				<Paper sx={{ padding: 2, marginBottom: 3 }}>
					<Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 600 }}>
						Filtros
					</Typography>
					<Grid2 container spacing={2} alignItems="center">
						<Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
							<TextField
								fullWidth
								label="NIT Proveedor"
								variant="outlined"
								value={filtroNitProveedor}
								onChange={(e) => setFiltroNitProveedor(e.target.value)}
								placeholder="Buscar por NIT..."
							/>
						</Grid2>
						<Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
							<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
								<DatePicker
									label="Fecha Emisión"
									value={filtroFechaEmision ? dayjs(filtroFechaEmision, 'YYYY-MM-DD', true) : null}
									onChange={(newValue: Dayjs | null) => {
										if (newValue && newValue.isValid()) {
											const fechaFormateada = newValue.format('YYYY-MM-DD')
											setFiltroFechaEmision(fechaFormateada)
										} else {
											setFiltroFechaEmision(null)
										}
									}}
									format="DD/MM/YYYY"
									slotProps={{
										textField: {
											fullWidth: true,
											variant: 'outlined',
											placeholder: 'DD/MM/YYYY',
											onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
												// Manejar entrada manual en formato DD/MM/YYYY
												const inputValue = e.target.value.trim()
												if (inputValue) {
													// Intentar parsear como DD/MM/YYYY primero (formato estricto)
													let parsed = dayjs(inputValue, 'DD/MM/YYYY', true)
													// Si no funciona, intentar otros formatos comunes
													if (!parsed.isValid()) {
														parsed = dayjs(inputValue, 'D/M/YYYY', true)
													}
													if (!parsed.isValid()) {
														parsed = dayjs(inputValue, 'DD-MM-YYYY', true)
													}
													if (!parsed.isValid()) {
														parsed = dayjs(inputValue, 'YYYY-MM-DD', true)
													}
													if (!parsed.isValid()) {
														// Último intento sin formato estricto
														parsed = dayjs(inputValue)
													}
													if (parsed.isValid()) {
														const fechaFormateada = parsed.format('YYYY-MM-DD')
														setFiltroFechaEmision(fechaFormateada)
													} else {
														setFiltroFechaEmision(null)
													}
												} else {
													setFiltroFechaEmision(null)
												}
											},
										},
									}}
								/>
							</LocalizationProvider>
						</Grid2>
						<Grid2 size={{ xs: 12, sm: 12, md: 4 }}>
							<Box sx={{ display: 'flex', gap: 1 }}>
								<Button
									variant="outlined"
									onClick={() => {
										setFiltroNitProveedor('')
										setFiltroFechaEmision(null)
									}}
									sx={{ flex: 1 }}
								>
									Limpiar Filtros
								</Button>
							</Box>
						</Grid2>
					</Grid2>
				</Paper>

				{/* Tabs para seleccionar el tipo de tabla */}
				<Paper sx={{ marginBottom: 3 }}>
					<Tabs
						value={tabIndex}
						onChange={handleTabChange}
						variant="scrollable"
						scrollButtons="auto"
						sx={{ borderBottom: 1, borderColor: 'divider' }}
					>
						{estados.map((estado, index) => (
							<Tab key={estado.valor} label={estado.titulo} />
						))}
					</Tabs>
				</Paper>

				{/* Tabla de Conciliados */}
				{tabIndex === 0 && (
					<TablaEstado
						estado="CONCILIADO"
						titulo="Documentos Conciliados"
						documentos={documentosConciliados}
						loading={loadingConciliados}
						error={errorConciliados}
						page={pageConciliados}
						rowsPerPage={rowsPerPage}
						total={totalConciliados}
						onPageChange={handleChangePageConciliados}
						onRowsPerPageChange={handleChangeRowsPerPage}
						onOpenModal={handleOpenModal}
						onDownload={handleDownloadExcel}
						esConciliacion={true}
					/>
				)}

				{/* Tabla de Conciliados con Diferencia */}
				{tabIndex === 1 && (
					<TablaEstado
						estado="CONCILIADO CON DIFERENCIA"
						titulo="Documentos Conciliados con Diferencia"
						documentos={documentosConDiferencia}
						loading={loadingConDiferencia}
						error={errorConDiferencia}
						page={pageConDiferencia}
						rowsPerPage={rowsPerPage}
						total={totalConDiferencia}
						onPageChange={handleChangePageConDiferencia}
						onRowsPerPageChange={handleChangeRowsPerPage}
						onOpenModal={handleOpenModal}
						onDownload={handleDownloadExcel}
						esConciliacion={true}
					/>
				)}

				{/* Tabla de Solo en SIESA */}
				{tabIndex === 2 && (
					<TablaEstado
						estado="NO CONCILIADO SOLO EN SIESA"
						titulo="Documentos No Conciliados Solo en SIESA"
						documentos={documentosSoloSiesa}
						loading={loadingSoloSiesa}
						error={errorSoloSiesa}
						page={pageSoloSiesa}
						rowsPerPage={rowsPerPage}
						total={totalSoloSiesa}
						onPageChange={handleChangePageSoloSiesa}
						onRowsPerPageChange={handleChangeRowsPerPage}
						onOpenModal={handleOpenModal}
						onDownload={handleDownloadExcel}
					/>
				)}

				{/* Tabla de Solo en DIAN */}
				{tabIndex === 3 && (
					<TablaEstado
						estado="NO CONCILIADO SOLO EN DIAN"
						titulo="Documentos No Conciliados Solo en DIAN"
						documentos={documentosSoloDian}
						loading={loadingSoloDian}
						error={errorSoloDian}
						page={pageSoloDian}
						rowsPerPage={rowsPerPage}
						total={totalSoloDian}
						onPageChange={handleChangePageSoloDian}
						onRowsPerPageChange={handleChangeRowsPerPage}
						onOpenModal={handleOpenModal}
						onDownload={handleDownloadExcel}
					/>
				)}

				{/* Modal Comparativo */}
				<Dialog
					open={modalOpen}
					onClose={handleCloseModal}
					maxWidth="lg"
					fullWidth
					PaperProps={{
						sx: {
							maxHeight: '90vh',
						},
					}}
				>
					<DialogTitle
						sx={{
							backgroundColor: '#004084',
							color: '#fff',
							textAlign: 'center',
						}}
					>
						Comparación de Documentos
						{selectedDocumento && (
							<Typography variant="body2" sx={{ marginTop: 1, opacity: 0.9 }}>
								NIT: {selectedDocumento.nit_proveedor} | Factura:{' '}
								{selectedDocumento.num_factura}
							</Typography>
						)}
					</DialogTitle>
					<DialogContent sx={{ padding: 3 }}>
						{loadingDocumentos ? (
							<Box
								sx={{
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
									minHeight: 200,
								}}
							>
								<CircularProgress />
							</Box>
						) : errorDocumentos ? (
							<Alert severity="error" sx={{ marginBottom: 2 }}>
								{errorDocumentos}
							</Alert>
						) : documentos ? (
							<Grid2 container spacing={3}>
								{/* Columna DIAN */}
								<Grid2 size={{ xs: 12, md: 6 }}>
									<Paper
										sx={{
											padding: 2,
											height: '100%',
											border: '1px solid #e0e0e0',
										}}
									>
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: 2,
											}}
										>
											<Typography variant="h6" color="primary">
												Fuente DIAN
											</Typography>
											{documentos.dian && (
												<Button
													size="small"
													variant="outlined"
													startIcon={<CodeIcon />}
													onClick={() => setShowJsonDian(!showJsonDian)}
												>
													JSON
												</Button>
											)}
										</Box>
										{documentos.dian && Object.keys(documentos.dian).length > 0 ? (
											<>
												{Object.entries(documentos.dian)
													.filter(([key]) => {
														const excludeKeys = [
															'payload_original',
															'id',
															'fuente',
															'FUENTE',
															'ejecucion',
															'ejecucion_id',
															'ejecución',
															'ejecución_id',
														]
														return !excludeKeys.includes(key)
													})
													.map(([key, value]) => {
														if (
															value === null ||
															value === undefined ||
															value === ''
														) {
															return null
														}
														if (
															typeof value === 'object' &&
															!Array.isArray(value)
														) {
															return (
																<Box key={key} sx={{ marginBottom: 1.5 }}>
																	<Typography
																		variant="caption"
																		color="text.secondary"
																		sx={{ display: 'block' }}
																	>
																		{key}:
																	</Typography>
																	<Box
																		sx={{
																			backgroundColor: '#f5f5f5',
																			padding: 1,
																			borderRadius: 1,
																			fontSize: '0.75rem',
																			fontFamily: 'monospace',
																		}}
																	>
																		{formatJSON(value)}
																	</Box>
																</Box>
															)
														}
														return (
															<Box key={key}>{renderCampo(key, value)}</Box>
														)
													})}
												{showJsonDian && documentos.dian?.payload_original && (
													<Accordion sx={{ marginTop: 2 }}>
														<AccordionSummary expandIcon={<ExpandMoreIcon />}>
															<Typography variant="subtitle2">
																Payload Original (JSON)
															</Typography>
														</AccordionSummary>
														<AccordionDetails>
															<Box
																sx={{
																	backgroundColor: '#f5f5f5',
																	padding: 2,
																	borderRadius: 1,
																	overflow: 'auto',
																	maxHeight: 300,
																}}
															>
																<pre
																	style={{
																		margin: 0,
																		fontSize: '0.875rem',
																		fontFamily: 'monospace',
																	}}
																>
																	{formatJSON(documentos.dian.payload_original)}
																</pre>
															</Box>
														</AccordionDetails>
													</Accordion>
												)}
											</>
										) : (
											<Typography variant="body2" color="text.secondary">
												No hay datos disponibles de DIAN
											</Typography>
										)}
									</Paper>
								</Grid2>

								{/* Columna SIESA */}
								<Grid2 size={{ xs: 12, md: 6 }}>
									<Paper
										sx={{
											padding: 2,
											height: '100%',
											border: '1px solid #e0e0e0',
										}}
									>
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: 2,
											}}
										>
											<Typography variant="h6" color="secondary">
												Fuente SIESA
											</Typography>
											{documentos.siesa && (
												<Button
													size="small"
													variant="outlined"
													startIcon={<CodeIcon />}
													onClick={() => setShowJsonSiesa(!showJsonSiesa)}
												>
													JSON
												</Button>
											)}
										</Box>
										{documentos.siesa && Object.keys(documentos.siesa).length > 0 ? (
											<>
												{Object.entries(documentos.siesa)
													.filter(([key]) => {
														const excludeKeys = [
															'payload_original',
															'id',
															'fuente',
															'FUENTE',
															'ejecucion',
															'ejecucion_id',
															'ejecución',
															'ejecución_id',
														]
														return !excludeKeys.includes(key)
													})
													.map(([key, value]) => {
														if (
															value === null ||
															value === undefined ||
															value === ''
														) {
															return null
														}
														if (
															typeof value === 'object' &&
															!Array.isArray(value)
														) {
															return (
																<Box key={key} sx={{ marginBottom: 1.5 }}>
																	<Typography
																		variant="caption"
																		color="text.secondary"
																		sx={{ display: 'block' }}
																	>
																		{key}:
																	</Typography>
																	<Box
																		sx={{
																			backgroundColor: '#f5f5f5',
																			padding: 1,
																			borderRadius: 1,
																			fontSize: '0.75rem',
																			fontFamily: 'monospace',
																		}}
																	>
																		{formatJSON(value)}
																	</Box>
																</Box>
															)
														}
														return (
															<Box key={key}>{renderCampo(key, value)}</Box>
														)
													})}
												{showJsonSiesa && documentos.siesa?.payload_original && (
													<Accordion sx={{ marginTop: 2 }}>
														<AccordionSummary expandIcon={<ExpandMoreIcon />}>
															<Typography variant="subtitle2">
																Payload Original (JSON)
															</Typography>
														</AccordionSummary>
														<AccordionDetails>
															<Box
																sx={{
																	backgroundColor: '#f5f5f5',
																	padding: 2,
																	borderRadius: 1,
																	overflow: 'auto',
																	maxHeight: 300,
																}}
															>
																<pre
																	style={{
																		margin: 0,
																		fontSize: '0.875rem',
																		fontFamily: 'monospace',
																	}}
																>
																	{formatJSON(documentos.siesa.payload_original)}
																</pre>
															</Box>
														</AccordionDetails>
													</Accordion>
												)}
											</>
										) : (
											<Typography variant="body2" color="text.secondary">
												No hay datos disponibles de SIESA
											</Typography>
										)}
									</Paper>
								</Grid2>
							</Grid2>
						) : null}
					</DialogContent>
					<DialogActions sx={{ padding: 2 }}>
						<Button onClick={handleCloseModal} variant="contained" color="primary">
							Cerrar
						</Button>
					</DialogActions>
				</Dialog>
			</Container>
			<MegaFooter />

			{/* LOADING BACKDROP para descarga de Excel */}
			<Backdrop
				sx={{
					color: '#fff',
					zIndex: (theme) => theme.zIndex.drawer + 1,
				}}
				open={saving}
			>
				<CircularProgress color="inherit" />
			</Backdrop>
		</>
	)
}
