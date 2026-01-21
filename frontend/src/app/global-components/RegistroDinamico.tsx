import React, { useState, useEffect } from "react";
import {
  Grid2,
  Radio,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  FormHelperText,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FormTextField from "@/app/global-components/formTextField";
import { Typography, Divider, MenuItem } from "@mui/material";

type Campo = {
  name: string;
  label: string;
  type?: "text" | "select" | "radio";
  options?: { label: string; value: string }[];
  gridProps?: Record<string, any>;
  mostrar?: (formData: any) => boolean;
};

type Props<T> = {
  campos: Campo[];
  nombreCampoFormik: string;
  formikInstance: any;
  crearRegistro: (formData: T) => T;
  validar: (formData: T) => Partial<T>;
  tituloRegistro?: string;
  maxRegistros?: number;
  mostrarIndice?: boolean;
};

function RegistroDinamico<T extends { id?: number }>({
  campos,
  nombreCampoFormik,
  formikInstance,
  crearRegistro,
  validar,
  tituloRegistro,
  maxRegistros,
  mostrarIndice,
}: Props<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [formErrors, setFormErrors] = useState<Partial<T>>({});
  const [registroError, setRegistroError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched) {
      const errores = validar(formData as T);
      setFormErrors(errores);
      if (Object.keys(errores).length === 0) {
        setRegistroError(null);
      }
    }
  };

  const handleAdd = async () => {
    setTouched(true);

    // Validar localmente con la función validar
    const errores = validar(formData as T);
    setFormErrors(errores);
    if (Object.keys(errores).length > 0) {
      setRegistroError(
        "Corrige los errores en el formulario antes de agregar."
      );  
      return;
    }

    // Verificar el número máximo de registros
    const registrosActuales = Array.isArray(
      formikInstance.values[nombreCampoFormik]
    )
      ? formikInstance.values[nombreCampoFormik]
      : [];

    if (maxRegistros && registrosActuales.length >= maxRegistros) {
      setRegistroError(`Solo se permiten hasta ${maxRegistros} registros.`);
      //console.log("Límite de registros alcanzado:", registrosActuales.length);
      return;
    }
    // Intentar validar con Formik, pero no bloquear si hay errores en otros campos
    await formikInstance.validateField(nombreCampoFormik);

    // Si no hay errores locales, proceder a agregar el registro
    setRegistroError(null);
    setFormErrors({});
    setTouched(false);

    const nuevoRegistro = crearRegistro(formData as T);
    const registros = [...registrosActuales, nuevoRegistro];
    formikInstance.setFieldValue(nombreCampoFormik, registros);
    setFormData({});
  };

  const handleDelete = (id: number) => {
    const registros = (
      Array.isArray(formikInstance.values[nombreCampoFormik])
        ? formikInstance.values[nombreCampoFormik]
        : []
    ).filter((item: T) => item.id !== id);
    formikInstance.setFieldValue(nombreCampoFormik, registros);
  };

  const registros = Array.isArray(formikInstance.values[nombreCampoFormik])
    ? formikInstance.values[nombreCampoFormik]
    : [];

  const errorMessage =
    typeof formikInstance.errors[nombreCampoFormik] === "string"
      ? formikInstance.errors[nombreCampoFormik]
      : null;

  useEffect(() => {
  }, [
    nombreCampoFormik,
    formikInstance.values,
    formikInstance.errors,
    formikInstance.touched,
  ]);

  return (
    <div className="secciones">
      {tituloRegistro && (
        <div className="seccion-tittle" style={{ marginBottom: "1em" }}>
          <Typography variant="h5">{tituloRegistro}</Typography>
        </div>
      )}

      <div className="subseccions">
        <Grid2 container spacing={2}>
          {campos.map((campo) => {
            const visible = campo.mostrar ? campo.mostrar(formData) : true;
            if (!visible) return null;

            return (
              <Grid2
                key={campo.name}
                size={{ ...(campo.gridProps || { xs: 12, md: 3 }) }}
              >
                {campo.type === "radio" ? (
                  <FormControl
                    sx={{ width: "100%" }}
                    component="fieldset"
                    error={touched && Boolean((formErrors as any)[campo.name])}
                  >
                    <FormLabel component="legend">{campo.label}</FormLabel>
                    <RadioGroup
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                      name={campo.name}
                      value={(formData as any)[campo.name] || ""}
                      onChange={handleChange}
                    >
                      {campo.options?.map((option) => (
                        <FormControlLabel
                          key={option.value}
                          value={option.value}
                          control={<Radio />}
                          label={option.label}
                        />
                      ))}
                    </RadioGroup>

                    {touched && (formErrors as any)[campo.name] && (
                      <FormHelperText>
                        {(formErrors as any)[campo.name]}
                      </FormHelperText>
                    )}
                  </FormControl>
                ) : (
                  <FormTextField
                    key={campo.name}
                    label={campo.label}
                    name={campo.name}
                    value={(formData as any)[campo.name] || ""}
                    onchange={handleChange}
                    onBlur={formikInstance.handleBlur}
                    error={touched && Boolean((formErrors as any)[campo.name])}
                    errorMessage={
                      touched ? (formErrors as any)[campo.name] : undefined
                    }
                    id={campo.name}
                    type={campo.type === "select" ? "text" : campo.type}
                    select={campo.type === "select"}
                  >
                    {campo.type === "select" &&
                      campo.options?.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                  </FormTextField>
                )}
              </Grid2>
            );
          })}
          <Grid2 size={{ xs: 12 }} style={{ textAlign: "right" }}>
            <Button variant="contained" size="small" onClick={handleAdd}>
              + Agregar
            </Button>
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {mostrarIndice && <TableCell>No.</TableCell>}
                    {campos.map((c) => (
                      <TableCell key={c.name}>{c.label}</TableCell>
                    ))}
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registros.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      {mostrarIndice && <TableCell>{index + 1}</TableCell>}
                      {campos.map((c) => {
                        const visible = c.mostrar ? c.mostrar(item) : true;
                        let valor = item[c.name];
                        if (
                          typeof valor === "string" &&
                          valor.startsWith('"') &&
                          valor.endsWith('"')
                        ) {
                          try {
                            valor = JSON.parse(valor);
                          } catch (e) {
                            // Usar el valor original si no se puede parsear
                          }
                        }
                        const mostrarValor = visible
                          ? valor !== undefined && valor !== ""
                            ? valor
                            : "N/A"
                          : "N/A";
                        const esNulo = mostrarValor === "N/A";

                        return (
                          <TableCell
                            key={c.name}
                            sx={esNulo ? { color: "#9e9e9e" } : undefined}
                          >
                            {mostrarValor}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <IconButton
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Eliminar registro ${item.id}`}
                        >
                          <DeleteOutlineIcon color="error" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}

                  {registros.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={campos.length + 2} align="center">
                        No hay registros aún.
                      </TableCell>
                    </TableRow>
                  )}
                  

                  {formikInstance.touched[nombreCampoFormik] &&
                    errorMessage && (
                      <TableRow>
                        <TableCell colSpan={campos.length + 1} align="center">
                          <Divider
                            sx={{
                              "&::before, ::after": { borderColor: "#d32f2f" },
                            }}
                          >
                            <FormHelperText error sx={{ textAlign: "center" }}>
                              {errorMessage}
                            </FormHelperText>
                          </Divider>
                        </TableCell>
                      </TableRow>
                    )}
                  {registroError && (
                    <TableRow>
                      <TableCell colSpan={campos.length + 1} align="center">
                        <Divider
                          sx={{
                            "&::before, ::after": { borderColor: "#d32f2f" },
                          }}
                        >
                          <FormHelperText error sx={{ textAlign: "center" }}>
                            {registroError}
                          </FormHelperText>
                        </Divider>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid2>
        </Grid2>
      </div>
    </div>
  );
}

export default RegistroDinamico;
