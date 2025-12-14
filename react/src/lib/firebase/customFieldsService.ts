/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  CustomField,
  CustomFieldSet,
  FormContext,
  CustomFieldFormData,
} from '../types/customFields';

// Collection references
const CUSTOM_FIELDS_COLLECTION = 'customFields';
const CUSTOM_FIELD_SETS_COLLECTION = 'customFieldSets';

/**
 * Creates a new custom field
 */
export async function createCustomField(
  fieldData: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  _context: FormContext,
  userId: string,
  tenantId: string
): Promise<CustomField> {
  const now = Date.now();
  
  const field: Omit<CustomField, 'id'> = {
    ...fieldData,
    tenantId,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  const docRef = await addDoc(collection(db, CUSTOM_FIELDS_COLLECTION), field);
  
  return {
    id: docRef.id,
    ...field
  };
}

/**
 * Updates an existing custom field
 */
export async function updateCustomField(
  fieldId: string,
  updates: Partial<CustomField>
): Promise<void> {
  const fieldRef = doc(db, CUSTOM_FIELDS_COLLECTION, fieldId);
  
  await updateDoc(fieldRef, {
    ...updates,
    updatedAt: Date.now()
  });
}

/**
 * Deletes a custom field
 */
export async function deleteCustomField(fieldId: string): Promise<void> {
  const fieldRef = doc(db, CUSTOM_FIELDS_COLLECTION, fieldId);
  await deleteDoc(fieldRef);
}

/**
 * Gets all custom fields for a specific form context
 */
export async function getCustomFieldsForContext(_context: FormContext, tenantId?: string): Promise<CustomField[]> {
  try {
    // For now, we'll store fields directly with context association
    // In a more complex setup, you might use field sets
    let q;
    if (tenantId) {
      q = query(
        collection(db, CUSTOM_FIELDS_COLLECTION),
        where('tenantId', '==', tenantId),
        orderBy('order', 'asc'),
        orderBy('createdAt', 'asc')
      );
    } else {
      q = query(
        collection(db, CUSTOM_FIELDS_COLLECTION),
        orderBy('order', 'asc'),
        orderBy('createdAt', 'asc')
      );
    }

    const querySnapshot = await getDocs(q);
    const fields: CustomField[] = [];

    querySnapshot.forEach((doc) => {
      const fieldData = doc.data() as Omit<CustomField, 'id'>;
      fields.push({
        id: doc.id,
        ...fieldData
      });
    });

    // Filter active fields only for the UI
    return fields.filter(field => field.isActive);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    throw new Error('Failed to load custom fields');
  }
}

/**
 * Gets a single custom field by ID
 */
export async function getCustomField(fieldId: string): Promise<CustomField | null> {
  try {
    const fieldRef = doc(db, CUSTOM_FIELDS_COLLECTION, fieldId);
    const fieldDoc = await getDoc(fieldRef);

    if (!fieldDoc.exists()) {
      return null;
    }

    return {
      id: fieldDoc.id,
      ...fieldDoc.data() as Omit<CustomField, 'id'>
    };
  } catch (error) {
    console.error('Error fetching custom field:', error);
    throw new Error('Failed to load custom field');
  }
}

/**
 * Updates the order of custom fields (for drag-and-drop reordering)
 */
export async function reorderCustomFields(fieldUpdates: { id: string; order: number }[]): Promise<void> {
  const batch = writeBatch(db);

  fieldUpdates.forEach(({ id, order }) => {
    const fieldRef = doc(db, CUSTOM_FIELDS_COLLECTION, id);
    batch.update(fieldRef, { 
      order,
      updatedAt: Date.now()
    });
  });

  await batch.commit();
}

/**
 * Toggles the active state of a custom field
 */
export async function toggleCustomFieldActive(fieldId: string, isActive: boolean): Promise<void> {
  const fieldRef = doc(db, CUSTOM_FIELDS_COLLECTION, fieldId);
  
  await updateDoc(fieldRef, {
    isActive,
    updatedAt: Date.now()
  });
}

/**
 * Duplicates a custom field
 */
export async function duplicateCustomField(
  fieldId: string,
  userId: string,
  tenantId: string
): Promise<CustomField> {
  const originalField = await getCustomField(fieldId);
  
  if (!originalField) {
    throw new Error('Field not found');
  }

  // Create a copy with modified name and new timestamps
  const duplicatedField = await createCustomField(
    {
      name: `${originalField.name}_copy`,
      label: `${originalField.label} (Copy)`,
      type: originalField.type,
      description: originalField.description,
      placeholder: originalField.placeholder,
      defaultValue: originalField.defaultValue,
      validation: originalField.validation,
      options: originalField.options,
      conditional: originalField.conditional,
      order: originalField.order + 1,
      isActive: true
    },
    'ticket_creation', // Default context
    userId,
    tenantId
  );

  return duplicatedField;
}

/**
 * Creates a field set (group of related fields)
 */
export async function createCustomFieldSet(
  name: string,
  description: string,
  fieldIds: string[],
  appliesTo: FormContext[],
  userId: string,
  tenantId: string
): Promise<CustomFieldSet> {
  const now = Date.now();
  
  // Get the actual field objects
  const fieldPromises = fieldIds.map(id => getCustomField(id));
  const fields = (await Promise.all(fieldPromises)).filter((field): field is CustomField => field !== null);

  const fieldSet: Omit<CustomFieldSet, 'id'> = {
    name,
    description,
    fields,
    appliesTo,
    tenantId,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  const docRef = await addDoc(collection(db, CUSTOM_FIELD_SETS_COLLECTION), fieldSet);
  
  return {
    id: docRef.id,
    ...fieldSet
  };
}

/**
 * Gets custom field sets for a specific context
 */
export async function getCustomFieldSetsForContext(context: FormContext, tenantId?: string): Promise<CustomFieldSet[]> {
  try {
    let q;
    if (tenantId) {
      q = query(
        collection(db, CUSTOM_FIELD_SETS_COLLECTION),
        where('appliesTo', 'array-contains', context),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true)
      );
    } else {
      q = query(
        collection(db, CUSTOM_FIELD_SETS_COLLECTION),
        where('appliesTo', 'array-contains', context),
        where('isActive', '==', true)
      );
    }

    const querySnapshot = await getDocs(q);
    const fieldSets: CustomFieldSet[] = [];

    querySnapshot.forEach((doc) => {
      const setData = doc.data() as Omit<CustomFieldSet, 'id'>;
      fieldSets.push({
        id: doc.id,
        ...setData
      });
    });

    return fieldSets;
  } catch (error) {
    console.error('Error fetching custom field sets:', error);
    throw new Error('Failed to load custom field sets');
  }
}

/**
 * Creates default custom fields for common use cases
 */
export async function createDefaultCustomFields(
  context: FormContext,
  userId: string
): Promise<CustomField[]> {
  const defaultFields: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [];

  // Default fields for ticket creation
  if (context === 'ticket_creation') {
    defaultFields.push(
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        description: 'Which department is this ticket for?',
        validation: { required: false },
        options: [
          { value: 'it', label: 'Information Technology' },
          { value: 'hr', label: 'Human Resources' },
          { value: 'finance', label: 'Finance' },
          { value: 'operations', label: 'Operations' },
          { value: 'other', label: 'Other' }
        ],
        order: 1,
        isActive: true
      },
      {
        name: 'urgency_reason',
        label: 'Reason for Urgency',
        type: 'textarea',
        description: 'If this is urgent, please explain why',
        placeholder: 'Describe why this issue needs immediate attention...',
        validation: { required: false, maxLength: 500 },
        conditional: {
          dependsOn: 'priority', // This would need to be mapped to the main form's priority field
          showWhen: 'High'
        },
        order: 2,
        isActive: true
      },
      {
        name: 'business_hours',
        label: 'Occurred During Business Hours',
        type: 'boolean',
        description: 'Did this issue occur during normal business hours?',
        validation: { required: false },
        defaultValue: true,
        order: 3,
        isActive: true
      }
    );
  }

  // Create the fields
  const createdFields: CustomField[] = [];
  for (const fieldData of defaultFields) {
    const field = await createCustomField(fieldData, context, userId, 'default');
    createdFields.push(field);
  }

  return createdFields;
}

/**
 * Validates field configuration before saving
 */
export function validateFieldConfiguration(fieldData: CustomFieldFormData): string[] {
  const errors: string[] = [];

  // Basic validation
  if (!fieldData.name.trim()) {
    errors.push('Field name is required');
  } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldData.name)) {
    errors.push('Field name must start with a letter and contain only letters, numbers, and underscores');
  }

  if (!fieldData.label.trim()) {
    errors.push('Field label is required');
  }

  // Type-specific validation
  const typeMetadata = require('../types/customFields').FIELD_TYPE_METADATA[fieldData.type];
  if (typeMetadata?.supportsOptions && fieldData.options.length === 0) {
    errors.push('At least one option is required for this field type');
  }

  // Validate options
  fieldData.options.forEach((option, index) => {
    if (!option.value.trim()) {
      errors.push(`Option ${index + 1} value is required`);
    }
    if (!option.label.trim()) {
      errors.push(`Option ${index + 1} label is required`);
    }
  });

  // Validation rules validation
  if (fieldData.validation.minLength && fieldData.validation.maxLength) {
    const minLength = parseInt(fieldData.validation.minLength);
    const maxLength = parseInt(fieldData.validation.maxLength);
    if (minLength > maxLength) {
      errors.push('Minimum length cannot be greater than maximum length');
    }
  }

  if (fieldData.validation.min && fieldData.validation.max) {
    const min = parseFloat(fieldData.validation.min);
    const max = parseFloat(fieldData.validation.max);
    if (min > max) {
      errors.push('Minimum value cannot be greater than maximum value');
    }
  }

  return errors;
}

/**
 * Searches custom fields by name or label
 */
export async function searchCustomFields(searchTerm: string, context?: FormContext): Promise<CustomField[]> {
  try {
    // For simple implementation, get all fields and filter client-side
    // In production, you might want to use Algolia or Firestore's text search capabilities
    const fields = context 
      ? await getCustomFieldsForContext(context)
      : await getAllCustomFields();

    const searchLower = searchTerm.toLowerCase();
    
    return fields.filter(field => 
      field.name.toLowerCase().includes(searchLower) ||
      field.label.toLowerCase().includes(searchLower) ||
      field.description?.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error('Error searching custom fields:', error);
    throw new Error('Failed to search custom fields');
  }
}

/**
 * Gets all custom fields (admin function)
 */
async function getAllCustomFields(): Promise<CustomField[]> {
  const q = query(
    collection(db, CUSTOM_FIELDS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const fields: CustomField[] = [];

  querySnapshot.forEach((doc) => {
    const fieldData = doc.data() as Omit<CustomField, 'id'>;
    fields.push({
      id: doc.id,
      ...fieldData
    });
  });

  return fields;
}