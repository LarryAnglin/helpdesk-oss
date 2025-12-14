/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { initializeSendGrid, sendgridApiKey } = require('./sendgrid');
const { sendViaSES, awsAccessKeyId, awsSecretAccessKey, awsSesRegion } = require('./ses');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Get email provider configuration from Firestore
 */
async function getEmailProvider() {
  try {
    const configDoc = await db.collection('config').doc('email').get();
    if (configDoc.exists) {
      const config = configDoc.data();
      return config.provider || 'sendgrid'; // Default to sendgrid
    }
    return 'sendgrid'; // Default if no config exists
  } catch (error) {
    console.error('Error getting email provider config:', error);
    return 'sendgrid'; // Default on error
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options) {
  const sgMail = initializeSendGrid();

  const msg = {
    to: Array.isArray(options.to) ? options.to : [options.to],
    from: options.from || 'Help Desk <helpdesk@mail.anglinai.com>',
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options['h:Reply-To'] || options.replyTo,
    // Handle attachments if present
    attachments: options.attachment ? (Array.isArray(options.attachment) ? options.attachment : [options.attachment]) : undefined,
  };

  // Handle CC if present
  if (options.cc) {
    msg.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
  }

  // Handle BCC if present
  if (options.bcc) {
    msg.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
  }

  const result = await sgMail.send(msg);
  console.log('Email sent via SendGrid:', result[0].statusCode);
  return result;
}

const sendEmail = async (req, res) => {
  console.log("mailOptions received:", req.body);
  try {
      const provider = await getEmailProvider();
      console.log(`Using email provider: ${provider}`);

      const options = req.body;

      let result;
      if (provider === 'sendgrid') {
        result = await sendViaSendGrid(options);
      } else if (provider === 'ses' || provider === 'amazon-ses') {
        result = await sendViaSES(options);
      } else {
        throw new Error(`Unknown email provider: ${provider}`);
      }

      // Return a proper response to the client
      return res.status(200).json({
          success: true,
          message: 'Email sent successfully',
          provider: provider
      });
  } catch (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({
          success: false,
          message: error.message || 'Failed to send email'
      });
  }
};


module.exports = { sendEmail, getEmailProvider };
