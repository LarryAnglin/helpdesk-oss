/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function createTestTicketAndReply() {
  try {
    console.log('Creating test ticket for email notification...');
    
    // Create a test ticket
    const testTicket = {
      title: 'Test Ticket for Email Notification',
      description: 'This is a test ticket to verify email notifications are working correctly.',
      priority: 'medium',
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      email: 'test-submitter@example.com', // Original submitter
      userEmail: 'user@example.com', // Person having the problem (will receive notification)
      isPersonHavingProblem: false, // This ensures userEmail gets notified
      participants: [
        { role: 'submitter', userId: 'test-user-1', email: 'test-submitter@example.com' },
        { role: 'cc', userId: 'larry-cc', email: 'user@example.com' } // Also CC'd
      ],
      replies: []
    };

    // Add the ticket to Firestore
    const ticketRef = await db.collection('tickets').add(testTicket);
    console.log(`Test ticket created with ID: ${ticketRef.id}`);

    // Fetch the created ticket
    const ticketDoc = await ticketRef.get();
    const ticketData = { id: ticketRef.id, ...ticketDoc.data() };

    // Create a test reply
    const testReply = {
      message: 'This is a test reply to verify the email notification system is working properly. You should receive this via email at user@example.com.',
      author: {
        email: 'support@example.com',
        name: 'Support Team'
      },
      timestamp: new Date().toISOString(),
      isPrivate: false
    };

    console.log('\nSending test email notification to user@example.com...');
    
    // Call the Cloud Function API to send the email
    const { default: fetch } = await import('node-fetch');
    const functionsUrl = process.env.FUNCTIONS_URL || 'http://localhost:5001/your-project-id/us-central1';
    
    const emailResponse = await fetch(`${functionsUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'ticket-reply',
        ticket: ticketData,
        reply: testReply,
        recipients: ['user@example.com'], // Explicitly set recipient
        subject: `Re: Ticket #${ticketRef.id} - ${testTicket.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Reply to Your Ticket</h2>
            <p><strong>Ticket:</strong> #${ticketRef.id} - ${testTicket.title}</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>${testReply.author.name}</strong> replied:</p>
              <p style="white-space: pre-wrap;">${testReply.message}</p>
            </div>
            <p><a href="https://helpdesk.your-domain.com/tickets/${ticketRef.id}" style="color: #2563eb;">View Ticket</a></p>
          </div>
        `,
        text: `New Reply to Your Ticket\n\nTicket: #${ticketRef.id} - ${testTicket.title}\n\n${testReply.author.name} replied:\n${testReply.message}\n\nView Ticket: https://helpdesk.your-domain.com/tickets/${ticketRef.id}`
      })
    });

    let emailResult;
    const responseText = await emailResponse.text();
    try {
      emailResult = JSON.parse(responseText);
    } catch (e) {
      console.error('Response was not JSON:', responseText);
      emailResult = { error: responseText };
    }
    
    if (emailResponse.ok) {
      console.log('\n✅ Test email sent successfully!');
      console.log('Response:', emailResult);
      console.log('\nCheck user@example.com for the test notification email.');
    } else {
      console.error('\n❌ Failed to send test email:', emailResult);
    }

    // Clean up - delete the test ticket
    console.log('\nCleaning up test ticket...');
    await ticketRef.delete();
    console.log('Test ticket deleted.');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Exit the process
    process.exit();
  }
}

// Run the test
console.log('=== Email Notification Test ===\n');
console.log('This test will:');
console.log('1. Create a temporary test ticket');
console.log('2. Send a test notification email to user@example.com');
console.log('3. Clean up the test ticket\n');

createTestTicketAndReply();