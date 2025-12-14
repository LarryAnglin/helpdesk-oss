/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { NotificationPreferences } from './notifications';

export type UserRole = 'user' | 'tech' | 'company_admin' | 'organization_admin' | 'system_admin' | 'super_admin';

export interface UserTenantMembership {
  tenantId: string;
  role: UserRole;
  joinedAt: number;
  invitedBy?: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  tenantMemberships: UserTenantMembership[];
  currentTenantId?: string;
  createdAt: number;
  disabled?: boolean;
  notificationPreferences?: NotificationPreferences;
  organizationId?: string; // Organization this user belongs to
  companyId?: string; // Company this user belongs to (within organization)
}

export interface UserFormData {
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  disabled?: boolean;
  organizationId?: string;
  companyId?: string;
}