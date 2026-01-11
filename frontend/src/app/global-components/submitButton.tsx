import React from 'react';
import SendIcon from '@mui/icons-material/Send';
import { Button, Grid2, Tooltip } from '@mui/material';

interface SubmitButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

export default function SubmitButton({ onClick, disabled }: SubmitButtonProps) {
  // Contenido del botón
  const buttonContent = (
    <Button
      sx={{
        backgroundColor: '#004084',
        borderRadius: '8px',
        width: { xs: '100%', md: '100%' },
        maxWidth: { md: '100%' },
      }}
      className="submit-button"
      type="submit"
      variant="contained"
      onClick={onClick}
      endIcon={<SendIcon />}
      disabled={disabled}
    >
      Enviar
    </Button>
  );

  return (
    <Grid2 size={{ xs: 12, md: 2 }}
      style={{
        float: 'right',
      }}
      className="container-button-submit"
      justifyContent="flex-end"
    >
      {disabled ? (
        <Tooltip
          placement="top"
          title="Complete los campos requeridos"
          arrow
        >
          <span>{buttonContent}</span>
        </Tooltip>
      ) : (
        buttonContent
      )}
    </Grid2>
  );
}