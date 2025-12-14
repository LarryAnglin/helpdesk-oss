/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

const getTwilioClient = () => {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phoneNumber) {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, assume US number and add +1
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      throw new Error('Invalid phone number format');
    }
  }
  
  return cleaned;
}

/**
 * Create or update SMS preferences for a phone number
 */
async function createSMSPreference(phoneNumber, ticketId, userInfo = {}) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const db = admin.firestore();
    
    // Check if preference already exists
    const existingQuery = await db.collection('smsPreferences')
      .where('phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!existingQuery.empty) {
      // Update existing preference
      const doc = existingQuery.docs[0];
      const existingData = doc.data();
      
      await doc.ref.update({
        ticketIds: admin.firestore.FieldValue.arrayUnion(ticketId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Update user info if provided
        ...(userInfo.userId && { userId: userInfo.userId }),
        ...(userInfo.userName && { userName: userInfo.userName }),
        ...(userInfo.userEmail && { userEmail: userInfo.userEmail })
      });
      
      return doc.id;
    } else {
      // Create new preference
      const newPreference = {
        tenantId: userInfo.tenantId,
        phoneNumber: normalizedPhone,
        status: 'pending',
        ticketIds: [ticketId],
        messageCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...userInfo
      };
      
      const docRef = await db.collection('smsPreferences').add(newPreference);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating SMS preference:', error);
    throw error;
  }
}

/**
 * Get SMS preferences for a phone number
 */
async function getSMSPreference(phoneNumber) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const db = admin.firestore();
    
    const query = await db.collection('smsPreferences')
      .where('phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (query.empty) {
      return null;
    }
    
    const doc = query.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Error getting SMS preference:', error);
    return null;
  }
}

/**
 * Update SMS consent status
 */
async function updateSMSConsent(phoneNumber, status, ticketId = null) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const db = admin.firestore();
    
    const query = await db.collection('smsPreferences')
      .where('phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (query.empty) {
      console.log('No SMS preference found for phone number:', normalizedPhone);
      return false;
    }
    
    const doc = query.docs[0];
    const updateData = {
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (status === 'confirmed') {
      updateData.optInDate = admin.firestore.FieldValue.serverTimestamp();
    } else if (status === 'stopped') {
      updateData.optOutDate = admin.firestore.FieldValue.serverTimestamp();
    }
    
    await doc.ref.update(updateData);
    
    // Also update all tickets for this phone number
    if (ticketId) {
      await updateTicketSMSConsent(normalizedPhone, status);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating SMS consent:', error);
    return false;
  }
}

/**
 * Update SMS consent status in all tickets for a phone number
 */
async function updateTicketSMSConsent(phoneNumber, status) {
  try {
    const db = admin.firestore();
    
    const ticketsQuery = await db.collection('tickets')
      .where('smsPhoneNumber', '==', phoneNumber)
      .get();
    
    const batch = db.batch();
    
    ticketsQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        smsConsent: status,
        smsConsentDate: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log(`Updated SMS consent for ${ticketsQuery.docs.length} tickets`);
  } catch (error) {
    console.error('Error updating ticket SMS consent:', error);
  }
}

/**
 * Check if SMS can be sent to a phone number
 */
async function canSendSMS(phoneNumber) {
  const preference = await getSMSPreference(phoneNumber);
  return preference && preference.status === 'confirmed';
}

/**
 * Send SMS message
 */
async function sendSMS(phoneNumber, message, messageType = 'ticket_update', ticketId = null) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      throw new Error('Twilio phone number not configured');
    }
    
    // Send message via Twilio
    const twilioMessage = await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedPhone
    });
    
    // Log message in database
    await logSMSMessage({
      phoneNumber: normalizedPhone,
      direction: 'outbound',
      message: message,
      status: 'sent',
      twilioMessageSid: twilioMessage.sid,
      ticketId: ticketId,
      messageType: messageType
    });
    
    // Update message count
    await incrementMessageCount(normalizedPhone);
    
    console.log(`SMS sent to ${normalizedPhone}: ${twilioMessage.sid}`);
    return { success: true, messageSid: twilioMessage.sid };
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Log failed message
    await logSMSMessage({
      phoneNumber: normalizePhoneNumber(phoneNumber),
      direction: 'outbound',
      message: message,
      status: 'failed',
      messageType: messageType,
      ticketId: ticketId,
      errorMessage: error.message
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Campaign Registry compliant SMS templates
 */
const SMS_TEMPLATES = {
  opt_in: {
    message: '{companyName} Help Desk: Reply START to receive updates for ticket #{ticketId}. Message and data rates may apply. Reply STOP to opt out anytime.',
    variables: ['companyName', 'ticketId']
  },
  confirmed: {
    message: "You're now subscribed to SMS updates for {companyName} Help Desk tickets. Reply STOP anytime to unsubscribe.",
    variables: ['companyName']
  },
  stopped: {
    message: "You've been unsubscribed from {companyName} Help Desk SMS updates. No more messages will be sent. Contact {contactInfo} for support.",
    variables: ['companyName', 'contactInfo']
  },
  ticket_created: {
    message: '{companyName} Support: Ticket #{ticketId} created - {title}. We\'ll keep you updated. Reply STOP to unsubscribe. Help: {contactInfo}',
    variables: ['companyName', 'ticketId', 'title', 'contactInfo']
  },
  ticket_updated: {
    message: '{companyName} Support: Ticket #{ticketId} updated - Status: {status}. {message} Reply STOP to opt out.',
    variables: ['companyName', 'ticketId', 'status', 'message']
  },
  ticket_resolved: {
    message: '{companyName} Support: Ticket #{ticketId} resolved! {message} Reply STOP to unsubscribe.',
    variables: ['companyName', 'ticketId', 'message']
  },
  help_response: {
    message: '{companyName} Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: {contactInfo}',
    variables: ['companyName', 'contactInfo']
  },
  // Admin notification templates
  admin_new_ticket: {
    message: '{companyName} ADMIN: New ticket #{ticketId} created by {customerName}. Priority: {priority}. Subject: {subject}. Reply STOP to unsubscribe.',
    variables: ['companyName', 'ticketId', 'customerName', 'priority', 'subject']
  },
  admin_status_change: {
    message: '{companyName} ADMIN: Ticket #{ticketId} status changed to {status}. Customer: {customerName}. Reply STOP to opt out.',
    variables: ['companyName', 'ticketId', 'status', 'customerName']
  },
  admin_ticket_closed: {
    message: '{companyName} ADMIN: Ticket #{ticketId} closed/resolved. Customer: {customerName}. Resolution: {resolution}. Reply STOP to opt out.',
    variables: ['companyName', 'ticketId', 'customerName', 'resolution']
  },
  admin_opt_in: {
    message: '{companyName} Admin SMS: Reply START to receive admin notifications for all tickets. Message rates apply. Reply STOP to opt out.',
    variables: ['companyName']
  },
  admin_confirmed: {
    message: "You're now subscribed to {companyName} admin SMS notifications. You'll receive alerts for all ticket activity. Reply STOP anytime to unsubscribe.",
    variables: ['companyName']
  },
  admin_stopped: {
    message: "You've been unsubscribed from {companyName} admin SMS notifications. No more admin alerts will be sent. Contact {contactInfo} for support.",
    variables: ['companyName', 'contactInfo']
  }
};

/**
 * Get company information for SMS templates
 */
async function getCompanyInfo(tenantId) {
  try {
    const db = admin.firestore();
    
    // First try to get tenant-specific company info
    if (tenantId) {
      const tenantDoc = await db.collection('tenants').doc(tenantId).get();
      if (tenantDoc.exists) {
        const tenantData = tenantDoc.data();
        return {
          companyName: tenantData.name || 'Help Desk',
          contactInfo: tenantData.supportEmail || process.env.SUPPORT_EMAIL || 'support@company.com'
        };
      }
    }
    
    // Fallback to default company info
    return {
      companyName: process.env.COMPANY_NAME || 'Help Desk',
      contactInfo: process.env.SUPPORT_EMAIL || 'support@company.com'
    };
  } catch (error) {
    console.error('Error getting company info:', error);
    return {
      companyName: 'Help Desk',
      contactInfo: 'support@company.com'
    };
  }
}

/**
 * Render SMS template with variables
 */
function renderSMSTemplate(templateKey, variables) {
  const template = SMS_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`SMS template not found: ${templateKey}`);
  }
  
  let message = template.message;
  
  // Replace variables in template
  if (template.variables) {
    template.variables.forEach(variable => {
      const value = variables[variable] || '';
      const placeholder = `{${variable}}`;
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });
  }
  
  return message;
}

/**
 * Send opt-in confirmation SMS (Campaign Registry compliant)
 */
async function sendOptInSMS(phoneNumber, ticketId, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('opt_in', {
      companyName: companyInfo.companyName,
      ticketId: ticketId
    });
    
    return await sendSMS(phoneNumber, message, 'opt_in', ticketId);
  } catch (error) {
    console.error('Error sending opt-in SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send confirmation SMS after opt-in (Campaign Registry compliant)
 */
async function sendConfirmationSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('confirmed', {
      companyName: companyInfo.companyName
    });
    
    return await sendSMS(phoneNumber, message, 'confirmation');
  } catch (error) {
    console.error('Error sending confirmation SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send opt-out confirmation SMS (Campaign Registry compliant)
 */
async function sendOptOutSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('stopped', {
      companyName: companyInfo.companyName,
      contactInfo: companyInfo.contactInfo
    });
    
    return await sendSMS(phoneNumber, message, 'opt_out');
  } catch (error) {
    console.error('Error sending opt-out SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send help response SMS (Campaign Registry compliant)
 */
async function sendHelpSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('help_response', {
      companyName: companyInfo.companyName,
      contactInfo: companyInfo.contactInfo
    });
    
    return await sendSMS(phoneNumber, message, 'help');
  } catch (error) {
    console.error('Error sending help SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send ticket created SMS (Campaign Registry compliant)
 */
async function sendTicketCreatedSMS(phoneNumber, ticketId, title, tenantId = null) {
  try {
    // Check consent before sending
    if (!(await canSendSMS(phoneNumber))) {
      console.log(`Cannot send SMS to ${phoneNumber}: no consent`);
      return { success: false, error: 'No SMS consent' };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('ticket_created', {
      companyName: companyInfo.companyName,
      ticketId: ticketId,
      title: title,
      contactInfo: companyInfo.contactInfo
    });
    
    return await sendSMS(phoneNumber, message, 'ticket_created', ticketId);
  } catch (error) {
    console.error('Error sending ticket created SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send ticket update SMS (Campaign Registry compliant)
 */
async function sendTicketUpdateSMS(phoneNumber, ticketId, status, updateMessage, tenantId = null) {
  try {
    // Check consent before sending
    if (!(await canSendSMS(phoneNumber))) {
      console.log(`Cannot send SMS to ${phoneNumber}: no consent`);
      return { success: false, error: 'No SMS consent' };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('ticket_updated', {
      companyName: companyInfo.companyName,
      ticketId: ticketId,
      status: status,
      message: updateMessage || ''
    });
    
    return await sendSMS(phoneNumber, message, 'ticket_update', ticketId);
  } catch (error) {
    console.error('Error sending ticket update SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send ticket resolved SMS (Campaign Registry compliant)
 */
async function sendTicketResolvedSMS(phoneNumber, ticketId, resolutionMessage, tenantId = null) {
  try {
    // Check consent before sending
    if (!(await canSendSMS(phoneNumber))) {
      console.log(`Cannot send SMS to ${phoneNumber}: no consent`);
      return { success: false, error: 'No SMS consent' };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('ticket_resolved', {
      companyName: companyInfo.companyName,
      ticketId: ticketId,
      message: resolutionMessage || 'Check your email for details.'
    });
    
    return await sendSMS(phoneNumber, message, 'ticket_resolved', ticketId);
  } catch (error) {
    console.error('Error sending ticket resolved SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log SMS message to database
 */
async function logSMSMessage(messageData) {
  try {
    const db = admin.firestore();
    
    const smsMessage = {
      ...messageData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('smsMessages').add(smsMessage);
  } catch (error) {
    console.error('Error logging SMS message:', error);
  }
}

/**
 * Increment message count for phone number
 */
async function incrementMessageCount(phoneNumber) {
  try {
    const db = admin.firestore();
    
    const query = await db.collection('smsPreferences')
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    if (!query.empty) {
      const doc = query.docs[0];
      await doc.ref.update({
        messageCount: admin.firestore.FieldValue.increment(1),
        lastMessageDate: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error incrementing message count:', error);
  }
}

/**
 * Get admin users with SMS notifications enabled for a tenant
 */
async function getAdminSMSUsers(tenantId) {
  try {
    const db = admin.firestore();
    
    // Get all users with admin or tech role for this tenant
    const usersQuery = await db.collection('users')
      .where('tenantId', '==', tenantId)
      .where('role', 'in', ['admin', 'tech'])
      .get();
    
    const adminSMSUsers = [];
    
    // Check each admin/tech user for SMS preferences
    for (const userDoc of usersQuery.docs) {
      const userData = userDoc.data();
      
      // Get user's notification preferences
      const prefsDoc = await db.collection('userPreferences').doc(userDoc.id).get();
      
      if (prefsDoc.exists) {
        const prefs = prefsDoc.data();
        const adminSMS = prefs.notifications?.adminSMSSettings;
        
        if (adminSMS?.enabled && adminSMS?.optInConfirmed && adminSMS?.phoneNumber) {
          adminSMSUsers.push({
            userId: userDoc.id,
            phoneNumber: adminSMS.phoneNumber,
            notifications: adminSMS.notifications,
            name: userData.displayName || userData.email,
            email: userData.email
          });
        }
      }
    }
    
    return adminSMSUsers;
  } catch (error) {
    console.error('Error getting admin SMS users:', error);
    return [];
  }
}

/**
 * Send admin notification for new ticket
 */
async function sendAdminNewTicketSMS(ticketData, tenantId) {
  try {
    const adminUsers = await getAdminSMSUsers(tenantId);
    
    if (adminUsers.length === 0) {
      console.log('No admin users with SMS enabled for tenant:', tenantId);
      return { success: true, sent: 0 };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    let sentCount = 0;
    const errors = [];
    
    for (const admin of adminUsers) {
      // Check if this admin wants new ticket notifications
      if (!admin.notifications?.newTickets) {
        continue;
      }
      
      // Check if high priority only filter is enabled
      if (admin.notifications?.highPriorityOnly && 
          !['High', 'Urgent', 'Critical'].includes(ticketData.priority)) {
        continue;
      }
      
      try {
        const message = renderSMSTemplate('admin_new_ticket', {
          companyName: companyInfo.companyName,
          ticketId: ticketData.id || ticketData.ticketId,
          customerName: ticketData.name || ticketData.submitterName || 'Unknown',
          priority: ticketData.priority || 'Normal',
          subject: (ticketData.subject || ticketData.title || '').substring(0, 50)
        });
        
        const result = await sendSMS(admin.phoneNumber, message, 'admin_new_ticket', ticketData.id || ticketData.ticketId);
        
        if (result.success) {
          sentCount++;
          console.log(`Admin SMS sent to ${admin.phoneNumber} for new ticket ${ticketData.id}`);
        } else {
          errors.push(`Failed to send to ${admin.phoneNumber}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error sending to ${admin.phoneNumber}: ${error.message}`);
      }
    }
    
    return { 
      success: true, 
      sent: sentCount, 
      total: adminUsers.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error sending admin new ticket SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send admin notification for ticket status change
 */
async function sendAdminStatusChangeSMS(ticketData, oldStatus, newStatus, tenantId) {
  try {
    const adminUsers = await getAdminSMSUsers(tenantId);
    
    if (adminUsers.length === 0) {
      console.log('No admin users with SMS enabled for tenant:', tenantId);
      return { success: true, sent: 0 };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    let sentCount = 0;
    const errors = [];
    
    for (const admin of adminUsers) {
      // Check if this admin wants status change notifications
      if (!admin.notifications?.statusChanges) {
        continue;
      }
      
      // Check if high priority only filter is enabled
      if (admin.notifications?.highPriorityOnly && 
          !['High', 'Urgent', 'Critical'].includes(ticketData.priority)) {
        continue;
      }
      
      try {
        const message = renderSMSTemplate('admin_status_change', {
          companyName: companyInfo.companyName,
          ticketId: ticketData.id || ticketData.ticketId,
          status: newStatus,
          customerName: ticketData.name || ticketData.submitterName || 'Unknown'
        });
        
        const result = await sendSMS(admin.phoneNumber, message, 'admin_status_change', ticketData.id || ticketData.ticketId);
        
        if (result.success) {
          sentCount++;
          console.log(`Admin status SMS sent to ${admin.phoneNumber} for ticket ${ticketData.id}`);
        } else {
          errors.push(`Failed to send to ${admin.phoneNumber}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error sending to ${admin.phoneNumber}: ${error.message}`);
      }
    }
    
    return { 
      success: true, 
      sent: sentCount, 
      total: adminUsers.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error sending admin status change SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send admin notification for ticket closure/resolution
 */
async function sendAdminTicketClosedSMS(ticketData, resolution, tenantId) {
  try {
    const adminUsers = await getAdminSMSUsers(tenantId);
    
    if (adminUsers.length === 0) {
      console.log('No admin users with SMS enabled for tenant:', tenantId);
      return { success: true, sent: 0 };
    }
    
    const companyInfo = await getCompanyInfo(tenantId);
    let sentCount = 0;
    const errors = [];
    
    for (const admin of adminUsers) {
      // Check if this admin wants ticket closed notifications
      if (!admin.notifications?.ticketsClosed) {
        continue;
      }
      
      // Check if high priority only filter is enabled
      if (admin.notifications?.highPriorityOnly && 
          !['High', 'Urgent', 'Critical'].includes(ticketData.priority)) {
        continue;
      }
      
      try {
        const message = renderSMSTemplate('admin_ticket_closed', {
          companyName: companyInfo.companyName,
          ticketId: ticketData.id || ticketData.ticketId,
          customerName: ticketData.name || ticketData.submitterName || 'Unknown',
          resolution: (resolution || 'Resolved').substring(0, 50)
        });
        
        const result = await sendSMS(admin.phoneNumber, message, 'admin_ticket_closed', ticketData.id || ticketData.ticketId);
        
        if (result.success) {
          sentCount++;
          console.log(`Admin closed SMS sent to ${admin.phoneNumber} for ticket ${ticketData.id}`);
        } else {
          errors.push(`Failed to send to ${admin.phoneNumber}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Error sending to ${admin.phoneNumber}: ${error.message}`);
      }
    }
    
    return { 
      success: true, 
      sent: sentCount, 
      total: adminUsers.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error sending admin ticket closed SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send admin SMS opt-in confirmation
 */
async function sendAdminOptInSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('admin_opt_in', {
      companyName: companyInfo.companyName
    });
    
    return await sendSMS(phoneNumber, message, 'admin_opt_in');
  } catch (error) {
    console.error('Error sending admin opt-in SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send admin SMS confirmation after opt-in
 */
async function sendAdminConfirmationSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('admin_confirmed', {
      companyName: companyInfo.companyName
    });
    
    return await sendSMS(phoneNumber, message, 'admin_confirmation');
  } catch (error) {
    console.error('Error sending admin confirmation SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send admin SMS opt-out confirmation
 */
async function sendAdminOptOutSMS(phoneNumber, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('admin_stopped', {
      companyName: companyInfo.companyName,
      contactInfo: companyInfo.contactInfo
    });
    
    return await sendSMS(phoneNumber, message, 'admin_opt_out');
  } catch (error) {
    console.error('Error sending admin opt-out SMS:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  normalizePhoneNumber,
  createSMSPreference,
  getSMSPreference,
  updateSMSConsent,
  canSendSMS,
  sendSMS,
  sendOptInSMS,
  sendConfirmationSMS,
  sendOptOutSMS,
  sendHelpSMS,
  sendTicketCreatedSMS,
  sendTicketUpdateSMS,
  sendTicketResolvedSMS,
  logSMSMessage,
  renderSMSTemplate,
  getCompanyInfo,
  // Admin SMS functions
  getAdminSMSUsers,
  sendAdminNewTicketSMS,
  sendAdminStatusChangeSMS,
  sendAdminTicketClosedSMS,
  sendAdminOptInSMS,
  sendAdminConfirmationSMS,
  sendAdminOptOutSMS
};