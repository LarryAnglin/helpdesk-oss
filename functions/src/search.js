/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Algolia search functionality for Firebase Functions
 * 
 * This module provides a search API endpoint for tickets using Algolia
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Import algoliasearch (version 4.x)
const algoliasearch = require('algoliasearch');

// Initialize Algolia client
// For Gen 2 functions, these come from Cloud Secrets
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || '';
const ALGOLIA_API_KEY = process.env.ALGOLIA_ADMIN_API_KEY || '';
const TICKETS_INDEX_NAME = 'tickets';

console.log(`Initializing Algolia with App ID: ${ALGOLIA_APP_ID}`);

// Handle case where credentials are missing
if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY) {
  console.warn('Missing Algolia credentials. Search functionality will be limited.');
}

// Try creating the client in a try/catch to prevent deployment failures
let algoliaClient;
let ticketsIndex;

try {
  algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  ticketsIndex = algoliaClient.initIndex(TICKETS_INDEX_NAME);
  console.log('Algolia client initialized successfully');
} catch (error) {
  console.error('Error initializing Algolia client:', error);
}

/**
 * Search tickets using Algolia
 * 
 * @param {Object} req - The HTTP request
 * @param {Object} res - The HTTP response
 */
exports.searchTickets = async (req, res) => {
  try {
    console.log('Search request received');

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    
    // Early check if Algolia is configured
    if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY || !algoliaClient || !ticketsIndex) {
      console.warn('Algolia is not properly configured');
      return res.status(503).json({ 
        error: 'Search functionality is not available', 
        message: 'The search service is not properly configured'
      });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Invalid token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Get user ID from token
    const userId = decodedToken.uid;
    
    // Get search parameters
    const {
      query = '',
      page = 0,
      hitsPerPage = 10,
      status,
      priority,
      assignedTo,
      createdBy,
    } = req.query;

    // Build filters
    let filters = '';
    
    // For non-admin users, only show their tickets
    const userRecord = await admin.firestore().collection('users').doc(userId).get();
    const userData = userRecord.data();
    const isAdmin = userData && (userData.role === 'admin' || userData.role === 'tech');
    
    if (!isAdmin) {
      filters += `createdByEmail:"${decodedToken.email}" OR assignedToEmail:"${decodedToken.email}"`;
    }
    
    // Add other filters
    if (status) {
      filters += filters ? ` AND status:"${status}"` : `status:"${status}"`;
    }
    
    if (priority) {
      filters += filters ? ` AND priority:"${priority}"` : `priority:"${priority}"`;
    }
    
    if (assignedTo) {
      filters += filters ? ` AND assignedToEmail:"${assignedTo}"` : `assignedToEmail:"${assignedTo}"`;
    }
    
    if (createdBy) {
      filters += filters ? ` AND createdByEmail:"${createdBy}"` : `createdByEmail:"${createdBy}"`;
    }

    // Perform search
    console.log(`Searching with query: "${query}", filters: "${filters}"`);
    
    // Check if Algolia is properly initialized
    if (!algoliaClient || !ticketsIndex) {
      console.error('Algolia client not initialized. Cannot perform search.');
      return res.status(500).json({ 
        error: 'Search service not properly configured. Please contact your administrator.' 
      });
    }
    
    const searchParams = {
      query: query,
      page: Number(page),
      hitsPerPage: Number(hitsPerPage),
      filters: filters.trim(),
      attributesToRetrieve: [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'createdBy',
        'assignedTo',
        'createdByEmail',
        'assignedToEmail',
        'updatedAt',
        'createdAt',
        'location',
        'submitterId',
        'participants',
        'replies',
        'attachments'
      ],
      attributesToHighlight: ['title', 'description']
    };

    let searchResults;
    try {
      searchResults = await ticketsIndex.search(searchParams.query, {
        filters: searchParams.filters,
        page: searchParams.page,
        hitsPerPage: searchParams.hitsPerPage,
        attributesToRetrieve: searchParams.attributesToRetrieve,
        attributesToHighlight: searchParams.attributesToHighlight,
      });
    } catch (error) {
      console.error('Error performing Algolia search:', error);
      return res.status(500).json({ error: 'Search operation failed' });
    }

    // Return search results
    res.status(200).json({
      hits: searchResults.hits,
      page: searchResults.page,
      nbHits: searchResults.nbHits,
      nbPages: searchResults.nbPages,
      hitsPerPage: searchResults.hitsPerPage,
      processingTimeMS: searchResults.processingTimeMS,
      query: searchParams.query,
    });
  } catch (error) {
    console.error('Error in search function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};