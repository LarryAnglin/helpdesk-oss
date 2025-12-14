// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  Chip,
  Grid,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
// Note: Drag and drop functionality simplified due to react-beautiful-dnd deprecation
import {
  CustomField,
  CustomFieldType,
  CustomFieldFormData,
  FIELD_TYPE_METADATA,
  FormContext
} from '../../lib/types/customFields';
import {
  getCustomFieldsForContext,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  toggleCustomFieldActive,
  duplicateCustomField
} from '../../lib/firebase/customFieldsService';
import { useAuth } from '../../lib/auth/AuthContext';

interface CustomFieldsManagerProps {
  context: FormContext;
  onFieldsChange?: (fields: CustomField[]) => void;
}

const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({
  context: _context,
  onFieldsChange
}) => {
  const { user } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fields on component mount
  useEffect(() => {
    loadFields();
  }, [_context]);

  const loadFields = async () => {
    setLoading(true);
    try {
      const loadedFields = await getCustomFieldsForContext(_context);
      setFields(loadedFields);
      setError(null);
    } catch (err) {
      setError('Failed to load custom fields');
      console.error('Error loading fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateField = () => {
    setEditingField(null);
    setIsDialogOpen(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setIsDialogOpen(true);
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCustomField(fieldId);
      const updatedFields = fields.filter(f => f.id !== fieldId);
      setFields(updatedFields);
      onFieldsChange?.(updatedFields);
    } catch (err) {
      setError('Failed to delete field');
      console.error('Error deleting field:', err);
    }
  };

  const handleToggleActive = async (fieldId: string) => {
    try {
      const field = fields.find(f => f.id === fieldId);
      if (!field) return;

      await toggleCustomFieldActive(fieldId, !field.isActive);
      const updatedFields = fields.map(f => 
        f.id === fieldId ? { ...f, isActive: !f.isActive } : f
      );
      setFields(updatedFields);
      onFieldsChange?.(updatedFields);
    } catch (err) {
      setError('Failed to update field');
      console.error('Error updating field:', err);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const reorderedFields = Array.from(fields);
    [reorderedFields[index - 1], reorderedFields[index]] = [reorderedFields[index], reorderedFields[index - 1]];
    
    // Update order values
    const updatedFields = reorderedFields.map((field, idx) => ({
      ...field,
      order: idx + 1
    }));

    setFields(updatedFields);
    onFieldsChange?.(updatedFields);
    // TODO: Implement actual reorder in Firebase
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    
    const reorderedFields = Array.from(fields);
    [reorderedFields[index], reorderedFields[index + 1]] = [reorderedFields[index + 1], reorderedFields[index]];
    
    // Update order values
    const updatedFields = reorderedFields.map((field, idx) => ({
      ...field,
      order: idx + 1
    }));

    setFields(updatedFields);
    onFieldsChange?.(updatedFields);
    // TODO: Implement actual reorder in Firebase
  };

  const handleDuplicateField = async (field: CustomField) => {
    if (!user?.uid) return;

    try {
      const duplicatedField = await duplicateCustomField(field.id, user.uid);
      const updatedFields = [...fields, duplicatedField];
      setFields(updatedFields);
      onFieldsChange?.(updatedFields);
    } catch (err) {
      setError('Failed to duplicate field');
      console.error('Error duplicating field:', err);
    }
  };


  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Custom Fields for {_context.replace('_', ' ').toUpperCase()}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateField}
          disabled={loading}
        >
          Add Field
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {fields.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary" gutterBottom>
            No custom fields configured
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Add custom fields to collect additional information on your forms
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateField}
            sx={{ mt: 2 }}
          >
            Create First Field
          </Button>
        </Paper>
      ) : (
        <Box>
          {fields.map((field, index) => (
            <Card
              key={field.id}
              sx={{
                mb: 2,
                opacity: field.isActive ? 1 : 0.6
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </IconButton>
                  </Box>
                            
                            <Box flex={1}>
                              <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Typography variant="h6">
                                  {field.label}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={FIELD_TYPE_METADATA[field.type]?.label || field.type}
                                  color="primary"
                                  variant="outlined"
                                />
                                {field.validation.required && (
                                  <Chip
                                    size="small"
                                    label="Required"
                                    color="error"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              
                              <Typography variant="body2" color="textSecondary">
                                {field.description || 'No description'}
                              </Typography>
                              
                              {field.options && field.options.length > 0 && (
                                <Box mt={1}>
                                  <Typography variant="caption" color="textSecondary">
                                    Options: {field.options.map(opt => opt.label).join(', ')}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            <Box display="flex" alignItems="center" gap={1}>
                              <Tooltip title={field.isActive ? 'Hide Field' : 'Show Field'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleActive(field.id)}
                                >
                                  {field.isActive ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Duplicate Field">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDuplicateField(field)}
                                >
                                  <CopyIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Edit Field">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditField(field)}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete Field">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
      )}

      <CustomFieldDialog
        open={isDialogOpen}
        field={editingField}
        context={_context}
        onClose={() => setIsDialogOpen(false)}
        onSave={async (fieldData) => {
          if (!user?.uid) return;

          try {
            if (editingField) {
              // Update existing field
              await updateCustomField(editingField.id, fieldData);
              const updatedFields = fields.map(f =>
                f.id === editingField.id
                  ? { ...editingField, ...fieldData, updatedAt: Date.now() }
                  : f
              );
              setFields(updatedFields);
              onFieldsChange?.(updatedFields);
            } else {
              // Create new field
              const newField = await createCustomField(
                {
                  ...fieldData,
                  order: fields.length + 1,
                  isActive: true
                },
                _context,
                user.uid
              );
              const updatedFields = [...fields, newField];
              setFields(updatedFields);
              onFieldsChange?.(updatedFields);
            }
            setIsDialogOpen(false);
          } catch (err) {
            setError('Failed to save field');
            console.error('Error saving field:', err);
          }
        }}
      />
    </Box>
  );
};

interface CustomFieldDialogProps {
  open: boolean;
  field: CustomField | null;
  context: FormContext;
  onClose: () => void;
  onSave: (fieldData: Omit<CustomField, 'id' | 'order' | 'isActive' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
}

const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  field,
  context: _context,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<CustomFieldFormData>({
    name: '',
    label: '',
    type: 'text',
    description: '',
    placeholder: '',
    defaultValue: '',
    validation: {
      required: false,
      minLength: '',
      maxLength: '',
      min: '',
      max: '',
      pattern: '',
      customMessage: ''
    },
    options: [],
    conditional: {
      enabled: false,
      dependsOn: '',
      showWhen: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (field) {
        // Edit mode - populate from existing field
        setFormData({
          name: field.name,
          label: field.label,
          type: field.type,
          description: field.description || '',
          placeholder: field.placeholder || '',
          defaultValue: field.defaultValue || '',
          validation: {
            required: field.validation.required,
            minLength: field.validation.minLength?.toString() || '',
            maxLength: field.validation.maxLength?.toString() || '',
            min: field.validation.min?.toString() || '',
            max: field.validation.max?.toString() || '',
            pattern: field.validation.pattern || '',
            customMessage: field.validation.customMessage || ''
          },
          options: field.options?.map(opt => ({ value: opt.value, label: opt.label })) || [],
          conditional: {
            enabled: !!field.conditional,
            dependsOn: field.conditional?.dependsOn || '',
            showWhen: field.conditional?.showWhen?.toString() || ''
          }
        });
      } else {
        // Create mode - use defaults
        setFormData({
          name: '',
          label: '',
          type: 'text',
          description: '',
          placeholder: '',
          defaultValue: '',
          validation: {
            required: false,
            minLength: '',
            maxLength: '',
            min: '',
            max: '',
            pattern: '',
            customMessage: ''
          },
          options: [],
          conditional: {
            enabled: false,
            dependsOn: '',
            showWhen: ''
          }
        });
      }
      setErrors({});
    }
  }, [open, field]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Field name must start with a letter and contain only letters, numbers, and underscores';
    }

    if (!formData.label.trim()) {
      newErrors.label = 'Field label is required';
    }

    if (FIELD_TYPE_METADATA[formData.type].supportsOptions && formData.options.length === 0) {
      newErrors.options = 'At least one option is required for this field type';
    }

    // Validate options
    formData.options.forEach((option, index) => {
      if (!option.value.trim()) {
        newErrors[`option_${index}_value`] = 'Option value is required';
      }
      if (!option.label.trim()) {
        newErrors[`option_${index}_label`] = 'Option label is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const fieldData: Omit<CustomField, 'id' | 'order' | 'isActive' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
      name: formData.name,
      label: formData.label,
      type: formData.type,
      description: formData.description || undefined,
      placeholder: formData.placeholder || undefined,
      defaultValue: formData.defaultValue || undefined,
      validation: {
        required: formData.validation.required,
        minLength: formData.validation.minLength ? parseInt(formData.validation.minLength) : undefined,
        maxLength: formData.validation.maxLength ? parseInt(formData.validation.maxLength) : undefined,
        min: formData.validation.min ? parseFloat(formData.validation.min) : undefined,
        max: formData.validation.max ? parseFloat(formData.validation.max) : undefined,
        pattern: formData.validation.pattern || undefined,
        customMessage: formData.validation.customMessage || undefined
      },
      options: FIELD_TYPE_METADATA[formData.type].supportsOptions ? formData.options : undefined,
      conditional: formData.conditional.enabled ? {
        dependsOn: formData.conditional.dependsOn,
        showWhen: formData.conditional.showWhen
      } : undefined
    };

    await onSave(fieldData);
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }]
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index: number, field: 'value' | 'label', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  const currentMetadata = FIELD_TYPE_METADATA[formData.type];
  const supportedValidations = currentMetadata.supportsValidation;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        {field ? 'Edit Custom Field' : 'Create Custom Field'}
      </DialogTitle>
      
      <DialogContent dividers sx={{ overflow: 'auto' }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Field Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name || 'Unique identifier for this field'}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Field Label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              error={!!errors.label}
              helperText={errors.label || 'Display name for users'}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <FormLabel>Field Type</FormLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as CustomFieldType }))}
              >
                {Object.entries(FIELD_TYPE_METADATA).map(([type, metadata]) => (
                  <MenuItem key={type} value={type}>
                    {metadata.label} - {metadata.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              helperText="Optional description to help users understand this field"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Placeholder Text"
              value={formData.placeholder}
              onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
              helperText="Hint text shown in empty fields"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Default Value"
              value={formData.defaultValue}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
              helperText="Initial value for new forms"
            />
          </Grid>

          {/* Validation */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Validation Rules
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.validation.required}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    validation: { ...prev.validation, required: e.target.checked }
                  }))}
                />
              }
              label="Required Field"
            />
          </Grid>
          
          {supportedValidations.includes('minLength') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Length"
                type="number"
                value={formData.validation.minLength}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation: { ...prev.validation, minLength: e.target.value }
                }))}
              />
            </Grid>
          )}
          
          {supportedValidations.includes('maxLength') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Length"
                type="number"
                value={formData.validation.maxLength}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation: { ...prev.validation, maxLength: e.target.value }
                }))}
              />
            </Grid>
          )}
          
          {supportedValidations.includes('min') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Value"
                type="number"
                value={formData.validation.min}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation: { ...prev.validation, min: e.target.value }
                }))}
              />
            </Grid>
          )}
          
          {supportedValidations.includes('max') && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Value"
                type="number"
                value={formData.validation.max}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation: { ...prev.validation, max: e.target.value }
                }))}
              />
            </Grid>
          )}
          
          {supportedValidations.includes('pattern') && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pattern (RegEx)"
                value={formData.validation.pattern}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation: { ...prev.validation, pattern: e.target.value }
                }))}
                helperText="Regular expression for validation"
              />
            </Grid>
          )}

          {/* Options for select/radio fields */}
          {currentMetadata.supportsOptions && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">
                    Options
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddOption}
                    size="small"
                  >
                    Add Option
                  </Button>
                </Box>
              </Grid>
              
              {formData.options.map((option, index) => (
                <Grid item xs={12} key={index}>
                  <Box display="flex" gap={2} alignItems="start">
                    <TextField
                      label="Value"
                      value={option.value}
                      onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                      error={!!errors[`option_${index}_value`]}
                      helperText={errors[`option_${index}_value`]}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Label"
                      value={option.label}
                      onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                      error={!!errors[`option_${index}_label`]}
                      helperText={errors[`option_${index}_label`]}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveOption(index)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
              
              {errors.options && (
                <Grid item xs={12}>
                  <Alert severity="error">{errors.options}</Alert>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          {field ? 'Update' : 'Create'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomFieldsManager;