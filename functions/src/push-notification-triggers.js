/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { 
  sendTicketCreatedNotification,
  sendTicketAssignedNotification,
  sendTicketUpdatedNotification,
  sendTicketReplyNotification
} = require('./push-notification-service');

/**
 * Send push notifications when tickets are created
 */
exports.onTicketCreatedPush = onDocumentCreated('tickets/{ticketId}', async (event) => {
  try {
    const ticket = event.data.data();
    const ticketId = event.params.ticketId;
    
    console.log(`Processing push notifications for new ticket ${ticketId}`);
    
    // Add the ticket ID to the ticket data
    const ticketWithId = { ...ticket, id: ticketId };
    
    // Send push notifications to admin/tech users
    const results = await sendTicketCreatedNotification(ticketWithId);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Successfully sent ${successCount} push notifications for ticket ${ticketId}`);
    
  } catch (error) {
    console.error('Error in onTicketCreatedPush:', error);
    // Don't throw error to avoid retries for push notification failures
  }
});

/**
 * Send push notifications when tickets are updated
 */
exports.onTicketUpdatedPush = onDocumentUpdated('tickets/{ticketId}', async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const ticketId = event.params.ticketId;
    
    console.log(`Processing push notifications for updated ticket ${ticketId}`);
    
    // Add the ticket ID to the ticket data
    const ticketWithId = { ...afterData, id: ticketId };
    
    // Check if this is an assignment change
    const wasAssigned = beforeData.assigneeId !== afterData.assigneeId && afterData.assigneeId;
    
    if (wasAssigned) {
      console.log(`Ticket ${ticketId} was assigned to ${afterData.assigneeId}`);
      await sendTicketAssignedNotification(ticketWithId, afterData.assigneeId);
    }
    
    // Check if there are meaningful changes to notify about
    const hasStatusChange = beforeData.status !== afterData.status;
    const hasPriorityChange = beforeData.priority !== afterData.priority;
    const hasReplyChange = (afterData.replies || []).length > (beforeData.replies || []).length;
    
    if (hasStatusChange || hasPriorityChange) {
      console.log(`Ticket ${ticketId} has meaningful changes, sending update notifications`);
      await sendTicketUpdatedNotification(ticketWithId);
    }
    
    // Check for new replies
    if (hasReplyChange) {
      const beforeReplies = beforeData.replies || [];
      const afterReplies = afterData.replies || [];
      
      // Find new replies
      const newReplies = afterReplies.slice(beforeReplies.length);
      
      for (const reply of newReplies) {
        console.log(`New reply found on ticket ${ticketId}, sending reply notifications`);
        await sendTicketReplyNotification(ticketWithId, reply);
      }
    }
    
    console.log(`Completed push notification processing for ticket ${ticketId}`);
    
  } catch (error) {
    console.error('Error in onTicketUpdatedPush:', error);
    // Don't throw error to avoid retries for push notification failures
  }
});