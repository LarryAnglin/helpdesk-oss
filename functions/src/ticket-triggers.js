const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { triggerWebhooks } = require('./webhook-delivery');

/**
 * Firestore triggers for ticket events
 * Automatically trigger webhooks when tickets are created, updated, etc.
 */

/**
 * Trigger when a new ticket is created
 */
exports.onTicketCreated = onDocumentCreated('tickets/{ticketId}', async (event) => {
  try {
    const ticket = event.data.data();
    const ticketId = event.params.ticketId;

      console.log(`Ticket created: ${ticketId}`);

      // Add the document ID to the ticket data
      const ticketWithId = {
        ...ticket,
        id: ticketId
      };

      // Get user information for metadata
      let userMetadata = {};
      if (ticket.submitterId) {
        try {
          const userDoc = await admin.firestore()
            .collection('users')
            .doc(ticket.submitterId)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            userMetadata = {
              userId: ticket.submitterId,
              userEmail: userData.email,
              userName: userData.displayName
            };
          }
        } catch (userError) {
          console.error('Error getting user data:', userError);
        }
      }

      // Trigger webhooks
      await triggerWebhooks('ticket.created', ticketWithId, {
        ...userMetadata,
        source: 'web',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in onTicketCreated trigger:', error);
    }
  });

/**
 * Trigger when a ticket is updated
 */
exports.onTicketUpdated = onDocumentUpdated('tickets/{ticketId}', async (event) => {
  try {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const ticketId = event.params.ticketId;

    console.log(`Ticket updated: ${ticketId}`);

    // Add the document ID to the ticket data
    const ticketWithId = {
      ...after,
      id: ticketId
    };

    // Determine what changed and trigger appropriate webhooks
    const changes = determineChanges(before, after);
    
    // Always trigger general update event
    await triggerWebhooks('ticket.updated', {
      ...ticketWithId,
      changes: changes,
      previousValues: extractChangedFields(before, changes)
    }, {
      source: 'system',
      timestamp: new Date().toISOString()
    });

    // Trigger specific events based on what changed
    for (const eventType of changes.events) {
      await triggerWebhooks(eventType, ticketWithId, {
        source: 'system',
        timestamp: new Date().toISOString(),
        changeType: changes.changeTypes[eventType]
      });
    }

  } catch (error) {
      console.error('Error in onTicketUpdated trigger:', error);
    }
  });

/**
 * Determine what changed in a ticket update
 * @param {object} before - Previous ticket state
 * @param {object} after - New ticket state
 * @returns {object} Object describing the changes
 */
function determineChanges(before, after) {
  const changes = {
    events: [],
    changeTypes: {},
    fields: []
  };

  // Check status changes
  if (before.status !== after.status) {
    changes.fields.push('status');
    changes.events.push('ticket.status_changed');
    changes.changeTypes['ticket.status_changed'] = {
      from: before.status,
      to: after.status
    };

    // Check for specific status events
    if (after.status === 'Resolved') {
      changes.events.push('ticket.resolved');
    } else if (after.status === 'Closed') {
      changes.events.push('ticket.closed');
    }
  }

  // Check priority changes
  if (before.priority !== after.priority) {
    changes.fields.push('priority');
    changes.events.push('ticket.priority_changed');
    changes.changeTypes['ticket.priority_changed'] = {
      from: before.priority,
      to: after.priority
    };
  }

  // Check assignment changes
  if (before.assigneeId !== after.assigneeId) {
    changes.fields.push('assigneeId');
    if (after.assigneeId) {
      changes.events.push('ticket.assigned');
      changes.changeTypes['ticket.assigned'] = {
        from: before.assigneeId,
        to: after.assigneeId
      };
    }
  }

  // Check for new replies
  const beforeReplies = before.replies || [];
  const afterReplies = after.replies || [];
  
  if (afterReplies.length > beforeReplies.length) {
    changes.events.push('ticket.reply_added');
    changes.changeTypes['ticket.reply_added'] = {
      newReplies: afterReplies.slice(beforeReplies.length)
    };
  }

  // Check other field changes
  const fieldsToCheck = ['title', 'description', 'location', 'computer', 'phone', 'contactMethod'];
  fieldsToCheck.forEach(field => {
    if (before[field] !== after[field]) {
      changes.fields.push(field);
    }
  });

  return changes;
}

/**
 * Extract the previous values of changed fields
 * @param {object} before - Previous ticket state
 * @param {object} changes - Changes object
 * @returns {object} Previous values of changed fields
 */
function extractChangedFields(before, changes) {
  const previousValues = {};
  
  changes.fields.forEach(field => {
    previousValues[field] = before[field];
  });

  return previousValues;
}

/**
 * Manual trigger for escalation events
 * This can be called from escalation rules or other systems
 */
exports.triggerEscalationWebhook = async (ticketId, escalationData, metadata = {}) => {
  try {
    // Get the ticket data
    const ticketDoc = await admin.firestore()
      .collection('tickets')
      .doc(ticketId)
      .get();

    if (!ticketDoc.exists) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const ticket = {
      ...ticketDoc.data(),
      id: ticketId
    };

    // Trigger escalation webhook
    await triggerWebhooks('ticket.escalated', {
      ...ticket,
      escalation: escalationData
    }, {
      ...metadata,
      source: metadata.source || 'escalation_rule',
      timestamp: new Date().toISOString()
    });

    console.log(`Escalation webhook triggered for ticket ${ticketId}`);

  } catch (error) {
    console.error('Error triggering escalation webhook:', error);
    throw error;
  }
};

/**
 * Function to manually trigger webhooks (for testing or external calls)
 */
exports.manualTriggerWebhook = onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { eventType, ticketId, metadata = {} } = req.body;

      if (!eventType || !ticketId) {
        return res.status(400).json({ 
          error: 'eventType and ticketId are required' 
        });
      }

      // Get the ticket data
      const ticketDoc = await admin.firestore()
        .collection('tickets')
        .doc(ticketId)
        .get();

      if (!ticketDoc.exists) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = {
        ...ticketDoc.data(),
        id: ticketId
      };

      // Trigger webhook
      await triggerWebhooks(eventType, ticket, {
        ...metadata,
        source: 'manual',
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: `Webhook triggered for ${eventType} on ticket ${ticketId}`
      });

    } catch (error) {
      console.error('Error in manual webhook trigger:', error);
      res.status(500).json({
        error: 'Failed to trigger webhook',
        details: error.message
      });
    }
  });
});