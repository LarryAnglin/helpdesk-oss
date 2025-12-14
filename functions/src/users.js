/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

const getUsers = async (req, res) => {
  try {
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ error: 'Failed to get users' });
  }
};

const createUserRecord = async (req, res) => {
  console.log('Received request to create user record:');
  console.log('Creating user record from req.body:', req.body);
  try {
    const { uid, email, displayName, photoURL } = req.body;
    console.log('Parsed user data:', { uid, email, displayName, photoURL });


    if (!uid || !email || !displayName) {
      return res.status(400).json({ error: 'Missing required fields: uid, email, or displayName' });
    }

    const userDocRef = admin.firestore().collection('users').doc(uid);

    const newUser = {
      uid,
      email,
      displayName,
      photoURL: photoURL || '',
      role: 'user', // Default role
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userDocRef.set(newUser);

    return res.status(200).json({ message: 'User record created successfully', user: newUser });
  } catch (error) {
    console.error('Error creating user record:', error);
    return res.status(500).json({ error: 'Failed to create user record' });
  }
};

/**
 * Delete a user - handles DELETE requests for user deletion
 * Accepts userId either as a query parameter or in the request body
 */
const deleteUser = async (req, res) => {
  try {
    // Get the user ID from either the query parameters or the request body
    const queryUid = req.query.uid;
    const bodyUid = req.body?.uid;
    
    // Use whichever value is available
    const uid = queryUid || bodyUid;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    console.log(`Attempting to delete user with ID: ${uid}`);
    
    // First, delete the user from Firebase Auth
    try {
      await admin.auth().deleteUser(uid);
      console.log(`Deleted user ${uid} from Firebase Auth`);
    } catch (authError) {
      console.error(`Error deleting user ${uid} from Auth:`, authError);
      // Continue with Firestore deletion even if Auth deletion fails
      // This handles cases where the user might exist in Firestore but not in Auth
    }
    
    // Then, delete the user document from Firestore
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.delete();
    console.log(`Deleted user ${uid} from Firestore`);
    
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { getUsers, createUserRecord, deleteUser };