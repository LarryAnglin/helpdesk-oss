/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  Tenant,
  TenantUser,
  CreateTenantRequest,
  TENANT_PLAN_LIMITS,
  DEFAULT_TENANT_SETTINGS
} from '../types/tenant';

const TENANTS_COLLECTION = 'tenants';
const TENANT_USERS_COLLECTION = 'tenantUsers';

/**
 * Create a new tenant
 */
export const createTenant = async (tenantData: CreateTenantRequest): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    const tenant: Omit<Tenant, 'id'> = {
      name: tenantData.name,
      slug: tenantData.slug,
      status: 'trial',
      plan: tenantData.plan,
      limits: TENANT_PLAN_LIMITS[tenantData.plan],
      usage: {
        users: 0,
        tickets: 0,
        projects: 0,
        storage: 0,
        customFields: 0,
        apiCallsThisMonth: 0,
        lastUpdated: now
      },
      branding: {
        companyName: tenantData.name,
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        emailFromName: tenantData.name + ' Support',
        emailFromAddress: tenantData.ownerEmail,
        supportEmail: tenantData.ownerEmail,
        ...tenantData.branding
      },
      settings: {
        ...DEFAULT_TENANT_SETTINGS,
        ...tenantData.settings
      },
      ownerId: '', // Will be set when owner user is created
      ownerEmail: tenantData.ownerEmail,
      createdAt: now,
      updatedAt: now,
      trialEnd: Timestamp.fromMillis(now.toMillis() + (14 * 24 * 60 * 60 * 1000)), // 14 days trial
      features: {
        darkMode: true,
        notifications: true,
        fileUploads: true,
        emailIntegration: true
      }
    };

    const docRef = await addDoc(collection(db, TENANTS_COLLECTION), tenant);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};

/**
 * Get a tenant by ID
 */
export const getTenant = async (tenantId: string): Promise<Tenant | null> => {
  try {
    const docRef = doc(db, TENANTS_COLLECTION, tenantId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Tenant;
  } catch (error) {
    console.error('Error getting tenant:', error);
    throw error;
  }
};

/**
 * Get tenant by slug
 */
export const getTenantBySlug = async (slug: string): Promise<Tenant | null> => {
  try {
    const q = query(
      collection(db, TENANTS_COLLECTION),
      where('slug', '==', slug)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as Tenant;
  } catch (error) {
    console.error('Error getting tenant by slug:', error);
    throw error;
  }
};

/**
 * Update a tenant
 */
export const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<void> => {
  try {
    const docRef = doc(db, TENANTS_COLLECTION, tenantId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
};

/**
 * Get all tenants (admin only)
 */
export const getAllTenants = async (): Promise<Tenant[]> => {
  try {
    const q = query(
      collection(db, TENANTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Tenant));
  } catch (error) {
    console.error('Error getting all tenants:', error);
    throw error;
  }
};

/**
 * Get tenants for a user
 */
export const getUserTenants = async (userId: string): Promise<Tenant[]> => {
  try {
    console.log('getUserTenants: Starting for userId:', userId);
    
    // First get tenant user records for this user
    const q = query(
      collection(db, TENANT_USERS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    const tenantIds = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('getUserTenants: Found tenantUser doc:', { docId: doc.id, userId: data.userId, tenantId: data.tenantId });
      return data.tenantId;
    });
    
    console.log('getUserTenants: TenantIds found:', tenantIds);
    
    if (tenantIds.length === 0) {
      console.log('getUserTenants: No tenant IDs found, returning empty array');
      return [];
    }

    // Check for duplicate tenant IDs
    const uniqueTenantIds = [...new Set(tenantIds)];
    if (uniqueTenantIds.length !== tenantIds.length) {
      console.warn('getUserTenants: Found duplicate tenant IDs!', {
        original: tenantIds,
        unique: uniqueTenantIds
      });
    }

    // Get tenant details for each unique tenant ID
    const tenants: Tenant[] = [];
    for (const tenantId of uniqueTenantIds) {
      console.log('getUserTenants: Fetching tenant details for:', tenantId);
      const tenant = await getTenant(tenantId);
      if (tenant && (tenant.status === 'active' || tenant.status === 'trial')) {
        console.log('getUserTenants: Adding tenant:', { id: tenant.id, name: tenant.name, status: tenant.status });
        tenants.push(tenant);
      } else {
        console.log('getUserTenants: Skipping tenant (inactive or not found):', { tenantId, tenant: tenant ? { id: tenant.id, status: tenant.status } : null });
      }
    }

    console.log('getUserTenants: Final tenants array:', tenants.map(t => ({ id: t.id, name: t.name })));
    return tenants;
  } catch (error) {
    console.error('Error getting user tenants:', error);
    throw error;
  }
};

/**
 * Add user to tenant
 */
export const addUserToTenant = async (
  tenantId: string,
  userId: string,
  role: TenantUser['role'],
  invitedBy?: string
): Promise<void> => {
  try {
    const tenantUser: Omit<TenantUser, 'userId' | 'tenantId'> = {
      role,
      status: 'active',
      permissions: getDefaultPermissions(role),
      joinedAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
      invitedBy
    };

    // Use deterministic document ID to prevent duplicates
    const tenantUserDocId = `${userId}_${tenantId}`;
    await setDoc(doc(db, TENANT_USERS_COLLECTION, tenantUserDocId), {
      userId,
      tenantId,
      ...tenantUser
    }, { merge: true });

    // Update tenant user count
    await updateTenantUsage(tenantId, { users: 1 });
  } catch (error) {
    console.error('Error adding user to tenant:', error);
    throw error;
  }
};

/**
 * Remove user from tenant
 */
export const removeUserFromTenant = async (tenantId: string, userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, TENANT_USERS_COLLECTION),
      where('tenantId', '==', tenantId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Update tenant user count
    await updateTenantUsage(tenantId, { users: -1 });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    throw error;
  }
};

/**
 * Get tenant users
 */
export const getTenantUsers = async (tenantId: string): Promise<TenantUser[]> => {
  try {
    const q = query(
      collection(db, TENANT_USERS_COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('joinedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data()
    } as TenantUser));
  } catch (error) {
    console.error('Error getting tenant users:', error);
    throw error;
  }
};

/**
 * Update tenant usage statistics
 */
export const updateTenantUsage = async (
  tenantId: string,
  updates: Partial<Tenant['usage']>
): Promise<void> => {
  try {
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const newUsage = { ...tenant.usage };
    
    // Handle incremental updates
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof typeof updates];
      if (typeof value === 'number') {
        if (key === 'lastUpdated') {
          newUsage[key as keyof typeof newUsage] = value as any;
        } else {
          (newUsage as any)[key] = Math.max(0, (newUsage as any)[key] + value);
        }
      }
    });

    newUsage.lastUpdated = Timestamp.now();

    await updateTenant(tenantId, { usage: newUsage });
  } catch (error) {
    console.error('Error updating tenant usage:', error);
    throw error;
  }
};

/**
 * Check if tenant can perform action based on limits
 */
export const checkTenantLimit = async (
  tenantId: string,
  limitType: keyof Tenant['limits']
): Promise<boolean> => {
  try {
    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return false;
    }

    const limit = tenant.limits[limitType];
    
    // -1 means unlimited
    if (limit === -1) {
      return true;
    }

    const current = getCurrentUsageValue(tenant, limitType);
    return typeof current === 'number' && typeof limit === 'number' && current < limit;
  } catch (error) {
    console.error('Error checking tenant limit:', error);
    return false;
  }
};

/**
 * Get default permissions for a role
 */
const getDefaultPermissions = (role: TenantUser['role']): string[] => {
  switch (role) {
    case 'owner':
      return ['*']; // All permissions
    case 'organization_admin':
      return [
        'users.manage',
        'tickets.manage',
        'settings.manage',
        'reports.view',
        'billing.view'
      ];
    case 'tech':
      return [
        'tickets.manage',
        'tickets.assign',
        'users.view',
        'reports.view'
      ];
    case 'user':
      return [
        'tickets.create',
        'tickets.view_own',
        'tickets.reply'
      ];
    default:
      return [];
  }
};

/**
 * Helper to get current usage value
 */
const getCurrentUsageValue = (tenant: Tenant, limitType: keyof Tenant['limits']): number => {
  switch (limitType) {
    case 'users':
      return tenant.usage.users;
    case 'tickets':
      return tenant.usage.tickets;
    case 'storage':
      return tenant.usage.storage;
    case 'customFields':
      return tenant.usage.customFields;
    case 'apiCallsPerMonth':
      return tenant.usage.apiCallsThisMonth;
    default:
      return 0;
  }
};

/**
 * Delete a tenant (soft delete by setting status to expired)
 */
export const deleteTenant = async (tenantId: string): Promise<void> => {
  try {
    const docRef = doc(db, TENANTS_COLLECTION, tenantId);
    await updateDoc(docRef, {
      status: 'expired',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
};

// Export the service instance
export const tenantService = {
  createTenant,
  getTenant,
  getAllTenants,
  updateTenant,
  deleteTenant,
  getUserTenants,
  checkUsageLimit: checkTenantLimit,
  updateUsage: updateTenantUsage,
  canPerformAction: checkTenantLimit
};