/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('node:crypto');

/**
 * Organization-scoped webhook delivery system
 * Handles sending webhooks with proper filtering and organization scoping
 */

/**
 * Trigger organization webhooks for a specific event
 * @param {string} eventType - The type of event (e.g., 'ticket.created')
 * @param {object} data - The event data
 * @param {object} metadata - Additional metadata (userId, source, etc.)
 */
async function triggerOrganizationWebhooks(eventType, data, metadata = {}) {
  try {
    // Determine organization from data
    const organizationId = await getOrganizationFromEventData(data);
    if (!organizationId) {
      console.error('No organizationId found for webhook trigger');
      return;
    }

    console.log(`Triggering webhooks for event ${eventType} in organization ${organizationId}`);

    // Get active webhooks for this organization that listen to this event
    const webhooksQuery = await admin.firestore()
      .collection('webhooks')
      .where('organizationId', '==', organizationId)
      .where('active', '==', true)
      .where('events', 'array-contains', eventType)
      .get();

    if (webhooksQuery.empty) {
      console.log(`No webhooks found for event ${eventType} in organization ${organizationId}`);
      return;
    }

    const deliveryPromises = [];

    // Process each webhook with filtering
    webhooksQuery.forEach(doc => {
      const webhook = { id: doc.id, ...doc.data() };
      
      // Check if webhook matches filters
      if (matchesWebhookFilters(webhook, data)) {
        deliveryPromises.push(deliverOrganizationWebhook(webhook, eventType, data, metadata));
      } else {
        console.log(`Webhook ${webhook.id} (${webhook.name}) skipped due to filters`);
      }
    });

    // Execute all deliveries concurrently
    await Promise.all(deliveryPromises);

  } catch (error) {
    console.error('Error triggering organization webhooks:', error);
  }
}

/**
 * Determine organization ID from event data
 * @param {object} data - Event data
 * @returns {string|null} Organization ID
 */
async function getOrganizationFromEventData(data) {
  // If organizationId is directly provided
  if (data.organizationId) {
    return data.organizationId;
  }

  // Try to get from user data
  if (data.submitterId || data.assigneeId || data.userId) {
    const userId = data.submitterId || data.assigneeId || data.userId;
    try {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.organizationId) {
          return userData.organizationId;
        }
      }
    } catch (error) {
      console.error('Error getting user organization:', error);
    }
  }

  // Try to get from company data
  if (data.companyId) {
    try {
      const companyDoc = await admin.firestore()
        .collection('companies')
        .doc(data.companyId)
        .get();
      
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        if (companyData.organizationId) {
          return companyData.organizationId;
        }
      }
    } catch (error) {
      console.error('Error getting company organization:', error);
    }
  }

  // Fallback: try tenantId for backward compatibility
  if (data.tenantId) {
    try {
      // Check if there's an organization with this tenantId (for migration)
      const orgQuery = await admin.firestore()
        .collection('organizations')
        .where('tenantId', '==', data.tenantId)
        .limit(1)
        .get();
      
      if (!orgQuery.empty) {
        return orgQuery.docs[0].id;
      }
    } catch (error) {
      console.error('Error getting organization from tenantId:', error);
    }
  }

  return null;
}

/**
 * Check if webhook matches event filters
 * @param {object} webhook - Webhook configuration
 * @param {object} eventData - Event data to filter
 * @returns {boolean} Whether webhook matches filters
 */
function matchesWebhookFilters(webhook, eventData) {
  const { filters } = webhook;

  if (!filters) {
    return true; // No filters means match all
  }

  // Check company filter
  if (filters.companyIds && filters.companyIds.length > 0) {
    if (!eventData.companyId || !filters.companyIds.includes(eventData.companyId)) {
      return false;
    }
  }

  // Check user filter
  if (filters.userIds && filters.userIds.length > 0) {
    const userIds = [eventData.userId, eventData.submitterId, eventData.assigneeId].filter(Boolean);
    if (!userIds.some(id => filters.userIds.includes(id))) {
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
      eventData.tags.some(eventTag => 
        eventTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (!hasMatchingTag) {
      return false;
    }
  }

  return true;
}

/**
 * Deliver a webhook to a specific endpoint
 * @param {object} webhook - The webhook configuration
 * @param {string} eventType - The event type
 * @param {object} data - The event data
 * @param {object} metadata - Additional metadata
 */
async function deliverOrganizationWebhook(webhook, eventType, data, metadata = {}) {
  const deliveryId = admin.firestore().collection('webhookDeliveries').doc().id;
  
  try {
    // Get organization information
    const orgDoc = await admin.firestore()
      .collection('organizations')
      .doc(webhook.organizationId)
      .get();
    
    const orgData = orgDoc.exists ? orgDoc.data() : { name: 'Unknown' };

    // Get company information if available
    let companyData = null;
    if (data.companyId) {
      try {
        const companyDoc = await admin.firestore()
          .collection('companies')
          .doc(data.companyId)
          .get();
        
        if (companyDoc.exists) {
          companyData = companyDoc.data();
        }
      } catch (error) {
        console.error('Error getting company data:', error);
      }
    }

    // Build webhook payload
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      webhook: {
        id: webhook.id,
        name: webhook.name
      },
      organization: {
        id: webhook.organizationId,
        name: orgData.name
      },
      data: data,
      metadata: {
        ...metadata,
        webhookScope: webhook.scope
      }
    };

    // Add company info if available
    if (companyData) {
      payload.company = {
        id: data.companyId,
        name: companyData.name
      };
    }

    // Add tenant info for backward compatibility
    if (data.tenantId) {
      payload.tenant = {
        id: data.tenantId,
        name: orgData.name // Use org name as fallback
      };
    }

    // Create delivery record
    const deliveryRecord = {
      id: deliveryId,
      webhookId: webhook.id,
      organizationId: webhook.organizationId,
      eventType: eventType,
      url: webhook.url,
      method: webhook.method,
      headers: webhook.headers,
      payload: payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: webhook.retryCount + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      companyId: data.companyId || null,
      userId: data.submitterId || data.assigneeId || data.userId || null
    };

    // Save delivery record
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .set(deliveryRecord);

    // Attempt delivery
    await attemptWebhookDelivery(deliveryId, webhook, payload);

  } catch (error) {
    console.error(`Error delivering webhook ${webhook.id}:`, error);
    
    // Update delivery record with error
    try {
      await admin.firestore()
        .collection('webhookDeliveries')
        .doc(deliveryId)
        .update({
          status: 'failed',
          error: error.message,
          attempts: 1
        });
    } catch (updateError) {
      console.error('Error updating delivery record:', updateError);
    }
  }
}

/**
 * Attempt to deliver a webhook
 * @param {string} deliveryId - Delivery record ID
 * @param {object} webhook - Webhook configuration
 * @param {object} payload - Webhook payload
 */
async function attemptWebhookDelivery(deliveryId, webhook, payload) {
  const startTime = Date.now();
  
  try {
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'HelpDesk-Webhooks/1.0',
      ...webhook.headers
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = generateSignature(JSON.stringify(payload), webhook.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    // Make HTTP request
    const response = await axios({
      method: webhook.method,
      url: webhook.url,
      data: payload,
      headers: headers,
      timeout: webhook.timeout || 30000,
      validateStatus: (status) => status < 400 // Consider 2xx and 3xx as success
    });

    const responseTime = Date.now() - startTime;

    // Update delivery record with success
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update({
        status: 'success',
        httpStatus: response.status,
        response: response.data ? JSON.stringify(response.data).substring(0, 1000) : '',
        attempts: 1,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update webhook stats
    await admin.firestore()
      .collection('webhooks')
      .doc(webhook.id)
      .update({
        successCount: admin.firestore.FieldValue.increment(1),
        lastTriggered: admin.firestore.FieldValue.serverTimestamp()
      });

    console.log(`Webhook ${webhook.id} delivered successfully in ${responseTime}ms`);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`Webhook ${webhook.id} delivery failed:`, error.message);

    let httpStatus = null;
    let errorMessage = error.message;

    if (error.response) {
      httpStatus = error.response.status;
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    }

    // Update delivery record with failure
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update({
        status: 'failed',
        httpStatus: httpStatus,
        error: errorMessage,
        attempts: 1
      });

    // Update webhook stats
    await admin.firestore()
      .collection('webhooks')
      .doc(webhook.id)
      .update({
        failureCount: admin.firestore.FieldValue.increment(1),
        lastTriggered: admin.firestore.FieldValue.serverTimestamp()
      });

    throw error;
  }
}

/**
 * Generate HMAC signature for webhook verification
 * @param {string} payload - Payload string
 * @param {string} secret - Webhook secret
 * @returns {string} HMAC signature
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Test webhook endpoint
 * @param {string} webhookId - Webhook ID to test
 */
async function testOrganizationWebhook(webhookId) {
  try {
    const webhookDoc = await admin.firestore()
      .collection('webhooks')
      .doc(webhookId)
      .get();

    if (!webhookDoc.exists) {
      throw new Error('Webhook not found');
    }

    const webhook = { id: webhookDoc.id, ...webhookDoc.data() };

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      webhook: {
        id: webhook.id,
        name: webhook.name
      },
      organization: {
        id: webhook.organizationId,
        name: 'Test Organization'
      },
      data: {
        message: 'This is a test webhook delivery',
        test: true
      },
      metadata: {
        source: 'test',
        webhookScope: webhook.scope
      }
    };

    // Attempt delivery
    const deliveryId = admin.firestore().collection('webhookDeliveries').doc().id;
    await attemptWebhookDelivery(deliveryId, webhook, testPayload);

    return {
      success: true,
      message: 'Test webhook sent successfully'
    };

  } catch (error) {
    console.error('Error testing webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  triggerOrganizationWebhooks,
  deliverOrganizationWebhook,
  testOrganizationWebhook,
  matchesWebhookFilters
};