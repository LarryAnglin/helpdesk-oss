/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Extremely simplified CORS handling for Firebase Functions
 */
const cors = require('cors');

// Create a completely open CORS middleware for development/debugging
const corsMiddleware = cors({
  origin: '*',  // Allow any origin for now to debug the issue
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: false, // Set to false for simpler CORS rules
  maxAge: 86400 // 24 hours
});

// Standalone OPTIONS handler for preflight requests
const handleOptionsRequest = (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.set('Access-Control-Max-Age', '86400');
  
  // Pre-flight request. Reply successfully:
  res.status(204).send('');
};

module.exports = {
  corsMiddleware,
  handleOptionsRequest
};