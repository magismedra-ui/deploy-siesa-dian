import { Typography, FormHelperText } from '@mui/material';
import { FC, ReactNode } from 'react';
import { useField, useFormikContext } from 'formik';
import "@/app/global-styles/mega-style.css";

interface RadioOption {
    value: string;
    label: string;
    icon: ReactNode;
    
}

interface RadioButtonGroupProps {
    name: string;
    options: RadioOption[];
    onChange?: (value: string) => void;
}

const RadioButtonGroup: FC<RadioButtonGroupProps> = ({ name, options, onChange}) => {
  const [field, meta, helpers] = useField(name);
  const { setFieldValue } = useFormikContext();

  const handleChange = (value: string) => {
    setFieldValue(name, value);
    onChange?.(value);

  };

    return (
        <div style={{marginTop:'1em'}} className="radio-container ">
            {options.map((option) => (
                <label key={option.value} className="radio-label icon-link">
                    <input
                        type="radio"
                        name={name} // Fallback si no hay name
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={() => handleChange(option.value)}
                        className="radio-input"
                    />
                    <div className="radio-content">
                        {option.icon}
                        <Typography sx={{ fontWeight: '300' }}
                            className="text"
                            variant="body1"
                            dangerouslySetInnerHTML={{ __html: option.label }}
                        />
                    </div>
                </label>
            ))}

            {/* {meta.touched && meta.error && (
        <FormHelperText error>{meta.error}</FormHelperText>
      )} */}
        </div>
    );
};

export default RadioButtonGroup;