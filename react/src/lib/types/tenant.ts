/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Timestamp } from 'firebase/firestore';

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired';
export type TenantPlan = 'free' | 'basic' | 'professional' | 'enterprise';

export interface TenantLimits {
  users: number;
  tickets: number;
  projects: number;
  storage: number; // in bytes
  customFields: number;
  apiCallsPerMonth: number;
}

export interface TenantUsage {
  users: number;
  tickets: number;
  projects: number;
  storage: number; // in bytes
  customFields: number;
  apiCallsThisMonth: number;
  lastUpdated: Timestamp;
}

export interface TenantBranding {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
  emailFromName: string;
  emailFromAddress: string;
  supportEmail: string;
  supportPhone?: string;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultLanguage: string;
  autoAssignTickets: boolean;
  allowPublicSubmission: boolean;
  requireUserRegistration: boolean;
  enableGuestAccess: boolean;
  sessionTimeout: number; // in minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  status: TenantStatus;
  plan: TenantPlan;
  limits: TenantLimits;
  usage: TenantUsage;
  branding: TenantBranding;
  settings: TenantSettings;
  
  // Subscription info
  subscriptionId?: string;
  subscriptionStatus?: string;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  trialEnd?: Timestamp;
  
  // Admin info
  ownerId: string; // User ID of the tenant owner
  ownerEmail: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt?: Timestamp;
  
  // Feature flags
  features: {
    [key: string]: boolean;
  };
}

export interface TenantUser {
  userId: string;
  tenantId: string;
  role: 'owner' | 'organization_admin' | 'tech' | 'user';
  status: 'active' | 'inactive' | 'pending';
  permissions: string[];
  joinedAt: Timestamp;
  lastActiveAt?: Timestamp;
  invitedBy?: string;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: 'organization_admin' | 'tech' | 'user';
  invitedBy: string;
  invitedByName: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  acceptedBy?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

// Default limits for each plan
export const TENANT_PLAN_LIMITS: Record<TenantPlan, TenantLimits> = {
  free: {
    users: 2,
    tickets: 50,
    projects: 1,
    storage: 100 * 1024 * 1024, // 100MB in bytes
    customFields: 3,
    apiCallsPerMonth: 1000
  },
  basic: {
    users: 5,
    tickets: 200,
    projects: 5,
    storage: 500 * 1024 * 1024, // 500MB in bytes
    customFields: 10,
    apiCallsPerMonth: 10000
  },
  professional: {
    users: 25,
    tickets: 1000,
    projects: 25,
    storage: 2000 * 1024 * 1024, // 2GB in bytes
    customFields: 25,
    apiCallsPerMonth: 100000
  },
  enterprise: {
    users: -1, // unlimited
    tickets: -1, // unlimited
    projects: -1, // unlimited
    storage: -1, // unlimited
    customFields: -1, // unlimited
    apiCallsPerMonth: -1 // unlimited
  }
};

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  defaultLanguage: 'en',
  autoAssignTickets: false,
  allowPublicSubmission: true,
  requireUserRegistration: false,
  enableGuestAccess: true,
  sessionTimeout: 480, // 8 hours
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  }
};

// Utility types for tenant management
export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan: TenantPlan;
  ownerEmail: string;
  branding: Partial<TenantBranding>;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
  id: string;
  name?: string;
  slug?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  branding?: Partial<TenantBranding>;
  settings?: Partial<TenantSettings>;
  features?: { [key: string]: boolean };
}

export interface TenantContextValue {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  loading: boolean;
  error: string | null;
}