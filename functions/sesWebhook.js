/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { simpleParser } = require('mailparser');

// Define secrets for AWS SES
const awsAccessKeyId = defineSecret('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = defineSecret('AWS_SECRET_ACCESS_KEY');

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
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const positiveHash = Math.abs(hash).toString(16);
  const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let num = BigInt('0x' + positiveHash);
  let result = '';

  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }

  result = result || '0';

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
        console.log(`Found ticket ID ${ticketId} for short ID ${shortId}`);
        return ticketId;
      }
    }

    console.log(`No ticket found for short ID: ${shortId}`);
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
 * Process attachments from parsed email
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

        const bucket = storage.bucket();
        const file = bucket.file(filePath);

        await file.save(attachment.content, {
          metadata: {
            contentType: attachment.contentType || 'application/octet-stream',
            metadata: {
              originalName: attachment.filename,
              source: 'email-ses'
            }
          }
        });

        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        const ticketAttachment = {
          id: uuidv4(),
          filename: attachment.filename,
          fileUrl: publicUrl,
          contentType: attachment.contentType || 'application/octet-stream',
          size: attachment.size || attachment.content.length,
          uploadedAt: Date.now()
        };

        processedAttachments.push(ticketAttachment);
        console.log(`Successfully stored attachment: ${attachment.filename}`);

      } catch (error) {
        console.error(`Error processing attachment ${attachment.filename}:`, error);
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
    let ownerEmail = null;

    if (ticket.assigneeId) {
      const assigneeDoc = await db.collection('users').doc(ticket.assigneeId).get();
      if (assigneeDoc.exists) {
        ownerEmail = assigneeDoc.data().email;
      }
    }

    if (!ownerEmail) {
      const configDoc = await db.collection('config').doc('app').get();
      const config = configDoc.exists ? configDoc.data() : {};
      ownerEmail = config.adminNotificationEmail || config.supportEmail || 'larry@your-domain.com';
    }

    if (ownerEmail === reply.authorEmail) {
      console.log('Owner replied to their own ticket, skipping notification');
      return;
    }

    const domain = 'mail.anglinai.com';
    const shortId = getShortIdFromTicket(ticketId);
    const replyToAddress = `ticket-${shortId}-reply@${domain}`;

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
  }
}

/**
 * Add reply to ticket
 */
async function addReplyToTicket(ticketId, content, senderEmail, attachments = [], isHtml = false) {
  try {
    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const ticket = ticketDoc.data();

    const authorizedEmails = [
      ticket.email,
      ...(ticket.participants || []).map(p => p.email),
      ...(ticket.assigneeEmail ? [ticket.assigneeEmail] : []),
    ];

    console.log(`Authorized emails for ticket: ${authorizedEmails.join(', ')}`);
    console.log(`Email sender: ${senderEmail}`);

    if (!authorizedEmails.includes(senderEmail)) {
      const user = await getUserByEmail(senderEmail);
      if (!user || (user.role !== 'admin' && user.role !== 'tech')) {
        console.log(`Email ${senderEmail} not authorized. Allowing due to unique reply-to address.`);

        const originalSubmitter = await getUserByEmail(ticket.email);

        if (originalSubmitter) {
          console.log(`Using original submitter ${ticket.email} for attribution`);

          const reply = {
            id: uuidv4(),
            authorId: originalSubmitter.uid,
            authorName: originalSubmitter.displayName || originalSubmitter.email,
            authorEmail: originalSubmitter.email,
            message: `[Email forwarded from ${senderEmail}]\n\n${content}`,
            attachments: attachments || [],
            createdAt: Date.now(),
            isPrivate: false,
            source: 'email-ses',
            originalSender: senderEmail,
          };

          const replies = [...(ticket.replies || []), reply];

          await ticketRef.update({
            replies,
            updatedAt: Date.now(),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            lastActivityBy: originalSubmitter.uid,
            lastActivityByName: originalSubmitter.displayName || originalSubmitter.email,
          });

          console.log(`Successfully added forwarded email reply to ticket ${ticketId} from ${senderEmail}`);

          await sendOwnerNotification(ticket, reply, senderEmail, ticketId);

          return;
        } else {
          throw new Error(`Original submitter ${ticket.email} not found in system`);
        }
      }
    }

    let user = await getUserByEmail(senderEmail);

    if (!user && authorizedEmails.includes(senderEmail)) {
      console.log(`Creating basic user record for authorized email: ${senderEmail}`);
      user = {
        email: senderEmail,
        displayName: senderEmail.split('@')[0],
        role: 'user',
        uid: null
      };
    }

    if (!user) {
      throw new Error(`User not found for email: ${senderEmail}`);
    }

    const reply = {
      id: uuidv4(),
      authorId: user.uid || 'email-user',
      authorName: user.displayName || user.email,
      authorEmail: user.email,
      message: content,
      attachments: attachments || [],
      createdAt: Date.now(),
      isPrivate: false,
      source: 'email-ses',
    };

    const replies = [...(ticket.replies || []), reply];

    await ticketRef.update({
      replies,
      updatedAt: Date.now(),
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      lastActivityBy: user.uid || 'email-user',
      lastActivityByName: user.displayName || user.email,
    });

    console.log(`Successfully added email reply to ticket ${ticketId} from ${senderEmail}`);

    await sendOwnerNotification(ticket, reply, null, ticketId);

  } catch (error) {
    console.error('Error adding reply to ticket:', error);
    throw error;
  }
}

/**
 * Main webhook handler for Amazon SES via SNS
 *
 * SES sends emails via SNS notifications. The notification can be:
 * 1. SubscriptionConfirmation - needs to be confirmed by visiting the SubscribeURL
 * 2. Notification - contains the actual email content
 */
exports.sesWebhook = onRequest(
  {
    secrets: [awsAccessKeyId, awsSecretAccessKey]
  },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-amz-sns-message-type, x-amz-sns-message-id, x-amz-sns-topic-arn');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Check the SNS message type
      const messageType = req.headers['x-amz-sns-message-type'];

      let body = req.body;

      // If body is a string, parse it
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }

      console.log('SES Webhook received:', {
        messageType,
        topicArn: req.headers['x-amz-sns-topic-arn'],
      });

      // Handle SNS subscription confirmation
      if (messageType === 'SubscriptionConfirmation') {
        console.log('SNS Subscription Confirmation received');
        console.log('SubscribeURL:', body.SubscribeURL);

        // Automatically confirm the subscription
        if (body.SubscribeURL) {
          const https = require('https');
          const http = require('http');
          const url = new URL(body.SubscribeURL);
          const protocol = url.protocol === 'https:' ? https : http;

          await new Promise((resolve, reject) => {
            protocol.get(body.SubscribeURL, (response) => {
              console.log('SNS Subscription confirmed, status:', response.statusCode);
              resolve(response);
            }).on('error', (err) => {
              console.error('Error confirming SNS subscription:', err);
              reject(err);
            });
          });
        }

        res.status(200).json({
          success: true,
          message: 'SNS subscription confirmation received'
        });
        return;
      }

      // Handle unsubscribe confirmation
      if (messageType === 'UnsubscribeConfirmation') {
        console.log('SNS Unsubscribe Confirmation received');
        res.status(200).json({
          success: true,
          message: 'SNS unsubscribe confirmation received'
        });
        return;
      }

      // Handle actual notification (email)
      if (messageType === 'Notification') {
        const message = typeof body.Message === 'string'
          ? JSON.parse(body.Message)
          : body.Message;

        // SES can send different notification types
        const notificationType = message.notificationType;

        console.log('SES Notification type:', notificationType);

        // Handle bounce and complaint notifications
        if (notificationType === 'Bounce') {
          console.log('Bounce notification:', message.bounce);
          res.status(200).json({ success: true, message: 'Bounce processed' });
          return;
        }

        if (notificationType === 'Complaint') {
          console.log('Complaint notification:', message.complaint);
          res.status(200).json({ success: true, message: 'Complaint processed' });
          return;
        }

        // Handle inbound email (Received notification)
        if (notificationType === 'Received' || message.mail) {
          const mail = message.mail;
          const receipt = message.receipt;

          // Get the raw email content
          // SES can either include content directly or store in S3
          let rawEmail = message.content;

          if (!rawEmail && receipt && receipt.action && receipt.action.type === 'S3') {
            // Email stored in S3 - would need to fetch it
            console.error('S3 storage action not yet supported');
            res.status(200).json({
              success: false,
              message: 'S3 storage not yet supported. Please configure SES to include email content in SNS notification.'
            });
            return;
          }

          if (!rawEmail) {
            console.error('No email content in notification');
            res.status(400).json({ error: 'No email content' });
            return;
          }

          // Parse the raw email
          const parsedEmail = await simpleParser(rawEmail);

          const {
            text: plainText,
            html: htmlText,
            subject,
            from,
            to,
            attachments
          } = parsedEmail;

          // Extract sender email
          const senderEmail = from?.value?.[0]?.address || '';

          // Extract recipient
          const recipient = Array.isArray(to?.value)
            ? to.value[0]?.address
            : to?.value?.address || '';

          console.log('Processing SES email:', {
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
          return;
        }

        // Unknown notification type
        console.log('Unknown SES notification type:', notificationType);
        res.status(200).json({
          success: true,
          message: `Processed notification type: ${notificationType}`
        });
        return;
      }

      // Unknown message type
      console.log('Unknown SNS message type:', messageType);
      res.status(200).json({ success: true, message: 'Message received' });

    } catch (error) {
      console.error('SES webhook error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  }
);
