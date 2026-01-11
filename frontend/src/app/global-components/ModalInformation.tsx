import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import Grid2 from '@mui/material/Grid2';

interface ModalProps {
  open: boolean;
  onClose: (e: any) => void;
  titulo: string;
  information?: React.ReactNode;
  textoBotonPrincipal?: string;
  textoBotonSecundario?: string;
  onPrimaryButtonClick?: (e: any) => void;
}


const ModalInformation: React.FC<ModalProps> = ({
  open,
  onClose,
  titulo,
  information,
  textoBotonPrincipal = "Aceptar",
  textoBotonSecundario,
  onPrimaryButtonClick,
}) => {
  return (
    <Grid2>
      <Dialog
        sx={{
          height: "90%",
          "& .MuiPaper-root": {
            width: "100%",
            borderRadius: "8px",
            overflowY: "hidden",
          },
          "& .MuiDialogContent-root": {
            paddingBottom: "0",
          },
          "& .MuiDialog-paper": {
            maxWidth: {
              xs: "100%",
              md: "65%",
            },
          },
        }}
        className="modal-mensaje"
        open={open}
        onClose={onClose}
      >
        <DialogTitle
          style={{
            backgroundColor: "#004084",
            color: "#fff",
            textAlign: "center",
            fontWeight: "400",
          }}
        >
          {titulo}
        </DialogTitle>

        <DialogContent
          sx={{
            marginTop: '2em',
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            gap: ".5em",
          }}>
          {information}
        </DialogContent>

        <DialogActions
          style={{
            padding: "2em 0",
            justifyContent: "center",
            gap: "2em",
          }}
        >
          {textoBotonSecundario && (
            <Button
              className="modal-secundary-button"
              style={{
                color: "#004084",
                border: "2px solid #004084",
              }}
              onClick={onClose}
              color="primary"
              variant="outlined"
              type="button"
            >
              {textoBotonSecundario}
            </Button>
          )}

          <Button
            className="modal-primary-button"
            style={{
              backgroundColor: "#004084",
            }}
            onClick={onPrimaryButtonClick || onClose} // Usa onPrimaryButtonClick si está definido
            color="primary"
            variant="contained"
            type="button"
          >
            {textoBotonPrincipal}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid2>

  );
};

export default ModalInformation;