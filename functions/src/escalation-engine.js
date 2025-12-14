const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { triggerWebhooks } = require('./webhook-delivery');

/**
 * Escalation engine for automatic ticket escalations
 * Runs periodically to check for tickets that meet escalation criteria
 */

/**
 * Scheduled function to check for escalations
 * Runs every 5 minutes to evaluate tickets against escalation rules
 */
exports.checkEscalations = onSchedule('every 5 minutes', async (event) => {
    try {
      console.log('Starting escalation check...');
      
      // Get all active escalation rules
      const rulesQuery = await admin.firestore()
        .collection('escalationRules')
        .where('active', '==', true)
        .orderBy('priority', 'desc') // Higher priority rules first
        .get();

      if (rulesQuery.empty) {
        console.log('No active escalation rules found');
        return null;
      }

      const rules = [];
      rulesQuery.forEach(doc => {
        rules.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Found ${rules.length} active escalation rules`);

      // Process each rule
      for (const rule of rules) {
        await processEscalationRule(rule);
      }

      console.log('Escalation check completed');
      return null;

    } catch (error) {
      console.error('Error in escalation check:', error);
      return null;
    }
  });

/**
 * Process a single escalation rule
 * @param {object} rule - The escalation rule to process
 */
async function processEscalationRule(rule) {
  try {
    console.log(`Processing escalation rule: ${rule.name}`);

    // Build query based on rule conditions
    const query = buildTicketQuery(rule.conditions);
    const ticketsQuery = await query.get();

    if (ticketsQuery.empty) {
      console.log(`No tickets match rule: ${rule.name}`);
      return;
    }

    console.log(`Found ${ticketsQuery.size} tickets for rule: ${rule.name}`);

    // Process each matching ticket
    for (const ticketDoc of ticketsQuery.docs) {
      const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
      
      // Check if this rule has already been applied to this ticket recently
      if (await hasRecentEscalation(ticket.id, rule.id)) {
        console.log(`Skipping ticket ${ticket.id} - recent escalation exists`);
        continue;
      }

      // Evaluate detailed conditions (for complex logic that can't be queried)
      if (await evaluateDetailedConditions(ticket, rule.conditions)) {
        await executeEscalation(ticket, rule);
      }
    }

  } catch (error) {
    console.error(`Error processing escalation rule ${rule.name}:`, error);
  }
}

/**
 * Build Firestore query based on escalation conditions
 * @param {array} conditions - Array of escalation conditions
 * @returns {object} Firestore query
 */
function buildTicketQuery(conditions) {
  let query = admin.firestore().collection('tickets');

  // Add basic filters that can be applied at query level
  for (const condition of conditions) {
    switch (condition.type) {
      case 'status':
        if (condition.operator === 'equals') {
          query = query.where('status', '==', condition.value);
        } else if (condition.operator === 'not_equals') {
          query = query.where('status', '!=', condition.value);
        } else if (condition.operator === 'in') {
          query = query.where('status', 'in', condition.value);
        }
        break;
        
      case 'priority':
        if (condition.operator === 'equals') {
          query = query.where('priority', '==', condition.value);
        } else if (condition.operator === 'in') {
          query = query.where('priority', 'in', condition.value);
        }
        break;
        
      case 'assignee':
        if (condition.operator === 'equals') {
          query = query.where('assigneeId', '==', condition.value);
        } else if (condition.operator === 'not_equals') {
          query = query.where('assigneeId', '!=', condition.value);
        }
        break;
    }
  }

  // Limit to reasonable number for performance
  query = query.limit(100);

  return query;
}

/**
 * Evaluate complex conditions that couldn't be applied at query level
 * @param {object} ticket - The ticket to evaluate
 * @param {array} conditions - Array of conditions to check
 * @returns {boolean} True if all conditions are met
 */
async function evaluateDetailedConditions(ticket, conditions) {
  const now = new Date();
  
  for (const condition of conditions) {
    switch (condition.type) {
      case 'time_since_created':
        const createdAt = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        const timeSinceCreated = now - createdAt;
        const requiredTime = convertTimeToMs(condition.value, condition.unit);
        
        if (condition.operator === 'greater_than' && timeSinceCreated <= requiredTime) {
          return false;
        }
        break;
        
      case 'time_since_updated':
        const updatedAt = ticket.updatedAt?.toDate ? ticket.updatedAt.toDate() : new Date(ticket.updatedAt);
        const timeSinceUpdated = now - updatedAt;
        const requiredUpdateTime = convertTimeToMs(condition.value, condition.unit);
        
        if (condition.operator === 'greater_than' && timeSinceUpdated <= requiredUpdateTime) {
          return false;
        }
        break;
        
      case 'no_response':
        // Check if there have been any replies from support staff
        const replies = ticket.replies || [];
        const supportReplies = replies.filter(reply => 
          reply.authorRole === 'tech' || reply.authorRole === 'admin'
        );
        
        if (condition.operator === 'equals' && condition.value === true && supportReplies.length > 0) {
          return false;
        }
        break;
    }
  }
  
  return true;
}

/**
 * Convert time value to milliseconds
 * @param {number} value - Time value
 * @param {string} unit - Time unit (minutes, hours, days)
 * @returns {number} Time in milliseconds
 */
function convertTimeToMs(value, unit) {
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || multipliers.hours);
}

/**
 * Check if this rule has been applied to this ticket recently
 * @param {string} ticketId - Ticket ID
 * @param {string} ruleId - Rule ID
 * @returns {boolean} True if recent escalation exists
 */
async function hasRecentEscalation(ticketId, ruleId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const escalationQuery = await admin.firestore()
    .collection('escalationEvents')
    .where('ticketId', '==', ticketId)
    .where('ruleId', '==', ruleId)
    .where('executedAt', '>', admin.firestore.Timestamp.fromDate(oneDayAgo))
    .limit(1)
    .get();
    
  return !escalationQuery.empty;
}

/**
 * Execute escalation actions for a ticket
 * @param {object} ticket - The ticket to escalate
 * @param {object} rule - The escalation rule
 */
async function executeEscalation(ticket, rule) {
  try {
    console.log(`Executing escalation for ticket ${ticket.id} with rule ${rule.name}`);

    const escalationEvent = {
      id: admin.firestore().collection('escalationEvents').doc().id,
      ticketId: ticket.id,
      tenantId: ticket.tenantId,
      ruleId: rule.id,
      ruleName: rule.name,
      conditions: rule.conditions,
      actions: rule.actions,
      executedAt: admin.firestore.FieldValue.serverTimestamp(),
      success: true,
      metadata: {
        ticketCreatedAt: ticket.createdAt,
        ticketUpdatedAt: ticket.updatedAt,
        ticketStatus: ticket.status,
        ticketPriority: ticket.priority
      }
    };

    // Execute each action
    const actionResults = [];
    
    for (const action of rule.actions) {
      try {
        const result = await executeEscalationAction(ticket, action, rule);
        actionResults.push({ action: action.type, success: true, result });
      } catch (actionError) {
        console.error(`Error executing action ${action.type}:`, actionError);
        actionResults.push({ 
          action: action.type, 
          success: false, 
          error: actionError.message 
        });
        escalationEvent.success = false;
      }
    }

    escalationEvent.actionResults = actionResults;

    // Save escalation event
    await admin.firestore()
      .collection('escalationEvents')
      .doc(escalationEvent.id)
      .set(escalationEvent);

    console.log(`Escalation completed for ticket ${ticket.id}`);

  } catch (error) {
    console.error(`Error executing escalation for ticket ${ticket.id}:`, error);
    
    // Save failed escalation event
    await admin.firestore()
      .collection('escalationEvents')
      .add({
        ticketId: ticket.id,
        tenantId: ticket.tenantId,
        ruleId: rule.id,
        ruleName: rule.name,
        executedAt: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        error: error.message
      });
  }
}

/**
 * Execute a single escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The action to execute
 * @param {object} rule - The escalation rule
 * @returns {any} Action result
 */
async function executeEscalationAction(ticket, action, rule) {
  switch (action.type) {
    case 'webhook':
      return await executeWebhookAction(ticket, action, rule);
      
    case 'email':
      return await executeEmailAction(ticket, action, rule);
      
    case 'assign':
      return await executeAssignAction(ticket, action);
      
    case 'priority_change':
      return await executePriorityChangeAction(ticket, action);
      
    case 'status_change':
      return await executeStatusChangeAction(ticket, action);
      
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Execute webhook escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The webhook action
 * @param {object} rule - The escalation rule
 */
async function executeWebhookAction(ticket, action, rule) {
  const escalationData = {
    rule: {
      id: rule.id,
      name: rule.name,
      description: rule.description
    },
    trigger: {
      conditions: rule.conditions,
      executedAt: new Date().toISOString()
    },
    action: action
  };

  await triggerWebhooks('ticket.escalated', ticket, {
    source: 'escalation_rule',
    escalation: escalationData,
    timestamp: new Date().toISOString()
  });

  return { webhookTriggered: true, escalationData };
}

/**
 * Execute email escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The email action
 * @param {object} rule - The escalation rule
 */
async function executeEmailAction(ticket, action, rule) {
  // This would integrate with your email service
  // For now, just log the action
  console.log(`Email escalation for ticket ${ticket.id}:`, action.config);
  
  return { 
    emailSent: true, 
    recipients: action.config.recipients,
    subject: action.config.subject 
  };
}

/**
 * Execute assign escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The assign action
 */
async function executeAssignAction(ticket, action) {
  await admin.firestore()
    .collection('tickets')
    .doc(ticket.id)
    .update({
      assigneeId: action.config.assigneeId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { assigned: true, assigneeId: action.config.assigneeId };
}

/**
 * Execute priority change escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The priority change action
 */
async function executePriorityChangeAction(ticket, action) {
  await admin.firestore()
    .collection('tickets')
    .doc(ticket.id)
    .update({
      priority: action.config.priority,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { priorityChanged: true, newPriority: action.config.priority };
}

/**
 * Execute status change escalation action
 * @param {object} ticket - The ticket
 * @param {object} action - The status change action
 */
async function executeStatusChangeAction(ticket, action) {
  await admin.firestore()
    .collection('tickets')
    .doc(ticket.id)
    .update({
      status: action.config.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  return { statusChanged: true, newStatus: action.config.status };
}

// Export the trigger function for manual calls
exports.triggerEscalationCheck = onRequest(async (req, res) => {
  const cors = require('cors')({ origin: true });
  
  return cors(req, res, async () => {
    try {
      await exports.checkEscalations.run();
      res.status(200).json({ success: true, message: 'Escalation check triggered' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
});