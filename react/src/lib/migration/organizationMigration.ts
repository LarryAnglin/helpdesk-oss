/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  getDocs, 
  writeBatch, 
  query,
  where,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { auth } from '../firebase/firebaseConfig';
import { tenantService } from '../firebase/tenantService';
import { Organization, CreateOrganizationRequest } from '../types/organization';
import { Company } from '../types/company';
import { User } from '../types/user';

export interface OrganizationMigrationStatus {
  completed: boolean;
  error?: string;
  details: {
    defaultOrganizationCreated: boolean;
    defaultCompanyCreated: boolean;
    usersUpdated: number;
    ticketsUpdated: number;
    tenantsUpdated: number;
    otherCollectionsUpdated: string[];
    organizationId: string;
    companyId: string;
  };
}

export class OrganizationMigration {
  private defaultOrganizationId: string | null = null;
  private defaultCompanyId: string | null = null;

  /**
   * Run the complete organization migration process
   */
  async runOrganizationMigration(): Promise<OrganizationMigrationStatus> {
    console.log('Starting organization migration...');
    
    const status: OrganizationMigrationStatus = {
      completed: false,
      details: {
        defaultOrganizationCreated: false,
        defaultCompanyCreated: false,
        usersUpdated: 0,
        ticketsUpdated: 0,
        tenantsUpdated: 0,
        otherCollectionsUpdated: [],
        organizationId: '',
        companyId: ''
      }
    };

    try {
      // Step 1: Create default organization
      await this.createDefaultOrganization();
      status.details.defaultOrganizationCreated = true;
      status.details.organizationId = this.defaultOrganizationId || '';

      // Step 2: Create default company
      await this.createDefaultCompany();
      status.details.defaultCompanyCreated = true;
      status.details.companyId = this.defaultCompanyId || '';

      // Step 3: Update users with organization and company assignments
      status.details.usersUpdated = await this.updateUsersWithOrgAndCompany();

      // Step 4: Update tickets with organization and company references
      status.details.ticketsUpdated = await this.updateTicketsWithOrgAndCompany();

      // Step 5: Update tenants with organization reference
      status.details.tenantsUpdated = await this.updateTenantsWithOrganization();

      // Step 6: Update other collections that might need org/company references
      const otherCollections = [
        'projects',
        'timeEntries',
        'timeSessions',
        'customFields',
        'webhooks',
        'smsMessages'
      ];

      for (const collectionName of otherCollections) {
        const updated = await this.updateCollectionWithOrgAndCompany(collectionName);
        if (updated > 0) {
          status.details.otherCollectionsUpdated.push(`${collectionName}: ${updated}`);
        }
      }

      status.completed = true;
      console.log('Organization migration completed successfully!');
      
      // Mark migration as completed
      await this.markOrganizationMigrationCompleted();
      
    } catch (error) {
      console.error('Organization migration failed:', error);
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return status;
  }

  /**
   * Create a default organization for existing data
   */
  private async createDefaultOrganization(): Promise<void> {
    try {
      // Check if default organization already exists
      const orgsSnapshot = await getDocs(
        query(collection(db, 'organizations'), where('name', '==', 'Default Organization'))
      );
      
      if (!orgsSnapshot.empty) {
        this.defaultOrganizationId = orgsSnapshot.docs[0].id;
        console.log('Using existing default organization:', this.defaultOrganizationId);
        return;
      }

      // Create default organization
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user for organization creation');

      const defaultOrgRequest: CreateOrganizationRequest = {
        name: 'Default Organization',
        description: 'Default organization for migrated data',
        billingEmail: currentUser.email || 'admin@default.com',
        timezone: 'America/New_York',
        locale: 'en-US',
        plan: 'free_trial'
      };

      const organizationData: Organization = {
        id: '', // Will be set by Firestore
        name: defaultOrgRequest.name,
        slug: 'default-organization',
        description: defaultOrgRequest.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: currentUser.uid,
        status: 'active',
        billing: {
          plan: defaultOrgRequest.plan,
          planStartDate: Date.now(),
          trialEndsAt: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days from now
          billingEmail: defaultOrgRequest.billingEmail,
          currency: 'usd'
        },
        settings: {
          timezone: defaultOrgRequest.timezone,
          locale: defaultOrgRequest.locale,
          allowUserRegistration: true,
          defaultUserRole: 'user'
        },
        userCount: 0,
        companyCount: 0,
        ticketCount: 0,
        ownerUserId: currentUser.uid,
        adminUserIds: [currentUser.uid]
      };

      const docRef = await addDoc(collection(db, 'organizations'), organizationData);
      this.defaultOrganizationId = docRef.id;
      
      console.log('Created default organization:', this.defaultOrganizationId);
    } catch (error) {
      console.error('Error creating default organization:', error);
      throw error;
    }
  }

  /**
   * Create a default company within the organization
   */
  private async createDefaultCompany(): Promise<void> {
    if (!this.defaultOrganizationId) throw new Error('Default organization not created');

    try {
      // Check if default company already exists
      const companiesSnapshot = await getDocs(
        query(collection(db, 'companies'), where('name', '==', 'Default Company'))
      );
      
      if (!companiesSnapshot.empty) {
        this.defaultCompanyId = companiesSnapshot.docs[0].id;
        console.log('Using existing default company:', this.defaultCompanyId);
        return;
      }

      // Create default company
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user for company creation');

      const defaultCompanyData: Company = {
        id: '', // Will be set by Firestore
        name: 'Default Company',
        organizationId: this.defaultOrganizationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: currentUser.uid,
        settings: {
          primaryColor: '#1976d2'
        },
        isActive: true,
        userCount: 0,
        tenantIds: [] // Will be populated later
      };

      const docRef = await addDoc(collection(db, 'companies'), defaultCompanyData);
      this.defaultCompanyId = docRef.id;
      
      console.log('Created default company:', this.defaultCompanyId);
    } catch (error) {
      console.error('Error creating default company:', error);
      throw error;
    }
  }

  /**
   * Update all users to have organization and company assignments
   */
  private async updateUsersWithOrgAndCompany(): Promise<number> {
    if (!this.defaultOrganizationId || !this.defaultCompanyId) {
      throw new Error('Default organization and company not created');
    }

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        
        // Skip if user already has organization and company assignments
        if (userData.organizationId && userData.companyId) {
          continue;
        }

        // Update user with organization and company assignments
        batch.update(userDoc.ref, {
          organizationId: this.defaultOrganizationId,
          companyId: this.defaultCompanyId,
          updatedAt: Date.now()
        });

        updateCount++;

        // Commit in batches of 500 (Firestore limit)
        if (updateCount % 500 === 0) {
          await batch.commit();
          console.log(`Updated ${updateCount} users with org/company assignments...`);
        }
      }

      if (updateCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Updated ${updateCount} users with organization and company assignments`);
      return updateCount;
    } catch (error) {
      console.error('Error updating users with org/company:', error);
      throw error;
    }
  }

  /**
   * Update tickets to include organization and company references
   */
  private async updateTicketsWithOrgAndCompany(): Promise<number> {
    if (!this.defaultOrganizationId || !this.defaultCompanyId) {
      throw new Error('Default organization and company not created');
    }

    try {
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const ticketDoc of ticketsSnapshot.docs) {
        const ticketData = ticketDoc.data();
        
        // Skip if ticket already has organization and company references
        if (ticketData.organizationId && ticketData.companyId) {
          continue;
        }

        // Update ticket with organization and company references
        batch.update(ticketDoc.ref, {
          organizationId: this.defaultOrganizationId,
          companyId: this.defaultCompanyId,
          updatedAt: Date.now()
        });

        updateCount++;

        // Commit in batches of 500 (Firestore limit)
        if (updateCount % 500 === 0) {
          await batch.commit();
          console.log(`Updated ${updateCount} tickets with org/company references...`);
        }
      }

      if (updateCount % 500 !== 0) {
        await batch.commit();
      }

      console.log(`Updated ${updateCount} tickets with organization and company references`);
      return updateCount;
    } catch (error) {
      console.error('Error updating tickets with org/company:', error);
      throw error;
    }
  }

  /**
   * Update tenants to include organization reference
   */
  private async updateTenantsWithOrganization(): Promise<number> {
    if (!this.defaultOrganizationId) {
      throw new Error('Default organization not created');
    }

    try {
      const tenants = await tenantService.getAllTenants();
      let updateCount = 0;

      for (const tenant of tenants) {
        // Skip if tenant already has organization reference
        if ((tenant as any).organizationId) {
          continue;
        }

        // Update tenant with organization reference
        const tenantDocRef = doc(db, 'tenants', tenant.id);
        await updateDoc(tenantDocRef, {
          organizationId: this.defaultOrganizationId,
          updatedAt: serverTimestamp()
        });

        updateCount++;
      }

      console.log(`Updated ${updateCount} tenants with organization reference`);
      return updateCount;
    } catch (error) {
      console.error('Error updating tenants with organization:', error);
      throw error;
    }
  }

  /**
   * Update other collections with organization and company references
   */
  private async updateCollectionWithOrgAndCompany(collectionName: string): Promise<number> {
    if (!this.defaultOrganizationId || !this.defaultCompanyId) {
      throw new Error('Default organization and company not created');
    }

    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        
        // Skip if document already has organization and company references
        if (data.organizationId && data.companyId) {
          continue;
        }

        // Only update if document has tenantId (indicating it's part of the tenant system)
        if (data.tenantId) {
          batch.update(docSnapshot.ref, {
            organizationId: this.defaultOrganizationId,
            companyId: this.defaultCompanyId,
            updatedAt: Date.now()
          });

          updateCount++;

          // Commit in batches of 500 (Firestore limit)
          if (updateCount % 500 === 0) {
            await batch.commit();
            console.log(`Updated ${updateCount} documents in ${collectionName}...`);
          }
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
   * Check if organization migration is needed
   */
  async isOrganizationMigrationNeeded(): Promise<boolean> {
    try {
      // Check if migration completion is already marked
      const migrationStatusDoc = await getDocs(
        query(collection(db, 'system'), where('type', '==', 'organization_migration_status'))
      );

      if (!migrationStatusDoc.empty) {
        const statusData = migrationStatusDoc.docs[0].data();
        if (statusData.organizationMigrationCompleted === true) {
          return false; // Migration already completed
        }
      }

      // Check if default organization exists
      const orgsSnapshot = await getDocs(
        query(collection(db, 'organizations'), where('name', '==', 'Default Organization'))
      );

      if (orgsSnapshot.empty) {
        return true; // Need to create default organization
      }

      // Check if users have organization assignments
      const usersSnapshot = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data() as User;
        if (!userData.organizationId || !userData.companyId) {
          return true; // Found user without org/company assignment
        }
      }

      return false; // No migration needed
    } catch (error) {
      console.error('Error checking organization migration status:', error);
      return true; // Assume migration needed if check fails
    }
  }

  /**
   * Mark organization migration as completed
   */
  private async markOrganizationMigrationCompleted(): Promise<void> {
    try {
      await addDoc(collection(db, 'system'), {
        type: 'organization_migration_status',
        organizationMigrationCompleted: true,
        completedAt: serverTimestamp(),
        completedBy: auth.currentUser?.uid || 'system',
        defaultOrganizationId: this.defaultOrganizationId,
        defaultCompanyId: this.defaultCompanyId
      });
      console.log('Organization migration marked as completed');
    } catch (error) {
      console.error('Error marking organization migration as completed:', error);
      // Don't throw error - migration still succeeded
    }
  }

  /**
   * Get migration status and details
   */
  async getMigrationStatus(): Promise<{
    needed: boolean;
    organizationId?: string;
    companyId?: string;
    stats?: {
      totalUsers: number;
      totalTickets: number;
      totalTenants: number;
    };
  }> {
    try {
      const needed = await this.isOrganizationMigrationNeeded();
      
      if (!needed) {
        // Get the default organization and company IDs
        const orgsSnapshot = await getDocs(
          query(collection(db, 'organizations'), where('name', '==', 'Default Organization'))
        );
        const companiesSnapshot = await getDocs(
          query(collection(db, 'companies'), where('name', '==', 'Default Company'))
        );

        return {
          needed: false,
          organizationId: orgsSnapshot.empty ? undefined : orgsSnapshot.docs[0].id,
          companyId: companiesSnapshot.empty ? undefined : companiesSnapshot.docs[0].id
        };
      }

      // Get current data stats
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      const tenants = await tenantService.getAllTenants();

      return {
        needed: true,
        stats: {
          totalUsers: usersSnapshot.size,
          totalTickets: ticketsSnapshot.size,
          totalTenants: tenants.length
        }
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return { needed: true };
    }
  }
}

export const organizationMigration = new OrganizationMigration();