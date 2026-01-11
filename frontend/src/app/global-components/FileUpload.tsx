'use client';
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ClearIcon } from '@mui/x-date-pickers';

interface FileUploadProps {
  name: string;
  value: File[];
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  error?: boolean;
  errorMessage?: string | string[] | undefined;
  compact?: boolean;
  accept: string;
  formatoArchivo?: string;
  hoverMessage?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  name,
  value = [],
  setFieldValue,
  error,
  errorMessage,
  compact = false,
  accept = "image/png, image/jpeg",
  formatoArchivo,
  hoverMessage,

}) => {
  const [dragActive, setDragActive] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = event.target.files ? Array.from(event.target.files) : [];
    const existingFileNames = value.map(file => file.name);
    const filteredFiles = newFiles.filter(file => !existingFileNames.includes(file.name));

    if (filteredFiles.length < newFiles.length) {
      setDuplicateMessage('Ya agregó un archivo con el mismo nombre.');
    } else {
      setDuplicateMessage('');
    }

    const updatedFiles = [...value, ...filteredFiles];
    setFieldValue(name, updatedFiles);
  };

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles = Array.from(event.dataTransfer.files);
      const existingFileNames = value.map(file => file.name);
      const filteredFiles = newFiles.filter(file => !existingFileNames.includes(file.name));

      if (filteredFiles.length < newFiles.length) {
        setDuplicateMessage('Ya agregó un archivo con el mismo nombre.');
      } else {
        setDuplicateMessage('');
      }

      const updatedFiles = [...value, ...filteredFiles];
      setFieldValue(name, updatedFiles);
    }
  };

  const removeFile = (fileName: string) => {
    const updatedFiles = value.filter((file) => file.name !== fileName);
    setFieldValue(name, updatedFiles);
    //console.log(`Archivo eliminado de ${name}:`, updatedFiles); // Depuración
  };
  const [hovered, setHovered] = React.useState(false);
  const [duplicateMessage, setDuplicateMessage] = React.useState('');

  return (
    <Box sx={{ margin: 'auto' }}>
      <Box
        sx={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <label htmlFor={`file-upload-${name}`}>
          <Paper
            elevation={3}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            sx={{
              p: 3,
              border: '2px dashed #ccc',
              bgcolor: dragActive ? 'grey.100' : 'background.paper',
              textAlign: 'center',
              boxShadow: 'none',
              borderRadius: 2,
              position: 'relative'
            }}
          >
            <input
              type="file"
              id={`file-upload-${name}`}
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept={accept}
            />
            <CloudUploadIcon sx={{ fontSize: 50, color: '#7F9FC1' }} />
            <Typography variant="body2" color="text.secondary">
              Arrastre y suba aquí su soporte.<br />
              {/* {formatoArchivo ? `Solo archivos de formato ${formatoArchivo}` : ''} */}
              {hoverMessage ? hoverMessage : ''}
            </Typography>
            {hovered && hoverMessage && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '-webkit-fill-available',
                  height: '-webkit-fill-available;',
                  bgcolor: '#004084',
                  opacity: .85,
                  color: 'white',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography variant="body2">
                  {hoverMessage}
                </Typography>
              </Box>
            )}
          </Paper>
        </label>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {errorMessage}
          </Typography>
        )}
        {duplicateMessage && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {duplicateMessage}
          </Typography>
        )}
        {value.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, }} dense>
              {value.map((file, index) => (
                <ListItem className='uploadFilesData'
                  sx={{
                    backgroundColor: '#F5FAFF',
                    borderRadius: 2,
                    color: '#004084',
                    flexDirection: 'row',
                    width: '165px',
                    paddingX: '8px',
                    ...(compact ? {} : { mr: 2 }),
                  }}
                  key={file.name}

                  secondaryAction={
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeFile(file.name)}
                    >
                      <ClearIcon color="error" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <span
                        className='truncate-text'
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    }
                  />
                </ListItem>

              ))}
            </List>
          </Box>
        )}

      </Box>
    </Box>
  );
};

export default FileUpload;