/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Alert,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Restore as RestoreIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { FormContext, CustomField, FIELD_TYPE_METADATA } from '../../lib/types/customFields';
import { DefaultField, canHideField, CORE_REQUIRED_FIELDS } from '../../lib/types/defaultFields';
import {
  getDefaultFields,
  toggleDefaultFieldVisibility,
  updateDefaultField,
  resetDefaultFields
} from '../../lib/firebase/defaultFieldsService';
import {
  getCustomFieldsForContext
} from '../../lib/firebase/customFieldsService';
import CustomFieldsManager from './CustomFieldsManager';

interface FormFieldsManagerProps {
  context: FormContext;
  onFieldsChange?: (fields: any[]) => void;
}

const FormFieldsManager: React.FC<FormFieldsManagerProps> = ({
  context,
  onFieldsChange
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [defaultFields, setDefaultFields] = useState<DefaultField[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<DefaultField | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    loadFields();
  }, [context]);

  const loadFields = async () => {
    setLoading(true);
    try {
      const [defaultFieldsData, customFieldsData] = await Promise.all([
        getDefaultFields(context),
        getCustomFieldsForContext(context)
      ]);
      
      setDefaultFields(defaultFieldsData.sort((a, b) => a.order - b.order));
      setCustomFields(customFieldsData.sort((a, b) => a.order - b.order));
      setError(null);
    } catch (err) {
      setError('Failed to load form fields');
      console.error('Error loading fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDefaultField = async (fieldId: string) => {
    try {
      const field = defaultFields.find(f => f.id === fieldId);
      if (!field || !canHideField(field)) return;

      await toggleDefaultFieldVisibility(context, fieldId, !field.isActive);
      await loadFields();
      
      // Notify parent of changes
      const allFields = [...defaultFields, ...customFields];
      onFieldsChange?.(allFields);
    } catch (err) {
      setError('Failed to update field visibility');
      console.error('Error toggling field:', err);
    }
  };

  const handleEditDefaultField = (field: DefaultField) => {
    setEditingField(field);
    setEditDialogOpen(true);
  };

  const handleSaveDefaultField = async (fieldData: Partial<DefaultField>) => {
    if (!editingField) return;

    try {
      await updateDefaultField(context, editingField.id, fieldData);
      await loadFields();
      setEditDialogOpen(false);
      setEditingField(null);
      
      const allFields = [...defaultFields, ...customFields];
      onFieldsChange?.(allFields);
    } catch (err) {
      setError('Failed to update field');
      console.error('Error updating field:', err);
    }
  };

  const handleResetFields = async () => {
    try {
      await resetDefaultFields(context);
      await loadFields();
      setResetDialogOpen(false);
      
      const allFields = [...defaultFields, ...customFields];
      onFieldsChange?.(allFields);
    } catch (err) {
      setError('Failed to reset fields');
      console.error('Error resetting fields:', err);
    }
  };

  const renderDefaultFieldCard = (field: DefaultField) => {
    const isCore = CORE_REQUIRED_FIELDS.includes(field.id);
    const canEdit = !isCore;
    const canToggle = canHideField(field);

    return (
      <Card
        key={field.id}
        sx={{
          mb: 2,
          opacity: field.isActive ? 1 : 0.6,
          border: isCore ? '2px solid' : '1px solid',
          borderColor: isCore ? 'primary.main' : 'divider'
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1}>
            <Box flex={1}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="h6">
                  {field.label}
                </Typography>
                
                {isCore && (
                  <Tooltip title="Core field - cannot be removed or hidden">
                    <LockIcon color="primary" fontSize="small" />
                  </Tooltip>
                )}
                
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
                
                {field.conditionalField && (
                  <Chip
                    size="small"
                    label="Conditional"
                    color="info"
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
              {canToggle && (
                <Tooltip title={field.isActive ? 'Hide Field' : 'Show Field'}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggleDefaultField(field.id)}
                  >
                    {field.isActive ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  </IconButton>
                </Tooltip>
              )}
              
              {canEdit && (
                <Tooltip title="Edit Field">
                  <IconButton
                    size="small"
                    onClick={() => handleEditDefaultField(field)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading form fields...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Form Fields Configuration
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={() => setResetDialogOpen(true)}
          color="warning"
        >
          Reset to Defaults
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Standard Fields" />
          <Tab label="Custom Fields" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                These are the standard form fields. Core fields (marked with 🔒) cannot be removed or hidden.
                Other fields can be hidden or customized as needed.
              </Typography>
              
              {defaultFields.map(renderDefaultFieldCard)}
            </Box>
          )}

          {activeTab === 1 && (
            <CustomFieldsManager
              context={context}
              onFieldsChange={(fields) => {
                setCustomFields(fields);
                const allFields = [...defaultFields, ...fields];
                onFieldsChange?.(allFields);
              }}
            />
          )}
        </Box>
      </Paper>

      {/* Edit Default Field Dialog */}
      <DefaultFieldEditDialog
        open={editDialogOpen}
        field={editingField}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingField(null);
        }}
        onSave={handleSaveDefaultField}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset to Default Fields?</DialogTitle>
        <DialogContent>
          <Typography>
            This will reset all standard fields to their default configuration. 
            Custom fields will not be affected. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleResetFields} color="warning" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

interface DefaultFieldEditDialogProps {
  open: boolean;
  field: DefaultField | null;
  onClose: () => void;
  onSave: (fieldData: Partial<DefaultField>) => Promise<void>;
}

const DefaultFieldEditDialog: React.FC<DefaultFieldEditDialogProps> = ({
  open,
  field,
  onClose,
  onSave
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<Array<{value: string; label: string}>>([]);

  useEffect(() => {
    if (field) {
      setLabel(field.label);
      setDescription(field.description || '');
      setPlaceholder(field.placeholder || '');
      setRequired(field.validation.required);
      setOptions(field.options || []);
    }
  }, [field]);

  const handleSave = async () => {
    if (!field) return;

    const updates: Partial<DefaultField> = {
      label,
      description: description || undefined,
      placeholder: placeholder || undefined,
      validation: {
        ...field.validation,
        required
      }
    };

    if (field.options) {
      updates.options = options;
    }

    await onSave(updates);
  };

  const handleAddOption = () => {
    setOptions([...options, { value: '', label: '' }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: 'value' | 'label', value: string) => {
    setOptions(options.map((option, i) => 
      i === index ? { ...option, [field]: value } : option
    ));
  };

  const isCore = field && CORE_REQUIRED_FIELDS.includes(field.id);
  const hasOptions = field && field.options && field.options.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Field: {field?.label}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 3 }}>
          <TextField
            fullWidth
            label="Field Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText="Help text shown to users"
          />
          
          <TextField
            fullWidth
            label="Placeholder Text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            helperText="Hint text shown in empty fields"
          />
          
          {!isCore && (
            <FormControlLabel
              control={
                <Switch
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
              }
              label="Required Field"
            />
          )}

          {hasOptions && (
            <>
              <Divider />
              <Typography variant="h6">Field Options</Typography>
              {options.map((option, index) => (
                <Box key={index} display="flex" gap={2} alignItems="center">
                  <TextField
                    label="Value"
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    size="small"
                  />
                  <TextField
                    label="Label"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    size="small"
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveOption(index)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddOption}
                size="small"
              >
                Add Option
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormFieldsManager;