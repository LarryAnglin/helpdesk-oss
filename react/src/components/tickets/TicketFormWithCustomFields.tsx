/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { TicketFormData, Ticket } from '../../lib/types/ticket';
import {
  CustomField,
  CustomFieldValue,
  CustomFieldError,
  FormContext
} from '../../lib/types/customFields';
import TicketForm from './TicketForm';
import DynamicFormField from '../forms/DynamicFormField';
import {
  validateCustomFields,
  shouldShowField,
  filterVisibleFieldValues
} from '../../lib/utils/customFieldValidation';
import { getCustomFieldsForContext } from '../../lib/firebase/customFieldsService';

interface TicketFormWithCustomFieldsProps {
  ticket?: Ticket;
  onSubmit: (data: TicketFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  context?: FormContext;
}

const TicketFormWithCustomFields: React.FC<TicketFormWithCustomFieldsProps> = ({
  ticket,
  onSubmit,
  loading = false,
  error = null,
  context = 'ticket_creation'
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([]);
  const [customFieldErrors, setCustomFieldErrors] = useState<CustomFieldError[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  // Load custom fields on component mount
  useEffect(() => {
    loadCustomFields();
  }, [context]);

  // Initialize custom field values from existing ticket
  useEffect(() => {
    if (ticket?.customFields) {
      setCustomFieldValues(ticket.customFields);
    }
  }, [ticket]);

  const loadCustomFields = async () => {
    setFieldsLoading(true);
    try {
      const fields = await getCustomFieldsForContext(context);
      setCustomFields(fields);
      setFieldsError(null);
    } catch (err) {
      setFieldsError('Failed to load custom fields');
      console.error('Error loading custom fields:', err);
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => {
      const existing = prev.find(v => v.fieldId === fieldId);
      if (existing) {
        return prev.map(v => 
          v.fieldId === fieldId ? { ...v, value } : v
        );
      } else {
        return [...prev, { fieldId, value }];
      }
    });

    // Clear any existing error for this field
    setCustomFieldErrors(prev => prev.filter(e => e.fieldId !== fieldId));
  };

  const validateCustomFieldsData = (): boolean => {
    const visibleFields = customFields.filter(field => 
      field.isActive && shouldShowField(field, customFieldValues)
    );
    
    const errors = validateCustomFields(visibleFields, customFieldValues);
    setCustomFieldErrors(errors);
    
    return errors.length === 0;
  };

  const handleFormSubmit = async (formData: TicketFormData) => {
    // Validate custom fields
    if (!validateCustomFieldsData()) {
      return;
    }

    // Filter custom field values to only include visible fields
    const visibleFieldValues = filterVisibleFieldValues(customFields, customFieldValues);

    // Add custom fields to form data
    const extendedFormData: TicketFormData = {
      ...formData,
      customFields: visibleFieldValues
    };

    await onSubmit(extendedFormData);
  };

  const getFieldError = (fieldId: string): CustomFieldError | undefined => {
    return customFieldErrors.find(e => e.fieldId === fieldId);
  };

  const getFieldValue = (fieldId: string): any => {
    return customFieldValues.find(v => v.fieldId === fieldId)?.value;
  };

  // Group fields by category if needed
  const visibleFields = customFields.filter(field => 
    field.isActive && shouldShowField(field, customFieldValues)
  );

  const requiredCustomFields = visibleFields.filter(field => field.validation.required);
  const optionalCustomFields = visibleFields.filter(field => !field.validation.required);

  return (
    <Box>
      {/* Standard ticket form */}
      <TicketForm
        ticket={ticket}
        onSubmit={handleFormSubmit}
        loading={loading}
        error={error}
      />

      {/* Custom fields section */}
      {(fieldsLoading || fieldsError || visibleFields.length > 0) && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          
          {fieldsLoading && (
            <Alert severity="info">Loading custom fields...</Alert>
          )}

          {fieldsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {fieldsError}
            </Alert>
          )}

          {visibleFields.length > 0 && (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Typography variant="h6">
                  Additional Information
                </Typography>
                {requiredCustomFields.length > 0 && (
                  <Chip
                    label={`${requiredCustomFields.length} required`}
                    color="error"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              {/* Required fields first */}
              {requiredCustomFields.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom color="error">
                    Required Fields *
                  </Typography>
                  {requiredCustomFields.map(field => (
                    <DynamicFormField
                      key={field.id}
                      field={field}
                      value={getFieldValue(field.id)}
                      onChange={handleCustomFieldChange}
                      error={getFieldError(field.id)}
                      disabled={loading}
                    />
                  ))}
                </Box>
              )}

              {/* Optional fields in collapsible section */}
              {optionalCustomFields.length > 0 && (
                <Accordion defaultExpanded={optionalCustomFields.length <= 3}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      Optional Fields ({optionalCustomFields.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      {optionalCustomFields.map(field => (
                        <DynamicFormField
                          key={field.id}
                          field={field}
                          value={getFieldValue(field.id)}
                          onChange={handleCustomFieldChange}
                          error={getFieldError(field.id)}
                          disabled={loading}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Custom field validation errors */}
              {customFieldErrors.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Please fix the following errors:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {customFieldErrors.map(error => (
                      <li key={error.fieldId}>
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TicketFormWithCustomFields;