/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { CustomField, CustomFieldType } from './customFields';

export interface DefaultField extends Omit<CustomField, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  id: string;
  systemField: boolean; // Cannot be deleted
  canHide: boolean; // Can be hidden but not removed
  defaultValue?: string;
  conditionalField?: string; // ID of field this depends on
  conditionalValue?: string; // Value that triggers this field to show
}

// Core fields that cannot be removed or hidden
export const CORE_REQUIRED_FIELDS: string[] = [
  'title',
  'description'
];

// Fields that can be hidden but not removed
export const HIDEABLE_REQUIRED_FIELDS: string[] = [
  'name',
  'email',
  'contactMethod'
];

export const DEFAULT_FORM_FIELDS: DefaultField[] = [
  // Core required fields
  {
    id: 'title',
    name: 'title',
    label: 'Title',
    type: 'text' as CustomFieldType,
    description: 'Brief summary of the issue',
    validation: {
      required: true
    },
    order: 1,
    isActive: true,
    systemField: true,
    canHide: false
  },
  {
    id: 'description',
    name: 'description',
    label: 'Description',
    type: 'textarea' as CustomFieldType,
    description: 'Detailed description of the problem',
    validation: {
      required: true
    },
    order: 2,
    isActive: true,
    systemField: true,
    canHide: false
  },
  
  // Priority and Status
  {
    id: 'priority',
    name: 'priority',
    label: 'Priority',
    type: 'select' as CustomFieldType,
    description: 'Issue priority level',
    defaultValue: 'Medium',
    options: [
      { value: 'None', label: 'None' },
      { value: 'Low', label: 'Low' },
      { value: 'Medium', label: 'Medium' },
      { value: 'High', label: 'High' },
      { value: 'Urgent', label: 'Urgent' }
    ],
    validation: {
      required: false
    },
    order: 3,
    isActive: true,
    systemField: false,
    canHide: true
  },
  {
    id: 'location',
    name: 'location',
    label: 'Location',
    type: 'select' as CustomFieldType,
    description: 'Where is the problem occurring?',
    defaultValue: 'RCL',
    options: [
      { value: 'RCL', label: 'RCL' },
      { value: 'RCL-EH', label: 'RCL-EH' },
      { value: 'My Home', label: 'My Home' },
      { value: 'Other', label: 'Other' }
    ],
    validation: {
      required: false
    },
    order: 4,
    isActive: true,
    systemField: false,
    canHide: true
  },
  
  // Technical information
  {
    id: 'computer',
    name: 'computer',
    label: 'Computer or Device',
    type: 'text' as CustomFieldType,
    description: 'What computer/device is having the issue?',
    placeholder: 'e.g., Dell Laptop, iPhone 12, Office Printer',
    validation: {
      required: true
    },
    order: 5,
    isActive: true,
    systemField: false,
    canHide: true
  },
  {
    id: 'isOnVpn',
    name: 'isOnVpn',
    label: 'Connected to VPN?',
    type: 'checkbox' as CustomFieldType,
    description: 'Are you connected to the company VPN?',
    defaultValue: 'false',
    validation: {
      required: false
    },
    order: 6,
    isActive: true,
    systemField: false,
    canHide: true
  },
  
  // Contact Information
  {
    id: 'name',
    name: 'name',
    label: 'Name',
    type: 'text' as CustomFieldType,
    description: 'Your full name',
    validation: {
      required: true
    },
    order: 7,
    isActive: true,
    systemField: true,
    canHide: true
  },
  {
    id: 'email',
    name: 'email',
    label: 'Email',
    type: 'email' as CustomFieldType,
    description: 'Your email address',
    validation: {
      required: true
    },
    order: 8,
    isActive: true,
    systemField: true,
    canHide: true
  },
  {
    id: 'phone',
    name: 'phone',
    label: 'Phone',
    type: 'text' as CustomFieldType,
    description: 'Your phone number (optional)',
    validation: {
      required: false
    },
    order: 9,
    isActive: true,
    systemField: false,
    canHide: true
  },
  {
    id: 'contactMethod',
    name: 'contactMethod',
    label: 'Preferred Contact Method',
    type: 'select' as CustomFieldType,
    description: 'How would you prefer to be contacted?',
    defaultValue: 'email',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'text', label: 'Text' }
    ],
    validation: {
      required: false
    },
    order: 10,
    isActive: true,
    systemField: true,
    canHide: true
  },
  
  // Problem details
  {
    id: 'isPersonHavingProblem',
    name: 'isPersonHavingProblem',
    label: 'Are you the person having the problem?',
    type: 'checkbox' as CustomFieldType,
    description: 'Check if you are experiencing the issue yourself',
    defaultValue: 'true',
    validation: {
      required: false
    },
    order: 11,
    isActive: true,
    systemField: false,
    canHide: true
  },
  {
    id: 'errorMessage',
    name: 'errorMessage',
    label: 'Error Message (if any)',
    type: 'textarea' as CustomFieldType,
    description: 'Any error messages you see',
    placeholder: 'Copy and paste any error messages here',
    validation: {
      required: false
    },
    order: 12,
    isActive: true,
    systemField: false,
    canHide: true
  },
  {
    id: 'stepsToReproduce',
    name: 'stepsToReproduce',
    label: 'Steps to Reproduce',
    type: 'textarea' as CustomFieldType,
    description: 'How can we reproduce this issue?',
    placeholder: '1. First I did...\n2. Then I clicked...\n3. The problem occurred when...',
    validation: {
      required: false
    },
    order: 13,
    isActive: true,
    systemField: false,
    canHide: true
  },
  
  // Conditional fields
  {
    id: 'userName',
    name: 'userName',
    label: "User's Name",
    type: 'text' as CustomFieldType,
    description: 'Name of the person experiencing the problem',
    validation: {
      required: false
    },
    order: 14,
    isActive: true,
    systemField: false,
    canHide: true,
    conditionalField: 'isPersonHavingProblem',
    conditionalValue: 'false'
  },
  {
    id: 'userEmail',
    name: 'userEmail',
    label: "User's Email",
    type: 'email' as CustomFieldType,
    description: 'Email of the person experiencing the problem',
    validation: {
      required: false
    },
    order: 15,
    isActive: true,
    systemField: false,
    canHide: true,
    conditionalField: 'isPersonHavingProblem',
    conditionalValue: 'false'
  },
  {
    id: 'userPhone',
    name: 'userPhone',
    label: "User's Phone",
    type: 'text' as CustomFieldType,
    description: 'Phone number of the person experiencing the problem',
    validation: {
      required: false
    },
    order: 16,
    isActive: true,
    systemField: false,
    canHide: true,
    conditionalField: 'isPersonHavingProblem',
    conditionalValue: 'false'
  },
  {
    id: 'impact',
    name: 'impact',
    label: 'Impact on Business',
    type: 'textarea' as CustomFieldType,
    description: 'Describe the impact this issue is having on guest satisfaction or corporate financials',
    placeholder: 'This is affecting our ability to...',
    validation: {
      required: true
    },
    order: 17,
    isActive: true,
    systemField: false,
    canHide: true,
    conditionalField: 'priority',
    conditionalValue: 'High'
  }
];

export interface FormFieldConfiguration {
  defaultFields: DefaultField[];
  customFields: CustomField[];
}

export const getFieldById = (fields: DefaultField[], id: string): DefaultField | undefined => {
  return fields.find(field => field.id === id);
};

export const canDeleteField = (field: DefaultField): boolean => {
  return !field.systemField && !CORE_REQUIRED_FIELDS.includes(field.id);
};

export const canHideField = (field: DefaultField): boolean => {
  return field.canHide && !CORE_REQUIRED_FIELDS.includes(field.id);
};