/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Compatibility utilities for transitioning from single-tenant to multi-tenant
 */

// Flag to enable backward compatibility mode
export const ENABLE_BACKWARD_COMPATIBILITY = true;

/**
 * Modifies Firestore queries to work with or without tenant filtering
 */
export const makeQueryTenantCompatible = (
  baseQuery: any,
  tenantId?: string,
  tenantField: string = 'tenantId'
) => {
  // If tenant filtering is disabled or no tenantId provided, return original query
  if (!ENABLE_BACKWARD_COMPATIBILITY && !tenantId) {
    return baseQuery;
  }

  // If tenantId is provided, add tenant filtering
  if (tenantId) {
    return baseQuery.where(tenantField, '==', tenantId);
  }

  // Return original query for backward compatibility
  return baseQuery;
};

/**
 * Creates document data that's compatible with both single and multi-tenant modes
 */
export const createTenantCompatibleData = (
  data: any,
  tenantId?: string
): any => {
  if (!ENABLE_BACKWARD_COMPATIBILITY && !tenantId) {
    throw new Error('Tenant ID is required');
  }

  // Always include tenantId if provided (for forward compatibility)
  if (tenantId) {
    return { ...data, tenantId };
  }

  // In backward compatibility mode, don't require tenantId
  return data;
};

/**
 * Filters results by tenant if tenant filtering is enabled
 */
export const filterResultsByTenant = <T extends { tenantId?: string }>(
  results: T[],
  tenantId?: string
): T[] => {
  // If no tenant filtering needed, return all results
  if (!tenantId) {
    return results;
  }

  // Filter by tenant, but also include items without tenantId for backward compatibility
  return results.filter(item => 
    !item.tenantId || item.tenantId === tenantId
  );
};

/**
 * Migration status tracking
 */
let migrationStatus: 'pending' | 'running' | 'completed' | 'error' = 'pending';

export const getMigrationStatus = () => migrationStatus;
export const setMigrationStatus = (status: typeof migrationStatus) => {
  migrationStatus = status;
};

/**
 * Temporary disable tenant enforcement for migration
 */
let tenantEnforcementDisabled = false;

export const disableTenantEnforcement = () => {
  tenantEnforcementDisabled = true;
};

export const enableTenantEnforcement = () => {
  tenantEnforcementDisabled = false;
};

export const isTenantEnforcementDisabled = () => tenantEnforcementDisabled;