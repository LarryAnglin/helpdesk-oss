/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  getDocs, 
  writeBatch, 
  query,
  where,
  limit,
  addDoc,
  serverTimestamp,
  doc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { auth } from '../firebase/firebaseConfig';
import { tenantService } from '../firebase/tenantService';
import { CreateTenantRequest } from '../types/tenant';

export interface MigrationStatus {
  completed: boolean;
  error?: string;
  details: {
    defaultTenantCreated: boolean;
    usersUpdated: number;
    ticketsUpdated: number;
    projectsUpdated: number;
    otherCollectionsUpdated: string[];
  };
}

export class TenantMigration {
  private defaultTenantId: string | null = null;

  /**
   * Run the complete migration process
   */
  async runMigration(): Promise<MigrationStatus> {
    console.log('Starting tenant migration...');
    
    const status: MigrationStatus = {
      completed: false,
      details: {
        defaultTenantCreated: false,
        usersUpdated: 0,
        ticketsUpdated: 0,
        projectsUpdated: 0,
        otherCollectionsUpdated: []
      }
    };

    try {
      // Step 1: Create default tenant
      await this.createDefaultTenant();
      status.details.defaultTenantCreated = true;

      // Step 2: Update users
      status.details.usersUpdated = await this.updateUsers();

      // Step 3: Update tickets
      status.details.ticketsUpdated = await this.updateTickets();

      // Step 4: Update projects
      status.details.projectsUpdated = await this.updateProjects();

      // Step 5: Update other collections
      const otherCollections = [
        'timeEntries',
        'timeSessions', 
        'timeCategories',
        'faqs',
        'knowledgeSources',
        'knowledgeContent',
        'customFields',
        'ticketInsights'
      ];

      for (const collectionName of otherCollections) {
        const updated = await this.updateCollection(collectionName);
        if (updated > 0) {
          status.details.otherCollectionsUpdated.push(`${collectionName}: ${updated}`);
        }
      }

      status.completed = true;
      console.log('Migration completed successfully!');
      
      // Mark migration as completed in the system collection
      await this.markMigrationCompleted();
      
    } catch (error) {
      console.error('Migration failed:', error);
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return status;
  }

  /**
   * Create a default tenant for existing data
   */
  private async createDefaultTenant(): Promise<void> {
    try {
      // Check if a default tenant already exists - look for any tenant first
      const existingTenants = await tenantService.getAllTenants();
      
      // Look for an existing "Default Organization" specifically
      const defaultOrgTenants = existingTenants.filter(t => t.name === 'Default Organization');
      
      if (defaultOrgTenants.length > 1) {
        console.warn(`Found ${defaultOrgTenants.length} "Default Organization" tenants. Cleaning up duplicates...`);
        await this.cleanupDuplicateDefaultTenants(defaultOrgTenants);
        // Re-fetch after cleanup
        const cleanedTenants = await tenantService.getAllTenants();
        const remainingDefaults = cleanedTenants.filter(t => t.name === 'Default Organization');
        this.defaultTenantId = remainingDefaults[0]?.id || cleanedTenants[0]?.id;
        console.log('Using cleaned default tenant:', this.defaultTenantId);
        return;
      }
      
      if (defaultOrgTenants.length === 1) {
        this.defaultTenantId = defaultOrgTenants[0].id;
        console.log('Using existing "Default Organization" tenant:', this.defaultTenantId);
        return;
      }
      
      if (existingTenants.length > 0) {
        this.defaultTenantId = existingTenants[0].id;
        console.log('Using existing tenant as default:', this.defaultTenantId);
        return;
      }

      // Create default tenant only if none exist
      const defaultTenantRequest: CreateTenantRequest = {
        name: 'Default Organization',
        slug: 'default',
        plan: 'professional',
        ownerEmail: auth.currentUser?.email || 'admin@default.com',
        branding: {
          primaryColor: '#1976d2',
          logoUrl: '',
          customDomain: ''
        }
      };

      this.defaultTenantId = await tenantService.createTenant(defaultTenantRequest);
      console.log('Created default tenant:', this.defaultTenantId);
    } catch (error) {
      console.error('Error creating default tenant:', error);
      throw error;
    }
  }

  /**
   * Clean up duplicate "Default Organization" tenants
   */
  private async cleanupDuplicateDefaultTenants(duplicates: any[]): Promise<void> {
    try {
      // Keep the oldest tenant (first by creation date)
      const sorted = duplicates.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return aTime - bTime;
      });
      
      const keepTenant = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`Keeping tenant ${keepTenant.id}, deleting ${toDelete.length} duplicates`);
      
      // Move all user memberships and data to the kept tenant
      for (const deleteTenant of toDelete) {
        await this.migrateTenantData(deleteTenant.id, keepTenant.id);
        // Soft delete the duplicate tenant
        await tenantService.deleteTenant(deleteTenant.id);
        console.log(`Deleted duplicate tenant: ${deleteTenant.id}`);
      }
    } catch (error) {
      console.error('Error cleaning up duplicate tenants:', error);
      throw error;
    }
  }

  /**
   * Migrate data from one tenant to another
   */
  private async migrateTenantData(fromTenantId: string, toTenantId: string): Promise<void> {
    try {
      // Move tenant user memberships
      const tenantUsersQuery = query(
        collection(db, 'tenantUsers'),
        where('tenantId', '==', fromTenantId)
      );
      const tenantUsersSnapshot = await getDocs(tenantUsersQuery);
      
      const batch = writeBatch(db);
      tenantUsersSnapshot.docs.forEach(docSnapshot => {
        // Check if membership already exists in target tenant
        const data = docSnapshot.data();
        const newDocId = `${data.userId}_${toTenantId}`;
        batch.set(doc(db, 'tenantUsers', newDocId), {
          ...data,
          tenantId: toTenantId
        });
        // Delete old membership
        batch.delete(docSnapshot.ref);
      });
      
      await batch.commit();
      console.log(`Migrated ${tenantUsersSnapshot.docs.length} user memberships from ${fromTenantId} to ${toTenantId}`);
    } catch (error) {
      console.error('Error migrating tenant data:', error);
      throw error;
    }
  }

  /**
   * Update all users to have tenant membership
   */
  private async updateUsers(): Promise<number> {
    if (!this.defaultTenantId) throw new Error('Default tenant not created');

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Skip if user already has tenant memberships
        if (userData.tenantMemberships && userData.tenantMemberships.length > 0) {
          continue;
        }

        // Add default tenant membership
        const tenantMembership = {
          tenantId: this.defaultTenantId,
          role: userData.role || 'user',
          joinedAt: userData.createdAt || Date.now(),
          status: 'active'
        };

        batch.update(userDoc.ref, {
          tenantMemberships: [tenantMembership],
          currentTenantId: this.defaultTenantId
        });

        updateCount++;
      }

      if (updateCount > 0) {
        await batch.commit();
      }

      console.log(`Updated ${updateCount} users with tenant membership`);
      return updateCount;
    } catch (error) {
      console.error('Error updating users:', error);
      throw error;
    }
  }

  /**
   * Update tickets to include tenant ID
   */
  private async updateTickets(): Promise<number> {
    if (!this.defaultTenantId) throw new Error('Default tenant not created');

    return await this.updateCollection('tickets');
  }

  /**
   * Update projects to include tenant ID
   */
  private async updateProjects(): Promise<number> {
    if (!this.defaultTenantId) throw new Error('Default tenant not created');

    return await this.updateCollection('projects');
  }

  /**
   * Generic function to update any collection with tenantId
   */
  private async updateCollection(collectionName: string): Promise<number> {
    if (!this.defaultTenantId) throw new Error('Default tenant not created');

    try {
      // Query documents without tenantId
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Skip if document already has tenantId
        if (data.tenantId) {
          continue;
        }

        batch.update(docSnapshot.ref, {
          tenantId: this.defaultTenantId
        });

        updateCount++;

        // Commit in batches of 500 (Firestore limit)
        if (updateCount % 500 === 0) {
          await batch.commit();
          console.log(`Updated ${updateCount} documents in ${collectionName}...`);
        }
      }

      if (updateCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Updated ${updateCount} documents in ${collectionName}`);
      return updateCount;
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Clean up duplicate tenants (can be called manually)
   */
  async cleanupDuplicateTenants(): Promise<void> {
    try {
      const existingTenants = await tenantService.getAllTenants();
      
      // Group tenants by name
      const tenantsByName: { [name: string]: any[] } = {};
      existingTenants.forEach(tenant => {
        if (!tenantsByName[tenant.name]) {
          tenantsByName[tenant.name] = [];
        }
        tenantsByName[tenant.name].push(tenant);
      });
      
      // Find and clean up duplicates
      for (const [name, tenants] of Object.entries(tenantsByName)) {
        if (tenants.length > 1) {
          console.warn(`Found ${tenants.length} tenants with name "${name}". Cleaning up...`);
          await this.cleanupDuplicateDefaultTenants(tenants);
        }
      }
      
      console.log('Duplicate tenant cleanup completed');
    } catch (error) {
      console.error('Error cleaning up duplicate tenants:', error);
      throw error;
    }
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // First check if migration completion is already marked
      const migrationStatusDoc = await getDocs(
        query(collection(db, 'system'), where('type', '==', 'migration_status'))
      );

      if (!migrationStatusDoc.empty) {
        const statusData = migrationStatusDoc.docs[0].data();
        if (statusData.tenantMigrationCompleted === true) {
          return false; // Migration already completed
        }
      }

      // Check if any tenant exists
      const tenants = await tenantService.getAllTenants();
      
      if (tenants.length === 0) {
        return true; // Need to create default tenant
      }

      // Check if users have tenant memberships by sampling some users
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), limit(5))
      );

      if (!usersSnapshot.empty) {
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          if (!userData.tenantMemberships || userData.tenantMemberships.length === 0) {
            return true; // Found user without tenant membership
          }
        }
      }

      // Check if tickets have tenantId by sampling some tickets
      const ticketsSnapshot = await getDocs(
        query(collection(db, 'tickets'), limit(5))
      );

      if (!ticketsSnapshot.empty) {
        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticketData = ticketDoc.data();
          if (!ticketData.tenantId) {
            return true; // Found ticket without tenantId
          }
        }
      }

      return false; // No migration needed
    } catch (error) {
      console.error('Error checking migration status:', error);
      return true; // Assume migration needed if check fails
    }
  }

  /**
   * Mark migration as completed in the system collection
   */
  private async markMigrationCompleted(): Promise<void> {
    try {
      await addDoc(collection(db, 'system'), {
        type: 'migration_status',
        tenantMigrationCompleted: true,
        completedAt: serverTimestamp(),
        completedBy: auth.currentUser?.uid || 'system'
      });
      console.log('Migration marked as completed');
    } catch (error) {
      console.error('Error marking migration as completed:', error);
      // Don't throw error - migration still succeeded even if we can't mark it
    }
  }
}

export const tenantMigration = new TenantMigration();