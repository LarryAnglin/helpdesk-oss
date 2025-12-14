// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Rating,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  CustomField,
  CustomFieldValue,
  CustomFieldType
} from '../../lib/types/customFields';
import { getCustomFieldsForContext } from '../../lib/firebase/customFieldsService';

interface CustomFieldsDisplayProps {
  customFields?: CustomFieldValue[];
  context?: string;
  showEmpty?: boolean;
  variant?: 'outlined' | 'elevation' | 'flat';
  collapsible?: boolean;
  title?: string;
}

const CustomFieldsDisplay: React.FC<CustomFieldsDisplayProps> = ({
  customFields = [],
  context = 'ticket_creation',
  showEmpty = false,
  variant = 'flat',
  collapsible = false,
  title = 'Additional Information'
}) => {
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFieldDefinitions();
  }, [context]);

  const loadFieldDefinitions = async () => {
    if (customFields.length === 0 && !showEmpty) return;

    setLoading(true);
    try {
      const fields = await getCustomFieldsForContext(context as any);
      setFieldDefinitions(fields);
      setError(null);
    } catch (err) {
      setError('Failed to load field definitions');
      console.error('Error loading field definitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldDefinition = (fieldId: string): CustomField | undefined => {
    return fieldDefinitions.find(field => field.id === fieldId);
  };

  const formatFieldValue = (value: any, fieldType: CustomFieldType, field?: CustomField): React.ReactNode => {
    if (value === null || value === undefined) {
      return <Typography variant="body2" color="textSecondary">Not provided</Typography>;
    }

    switch (fieldType) {
      case 'boolean':
        return (
          <FormControlLabel
            control={<Checkbox checked={!!value} disabled />}
            label={value ? 'Yes' : 'No'}
          />
        );

      case 'select':
      case 'radio':
        const option = field?.options?.find(opt => opt.value === value);
        return (
          <Chip 
            label={option?.label || value} 
            variant="outlined" 
            size="small" 
          />
        );

      case 'multiselect':
        if (!Array.isArray(value)) return value;
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {value.map((val, index) => {
              const option = field?.options?.find(opt => opt.value === val);
              return (
                <Chip 
                  key={index}
                  label={option?.label || val} 
                  variant="outlined" 
                  size="small" 
                />
              );
            })}
          </Box>
        );

      case 'rating':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={value} readOnly max={field?.validation.max || 5} />
            <Typography variant="body2">({value}/{field?.validation.max || 5})</Typography>
          </Box>
        );

      case 'date':
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch {
          return value;
        }

      case 'datetime':
        try {
          const date = new Date(value);
          return date.toLocaleString();
        } catch {
          return value;
        }

      case 'time':
        return value;

      case 'color':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                backgroundColor: value,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}
            />
            <Typography variant="body2">{value}</Typography>
          </Box>
        );

      case 'file':
        if (value instanceof File) {
          return (
            <Typography variant="body2">
              📎 {value.name} ({(value.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          );
        }
        return value;

      case 'files':
        if (Array.isArray(value)) {
          return (
            <List dense>
              {value.map((file, index) => (
                <ListItem key={index} sx={{ pl: 0 }}>
                  <ListItemText
                    primary={file instanceof File ? `📎 ${file.name}` : file}
                    secondary={file instanceof File ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : undefined}
                  />
                </ListItem>
              ))}
            </List>
          );
        }
        return value;

      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        );

      case 'email':
        return (
          <a href={`mailto:${value}`}>
            {value}
          </a>
        );

      case 'phone':
        return (
          <a href={`tel:${value}`}>
            {value}
          </a>
        );

      case 'textarea':
        return (
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {value}
          </Typography>
        );

      default:
        return value;
    }
  };

  // Filter out empty values if showEmpty is false
  const displayFields = customFields.filter(field => {
    if (showEmpty) return true;
    const value = field.value;
    return value !== null && value !== undefined && value !== '' && 
           !(Array.isArray(value) && value.length === 0);
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (displayFields.length === 0) {
    return showEmpty ? (
      <Typography variant="body2" color="textSecondary">
        No additional information provided
      </Typography>
    ) : null;
  }

  const content = (
    <Grid container spacing={2}>
      {displayFields.map((fieldValue) => {
        const fieldDef = getFieldDefinition(fieldValue.fieldId);
        const label = fieldDef?.label || fieldValue.fieldId;
        const description = fieldDef?.description;

        return (
          <Grid item xs={12} sm={6} md={4} key={fieldValue.fieldId}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {label}
                {fieldDef?.validation.required && (
                  <Typography component="span" color="error"> *</Typography>
                )}
              </Typography>
              
              {formatFieldValue(fieldValue.value, fieldDef?.type || 'text', fieldDef)}
              
              {description && (
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                  {description}
                </Typography>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );

  if (collapsible) {
    return (
      <Accordion defaultExpanded={displayFields.length <= 3}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            {title} ({displayFields.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {content}
        </AccordionDetails>
      </Accordion>
    );
  }

  if (variant === 'flat') {
    return (
      <Box>
        {title && (
          <>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        {content}
      </Box>
    );
  }

  return (
    <Paper 
      variant={variant === 'outlined' ? 'outlined' : 'elevation'} 
      sx={{ p: 2 }}
    >
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      {content}
    </Paper>
  );
};

export default CustomFieldsDisplay;