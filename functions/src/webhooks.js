/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const { sendEmail } = require('./send-email');
const { db } = require('./config');
const { collection, query, where, getDocs } = admin.firestore();

const processWebhook = async (req, res) => {
  console.log('Received webhook request:', req.body);
  console.log('Webhook headers:', req.headers);
  console.log('Webhook method:', req.method);
  console.log('Webhook URL:', req.url);
  console.log('Webhook body:', req.body);
  console.log('Webhook subject:', req.body.subject);
  console.log('Webhook from:', req.body.from);
  try {
    const fromAddress = req.body.from || 'support@your-domain.com';
    const subject = req.body.subject || 'No Subject';
    const text = req.body['body-plain'] || 'No Body';

    // Check if it's a reply to an existing ticket
    const ticketIdMatch = subject.match(/#(\d+)/);
    if (ticketIdMatch) {
      // It's a reply
      const ticketId = ticketIdMatch[1];
      console.log(`Processing reply to ticket: ${ticketId}`);

      // Add the reply to the ticket
      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', fromAddress));
        const userSnapshot = await getDocs(userQuery);
        let userId = 'email-user';
        let userName = fromAddress;
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          userId = userDoc.id;
          userName = userDoc.data().displayName;
        }

        const ticketRef = admin.firestore().collection('tickets').doc(ticketId);
        await ticketRef.update({
          replies: admin.firestore.FieldValue.arrayUnion({
            text,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userId,
            userName,
            email: fromAddress,
          }),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Reply added to ticket ${ticketId} successfully.`);

        // Send acknowledgment email
        const acknowledgmentMailOptions = {
          from: `'Your Company Name' <support@your-domain.com>`,
          to: fromAddress,
          subject: `Re: Support Ticket #${ticketId} - Reply Received`,
          text: `Your reply has been added to ticket #${ticketId}.\n\n` +
            `You can view the ticket at your-helpdesk-url.com.`,
        };

        await sendEmail(acknowledgmentMailOptions);

        return res.status(200).json({ processed: true, ticketId });
      } catch (error) {
        console.error(`Error adding reply to ticket ${ticketId}:`, error);
        return res.status(500).json({ error: `Failed to add reply to ticket ${ticketId}` });
      }
    } else {
      // It's a new ticket
      console.log('Processing new ticket');

      // Create a new ticket in Firestore
      // TODO: Replace these IDs with your actual tenant/organization/company IDs
      let newTicketId = null;
      try {
        const ticketData = {
          tenantId: 'YOUR_TENANT_ID',
          organizationId: 'YOUR_ORGANIZATION_ID',
          companyId: 'YOUR_COMPANY_ID',
          computer: 'Unknown',
          isOnVpn: false,
          description: text,
          location: 'Main Office',
          name: subject,
          participants: [{ email: fromAddress }],
          priority: 'Low',
          status: 'Open',
          title: subject,
          submitterId: 'email-user',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          replies: [],
        };

        const ticketRef = await admin.firestore().collection('tickets').add(ticketData);
        newTicketId = ticketRef.id;
        console.log('Ticket created successfully with ID:', newTicketId);
      } catch (error) {
        console.error('Error saving ticket to Firestore:', error);
        return res.status(500).json({ error: 'Failed to save ticket to Firestore' });
      }

      // Send acknowledgment email
      const acknowledgmentMailOptions = {
        from: `'Your Company Name' <support@your-domain.com>`,
        to: fromAddress,
        subject: `Support Ticket #${newTicketId} Created`,
        text: `A new help desk ticket has been created from your email. Your ticket number is #${newTicketId} and it has a priority 'Low'.\n\n` +
          `If this is incorrect, use the form at your-helpdesk-url.com and provide the required information including a priority.\n\n` +
          `I don't have the ability to parse an email and set the priority.`,
      };

      // await sendEmail(acknowledgmentMailOptions);
      await sendEmail({body: acknowledgmentMailOptions, headers: {}});

      return res.status(200).json({ processed: true, ticketId: newTicketId });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
};

module.exports = { processWebhook };
