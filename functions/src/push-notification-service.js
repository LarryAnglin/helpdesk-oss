/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');

// Notification templates matching the frontend
const NOTIFICATION_TEMPLATES = {
  ticket_created: {
    title: 'New Support Ticket',
    icon: '/icons/ticket-192.png',
    tag: 'ticket_created',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  ticket_assigned: {
    title: 'Ticket Assigned to You',
    icon: '/icons/assigned-192.png',
    tag: 'ticket_assigned',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'accept', title: 'Accept', icon: '/icons/accept.png' }
    ]
  },
  ticket_updated: {
    title: 'Ticket Updated',
    icon: '/icons/update-192.png',
    tag: 'ticket_updated',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  ticket_resolved: {
    title: 'Ticket Resolved',
    icon: '/icons/resolved-192.png',
    tag: 'ticket_resolved',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'feedback', title: 'Leave Feedback', icon: '/icons/feedback.png' }
    ]
  },
  ticket_reply: {
    title: 'New Reply on Ticket',
    icon: '/icons/reply-192.png',
    tag: 'ticket_reply',
    actions: [
      { action: 'view', title: 'View Reply', icon: '/icons/view.png' },
      { action: 'reply', title: 'Quick Reply', icon: '/icons/reply.png' }
    ]
  },
  system_alert: {
    title: 'System Alert',
    icon: '/icons/alert-192.png',
    tag: 'system_alert',
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  survey_request: {
    title: 'Feedback Requested',
    icon: '/icons/survey-192.png',
    tag: 'survey_request',
    actions: [
      { action: 'survey', title: 'Take Survey', icon: '/icons/survey.png' },
      { action: 'later', title: 'Remind Later' }
    ]
  }
};

/**
 * Get user's FCM tokens from their preferences
 */
async function getUserFCMTokens(userId) {
  try {
    const userPrefsRef = admin.firestore().collection('userPreferences').doc(userId);
    const userPrefsDoc = await userPrefsRef.get();
    
    if (!userPrefsDoc.exists) {
      console.log(`No user preferences found for user ${userId}`);
      return [];
    }
    
    const userPrefs = userPrefsDoc.data();
    const fcmTokens = userPrefs.fcmTokens || [];
    
    // Filter for active tokens
    const activeTokens = fcmTokens.filter(tokenData => 
      tokenData.isActive && 
      tokenData.token && 
      (Date.now() - tokenData.lastUsed) < (30 * 24 * 60 * 60 * 1000) // 30 days
    );
    
    return activeTokens.map(tokenData => tokenData.token);
  } catch (error) {
    console.error(`Error getting FCM tokens for user ${userId}:`, error);
    return [];
  }
}

/**
 * Check if user has push notifications enabled for a specific notification type
 */
async function isNotificationEnabled(userId, notificationType, userRole) {
  try {
    const userPrefsRef = admin.firestore().collection('userPreferences').doc(userId);
    const userPrefsDoc = await userPrefsRef.get();
    
    if (!userPrefsDoc.exists) {
      console.log(`No user preferences found for user ${userId}, defaulting to disabled`);
      return false;
    }
    
    const userPrefs = userPrefsDoc.data();
    const notifications = userPrefs.notifications || {};
    
    // Check if push notifications are globally enabled
    if (!notifications.pushEnabled) {
      console.log(`Push notifications globally disabled for user ${userId}`);
      return false;
    }
    
    // Check role-specific settings
    if (userRole === 'tech' || userRole === 'admin' || userRole === 'system_admin') {
      const techSettings = notifications.techSettings || {};
      
      switch (notificationType) {
        case 'ticket_created':
          return techSettings.newTicketCreated?.push ?? false;
        case 'ticket_assigned':
          return techSettings.ticketAssigned?.push ?? false;
        case 'ticket_updated':
          return techSettings.ticketUpdated?.push ?? false;
        case 'ticket_resolved':
          return techSettings.ticketResolved?.push ?? false;
        case 'ticket_reply':
          return techSettings.ticketReply?.push ?? false;
        default:
          return false;
      }
    } else {
      // Regular user settings
      const userSettings = notifications.userSettings || {};
      
      switch (notificationType) {
        case 'ticket_updated':
        case 'ticket_resolved':
        case 'ticket_reply':
          return userSettings.ticketUpdates?.push ?? false;
        case 'system_alert':
          return userSettings.systemAlerts?.push ?? false;
        case 'survey_request':
          return userSettings.surveys?.push ?? false;
        default:
          return false;
      }
    }
  } catch (error) {
    console.error(`Error checking notification preferences for user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notification to a user
 */
async function sendPushNotification(userId, notificationType, customData = {}) {
  try {
    // Get user data to check role
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const userRole = userData.role || 'user';
    
    // Check if notifications are enabled for this user and type
    const isEnabled = await isNotificationEnabled(userId, notificationType, userRole);
    if (!isEnabled) {
      console.log(`Push notifications disabled for user ${userId} and type ${notificationType}`);
      return { success: false, error: 'Notifications disabled' };
    }
    
    // Get FCM tokens
    const fcmTokens = await getUserFCMTokens(userId);
    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, error: 'No FCM tokens' };
    }
    
    // Get notification template
    const template = NOTIFICATION_TEMPLATES[notificationType];
    if (!template) {
      console.error(`No template found for notification type: ${notificationType}`);
      return { success: false, error: 'Template not found' };
    }
    
    // Build notification payload
    const baseUrl = 'https://your-project-id.web.app';
    const notification = {
      title: customData.title || template.title,
      body: customData.body || template.body || 'You have a new notification',
      icon: customData.icon || template.icon,
      tag: customData.tag || template.tag,
    };
    
    // Build data payload
    const data = {
      type: notificationType,
      url: customData.url || baseUrl,
      ticketId: customData.ticketId || '',
      action: customData.action || 'view',
      ...customData.data
    };
    
    // Convert all data values to strings (FCM requirement)
    const stringData = {};
    Object.keys(data).forEach(key => {
      stringData[key] = String(data[key]);
    });
    
    // Build FCM message
    const message = {
      notification,
      data: stringData,
      webpush: {
        fcmOptions: {
          link: data.url
        },
        notification: {
          ...notification,
          actions: template.actions || []
        }
      }
    };
    
    // Send to all user's devices
    const results = [];
    for (const token of fcmTokens) {
      try {
        const response = await getMessaging().send({
          ...message,
          token
        });
        results.push({ token, success: true, messageId: response });
        console.log(`Push notification sent successfully to ${userId} (token: ${token.substring(0, 20)}...)`);
      } catch (error) {
        console.error(`Error sending push notification to token ${token.substring(0, 20)}...:`, error);
        results.push({ token, success: false, error: error.message });
        
        // If token is invalid, mark it as inactive
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          await deactivateToken(userId, token);
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    return { 
      success: successCount > 0, 
      sent: successCount, 
      total: totalCount,
      results 
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deactivate an invalid FCM token
 */
async function deactivateToken(userId, token) {
  try {
    const userPrefsRef = admin.firestore().collection('userPreferences').doc(userId);
    const userPrefsDoc = await userPrefsRef.get();
    
    if (!userPrefsDoc.exists) {
      return;
    }
    
    const userPrefs = userPrefsDoc.data();
    const fcmTokens = userPrefs.fcmTokens || [];
    
    // Find and deactivate the token
    const updatedTokens = fcmTokens.map(tokenData => {
      if (tokenData.token === token) {
        return { ...tokenData, isActive: false };
      }
      return tokenData;
    });
    
    await userPrefsRef.update({ fcmTokens: updatedTokens });
    console.log(`Deactivated invalid FCM token for user ${userId}`);
  } catch (error) {
    console.error(`Error deactivating token for user ${userId}:`, error);
  }
}

/**
 * Send push notification to multiple users
 */
async function sendPushNotificationToUsers(userIds, notificationType, customData = {}) {
  const results = [];
  
  for (const userId of userIds) {
    try {
      const result = await sendPushNotification(userId, notificationType, customData);
      results.push({ userId, ...result });
    } catch (error) {
      console.error(`Error sending push notification to user ${userId}:`, error);
      results.push({ userId, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Send push notification about a new ticket
 */
async function sendTicketCreatedNotification(ticket) {
  try {
    // Get admin/tech users who should receive new ticket notifications
    const usersSnapshot = await admin.firestore().collection('users')
      .where('role', 'in', ['tech', 'admin', 'system_admin'])
      .get();
    
    const adminUserIds = usersSnapshot.docs.map(doc => doc.id);
    
    if (adminUserIds.length === 0) {
      console.log('No admin/tech users found for new ticket notification');
      return;
    }
    
    const shortId = generateShortId(ticket.id);
    const customData = {
      title: 'New Support Ticket',
      body: `${ticket.name} created ticket: ${ticket.title}`,
      ticketId: ticket.id,
      url: `https://your-project-id.web.app/tickets/${ticket.id}`,
      data: {
        priority: ticket.priority,
        submitter: ticket.name,
        shortId
      }
    };
    
    const results = await sendPushNotificationToUsers(adminUserIds, 'ticket_created', customData);
    console.log(`Sent ticket created notifications to ${results.length} admin/tech users`);
    
    return results;
  } catch (error) {
    console.error('Error sending ticket created push notifications:', error);
    return [];
  }
}

/**
 * Send push notification about ticket assignment
 */
async function sendTicketAssignedNotification(ticket, assigneeId) {
  try {
    const shortId = generateShortId(ticket.id);
    const customData = {
      title: 'Ticket Assigned to You',
      body: `You've been assigned ticket: ${ticket.title}`,
      ticketId: ticket.id,
      url: `https://your-project-id.web.app/tickets/${ticket.id}`,
      data: {
        priority: ticket.priority,
        submitter: ticket.name,
        shortId
      }
    };
    
    const result = await sendPushNotification(assigneeId, 'ticket_assigned', customData);
    console.log(`Sent ticket assignment notification to user ${assigneeId}`);
    
    return result;
  } catch (error) {
    console.error('Error sending ticket assigned push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification about ticket update
 */
async function sendTicketUpdatedNotification(ticket) {
  try {
    // Notify the submitter and any CC participants
    const recipients = [ticket.submitterId];
    
    if (ticket.participants) {
      ticket.participants.forEach(participant => {
        if (participant.userId && participant.userId !== ticket.submitterId) {
          recipients.push(participant.userId);
        }
      });
    }
    
    const shortId = generateShortId(ticket.id);
    const customData = {
      title: 'Ticket Updated',
      body: `Your ticket "${ticket.title}" has been updated`,
      ticketId: ticket.id,
      url: `https://your-project-id.web.app/tickets/${ticket.id}`,
      data: {
        status: ticket.status,
        priority: ticket.priority,
        shortId
      }
    };
    
    const results = await sendPushNotificationToUsers(recipients, 'ticket_updated', customData);
    console.log(`Sent ticket update notifications to ${results.length} users`);
    
    return results;
  } catch (error) {
    console.error('Error sending ticket updated push notifications:', error);
    return [];
  }
}

/**
 * Send push notification about new reply
 */
async function sendTicketReplyNotification(ticket, reply) {
  try {
    // Determine recipients based on who didn't write the reply
    const recipients = [];
    
    // Add submitter if they didn't write the reply
    if (ticket.submitterId !== reply.authorId) {
      recipients.push(ticket.submitterId);
    }
    
    // Add assignee if they didn't write the reply
    if (ticket.assigneeId && ticket.assigneeId !== reply.authorId) {
      recipients.push(ticket.assigneeId);
    }
    
    // Add CC participants if they didn't write the reply
    if (ticket.participants) {
      ticket.participants.forEach(participant => {
        if (participant.userId && 
            participant.userId !== reply.authorId && 
            !recipients.includes(participant.userId)) {
          recipients.push(participant.userId);
        }
      });
    }
    
    if (recipients.length === 0) {
      console.log('No recipients for ticket reply notification');
      return [];
    }
    
    const shortId = generateShortId(ticket.id);
    const customData = {
      title: 'New Reply on Ticket',
      body: `${reply.authorName} replied to: ${ticket.title}`,
      ticketId: ticket.id,
      url: `https://your-project-id.web.app/tickets/${ticket.id}`,
      data: {
        replyAuthor: reply.authorName,
        shortId
      }
    };
    
    const results = await sendPushNotificationToUsers(recipients, 'ticket_reply', customData);
    console.log(`Sent ticket reply notifications to ${results.length} users`);
    
    return results;
  } catch (error) {
    console.error('Error sending ticket reply push notifications:', error);
    return [];
  }
}

/**
 * Generate short ID from ticket ID (same logic as frontend)
 */
function generateShortId(ticketId) {
  // Create a simple hash using built-in methods
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Base62 character set
  const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // Convert hex to Base62
  let num = BigInt('0x' + positiveHash);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  result = result || '0';
  
  // Pad or truncate to exactly 6 characters
  if (result.length < 6) {
    result = result.padStart(6, BASE62_CHARS[0]);
  } else if (result.length > 6) {
    result = result.substring(0, 6);
  }
  
  return result;
}

module.exports = {
  sendPushNotification,
  sendPushNotificationToUsers,
  sendTicketCreatedNotification,
  sendTicketAssignedNotification,
  sendTicketUpdatedNotification,
  sendTicketReplyNotification
};