/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Custom Form Fields Types
 * 
 * Defines the structure for dynamic, user-configurable form fields
 * that can be added to ticket creation and other forms.
 */

export type CustomFieldType = 
  | 'text'           // Single line text input
  | 'textarea'       // Multi-line text input  
  | 'number'         // Numeric input with validation
  | 'email'          // Email input with validation
  | 'phone'          // Phone number input
  | 'url'            // URL input with validation
  | 'boolean'        // Checkbox (true/false)
  | 'select'         // Dropdown with predefined options
  | 'multiselect'    // Multiple selection dropdown
  | 'radio'          // Radio button group
  | 'date'           // Date picker
  | 'datetime'       // Date and time picker
  | 'time'           // Time picker
  | 'file'           // File upload (single)
  | 'files'          // File upload (multiple)
  | 'rating'         // Star rating (1-5)
  | 'slider'         // Numeric slider
  | 'color'          // Color picker
  | 'password';      // Password input

export interface CustomFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomFieldValidation {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface CustomField {
  id: string;
  tenantId?: string;
  name: string;
  label: string;
  type: CustomFieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  validation: CustomFieldValidation;
  options?: CustomFieldOption[];  // For select, multiselect, radio
  conditional?: {
    dependsOn: string;  // Field ID this depends on
    showWhen: any;      // Value that triggers showing this field
  };
  order: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface CustomFieldSet {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  fields: CustomField[];
  appliesTo: string[];  // Form contexts where this field set applies
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// Extended ticket interfaces to include custom field data
export interface CustomFieldValue {
  fieldId: string;
  value: any;
}

export interface TicketWithCustomFields {
  customFields?: CustomFieldValue[];
}

// Form contexts where custom fields can be applied
export type FormContext = 
  | 'ticket_creation'
  | 'ticket_edit'
  | 'user_registration'
  | 'project_creation'
  | 'task_creation';

// Configuration for custom fields in the app
export interface CustomFieldsConfig {
  enabledContexts: FormContext[];
  maxFieldsPerSet: number;
  maxOptionsPerField: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  enableConditionalFields: boolean;
}

// UI-specific types for field management
export interface CustomFieldFormData {
  name: string;
  label: string;
  type: CustomFieldType;
  description: string;
  placeholder: string;
  defaultValue: any;
  validation: {
    required: boolean;
    minLength: string;
    maxLength: string;
    min: string;
    max: string;
    pattern: string;
    customMessage: string;
  };
  options: { value: string; label: string }[];
  conditional: {
    enabled: boolean;
    dependsOn: string;
    showWhen: string;
  };
}

// Error types for validation
export interface CustomFieldError {
  fieldId: string;
  message: string;
  type: 'required' | 'invalid' | 'min' | 'max' | 'pattern' | 'custom';
}

// Default field configurations for common use cases
export const DEFAULT_FIELD_CONFIGS: Record<CustomFieldType, Partial<CustomField>> = {
  text: {
    validation: { required: false, maxLength: 255 }
  },
  textarea: {
    validation: { required: false, maxLength: 2000 }
  },
  number: {
    validation: { required: false }
  },
  email: {
    validation: { required: false, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
  },
  phone: {
    validation: { required: false, pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$' }
  },
  url: {
    validation: { required: false, pattern: '^https?:\\/\\/.+' }
  },
  boolean: {
    validation: { required: false },
    defaultValue: false
  },
  select: {
    validation: { required: false },
    options: []
  },
  multiselect: {
    validation: { required: false },
    options: [],
    defaultValue: []
  },
  radio: {
    validation: { required: false },
    options: []
  },
  date: {
    validation: { required: false }
  },
  datetime: {
    validation: { required: false }
  },
  time: {
    validation: { required: false }
  },
  file: {
    validation: { required: false }
  },
  files: {
    validation: { required: false },
    defaultValue: []
  },
  rating: {
    validation: { required: false, min: 1, max: 5 },
    defaultValue: 0
  },
  slider: {
    validation: { required: false, min: 0, max: 100 },
    defaultValue: 0
  },
  color: {
    validation: { required: false },
    defaultValue: '#000000'
  },
  password: {
    validation: { required: false, minLength: 8 }
  }
};

// Field type metadata for UI
export const FIELD_TYPE_METADATA: Record<CustomFieldType, {
  label: string;
  description: string;
  icon: string;
  category: 'basic' | 'advanced' | 'media' | 'date';
  supportsOptions: boolean;
  supportsValidation: string[];
}> = {
  text: {
    label: 'Text Input',
    description: 'Single line text field',
    icon: 'Type',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  textarea: {
    label: 'Text Area',
    description: 'Multi-line text field',
    icon: 'FileText',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength']
  },
  number: {
    label: 'Number',
    description: 'Numeric input field',
    icon: 'Hash',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  email: {
    label: 'Email',
    description: 'Email address input',
    icon: 'Mail',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'pattern']
  },
  phone: {
    label: 'Phone',
    description: 'Phone number input',
    icon: 'Phone',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'pattern']
  },
  url: {
    label: 'URL',
    description: 'Website URL input',
    icon: 'Link',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'pattern']
  },
  boolean: {
    label: 'Checkbox',
    description: 'True/false checkbox',
    icon: 'Check',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  select: {
    label: 'Dropdown',
    description: 'Single selection dropdown',
    icon: 'ChevronDown',
    category: 'basic',
    supportsOptions: true,
    supportsValidation: ['required']
  },
  multiselect: {
    label: 'Multi-Select',
    description: 'Multiple selection dropdown',
    icon: 'List',
    category: 'advanced',
    supportsOptions: true,
    supportsValidation: ['required']
  },
  radio: {
    label: 'Radio Buttons',
    description: 'Single selection radio group',
    icon: 'Circle',
    category: 'basic',
    supportsOptions: true,
    supportsValidation: ['required']
  },
  date: {
    label: 'Date',
    description: 'Date picker',
    icon: 'Calendar',
    category: 'date',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  datetime: {
    label: 'Date & Time',
    description: 'Date and time picker',
    icon: 'Clock',
    category: 'date',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  time: {
    label: 'Time',
    description: 'Time picker',
    icon: 'Clock',
    category: 'date',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  file: {
    label: 'File Upload',
    description: 'Single file upload',
    icon: 'Upload',
    category: 'media',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  files: {
    label: 'Multiple Files',
    description: 'Multiple file upload',
    icon: 'UploadCloud',
    category: 'media',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  rating: {
    label: 'Star Rating',
    description: '1-5 star rating',
    icon: 'Star',
    category: 'advanced',
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  slider: {
    label: 'Slider',
    description: 'Numeric slider input',
    icon: 'Sliders',
    category: 'advanced',
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  color: {
    label: 'Color Picker',
    description: 'Color selection input',
    icon: 'Palette',
    category: 'advanced',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  password: {
    label: 'Password',
    description: 'Password input field',
    icon: 'Lock',
    category: 'basic',
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength', 'pattern']
  }
};