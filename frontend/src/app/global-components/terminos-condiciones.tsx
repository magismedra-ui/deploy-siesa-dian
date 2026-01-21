import React from "react";
import { Typography } from '@mui/material';
import Grid2 from '@mui/material/Grid2';

const Terminos = () => {
    return (
        <Grid2 className="Grid2Terminos" sx={{ color: 'rgba(0, 0, 0, 0.6);' }}>
            <Typography variant="body1">
                <strong>1. TÉRMINOS Y CONDICIONES</strong>
            </Typography>
            <Typography variant="body2">
                Coloque aqui los terminos y condiciones de la empresa.
            </Typography>
        </Grid2>
    )
}
export default Terminos;