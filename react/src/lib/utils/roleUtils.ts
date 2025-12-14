/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { UserRole } from '../types/user';

// Role hierarchy levels
const roleHierarchy: Record<UserRole, number> = {
  user: 0,
  tech: 1,
  company_admin: 2,
  organization_admin: 3,
  system_admin: 4,
  super_admin: 5,
};

/**
 * Check if a user has at least the specified role level
 */
export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user has exactly the specified role
 */
export function isRole(userRole: UserRole | undefined, role: UserRole): boolean {
  return userRole === role;
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(userRole: UserRole | undefined, roles: UserRole[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    user: 'User',
    tech: 'Tech',
    company_admin: 'Company Admin',
    organization_admin: 'Organization Admin',
    system_admin: 'System Admin',
    super_admin: 'Super Admin',
  };
  return displayNames[role] || role;
}

/**
 * Check if a user can manage another user based on roles
 */
export function canManageUser(managerRole: UserRole | undefined, targetRole: UserRole): boolean {
  if (!managerRole) return false;
  
  // Super admins can manage everyone
  if (managerRole === 'super_admin') return true;
  
  // System admins can manage everyone except super admins
  if (managerRole === 'system_admin' && targetRole !== 'super_admin') return true;
  
  // Organization admins can manage company admins and below
  if (managerRole === 'organization_admin' && roleHierarchy[targetRole] <= roleHierarchy['company_admin']) return true;
  
  // Company admins can manage users and techs
  if (managerRole === 'company_admin' && (targetRole === 'user' || targetRole === 'tech')) return true;
  
  return false;
}

/**
 * Get roles that a user can assign to others
 */
export function getAssignableRoles(userRole: UserRole | undefined): UserRole[] {
  if (!userRole) return [];
  
  const allRoles: UserRole[] = ['user', 'tech', 'company_admin', 'organization_admin', 'system_admin', 'super_admin'];
  const userLevel = roleHierarchy[userRole];
  
  // Super admins can assign any role
  if (userRole === 'super_admin') return allRoles;
  
  // Others can only assign roles below their level
  return allRoles.filter(role => roleHierarchy[role] < userLevel);
}