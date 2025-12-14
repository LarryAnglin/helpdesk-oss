/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Simple fallback search functionality for Firebase Functions when Algolia is not configured
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Fallback search implementation that uses Firestore queries instead of Algolia
 * This is less powerful than Algolia but serves as a basic search capability
 * 
 * @param {Object} req - The HTTP request
 * @param {Object} res - The HTTP response
 */
exports.searchTickets = async (req, res) => {
  try {
    console.log('Fallback search request received');

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
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
    } = req.query;

    // Get user role
    const userRecord = await admin.firestore().collection('users').doc(userId).get();
    const userData = userRecord.data();
    const isAdmin = userData && (userData.role === 'admin' || userData.role === 'tech');
    
    // Set up Firestore query
    let ticketsRef = admin.firestore().collection('tickets');
    
    // Apply status filter if provided
    if (status && status !== 'All') {
      ticketsRef = ticketsRef.where('status', '==', status);
    }
    
    // Limit results to user's tickets unless they're an admin
    if (!isAdmin) {
      ticketsRef = ticketsRef.where('submitterId', '==', userId);
    }
    
    // Execute query and get results
    const snapshot = await ticketsRef.limit(Number(hitsPerPage)).get();
    
    // Process results
    const tickets = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Simple text matching if query is provided
      if (!query || 
          data.title.toLowerCase().includes(query.toLowerCase()) || 
          data.description.toLowerCase().includes(query.toLowerCase())) {
        tickets.push({
          objectID: doc.id,
          ...data,
        });
      }
    });
    
    // Return search results in a format similar to Algolia
    res.status(200).json({
      hits: tickets,
      page: Number(page),
      nbHits: tickets.length,
      nbPages: 1, // Simple fallback doesn't support pagination properly
      hitsPerPage: Number(hitsPerPage),
      processingTimeMS: 0,
      query: query,
      message: 'Using fallback search (Algolia not configured)',
    });
  } catch (error) {
    console.error('Error in fallback search function:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};