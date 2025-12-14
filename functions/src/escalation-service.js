/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const { sendEmail } = require('./email-service');

/**
 * Check if a ticket matches escalation rule conditions
 */
const matchesEscalationConditions = (ticket, rule, currentTime = Date.now()) => {
  const { conditions } = rule;
  
  // Check priorities
  if (conditions.priorities && conditions.priorities.length > 0) {
    if (!conditions.priorities.includes(ticket.priority)) {
      return false;
    }
  }
  
  // Check statuses
  if (conditions.statuses && conditions.statuses.length > 0) {
    if (!conditions.statuses.includes(ticket.status)) {
      return false;
    }
  }
  
  // Check time since created
  if (conditions.timeSinceCreated) {
    const hoursSinceCreated = (currentTime - ticket.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreated < conditions.timeSinceCreated) {
      return false;
    }
  }
  
  // Check time since last response
  if (conditions.timeSinceResponse) {
    const lastResponseTime = ticket.firstResponseAt || ticket.createdAt;
    const hoursSinceResponse = (currentTime - lastResponseTime) / (1000 * 60 * 60);
    if (hoursSinceResponse < conditions.timeSinceResponse) {
      return false;
    }
  }
  
  // Check SLA breach status
  if (conditions.slaBreached) {
    if (!ticket.sla || 
        (ticket.sla.responseStatus !== 'breached' && ticket.sla.resolutionStatus !== 'breached')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Get escalation reason text
 */
const getEscalationReason = (ticket, rule, currentTime = Date.now()) => {
  const reasons = [];
  
  if (rule.conditions.timeSinceCreated) {
    const hoursOld = (currentTime - ticket.createdAt) / (1000 * 60 * 60);
    if (hoursOld >= rule.conditions.timeSinceCreated) {
      reasons.push(`Ticket is ${Math.floor(hoursOld)} hours old`);
    }
  }
  
  if (rule.conditions.timeSinceResponse) {
    const lastResponseTime = ticket.firstResponseAt || ticket.createdAt;
    const hoursSinceResponse = (currentTime - lastResponseTime) / (1000 * 60 * 60);
    if (hoursSinceResponse >= rule.conditions.timeSinceResponse) {
      reasons.push(`No response for ${Math.floor(hoursSinceResponse)} hours`);
    }
  }
  
  if (rule.conditions.slaBreached && ticket.sla) {
    if (ticket.sla.responseStatus === 'breached') {
      reasons.push('Response SLA breached');
    }
    if (ticket.sla.resolutionStatus === 'breached') {
      reasons.push('Resolution SLA breached');
    }
  }
  
  if (ticket.priority === 'Urgent' || ticket.priority === 'High') {
    reasons.push(`${ticket.priority} priority ticket`);
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'Escalation rule triggered';
};

/**
 * Generate escalation notification message
 */
const generateEscalationMessage = (ticket, rule, escalationReason, newAssignee) => {
  const template = rule.actions.notify?.message || 
    'Ticket #{ticketId} requires escalation. Reason: {reason}';
  
  let message = template
    .replace(/\{ticketId\}/g, ticket.id)
    .replace(/\{title\}/g, ticket.title)
    .replace(/\{priority\}/g, ticket.priority)
    .replace(/\{status\}/g, ticket.status)
    .replace(/\{reason\}/g, escalationReason)
    .replace(/\{customer\}/g, ticket.name);
  
  if (newAssignee) {
    message = message.replace(/\{assignee\}/g, newAssignee.displayName || newAssignee.email);
  }
  
  const hoursOld = (Date.now() - ticket.createdAt) / (1000 * 60 * 60);
  message = message.replace(/\{timeOverdue\}/g, `${Math.floor(hoursOld)} hours`);
  
  return message;
};

/**
 * Find escalation targets based on role hierarchy
 */
const findEscalationTargets = (escalationType, allUsers, specificUserIds, currentAssigneeId) => {
  let targets = [];
  
  switch (escalationType) {
    case 'manager':
      targets = allUsers.filter(user => 
        user.role === 'admin' && // Using admin as manager role
        user.uid !== currentAssigneeId
      );
      break;
      
    case 'senior':
      targets = allUsers.filter(user => 
        user.role === 'admin' && // Using admin as senior role for now
        user.uid !== currentAssigneeId
      );
      break;
      
    case 'specific':
      if (specificUserIds && specificUserIds.length > 0) {
        targets = allUsers.filter(user => 
          specificUserIds.includes(user.uid) && 
          user.uid !== currentAssigneeId
        );
      }
      break;
  }
  
  return targets;
};

/**
 * Process escalation for a single ticket
 */
const processTicketEscalation = async (ticket, escalationRules, allUsers, config) => {
  // Skip if ticket is already resolved/closed
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return null;
  }
  
  // Sort rules by priority (higher number = higher priority)
  const sortedRules = escalationRules
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);
  
  const currentTime = Date.now();
  
  for (const rule of sortedRules) {
    if (matchesEscalationConditions(ticket, rule, currentTime)) {
      console.log(`Escalating ticket ${ticket.id} using rule: ${rule.name}`);
      
      const reason = getEscalationReason(ticket, rule, currentTime);
      const updates = { updatedAt: currentTime };
      
      // Handle reassignment
      if (rule.actions.reassign) {
        const targets = findEscalationTargets(
          rule.actions.reassign.to,
          allUsers,
          rule.actions.reassign.techIds,
          ticket.assigneeId
        );
        
        if (targets.length > 0) {
          // Assign to the first available target (could be enhanced with load balancing)
          const newAssignee = targets[0];
          updates.assigneeId = newAssignee.uid;
          
          console.log(`Reassigning ticket ${ticket.id} to ${newAssignee.email}`);
        }
      }
      
      // Handle priority update
      if (rule.actions.updatePriority) {
        updates.priority = rule.actions.updatePriority;
      }
      
      // Handle status update
      if (rule.actions.updateStatus) {
        updates.status = rule.actions.updateStatus;
      }
      
      // Update the ticket
      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await admin.firestore()
          .collection('tickets')
          .doc(ticket.id)
          .update(updates);
      }
      
      // Send escalation notifications
      if (rule.actions.notify && rule.actions.notify.emails.length > 0) {
        const newAssignee = updates.assigneeId ? 
          allUsers.find(u => u.uid === updates.assigneeId) : null;
        
        const message = generateEscalationMessage(ticket, rule, reason, newAssignee);
        
        // Send email to notification list
        for (const email of rule.actions.notify.emails) {
          try {
            await sendEmail({
              to: email,
              subject: `Ticket Escalation Alert - #${ticket.id}`,
              text: message,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #d32f2f;">Ticket Escalation Alert</h2>
                  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <strong>Ticket #${ticket.id}</strong> requires escalation
                  </div>
                  <p><strong>Title:</strong> ${ticket.title}</p>
                  <p><strong>Priority:</strong> ${ticket.priority}</p>
                  <p><strong>Status:</strong> ${ticket.status}</p>
                  <p><strong>Customer:</strong> ${ticket.name}</p>
                  <p><strong>Reason:</strong> ${reason}</p>
                  ${newAssignee ? `<p><strong>New Assignee:</strong> ${newAssignee.displayName || newAssignee.email}</p>` : ''}
                  <div style="margin-top: 20px;">
                    <a href="${config.baseUrl || 'https://your-helpdesk.com'}/tickets/${ticket.id}" 
                       style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                      View Ticket
                    </a>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error(`Failed to send escalation email to ${email}:`, emailError);
          }
        }
      }
      
      return {
        ticketId: ticket.id,
        rule: rule.name,
        reason,
        actions: Object.keys(updates).filter(key => key !== 'updatedAt')
      };
    }
  }
  
  return null;
};

/**
 * Main escalation check function
 */
const checkEscalations = async () => {
  try {
    console.log('Starting escalation check...');
    
    // Get app configuration
    const configDoc = await admin.firestore().collection('config').doc('app').get();
    if (!configDoc.exists) {
      console.log('No app configuration found, skipping escalation check');
      return { success: true, message: 'No configuration found' };
    }
    
    const config = configDoc.data();
    
    // Check if escalation is enabled
    if (!config.automationSettings?.escalation?.enabled) {
      console.log('Escalation is disabled, skipping check');
      return { success: true, message: 'Escalation disabled' };
    }
    
    const escalationRules = config.automationSettings.escalation.rules || [];
    if (escalationRules.length === 0) {
      console.log('No escalation rules configured');
      return { success: true, message: 'No escalation rules' };
    }
    
    // Get all open tickets
    const ticketsSnapshot = await admin.firestore()
      .collection('tickets')
      .where('status', 'in', ['Open', 'Waiting', 'On Hold', 'Accepted'])
      .get();
    
    if (ticketsSnapshot.empty) {
      console.log('No open tickets found');
      return { success: true, message: 'No open tickets' };
    }
    
    // Get all users for reassignment
    const usersSnapshot = await admin.firestore().collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    
    // Process each ticket
    const escalationResults = [];
    const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    for (const ticket of tickets) {
      try {
        const result = await processTicketEscalation(ticket, escalationRules, allUsers, config);
        if (result) {
          escalationResults.push(result);
        }
      } catch (ticketError) {
        console.error(`Error processing escalation for ticket ${ticket.id}:`, ticketError);
      }
    }
    
    console.log(`Escalation check completed. Processed ${escalationResults.length} escalations.`);
    
    return {
      success: true,
      processedTickets: tickets.length,
      escalations: escalationResults.length,
      results: escalationResults
    };
    
  } catch (error) {
    console.error('Error in escalation check:', error);
    throw error;
  }
};

module.exports = {
  checkEscalations,
  processTicketEscalation,
  matchesEscalationConditions,
  getEscalationReason
};