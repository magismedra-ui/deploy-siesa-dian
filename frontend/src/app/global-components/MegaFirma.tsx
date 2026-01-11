"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Box, Button, Typography, IconButton } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";

interface MegaFirmaProps {
  onSave: (dataUrl: string) => void;
}

const MegaFirma: React.FC<MegaFirmaProps> = ({ onSave }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string>("")
  const [isEmpty, setIsEmpty] = useState(true);

  const canvasWidth = "auto";
  const canvasHeight = "8em";

const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureData("");
    setIsEmpty(true);
    onSave("");
  };

const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL("image/png");
      setSignatureData(dataUrl); // Guardar la firma en el estado
      setIsEmpty(false);
      onSave(dataUrl); // Enviar al componente padre
    } else {
      setSignatureData("");
      setIsEmpty(true);
      onSave("");
    }
  };

useLayoutEffect(() => {
    const resizeCanvas = () => {
      if (sigCanvas.current) {
        const canvas = sigCanvas.current.getCanvas();
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.offsetWidth; // Ajustar al ancho del contenedor
          canvas.height = parent.offsetHeight; // Ajustar a la altura del contenedor
          // Restaurar la firma si existe
          if (signatureData) {
            const img = new Image();
            img.src = signatureData;
            img.onload = () => {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            };
          }
        }
      }
    };

    resizeCanvas(); // Ajustar al cargar

    // Escuchar eventos de redimensionamiento de la ventana
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [signatureData]);

  // Guardar la firma cada vez que el usuario termina de dibujar
  const handleEnd = () => {
    handleSave();
  };

  /*     // Re-activar canvas si se borra
        useEffect(() => {
            if (!isSaved && sigCanvas.current) {
                const canvas = sigCanvas.current.getCanvas();
                canvas.style.pointerEvents = "auto";
            }
        }, [isSaved]); */

  return (
    <Box>
      <Typography variant="subtitle1">Firme aquí:</Typography>
      <Box
        sx={{
          position: "relative",
          border: "1px solid #aaa",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          width: canvasWidth,
          height: "145px",
          overflow: "hidden",
          //mb: 2,
        }}
      >
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: "sigCanvas",
            style: {
              borderRadius: "8px",
              width: "100%",
              height: "145px",
              backgroundColor: "#ffffff",
              display: "block",
            },
          }}
          onEnd={handleSave}
        />

        {/* Botón Deshacer firma */}
        <Box position={"absolute"} top={"0"} right={"0"}>
          <IconButton
            onClick={clearSignature}
            sx={{
              backgroundColor: "#dbdbdb",
              color: "white",
              width: "1.5em",
              height: "1.5em",
              "&:hover": { backgroundColor: "darkgray" },
              borderRadius: "0 7px 0 7px",
            }}
          >
            <ReplayIcon fontSize="small" />
          </IconButton>
          {/*<Typography variant="caption">Deshacer firma</Typography>*/}
        </Box>
      </Box>
    </Box>
  );
};

export default MegaFirma;
