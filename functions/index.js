/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const authFunctions = require('./src/auth');
const serverFunctions = require('./src/server');
const apiMethods = require('./src/api');
const { handleOptionsRequest } = require('./src/cors');
const { checkEscalations } = require('./src/escalation-service');
const { scheduleSurveyEmail, processScheduledSurveys, recordSurveyResponse } = require('./src/survey-service');
// const { analyzeClosedTicket, compactOldInsights } = require('./src/ticket-insights');
const { sendgridWebhook } = require('./sendgridWebhook');
const { sesWebhook } = require('./sesWebhook');

// Initialize Firebase Admin if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export the auth functions
exports.syncUserClaimsV1 = authFunctions.syncUserClaims;
exports.processNewUserV1 = authFunctions.processNewUser;

// Export the Next.js server function
exports.nextServer = serverFunctions.nextServer;

// Export the API endpoints with wrapper to handle CORS
exports.api = onRequest(
  {
    secrets: ['ALGOLIA_APP_ID', 'ALGOLIA_ADMIN_API_KEY']
  },
  (req, res) => {
  // Handle OPTIONS requests directly at the function level
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.set('Access-Control-Max-Age', '86400');
    res.status(204).send('');
    return;
  }

  // Log request for debugging
  console.log(`[API] ${req.method} request from origin: ${req.headers.origin || 'N/A'}`);

  // Pass to Express app
  return apiMethods.api(req, res);
});

// Special CORS test endpoint
// exports.corsTest = functions.https.onRequest((req, res) => {
//   // Apply CORS headers directly
//   res.set('Access-Control-Allow-Origin', '*');
//   res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
//   if (req.method === 'OPTIONS') {
//     res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//     res.set('Access-Control-Max-Age', '86400');
//     res.status(204).send('');
//     return;
//   }
  
//   res.status(200).json({
//     status: 'ok',
//     message: 'CORS test successful',
//     origin: req.headers.origin || 'N/A',
//     headers: req.headers
//   });
// });

// Escalation check function - can be triggered by cron job or manually
exports.escalationCheck = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  try {
    const result = await checkEscalations();
    res.status(200).json(result);
  } catch (error) {
    console.error('Escalation check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Scheduled escalation check (runs every hour) - temporarily disabled due to API compatibility
// exports.scheduledEscalationCheck = functions.pubsub
//   .schedule('0 * * * *') // Every hour at minute 0
//   .timeZone('America/Chicago')
//   .onRun(async (context) => {
//     try {
//       console.log('Running scheduled escalation check...');
//       const result = await checkEscalations();
//       console.log('Scheduled escalation check completed:', result);
//       return result;
//     } catch (error) {
//       console.error('Scheduled escalation check failed:', error);
//       throw error;
//     }
//   });

// Trigger survey scheduling when ticket status changes to Closed - temporarily disabled due to API compatibility
// exports.onTicketClosed = functions.firestore
//   .document('tickets/{ticketId}')
//   .onUpdate(async (change, context) => {
//     try {
//       const before = change.before.data();
//       const after = change.after.data();
//       
//       // Check if status changed to Closed
//       if (before.status !== 'Closed' && after.status === 'Closed') {
//         console.log(`Ticket ${context.params.ticketId} closed, scheduling survey`);
//         
//         // Get app config
//         const configDoc = await admin.firestore().collection('config').doc('app').get();
//         const config = configDoc.exists ? configDoc.data() : {};
//         
//         if (config.surveySettings?.enabled) {
//           const ticket = { id: context.params.ticketId, ...after };
//           const result = await scheduleSurveyEmail(ticket, config);
//           console.log('Survey scheduled:', result);
//         }
//       }
//     } catch (error) {
//       console.error('Error in onTicketClosed trigger:', error);
//       // Don't throw - we don't want to break the ticket update
//     }
//   });

// Process scheduled surveys (runs every 5 minutes) - temporarily disabled due to API compatibility
// exports.processScheduledSurveys = functions.pubsub
//   .schedule('*/5 * * * *') // Every 5 minutes
//   .timeZone('America/Chicago')
//   .onRun(async (context) => {
//     try {
//       console.log('Processing scheduled surveys...');
//       const result = await processScheduledSurveys();
//       console.log('Scheduled surveys processed:', result);
//       return result;
//     } catch (error) {
//       console.error('Error processing scheduled surveys:', error);
//       throw error;
//     }
//   });

// API endpoint to record survey response
exports.recordSurveyResponse = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  try {
    const { token, rating, feedback } = req.body;
    
    if (!token || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: token and rating'
      });
    }
    
    const result = await recordSurveyResponse(token, rating, feedback);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error recording survey response:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Export ticket insights functions
// exports.analyzeClosedTicket = analyzeClosedTicket;
// exports.compactOldInsights = compactOldInsights;

// Export email webhook functions
exports.sendgridWebhook = sendgridWebhook;
exports.sesWebhook = sesWebhook;

// Export secure ticket functions
const { getUserTicketsHttp } = require('./getUserTickets');
const { getTicketHttp } = require('./getTicket');
const { updateTicketHttp } = require('./updateTicket');
const { addReplyHttp } = require('./addReply');

exports.getUserTicketsHttp = getUserTicketsHttp;
exports.getTicketHttp = getTicketHttp;
exports.updateTicketHttp = updateTicketHttp;
exports.addReplyHttp = addReplyHttp;

// Export setup status functions
const { checkSetupStatusHTTP, markSetupCompleteHTTP, resetSetupStatusHTTP } = require('./checkSetupStatus');
exports.checkSetupStatusHTTP = checkSetupStatusHTTP;
exports.markSetupCompleteHTTP = markSetupCompleteHTTP;
exports.resetSetupStatusHTTP = resetSetupStatusHTTP;

// Export short ID lookup function
const { lookupTicketByShortId } = require('./src/lookupTicketByShortId');
exports.lookupTicketByShortId = lookupTicketByShortId;

// Export knowledge processing function
const { processKnowledgeSource } = require('./src/knowledgeProcessing');
exports.processKnowledgeSource = processKnowledgeSource;

// Export webhook functions
const { onTicketCreated, onTicketUpdated, manualTriggerWebhook } = require('./src/ticket-triggers');
const { checkEscalations: checkEscalationsNew, triggerEscalationCheck } = require('./src/escalation-engine');
const { testWebhook } = require('./src/webhook-delivery');

exports.onTicketCreated = onTicketCreated;
exports.onTicketUpdated = onTicketUpdated;
exports.manualTriggerWebhook = manualTriggerWebhook;
exports.checkEscalationsNew = checkEscalationsNew;
exports.triggerEscalationCheck = triggerEscalationCheck;
exports.testWebhookHTTP = testWebhook;

// Export SMS functions
const { twilioSMSWebhook, updateSMSConsentManual } = require('./src/sms-webhook');
const { onTicketCreatedSMS, onTicketUpdatedSMS, sendTicketSMSManual } = require('./src/ticket-sms-handler');

exports.twilioSMSWebhook = twilioSMSWebhook;
exports.updateSMSConsentManual = updateSMSConsentManual;
exports.onTicketCreatedSMS = onTicketCreatedSMS;
exports.onTicketUpdatedSMS = onTicketUpdatedSMS;
exports.sendTicketSMSManual = sendTicketSMSManual;

// Export push notification functions
const { onTicketCreatedPush, onTicketUpdatedPush } = require('./src/push-notification-triggers');
const { testPushNotifications } = require('./src/test-push-notifications');

exports.onTicketCreatedPush = onTicketCreatedPush;
exports.onTicketUpdatedPush = onTicketUpdatedPush;
exports.testPushNotifications = testPushNotifications;

// Export Stripe functions
const { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } = require('./src/stripe-service');

exports.createCheckoutSession = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return createCheckoutSession(req, res);
});

exports.createBillingPortalSession = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return createBillingPortalSession(req, res);
});

exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return handleStripeWebhook(req, res);
});

// Export organization webhook test function
const { testOrganizationWebhook } = require('./src/organization-webhook-delivery');

exports.testOrganizationWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return handleOptionsRequest(req, res);
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { webhookId } = req.body;
    
    if (!webhookId) {
      return res.status(400).json({ error: 'Webhook ID is required' });
    }
    
    const result = await testOrganizationWebhook(webhookId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error testing organization webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// Export ticket assignment functions
const { checkTicketAssignments, assignTicketsToOrgAndCompany } = require('./src/check-assignments');
const { checkUserAssignments, assignUsersToOrgAndCompany, autoAssignAllTickets } = require('./src/check-users');
const { checkUserClaims, syncUserClaims } = require('./src/check-user-claims');
const { manualClaimsFix } = require('./src/manual-claims-fix');

exports.checkTicketAssignments = checkTicketAssignments;
exports.assignTicketsToOrgAndCompany = assignTicketsToOrgAndCompany;
exports.checkUserAssignments = checkUserAssignments;
exports.assignUsersToOrgAndCompany = assignUsersToOrgAndCompany;
exports.autoAssignAllTickets = autoAssignAllTickets;
exports.checkUserClaims = checkUserClaims;
exports.syncUserClaims = syncUserClaims;
exports.manualClaimsFix = manualClaimsFix;

const { checkOpenTickets } = require('./src/check-open-tickets');
exports.checkOpenTickets = checkOpenTickets;

// Export the fix user permissions function
const { fixUserPermissions } = require('./src/fix-user-permissions');
exports.fixUserPermissions = fixUserPermissions;