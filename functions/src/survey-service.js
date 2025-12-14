/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const { sendEmail } = require('./email-service');
const crypto = require('crypto');

// Default survey settings if not configured
const DEFAULT_SURVEY_SETTINGS = {
  enabled: true,
  sendDelay: 15, // 15 minutes after closure
  excludedEmails: [],
  reminderEnabled: false,
  reminderDelay: 3, // 3 days
  emailTemplate: {
    subject: 'How was your support experience? - Ticket #{ticketId}',
    headerText: 'We value your feedback! Please take a moment to rate your recent support experience.',
    footerText: 'Thank you for helping us improve our service.',
    ratingLabels: {
      1: 'Very Dissatisfied',
      2: 'Dissatisfied',
      3: 'Neutral',
      4: 'Satisfied',
      5: 'Very Satisfied'
    }
  }
};

/**
 * Generate a unique survey token
 */
const generateSurveyToken = (ticketId, email) => {
  const data = `${ticketId}-${email}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
};

/**
 * Check if email should receive survey
 */
const shouldSendSurvey = (email, surveySettings) => {
  if (!surveySettings || !surveySettings.enabled) {
    return false;
  }
  
  // Check if email is in excluded list
  const excludedEmails = surveySettings.excludedEmails || [];
  if (excludedEmails.includes(email.toLowerCase())) {
    console.log(`Email ${email} is in excluded list, skipping survey`);
    return false;
  }
  
  // Check for common no-reply patterns
  const noReplyPatterns = [
    /no[-_]?reply/i,
    /do[-_]?not[-_]?reply/i,
    /automated/i,
    /system/i,
    /daemon/i,
    /bounce/i
  ];
  
  if (noReplyPatterns.some(pattern => pattern.test(email))) {
    console.log(`Email ${email} matches no-reply pattern, skipping survey`);
    return false;
  }
  
  return true;
};

/**
 * Create survey email HTML
 */
const createSurveyEmailHtml = (ticket, surveySettings, surveyUrl) => {
  const template = surveySettings.emailTemplate;
  const subject = template.subject.replace('{ticketId}', ticket.id);
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Satisfaction Survey</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h2 {
      color: #1976d2;
      margin-bottom: 10px;
    }
    .ticket-info {
      background-color: #fff;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
      border-left: 4px solid #1976d2;
    }
    .ticket-info h3 {
      margin-top: 0;
      color: #1976d2;
    }
    .ticket-info p {
      margin: 5px 0;
    }
    .rating-section {
      text-align: center;
      margin: 30px 0;
    }
    .rating-buttons {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .rating-button {
      display: inline-block;
      padding: 15px 20px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      color: white;
      text-align: center;
      min-width: 50px;
      transition: transform 0.2s;
    }
    .rating-button:hover {
      transform: scale(1.05);
    }
    .rating-1 { background-color: #d32f2f; }
    .rating-2 { background-color: #f57c00; }
    .rating-3 { background-color: #fbc02d; }
    .rating-4 { background-color: #689f38; }
    .rating-5 { background-color: #388e3c; }
    .rating-label {
      font-size: 12px;
      margin-top: 5px;
      display: block;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 14px;
    }
    .feedback-link {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #1976d2;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .rating-buttons {
        flex-direction: column;
        align-items: center;
      }
      .rating-button {
        width: 80%;
        max-width: 200px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Customer Satisfaction Survey</h2>
      <p>${template.headerText}</p>
    </div>
    
    <div class="ticket-info">
      <h3>Ticket Details</h3>
      <p><strong>Ticket #:</strong> ${ticket.id}</p>
      <p><strong>Subject:</strong> ${ticket.title}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p><strong>Closed on:</strong> ${new Date(ticket.resolvedAt || ticket.updatedAt).toLocaleDateString()}</p>
    </div>
    
    <div class="rating-section">
      <h3>How satisfied were you with our support?</h3>
      <div class="rating-buttons">
        ${[1, 2, 3, 4, 5].map(rating => `
          <a href="${surveyUrl}&rating=${rating}" class="rating-button rating-${rating}">
            ${rating}
            <span class="rating-label">${template.ratingLabels[rating]}</span>
          </a>
        `).join('')}
      </div>
      
      <p style="margin-top: 20px; color: #666;">
        Click on a rating above to submit your feedback
      </p>
      
      <a href="${surveyUrl}" class="feedback-link">
        Provide detailed feedback
      </a>
    </div>
    
    <div class="footer">
      <p>${template.footerText}</p>
      <p style="font-size: 12px; color: #999;">
        If you're having trouble with the buttons above, copy and paste this link into your browser:<br>
        ${surveyUrl}
      </p>
    </div>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
};

/**
 * Send satisfaction survey email
 */
const sendSurveyEmail = async (ticket, config) => {
  try {
    const surveySettings = config.surveySettings || DEFAULT_SURVEY_SETTINGS;
    
    if (!shouldSendSurvey(ticket.email, surveySettings)) {
      console.log(`Skipping survey for ticket ${ticket.id} - email excluded or disabled`);
      return { success: false, reason: 'Email excluded or surveys disabled' };
    }
    
    // Generate survey token
    const surveyToken = generateSurveyToken(ticket.id, ticket.email);
    
    // Store survey token in database for validation
    await admin.firestore().collection('survey_tokens').doc(surveyToken).set({
      ticketId: ticket.id,
      email: ticket.email,
      createdAt: Date.now(),
      used: false,
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    // Create survey URL (this would be your actual survey page URL)
    const baseUrl = config.baseUrl || 'https://your-helpdesk.com';
    const surveyUrl = `${baseUrl}/survey?token=${surveyToken}&ticket=${ticket.id}`;
    
    // Create email content
    const { subject, html } = createSurveyEmailHtml(ticket, surveySettings, surveyUrl);
    
    // Send email
    await sendEmail({
      to: ticket.email,
      subject: subject,
      html: html,
      text: `Please rate your support experience for ticket #${ticket.id}: ${surveyUrl}`
    });
    
    // Log survey sent
    await admin.firestore().collection('survey_logs').add({
      ticketId: ticket.id,
      email: ticket.email,
      sentAt: Date.now(),
      token: surveyToken
    });
    
    console.log(`Survey email sent for ticket ${ticket.id} to ${ticket.email}`);
    return { success: true, token: surveyToken };
    
  } catch (error) {
    console.error('Error sending survey email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Schedule survey email to be sent after delay
 */
const scheduleSurveyEmail = async (ticket, config) => {
  try {
    const surveySettings = config.surveySettings || DEFAULT_SURVEY_SETTINGS;
    const sendDelay = surveySettings.sendDelay || 15; // minutes
    
    // Calculate send time
    const sendAt = Date.now() + (sendDelay * 60 * 1000);
    
    // Store scheduled survey
    await admin.firestore().collection('scheduled_surveys').add({
      ticketId: ticket.id,
      scheduledFor: sendAt,
      created: Date.now(),
      processed: false
    });
    
    console.log(`Survey scheduled for ticket ${ticket.id} at ${new Date(sendAt).toISOString()}`);
    return { success: true, scheduledFor: sendAt };
    
  } catch (error) {
    console.error('Error scheduling survey:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process scheduled surveys
 */
const processScheduledSurveys = async () => {
  try {
    const now = Date.now();
    
    // Get config
    const configDoc = await admin.firestore().collection('config').doc('app').get();
    const config = configDoc.exists ? configDoc.data() : {};
    
    // Get all due surveys
    const scheduledSurveys = await admin.firestore()
      .collection('scheduled_surveys')
      .where('processed', '==', false)
      .where('scheduledFor', '<=', now)
      .limit(50) // Process in batches
      .get();
    
    if (scheduledSurveys.empty) {
      return { success: true, processed: 0 };
    }
    
    const results = [];
    
    for (const doc of scheduledSurveys.docs) {
      const survey = doc.data();
      
      try {
        // Get ticket data
        const ticketDoc = await admin.firestore()
          .collection('tickets')
          .doc(survey.ticketId)
          .get();
        
        if (!ticketDoc.exists) {
          console.log(`Ticket ${survey.ticketId} not found, skipping survey`);
          await doc.ref.update({ processed: true, error: 'Ticket not found' });
          continue;
        }
        
        const ticket = { id: ticketDoc.id, ...ticketDoc.data() };
        
        // Only send if ticket is still closed
        if (ticket.status === 'Closed') {
          const result = await sendSurveyEmail(ticket, config);
          results.push({ ticketId: ticket.id, ...result });
        }
        
        // Mark as processed
        await doc.ref.update({ 
          processed: true, 
          processedAt: Date.now() 
        });
        
      } catch (error) {
        console.error(`Error processing survey for ${survey.ticketId}:`, error);
        await doc.ref.update({ 
          processed: true, 
          error: error.message 
        });
      }
    }
    
    return { 
      success: true, 
      processed: results.length,
      results 
    };
    
  } catch (error) {
    console.error('Error processing scheduled surveys:', error);
    throw error;
  }
};

/**
 * Record survey response
 */
const recordSurveyResponse = async (token, rating, feedback = '') => {
  try {
    // Validate token
    const tokenDoc = await admin.firestore()
      .collection('survey_tokens')
      .doc(token)
      .get();
    
    if (!tokenDoc.exists) {
      throw new Error('Invalid survey token');
    }
    
    const tokenData = tokenDoc.data();
    
    if (tokenData.used) {
      throw new Error('Survey already completed');
    }
    
    if (tokenData.expiresAt < Date.now()) {
      throw new Error('Survey link has expired');
    }
    
    // Get ticket data
    const ticketDoc = await admin.firestore()
      .collection('tickets')
      .doc(tokenData.ticketId)
      .get();
    
    if (!ticketDoc.exists) {
      throw new Error('Ticket not found');
    }
    
    const ticket = ticketDoc.data();
    
    // Calculate resolution time
    const resolutionTime = ticket.resolvedAt 
      ? (ticket.resolvedAt - ticket.createdAt) / (1000 * 60 * 60) // hours
      : 0;
    
    // Create survey response
    const response = {
      id: admin.firestore().collection('survey_responses').doc().id,
      ticketId: tokenData.ticketId,
      rating: Number(rating),
      feedback: feedback || '',
      respondentEmail: tokenData.email,
      respondentName: ticket.name,
      techId: ticket.assigneeId,
      techName: ticket.assigneeName || '',
      createdAt: Date.now(),
      ticketTitle: ticket.title,
      ticketPriority: ticket.priority,
      resolutionTime
    };
    
    // Save response
    await admin.firestore()
      .collection('survey_responses')
      .doc(response.id)
      .set(response);
    
    // Mark token as used
    await tokenDoc.ref.update({ 
      used: true, 
      usedAt: Date.now() 
    });
    
    console.log(`Survey response recorded for ticket ${tokenData.ticketId} with rating ${rating}`);
    return { success: true, response };
    
  } catch (error) {
    console.error('Error recording survey response:', error);
    throw error;
  }
};

module.exports = {
  sendSurveyEmail,
  scheduleSurveyEmail,
  processScheduledSurveys,
  recordSurveyResponse,
  shouldSendSurvey,
  generateSurveyToken
};