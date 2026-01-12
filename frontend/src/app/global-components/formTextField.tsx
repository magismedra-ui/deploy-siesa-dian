import { Box, TextField, Typography } from '@mui/material'
import React, { Children } from 'react'

interface FormTextFieldProps {
  className?: string;
  style?: string;
  key: string;
  label: string;
  name: string;
  value: string;
  onchange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
  errorMessage?: string; // Nueva prop para el mensaje de error
  id?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string
  select?: boolean;
  children?: React.ReactNode;
  autoComplete?: string;
}


const FormTextField: React.FC<FormTextFieldProps> = ({
  className,
  style,
  label,
  name,
  value,
  onchange,
  onBlur,
  error,
  errorMessage,
  id,
  disabled,
  inputRef,
  select = false,
  type = "text",
  children,
  autoComplete
}) => {
  return (
    <>
      <Box>
        <TextField
          className={className}
          variant='filled'
          label={label}
          fullWidth
          id={id}
          name={name}
          onChange={onchange}
          value={value}
          onBlur={onBlur}
          error={error}
          helperText={error && errorMessage}
          disabled={disabled}
          inputRef={inputRef}
          type={select ? undefined : type}
          select={select}
          autoComplete={autoComplete}

          sx={{
            "& .MuiFilledInput-root": {
              backgroundColor: "#ffffff00 !important",
              borderRadius: "0px",
            },
            "& .MuiInputLabel-root": {
              color: "gray",
            },
            "& .MuiFilledInput-root:hover": {
              backgroundColor: "green",
            },
            "& .MuiFilledInput-root.Mui-focused": {
              backgroundColor: "#F5FAFF !important",
            },
            "& internal-autofill-selected": {
              backgroundColor: "hotpink !important",
            }
          }}>
          {select && children}
        </TextField>
      </Box>
    </>
  )
}

export default FormTextField;
