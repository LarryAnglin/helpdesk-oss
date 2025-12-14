/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { NotificationPreferences, UserPreferences } from '../types/notifications';

const USER_PREFERENCES_COLLECTION = 'userPreferences';

export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const userPrefsRef = doc(db, USER_PREFERENCES_COLLECTION, userId);
    const userPrefsSnap = await getDoc(userPrefsRef);
    
    if (userPrefsSnap.exists()) {
      return userPrefsSnap.data() as UserPreferences;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
};

export const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  try {
    const userPrefs = await getUserPreferences(userId);
    return userPrefs?.notifications || null;
  } catch (error) {
    console.error('Error getting user notification preferences:', error);
    throw error;
  }
};

export const updateUserNotificationPreferences = async (
  userId: string, 
  preferences: NotificationPreferences
): Promise<void> => {
  try {
    const userPrefsRef = doc(db, USER_PREFERENCES_COLLECTION, userId);
    
    // Check if document exists
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      // Update existing document
      await updateDoc(userPrefsRef, {
        notifications: preferences,
        updatedAt: Date.now()
      });
    } else {
      // Create new document
      const newUserPrefs: UserPreferences = {
        userId,
        notifications: preferences,
        fcmTokens: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(userPrefsRef, newUserPrefs);
    }
  } catch (error) {
    console.error('Error updating user notification preferences:', error);
    throw error;
  }
};

export const createUserPreferences = async (
  userId: string, 
  preferences: NotificationPreferences
): Promise<void> => {
  try {
    const userPrefsRef = doc(db, USER_PREFERENCES_COLLECTION, userId);
    
    const newUserPrefs: UserPreferences = {
      userId,
      notifications: preferences,
      fcmTokens: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await setDoc(userPrefsRef, newUserPrefs);
  } catch (error) {
    console.error('Error creating user preferences:', error);
    throw error;
  }
};

export const updateUserPreferences = async (
  userId: string, 
  updates: Partial<UserPreferences>
): Promise<void> => {
  try {
    const userPrefsRef = doc(db, USER_PREFERENCES_COLLECTION, userId);
    
    // Check if document exists
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      // Update existing document
      await updateDoc(userPrefsRef, {
        ...updates,
        updatedAt: Date.now()
      });
    } else {
      // Create new document with minimal required fields
      const newUserPrefs: UserPreferences = {
        userId,
        notifications: updates.notifications || {
          emailEnabled: true,
          pushEnabled: false
        },
        fcmTokens: updates.fcmTokens || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...updates
      };
      await setDoc(userPrefsRef, newUserPrefs);
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};