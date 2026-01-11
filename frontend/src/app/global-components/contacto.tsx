import React from "react";
import { Typography } from '@mui/material';
import Grid2 from '@mui/material/Grid2';

const Contacto = () => {
    return (
            <Grid2 sx={{ color: 'rgba(0, 0, 0, 0.6);' }}
            >
                <Typography variant="body2">
                    En caso de presentar algún problema en la inscripción o validación de datos en el presente formulario, Puede comúnicarse a las siguientes líneas de atención:
                </Typography>

                <Grid2 component="ul" sx={{ pl: 4 }}>
                    <Typography component="li">
                        <b>WhatsApp Soporte: </b>310 7020001
                    </Typography>
                    <Typography component="li">
                        <b>Correo Soporte: </b>soporte@megatiendas.co
                    </Typography>
                </Grid2>
            </Grid2>
    )
}
export default Contacto;