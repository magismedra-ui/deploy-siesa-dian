import React from "react";
import { Typography } from '@mui/material';
import Grid2 from '@mui/material/Grid2';

const Contacto = () => {
    return (
            <Grid2 sx={{ color: 'rgba(0, 0, 0, 0.6);' }}
            >
                <Typography variant="body2">
                    Coloque aqui el contacto de la empresa.
                </Typography>

                <Grid2 component="ul" sx={{ pl: 4 }}>
                    <Typography component="li">
                        <b>WhatsApp: </b>
                    </Typography>
                    <Typography component="li">
                        <b>Correo: </b>
                    </Typography>
                </Grid2>
            </Grid2>
    )
}
export default Contacto;