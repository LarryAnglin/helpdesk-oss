/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const { defineSecret } = require('firebase-functions/params');

// Define the secret parameters for AWS SES
const awsAccessKeyId = defineSecret('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = defineSecret('AWS_SECRET_ACCESS_KEY');
const awsSesRegion = defineSecret('AWS_SES_REGION');

// Initialize SES client - will be configured when functions run
let sesClient = null;

const initializeSES = () => {
  const accessKeyId = awsAccessKeyId.value();
  const secretAccessKey = awsSecretAccessKey.value();
  const region = awsSesRegion.value() || 'us-east-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets.');
  }

  sesClient = new SESClient({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });

  return sesClient;
};

/**
 * Send an email via Amazon SES
 * @param {Object} options - Email options
 * @param {string|string[]} options.to - Recipient email address(es)
 * @param {string} options.from - Sender email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @param {string} options.replyTo - Reply-to address
 * @param {string|string[]} options.cc - CC recipients
 * @param {string|string[]} options.bcc - BCC recipients
 */
const sendViaSES = async (options) => {
  const client = initializeSES();

  // Normalize recipients to arrays
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
  const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
  const bccAddresses = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

  // Handle reply-to (support both formats from Mailgun and standard)
  const replyTo = options['h:Reply-To'] || options.replyTo;

  const params = {
    Source: options.from || 'Help Desk <helpdesk@mail.anglinai.com>',
    Destination: {
      ToAddresses: toAddresses,
      CcAddresses: ccAddresses.length > 0 ? ccAddresses : undefined,
      BccAddresses: bccAddresses.length > 0 ? bccAddresses : undefined,
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: options.text ? {
          Data: options.text,
          Charset: 'UTF-8',
        } : undefined,
        Html: options.html ? {
          Data: options.html,
          Charset: 'UTF-8',
        } : undefined,
      },
    },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
  };

  const command = new SendEmailCommand(params);
  const result = await client.send(command);

  console.log('Email sent via Amazon SES:', result.MessageId);
  return result;
};

// Export the initialization function, secrets, and send function
module.exports = {
  initializeSES,
  sendViaSES,
  awsAccessKeyId,
  awsSecretAccessKey,
  awsSesRegion
};
