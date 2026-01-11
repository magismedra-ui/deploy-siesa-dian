import React from 'react';
import { Grid, TextField } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { FormikProps } from 'formik';

interface DatePickerFieldProps {
  formikInstance: FormikProps<{ fecha: string }>;
  label: string;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({ formikInstance, label }) => (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={formikInstance.values.fecha ? dayjs(formikInstance.values.fecha) : null}
        onChange={(newValue: Dayjs | null) =>
          formikInstance.setFieldValue('fecha', newValue ? newValue.format('YYYY-MM-DD') : '')
        }
        slotProps={{ textField: { fullWidth: true } }}
      />
    </LocalizationProvider>
);

export default DatePickerField;
