"use client";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@mui/material";
import { themeApp } from "@/utils/theme";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useEffect } from "react";
import { validateAndCleanToken } from "./api/auth";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Validar y limpiar tokens inválidos al cargar la aplicación
    validateAndCleanToken()
  }, [])

  return (
    <html lang="en">
      <meta name="viewport" content="initial-scale=1, width=device-width" />
      <head>
        <title>12DForms</title>
      </head>

      <body >
        <ThemeProvider theme={themeApp}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {children}
          </LocalizationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
