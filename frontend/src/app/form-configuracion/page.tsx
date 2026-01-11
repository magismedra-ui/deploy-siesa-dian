"use client"
import { useState, useEffect } from 'react'
import {
  Container,
  Box,
	Typography,
	Grid2,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Button,
	CircularProgress,
	Backdrop,
	IconButton,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import Encabezado from '../global-components/encabezado'
import MegaFooter from '../global-components/footer'
import BackButton from '../global-components/BackButton'
import FormTextField from '../global-components/formTextField'
import ModalInformation from '../global-components/ModalInformation'
import ModalMessage from '../global-components/ModalMessage'
import {
	getParametros,
	createParametro,
	updateParametro,
	getRoles,
	createRol,
	updateRol,
	deleteRol,
	getUsuarios,
	createUsuario,
	updateUsuario,
	deleteUsuario,
	type Parametro,
	type Rol,
	type Usuario,
} from '@/app/api/configuracion'

export default function ConfiguracionPage() {
	// Estados para datos
	const [parametros, setParametros] = useState<Parametro[]>([])
	const [roles, setRoles] = useState<Rol[]>([])
	const [usuarios, setUsuarios] = useState<Usuario[]>([])
	
	// Estados para loading
	const [loadingParametros, setLoadingParametros] = useState(false)
	const [loadingRoles, setLoadingRoles] = useState(false)
	const [loadingUsuarios, setLoadingUsuarios] = useState(false)
	const [saving, setSaving] = useState(false)
	
	// Estados para modales de parámetros
	const [modalParametroOpen, setModalParametroOpen] = useState(false)
	const [parametroEditando, setParametroEditando] = useState<Parametro | null>(null)
	const [formParametro, setFormParametro] = useState<Parametro>({
		clave: '',
		valor: '',
		tipo_dato: 'TEXTO',
		descripcion: '',
	})
	
	// Estados para modales de roles
	const [modalRolOpen, setModalRolOpen] = useState(false)
	const [rolEditando, setRolEditando] = useState<Rol | null>(null)
	const [formRol, setFormRol] = useState<Rol>({
		nombre: '',
		descripcion: '',
	})
	
	// Estados para modales de usuarios
	const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
	const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
	const [formUsuario, setFormUsuario] = useState<Usuario>({
		estado: 'ACTIVO',
		nombre_completo: '',
		email: '',
		rol_id: 1,
	})
	
	// Estados para mensajes
	const [modalMessage, setModalMessage] = useState(false)
	const [messageType, setMessageType] = useState<'success' | 'error'>('success')
	const [messageTitle, setMessageTitle] = useState('')
	const [messageText, setMessageText] = useState('')

	// Cargar datos al montar el componente
	useEffect(() => {
		cargarDatos()
	}, [])

	const cargarDatos = async () => {
		await Promise.all([cargarParametros(), cargarRoles(), cargarUsuarios()])
	}

	const cargarParametros = async () => {
		setLoadingParametros(true)
		try {
			const data = await getParametros()
			setParametros(data)
		} catch (error) {
			mostrarMensaje('error', 'Error', 'No se pudieron cargar los parámetros')
		} finally {
			setLoadingParametros(false)
		}
	}

	const cargarRoles = async () => {
		setLoadingRoles(true)
		try {
			const data = await getRoles()
			setRoles(data)
		} catch (error) {
			mostrarMensaje('error', 'Error', 'No se pudieron cargar los roles')
		} finally {
			setLoadingRoles(false)
		}
	}

	const cargarUsuarios = async () => {
		setLoadingUsuarios(true)
		try {
			const data = await getUsuarios()
			setUsuarios(data)
		} catch (error) {
			mostrarMensaje('error', 'Error', 'No se pudieron cargar los usuarios')
		} finally {
			setLoadingUsuarios(false)
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

	// ==================== PARAMETROS ====================

	const abrirModalCrearParametro = () => {
		setParametroEditando(null)
		setFormParametro({
			clave: '',
			valor: '',
			tipo_dato: 'TEXTO',
			descripcion: '',
		})
		setModalParametroOpen(true)
	}

	const abrirModalEditarParametro = (parametro: Parametro) => {
		setParametroEditando(parametro)
		setFormParametro({ ...parametro })
		setModalParametroOpen(true)
	}

	const cerrarModalParametro = () => {
		setModalParametroOpen(false)
		setParametroEditando(null)
	}

	const guardarParametro = async () => {
		setSaving(true)
		try {
			if (parametroEditando?.id) {
				await updateParametro(parametroEditando.id, formParametro)
				mostrarMensaje('success', 'Éxito', 'Parámetro actualizado correctamente')
    } else {
				await createParametro(formParametro)
				mostrarMensaje('success', 'Éxito', 'Parámetro creado correctamente')
			}
			cerrarModalParametro()
			await cargarParametros()
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error
					? error.message
					: 'Error al guardar el parámetro'
			)
		} finally {
			setSaving(false)
		}
	}

	// ==================== ROLES ====================

	const abrirModalCrearRol = () => {
		setRolEditando(null)
		setFormRol({
			nombre: '',
			descripcion: '',
		})
		setModalRolOpen(true)
	}

	const abrirModalEditarRol = (rol: Rol) => {
		setRolEditando(rol)
		setFormRol({ ...rol })
		setModalRolOpen(true)
	}

	const cerrarModalRol = () => {
		setModalRolOpen(false)
		setRolEditando(null)
	}

	const guardarRol = async () => {
		setSaving(true)
		try {
			if (rolEditando?.id) {
				await updateRol(rolEditando.id, formRol)
				mostrarMensaje('success', 'Éxito', 'Rol actualizado correctamente')
			} else {
				await createRol(formRol)
				mostrarMensaje('success', 'Éxito', 'Rol creado correctamente')
			}
			cerrarModalRol()
			await cargarRoles()
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al guardar el rol'
			)
		} finally {
			setSaving(false)
		}
	}

	const eliminarRol = async (id: number) => {
		if (!confirm('¿Está seguro de eliminar este rol?')) return

		setSaving(true)
		try {
			await deleteRol(id)
			mostrarMensaje('success', 'Éxito', 'Rol eliminado correctamente')
			await cargarRoles()
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al eliminar el rol'
			)
		} finally {
			setSaving(false)
		}
	}

	// ==================== USUARIOS ====================

	const abrirModalCrearUsuario = () => {
		setUsuarioEditando(null)
		setFormUsuario({
			estado: 'ACTIVO',
			nombre_completo: '',
			email: '',
			rol_id: roles[0]?.id || 1,
		})
		setModalUsuarioOpen(true)
	}

	const abrirModalEditarUsuario = (usuario: Usuario) => {
		setUsuarioEditando(usuario)
		setFormUsuario({ ...usuario })
		setModalUsuarioOpen(true)
	}

	const cerrarModalUsuario = () => {
		setModalUsuarioOpen(false)
		setUsuarioEditando(null)
	}

	const guardarUsuario = async () => {
		setSaving(true)
		try {
			if (usuarioEditando?.id) {
				await updateUsuario(usuarioEditando.id, formUsuario)
				mostrarMensaje('success', 'Éxito', 'Usuario actualizado correctamente')
			} else {
				await createUsuario(formUsuario)
				mostrarMensaje('success', 'Éxito', 'Usuario creado correctamente')
			}
			cerrarModalUsuario()
			await cargarUsuarios()
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al guardar el usuario'
			)
		} finally {
			setSaving(false)
		}
	}

	const eliminarUsuario = async (id: number) => {
		if (!confirm('¿Está seguro de eliminar este usuario?')) return

		setSaving(true)
		try {
			await deleteUsuario(id)
			mostrarMensaje('success', 'Éxito', 'Usuario eliminado correctamente')
			await cargarUsuarios()
		} catch (error) {
			mostrarMensaje(
				'error',
				'Error',
				error instanceof Error ? error.message : 'Error al eliminar el usuario'
			)
		} finally {
			setSaving(false)
		}
	}

	return (
		<Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<Encabezado formTitulo="Configuración del sistema" />
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

				{/* SECCIÓN PARÁMETROS */}
				<Paper sx={{ padding: 3, marginBottom: 4 }}>
					<Box
                          sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 2,
						}}
					>
						<Typography variant="h5">Parámetros</Typography>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={abrirModalCrearParametro}
							sx={{ backgroundColor: '#004084' }}
						>
							Crear
						</Button>
					</Box>

					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Clave</TableCell>
									<TableCell>Valor</TableCell>
									<TableCell>Tipo Dato</TableCell>
									<TableCell>Descripción</TableCell>
									<TableCell>Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingParametros ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<CircularProgress />
										</TableCell>
									</TableRow>
								) : parametros.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											No hay parámetros registrados
										</TableCell>
									</TableRow>
								) : (
									parametros.map((parametro) => (
										<TableRow key={parametro.id}>
											<TableCell>{parametro.id}</TableCell>
											<TableCell>{parametro.clave}</TableCell>
											<TableCell>{parametro.valor}</TableCell>
											<TableCell>{parametro.tipo_dato}</TableCell>
											<TableCell>{parametro.descripcion}</TableCell>
											<TableCell>
												<IconButton
                              color="primary"
													onClick={() => abrirModalEditarParametro(parametro)}
												>
													<EditIcon />
												</IconButton>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>

				{/* SECCIÓN ROLES */}
				<Paper sx={{ padding: 3, marginBottom: 4 }}>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 2,
						}}
					>
						<Typography variant="h5">Roles</Typography>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={abrirModalCrearRol}
							sx={{ backgroundColor: '#004084' }}
						>
							Crear
						</Button>
					</Box>

					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Nombre</TableCell>
									<TableCell>Descripción</TableCell>
									<TableCell>Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingRoles ? (
									<TableRow>
										<TableCell colSpan={4} align="center">
											<CircularProgress />
										</TableCell>
									</TableRow>
								) : roles.length === 0 ? (
									<TableRow>
										<TableCell colSpan={4} align="center">
											No hay roles registrados
										</TableCell>
									</TableRow>
								) : (
									roles.map((rol) => (
										<TableRow key={rol.id}>
											<TableCell>{rol.id}</TableCell>
											<TableCell>{rol.nombre}</TableCell>
											<TableCell>{rol.descripcion}</TableCell>
											<TableCell>
												<IconButton
													color="primary"
													onClick={() => abrirModalEditarRol(rol)}
												>
													<EditIcon />
												</IconButton>
												<IconButton
													color="error"
													onClick={() => eliminarRol(rol.id!)}
												>
													<DeleteIcon />
												</IconButton>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>

				{/* SECCIÓN USUARIOS */}
				<Paper sx={{ padding: 3, marginBottom: 4 }}>
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: 2,
						}}
					>
						<Typography variant="h5">Usuarios</Typography>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={abrirModalCrearUsuario}
							sx={{ backgroundColor: '#004084' }}
						>
							Crear
						</Button>
					</Box>

					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell>Nombre Completo</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Rol ID</TableCell>
									<TableCell>Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingUsuarios ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<CircularProgress />
										</TableCell>
									</TableRow>
								) : usuarios.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											No hay usuarios registrados
										</TableCell>
									</TableRow>
								) : (
									usuarios.map((usuario) => (
										<TableRow key={usuario.id}>
											<TableCell>{usuario.id}</TableCell>
											<TableCell>{usuario.estado}</TableCell>
											<TableCell>{usuario.nombre_completo}</TableCell>
											<TableCell>{usuario.email}</TableCell>
											<TableCell>{usuario.rol_id}</TableCell>
											<TableCell>
                        <IconButton
													color="primary"
													onClick={() => abrirModalEditarUsuario(usuario)}
												>
													<EditIcon />
                        </IconButton>
												<IconButton
													color="error"
													onClick={() => eliminarUsuario(usuario.id!)}
												>
													<DeleteIcon />
												</IconButton>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			</Container>
			<MegaFooter />

			{/* MODAL PARÁMETRO */}
			<ModalInformation
				open={modalParametroOpen}
				onClose={cerrarModalParametro}
				titulo={parametroEditando ? 'Editar Parámetro' : 'Crear Parámetro'}
				textoBotonPrincipal="Guardar"
				textoBotonSecundario="Cancelar"
				onPrimaryButtonClick={guardarParametro}
				information={
					<Grid2 container spacing={2} sx={{ width: '100%' }}>
						<Grid2 size={{ xs: 12 }}>
							<FormControl fullWidth>
								<InputLabel>Clave</InputLabel>
								<Select
									value={formParametro.clave}
									onChange={(e) =>
										setFormParametro({ ...formParametro, clave: e.target.value })
									}
									label="Clave"
								>
									<MenuItem value="TOLERANCIA_COP">TOLERANCIA_COP</MenuItem>
									<MenuItem value="REINTENTOS_MAX">REINTENTOS_MAX</MenuItem>
								</Select>
							</FormControl>
						</Grid2>
						<Grid2 size={{ xs: 12 }}>
                        <FormTextField
								key="valor"
								label="Valor"
								name="valor"
								type="text"
								value={formParametro.valor}
								onchange={(e) =>
									setFormParametro({ ...formParametro, valor: e.target.value })
								}
								error={false}
							/>
                  </Grid2>
						<Grid2 size={{ xs: 12 }}>
							<FormControl fullWidth>
								<InputLabel>Tipo Dato</InputLabel>
								<Select
									value={formParametro.tipo_dato}
									onChange={(e) =>
										setFormParametro({
											...formParametro,
											tipo_dato: e.target.value as 'NUMERICO' | 'TEXTO' | 'BOOLEANO',
										})
									}
									label="Tipo Dato"
								>
									<MenuItem value="NUMERICO">NUMERICO</MenuItem>
									<MenuItem value="TEXTO">TEXTO</MenuItem>
									<MenuItem value="BOOLEANO">BOOLEANO</MenuItem>
								</Select>
							</FormControl>
						</Grid2>
						<Grid2 size={{ xs: 12 }}>
                        <FormTextField
								key="descripcion"
								label="Descripción"
								name="descripcion"
								type="text"
								value={formParametro.descripcion}
								onchange={(e) =>
									setFormParametro({
										...formParametro,
										descripcion: e.target.value,
									})
								}
								error={false}
							/>
                  </Grid2>
                </Grid2>
				}
			/>

			{/* MODAL ROL */}
			<ModalInformation
				open={modalRolOpen}
				onClose={cerrarModalRol}
				titulo={rolEditando ? 'Editar Rol' : 'Crear Rol'}
				textoBotonPrincipal="Guardar"
				textoBotonSecundario="Cancelar"
				onPrimaryButtonClick={guardarRol}
				information={
					<Grid2 container spacing={2} sx={{ width: '100%' }}>
						<Grid2 size={{ xs: 12 }}>
                        <FormTextField
								key="nombre"
								label="Nombre"
								name="nombre"
								type="text"
								value={formRol.nombre}
								onchange={(e) =>
									setFormRol({ ...formRol, nombre: e.target.value })
								}
								error={false}
							/>
                  </Grid2>
						<Grid2 size={{ xs: 12 }}>
                      <FormTextField
								key="descripcion"
								label="Descripción"
								name="descripcion"
								type="text"
								value={formRol.descripcion}
								onchange={(e) =>
									setFormRol({ ...formRol, descripcion: e.target.value })
								}
								error={false}
                      />
                    </Grid2>
                </Grid2>
				}
			/>

			{/* MODAL USUARIO */}
			<ModalInformation
				open={modalUsuarioOpen}
				onClose={cerrarModalUsuario}
				titulo={usuarioEditando ? 'Editar Usuario' : 'Crear Usuario'}
				textoBotonPrincipal="Guardar"
				textoBotonSecundario="Cancelar"
				onPrimaryButtonClick={guardarUsuario}
				information={
					<Grid2 container spacing={2} sx={{ width: '100%' }}>
						<Grid2 size={{ xs: 12 }}>
							<FormControl fullWidth>
								<InputLabel>Estado</InputLabel>
								<Select
									value={formUsuario.estado}
									onChange={(e) =>
										setFormUsuario({
											...formUsuario,
											estado: e.target.value as 'ACTIVO' | 'INACTIVO',
										})
									}
									label="Estado"
								>
									<MenuItem value="ACTIVO">ACTIVO</MenuItem>
									<MenuItem value="INACTIVO">INACTIVO</MenuItem>
								</Select>
							</FormControl>
                    </Grid2>
						<Grid2 size={{ xs: 12 }}>
                      <FormTextField
								key="nombre_completo"
								label="Nombre Completo"
								name="nombre_completo"
								type="text"
								value={formUsuario.nombre_completo}
								onchange={(e) =>
									setFormUsuario({
										...formUsuario,
										nombre_completo: e.target.value,
									})
								}
								error={false}
                      />
                    </Grid2>
                  <Grid2 size={{ xs: 12 }}>
                      <FormTextField
								key="email"
								label="Email"
								name="email"
								type="email"
								value={formUsuario.email}
								onchange={(e) =>
									setFormUsuario({ ...formUsuario, email: e.target.value })
								}
								error={false}
                      />
                      </Grid2>
                  <Grid2 size={{ xs: 12 }}>
							<FormControl fullWidth>
								<InputLabel>Rol</InputLabel>
								<Select
									value={formUsuario.rol_id}
									onChange={(e) =>
										setFormUsuario({
											...formUsuario,
											rol_id: Number(e.target.value),
										})
									}
									label="Rol"
								>
									{roles.map((rol) => (
										<MenuItem key={rol.id} value={rol.id}>
											{rol.nombre}
										</MenuItem>
									))}
								</Select>
                  </FormControl>
                </Grid2>
                </Grid2>
				}
			/>

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
				open={saving}
			>
				<CircularProgress color="inherit" />
			</Backdrop>
    </Box>
	)
}
