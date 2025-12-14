/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { DefaultField, DEFAULT_FORM_FIELDS } from '../types/defaultFields';
import { FormContext } from '../types/customFields';

const COLLECTION_NAME = 'defaultFormFields';

export interface StoredDefaultField extends DefaultField {
  context: FormContext;
  updatedAt: number;
}

/**
 * Initialize default fields for a context if they don't exist
 */
export const initializeDefaultFields = async (context: FormContext, tenantId?: string): Promise<void> => {
  const docId = tenantId ? `${context}_${tenantId}` : context;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    const defaultFieldsWithContext: StoredDefaultField[] = DEFAULT_FORM_FIELDS.map(field => ({
      ...field,
      context,
      updatedAt: Date.now()
    }));
    
    await setDoc(docRef, {
      fields: defaultFieldsWithContext,
      tenantId,
      lastUpdated: Date.now(),
      version: 1
    });
  }
};

/**
 * Get default fields for a specific context
 */
export const getDefaultFields = async (context: FormContext, tenantId?: string): Promise<DefaultField[]> => {
  await initializeDefaultFields(context, tenantId);
  
  const docId = tenantId ? `${context}_${tenantId}` : context;
  const docRef = doc(db, COLLECTION_NAME, docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return data.fields || [];
  }
  
  return DEFAULT_FORM_FIELDS;
};

/**
 * Update a default field's configuration
 */
export const updateDefaultField = async (
  context: FormContext,
  fieldId: string,
  updates: Partial<DefaultField>,
  tenantId?: string
): Promise<void> => {
  const fields = await getDefaultFields(context, tenantId);
  const updatedFields = fields.map(field => 
    field.id === fieldId 
      ? { ...field, ...updates, updatedAt: Date.now() }
      : field
  );
  
  const docId = tenantId ? `${context}_${tenantId}` : context;
  const docRef = doc(db, COLLECTION_NAME, docId);
  await updateDoc(docRef, {
    fields: updatedFields,
    lastUpdated: Date.now()
  });
};

/**
 * Hide/show a default field
 */
export const toggleDefaultFieldVisibility = async (
  context: FormContext,
  fieldId: string,
  isActive: boolean,
  tenantId?: string
): Promise<void> => {
  await updateDefaultField(context, fieldId, { isActive }, tenantId);
};

/**
 * Update field order
 */
export const reorderDefaultFields = async (
  context: FormContext,
  fieldIds: string[],
  tenantId?: string
): Promise<void> => {
  const fields = await getDefaultFields(context, tenantId);
  const reorderedFields = fieldIds.map((id, index) => {
    const field = fields.find(f => f.id === id);
    if (field) {
      return { ...field, order: index + 1, updatedAt: Date.now() };
    }
    return null;
  }).filter(Boolean) as DefaultField[];
  
  const docId = tenantId ? `${context}_${tenantId}` : context;
  const docRef = doc(db, COLLECTION_NAME, docId);
  await updateDoc(docRef, {
    fields: reorderedFields,
    lastUpdated: Date.now()
  });
};

/**
 * Reset default fields to system defaults
 */
export const resetDefaultFields = async (context: FormContext, tenantId?: string): Promise<void> => {
  const defaultFieldsWithContext: StoredDefaultField[] = DEFAULT_FORM_FIELDS.map(field => ({
    ...field,
    context,
    updatedAt: Date.now()
  }));
  
  const docId = tenantId ? `${context}_${tenantId}` : context;
  const docRef = doc(db, COLLECTION_NAME, docId);
  await setDoc(docRef, {
    fields: defaultFieldsWithContext,
    tenantId,
    lastUpdated: Date.now(),
    version: 1
  });
};

/**
 * Get all visible fields (default + custom) for a context
 */
export const getAllFormFields = async (context: FormContext, tenantId?: string): Promise<{
  defaultFields: DefaultField[];
  customFields: any[];
}> => {
  const [defaultFields, customFieldsModule] = await Promise.all([
    getDefaultFields(context, tenantId),
    import('./customFieldsService')
  ]);
  
  const customFields = await customFieldsModule.getCustomFieldsForContext(context, tenantId);
  
  return {
    defaultFields: defaultFields.filter(f => f.isActive).sort((a, b) => a.order - b.order),
    customFields: customFields.filter(f => f.isActive).sort((a, b) => a.order - b.order)
  };
};

/**
 * Update the label of a default field
 */
export const updateDefaultFieldLabel = async (
  context: FormContext,
  fieldId: string,
  label: string,
  tenantId?: string
): Promise<void> => {
  await updateDefaultField(context, fieldId, { label }, tenantId);
};

/**
 * Update the validation rules for a default field
 */
export const updateDefaultFieldValidation = async (
  context: FormContext,
  fieldId: string,
  validation: DefaultField['validation'],
  tenantId?: string
): Promise<void> => {
  await updateDefaultField(context, fieldId, { validation }, tenantId);
};

/**
 * Update the options for a select/radio default field
 */
export const updateDefaultFieldOptions = async (
  context: FormContext,
  fieldId: string,
  options: DefaultField['options'],
  tenantId?: string
): Promise<void> => {
  await updateDefaultField(context, fieldId, { options }, tenantId);
};