/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  where,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { User } from '../types/user';
import { API_ENDPOINTS, callApi } from '../apiConfig';
import { auth } from './firebaseConfig';

const USERS_COLLECTION = 'users';

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { ...userSnap.data(), uid: userSnap.id } as User;
    } else {
      console.log(`User with ID ${userId} not found`);
      return null;
    }
  } catch (error: any) {
    console.error('Error getting user:', error);
    if (error.code === 'permission-denied') {
      console.log('Permission denied for getUserById - user likely does not have access to this user document');
      return null;
    }
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    
    const usersSnap = await getDocs(usersQuery);
    
    if (usersSnap.empty) {
      return null;
    }
    
    const userDoc = usersSnap.docs[0];
    return { ...userDoc.data(), uid: userDoc.id } as User;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const usersSnap = await getDocs(usersQuery);
    const users: User[] = [];
    
    usersSnap.forEach(doc => {
      users.push({ ...doc.data(), uid: doc.id } as User);
    });
    
    console.log(`Successfully retrieved ${users.length} users`);
    return users;
  } catch (error: any) {
    console.error('Error getting users:', error);
    if (error.code === 'permission-denied') {
      console.log('Permission denied for getAllUsers - user likely does not have admin access');
      // Return empty array instead of throwing for permission errors
      return [];
    }
    throw error;
  }
};

export const subscribeToUsers = (
  onUsersUpdate: (users: User[]) => void
): Unsubscribe => {
  const usersQuery = query(
    collection(db, USERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(usersQuery, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach(doc => {
      users.push({ ...doc.data(), uid: doc.id } as User);
    });
    onUsersUpdate(users);
  });
};

// Admin functions (use API endpoints)
export const createUser = async (userData: any): Promise<User> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(API_ENDPOINTS.USERS, {
      method: 'POST',
      body: JSON.stringify(userData)
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: any): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.USERS}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.USERS}/${userId}`, {
      method: 'DELETE'
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const resetUserPassword = async (userId: string): Promise<{ newPassword: string }> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.RESET_PASSWORD}/${userId}`, {
      method: 'POST'
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to reset password: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
};