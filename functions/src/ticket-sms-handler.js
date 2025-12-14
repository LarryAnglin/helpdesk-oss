/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { 
  createSMSPreference, 
  sendOptInSMS, 
  sendTicketCreatedSMS,
  sendTicketUpdateSMS,
  sendTicketResolvedSMS,
  sendAdminNewTicketSMS,
  sendAdminStatusChangeSMS,
  sendAdminTicketClosedSMS
} = require('./sms-service');

/**
 * Handle SMS setup when tickets are created
 * This function is triggered when a new ticket is created
 */
exports.onTicketCreatedSMS = onDocumentCreated('tickets/{ticketId}', async (event) => {
  try {
    const ticket = event.data.data();
    const ticketId = event.params.ticketId;

    console.log(`Processing SMS setup for ticket ${ticketId}`);

    // Check if SMS updates are enabled
      if (!ticket.smsUpdates || !ticket.smsPhoneNumber) {
        console.log(`SMS not enabled for ticket ${ticketId}`);
        return;
      }

      // Create SMS preferences record
      await createSMSPreference(
        ticket.smsPhoneNumber,
        ticketId,
        {
          tenantId: ticket.tenantId,
          userId: ticket.submitterId,
          userName: ticket.name,
          userEmail: ticket.email
        }
      );

      // Send Campaign Registry compliant opt-in SMS
      const result = await sendOptInSMS(ticket.smsPhoneNumber, ticketId, ticket.tenantId);
      
      if (result.success) {
        console.log(`Opt-in SMS sent for ticket ${ticketId} to ${ticket.smsPhoneNumber}`);
      } else {
        console.error(`Failed to send opt-in SMS for ticket ${ticketId}:`, result.error);
      }

      // Send admin notifications for new ticket
      if (ticket.tenantId) {
        try {
          const adminResult = await sendAdminNewTicketSMS(
            {
              id: ticketId,
              name: ticket.name,
              priority: ticket.priority,
              subject: ticket.subject,
              title: ticket.title
            },
            ticket.tenantId
          );
          
          if (adminResult.success && adminResult.sent > 0) {
            console.log(`Admin new ticket SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
          }
        } catch (error) {
          console.error(`Error sending admin new ticket SMS for ticket ${ticketId}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in onTicketCreatedSMS:', error);
    }
  });

/**
 * Handle SMS notifications when tickets are updated
 */
exports.onTicketUpdatedSMS = onDocumentUpdated('tickets/{ticketId}', async (event) => {
  try {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const ticketId = event.params.ticketId;

      console.log(`Processing SMS update for ticket ${ticketId}`);

      // Check if SMS updates are enabled and user has consented
      if (!after.smsUpdates || !after.smsPhoneNumber || after.smsConsent !== 'confirmed') {
        console.log(`SMS not enabled or not consented for ticket ${ticketId}`);
        return;
      }

      // Check what changed to determine notification type and message
      let notificationSent = false;

      if (before.status !== after.status) {
        // Status change notification
        if (after.status === 'Resolved' || after.status === 'Closed') {
          // Send resolved notification to customer
          const result = await sendTicketResolvedSMS(
            after.smsPhoneNumber,
            ticketId,
            'Check your email for details.',
            after.tenantId
          );
          notificationSent = true;
          
          if (result.success) {
            console.log(`Resolved SMS sent for ticket ${ticketId}`);
          } else {
            console.error(`Failed to send resolved SMS for ticket ${ticketId}:`, result.error);
          }

          // Send admin notification for ticket closure
          if (after.tenantId) {
            try {
              const adminResult = await sendAdminTicketClosedSMS(
                {
                  id: ticketId,
                  name: after.name,
                  priority: after.priority
                },
                'Ticket resolved',
                after.tenantId
              );
              
              if (adminResult.success && adminResult.sent > 0) {
                console.log(`Admin closed ticket SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
              }
            } catch (error) {
              console.error(`Error sending admin closed ticket SMS for ticket ${ticketId}:`, error);
            }
          }
        } else {
          // Regular status update to customer
          const result = await sendTicketUpdateSMS(
            after.smsPhoneNumber,
            ticketId,
            after.status,
            `Status changed to ${after.status}`,
            after.tenantId
          );
          notificationSent = true;
          
          if (result.success) {
            console.log(`Status update SMS sent for ticket ${ticketId}: ${after.status}`);
          } else {
            console.error(`Failed to send status SMS for ticket ${ticketId}:`, result.error);
          }

          // Send admin notification for status change
          if (after.tenantId) {
            try {
              const adminResult = await sendAdminStatusChangeSMS(
                {
                  id: ticketId,
                  name: after.name,
                  priority: after.priority
                },
                before.status,
                after.status,
                after.tenantId
              );
              
              if (adminResult.success && adminResult.sent > 0) {
                console.log(`Admin status change SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
              }
            } catch (error) {
              console.error(`Error sending admin status change SMS for ticket ${ticketId}:`, error);
            }
          }
        }
      } else if (before.priority !== after.priority) {
        // Priority change notification to customer
        const result = await sendTicketUpdateSMS(
          after.smsPhoneNumber,
          ticketId,
          after.status,
          `Priority changed to ${after.priority}`,
          after.tenantId
        );
        notificationSent = true;
        
        if (result.success) {
          console.log(`Priority update SMS sent for ticket ${ticketId}: ${after.priority}`);
        } else {
          console.error(`Failed to send priority SMS for ticket ${ticketId}:`, result.error);
        }

        // Send admin notification for priority change
        if (after.tenantId) {
          try {
            const adminResult = await sendAdminStatusChangeSMS(
              {
                id: ticketId,
                name: after.name,
                priority: after.priority
              },
              before.priority,
              after.priority,
              after.tenantId
            );
            
            if (adminResult.success && adminResult.sent > 0) {
              console.log(`Admin priority change SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
            }
          } catch (error) {
            console.error(`Error sending admin priority change SMS for ticket ${ticketId}:`, error);
          }
        }
      } else if (before.assigneeId !== after.assigneeId) {
        // Assignment change notification to customer
        const message = after.assigneeId ? 'Technician assigned' : 'Assignment removed';
        const result = await sendTicketUpdateSMS(
          after.smsPhoneNumber,
          ticketId,
          after.status,
          message,
          after.tenantId
        );
        notificationSent = true;
        
        if (result.success) {
          console.log(`Assignment update SMS sent for ticket ${ticketId}: ${message}`);
        } else {
          console.error(`Failed to send assignment SMS for ticket ${ticketId}:`, result.error);
        }

        // Send admin notification for assignment change
        if (after.tenantId) {
          try {
            const adminResult = await sendAdminStatusChangeSMS(
              {
                id: ticketId,
                name: after.name,
                priority: after.priority
              },
              'Not Assigned',
              message,
              after.tenantId
            );
            
            if (adminResult.success && adminResult.sent > 0) {
              console.log(`Admin assignment change SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
            }
          } catch (error) {
            console.error(`Error sending admin assignment change SMS for ticket ${ticketId}:`, error);
          }
        }
      } else if (after.replies && after.replies.length > (before.replies?.length || 0)) {
        // New reply notification to customer
        const result = await sendTicketUpdateSMS(
          after.smsPhoneNumber,
          ticketId,
          after.status,
          'New reply added',
          after.tenantId
        );
        notificationSent = true;
        
        if (result.success) {
          console.log(`Reply notification SMS sent for ticket ${ticketId}`);
        } else {
          console.error(`Failed to send reply SMS for ticket ${ticketId}:`, result.error);
        }

        // Send admin notification for new reply
        if (after.tenantId) {
          try {
            const adminResult = await sendAdminStatusChangeSMS(
              {
                id: ticketId,
                name: after.name,
                priority: after.priority
              },
              after.status,
              'Reply Added',
              after.tenantId
            );
            
            if (adminResult.success && adminResult.sent > 0) {
              console.log(`Admin new reply SMS sent to ${adminResult.sent} admin(s) for ticket ${ticketId}`);
            }
          } catch (error) {
            console.error(`Error sending admin new reply SMS for ticket ${ticketId}:`, error);
          }
        }
      }

      if (!notificationSent) {
        console.log(`No SMS notification needed for ticket ${ticketId} update`);
      }

    } catch (error) {
      console.error('Error in onTicketUpdatedSMS:', error);
    }
  });

/**
 * HTTP function to manually send SMS notifications
 */
exports.sendTicketSMSManual = onRequest(async (req, res) => {
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

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { ticketId, message, phoneNumber } = req.body;

    if (!ticketId || !message) {
      return res.status(400).json({ error: 'Ticket ID and message required' });
    }

    // Get ticket details
    const ticketDoc = await admin.firestore().collection('tickets').doc(ticketId).get();
    
    if (!ticketDoc.exists) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketDoc.data();
    const targetPhone = phoneNumber || ticket.smsPhoneNumber;

    if (!targetPhone) {
      return res.status(400).json({ error: 'No phone number specified' });
    }

    // Send SMS with tenant context
    const result = await sendTicketUpdateSMS(
      targetPhone, 
      ticketId, 
      ticket.status, 
      message, 
      ticket.tenantId
    );

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'SMS sent successfully',
        messageSid: result.messageSid
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }

  } catch (error) {
    console.error('Error sending manual SMS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});