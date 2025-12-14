const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('node:crypto');
const { sendTicketUpdateSMS, canSendSMS } = require('./sms-service');

/**
 * Webhook delivery system
 * Handles sending webhooks and managing delivery attempts
 */

/**
 * Trigger webhooks for a specific event
 * @param {string} eventType - The type of event (e.g., 'ticket.created')
 * @param {object} data - The event data
 * @param {object} metadata - Additional metadata (userId, source, etc.)
 */
async function triggerWebhooks(eventType, data, metadata = {}) {
  try {
    const tenantId = data.tenantId;
    if (!tenantId) {
      console.error('No tenantId provided for webhook trigger');
      return;
    }

    // Get active webhooks for this tenant that listen to this event
    const webhooksQuery = await admin.firestore()
      .collection('webhooks')
      .where('tenantId', '==', tenantId)
      .where('active', '==', true)
      .where('events', 'array-contains', eventType)
      .get();

    if (webhooksQuery.empty) {
      console.log(`No webhooks found for event ${eventType} in tenant ${tenantId}`);
      return;
    }

    const deliveryPromises = [];

    // Process each webhook
    webhooksQuery.forEach(doc => {
      const webhook = doc.data();
      deliveryPromises.push(deliverWebhook(webhook, eventType, data, metadata));
    });

    // Execute all deliveries concurrently
    await Promise.all(deliveryPromises);

    // Also send SMS notifications if applicable
    await sendSMSNotification(eventType, data, metadata);

  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Deliver a webhook to a specific endpoint
 * @param {object} webhook - The webhook configuration
 * @param {string} eventType - The event type
 * @param {object} data - The event data
 * @param {object} metadata - Additional metadata
 */
async function deliverWebhook(webhook, eventType, data, metadata = {}) {
  const deliveryId = admin.firestore().collection('webhookDeliveries').doc().id;
  
  try {
    // Get tenant information
    const tenantDoc = await admin.firestore()
      .collection('tenants')
      .doc(webhook.tenantId)
      .get();
    
    const tenantData = tenantDoc.exists ? tenantDoc.data() : { name: 'Unknown' };

    // Build webhook payload
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      webhook: {
        id: webhook.id,
        name: webhook.name
      },
      tenant: {
        id: webhook.tenantId,
        name: tenantData.name
      },
      data: data,
      metadata: {
        ...metadata,
        source: metadata.source || 'system'
      }
    };

    // Create delivery record
    const delivery = {
      id: deliveryId,
      webhookId: webhook.id,
      tenantId: webhook.tenantId,
      eventType: eventType,
      url: webhook.url,
      method: webhook.method || 'POST',
      headers: webhook.headers || {},
      payload: payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: webhook.retryCount + 1, // Initial attempt + retries
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save delivery record
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .set(delivery);

    // Attempt delivery
    await attemptDelivery(deliveryId, webhook, payload);

  } catch (error) {
    console.error('Error delivering webhook:', error);
    
    // Update delivery record with error
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update({
        status: 'failed',
        error: error.message,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
}

/**
 * Attempt to deliver a webhook
 * @param {string} deliveryId - The delivery record ID
 * @param {object} webhook - The webhook configuration
 * @param {object} payload - The payload to send
 */
async function attemptDelivery(deliveryId, webhook, payload) {
  try {
    // Get current delivery record
    const deliveryDoc = await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .get();
    
    if (!deliveryDoc.exists) {
      throw new Error('Delivery record not found');
    }

    const delivery = deliveryDoc.data();
    
    // Check if we've exceeded max attempts
    if (delivery.attempts >= delivery.maxAttempts) {
      await admin.firestore()
        .collection('webhookDeliveries')
        .doc(deliveryId)
        .update({
          status: 'failed',
          error: 'Maximum delivery attempts exceeded'
        });
      return;
    }

    // Update attempt count
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update({
        attempts: admin.firestore.FieldValue.increment(1),
        status: delivery.attempts > 0 ? 'retrying' : 'pending'
      });

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'HelpDesk-Webhooks/1.0',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Timestamp': payload.timestamp,
      ...webhook.headers
    };

    // Add signature if secret is provided
    if (webhook.secret) {
      const signature = generateSignature(JSON.stringify(payload), webhook.secret);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Signature-256'] = `sha256=${signature}`;
    }

    // Make HTTP request
    const startTime = Date.now();
    const response = await axios({
      method: webhook.method || 'POST',
      url: webhook.url,
      data: payload,
      headers: headers,
      timeout: webhook.timeout || 30000,
      validateStatus: () => true // Don't throw on HTTP error codes
    });

    const responseTime = Date.now() - startTime;
    const isSuccess = response.status >= 200 && response.status < 300;

    // Update delivery record
    const updateData = {
      httpStatus: response.status,
      response: typeof response.data === 'string' 
        ? response.data.substring(0, 1000) // Limit response size
        : JSON.stringify(response.data).substring(0, 1000),
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      responseTime: responseTime
    };

    if (isSuccess) {
      updateData.status = 'success';
      
      // Update webhook success count
      await admin.firestore()
        .collection('webhooks')
        .doc(webhook.id)
        .update({
          successCount: admin.firestore.FieldValue.increment(1),
          lastTriggered: admin.firestore.FieldValue.serverTimestamp()
        });
    } else {
      updateData.status = 'failed';
      updateData.error = `HTTP ${response.status}: ${response.statusText}`;
      
      // Update webhook failure count
      await admin.firestore()
        .collection('webhooks')
        .doc(webhook.id)
        .update({
          failureCount: admin.firestore.FieldValue.increment(1)
        });

      // Schedule retry if attempts remaining
      if (delivery.attempts < delivery.maxAttempts - 1) {
        const retryDelay = calculateRetryDelay(delivery.attempts);
        updateData.nextRetryAt = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + retryDelay)
        );
        
        // Schedule retry (in a real implementation, you'd use a task queue)
        setTimeout(() => {
          attemptDelivery(deliveryId, webhook, payload);
        }, retryDelay);
      }
    }

    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update(updateData);

  } catch (error) {
    console.error('Error in webhook delivery attempt:', error);
    
    // Update delivery record with error
    await admin.firestore()
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .update({
        status: 'failed',
        error: error.message,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update webhook failure count
    await admin.firestore()
      .collection('webhooks')
      .doc(webhook.id)
      .update({
        failureCount: admin.firestore.FieldValue.increment(1)
      });
  }
}

/**
 * Generate HMAC signature for webhook payload
 * @param {string} payload - The payload string
 * @param {string} secret - The webhook secret
 * @returns {string} The HMAC signature
 */
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Calculate retry delay using exponential backoff
 * @param {number} attempt - The attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attempt) {
  // Exponential backoff: 2^attempt seconds, with jitter
  const baseDelay = Math.pow(2, attempt) * 1000; // Convert to milliseconds
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  const maxDelay = 5 * 60 * 1000; // Cap at 5 minutes
  
  return Math.min(baseDelay + jitter, maxDelay);
}

/**
 * Test a webhook endpoint
 */
exports.testWebhook = onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { url, method = 'POST', headers = {}, secret } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Create test payload
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        webhook: {
          id: 'test',
          name: 'Test Webhook'
        },
        tenant: {
          id: 'test',
          name: 'Test Tenant'
        },
        data: {
          message: 'This is a test webhook delivery'
        },
        metadata: {
          source: 'test'
        }
      };

      // Prepare headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'HelpDesk-Webhooks/1.0',
        'X-Webhook-Event': 'webhook.test',
        'X-Webhook-Delivery': 'test-delivery',
        'X-Webhook-Timestamp': testPayload.timestamp,
        ...headers
      };

      // Add signature if secret provided
      if (secret) {
        const signature = generateSignature(JSON.stringify(testPayload), secret);
        requestHeaders['X-Webhook-Signature'] = signature;
        requestHeaders['X-Webhook-Signature-256'] = `sha256=${signature}`;
      }

      // Make test request
      const startTime = Date.now();
      const response = await axios({
        method: method,
        url: url,
        data: testPayload,
        headers: requestHeaders,
        timeout: 10000, // 10 second timeout for tests
        validateStatus: () => true
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      res.status(200).json({
        success: isSuccess,
        httpStatus: response.status,
        responseTime: responseTime,
        response: typeof response.data === 'string' 
          ? response.data.substring(0, 500)
          : JSON.stringify(response.data).substring(0, 500),
        error: isSuccess ? null : `HTTP ${response.status}: ${response.statusText}`
      });

    } catch (error) {
      res.status(200).json({
        success: false,
        httpStatus: 0,
        responseTime: 0,
        error: error.message
      });
    }
  });
});

/**
 * Send SMS notification for ticket events
 * @param {string} eventType - The type of event
 * @param {object} data - The ticket data
 * @param {object} metadata - Additional metadata
 */
async function sendSMSNotification(eventType, data, metadata = {}) {
  try {
    // Only send SMS for certain events
    const smsEvents = [
      'ticket.created',
      'ticket.updated', 
      'ticket.resolved',
      'ticket.assigned',
      'ticket.reply_added',
      'ticket.status_changed'
    ];

    if (!smsEvents.includes(eventType)) {
      return;
    }

    // Check if ticket has SMS enabled and phone number
    if (!data.smsUpdates || !data.smsPhoneNumber) {
      console.log('SMS not enabled for this ticket');
      return;
    }

    // Check SMS consent
    if (!(await canSendSMS(data.smsPhoneNumber))) {
      console.log(`No SMS consent for ${data.smsPhoneNumber}`);
      return;
    }

    // Generate appropriate message based on event type
    let message = '';
    switch (eventType) {
      case 'ticket.created':
        message = `Your ticket "${data.title}" has been submitted and assigned ID #${data.id}.`;
        break;
      case 'ticket.updated':
        message = 'Your ticket has been updated.';
        break;
      case 'ticket.resolved':
        message = 'Your ticket has been resolved! Please check your email for details.';
        break;
      case 'ticket.assigned':
        message = 'Your ticket has been assigned to a technician.';
        break;
      case 'ticket.reply_added':
        message = 'New reply added to your ticket. Check your email for details.';
        break;
      case 'ticket.status_changed':
        message = `Ticket status changed to: ${data.status}`;
        break;
      default:
        message = 'Your ticket has been updated.';
    }

    // Send SMS
    const result = await sendTicketUpdateSMS(
      data.smsPhoneNumber,
      data.id,
      message
    );

    if (result.success) {
      console.log(`SMS notification sent for ${eventType} to ${data.smsPhoneNumber}`);
    } else {
      console.error(`Failed to send SMS notification:`, result.error);
    }

  } catch (error) {
    console.error('Error sending SMS notification:', error);
  }
}

// Export the main trigger function
exports.triggerWebhooks = triggerWebhooks;
exports.deliverWebhook = deliverWebhook;
exports.attemptDelivery = attemptDelivery;
exports.sendSMSNotification = sendSMSNotification;