/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { 
  auth,
  firestore
} = require('firebase-functions/v1');
const { db, auth: adminAuth, logDatabaseInfo } = require('./config');

/**
 * Sync user roles to Firebase Auth custom claims when user documents are created or updated.
 * This allows Storage Security Rules to check user roles.
 */
exports.syncUserClaims = firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    // Log database info at runtime
    logDatabaseInfo();
    
    const userId = context.params.userId;
    const userData = change.after.exists ? change.after.data() : null;
    
    if (!userData) {
      console.log(`User ${userId} was deleted, no claims to set.`);
      return null;
    }
    
    console.log(`Setting custom claims for user ${userId} with role ${userData.role}`);
    
    try {
      // Set custom claims with user role
      await adminAuth.setCustomUserClaims(userId, {
        role: userData.role,
        updatedAt: Date.now()
      });
      
      console.log(`Successfully set custom claims for user ${userId}`);
      return null;
    } catch (error) {
      console.error(`Error setting custom claims for user ${userId}:`, error);
      return null;
    }
  });

/**
 * When a new user signs up with Google, this function can be used to set initial custom claims.
 * Triggered by Firebase Auth user creation.
 */
exports.processNewUser = auth.user().onCreate(async (user) => {
  // Log database info at runtime
  logDatabaseInfo();
  
  console.log(`New user created: ${user.uid}, email: ${user.email}`);
  
  try {
    // Check if a Firestore user document already exists
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      console.log(`No Firestore document found for user ${user.uid}, creating one.`);
      
      // Create a new user document with default role
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'user', // Default role
        createdAt: Date.now()
      });
      
      console.log(`Created Firestore document for user ${user.uid}`);
    } else {
      console.log(`Firestore document already exists for user ${user.uid}`);
    }
    
    // Set custom claims for new user
    await adminAuth.setCustomUserClaims(user.uid, {
      role: 'user', // Default role
      updatedAt: Date.now()
    });
    
    console.log(`Set initial custom claims for user ${user.uid}`);
    return null;
  } catch (error) {
    console.error(`Error processing new user ${user.uid}:`, error);
    return null;
  }
});