"use client";
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Encabezado from "@/app/global-components/encabezado";
import MegaFooter from "@/app/global-components/footer";
import FormTextField from "@/app/global-components/formTextField";
import ModalMessage from "@/app/global-components/ModalMessage";
import {
  Container,
  Box,
  Typography,
  Grid2,
  Paper,
  CircularProgress,
  Button,
  Backdrop,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PermDataSettingIcon from '@mui/icons-material/PermDataSetting';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CommitIcon from '@mui/icons-material/Commit';
import {
	login,
	saveToken,
	isAuthenticated,
	decodeToken,
	validateAndCleanToken,
	getToken,
	getUserNombre,
} from '@/app/api/auth'


export default function LandingFlow() {
	const [isLoggedIn, setIsLoggedIn] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [modalError, setModalError] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')

	const handleTogglePasswordVisibility = () => {
		setShowPassword((prev) => !prev)
	}

	// Verificar autenticación al cargar
	useEffect(() => {
		const checkAuth = () => {
			setIsLoading(true)
			const authenticated = isAuthenticated()
			if (authenticated) {
				setIsLoggedIn(true)
			}
			setIsLoading(false)
		}
		
		// Validar y limpiar token antes de verificar
		validateAndCleanToken()
		checkAuth()
	}, [])

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault()
		setModalError(false)
		setErrorMessage('')
		setIsSubmitting(true)

		try {
			if (!email || !password) {
				setErrorMessage('Por favor ingrese email y contraseña')
				setModalError(true)
				setIsSubmitting(false)
				return
			}

			const token = await login({ email, password })
			saveToken(token)
			const decoded = decodeToken(token)

			// Esperar un momento para asegurar que el evento se haya disparado
			await new Promise(resolve => setTimeout(resolve, 100))

			setIsLoggedIn(true)
			setEmail('')
			setPassword('')
			
			// Forzar actualización del Encabezado disparando evento nuevamente
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('authChange', { 
					detail: { authenticated: true, nombre: decoded.nombre, rol: decoded.rol } 
				}))
			}
		} catch (err) {
			const message = err instanceof Error 
				? err.message 
				: 'Email o contraseña incorrecto'
			setErrorMessage(message === 'Error al realizar el login' 
				? 'Email o contraseña incorrecto' 
				: message)
			setModalError(true)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCloseModalError = () => {
		setModalError(false)
		setErrorMessage('')
	}

	const ActList = [
    {
      key: "configuracion",
      href: "/form-configuracion",
      icon: PermDataSettingIcon,
      title: "Configuración",
      desc_corta: "¿Va a realizar configuración de conciliación?",
      desc_larga: "Gestione aquí todos los configuración relacionados"

    },
    {
      key: "ejecucion",
      href: "/form-ejecucion",
      icon: CommitIcon,
      title: "Ejecución",
      desc_corta: "¿Necesita ejecutar manualmente?",
      desc_larga: "Inicie aquí la ejecución manual de la gestión de documentos"

    },
    {
      key: "descargar_reportes",
      href: "/form-descarga",
      icon: CloudDownloadIcon,
      title: "Descarga",
      desc_corta: "¿Necesita descargar reportes?",
      desc_larga: "Descargue aquí los reportes de gestión de documentos"

    },
  ];

	if (isLoading) {
		return (
			<Box
				sx={{
					minHeight: '100vh',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<CircularProgress />
			</Box>
		)
	}

	if (!isLoggedIn) {
		return (
			<Box
				sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
			>
				<Encabezado formTitulo=' Conciliación de documentos electrónicos DIAN vs SIESA' />
				<Container
					sx={{
						marginBottom: 4,
						paddingBottom: '100px',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						flex: 1,
					}}
				>
					<Grid2 container spacing={2} justifyContent="center">
						<Grid2 size={{ xs: 12, sm: 8, md: 6, lg: 5, xl: 6 }}>
							<Paper
								elevation={3}
								sx={{
									padding: 4,
									borderRadius: 2,
								}}
							>
								<Typography
									variant="h4"
									sx={{
										textAlign: 'center',
										marginBottom: 3,
										fontWeight: 'normal',
										color: '#004084',
										whiteSpace: 'nowrap',
									}}
								>
									Iniciar Sesión
								</Typography>

								<form onSubmit={handleLogin}>
									<Grid2 container spacing={3}>
										<Grid2 size={{ xs: 12 }}>
											<FormTextField
												key="email"
												label="Email"
												name="email"
												type="email"
												value={email}
												onchange={(e) => setEmail(e.target.value)}
												error={false}
											/>
										</Grid2>

										<Grid2 size={{ xs: 12 }}>
											<Box>
												<TextField
													variant="filled"
													label="Contraseña"
													fullWidth
													name="password"
													type={showPassword ? 'text' : 'password'}
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													error={false}
													InputProps={{
														endAdornment: (
															<InputAdornment position="end">
																<IconButton
																	aria-label="toggle password visibility"
																	onClick={handleTogglePasswordVisibility}
																	edge="end"
																>
																	{showPassword ? <VisibilityOff /> : <Visibility />}
																</IconButton>
															</InputAdornment>
														),
													}}
													sx={{
														"& .MuiFilledInput-root": {
															backgroundColor: "#ffffff00 !important",
															borderRadius: "0px",
														},
														"& .MuiInputLabel-root": {
															color: "gray",
														},
														"& .MuiFilledInput-root:hover": {
															backgroundColor: "green",
														},
														"& .MuiFilledInput-root.Mui-focused": {
															backgroundColor: "#F5FAFF !important",
														},
														"& internal-autofill-selected": {
															backgroundColor: "hotpink !important",
														}
													}}
												/>
											</Box>
										</Grid2>

										<Grid2 size={{ xs: 12 }}>
											<Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
												<Button
													sx={{
														backgroundColor: '#004084',
														borderRadius: '8px',
														paddingX: 3,
														paddingY: 1.5,
													}}
													className="submit-button"
													type="submit"
													variant="contained"
													onClick={(e) => {
														e.preventDefault()
														handleLogin(e)
													}}
													endIcon={<SendIcon />}
													disabled={isSubmitting || !email || !password}
												>
													Login
												</Button>
											</Box>
										</Grid2>
									</Grid2>
								</form>
							</Paper>
						</Grid2>
					</Grid2>
				</Container>
				<MegaFooter />

				<Backdrop
					sx={{
						color: '#fff',
						zIndex: (theme) => theme.zIndex.drawer + 1,
					}}
					open={isSubmitting}
				>
					<CircularProgress color="inherit" />
				</Backdrop>

				<ModalMessage
					open={modalError}
					onClose={handleCloseModalError}
					tipo="error"
					titulo="Error de autenticación"
					mensajeDestacado={errorMessage || 'Email o contraseña incorrecto'}
					textoBotonPrincipal="Aceptar"
					onPrimaryButtonClick={handleCloseModalError}
				/>
			</Box>
		)
	}

	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<Encabezado formTitulo=' Conciliación de documentos electrónicos DIAN vs SIESA' />
			<Container
				sx={{
					marginBottom: 4,
					paddingBottom: '100px'
				}}>


				<Grid2 container spacing={2} sx={{ marginBottom: '1em', marginTop: '2em' }}>
					<Grid2 size={{ xs: 12}}>
						<Typography sx={{ textAlign: 'center', fontWeight: '400', fontSize: '1.50rem' }} variant="subtitle1">Por favor elija una opción:</Typography>
					</Grid2>
				</Grid2>

				<Grid2 container spacing={2} sx={{ marginBottom: '1em', justifyContent: 'center', height: '30em', alignItems: 'center' }}>

					{
						ActList.map(Act_item => <Grid2 key={Act_item.key} size={{ xs: 12, md: 4 }}>
							<Link 
								href={Act_item.href}
								className='card-link'
								style={{
									padding: '1rem',
									gap: '.5rem',
									textDecoration: 'none',
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
									<Act_item.icon />
								</Box>

								<div
									dangerouslySetInnerHTML={{ __html: Act_item.title }}
									style={{
										fontWeight: '700',
										textAlign: 'center',
										textTransform: 'uppercase',
										lineHeight: 'normal',
										color: '#555555',
										fontFamily: "Roboto, Helvetica, Arial, sans-serif"
									}}
								></div>

								<div>
									<div
										style={{
											textAlign: 'center',
											lineHeight: 'normal',
											color: '#9C9C9C',
											fontWeight: '600',
											fontFamily: "Roboto, Helvetica, Arial, sans-serif"
										}}
									>{Act_item.desc_corta}</div>
									
									<div
										style={{
											textAlign: 'center',
											lineHeight: 'normal',
											color: '#9C9C9C',
											fontFamily: "Roboto, Helvetica, Arial, sans-serif"
										}}
									>{Act_item.desc_larga}</div>
								</div>
							</Link>
						</Grid2>)
					}
				</Grid2>
			</Container>
			<MegaFooter />
		</Box>
	);
}