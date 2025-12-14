/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { UserTenantMembership, UserRole } from '../types/user';

export interface TenantInvitation {
  id?: string;
  tenantId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  acceptedAt?: number;
}

export class UserTenantService {
  private invitationsCollection = 'tenantInvitations';

  /**
   * Invite a user to join a tenant
   */
  async inviteUserToTenant(
    tenantId: string,
    email: string,
    role: UserRole,
    invitedBy: string
  ): Promise<string> {
    try {
      const invitation: Omit<TenantInvitation, 'id'> = {
        tenantId,
        email: email.toLowerCase(),
        role,
        invitedBy,
        invitedAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending'
      };

      const docRef = await addDoc(collection(db, this.invitationsCollection), invitation);
      return docRef.id;
    } catch (error) {
      console.error('Error inviting user to tenant:', error);
      throw new Error('Failed to invite user to tenant');
    }
  }

  /**
   * Get pending invitations for a user email
   */
  async getPendingInvitations(email: string): Promise<TenantInvitation[]> {
    try {
      const q = query(
        collection(db, this.invitationsCollection),
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'pending'),
        where('expiresAt', '>', Date.now())
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TenantInvitation[];
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      throw new Error('Failed to get pending invitations');
    }
  }

  /**
   * Accept a tenant invitation
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // Get invitation details
      const invitationRef = doc(db, this.invitationsCollection, invitationId);
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationSnap.data() as TenantInvitation;
      
      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }

      if (invitation.expiresAt < Date.now()) {
        throw new Error('Invitation has expired');
      }

      // Add user to tenant
      await this.addUserToTenant(userId, invitation.tenantId, invitation.role, invitation.invitedBy);

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedAt: Date.now()
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Add user to tenant
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: UserRole,
    invitedBy?: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const membership: UserTenantMembership = {
        tenantId,
        role,
        joinedAt: Date.now(),
        invitedBy,
        status: 'active'
      };

      await updateDoc(userRef, {
        tenantMemberships: arrayUnion(membership)
      });
    } catch (error) {
      console.error('Error adding user to tenant:', error);
      throw new Error('Failed to add user to tenant');
    }
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const memberships: UserTenantMembership[] = userData.tenantMemberships || [];
      
      // Find the membership to remove
      const membershipToRemove = memberships.find(m => m.tenantId === tenantId);
      if (!membershipToRemove) {
        throw new Error('User is not a member of this tenant');
      }

      // Remove the membership
      await updateDoc(userRef, {
        tenantMemberships: arrayRemove(membershipToRemove),
        // Clear currentTenantId if it matches the removed tenant
        ...(userData.currentTenantId === tenantId && { currentTenantId: null })
      });
    } catch (error) {
      console.error('Error removing user from tenant:', error);
      throw new Error('Failed to remove user from tenant');
    }
  }

  /**
   * Update user role in tenant
   */
  async updateUserRoleInTenant(
    userId: string,
    tenantId: string,
    newRole: UserRole
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const memberships: UserTenantMembership[] = userData.tenantMemberships || [];
      
      // Update the membership role
      const updatedMemberships = memberships.map(membership => 
        membership.tenantId === tenantId
          ? { ...membership, role: newRole }
          : membership
      );

      await updateDoc(userRef, {
        tenantMemberships: updatedMemberships
      });
    } catch (error) {
      console.error('Error updating user role in tenant:', error);
      throw new Error('Failed to update user role in tenant');
    }
  }

  /**
   * Set user's current tenant
   */
  async setCurrentTenant(userId: string, tenantId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const memberships: UserTenantMembership[] = userData.tenantMemberships || [];
      
      // Verify user is a member of this tenant
      const isMember = memberships.some(m => m.tenantId === tenantId && m.status === 'active');
      if (!isMember) {
        throw new Error('User is not a member of this tenant');
      }

      await updateDoc(userRef, {
        currentTenantId: tenantId
      });
    } catch (error) {
      console.error('Error setting current tenant:', error);
      throw new Error('Failed to set current tenant');
    }
  }

  /**
   * Get users by tenant
   */
  async getUsersByTenant(tenantId: string): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'users'),
        where('tenantMemberships', 'array-contains', {
          tenantId,
          status: 'active'
        })
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting users by tenant:', error);
      throw new Error('Failed to get users by tenant');
    }
  }

  /**
   * Check if user has access to tenant
   */
  async hasAccessToTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const memberships: UserTenantMembership[] = userData.tenantMemberships || [];
      
      return memberships.some(m => m.tenantId === tenantId && m.status === 'active');
    } catch (error) {
      console.error('Error checking tenant access:', error);
      return false;
    }
  }
}

export const userTenantService = new UserTenantService();