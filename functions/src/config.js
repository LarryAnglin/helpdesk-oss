/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Get project ID from environment
// Note: functions.config() is deprecated in v2. Use environment variables directly.
const PROJECT_ID = process.env.PROJECT_ID || 'your-project-id';

// Initialize the admin SDK with the project configuration
const app = admin.initializeApp({
  projectId: PROJECT_ID,
});

// Get a reference to Firestore using the default database
const db = admin.firestore();

// This will be called by the function handlers at runtime
const logDatabaseInfo = () => {
  console.log(`Functions using default Firestore database for project: ${PROJECT_ID}`);
};

// Get auth and storage references
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  app,
  db,
  auth,
  storage,
  PROJECT_ID,
  logDatabaseInfo
};