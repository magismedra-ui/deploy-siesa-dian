import React from "react";
import { useState } from "react";
import "@/app/global-styles/mega-style.css";
import { Container, Typography } from "@mui/material";
import Grid2 from '@mui/material/Grid2';
import EnlaceFooter from "@/app/global-components/enlacefooter";
import ModalInformation from "./ModalInformation";
import Politicas from "./politica-privacidad";
import Terminos from "./terminos-condiciones";
import Contacto from "./contacto";

const MegaFooter = () => {



    const [showModal, setShowModal] = useState(null);

    const handleOpenModal = (modalType: any) => {
        setShowModal(modalType);
    };
    const handleCloseModal = () => setShowModal(null);


    return (
        <>
            <footer className="footer d-flex">
                <Container>
                    <Grid2 container
                        sx={{
                            margin: '.5em 0'
                        }}>
                        <Grid2 size={{ xs: 12 }} >
                            <div style={{
                                display: 'flex',
                                textAlign: 'center',
                                color: '#fff',
                                gap: '1em',
                                justifyContent: 'center',
                                margin: '.15em'
                            }}>
                                <Typography sx={{
                                    fontWeight: '300',
                                    fontSize: '12px',
                                    color: '#a5a5a5'

                                }}>

                                    <EnlaceFooter
                                        onClick={() => handleOpenModal('politica')}
                                        texto="Política de privacidad"
                                    />
                                    <EnlaceFooter
                                        onClick={() => handleOpenModal('terminos')}
                                        texto="Términos y condiciones" />

                                    <EnlaceFooter
                                        onClick={() => handleOpenModal('contacto')}
                                        texto="Contacto" />
                                </Typography>

                                <Typography sx={{
                                    fontWeight: '300',
                                    fontSize: '12px'
                                }}>
                                    &copy; 2026 Soluciones 12D. Todos los derechos reservados.
                                </Typography>
                            </div>
                        </Grid2>

                    </Grid2>

                </Container>
            </footer>

            <ModalInformation
                titulo={
                    showModal === 'politica' ? 'Política de Privacidad' :
                        showModal === 'terminos' ? 'Términos y Condiciones' :
                            showModal === 'contacto' ? 'Contacto' : ''
                }
                information={
                    showModal === 'politica' ? <Politicas /> :
                        showModal === 'terminos' ? <Terminos /> :
                            showModal === 'contacto' ? <Contacto /> : null
                }
                open={Boolean(showModal)}
                onClose={handleCloseModal}
                textoBotonPrincipal="Aceptar"
                onPrimaryButtonClick={handleCloseModal}
            />
        </>

    )
}

export default MegaFooter;