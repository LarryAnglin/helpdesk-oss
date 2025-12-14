/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  CustomField,
  CustomFieldValue,
  CustomFieldError,
  CustomFieldType
} from '../types/customFields';

/**
 * Validates a single custom field value against its validation rules
 */
export function validateCustomField(
  field: CustomField,
  value: any
): CustomFieldError | null {
  const { validation } = field;

  // Skip validation if field is not active
  if (!field.isActive) {
    return null;
  }

  // Required validation
  if (validation.required && isEmpty(value, field.type)) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} is required`,
      type: 'required'
    };
  }

  // Skip other validations if value is empty and not required
  if (isEmpty(value, field.type) && !validation.required) {
    return null;
  }

  // Type-specific validations
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    case 'password':
      return validateStringField(field, value);

    case 'number':
    case 'rating':
    case 'slider':
      return validateNumberField(field, value);

    case 'select':
    case 'radio':
      return validateSelectField(field, value);

    case 'multiselect':
      return validateMultiSelectField(field, value);

    case 'date':
    case 'datetime':
    case 'time':
      return validateDateField(field, value);

    case 'file':
      return validateFileField(field, value);

    case 'files':
      return validateFilesField(field, value);

    case 'boolean':
      return validateBooleanField(field, value);

    case 'color':
      return validateColorField(field, value);

    default:
      return null;
  }
}

/**
 * Validates all custom fields in a form
 */
export function validateCustomFields(
  fields: CustomField[],
  values: CustomFieldValue[]
): CustomFieldError[] {
  const errors: CustomFieldError[] = [];
  const valueMap = new Map(values.map(v => [v.fieldId, v.value]));

  for (const field of fields) {
    if (!field.isActive) continue;

    const value = valueMap.get(field.id);
    const error = validateCustomField(field, value);
    
    if (error) {
      errors.push(error);
    }

    // Check conditional field dependencies
    if (field.conditional) {
      const dependentValue = valueMap.get(field.conditional.dependsOn);
      const shouldShow = dependentValue === field.conditional.showWhen;
      
      if (!shouldShow && value !== undefined && value !== null && value !== '') {
        // Field should be hidden but has a value - clear it
        // This is handled by the form component, not validation
      }
    }
  }

  return errors;
}

/**
 * Checks if a field value is considered empty based on its type
 */
function isEmpty(value: any, type: CustomFieldType): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  switch (type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    case 'password':
    case 'select':
    case 'radio':
    case 'date':
    case 'datetime':
    case 'time':
    case 'color':
      return typeof value === 'string' ? value.trim() === '' : true;

    case 'number':
    case 'rating':
    case 'slider':
      return value === 0 || value === '' || isNaN(value);

    case 'boolean':
      return false; // boolean fields are never considered "empty"

    case 'multiselect':
    case 'files':
      return !Array.isArray(value) || value.length === 0;

    case 'file':
      return !value;

    default:
      return !value;
  }
}

/**
 * Validates string-based fields (text, textarea, email, etc.)
 */
function validateStringField(field: CustomField, value: any): CustomFieldError | null {
  const strValue = String(value || '');
  const { validation } = field;

  // Length validations
  if (validation.minLength && strValue.length < validation.minLength) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} must be at least ${validation.minLength} characters`,
      type: 'min'
    };
  }

  if (validation.maxLength && strValue.length > validation.maxLength) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} must be no more than ${validation.maxLength} characters`,
      type: 'max'
    };
  }

  // Pattern validation
  if (validation.pattern && strValue) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(strValue)) {
      return {
        fieldId: field.id,
        message: validation.customMessage || getPatternErrorMessage(field.type, field.label),
        type: 'pattern'
      };
    }
  }

  // Type-specific validations
  if (field.type === 'email' && strValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return {
        fieldId: field.id,
        message: validation.customMessage || `${field.label} must be a valid email address`,
        type: 'invalid'
      };
    }
  }

  if (field.type === 'url' && strValue) {
    try {
      new URL(strValue);
    } catch {
      return {
        fieldId: field.id,
        message: validation.customMessage || `${field.label} must be a valid URL`,
        type: 'invalid'
      };
    }
  }

  return null;
}

/**
 * Validates number-based fields
 */
function validateNumberField(field: CustomField, value: any): CustomFieldError | null {
  const numValue = parseFloat(value);
  const { validation } = field;

  if (isNaN(numValue)) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} must be a valid number`,
      type: 'invalid'
    };
  }

  if (validation.min !== undefined && numValue < validation.min) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} must be at least ${validation.min}`,
      type: 'min'
    };
  }

  if (validation.max !== undefined && numValue > validation.max) {
    return {
      fieldId: field.id,
      message: validation.customMessage || `${field.label} must be no more than ${validation.max}`,
      type: 'max'
    };
  }

  return null;
}

/**
 * Validates select fields
 */
function validateSelectField(field: CustomField, value: any): CustomFieldError | null {
  if (!field.options || field.options.length === 0) {
    return null;
  }

  const validValues = field.options.map(opt => opt.value);
  if (value && !validValues.includes(value)) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} contains an invalid selection`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates multi-select fields
 */
function validateMultiSelectField(field: CustomField, value: any): CustomFieldError | null {
  if (!Array.isArray(value)) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be an array`,
      type: 'invalid'
    };
  }

  if (!field.options || field.options.length === 0) {
    return null;
  }

  const validValues = field.options.map(opt => opt.value);
  const invalidValues = value.filter(v => !validValues.includes(v));
  
  if (invalidValues.length > 0) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} contains invalid selections`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates date/time fields
 */
function validateDateField(field: CustomField, value: any): CustomFieldError | null {
  if (!value) return null;

  let dateValue: Date;
  
  try {
    if (field.type === 'time') {
      // Time format: HH:MM
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(value)) {
        return {
          fieldId: field.id,
          message: field.validation.customMessage || `${field.label} must be in HH:MM format`,
          type: 'invalid'
        };
      }
      return null;
    } else {
      dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        throw new Error('Invalid date');
      }
    }
  } catch {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be a valid date`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates file fields
 */
function validateFileField(field: CustomField, value: any): CustomFieldError | null {
  if (!value) return null;

  if (!(value instanceof File)) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be a file`,
      type: 'invalid'
    };
  }

  // File size validation (10MB default limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (value.size > maxSize) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} file size must be less than 10MB`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates multiple files field
 */
function validateFilesField(field: CustomField, value: any): CustomFieldError | null {
  if (!value) return null;

  if (!Array.isArray(value)) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be an array of files`,
      type: 'invalid'
    };
  }

  // Validate each file
  for (let i = 0; i < value.length; i++) {
    const file = value[i];
    const fileError = validateFileField(field, file);
    if (fileError) {
      return {
        ...fileError,
        message: `${field.label} file ${i + 1}: ${fileError.message}`
      };
    }
  }

  // Limit number of files (5 default)
  const maxFiles = 5;
  if (value.length > maxFiles) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} can have at most ${maxFiles} files`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates boolean fields
 */
function validateBooleanField(field: CustomField, value: any): CustomFieldError | null {
  if (typeof value !== 'boolean') {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be true or false`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Validates color fields
 */
function validateColorField(field: CustomField, value: any): CustomFieldError | null {
  if (!value) return null;

  const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!colorRegex.test(value)) {
    return {
      fieldId: field.id,
      message: field.validation.customMessage || `${field.label} must be a valid hex color`,
      type: 'invalid'
    };
  }

  return null;
}

/**
 * Gets default error message for pattern validation
 */
function getPatternErrorMessage(type: CustomFieldType, label: string): string {
  switch (type) {
    case 'email':
      return `${label} must be a valid email address`;
    case 'phone':
      return `${label} must be a valid phone number`;
    case 'url':
      return `${label} must be a valid URL`;
    default:
      return `${label} format is invalid`;
  }
}

/**
 * Checks if a field should be visible based on conditional logic
 */
export function shouldShowField(
  field: CustomField,
  values: CustomFieldValue[]
): boolean {
  if (!field.conditional) {
    return true;
  }

  const dependentValue = values.find(v => v.fieldId === field.conditional!.dependsOn)?.value;
  return dependentValue === field.conditional.showWhen;
}

/**
 * Filters custom field values to only include visible fields
 */
export function filterVisibleFieldValues(
  fields: CustomField[],
  values: CustomFieldValue[]
): CustomFieldValue[] {
  return values.filter(value => {
    const field = fields.find(f => f.id === value.fieldId);
    return field && shouldShowField(field, values);
  });
}