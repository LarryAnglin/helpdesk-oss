/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket, TicketReply } from '../types/ticket';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getAppConfig } from '../firebase/configService';
import { SLASettings } from '../types/sla';
import { generateSLAExpectationText } from '../utils/slaCalculator';

// Base62 character set for short IDs
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Convert hex string to Base62
const hexToBase62 = (hex: string): string => {
  let num = BigInt('0x' + hex);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  return result || '0';
};

// Generate deterministic short ID from ticket ID using hash
const getShortIdFromTicket = (ticketId: string): string => {
  // Create a simple hash using built-in methods (compatible with all environments)
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Convert to Base62 and ensure 6 characters
  let base62 = hexToBase62(positiveHash);
  
  // Pad or truncate to exactly 6 characters
  if (base62.length < 6) {
    base62 = base62.padStart(6, BASE62_CHARS[0]);
  } else if (base62.length > 6) {
    base62 = base62.substring(0, 6);
  }
  
  return base62;
};

// Generate unique reply-to address for a ticket using deterministic short ID
const getTicketReplyAddress = (ticketId: string): string => {
  const domain = import.meta.env.VITE_EMAIL_DOMAIN || 'mail.anglinai.com';
  const shortId = getShortIdFromTicket(ticketId);
  console.log(`Generated deterministic short ID for ticket ${ticketId}: ${shortId}`);
  return `ticket-${shortId}-reply@${domain}`;
};

// Helper function to find ticket ID from short ID (for email processing webhook)
export const findTicketIdFromShortId = (shortId: string, ticketIds: string[]): string | null => {
  for (const ticketId of ticketIds) {
    if (getShortIdFromTicket(ticketId) === shortId) {
      return ticketId;
    }
  }
  return null;
};

// Email template for new ticket notification
const createTicketNotificationEmail = async (ticket: Ticket) => {
  const submitterEmail = ticket.email || 'Unknown';
  const submitterName = ticket.name || 'Unknown';
  // Use environment variable or fallback to production URL
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://your-project-id.web.app';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const replyToAddress = getTicketReplyAddress(ticket.id!);
  const shortId = getShortIdFromTicket(ticket.id!);
  
  // Get CC participants
  const ccParticipants = ticket.participants?.filter(p => p.role === 'cc') || [];
  const ccEmails = ccParticipants.map(p => p.email);
  
  // Get admin email from config
  const config = await getAppConfig();
  const adminEmail = config.adminNotificationEmail || config.supportEmail || 'larry@your-domain.com';
  
  return {
    to: adminEmail,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    from: 'Help Desk <helpdesk@mail.anglinai.com>',
    replyTo: replyToAddress,
    subject: `[TICKET-${shortId}] New Help Desk Ticket: ${ticket.title}`,
    text: `A new help desk ticket has been created.

Title: ${ticket.title}
Priority: ${ticket.priority}
Status: ${ticket.status}
Submitted by: ${submitterName} (${submitterEmail})
Location: ${ticket.location}
Computer: ${ticket.computer}

Description:
${ticket.description}

${ticket.errorMessage ? `Error Message: ${ticket.errorMessage}` : ''}
${ticket.impact ? `Impact: ${ticket.impact}` : ''}
${ticket.stepsToReproduce ? `Steps to Reproduce: ${ticket.stepsToReproduce}` : ''}

View ticket: ${ticketUrl}`,
    html: `
      <h2>New Help Desk Ticket</h2>
      <p>A new help desk ticket has been created.</p>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Title:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Priority:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.priority}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.status}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Submitted by:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${submitterName} (${submitterEmail})</td>
        </tr>
        ${ccParticipants.length > 0 ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>CC:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ccParticipants.map(p => `${p.name} (${p.email})`).join(', ')}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.location}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Computer:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.computer}</td>
        </tr>
      </table>
      
      <h3>Description</h3>
      <p style="white-space: pre-wrap;">${ticket.description}</p>
      
      ${ticket.errorMessage ? `
        <h3>Error Message</h3>
        <p style="white-space: pre-wrap;">${ticket.errorMessage}</p>
      ` : ''}
      
      ${ticket.impact ? `
        <h3>Impact</h3>
        <p style="white-space: pre-wrap;">${ticket.impact}</p>
      ` : ''}
      
      ${ticket.stepsToReproduce ? `
        <h3>Steps to Reproduce</h3>
        <p style="white-space: pre-wrap;">${ticket.stepsToReproduce}</p>
      ` : ''}
      
      <p><a href="${ticketUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">View Ticket</a></p>
    `
  };
};

// Email template for ticket submitter confirmation
const createTicketConfirmationEmail = (ticket: Ticket, slaSettings?: SLASettings) => {
  // Use environment variable or fallback to production URL
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://your-project-id.web.app';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const replyToAddress = getTicketReplyAddress(ticket.id!);
  const shortId = getShortIdFromTicket(ticket.id!);
  
  // Get CC participants
  const ccParticipants = ticket.participants?.filter(p => p.role === 'cc') || [];
  const ccEmails = ccParticipants.map(p => p.email);
  
  // Generate SLA expectation text if settings are provided
  const submissionDate = new Date(ticket.createdAt);
  const slaExpectation = slaSettings 
    ? generateSLAExpectationText(ticket.priority, submissionDate, slaSettings)
    : { plainText: '', htmlText: '' };
  
  return {
    to: ticket.email,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    from: 'Help Desk <helpdesk@mail.anglinai.com>',
    replyTo: replyToAddress,
    subject: `[TICKET-${shortId}] Help Desk Ticket Received: ${ticket.title}`,
    text: `Thank you for submitting your help desk ticket.

We have received your request and it has been assigned ticket ID: ${shortId}

Title: ${ticket.title}
Priority: ${ticket.priority}
Status: ${ticket.status}

Description:
${ticket.description}
${slaExpectation.plainText}
We will review your ticket and respond as soon as possible based on the priority level.

You can track the status of your ticket at: ${ticketUrl}

If you have any additional information to add, you can either:
• Reply directly to this email, or
• Use the link above to reply through the website

Best regards,
RCL Help Desk Team`,
    html: `
      <h2>Thank You for Your Help Desk Request</h2>
      <p>We have received your request and it has been assigned ticket ID: <strong>${shortId}</strong></p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Title:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Priority:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.priority}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.status}</td>
        </tr>
      </table>
      
      <h3>Your Request Details:</h3>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <p style="white-space: pre-wrap;">${ticket.description}</p>
      </div>
      ${slaExpectation.htmlText}
      <p>We will review your ticket and respond as soon as possible based on the priority level.</p>
      
      <p><a href="${ticketUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">View Your Ticket</a></p>
      
      <p>If you have any additional information to add, please use the link above to reply to your ticket.</p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        RCL Help Desk Team
      </p>
    `
  };
};

// Send email notification for a new ticket
export const sendTicketCreatedNotification = async (ticket: Ticket): Promise<void> => {
  console.log("Sending notification for ticket: ", ticket.id);
  try {
    // Get app config for SLA settings
    const config = await getAppConfig();
    
    // Send notification to admin using Firebase Extensions
    const adminEmailData = await createTicketNotificationEmail(ticket);
    console.log('Admin notification email TO:', adminEmailData.to);
    console.log('Admin notification email CC:', adminEmailData.cc);
    console.log('Admin notification email FROM:', adminEmailData.from);
    
    const adminEmailDoc = {
      to: Array.isArray(adminEmailData.to) ? adminEmailData.to : [adminEmailData.to],
      cc: adminEmailData.cc || [],
      replyTo: adminEmailData.replyTo,
      message: {
        subject: adminEmailData.subject,
        text: adminEmailData.text,
        html: adminEmailData.html,
        from: adminEmailData.from
      }
    };

    // Enhanced debugging for reply-to issue
    console.log('Admin email document structure:', JSON.stringify(adminEmailDoc, null, 2));
    console.log('Admin email replyTo field:', adminEmailData.replyTo);
    console.log('Admin email domain used:', import.meta.env.VITE_EMAIL_DOMAIN || 'mail.anglinai.com');

    await addDoc(collection(db, 'mail'), adminEmailDoc);
    console.log('Admin email notification sent successfully to:', adminEmailData.to);

    // Send confirmation to submitter using Firebase Extensions
    const submitterEmailData = createTicketConfirmationEmail(ticket, config.slaSettings);
    console.log('Submitter confirmation email TO:', submitterEmailData.to);
    console.log('Submitter confirmation email FROM:', submitterEmailData.from);
    
    const submitterEmailDoc = {
      to: Array.isArray(submitterEmailData.to) ? submitterEmailData.to : [submitterEmailData.to],
      cc: submitterEmailData.cc || [],
      replyTo: submitterEmailData.replyTo,
      message: {
        subject: submitterEmailData.subject,
        text: submitterEmailData.text,
        html: submitterEmailData.html,
        from: submitterEmailData.from
      }
    };

    // Enhanced debugging for reply-to issue
    console.log('Submitter email document structure:', JSON.stringify(submitterEmailDoc, null, 2));
    console.log('Submitter email replyTo field:', submitterEmailData.replyTo);

    await addDoc(collection(db, 'mail'), submitterEmailDoc);
    console.log('Submitter confirmation email sent successfully to:', submitterEmailData.to);
  } catch (error) {
    console.error('Error sending email notifications:', error);
    // Don't throw error as we don't want to fail ticket creation if email fails
  }
};

// Email template for ticket update notification
const createTicketUpdateEmail = (ticket: Ticket, changes: Partial<Ticket>, recipientEmail: string) => {
  // Use environment variable or fallback to production URL
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://your-project-id.web.app';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const replyToAddress = getTicketReplyAddress(ticket.id!);
  const shortId = getShortIdFromTicket(ticket.id!);
  const changesList: string[] = [];
  
  if (changes.status) {
    changesList.push(`Status changed to: ${changes.status}`);
  }
  if (changes.priority) {
    changesList.push(`Priority changed to: ${changes.priority}`);
  }
  if (changes.assigneeId) {
    changesList.push(`Ticket assigned to a technician`);
  }
  
  const changesText = changesList.join('\n');
  const changesHtml = changesList.map(change => `<li>${change}</li>`).join('');
  
  return {
    to: recipientEmail,
    from: 'Help Desk <helpdesk@mail.anglinai.com>',
    replyTo: replyToAddress,
    subject: `[TICKET-${shortId}] Help Desk Ticket Updated: ${ticket.title}`,
    text: `Your help desk ticket has been updated.

Ticket ID: ${shortId}
Title: ${ticket.title}

Changes:
${changesText}

Current Status: ${ticket.status}
Current Priority: ${ticket.priority}

View your ticket: ${ticketUrl}

Best regards,
RCL Help Desk Team`,
    html: `
      <h2>Your Help Desk Ticket Has Been Updated</h2>
      <p>There have been updates to your help desk ticket.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ticket ID:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${shortId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Title:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.title}</td>
        </tr>
      </table>
      
      <h3>Changes Made:</h3>
      <ul style="background-color: #f5f5f5; padding: 15px 15px 15px 30px; border-radius: 5px; margin: 10px 0;">
        ${changesHtml}
      </ul>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Current Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.status}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Current Priority:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.priority}</td>
        </tr>
      </table>
      
      <p><a href="${ticketUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">View Your Ticket</a></p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        RCL Help Desk Team
      </p>
    `
  };
};

// Email template for new reply notification
const createTicketReplyEmail = (ticket: Ticket, reply: TicketReply, recipientEmail: string) => {
  // Use environment variable or fallback to production URL
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'https://your-project-id.web.app';
  const ticketUrl = `${baseUrl}/tickets/${ticket.id}`;
  const replyToAddress = getTicketReplyAddress(ticket.id!);
  const shortId = getShortIdFromTicket(ticket.id!);
  
  return {
    to: recipientEmail,
    from: 'Help Desk <helpdesk@mail.anglinai.com>',
    replyTo: replyToAddress,
    subject: `[TICKET-${shortId}] New Reply on Help Desk Ticket: ${ticket.title}`,
    text: `A new reply has been added to your help desk ticket.

Ticket ID: ${shortId}
Title: ${ticket.title}

Reply from: ${reply.authorName}
Date: ${new Date(reply.createdAt).toLocaleString()}

Message:
${reply.message}

You can reply directly to this email or view your ticket at: ${ticketUrl}

Best regards,
RCL Help Desk Team`,
    html: `
      <h2>New Reply on Your Help Desk Ticket</h2>
      <p>A new reply has been added to your help desk ticket.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ticket ID:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${shortId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Title:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.title}</td>
        </tr>
      </table>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Reply from:</strong> ${reply.authorName}</p>
        <p style="margin: 0 0 10px 0;"><strong>Date:</strong> ${new Date(reply.createdAt).toLocaleString()}</p>
        <hr style="margin: 10px 0;">
        <p style="white-space: pre-wrap; margin: 10px 0 0 0;">${reply.message}</p>
      </div>
      
      <p><a href="${ticketUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">View Ticket and Reply</a></p>
      
      <p style="margin-top: 15px; color: #666;">You can also reply directly to this email to add your response to the ticket.</p>
      
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        RCL Help Desk Team
      </p>
    `
  };
};

// Send notifications to all relevant parties for a ticket update
export const sendTicketUpdateNotification = async (ticket: Ticket, changes: Partial<Ticket>): Promise<void> => {
  console.log("Sending update notification for ticket: ", ticket.id);
  
  // Determine who should receive notifications
  const recipients = new Set<string>();
  
  // Always notify the submitter
  recipients.add(ticket.email);
  
  // Notify additional contacts if the person having problem is different
  if (!ticket.isPersonHavingProblem && ticket.userEmail) {
    recipients.add(ticket.userEmail);
  }
  
  // Notify all CC participants
  ticket.participants.forEach(participant => {
    if (participant.role === 'cc' && participant.email) {
      recipients.add(participant.email);
    }
  });
  
  // Send notification to each recipient using Firebase Extensions
  for (const recipientEmail of recipients) {
    try {
      const emailData = createTicketUpdateEmail(ticket, changes, recipientEmail);
      
      const emailDoc = {
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        replyTo: emailData.replyTo,
        message: {
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
          from: emailData.from
        }
      };

      await addDoc(collection(db, 'mail'), emailDoc);
      console.log(`Update notification sent successfully to: ${recipientEmail}`);
    } catch (error) {
      console.error(`Error sending update notification to ${recipientEmail}:`, error);
    }
  }
};

// Send notifications for a new reply
export const sendTicketReplyNotification = async (ticket: Ticket, reply: TicketReply): Promise<void> => {
  // Don't send notifications for private replies
  if (reply.isPrivate) {
    console.log("Skipping notification for private reply");
    return;
  }
  
  console.log("Sending reply notification for ticket: ", ticket.id);
  console.log("Ticket email:", ticket.email);
  console.log("Reply author email:", reply.authorEmail);
  console.log("Ticket participants:", ticket.participants);
  
  // Determine who should receive notifications
  const recipients = new Set<string>();
  
  // Always notify the submitter (unless they wrote the reply)
  if (ticket.email !== reply.authorEmail) {
    recipients.add(ticket.email);
    console.log("Added submitter to recipients:", ticket.email);
  } else {
    console.log("Skipping submitter (they wrote the reply)");
  }
  
  // Notify additional contacts if the person having problem is different
  if (!ticket.isPersonHavingProblem && ticket.userEmail && ticket.userEmail !== reply.authorEmail) {
    recipients.add(ticket.userEmail);
    console.log("Added user contact to recipients:", ticket.userEmail);
  }
  
  // Notify all CC participants (unless they wrote the reply)
  ticket.participants?.forEach(participant => {
    if (participant.role === 'cc' && participant.email && participant.email !== reply.authorEmail) {
      recipients.add(participant.email);
      console.log("Added CC participant to recipients:", participant.email);
    }
  });
  
  console.log("Total recipients:", Array.from(recipients));
  
  if (recipients.size === 0) {
    console.log("No recipients found - no emails will be sent");
    return;
  }
  
  // Send notification to each recipient using Firebase Extensions
  for (const recipientEmail of recipients) {
    try {
      const emailData = createTicketReplyEmail(ticket, reply, recipientEmail);
      
      const emailDoc = {
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        replyTo: emailData.replyTo,
        message: {
          subject: emailData.subject,
          text: emailData.text,
          html: emailData.html,
          from: emailData.from
        }
      };

      await addDoc(collection(db, 'mail'), emailDoc);
      console.log(`Reply notification sent successfully to: ${recipientEmail}`);
    } catch (error) {
      console.error(`Error sending reply notification to ${recipientEmail}:`, error);
    }
  }
};