/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { 
  Organization, 
  OrganizationFormData, 
  CreateOrganizationRequest,
  TRIAL_PERIOD_DAYS,
  DEFAULT_PLANS 
} from '../types/organization';

const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Generate a URL-friendly slug from organization name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Check if slug is available
 */
export const isSlugAvailable = async (slug: string, excludeId?: string): Promise<boolean> => {
  const q = query(
    collection(db, ORGANIZATIONS_COLLECTION),
    where('slug', '==', slug),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  // If no documents found, slug is available
  if (snapshot.empty) return true;
  
  // If excluding an ID (for updates), check if the found doc is the one being updated
  if (excludeId) {
    const foundDoc = snapshot.docs[0];
    return foundDoc.id === excludeId;
  }
  
  return false;
};

/**
 * Generate a unique slug for an organization
 */
export const generateUniqueSlug = async (name: string, excludeId?: string): Promise<string> => {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (!(await isSlugAvailable(slug, excludeId))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

/**
 * Create a new organization with trial period
 */
export const createOrganization = async (
  data: CreateOrganizationRequest,
  createdBy: string
): Promise<string> => {
  const orgId = doc(collection(db, ORGANIZATIONS_COLLECTION)).id;
  const slug = await generateUniqueSlug(data.name);
  
  const trialEndsAt = Date.now() + (TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  
  const organization: Omit<Organization, 'id'> = {
    name: data.name,
    slug,
    description: data.description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy,
    status: 'trial',
    billing: {
      plan: 'free_trial',
      planStartDate: Date.now(),
      trialEndsAt,
      billingEmail: data.billingEmail,
      currency: 'usd'
    },
    settings: {
      timezone: data.timezone || 'UTC',
      locale: data.locale || 'en',
      allowUserRegistration: false,
      defaultUserRole: 'user'
    },
    userCount: 1, // Creator counts as first user
    companyCount: 0,
    ticketCount: 0,
    ownerUserId: createdBy,
    adminUserIds: [createdBy]
  };
  
  await setDoc(doc(db, ORGANIZATIONS_COLLECTION, orgId), organization);
  
  return orgId;
};

/**
 * Get organization by ID
 */
export const getOrganization = async (organizationId: string): Promise<Organization | null> => {
  const docSnap = await getDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId));
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id // Ensure the document ID overrides any id field in the data
  } as Organization;
};

/**
 * Get organization by slug
 */
export const getOrganizationBySlug = async (slug: string): Promise<Organization | null> => {
  const q = query(
    collection(db, ORGANIZATIONS_COLLECTION),
    where('slug', '==', slug),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as Organization;
};

/**
 * Update organization
 */
export const updateOrganization = async (
  organizationId: string,
  updates: Partial<OrganizationFormData & { settings?: Organization['settings'] }>
): Promise<void> => {
  const updateData: Partial<Organization> = {
    updatedAt: Date.now()
  };
  
  if (updates.name !== undefined) {
    updateData.name = updates.name;
    updateData.slug = await generateUniqueSlug(updates.name, organizationId);
  }
  
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  
  if (updates.settings !== undefined) {
    updateData.settings = updates.settings;
  }
  
  await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), updateData);
};

/**
 * Update organization billing info
 */
export const updateOrganizationBilling = async (
  organizationId: string,
  billingUpdate: Partial<Organization['billing']>
): Promise<void> => {
  const org = await getOrganization(organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }
  
  const updatedBilling = {
    ...org.billing,
    ...billingUpdate
  };
  
  await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), {
    billing: updatedBilling,
    updatedAt: Date.now()
  });
};

/**
 * Update organization status
 */
export const updateOrganizationStatus = async (
  organizationId: string,
  status: Organization['status']
): Promise<void> => {
  await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), {
    status,
    updatedAt: Date.now()
  });
};

/**
 * Get organizations for a user (where user is owner or admin)
 */
export const getUserOrganizations = async (userId: string): Promise<Organization[]> => {
  // Query for organizations where user is owner
  const ownerQuery = query(
    collection(db, ORGANIZATIONS_COLLECTION),
    where('ownerUserId', '==', userId),
    orderBy('name', 'asc')
  );
  
  // Query for organizations where user is admin
  const adminQuery = query(
    collection(db, ORGANIZATIONS_COLLECTION),
    where('adminUserIds', 'array-contains', userId),
    orderBy('name', 'asc')
  );
  
  const [ownerSnapshot, adminSnapshot] = await Promise.all([
    getDocs(ownerQuery),
    getDocs(adminQuery)
  ]);
  
  const organizations = new Map<string, Organization>();
  
  // Add organizations where user is owner
  ownerSnapshot.docs.forEach(doc => {
    organizations.set(doc.id, {
      id: doc.id,
      ...doc.data()
    } as Organization);
  });
  
  // Add organizations where user is admin (avoid duplicates)
  adminSnapshot.docs.forEach(doc => {
    if (!organizations.has(doc.id)) {
      organizations.set(doc.id, {
        id: doc.id,
        ...doc.data()
      } as Organization);
    }
  });
  
  return Array.from(organizations.values());
};

/**
 * Add admin to organization
 */
export const addOrganizationAdmin = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  const org = await getOrganization(organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }
  
  if (!org.adminUserIds.includes(userId)) {
    const updatedAdmins = [...org.adminUserIds, userId];
    await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), {
      adminUserIds: updatedAdmins,
      updatedAt: Date.now()
    });
  }
};

/**
 * Remove admin from organization
 */
export const removeOrganizationAdmin = async (
  organizationId: string,
  userId: string
): Promise<void> => {
  const org = await getOrganization(organizationId);
  if (!org) {
    throw new Error('Organization not found');
  }
  
  // Cannot remove the owner
  if (org.ownerUserId === userId) {
    throw new Error('Cannot remove owner from admin list');
  }
  
  const updatedAdmins = org.adminUserIds.filter(id => id !== userId);
  await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), {
    adminUserIds: updatedAdmins,
    updatedAt: Date.now()
  });
};

/**
 * Update organization counts
 */
export const updateOrganizationCounts = async (
  organizationId: string,
  counts: Partial<Pick<Organization, 'userCount' | 'companyCount' | 'ticketCount'>>
): Promise<void> => {
  await updateDoc(doc(db, ORGANIZATIONS_COLLECTION, organizationId), {
    ...counts,
    updatedAt: Date.now()
  });
};

/**
 * Delete organization (soft delete by setting status)
 */
export const deleteOrganization = async (organizationId: string): Promise<void> => {
  await updateOrganizationStatus(organizationId, 'cancelled');
};

/**
 * Check if organization trial has expired
 */
export const isTrialExpired = (organization: Organization): boolean => {
  if (organization.billing.plan !== 'free_trial') {
    return false;
  }
  
  if (!organization.billing.trialEndsAt) {
    return false;
  }
  
  return Date.now() > organization.billing.trialEndsAt;
};

/**
 * Get days remaining in trial
 */
export const getTrialDaysRemaining = (organization: Organization): number => {
  if (organization.billing.plan !== 'free_trial' || !organization.billing.trialEndsAt) {
    return 0;
  }
  
  const msRemaining = organization.billing.trialEndsAt - Date.now();
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  
  return Math.max(0, daysRemaining);
};

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = () => {
  return DEFAULT_PLANS;
};