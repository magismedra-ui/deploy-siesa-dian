import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import {
  CheckCircleOutline,
  Error,
  ErrorOutline,
  Info,
} from "@mui/icons-material";
import { div } from "framer-motion/client";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  tipo: "success" | "error" | "warning" | "info";
  titulo: string;
  mensajeDestacado: string;
  mensajeSecundario?: React.ReactNode;
  form?: React.ReactNode;
  textoBotonPrincipal?: string;
  textoBotonSecundario?: string;
  onPrimaryButtonClick?: () => void;
  disableBackdropClose?: boolean;
  escapeKeyDown?: boolean;
}

const iconos = {
  success: (
    <CheckCircleOutline style={{ color: "#72E128", fontSize: "3.5em" }} />
  ),
  error: <Error style={{ color: "#FF0000", fontSize: "3.5em" }} />,
  warning: <ErrorOutline style={{ color: "#FFD630", fontSize: "3.5em" }} />,
  info: <Info style={{ color: "#004084", fontSize: "3.5em" }} />,
};

const ModalMessage: React.FC<ModalProps> = ({
  open,
  onClose,
  tipo,
  titulo,
  mensajeDestacado,
  mensajeSecundario,
  form,
  textoBotonPrincipal,
  textoBotonSecundario,
  onPrimaryButtonClick,
  disableBackdropClose,
  escapeKeyDown,
}) => {
  return (
    <Dialog
      sx={{
        "& .MuiPaper-root": {
          width: "100%",
          borderRadius: "8px",
          overflowY: "hidden",
        },
        "& .MuiDialogContent-root": { overflowY: "hidden", paddingBottom: "0" },
      }}
      className="modal-mensaje"
      open={open}
      onClose={(event, reason) => {
        if (disableBackdropClose && reason === "backdropClick") return;
        if (escapeKeyDown && reason === "escapeKeyDown") return;
        onClose();
      }}
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

      <DialogContent>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            padding: "2em 2em 0",
            gap: ".5em",
            textAlign: "center",
          }}
        >
          <div>{iconos[tipo]}</div>{" "}
          <Typography variant="h6">{mensajeDestacado}</Typography>
          {mensajeSecundario && (
            <Typography variant="body1" color="textSecondary">
              {mensajeSecundario}
            </Typography>
          )}
          {form && <>{form}</>}
        </div>
      </DialogContent>

      {(textoBotonSecundario || textoBotonPrincipal) && (
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
            >
              {textoBotonSecundario}
            </Button>
          )}
          {textoBotonPrincipal && (
            <Button
              className="modal-primary-button"
              style={{
                backgroundColor: "#004084",
              }}
              onClick={() => {
                if (onPrimaryButtonClick) {
                  onPrimaryButtonClick();
                } else {
                  onClose();
                }
              }}
              color="primary"
              variant="contained"
            >
              {textoBotonPrincipal}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default ModalMessage;
