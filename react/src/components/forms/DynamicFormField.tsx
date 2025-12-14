/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  RadioGroup,
  Radio,
  Slider,
  Rating,
  Chip,
  Typography,
  Button,
  ListItemText,
  OutlinedInput,
  InputLabel,
  Alert
} from '@mui/material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { Upload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  CustomField,
  CustomFieldError,
  CustomFieldType
} from '../../lib/types/customFields';

interface DynamicFormFieldProps {
  field: CustomField;
  value?: any;
  onChange: (fieldId: string, value: any) => void;
  error?: CustomFieldError;
  disabled?: boolean;
  showLabel?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled = false,
  showLabel = true,
  variant = 'outlined'
}) => {
  const [internalValue, setInternalValue] = useState(value ?? field.defaultValue ?? getDefaultValue(field.type));
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    setInternalValue(value ?? field.defaultValue ?? getDefaultValue(field.type));
  }, [value, field.defaultValue, field.type]);

  const handleChange = (newValue: any) => {
    setInternalValue(newValue);
    onChange(field.id, newValue);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (field.type === 'file') {
      // Single file
      const file = selectedFiles[0];
      setFiles(file ? [file] : []);
      handleChange(file || null);
    } else if (field.type === 'files') {
      // Multiple files
      setFiles(selectedFiles);
      handleChange(selectedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    
    if (field.type === 'file') {
      handleChange(updatedFiles[0] || null);
    } else {
      handleChange(updatedFiles);
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'password':
        return (
          <TextField
            fullWidth
            variant={variant}
            type={getInputType(field.type)}
            label={showLabel ? field.label : undefined}
            placeholder={field.placeholder}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            error={!!error}
            helperText={error?.message || field.description}
            required={field.validation.required}
            disabled={disabled}
            inputProps={{
              minLength: field.validation.minLength,
              maxLength: field.validation.maxLength,
              pattern: field.validation.pattern
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            variant={variant}
            label={showLabel ? field.label : undefined}
            placeholder={field.placeholder}
            value={internalValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            error={!!error}
            helperText={error?.message || field.description}
            required={field.validation.required}
            disabled={disabled}
            inputProps={{
              minLength: field.validation.minLength,
              maxLength: field.validation.maxLength
            }}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            variant={variant}
            label={showLabel ? field.label : undefined}
            placeholder={field.placeholder}
            value={internalValue || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || null)}
            error={!!error}
            helperText={error?.message || field.description}
            required={field.validation.required}
            disabled={disabled}
            inputProps={{
              min: field.validation.min,
              max: field.validation.max
            }}
          />
        );

      case 'boolean':
        return (
          <FormControl error={!!error} disabled={disabled}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!internalValue}
                  onChange={(e) => handleChange(e.target.checked)}
                />
              }
              label={field.label}
            />
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'select':
        return (
          <FormControl fullWidth variant={variant} error={!!error} disabled={disabled}>
            <InputLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </InputLabel>
            <Select
              value={internalValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              input={<OutlinedInput label={showLabel ? field.label : ''} />}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth variant={variant} error={!!error} disabled={disabled}>
            <InputLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </InputLabel>
            <Select
              multiple
              value={internalValue || []}
              onChange={(e) => handleChange(e.target.value)}
              input={<OutlinedInput label={showLabel ? field.label : ''} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => {
                    const option = field.options?.find(opt => opt.value === value);
                    return (
                      <Chip key={value} label={option?.label || value} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  <Checkbox checked={(internalValue || []).indexOf(option.value) > -1} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl error={!!error} disabled={disabled}>
            <FormLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </FormLabel>
            <RadioGroup
              value={internalValue || ''}
              onChange={(e) => handleChange(e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                  disabled={option.disabled}
                />
              ))}
            </RadioGroup>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'date':
        return (
          <DatePicker
            label={showLabel ? field.label : undefined}
            value={internalValue ? new Date(internalValue) : null}
            onChange={(date) => handleChange(date ? date.toISOString().split('T')[0] : null)}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: variant,
                error: !!error,
                helperText: error?.message || field.description,
                required: field.validation.required
              }
            }}
          />
        );

      case 'datetime':
        return (
          <DateTimePicker
            label={showLabel ? field.label : undefined}
            value={internalValue ? new Date(internalValue) : null}
            onChange={(date) => handleChange(date ? date.toISOString() : null)}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: variant,
                error: !!error,
                helperText: error?.message || field.description,
                required: field.validation.required
              }
            }}
          />
        );

      case 'time':
        return (
          <TimePicker
            label={showLabel ? field.label : undefined}
            value={internalValue ? new Date(`1970-01-01T${internalValue}`) : null}
            onChange={(time) => {
              if (time) {
                const timeString = time.toTimeString().split(' ')[0].substring(0, 5);
                handleChange(timeString);
              } else {
                handleChange(null);
              }
            }}
            disabled={disabled}
            slotProps={{
              textField: {
                fullWidth: true,
                variant: variant,
                error: !!error,
                helperText: error?.message || field.description,
                required: field.validation.required
              }
            }}
          />
        );

      case 'file':
      case 'files':
        return (
          <Box>
            <FormControl fullWidth error={!!error} disabled={disabled}>
              <FormLabel required={field.validation.required}>
                {showLabel ? field.label : ''}
              </FormLabel>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                sx={{ mt: 1, mb: 1 }}
                disabled={disabled}
              >
                {field.type === 'files' ? 'Choose Files' : 'Choose File'}
                <input
                  type="file"
                  hidden
                  multiple={field.type === 'files'}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
              </Button>

              {files.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {files.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => removeFile(index)}
                        disabled={disabled}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}

              {(error?.message || field.description) && (
                <FormHelperText>{error?.message || field.description}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );

      case 'rating':
        return (
          <FormControl error={!!error} disabled={disabled}>
            <FormLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </FormLabel>
            <Box sx={{ mt: 1 }}>
              <Rating
                value={internalValue || 0}
                onChange={(_, newValue) => handleChange(newValue)}
                max={field.validation.max || 5}
                disabled={disabled}
              />
            </Box>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'slider':
        return (
          <FormControl fullWidth error={!!error} disabled={disabled}>
            <FormLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </FormLabel>
            <Box sx={{ px: 2, mt: 2 }}>
              <Slider
                value={internalValue || field.validation.min || 0}
                onChange={(_, newValue) => handleChange(newValue)}
                min={field.validation.min || 0}
                max={field.validation.max || 100}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={disabled}
              />
            </Box>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      case 'color':
        return (
          <FormControl error={!!error} disabled={disabled}>
            <FormLabel required={field.validation.required}>
              {showLabel ? field.label : ''}
            </FormLabel>
            <Box sx={{ mt: 1 }}>
              <input
                type="color"
                value={internalValue || '#000000'}
                onChange={(e) => handleChange(e.target.value)}
                disabled={disabled}
                style={{
                  width: '100px',
                  height: '40px',
                  border: error ? '2px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: disabled ? 'not-allowed' : 'pointer'
                }}
              />
            </Box>
            {(error?.message || field.description) && (
              <FormHelperText>{error?.message || field.description}</FormHelperText>
            )}
          </FormControl>
        );

      default:
        return (
          <Alert severity="warning">
            Unsupported field type: {field.type}
          </Alert>
        );
    }
  };

  // Don't render if field is inactive
  if (!field.isActive) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {renderField()}
    </Box>
  );
};

// Helper functions
function getDefaultValue(type: CustomFieldType): any {
  switch (type) {
    case 'boolean':
      return false;
    case 'multiselect':
    case 'files':
      return [];
    case 'number':
    case 'rating':
    case 'slider':
      return 0;
    case 'color':
      return '#000000';
    default:
      return '';
  }
}

function getInputType(fieldType: CustomFieldType): string {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'url':
      return 'url';
    case 'password':
      return 'password';
    default:
      return 'text';
  }
}

export default DynamicFormField;