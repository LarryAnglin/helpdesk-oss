/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { ParsedMail } = require('@sendgrid/inbound-mail-parser');

// Define secrets
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const sendgridWebhookVerificationKey = defineSecret('SENDGRID_WEBHOOK_VERIFICATION_KEY');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

/**
 * Generate deterministic short ID from ticket ID using hash (matches client-side logic)
 */
function getShortIdFromTicket(ticketId) {
  // Create a simple hash using built-in methods (same as client-side)
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

/**
 * Find full ticket ID from short ID by checking all tickets
 */
async function findTicketIdFromShortId(shortId) {
  try {
    console.log(`Searching for ticket with short ID: ${shortId}`);

    const allTicketsQuery = db.collection('tickets').limit(500);
    const allTicketsSnap = await allTicketsQuery.get();
    console.log(`Found ${allTicketsSnap.docs.length} total tickets to check`);

    for (const doc of allTicketsSnap.docs) {
      const ticketId = doc.id;
      const generatedShortId = getShortIdFromTicket(ticketId);

      if (generatedShortId === shortId) {
        console.log(`✅ Found ticket ID ${ticketId} for short ID ${shortId}`);
        return ticketId;
      }
    }

    console.log(`❌ No ticket found for short ID: ${shortId}`);
    return null;
  } catch (error) {
    console.error('Error finding ticket ID from short ID:', error);
    return null;
  }
}

/**
 * Extract ticket ID from email address or subject
 */
function extractTicketId(recipient, subject) {
  // Add null checks
  if (!recipient && !subject) {
    console.error('Both recipient and subject are null/undefined');
    return null;
  }

  // Method 1: Extract short ID from recipient email (ticket-AMza3P-reply@domain.com)
  if (recipient) {
    const recipientMatch = recipient.match(/ticket-([A-Za-z0-9]{6})-reply@/);
    if (recipientMatch) {
      const shortId = recipientMatch[1];
      console.log(`Extracted short ID from recipient: ${shortId}`);
      return shortId;
    }
  }

  // Method 2: Extract short ID from subject line [TICKET-AMza3P]
  if (subject) {
    const subjectMatch = subject.match(/\[TICKET-([A-Za-z0-9]{6})\]/i);
    if (subjectMatch) {
      const shortId = subjectMatch[1];
      console.log(`Extracted short ID from subject: ${shortId}`);
      return shortId;
    }
  }

  console.log('No ticket ID found in recipient or subject');
  return null;
}

/**
 * Parse email content to extract clean reply
 */
function parseEmailContent(plainText, htmlText) {
  let content = plainText || '';

  if (!content && htmlText) {
    // Basic HTML to text conversion
    content = htmlText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  if (!content) {
    return '';
  }

  // Remove quoted text patterns
  const quotedPatterns = [
    /^On .* wrote:$/m,
    /^From:.*$/m,
    /^Sent:.*$/m,
    /^To:.*$/m,
    /^Subject:.*$/m,
    /^>.*$/gm,
    /^-----Original Message-----$/m,
    /^________________________________$/m,
  ];

  for (const pattern of quotedPatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      content = content.substring(0, match.index).trim();
      break;
    }
  }

  // Remove signatures
  const signaturePatterns = [
    /^--\s*$/m,
    /^--- \w+.*$/m,
    /^Sent from my \w+.*$/m,
    /^Best regards,?$/m,
    /^Thanks,?$/m,
  ];

  for (const pattern of signaturePatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      content = content.substring(0, match.index).trim();
    }
  }

  return content.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  try {
    const usersQuery = db.collection('users').where('email', '==', email);
    const usersSnap = await usersQuery.get();

    if (usersSnap.empty) {
      return null;
    }

    const userDoc = usersSnap.docs[0];
    return { ...userDoc.data(), uid: userDoc.id };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * Process attachments from SendGrid parsed email
 */
async function processAttachments(attachments, ticketId) {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  try {
    console.log(`Processing ${attachments.length} attachments for ticket ${ticketId}`);

    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        const fileName = `${uuidv4()}.${attachment.filename.split('.').pop() || 'bin'}`;
        const filePath = `tickets/${ticketId}/${fileName}`;

        // Upload to Firebase Storage
        const bucket = storage.bucket();
        const file = bucket.file(filePath);

        // attachment.content is already a Buffer from SendGrid parser
        await file.save(attachment.content, {
          metadata: {
            contentType: attachment.type || 'application/octet-stream',
            metadata: {
              originalName: attachment.filename,
              source: 'email'
            }
          }
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Create attachment object matching the frontend structure
        const ticketAttachment = {
          id: uuidv4(),
          filename: attachment.filename,
          fileUrl: publicUrl,
          contentType: attachment.type || 'application/octet-stream',
          size: attachment.content.length,
          uploadedAt: Date.now()
        };

        processedAttachments.push(ticketAttachment);
        console.log(`Successfully stored attachment: ${attachment.filename}`);

      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
        // Continue with other attachments
      }
    }

    return processedAttachments;

  } catch (error) {
    console.error('Error processing attachments:', error);
    return [];
  }
}

/**
 * Send email notification to ticket owner when customer replies
 */
async function sendOwnerNotification(ticket, reply, originalSender, ticketId) {
  try {
    // Get the ticket owner/assignee
    let ownerEmail = null;

    // First check if ticket has an assignee
    if (ticket.assigneeId) {
      const assigneeDoc = await db.collection('users').doc(ticket.assigneeId).get();
      if (assigneeDoc.exists) {
        ownerEmail = assigneeDoc.data().email;
      }
    }

    // If no assignee, send to admin
    if (!ownerEmail) {
      // Get admin email from config or use default
      const configDoc = await db.collection('config').doc('app').get();
      const config = configDoc.exists ? configDoc.data() : {};
      ownerEmail = config.adminNotificationEmail || config.supportEmail || 'larry@your-domain.com';
    }

    // Don't send notification if the owner is the one who replied
    if (ownerEmail === reply.authorEmail) {
      console.log('Owner replied to their own ticket, skipping notification');
      return;
    }

    // Generate unique reply-to address for the ticket
    const domain = 'mail.anglinai.com';
    const shortId = getShortIdFromTicket(ticketId);
    const replyToAddress = `ticket-${shortId}-reply@${domain}`;

    // Create the email
    const baseUrl = 'https://your-project-id.web.app';
    const ticketUrl = `${baseUrl}/tickets/${ticketId}`;

    const emailData = {
      to: ownerEmail,
      from: 'Help Desk <helpdesk@mail.anglinai.com>',
      replyTo: replyToAddress,
      subject: `[TICKET-${shortId}] Customer Reply: ${ticket.title}`,
      text: `A customer has replied to ticket ${shortId}.

Ticket: ${ticket.title}
Customer: ${reply.authorName} (${reply.authorEmail})
${originalSender ? `Original Sender: ${originalSender}` : ''}

Reply:
${reply.message}

View ticket: ${ticketUrl}

You can reply directly to this email or through the help desk system.

Best regards,
RCL Help Desk System`,
      html: `
        <h2>Customer Reply on Ticket ${shortId}</h2>
        <p>A customer has replied to one of your tickets.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ticket ID:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${shortId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Title:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Customer:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${reply.authorName} (${reply.authorEmail})</td>
          </tr>
          ${originalSender ? `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Original Sender:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${originalSender}</td>
          </tr>` : ''}
        </table>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Customer Reply:</h3>
          <p style="white-space: pre-wrap; margin: 10px 0 0 0;">${reply.message}</p>
        </div>

        <p><a href="${ticketUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px;">View Ticket</a></p>

        <p style="margin-top: 15px; color: #666;">You can reply directly to this email to respond to the customer.</p>

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          RCL Help Desk System
        </p>
      `
    };

    // Send email using Firebase Extensions
    await db.collection('mail').add({
      to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      replyTo: emailData.replyTo,
      message: {
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        from: emailData.from
      }
    });

    console.log(`Owner notification sent successfully to: ${ownerEmail}`);
  } catch (error) {
    console.error('Error sending owner notification:', error);
    // Don't throw error to avoid failing the reply processing
  }
}

/**
 * Add reply to ticket
 */
async function addReplyToTicket(ticketId, content, senderEmail, attachments = [], isHtml = false) {
  try {
    // Get ticket first to verify it exists and get authorized emails
    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const ticket = ticketDoc.data();

    // Check if sender is authorized to reply to this ticket
    const authorizedEmails = [
      ticket.email, // Submitter
      ...(ticket.participants || []).map(p => p.email), // CC participants
      ...(ticket.assigneeEmail ? [ticket.assigneeEmail] : []), // Assignee
    ];

    console.log(`Authorized emails for ticket: ${authorizedEmails.join(', ')}`);
    console.log(`Email sender: ${senderEmail}`);

    if (!authorizedEmails.includes(senderEmail)) {
      // If sender isn't directly authorized, check if we have a user with admin/tech role
      const user = await getUserByEmail(senderEmail);
      if (!user || (user.role !== 'admin' && user.role !== 'tech')) {
        console.log(`Email ${senderEmail} not authorized. Since this came through our unique reply-to address, we'll allow it but note the discrepancy.`);

        // Allow the reply but use the original ticket submitter's info for attribution
        // This handles email forwarding scenarios
        const originalSubmitter = await getUserByEmail(ticket.email);

        if (originalSubmitter) {
          console.log(`Using original submitter ${ticket.email} for attribution`);

          // Create the reply object
          const reply = {
            id: uuidv4(),
            authorId: originalSubmitter.uid,
            authorName: originalSubmitter.displayName || originalSubmitter.email,
            authorEmail: originalSubmitter.email,
            message: `[Email forwarded from ${senderEmail}]\n\n${content}`,
            attachments: attachments || [],
            createdAt: Date.now(),
            isPrivate: false,
            source: 'email',
            originalSender: senderEmail, // Track the actual sender
          };

          // Add the reply to the ticket's replies array
          const replies = [...(ticket.replies || []), reply];

          // Update the ticket with new reply and activity
          await ticketRef.update({
            replies,
            updatedAt: Date.now(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            lastActivityBy: originalSubmitter.uid,
            lastActivityByName: originalSubmitter.displayName || originalSubmitter.email,
          });

          console.log(`Successfully added forwarded email reply to ticket ${ticketId} from ${senderEmail}`);

          // Send notification to ticket owner
          await sendOwnerNotification(ticket, reply, senderEmail, ticketId);

          return;
        } else {
          throw new Error(`Original submitter ${ticket.email} not found in system`);
        }
      }
    }

    // Normal flow: sender is authorized directly or is admin/tech
    let user = await getUserByEmail(senderEmail);

    // If user not found but email is authorized, create a basic user record
    if (!user && authorizedEmails.includes(senderEmail)) {
      console.log(`Creating basic user record for authorized email: ${senderEmail}`);
      user = {
        email: senderEmail,
        displayName: senderEmail.split('@')[0],
        role: 'user',
        uid: null // Will be handled gracefully
      };
    }

    if (!user) {
      throw new Error(`User not found for email: ${senderEmail}`);
    }

    // Create the reply object
    const reply = {
      id: uuidv4(),
      authorId: user.uid || 'email-user',
      authorName: user.displayName || user.email,
      authorEmail: user.email,
      message: content,
      attachments: attachments || [],
      createdAt: Date.now(),
      isPrivate: false,
      source: 'email',
    };

    // Add the reply to the ticket's replies array
    const replies = [...(ticket.replies || []), reply];

    // Update the ticket with new reply and activity
    await ticketRef.update({
      replies,
      updatedAt: Date.now(),
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      lastActivityBy: user.uid || 'email-user',
      lastActivityByName: user.displayName || user.email,
    });

    console.log(`Successfully added email reply to ticket ${ticketId} from ${senderEmail}`);

    // Send notification to ticket owner
    await sendOwnerNotification(ticket, reply, null, ticketId);

  } catch (error) {
    console.error('Error adding reply to ticket:', error);
    throw error;
  }
}

/**
 * Main webhook handler for SendGrid Inbound Parse
 */
exports.sendgridWebhook = onRequest(
  {
    secrets: [sendgridApiKey, sendgridWebhookVerificationKey]
  },
  async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // SendGrid sends the email as multipart/form-data with an 'email' field
    const rawEmail = req.body.email;

    if (!rawEmail) {
      console.error('No email data in request');
      res.status(400).json({ error: 'No email data' });
      return;
    }

    // Parse the email using SendGrid's parser
    const parsedEmail = new ParsedMail(rawEmail);

    const {
      text: plainText,
      html: htmlText,
      subject,
      from,
      to,
      attachments
    } = parsedEmail;

    // Extract sender email
    const senderEmail = from?.value?.[0]?.address || from?.text || '';

    // Extract recipient (to field might be an array)
    const recipient = Array.isArray(to?.value) ? to.value[0]?.address : to?.text || '';

    console.log('Processing SendGrid email webhook:', {
      subject,
      from: senderEmail,
      to: recipient,
      attachmentCount: attachments?.length || 0,
    });

    // Extract short ID from email
    const shortId = extractTicketId(recipient, subject);
    if (!shortId) {
      console.error('Could not extract short ID from email');
      res.status(400).json({ error: 'Could not extract short ID' });
      return;
    }

    // Find full ticket ID from short ID
    const ticketId = await findTicketIdFromShortId(shortId);
    if (!ticketId) {
      console.error(`Could not find ticket for short ID: ${shortId}`);
      res.status(400).json({ error: 'Could not find ticket' });
      return;
    }

    // Parse email content to get clean reply text
    const cleanContent = parseEmailContent(plainText, htmlText);

    if (!cleanContent.trim()) {
      console.error('Email content is empty after parsing');
      res.status(400).json({ error: 'Empty email content' });
      return;
    }

    // Process attachments if any
    let processedAttachments = [];
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachment(s)...`);
      processedAttachments = await processAttachments(attachments, ticketId);
    }

    // Add reply to ticket
    await addReplyToTicket(
      ticketId,
      cleanContent,
      senderEmail,
      processedAttachments,
      Boolean(htmlText)
    );

    res.status(200).json({
      success: true,
      message: `Reply added to ticket ${ticketId}`,
      ticketId,
      senderEmail,
    });

  } catch (error) {
    console.error('SendGrid webhook error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});
