"use client"
import React, { useState, useEffect } from "react";
import "@/app/global-styles/mega-style.css";
import logo from "@/app/imagenes/logo.png";
import { Box, Container, Typography, Button } from "@mui/material";
import Grid2 from '@mui/material/Grid2';
import Image from "next/image";
import LogoutIcon from '@mui/icons-material/Logout';
import { isAuthenticated, clearAuthData, getUserNombre } from "@/app/api/auth";

const Encabezado = ({ formTitulo = '', ruta= '' }) => {
    const [fechaActual, setFechaActual] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [userNombre, setUserNombre] = useState<string | null>(null);

    useEffect(() => {
        const fecha = new Date();
        const opciones: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
        const fechaCapitalizada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        setFechaActual(fechaCapitalizada);
        
        // Función para actualizar estado de autenticación
        const checkAuth = () => {
            const isAuth = isAuthenticated();
            const nombre = getUserNombre();
            console.log('Encabezado - Verificando autenticación:', { 
                isAuth, 
                nombre,
                token: localStorage.getItem('auth_token') ? 'existe' : 'no existe',
                userNombre: localStorage.getItem('user_nombre')
            });
            setAuthenticated(isAuth);
            setUserNombre(nombre);
        };
        
        // Verificar autenticación al montar
        checkAuth();
        
        // Verificar periódicamente (cada 300ms durante los primeros 15 segundos)
        // Esto asegura que se capture el cambio de estado después del login
        let intervalCount = 0
        const maxIntervals = 50 // 50 * 300ms = 15 segundos
        const intervalId = setInterval(() => {
            intervalCount++
            checkAuth()
            if (intervalCount >= maxIntervals) {
                clearInterval(intervalId)
            }
        }, 300)
        
        // Escuchar evento personalizado de cambio de autenticación
        const handleAuthChange = (event: Event) => {
            const customEvent = event as CustomEvent
            console.log('Encabezado - Evento authChange recibido', {
                detail: customEvent.detail,
                timestamp: new Date().toISOString()
            })
            // Verificar inmediatamente después de un pequeño delay para asegurar que localStorage se actualizó
            setTimeout(() => {
                checkAuth()
            }, 100)
        }
        window.addEventListener('authChange', handleAuthChange)
        
        // Escuchar cambios en localStorage (para cambios desde otras pestañas)
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'auth_token' || event.key === 'user_nombre' || event.key === 'user_rol') {
                console.log('Encabezado - Cambio en localStorage detectado (otra pestaña)', {
                    key: event.key
                })
                setTimeout(() => {
                    checkAuth()
                }, 100)
            }
        }
        window.addEventListener('storage', handleStorageChange)
        
        return () => {
            clearInterval(intervalId)
            window.removeEventListener('authChange', handleAuthChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const handleLogout = () => {
        clearAuthData();
        // Forzar recarga completa de la página para que se actualice el estado de autenticación
        window.location.href = '/';
    };


    return (
        <div className="encabezado">
            <p id="fecha-solicitud">{fechaActual}</p>
            <Container
                sx={{ width: '70%' }}
                className="no-padding">
                <Grid2 container style={{ alignItems: 'center' }}>
                    <Grid2 size={{ md: 3, xs: 12 }} className="mega-logo" >
                        <Box
                            sx={{
                                textAlign: 'center',
                            }}>
                            <a href={ruta ? ruta : '/'}>
                                <Image src={logo} alt="Logo" width={170} />
                            </a>

                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 6 }} className="titulo-formulario">
                        <Typography
                            className="color-primary"
                            variant="h3"
                            sx={{
                                textAlign: 'center',
                                fontWeight: 100,
                                fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`,
                            }}>
                            {formTitulo}
                        </Typography>

                    </Grid2>
                    <Grid2 size={{ xs: 12, md: 3 }} className="mega-logo">
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: { xs: 'center', md: 'flex-end' },
                            justifyContent: 'center',
                            gap: 1,
                            minHeight: { xs: 'auto', md: '80px' },
                            width: '100%',
                        }}>
                            {authenticated && (
                                <>
                                    {userNombre && (
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: '#004084', 
                                                fontWeight: 500,
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            {userNombre}
                                        </Typography>
                                    )}
                                    <Button
                                        variant="outlined"
                                        startIcon={<LogoutIcon />}
                                        onClick={handleLogout}
                                        size="small"
                                        sx={{
                                            borderColor: '#004084',
                                            color: '#004084',
                                            textTransform: 'none',
                                            fontSize: '0.875rem',
                                            padding: '6px 16px',
                                            whiteSpace: 'nowrap',
                                            zIndex: 10,
                                            '&:hover': {
                                                borderColor: '#003366',
                                                backgroundColor: '#f5f5f5',
                                            },
                                        }}
                                    >
                                        Cerrar Sesión
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Grid2>
                </Grid2>
            </Container>
        </div>
    );
};

export default Encabezado;
