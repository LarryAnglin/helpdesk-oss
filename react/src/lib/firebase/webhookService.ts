/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { 
  WebhookConfig, 
  WebhookFormData, 
  WebhookDelivery, 
  WebhookStats
} from '../types/webhook';

const WEBHOOKS_COLLECTION = 'webhooks';
const WEBHOOK_DELIVERIES_COLLECTION = 'webhookDeliveries';

/**
 * Creates a new organization webhook
 */
export const createWebhook = async (
  organizationId: string, 
  webhookData: WebhookFormData, 
  createdBy: string
): Promise<string> => {
  try {
    const webhook: Omit<WebhookConfig, 'id'> = {
      ...webhookData,
      organizationId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy,
      successCount: 0,
      failureCount: 0
    };

    const docRef = await addDoc(collection(db, WEBHOOKS_COLLECTION), webhook);
    return docRef.id;
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw new Error('Failed to create webhook');
  }
};

/**
 * Gets all webhooks for an organization
 */
export const getOrganizationWebhooks = async (organizationId: string): Promise<WebhookConfig[]> => {
  try {
    const q = query(
      collection(db, WEBHOOKS_COLLECTION),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WebhookConfig));
  } catch (error) {
    console.error('Error getting organization webhooks:', error);
    throw new Error('Failed to get webhooks');
  }
};

/**
 * Gets a specific webhook by ID
 */
export const getWebhook = async (webhookId: string): Promise<WebhookConfig | null> => {
  try {
    const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as WebhookConfig;
    }

    return null;
  } catch (error) {
    console.error('Error getting webhook:', error);
    throw new Error('Failed to get webhook');
  }
};

/**
 * Updates a webhook
 */
export const updateWebhook = async (
  webhookId: string, 
  updates: Partial<WebhookFormData>
): Promise<void> => {
  try {
    const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating webhook:', error);
    throw new Error('Failed to update webhook');
  }
};

/**
 * Deletes a webhook
 */
export const deleteWebhook = async (webhookId: string): Promise<void> => {
  try {
    const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting webhook:', error);
    throw new Error('Failed to delete webhook');
  }
};

/**
 * Toggles webhook active status
 */
export const toggleWebhookStatus = async (webhookId: string, active: boolean): Promise<void> => {
  try {
    const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
    await updateDoc(docRef, {
      active,
      status: active ? 'active' : 'inactive',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error toggling webhook status:', error);
    throw new Error('Failed to toggle webhook status');
  }
};

/**
 * Gets webhook deliveries for a specific webhook
 */
export const getWebhookDeliveries = async (
  webhookId: string, 
  limit: number = 50
): Promise<WebhookDelivery[]> => {
  try {
    const q = query(
      collection(db, WEBHOOK_DELIVERIES_COLLECTION),
      where('webhookId', '==', webhookId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WebhookDelivery));
  } catch (error) {
    console.error('Error getting webhook deliveries:', error);
    throw new Error('Failed to get webhook deliveries');
  }
};

/**
 * Gets webhook statistics
 */
export const getWebhookStats = async (webhookId: string): Promise<WebhookStats> => {
  try {
    // Get webhook to get current counts
    const webhook = await getWebhook(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Get recent deliveries for additional stats
    const deliveries = await getWebhookDeliveries(webhookId, 100);
    
    const totalDeliveries = webhook.successCount + webhook.failureCount;
    const successfulDeliveries = webhook.successCount;
    const failedDeliveries = webhook.failureCount;
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;
    
    // Calculate average response time from recent deliveries
    const successfulRecentDeliveries = deliveries.filter(d => d.status === 'success');
    const averageResponseTime = successfulRecentDeliveries.length > 0 
      ? successfulRecentDeliveries.reduce((sum, d) => {
          const deliveredAt = d.deliveredAt?.toDate?.() || new Date(d.deliveredAt);
          const createdAt = d.createdAt?.toDate?.() || new Date(d.createdAt);
          return sum + (deliveredAt.getTime() - createdAt.getTime());
        }, 0) / successfulRecentDeliveries.length
      : 0;

    const lastDelivery = webhook.lastTriggered?.toDate?.() || webhook.lastTriggered;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      averageResponseTime,
      lastDelivery,
      successRate
    };
  } catch (error) {
    console.error('Error getting webhook stats:', error);
    throw new Error('Failed to get webhook statistics');
  }
};

/**
 * Tests a webhook by sending a test payload
 */
export const testWebhook = async (webhookId: string): Promise<any> => {
  try {
    // This will call the Firebase Function to test the webhook
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/testOrganizationWebhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ webhookId }),
    });

    if (!response.ok) {
      throw new Error('Failed to test webhook');
    }

    return await response.json();
  } catch (error) {
    console.error('Error testing webhook:', error);
    throw error;
  }
};

/**
 * Validates webhook URL
 */
export const validateWebhookUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:'; // Only allow HTTPS
  } catch {
    return false;
  }
};

/**
 * Checks if a webhook matches event filters
 */
export const matchesWebhookFilters = (
  webhook: WebhookConfig,
  eventData: any
): boolean => {
  const { filters } = webhook;

  // Check company filter
  if (filters.companyIds && filters.companyIds.length > 0) {
    if (!eventData.companyId || !filters.companyIds.includes(eventData.companyId)) {
      return false;
    }
  }

  // Check user filter
  if (filters.userIds && filters.userIds.length > 0) {
    if (!eventData.userId && !eventData.submitterId && !eventData.assigneeId) {
      return false;
    }
    
    const userIds = [eventData.userId, eventData.submitterId, eventData.assigneeId].filter(Boolean);
    if (!userIds.some(id => filters.userIds!.includes(id))) {
      return false;
    }
  }

  // Check priority filter
  if (filters.priorities && filters.priorities.length > 0) {
    if (!eventData.priority || !filters.priorities.includes(eventData.priority)) {
      return false;
    }
  }

  // Check status filter
  if (filters.statuses && filters.statuses.length > 0) {
    if (!eventData.status || !filters.statuses.includes(eventData.status)) {
      return false;
    }
  }

  // Check assignee filter
  if (filters.assigneeIds && filters.assigneeIds.length > 0) {
    if (!eventData.assigneeId || !filters.assigneeIds.includes(eventData.assigneeId)) {
      return false;
    }
  }

  // Check tags filter
  if (filters.tags && filters.tags.length > 0) {
    if (!eventData.tags || !Array.isArray(eventData.tags)) {
      return false;
    }
    
    const hasMatchingTag = filters.tags.some(tag => 
      eventData.tags.some((eventTag: string) => 
        eventTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
};