/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const { 
  sendTicketCreatedNotification,
  sendTicketAssignedNotification,
  sendTicketUpdatedNotification,
  sendTicketReplyNotification,
  sendPushNotification
} = require('./push-notification-service');

/**
 * Test push notification system
 * This function allows testing of push notifications without creating actual tickets
 */
exports.testPushNotifications = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { testType, userId, ticketData } = req.body;

    if (!testType) {
      res.status(400).json({ error: 'testType is required' });
      return;
    }

    let result;

    switch (testType) {
      case 'ticket_created':
        if (!ticketData) {
          res.status(400).json({ error: 'ticketData is required for ticket_created test' });
          return;
        }
        result = await sendTicketCreatedNotification(ticketData);
        break;

      case 'ticket_assigned':
        if (!ticketData || !userId) {
          res.status(400).json({ error: 'ticketData and userId are required for ticket_assigned test' });
          return;
        }
        result = await sendTicketAssignedNotification(ticketData, userId);
        break;

      case 'ticket_updated':
        if (!ticketData) {
          res.status(400).json({ error: 'ticketData is required for ticket_updated test' });
          return;
        }
        result = await sendTicketUpdatedNotification(ticketData);
        break;

      case 'ticket_reply':
        if (!ticketData || !req.body.replyData) {
          res.status(400).json({ error: 'ticketData and replyData are required for ticket_reply test' });
          return;
        }
        result = await sendTicketReplyNotification(ticketData, req.body.replyData);
        break;

      case 'custom':
        if (!userId || !req.body.notificationType) {
          res.status(400).json({ error: 'userId and notificationType are required for custom test' });
          return;
        }
        result = await sendPushNotification(userId, req.body.notificationType, req.body.customData || {});
        break;

      default:
        res.status(400).json({ error: `Unknown test type: ${testType}` });
        return;
    }

    res.status(200).json({
      success: true,
      testType,
      result
    });

  } catch (error) {
    console.error('Error testing push notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});