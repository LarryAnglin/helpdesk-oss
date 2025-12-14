/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Check for API key in environment variable
if (!process.env.MAILGUN_API_KEY) {
  console.error('❌ Error: MAILGUN_API_KEY environment variable is not set');
  console.error('Please set it with: export MAILGUN_API_KEY=your-api-key');
  process.exit(1);
}

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

async function sendTestEmail() {
  try {
    console.log('Sending test email directly via Mailgun...');
    
    const result = await mg.messages.create("mail.your-domain.com", {
      from: 'RCL Help Desk <helpdesk@mail.your-domain.com>',
      to: ['larry@your-domain.com'],
      subject: 'Test Email from Help Desk System',
      text: 'This is a test email to verify the Mailgun configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email from Help Desk System</h2>
          <p>This is a test email to verify the Mailgun configuration is working correctly.</p>
          <p>If you receive this email, it means:</p>
          <ul>
            <li>✅ Mailgun API credentials are valid</li>
            <li>✅ Domain configuration is correct</li>
            <li>✅ Email sending functionality is operational</li>
          </ul>
          <p style="color: #666; font-size: 14px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Response:', result);
    console.log('\nCheck larry@your-domain.com for the test email.');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

console.log('=== Direct Mailgun Test ===\n');
sendTestEmail();