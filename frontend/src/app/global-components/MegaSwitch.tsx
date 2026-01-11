import React from 'react';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { SxProps, Theme } from '@mui/material/styles';
import { Box, Typography} from '@mui/material';

interface MegaSwitchProps {
    labelPpal: string;
    label?: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    color?: 'primary' | 'secondary' | 'default';
    sx?: SxProps<Theme>;
}

const MegaSwitch: React.FC<MegaSwitchProps> = ({
    labelPpal,
    label,
    checked,
    onChange,
    color = 'primary',
    sx = {},
}) => {
    return (
        <Box
            className='d-flex'
            style={{ flexDirection: "column", alignItems: "center" }}
            sx={sx}>
            <label
                className='mega-label'>
                {labelPpal}
            </label>
            <FormControlLabel
                control={
                    <Switch
                        checked={checked}
                        onChange={onChange}
                        color={color}
                    />
                }
                label={label}
            />
        </Box>

    );
};

export default MegaSwitch;
