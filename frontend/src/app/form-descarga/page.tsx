'use client'
import { useState, useEffect, useEffect as useEffectAuth } from 'react'
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
} from '@mui/material'
import Grid2 from '@mui/material/Grid2'
import InfoIcon from '@mui/icons-material/Info'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CodeIcon from '@mui/icons-material/Code'
import Encabezado from '../global-components/encabezado'
import MegaFooter from '../global-components/footer'
import BackButton from '../global-components/BackButton'
import { getResultados, buscarDocumentosStaging, type Resultado, type DocumentosStagingResponse } from '@/app/api/descarga'
import { isAuthenticated } from '@/app/api/auth'
import { useRouter } from 'next/navigation'

export default function DescargaPage() {
	const router = useRouter()
	
	// Estados para la tabla
	const [resultados, setResultados] = useState<Resultado[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [page, setPage] = useState(0)
	const [rowsPerPage, setRowsPerPage] = useState(10)
	const [total, setTotal] = useState(0)

	// Estados para el modal comparativo
	const [modalOpen, setModalOpen] = useState(false)
	const [selectedResultado, setSelectedResultado] = useState<Resultado | null>(null)
	const [documentos, setDocumentos] = useState<DocumentosStagingResponse | null>(null)
	const [loadingDocumentos, setLoadingDocumentos] = useState(false)
	const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null)
	const [showJsonDian, setShowJsonDian] = useState(false)
	const [showJsonSiesa, setShowJsonSiesa] = useState(false)

	// Cargar resultados
	const cargarResultados = async () => {
		setLoading(true)
		setError(null)
		try {
			const response = await getResultados(page, rowsPerPage)
			setResultados(response.data || [])
			setTotal(response.total || 0)
		} catch (err) {
			console.error('Error al cargar resultados:', err)
			setError(err instanceof Error ? err.message : 'Error al cargar resultados')
			setResultados([])
		} finally {
			setLoading(false)
		}
	}

	// Verificar autenticación al montar el componente
	useEffect(() => {
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			console.warn('No hay token de autenticación, redirigiendo al login')
			router.push('/')
		}
	}, [router])

	// Cargar resultados cuando cambia la página o el tamaño
	useEffect(() => {
		// Verificar que hay token antes de cargar resultados
		if (typeof window !== 'undefined' && !isAuthenticated()) {
			return
		}
		
		cargarResultados()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, rowsPerPage])

	// Manejar cambio de página
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage)
	}

	// Manejar cambio de filas por página
	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10))
		setPage(0)
	}

	// Abrir modal y cargar documentos
	const handleOpenModal = async (resultado: Resultado) => {
		setSelectedResultado(resultado)
		setModalOpen(true)
		setDocumentos(null)
		setErrorDocumentos(null)
		setLoadingDocumentos(true)
		setShowJsonDian(false)
		setShowJsonSiesa(false)

		try {
			console.log('Buscando documentos para:', {
				nit_proveedor: resultado.nit_proveedor,
				num_factura: resultado.num_factura,
			})
			
			const docs = await buscarDocumentosStaging(
				resultado.nit_proveedor,
				resultado.num_factura
			)
			
			console.log('Documentos recibidos:', docs)
			console.log('DIAN keys:', docs.dian ? Object.keys(docs.dian) : 'undefined')
			console.log('SIESA keys:', docs.siesa ? Object.keys(docs.siesa) : 'undefined')
			console.log('DIAN completo:', docs.dian)
			console.log('SIESA completo:', docs.siesa)
			setDocumentos(docs)
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
		setSelectedResultado(null)
		setDocumentos(null)
		setErrorDocumentos(null)
		setShowJsonDian(false)
		setShowJsonSiesa(false)
	}

	// Formatear fecha
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

	// Formatear JSON
	const formatJSON = (obj: any) => {
		try {
			return JSON.stringify(obj, null, 2)
		} catch {
			return String(obj)
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

				{/* Tabla de resultados */}
				<Paper sx={{ width: '100%', overflow: 'hidden' }}>
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
									<TableCell>Tipo Resultado</TableCell>
									<TableCell>NIT Proveedor</TableCell>
									<TableCell>Número Factura</TableCell>
									<TableCell align="right">Valor DIAN</TableCell>
									<TableCell align="right">Valor SIESA</TableCell>
									<TableCell align="right">Diferencia</TableCell>
									<TableCell>Observación</TableCell>
									<TableCell>Ejecución ID</TableCell>
									<TableCell>Fecha Creación</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={11} align="center">
											<CircularProgress />
										</TableCell>
									</TableRow>
								) : resultados.length === 0 ? (
									<TableRow>
										<TableCell colSpan={11} align="center">
											No hay resultados disponibles
										</TableCell>
									</TableRow>
								) : (
									resultados.map((resultado) => (
										<TableRow key={resultado.id} hover>
											<TableCell>{resultado.id}</TableCell>
											<TableCell>{resultado.tipo_resultado}</TableCell>
											<TableCell>{resultado.nit_proveedor}</TableCell>
											<TableCell>{resultado.num_factura}</TableCell>
											<TableCell align="right">
												{resultado.valor_dian?.toLocaleString('es-ES', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</TableCell>
											<TableCell align="right">
												{resultado.valor_siesa?.toLocaleString('es-ES', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</TableCell>
											<TableCell align="right">
												{resultado.diferencia?.toLocaleString('es-ES', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</TableCell>
											<TableCell>{resultado.observacion || '-'}</TableCell>
											<TableCell>{resultado.ejecucion_id}</TableCell>
											<TableCell>{formatDate(resultado.createdAt)}</TableCell>
											<TableCell align="center">
												<IconButton
													size="small"
													color="primary"
													onClick={() => handleOpenModal(resultado)}
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

					{/* Paginación */}
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={handleChangePage}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={handleChangeRowsPerPage}
						rowsPerPageOptions={[5, 10, 25, 50, 100]}
						labelRowsPerPage="Filas por página:"
						labelDisplayedRows={({ from, to, count }) =>
							`${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
						}
					/>
				</Paper>

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
						{selectedResultado && (
							<Typography variant="body2" sx={{ marginTop: 1, opacity: 0.9 }}>
								NIT: {selectedResultado.nit_proveedor} | Factura:{' '}
								{selectedResultado.num_factura}
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
														// Excluir solo estos campos específicos, pero mostrar todos los demás
														const excludeKeys = ['payload_original', 'id', 'fuente', 'FUENTE', 'ejecucion', 'ejecucion_id', 'ejecución', 'ejecución_id']
														return !excludeKeys.includes(key)
													})
													.map(([key, value]) => {
														// No mostrar valores null, undefined o vacíos
														if (value === null || value === undefined || value === '') {
															return null
														}
														// Si es un objeto, mostrar como JSON en un campo especial
														if (typeof value === 'object' && !Array.isArray(value)) {
															return (
																<Box key={key} sx={{ marginBottom: 1.5 }}>
																	<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
															<Box key={key}>
																{renderCampo(key, value)}
															</Box>
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
														// Excluir solo estos campos específicos, pero mostrar todos los demás
														const excludeKeys = ['payload_original', 'id', 'fuente', 'FUENTE', 'ejecucion', 'ejecucion_id', 'ejecución', 'ejecución_id']
														return !excludeKeys.includes(key)
													})
													.map(([key, value]) => {
														// No mostrar valores null, undefined o vacíos
														if (value === null || value === undefined || value === '') {
															return null
														}
														// Si es un objeto, mostrar como JSON en un campo especial
														if (typeof value === 'object' && !Array.isArray(value)) {
															return (
																<Box key={key} sx={{ marginBottom: 1.5 }}>
																	<Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
															<Box key={key}>
																{renderCampo(key, value)}
															</Box>
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

				{/* Backdrop para loading general */}
				<Backdrop
					sx={{
						color: '#fff',
						zIndex: (theme) => theme.zIndex.drawer + 1,
					}}
					open={loading && resultados.length === 0}
				>
					<CircularProgress color="inherit" />
				</Backdrop>
			</Container>
			<MegaFooter />
		</>
	)
}
