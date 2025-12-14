/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  getStorage 
} from 'firebase/storage';
import { db } from './firebaseConfig';
import { Company, CompanyFormData } from '../types/company';

const COMPANIES_COLLECTION = 'companies';
const LOGO_STORAGE_PATH = 'company-logos';

// Maximum logo file size: 5MB
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
// Allowed logo file types
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

/**
 * Validate logo file
 */
export const validateLogoFile = (file: File): string | null => {
  if (file.size > MAX_LOGO_SIZE) {
    return 'Logo file size must be less than 5MB';
  }
  
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return 'Logo must be a JPEG, PNG, or SVG file';
  }
  
  return null;
};

/**
 * Upload company logo to Firebase Storage
 */
export const uploadCompanyLogo = async (companyId: string, file: File): Promise<{ url: string; filename: string }> => {
  console.log('uploadCompanyLogo: Starting upload for companyId:', companyId, 'file:', file.name);
  
  const error = validateLogoFile(file);
  if (error) {
    console.error('uploadCompanyLogo: File validation failed:', error);
    throw new Error(error);
  }

  const storage = getStorage();
  const filename = `${companyId}_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${LOGO_STORAGE_PATH}/${filename}`);
  
  console.log('uploadCompanyLogo: Storage reference path:', storageRef.fullPath);
  console.log('uploadCompanyLogo: Filename:', filename);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log('uploadCompanyLogo: Upload completed, getting download URL');
    
    const url = await getDownloadURL(snapshot.ref);
    console.log('uploadCompanyLogo: Download URL obtained:', url);
    
    return { url, filename };
  } catch (error) {
    console.error('uploadCompanyLogo: Upload failed:', error);
    throw error;
  }
};

/**
 * Delete company logo from Firebase Storage
 */
export const deleteCompanyLogo = async (filename: string): Promise<void> => {
  if (!filename) return;
  
  try {
    const storage = getStorage();
    const storageRef = ref(storage, `${LOGO_STORAGE_PATH}/${filename}`);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting logo:', error);
    // Don't throw - logo might already be deleted
  }
};

/**
 * Create a new company
 */
export const createCompany = async (
  data: CompanyFormData,
  createdBy: string,
  organizationId: string
): Promise<string> => {
  console.log('createCompany: Starting with data:', { 
    companyName: data.name, 
    createdBy, 
    organizationId,
    hasLogoFile: !!data.logoFile 
  });
  
  const companyId = doc(collection(db, COMPANIES_COLLECTION)).id;
  console.log('createCompany: Generated companyId:', companyId);
  
  let logoUrl: string | undefined;
  let logoFilename: string | undefined;
  
  // Upload logo if provided
  if (data.logoFile) {
    console.log('createCompany: Uploading logo for companyId:', companyId);
    try {
      const logoData = await uploadCompanyLogo(companyId, data.logoFile);
      logoUrl = logoData.url;
      logoFilename = logoData.filename;
      console.log('createCompany: Logo upload successful:', { logoUrl, logoFilename });
    } catch (error) {
      console.error('createCompany: Logo upload failed:', error);
      throw error;
    }
  }
  
  const company: Omit<Company, 'id'> = {
    name: data.name,
    organizationId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
    settings: data.settings || {},
    isActive: true,
    userCount: 0,
    tenantIds: []
  };

  // Only include logo fields if they have values
  if (logoUrl) {
    company.logoUrl = logoUrl;
  }
  if (logoFilename) {
    company.logoFilename = logoFilename;
  }
  
  console.log('createCompany: Creating company document with data:', {
    companyId,
    name: company.name,
    organizationId: company.organizationId,
    hasLogo: !!company.logoUrl
  });
  
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    console.log('createCompany: Document reference path:', docRef.path);
    console.log('createCompany: Document reference id:', docRef.id);
    
    await setDoc(docRef, company);
    console.log('createCompany: Company document created successfully');
    
    return companyId;
  } catch (error) {
    console.error('createCompany: Failed to create company document:', error);
    throw error;
  }
};

/**
 * Update a company
 */
export const updateCompany = async (
  companyId: string,
  data: Partial<CompanyFormData>
): Promise<void> => {
  console.log('updateCompany: Starting update for companyId:', companyId, 'isEmpty:', companyId === '');
  
  if (!companyId || companyId === '') {
    throw new Error('Company ID is required and cannot be empty');
  }
  
  const updates: Partial<Company> = {
    updatedAt: Date.now()
  };
  
  if (data.name !== undefined) {
    updates.name = data.name;
  }
  
  if (data.settings !== undefined) {
    updates.settings = data.settings;
  }
  
  // Handle logo update
  if (data.logoFile) {
    // Get current company to delete old logo
    const currentCompany = await getCompany(companyId);
    
    // Upload new logo
    const logoData = await uploadCompanyLogo(companyId, data.logoFile);
    updates.logoUrl = logoData.url;
    updates.logoFilename = logoData.filename;
    
    // Delete old logo if exists
    if (currentCompany?.logoFilename) {
      await deleteCompanyLogo(currentCompany.logoFilename);
    }
  }
  
  await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), updates);
};

/**
 * Get a single company
 */
export const getCompany = async (companyId: string): Promise<Company | null> => {
  const docSnap = await getDoc(doc(db, COMPANIES_COLLECTION, companyId));
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    ...docSnap.data(),
    id: docSnap.id  // Ensure document ID overrides any id field in the data
  } as Company;
};

/**
 * Get all companies
 */
export const getAllCompanies = async (): Promise<Company[]> => {
  console.log('getAllCompanies: Starting query');
  
  const q = query(
    collection(db, COMPANIES_COLLECTION),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const companies = snapshot.docs.map(doc => {
    const data = doc.data();
    const company = {
      ...data,
      id: doc.id  // Ensure document ID overrides any id field in the data
    } as Company;
    
    console.log('getAllCompanies: Found company:', { 
      docId: doc.id, 
      companyId: company.id, 
      name: company.name,
      hasEmptyId: company.id === '',
      dataHadId: 'id' in data,
      dataId: data.id
    });
    
    return company;
  });
  
  console.log('getAllCompanies: Returning companies count:', companies.length);
  return companies;
};

/**
 * Get companies for a specific tenant
 */
export const getCompaniesByTenant = async (tenantId: string): Promise<Company[]> => {
  const q = query(
    collection(db, COMPANIES_COLLECTION),
    where('tenantIds', 'array-contains', tenantId),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id  // Ensure document ID overrides any id field in the data
  } as Company));
};

/**
 * Delete a company (soft delete)
 */
export const deleteCompany = async (companyId: string): Promise<void> => {
  await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), {
    isActive: false,
    updatedAt: Date.now()
  });
};

/**
 * Permanently delete a company
 */
export const permanentlyDeleteCompany = async (companyId: string): Promise<void> => {
  const company = await getCompany(companyId);
  
  // Delete logo if exists
  if (company?.logoFilename) {
    await deleteCompanyLogo(company.logoFilename);
  }
  
  await deleteDoc(doc(db, COMPANIES_COLLECTION, companyId));
};

/**
 * Add tenant access to a company
 */
export const addCompanyTenantAccess = async (
  companyId: string,
  tenantId: string
): Promise<void> => {
  const company = await getCompany(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  
  const tenantIds = company.tenantIds || [];
  if (!tenantIds.includes(tenantId)) {
    tenantIds.push(tenantId);
    await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), {
      tenantIds,
      updatedAt: Date.now()
    });
  }
};

/**
 * Remove tenant access from a company
 */
export const removeCompanyTenantAccess = async (
  companyId: string,
  tenantId: string
): Promise<void> => {
  const company = await getCompany(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  
  const tenantIds = (company.tenantIds || []).filter(id => id !== tenantId);
  await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), {
    tenantIds,
    updatedAt: Date.now()
  });
};

/**
 * Update company user count
 */
export const updateCompanyUserCount = async (
  companyId: string,
  userCount: number
): Promise<void> => {
  await updateDoc(doc(db, COMPANIES_COLLECTION, companyId), {
    userCount,
    updatedAt: Date.now()
  });
};