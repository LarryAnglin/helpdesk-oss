const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Webhook management endpoints
 * CRUD operations for webhook configurations
 */

/**
 * Create a new webhook configuration
 */
exports.createWebhook = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get user details and verify permissions
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';
      
      // Only admins can manage webhooks
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can manage webhooks' });
      }

      const {
        name,
        description,
        url,
        method = 'POST',
        headers = {},
        events = [],
        secret,
        retryCount = 3,
        timeout = 30000,
        active = true
      } = req.body;

      // Validation
      if (!name || !url || !events || events.length === 0) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, url, and events are required' 
        });
      }

      // Validate URL
      try {
        new URL(url);
      } catch (urlError) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      // Validate events
      const validEvents = [
        'ticket.created', 'ticket.updated', 'ticket.resolved', 'ticket.closed',
        'ticket.escalated', 'ticket.assigned', 'ticket.reply_added', 
        'ticket.status_changed', 'ticket.priority_changed'
      ];
      
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        return res.status(400).json({ 
          error: `Invalid events: ${invalidEvents.join(', ')}`,
          validEvents
        });
      }

      // Create webhook
      const webhookRef = admin.firestore().collection('webhooks').doc();
      const webhook = {
        id: webhookRef.id,
        tenantId: userData.currentTenantId,
        name,
        description: description || '',
        url,
        method,
        headers,
        events,
        status: 'active',
        secret,
        retryCount: Math.min(Math.max(retryCount, 0), 10), // Limit 0-10
        timeout: Math.min(Math.max(timeout, 1000), 60000), // Limit 1s-60s
        active,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
        successCount: 0,
        failureCount: 0
      };

      await webhookRef.set(webhook);

      res.status(201).json({
        success: true,
        webhook: { ...webhook, id: webhookRef.id }
      });

    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({ 
        error: 'Failed to create webhook',
        details: error.message 
      });
    }
  });
});

/**
 * Get all webhooks for the current tenant
 */
exports.getWebhooks = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get user details
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';
      
      // Only admins and techs can view webhooks
      if (userRole !== 'admin' && userRole !== 'tech') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const tenantId = userData.currentTenantId;
      
      // Get webhooks for the current tenant
      const webhooksQuery = await admin.firestore()
        .collection('webhooks')
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();

      const webhooks = [];
      webhooksQuery.forEach(doc => {
        const data = doc.data();
        // Don't expose secret in list view
        const { secret, ...webhookData } = data;
        webhooks.push({
          id: doc.id,
          ...webhookData,
          hasSecret: !!secret
        });
      });

      res.status(200).json({
        success: true,
        webhooks
      });

    } catch (error) {
      console.error('Error getting webhooks:', error);
      res.status(500).json({ 
        error: 'Failed to get webhooks',
        details: error.message 
      });
    }
  });
});

/**
 * Update an existing webhook
 */
exports.updateWebhook = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get user details
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';
      
      // Only admins can update webhooks
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can update webhooks' });
      }

      const webhookId = req.body.id;
      if (!webhookId) {
        return res.status(400).json({ error: 'Webhook ID is required' });
      }

      // Get existing webhook
      const webhookDoc = await admin.firestore()
        .collection('webhooks')
        .doc(webhookId)
        .get();

      if (!webhookDoc.exists) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const existingWebhook = webhookDoc.data();
      
      // Verify tenant ownership
      if (existingWebhook.tenantId !== userData.currentTenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const {
        name,
        description,
        url,
        method,
        headers,
        events,
        secret,
        retryCount,
        timeout,
        active
      } = req.body;

      // Build update object
      const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (url !== undefined) {
        try {
          new URL(url);
          updates.url = url;
        } catch (urlError) {
          return res.status(400).json({ error: 'Invalid URL format' });
        }
      }
      if (method !== undefined) updates.method = method;
      if (headers !== undefined) updates.headers = headers;
      if (events !== undefined) {
        // Validate events
        const validEvents = [
          'ticket.created', 'ticket.updated', 'ticket.resolved', 'ticket.closed',
          'ticket.escalated', 'ticket.assigned', 'ticket.reply_added', 
          'ticket.status_changed', 'ticket.priority_changed'
        ];
        
        const invalidEvents = events.filter(event => !validEvents.includes(event));
        if (invalidEvents.length > 0) {
          return res.status(400).json({ 
            error: `Invalid events: ${invalidEvents.join(', ')}`,
            validEvents
          });
        }
        updates.events = events;
      }
      if (secret !== undefined) updates.secret = secret;
      if (retryCount !== undefined) updates.retryCount = Math.min(Math.max(retryCount, 0), 10);
      if (timeout !== undefined) updates.timeout = Math.min(Math.max(timeout, 1000), 60000);
      if (active !== undefined) updates.active = active;

      // Update webhook
      await admin.firestore()
        .collection('webhooks')
        .doc(webhookId)
        .update(updates);

      // Get updated webhook
      const updatedDoc = await admin.firestore()
        .collection('webhooks')
        .doc(webhookId)
        .get();

      const updatedWebhook = updatedDoc.data();
      const { secret: _, ...responseData } = updatedWebhook;

      res.status(200).json({
        success: true,
        webhook: { ...responseData, hasSecret: !!updatedWebhook.secret }
      });

    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ 
        error: 'Failed to update webhook',
        details: error.message 
      });
    }
  });
});

/**
 * Delete a webhook
 */
exports.deleteWebhook = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get user details
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';
      
      // Only admins can delete webhooks
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can delete webhooks' });
      }

      const webhookId = req.query.id || req.body.id;
      if (!webhookId) {
        return res.status(400).json({ error: 'Webhook ID is required' });
      }

      // Get existing webhook
      const webhookDoc = await admin.firestore()
        .collection('webhooks')
        .doc(webhookId)
        .get();

      if (!webhookDoc.exists) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const webhook = webhookDoc.data();
      
      // Verify tenant ownership
      if (webhook.tenantId !== userData.currentTenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete webhook
      await admin.firestore()
        .collection('webhooks')
        .doc(webhookId)
        .delete();

      res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({ 
        error: 'Failed to delete webhook',
        details: error.message 
      });
    }
  });
});