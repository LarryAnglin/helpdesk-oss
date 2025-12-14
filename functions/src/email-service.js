/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { getFirestore } = require('firebase-admin/firestore');

/**
 * Send an email using Firebase Extensions Trigger Email
 * This writes to the mail collection which triggers the Firebase Extension
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} [options.from] - Sender email (optional, will use default)
 * @returns {Promise<Object>} - Firebase response
 */
const sendEmail = async (options) => {
  try {
    console.log('Sending email via Firebase Extensions:', { to: options.to, subject: options.subject });
    
    const db = getFirestore();
    
    // Prepare email document for Firebase Extensions
    const emailDoc = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      message: {
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
        // Use configured sender or default
        from: options.from || process.env.DEFAULT_EMAIL_SENDER || 'Help Desk <noreply@yourapp.com>'
      },
      // Add delivery tracking
      delivery: {
        startTime: new Date(),
        state: 'PENDING'
      }
    };

    // Add optional CC/BCC if provided
    if (options.cc) {
      emailDoc.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    }
    if (options.bcc) {
      emailDoc.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    }

    // Write to mail collection - this triggers the Firebase Extension
    const docRef = await db.collection('mail').add(emailDoc);
    console.log('Email queued successfully with ID:', docRef.id);
    
    return {
      success: true,
      messageId: docRef.id,
      message: 'Email queued successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send an email using a template
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.template - Template name
 * @param {Object} options.data - Template data
 * @returns {Promise<Object>} - Firebase response
 */
const sendTemplatedEmail = async (options) => {
  try {
    console.log('Sending templated email:', { to: options.to, template: options.template });
    
    const db = getFirestore();
    
    const emailDoc = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      template: {
        name: options.template,
        data: options.data || {}
      },
      delivery: {
        startTime: new Date(),
        state: 'PENDING'
      }
    };

    const docRef = await db.collection('mail').add(emailDoc);
    console.log('Templated email queued successfully with ID:', docRef.id);
    
    return {
      success: true,
      messageId: docRef.id,
      message: 'Templated email queued successfully'
    };
  } catch (error) {
    console.error('Error sending templated email:', error);
    throw new Error(`Failed to send templated email: ${error.message}`);
  }
};

module.exports = { sendEmail, sendTemplatedEmail };