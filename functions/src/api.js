/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const nodemailer = require('nodemailer');
const { corsMiddleware, handleOptionsRequest } = require('./cors');
const { exportData } = require('./export_data');
const { getUsers, createUserRecord, deleteUser } = require('./users');
const { processWebhook } = require('./webhooks');
const { sendEmail } = require('./send-email');
const { handleProjects } = require('./projects');
const { handleTasks } = require('./tasks');
const { exportPDF } = require('./export-pdf');
const { exportCSV } = require('./export-csv');
const { importCSV } = require('./import-csv');
const { importJSON } = require('./import-json');
const { rollbackImport, getImportHistory } = require('./import-rollback');
const { createWebhook, getWebhooks, updateWebhook, deleteWebhook } = require('./webhooks-management');
const { testWebhook } = require('./webhook-delivery');
const { queryTickets } = require('./query-tickets');
const { bulkUpdateTickets, getOrganizationMappings } = require('./bulk-update-tickets');

// Try to use the Algolia search function, but fall back to basic search if it fails
let searchTickets;
try {
  // First try to load the Algolia search module
  searchTickets = require('./search').searchTickets;
  console.log('Using Algolia search implementation');
} catch (error) {
  // If that fails, use the fallback search
  console.warn('Algolia search module failed to load, using fallback search:', error.message);
  searchTickets = require('./search-fallback').searchTickets;
}


// Collection references
const USERS_COLLECTION = 'users';

// Initialize Express app
const app = express();

// Handle OPTIONS requests directly to bypass CORS issues
app.options('*', handleOptionsRequest);

// Apply CORS middleware to all routes
app.use((req, res, next) => {
  // Apply CORS headers directly for all requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Continue to next middleware
  corsMiddleware(req, res, next);
});

// Add JSON body parser
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from origin: ${req.headers.origin || 'N/A'}`);
  next();
});

// Health check endpoint - open to all for testing
app.get('/health', (req, res) => {
  // Explicitly set CORS headers again for this endpoint
  res.set('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    environment: process.env.NODE_ENV || 'production',
    origin: req.headers.origin || 'N/A',
    headers: req.headers
  });
});

app.get('/tickets/user', async (req, res) => {
  console.log("Fetching user tickets...");
  try {
    // Get the userId from the query parameters
    const userId = req.query.userId;

    if (!userId) {
      console.log('No userId provided in the request');
      return res.status(400).json({ error: 'Missing userId in request' });
    }

    console.log('Fetching tickets for userId:', userId);
    
    // Query tickets where the user is a participant
    const ticketsQuery = admin.firestore()
      .collection('tickets')
      .where('submitterId', '==', userId );

    const ticketsSnap = await ticketsQuery.get();
    const tickets = ticketsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(`Fetched ${tickets.length} tickets for user ${userId}`);
    // Always return an array, even if empty
    return res.status(200).json(tickets || []);
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return res.status(500).json({ error: 'Failed to fetch user tickets' });
  }
});

// Routes
app.post('/export_data', exportData);
app.get('/users', getUsers);
// app.post('/users', createUser);  Users are created automatically the first time they log in.
app.post('/users/create', createUserRecord);
app.delete('/users', deleteUser);  // Add endpoint for user deletion
app.post('/webhooks/email', processWebhook);
app.post('/send-email', sendEmail);
app.get('/search-tickets', searchTickets);

// Project and task routes
app.all('/projects', handleProjects);
app.all('/tasks', handleTasks);

// Export routes
app.post('/export-pdf', exportPDF);
app.post('/export-csv', exportCSV);

// Import routes
app.post('/import-csv', importCSV);
app.post('/import-json', importJSON);
app.post('/rollback-import', rollbackImport);
app.get('/import-history', getImportHistory);

// Webhook routes
app.post('/webhooks', createWebhook);
app.get('/webhooks', getWebhooks);
app.put('/webhooks', updateWebhook);
app.delete('/webhooks', deleteWebhook);
app.post('/webhooks/test', testWebhook);

// Ticket analysis and bulk update routes
app.get('/analyze-tickets', queryTickets);
app.post('/bulk-update-tickets', bulkUpdateTickets);
app.get('/organization-mappings', getOrganizationMappings);

// Other existing API endpoints...
// You can add the rest of your endpoints here
exports.api = onRequest(app);