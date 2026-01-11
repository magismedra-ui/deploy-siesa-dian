import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Backdrop } from '@mui/material';

const ProgressIndicator = ({
    value = 100,
    size = 75,
    thickness = 3,
    color = 'primary',
    label = "Cargando datos",
    open = false
}) => {
    return (
        <Backdrop open = {open} sx={{ zIndex:'10', display:'flex', flexDirection:'column', gap:'1em' }} >
            <CircularProgress
                variant="indeterminate"
                //{value !== undefined ? 'determinate' : 'indeterminate'}
                value={value} // Si value está definido, será un progreso determinado
                size={size}
                thickness={thickness}
            //               color={color}
            />
            <Typography
                variant="body2">
                {label}
            </Typography>
        </Backdrop>
    );
};

export default ProgressIndicator;