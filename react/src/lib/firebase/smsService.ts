/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { SMSPreferences, SMSMessage, SMSConsentStatus } from '../types/sms';

interface UserSMSPreferences {
  globalSMSEnabled: boolean;
  phoneNumber: string;
  consentDate?: number;
  optInConfirmed: boolean;
}

/**
 * Get user's global SMS preferences
 */
export async function getUserSMSPreferences(userId: string): Promise<UserSMSPreferences | null> {
  try {
    const docRef = doc(db, 'userSMSPreferences', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserSMSPreferences;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user SMS preferences:', error);
    throw error;
  }
}

/**
 * Update user's global SMS preferences
 */
export async function updateUserSMSPreferences(userId: string, preferences: UserSMSPreferences): Promise<void> {
  try {
    const docRef = doc(db, 'userSMSPreferences', userId);
    const updateData = {
      ...preferences,
      updatedAt: serverTimestamp()
    };
    
    // If this is the first time enabling SMS, set consent date
    if (preferences.globalSMSEnabled && !preferences.consentDate) {
      updateData.consentDate = Date.now();
    }
    
    await setDoc(docRef, updateData, { merge: true });
  } catch (error) {
    console.error('Error updating user SMS preferences:', error);
    throw error;
  }
}

/**
 * Check if user has globally opted into SMS notifications
 */
export async function isUserOptedIntoSMS(userId: string): Promise<boolean> {
  try {
    const preferences = await getUserSMSPreferences(userId);
    return preferences?.globalSMSEnabled && preferences?.optInConfirmed || false;
  } catch (error) {
    console.error('Error checking SMS opt-in status:', error);
    return false;
  }
}

/**
 * Get SMS preferences for a phone number
 */
export async function getSMSPreferences(phoneNumber: string, tenantId: string): Promise<SMSPreferences | null> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const q = query(
      collection(db, 'smsPreferences'),
      where('phoneNumber', '==', normalizedPhone),
      where('tenantId', '==', tenantId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as SMSPreferences;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting SMS preferences:', error);
    throw error;
  }
}

/**
 * Create or update SMS preferences for a phone number
 */
export async function createOrUpdateSMSPreferences(
  phoneNumber: string,
  tenantId: string,
  userId?: string,
  userName?: string,
  userEmail?: string,
  ticketId?: string
): Promise<SMSPreferences> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const existing = await getSMSPreferences(normalizedPhone, tenantId);
    
    if (existing) {
      // Update existing preferences
      const updateData: Partial<SMSPreferences> = {
        updatedAt: Date.now()
      };
      
      if (userId) updateData.userId = userId;
      if (userName) updateData.userName = userName;
      if (userEmail) updateData.userEmail = userEmail;
      if (ticketId && !existing.ticketIds.includes(ticketId)) {
        updateData.ticketIds = [...existing.ticketIds, ticketId];
      }
      
      const docRef = doc(db, 'smsPreferences', existing.id);
      await updateDoc(docRef, updateData);
      
      return { ...existing, ...updateData };
    } else {
      // Create new SMS preferences
      const newPreferences: Omit<SMSPreferences, 'id'> = {
        tenantId,
        phoneNumber: normalizedPhone,
        status: 'pending',
        userId,
        userName,
        userEmail,
        ticketIds: ticketId ? [ticketId] : [],
        messageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, 'smsPreferences'), newPreferences);
      return { id: docRef.id, ...newPreferences };
    }
  } catch (error) {
    console.error('Error creating/updating SMS preferences:', error);
    throw error;
  }
}

/**
 * Update SMS consent status
 */
export async function updateSMSConsentStatus(
  phoneNumber: string,
  tenantId: string,
  status: SMSConsentStatus
): Promise<void> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const preferences = await getSMSPreferences(normalizedPhone, tenantId);
    
    if (!preferences) {
      throw new Error('SMS preferences not found for phone number');
    }
    
    const updateData: Partial<SMSPreferences> = {
      status,
      updatedAt: Date.now()
    };
    
    if (status === 'confirmed') {
      updateData.optInDate = Date.now();
    } else if (status === 'stopped') {
      updateData.optOutDate = Date.now();
    }
    
    const docRef = doc(db, 'smsPreferences', preferences.id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating SMS consent status:', error);
    throw error;
  }
}

/**
 * Log SMS message
 */
export async function logSMSMessage(message: Omit<SMSMessage, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'smsMessages'), {
      ...message,
      phoneNumber: normalizePhoneNumber(message.phoneNumber),
      createdAt: Date.now()
    });
    
    // Update message count in preferences
    const preferences = await getSMSPreferences(message.phoneNumber, message.tenantId);
    if (preferences && message.direction === 'outbound') {
      const docRef = doc(db, 'smsPreferences', preferences.id);
      await updateDoc(docRef, {
        messageCount: preferences.messageCount + 1,
        lastMessageDate: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error logging SMS message:', error);
    throw error;
  }
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  } else if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  }
  
  // Return as-is if already in correct format or unknown format
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  const digits = normalized.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.slice(1, 4);
    const exchange = digits.slice(4, 7);
    const number = digits.slice(7, 11);
    return `(${areaCode}) ${exchange}-${number}`;
  }
  
  return phoneNumber;
}

/**
 * Validate if phone number is a valid US number
 */
export function isValidUSPhoneNumber(phoneNumber: string): boolean {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/**
 * Get SMS compliance messages
 */
export const SMS_COMPLIANCE_MESSAGES = {
  OPT_IN_INSTRUCTIONS: "Reply START to receive updates for this ticket. Message and data rates may apply. Reply STOP to opt out anytime.",
  CONFIRMATION: "You're now subscribed to SMS updates for this ticket. Reply STOP anytime to unsubscribe.",
  OPT_OUT_CONFIRMATION: "You've been unsubscribed from SMS updates. Reply START to resubscribe.",
  HELP_MESSAGE: "Help Desk SMS: Reply START to subscribe, STOP to unsubscribe. Message and data rates may apply. Contact support for help.",
  INVALID_KEYWORD: "Invalid command. Reply START to subscribe, STOP to unsubscribe, or HELP for assistance."
};

/**
 * Process inbound SMS keywords (START, STOP, HELP)
 */
export async function processInboundSMSKeyword(
  phoneNumber: string,
  message: string,
  tenantId: string
): Promise<{ action: string; responseMessage: string }> {
  const normalizedMessage = message.trim().toUpperCase();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  try {
    switch (normalizedMessage) {
      case 'START':
      case 'YES':
        await updateSMSConsentStatus(normalizedPhone, tenantId, 'confirmed');
        return {
          action: 'opt_in',
          responseMessage: SMS_COMPLIANCE_MESSAGES.CONFIRMATION
        };
        
      case 'STOP':
      case 'QUIT':
      case 'END':
      case 'UNSUBSCRIBE':
        await updateSMSConsentStatus(normalizedPhone, tenantId, 'stopped');
        return {
          action: 'opt_out',
          responseMessage: SMS_COMPLIANCE_MESSAGES.OPT_OUT_CONFIRMATION
        };
        
      case 'HELP':
      case 'INFO':
        return {
          action: 'help',
          responseMessage: SMS_COMPLIANCE_MESSAGES.HELP_MESSAGE
        };
        
      default:
        return {
          action: 'invalid',
          responseMessage: SMS_COMPLIANCE_MESSAGES.INVALID_KEYWORD
        };
    }
  } catch (error) {
    console.error('Error processing SMS keyword:', error);
    return {
      action: 'error',
      responseMessage: SMS_COMPLIANCE_MESSAGES.HELP_MESSAGE
    };
  }
}