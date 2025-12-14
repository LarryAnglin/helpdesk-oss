/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const sgMail = require('@sendgrid/mail');
const { defineSecret } = require('firebase-functions/params');

// Define the secret parameter
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Initialize SendGrid - will be configured in functions that use it
const initializeSendGrid = () => {
  const apiKey = sendgridApiKey.value();
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY secret not configured');
  }
  sgMail.setApiKey(apiKey);
  return sgMail;
};

// Export both the initialization function and the secret
module.exports = { initializeSendGrid, sendgridApiKey, sgMail };
