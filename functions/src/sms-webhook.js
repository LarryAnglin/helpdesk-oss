/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { 
  updateSMSConsent, 
  sendSMS, 
  logSMSMessage, 
  getSMSPreference, 
  sendConfirmationSMS,
  sendOptOutSMS,
  sendHelpSMS,
  getCompanyInfo,
  sendAdminOptInSMS,
  sendAdminConfirmationSMS,
  sendAdminOptOutSMS,
  normalizePhoneNumber
} = require('./sms-service');

/**
 * Handle incoming SMS messages from Twilio
 * This webhook receives START/STOP commands from users
 */
exports.twilioSMSWebhook = onRequest(async (req, res) => {
  try {
    // Verify this is a POST request from Twilio
    if (req.method !== 'POST') {
      console.log('Invalid request method:', req.method);
      return res.status(405).send('Method not allowed');
    }

    // Extract Twilio webhook data
    const {
      From: fromNumber,
      To: toNumber,
      Body: messageBody,
      MessageSid: messageSid,
      AccountSid: accountSid
    } = req.body;

    console.log('Received SMS webhook:', {
      from: fromNumber,
      to: toNumber,
      body: messageBody,
      messageSid: messageSid
    });

    // Validate required fields
    if (!fromNumber || !messageBody) {
      console.error('Missing required webhook data');
      return res.status(400).send('Bad request');
    }

    // Log the inbound message
    await logSMSMessage({
      phoneNumber: fromNumber,
      direction: 'inbound',
      message: messageBody,
      status: 'received',
      twilioMessageSid: messageSid,
      messageType: 'user_reply'
    });

    // Process the message
    await processSMSCommand(fromNumber, messageBody.trim());

    // Respond with TwiML (Twilio expects this format)
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <!-- Empty response - we handle replies programmatically -->
      </Response>`);

  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Check if a phone number belongs to an admin user
 */
async function getAdminUserByPhone(phoneNumber) {
  try {
    const db = admin.firestore();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Search all user preferences for this phone number with admin SMS settings
    const prefsQuery = await db.collection('userPreferences')
      .where('notifications.adminSMSSettings.phoneNumber', '==', normalizedPhone)
      .limit(1)
      .get();
    
    if (!prefsQuery.empty) {
      const prefsDoc = prefsQuery.docs[0];
      const userId = prefsDoc.id;
      
      // Get the user data to verify they're admin/tech
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.role === 'admin' || userData.role === 'tech') {
          return {
            userId: userId,
            userData: userData,
            preferences: prefsDoc.data(),
            tenantId: userData.tenantId
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for admin user by phone:', error);
    return null;
  }
}

/**
 * Process SMS commands (START, STOP, etc.) - Campaign Registry compliant
 * Now handles both customer and admin SMS preferences
 */
async function processSMSCommand(phoneNumber, message) {
  try {
    const command = message.toUpperCase().trim();
    
    // Check if this is an admin user first
    const adminUser = await getAdminUserByPhone(phoneNumber);
    
    if (adminUser) {
      // Handle admin SMS commands
      console.log(`Processing admin SMS command "${command}" from ${phoneNumber} (admin: ${adminUser.userData.email})`);
      await processAdminSMSCommand(phoneNumber, command, adminUser);
    } else {
      // Handle customer SMS commands (existing logic)
      const preference = await getSMSPreference(phoneNumber);
      const tenantId = preference?.tenantId || null;

      console.log(`Processing customer SMS command "${command}" from ${phoneNumber}`);

      // Enhanced keyword support for Campaign Registry compliance
      switch (command) {
        case 'START':
        case 'YES':
        case 'Y':
        case 'SUBSCRIBE':
          await handleOptIn(phoneNumber, preference, tenantId);
          break;

        case 'STOP':
        case 'UNSUBSCRIBE':
        case 'END':
        case 'CANCEL':
        case 'QUIT':
        case 'OPTOUT':
          await handleOptOut(phoneNumber, preference, tenantId);
          break;

        case 'HELP':
        case 'INFO':
        case 'SUPPORT':
          await handleHelp(phoneNumber, tenantId);
          break;

        default:
          // For unknown commands, send a helpful response instead of ignoring
          console.log(`Unknown customer command "${command}" from ${phoneNumber}`);
          await handleInvalidCommand(phoneNumber, tenantId);
          break;
      }
    }
  } catch (error) {
    console.error('Error processing SMS command:', error);
    // Send error response to user
    try {
      await sendHelpSMS(phoneNumber);
    } catch (helpError) {
      console.error('Error sending help SMS:', helpError);
    }
  }
}

/**
 * Process SMS commands for admin users
 */
async function processAdminSMSCommand(phoneNumber, command, adminUser) {
  try {
    const { userId, userData, preferences, tenantId } = adminUser;
    
    switch (command) {
      case 'START':
      case 'YES':
      case 'Y':
      case 'SUBSCRIBE':
        await handleAdminOptIn(phoneNumber, userId, tenantId);
        break;

      case 'STOP':
      case 'UNSUBSCRIBE':
      case 'END':
      case 'CANCEL':
      case 'QUIT':
      case 'OPTOUT':
        await handleAdminOptOut(phoneNumber, userId, tenantId);
        break;

      case 'HELP':
      case 'INFO':
      case 'SUPPORT':
        await handleAdminHelp(phoneNumber, tenantId);
        break;

      default:
        // For unknown commands, send admin help
        console.log(`Unknown admin command "${command}" from ${phoneNumber}`);
        await handleAdminHelp(phoneNumber, tenantId);
        break;
    }
  } catch (error) {
    console.error('Error processing admin SMS command:', error);
    await handleAdminHelp(phoneNumber, adminUser.tenantId);
  }
}

/**
 * Handle admin opt-in (START) command - Campaign Registry compliant
 */
async function handleAdminOptIn(phoneNumber, userId, tenantId) {
  try {
    const db = admin.firestore();
    
    // Update admin SMS settings to confirmed
    await db.collection('userPreferences').doc(userId).update({
      'notifications.adminSMSSettings.optInConfirmed': true,
      'notifications.adminSMSSettings.consentDate': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send admin confirmation SMS
    await sendAdminConfirmationSMS(phoneNumber, tenantId);

    console.log(`Admin SMS opt-in confirmed for ${phoneNumber} (userId: ${userId})`);

  } catch (error) {
    console.error('Error handling admin opt-in:', error);
  }
}

/**
 * Handle admin opt-out (STOP) command - Campaign Registry compliant
 */
async function handleAdminOptOut(phoneNumber, userId, tenantId) {
  try {
    const db = admin.firestore();
    
    // Update admin SMS settings to disabled
    await db.collection('userPreferences').doc(userId).update({
      'notifications.adminSMSSettings.enabled': false,
      'notifications.adminSMSSettings.optInConfirmed': false,
      'notifications.adminSMSSettings.optOutDate': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send admin opt-out confirmation SMS
    await sendAdminOptOutSMS(phoneNumber, tenantId);

    console.log(`Admin SMS opt-out confirmed for ${phoneNumber} (userId: ${userId})`);

  } catch (error) {
    console.error('Error handling admin opt-out:', error);
  }
}

/**
 * Handle admin help command - Campaign Registry compliant
 */
async function handleAdminHelp(phoneNumber, tenantId) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    
    // Send admin-specific help message
    await sendSMS(
      phoneNumber,
      `${companyInfo.companyName} Admin SMS: Admin notifications for all ticket activity. Reply START to subscribe, STOP to unsubscribe. Contact: ${companyInfo.contactInfo}`,
      'admin_help'
    );
    
    console.log(`Admin help message sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending admin help message:', error);
  }
}

/**
 * Handle opt-in (START) command - Campaign Registry compliant
 */
async function handleOptIn(phoneNumber, preference, tenantId) {
  try {
    if (!preference) {
      // No preference found - they might be trying to opt-in without a ticket
      const companyInfo = await getCompanyInfo(tenantId);
      await sendSMS(
        phoneNumber,
        `You're not currently signed up for ${companyInfo.companyName} Help Desk ticket updates. Create a ticket and enable SMS notifications to get started. Contact: ${companyInfo.contactInfo}`,
        'confirmation'
      );
      return;
    }

    if (preference.status === 'confirmed') {
      // Already opted in - send status confirmation
      await sendConfirmationSMS(phoneNumber, tenantId);
      return;
    }

    // Update status to confirmed
    await updateSMSConsent(phoneNumber, 'confirmed');

    // Send Campaign Registry compliant confirmation message
    await sendConfirmationSMS(phoneNumber, tenantId);

    console.log(`SMS opt-in confirmed for ${phoneNumber}`);

  } catch (error) {
    console.error('Error handling opt-in:', error);
  }
}

/**
 * Handle opt-out (STOP) command - Campaign Registry compliant
 */
async function handleOptOut(phoneNumber, preference, tenantId) {
  try {
    if (!preference || preference.status === 'stopped') {
      // Already stopped or no preference - send compliant confirmation
      await sendOptOutSMS(phoneNumber, tenantId);
      return;
    }

    // Update status to stopped
    await updateSMSConsent(phoneNumber, 'stopped');

    // Send Campaign Registry compliant opt-out confirmation
    await sendOptOutSMS(phoneNumber, tenantId);

    console.log(`SMS opt-out confirmed for ${phoneNumber}`);

  } catch (error) {
    console.error('Error handling opt-out:', error);
  }
}

/**
 * Handle help command - Campaign Registry compliant
 */
async function handleHelp(phoneNumber, tenantId) {
  try {
    // Send Campaign Registry compliant help message
    await sendHelpSMS(phoneNumber, tenantId);
    
    console.log(`Help message sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending help message:', error);
  }
}

/**
 * Handle invalid/unknown commands - Campaign Registry compliant
 */
async function handleInvalidCommand(phoneNumber, tenantId) {
  try {
    // Send help message for invalid commands
    await sendHelpSMS(phoneNumber, tenantId);
    
    console.log(`Invalid command help sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending invalid command help:', error);
  }
}

/**
 * Manual SMS consent management (for admin use)
 */
exports.updateSMSConsentManual = onRequest(async (req, res) => {
  try {
    // Add CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify authentication (admin only)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is admin
    if (!decodedToken.admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { phoneNumber, status } = req.body;

    if (!phoneNumber || !status) {
      return res.status(400).json({ error: 'Phone number and status required' });
    }

    const success = await updateSMSConsent(phoneNumber, status);

    if (success) {
      res.status(200).json({ 
        success: true, 
        message: `SMS consent updated to ${status} for ${phoneNumber}` 
      });
    } else {
      res.status(404).json({ error: 'Phone number not found' });
    }

  } catch (error) {
    console.error('Error updating SMS consent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  processSMSCommand,
  handleOptIn,
  handleOptOut,
  handleHelp,
  handleInvalidCommand,
  // Admin SMS handlers
  getAdminUserByPhone,
  processAdminSMSCommand,
  handleAdminOptIn,
  handleAdminOptOut,
  handleAdminHelp
};