/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Tenant, TenantContextValue } from '../types/tenant';
import { getUserTenants, getTenant, getAllTenants } from '../firebase/tenantService';
import { tenantMigration } from '../migration/tenantMigration';
import { collection, query, limit, getDocs, where, setDoc, doc, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const TenantContext = createContext<TenantContextValue | null>(null);

// Helper function to auto-assign user to default tenant
const autoAssignToDefaultTenant = async (userId: string): Promise<void> => {
  try {
    // Find the first available tenant (default tenant)
    const tenantsQuery = query(collection(db, 'tenants'), limit(1));
    const tenantsSnapshot = await getDocs(tenantsQuery);
    
    if (!tenantsSnapshot.empty) {
      const defaultTenantId = tenantsSnapshot.docs[0].id;
      console.log('Auto-assigning user to default tenant:', { userId, defaultTenantId });
      
      // Check if user already has a membership (avoid duplicates)
      const existingMembershipQuery = query(
        collection(db, 'tenantUsers'),
        where('userId', '==', userId),
        where('tenantId', '==', defaultTenantId),
        limit(1)
      );
      const existingSnapshot = await getDocs(existingMembershipQuery);
      
      if (!existingSnapshot.empty) {
        console.log('User already has membership in default tenant');
        return;
      }
      
      const tenantUserDocId = `${userId}_${defaultTenantId}`;
      await setDoc(doc(db, 'tenantUsers', tenantUserDocId), {
        userId,
        tenantId: defaultTenantId,
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
        permissions: {
          canCreateTickets: true,
          canViewAllTickets: false,
          canManageUsers: false,
          canManageSettings: false
        }
      });
      
      console.log('Successfully auto-assigned user to default tenant');
    } else {
      throw new Error('No default tenant found');
    }
  } catch (error) {
    console.error('Error auto-assigning user to default tenant:', error);
    throw error;
  }
};

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { userData } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's tenants when user changes
  useEffect(() => {
    if (userData) {
      loadUserTenants();
    } else {
      // Clear tenant data when user logs out
      setCurrentTenant(null);
      setAvailableTenants([]);
      setLoading(false);
    }
  }, [userData]);

  // Load tenant from localStorage on mount
  useEffect(() => {
    if (userData && availableTenants.length > 0) {
      const savedTenantId = localStorage.getItem('currentTenantId');
      if (savedTenantId) {
        const savedTenant = availableTenants.find(t => t.id === savedTenantId);
        if (savedTenant) {
          setCurrentTenant(savedTenant);
          setLoading(false);
          return;
        }
      }
      
      // Default to first available tenant
      if (availableTenants.length > 0) {
        setCurrentTenant(availableTenants[0]);
        localStorage.setItem('currentTenantId', availableTenants[0].id);
      }
      setLoading(false);
    }
  }, [userData, availableTenants]);

  const loadUserTenants = async () => {
    if (!userData) return;

    try {
      setLoading(true);
      setError(null);
      
      const tenants = await getUserTenants(userData.uid);
      setAvailableTenants(tenants);
      
      // If user has no tenants, check if migration is needed or auto-assign to default tenant
      if (tenants.length === 0) {
        console.log('No tenants found for user, checking if migration is needed...');
        
        let migrationNeeded = false;
        // Only admin users can run migration
        if (userData.role === 'system_admin' || userData.role === 'super_admin') {
          try {
            migrationNeeded = await tenantMigration.isMigrationNeeded();
          } catch (migrationCheckError) {
            console.warn('Could not check migration status, proceeding with auto-assignment:', migrationCheckError);
            migrationNeeded = false;
          }
        }
        if (migrationNeeded) {
          console.log('Running tenant migration for existing data...');
          setError('Setting up tenant system for existing data...');
          
          try {
            const migrationResult = await tenantMigration.runMigration();
            if (migrationResult.completed) {
              console.log('Migration completed, reloading tenants...');
              // Reload tenants after migration
              const newTenants = await getUserTenants(userData.uid);
              setAvailableTenants(newTenants);
              setError(null);
            } else {
              setError(`Migration failed: ${migrationResult.error}`);
            }
          } catch (migrationError) {
            console.error('Migration error:', migrationError);
            setError('Failed to migrate existing data. Please contact support.');
          }
        } else {
          // Try to auto-assign to default tenant if one exists
          try {
            await autoAssignToDefaultTenant(userData.uid);
            const newTenants = await getUserTenants(userData.uid);
            if (newTenants.length > 0) {
              setAvailableTenants(newTenants);
              setError(null);
            } else {
              console.warn('Auto-assignment completed but no tenants found for user');
              setError('No tenant access found. Please contact your administrator.');
            }
          } catch (autoAssignError) {
            console.error('Auto-assign error:', autoAssignError);
            // Don't show scary error message to users, just log it
            if (autoAssignError instanceof Error && autoAssignError.message.includes('permission')) {
              console.warn('Permission issue during auto-assignment, this may be normal for new users');
              setError('Setting up your account... Please try refreshing the page.');
            } else {
              setError('No tenant access found. Please contact your administrator.');
            }
          }
        }
        setLoading(false);
        return;
      }

    } catch (err) {
      console.error('Error loading user tenants:', err);
      setError('Failed to load tenant information');
      setLoading(false);
    }
  };

  const switchTenant = useCallback(async (tenantId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const tenant = availableTenants.find(t => t.id === tenantId);
      if (!tenant) {
        // Fetch the tenant if not in available list (shouldn't happen normally)
        const fetchedTenant = await getTenant(tenantId);
        if (!fetchedTenant) {
          throw new Error('Tenant not found');
        }
        setCurrentTenant(fetchedTenant);
      } else {
        setCurrentTenant(tenant);
      }

      localStorage.setItem('currentTenantId', tenantId);
    } catch (err) {
      console.error('Error switching tenant:', err);
      setError('Failed to switch tenant');
    } finally {
      setLoading(false);
    }
  }, [availableTenants]);

  const refreshTenant = useCallback(async (): Promise<void> => {
    if (!currentTenant) return;

    try {
      const refreshedTenant = await getTenant(currentTenant.id);
      if (refreshedTenant) {
        setCurrentTenant(refreshedTenant);
        
        // Update in available tenants list too
        setAvailableTenants(prev => 
          prev.map(t => t.id === refreshedTenant.id ? refreshedTenant : t)
        );
      }
    } catch (err) {
      console.error('Error refreshing tenant:', err);
      setError('Failed to refresh tenant information');
    }
  }, [currentTenant]);

  const contextValue: TenantContextValue = {
    currentTenant,
    availableTenants,
    switchTenant,
    refreshTenant,
    loading,
    error
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Hook to check if current tenant has a specific feature
export const useTenantFeature = (feature: string): boolean => {
  const { currentTenant } = useTenant();
  return currentTenant?.features[feature] === true;
};

// Hook to check if current tenant exceeds a limit
export const useTenantLimit = (limitType: keyof Tenant['limits']): {
  limit: number;
  current: number;
  exceeded: boolean;
  percentage: number;
} => {
  const { currentTenant } = useTenant();
  
  if (!currentTenant) {
    return { limit: 0, current: 0, exceeded: false, percentage: 0 };
  }

  const limit = currentTenant.limits[limitType];
  const current = getCurrentUsage(currentTenant, limitType);
  
  // -1 means unlimited
  if (limit === -1) {
    return { limit: -1, current, exceeded: false, percentage: 0 };
  }

  const exceeded = current > limit;
  const percentage = limit > 0 ? (current / limit) * 100 : 0;

  return { limit, current, exceeded, percentage };
};

// Helper function to get current usage for a limit type
const getCurrentUsage = (tenant: Tenant, limitType: keyof Tenant['limits']): number => {
  switch (limitType) {
    case 'users':
      return tenant.usage.users;
    case 'tickets':
      return tenant.usage.tickets;
    case 'projects':
      return tenant.usage.projects;
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

// Global cleanup function for duplicate tenants
const cleanupDuplicateTenants = async (): Promise<void> => {
  try {
    console.log('🔍 Starting duplicate tenant cleanup...');
    
    // Get all tenants
    const allTenants = await getAllTenants();
    console.log(`Found ${allTenants.length} total tenants`);
    
    // Group by name to find duplicates
    const tenantsByName: { [name: string]: Tenant[] } = {};
    allTenants.forEach(tenant => {
      if (!tenantsByName[tenant.name]) {
        tenantsByName[tenant.name] = [];
      }
      tenantsByName[tenant.name].push(tenant);
    });
    
    // Find duplicates
    const duplicates = Object.entries(tenantsByName).filter(([, tenants]) => tenants.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate tenants found!');
      return;
    }
    
    console.log(`⚠️ Found ${duplicates.length} duplicate tenant name(s):`);
    duplicates.forEach(([name, tenants]) => {
      console.log(`  - "${name}": ${tenants.length} tenants`);
      tenants.forEach((tenant, i) => {
        console.log(`    ${i+1}. ID: ${tenant.id}, Status: ${tenant.status}`);
      });
    });
    
    // Clean up each set of duplicates
    for (const [name, tenants] of duplicates) {
      console.log(`\n🔧 Fixing "${name}" duplicates...`);
      
      // Sort by creation date, keep the oldest
      const sorted = tenants.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      
      const keepTenant = sorted[0];
      const deleteTenants = sorted.slice(1);
      
      console.log(`✅ Keeping tenant: ${keepTenant.id} (oldest)`);
      console.log(`❌ Will delete: ${deleteTenants.map(t => t.id).join(', ')}`);
      
      // Migrate user memberships for each duplicate
      for (const deleteTenant of deleteTenants) {
        console.log(`🔄 Migrating users from ${deleteTenant.id} to ${keepTenant.id}...`);
        
        // Get users for the tenant to be deleted
        const tenantUsersQuery = query(
          collection(db, 'tenantUsers'),
          where('tenantId', '==', deleteTenant.id)
        );
        const tenantUsersSnapshot = await getDocs(tenantUsersQuery);
        
        console.log(`  Found ${tenantUsersSnapshot.docs.length} user memberships to migrate`);
        
        if (tenantUsersSnapshot.docs.length > 0) {
          // Migrate each user membership
          const batch = writeBatch(db);
          let migratedCount = 0;
          
          for (const userDoc of tenantUsersSnapshot.docs) {
            const userData = userDoc.data();
            const newDocId = `${userData.userId}_${keepTenant.id}`;
            
            // Check if membership already exists in target tenant
            const existingMembershipQuery = query(
              collection(db, 'tenantUsers'),
              where('userId', '==', userData.userId),
              where('tenantId', '==', keepTenant.id),
              limit(1)
            );
            const existingSnapshot = await getDocs(existingMembershipQuery);
            
            if (existingSnapshot.empty) {
              // Create new membership in target tenant
              batch.set(doc(db, 'tenantUsers', newDocId), {
                ...userData,
                tenantId: keepTenant.id
              });
              migratedCount++;
            }
            
            // Delete old membership
            batch.delete(userDoc.ref);
          }
          
          if (migratedCount > 0) {
            await batch.commit();
            console.log(`  ✅ Migrated ${migratedCount} user memberships`);
          } else {
            console.log(`  ℹ️ No new memberships to migrate (users already in target tenant)`);
          }
        }
        
        // Soft delete the duplicate tenant
        await updateDoc(doc(db, 'tenants', deleteTenant.id), {
          status: 'expired',
          deletedAt: serverTimestamp(),
          deletedReason: 'Duplicate cleanup'
        });
        
        console.log(`  ✅ Soft-deleted duplicate tenant: ${deleteTenant.id}`);
      }
    }
    
    console.log('\n🎉 Cleanup completed! Please refresh the page to see changes.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Expose cleanup function globally for console access
if (typeof window !== 'undefined') {
  (window as any).cleanupDuplicateTenants = cleanupDuplicateTenants;
}