/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { 
  TimeEntry, 
  TimeSession, 
  TimeCategory, 
  TimeTrackingSummary, 
  TimeEntryFormData,
  ActiveTimer,
  DEFAULT_TIME_CATEGORIES,
  DEFAULT_TIME_TRACKING_CONFIG,
  TimeTrackingConfig
} from '../types/timeTracking';

const TIME_ENTRIES_COLLECTION = 'timeEntries';
const TIME_SESSIONS_COLLECTION = 'timeSessions';
const TIME_CATEGORIES_COLLECTION = 'timeCategories';
const TIME_CONFIG_COLLECTION = 'timeTrackingConfig';

/**
 * Time Categories Management
 */
export const getTimeCategories = async (tenantId?: string): Promise<TimeCategory[]> => {
  try {
    let categoriesQuery;
    if (tenantId) {
      categoriesQuery = query(
        collection(db, TIME_CATEGORIES_COLLECTION),
        where('tenantId', '==', tenantId),
        orderBy('name')
      );
    } else {
      categoriesQuery = query(
        collection(db, TIME_CATEGORIES_COLLECTION),
        orderBy('name')
      );
    }
    const snapshot = await getDocs(categoriesQuery);
    
    if (snapshot.empty) {
      // Initialize default categories if none exist
      await initializeDefaultCategories();
      return DEFAULT_TIME_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default-${index}`
      })) as TimeCategory[];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeCategory[];
  } catch (error) {
    console.error('Error fetching time categories:', error);
    throw error;
  }
};

export const createTimeCategory = async (categoryData: Omit<TimeCategory, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TIME_CATEGORIES_COLLECTION), {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating time category:', error);
    throw error;
  }
};

export const updateTimeCategory = async (id: string, updates: Partial<TimeCategory>): Promise<void> => {
  try {
    const docRef = doc(db, TIME_CATEGORIES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating time category:', error);
    throw error;
  }
};

export const deleteTimeCategory = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, TIME_CATEGORIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting time category:', error);
    throw error;
  }
};

/**
 * Time Sessions Management (Active Timers)
 */
export const startTimeSession = async (
  ticketId: string,
  userId: string,
  categoryId: string,
  tenantId: string,
  description?: string
): Promise<string> => {
  try {
    // Check if user has any active sessions
    const activeSessions = await getActiveSessionsForUser(userId);
    
    // Get config to check if overlapping timers are allowed
    const config = await getTimeTrackingConfig();
    
    if (!config.allowOverlappingTimers && activeSessions.length > 0) {
      throw new Error('You already have an active timer. Please stop it before starting a new one.');
    }
    
    const sessionData = {
      ticketId,
      userId,
      categoryId,
      tenantId,
      description,
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, TIME_SESSIONS_COLLECTION), sessionData);
    return docRef.id;
  } catch (error) {
    console.error('Error starting time session:', error);
    throw error;
  }
};

export const updateTimeSession = async (
  sessionId: string,
  updates: Partial<TimeSession>
): Promise<void> => {
  try {
    const docRef = doc(db, TIME_SESSIONS_COLLECTION, sessionId);
    await updateDoc(docRef, {
      ...updates,
      lastActivity: Date.now(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating time session:', error);
    throw error;
  }
};

export const stopTimeSession = async (
  sessionId: string,
  userId: string,
  userEmail: string,
  userName: string
): Promise<string> => {
  try {
    // Get session data
    const sessionDoc = await getDoc(doc(db, TIME_SESSIONS_COLLECTION, sessionId));
    if (!sessionDoc.exists()) {
      throw new Error('Session not found');
    }
    
    const sessionData = sessionDoc.data() as TimeSession;
    const endTime = Date.now();
    const duration = Math.round((endTime - sessionData.startTime) / 60000); // Convert to minutes
    
    // Get category data for billing info
    const categoryDoc = await getDoc(doc(db, TIME_CATEGORIES_COLLECTION, sessionData.categoryId));
    if (!categoryDoc.exists()) {
      throw new Error('Category not found');
    }
    
    const categoryData = categoryDoc.data() as TimeCategory;
    
    // Create time entry
    const timeEntry: Omit<TimeEntry, 'id'> = {
      ticketId: sessionData.ticketId,
      userId,
      userEmail,
      userName,
      tenantId: sessionData.tenantId || 'default',
      categoryId: sessionData.categoryId,
      categoryName: categoryData.name,
      categoryType: categoryData.type,
      description: sessionData.description,
      startTime: sessionData.startTime,
      endTime,
      duration,
      isBillable: categoryData.isBillable,
      hourlyRate: categoryData.hourlyRate,
      totalCost: (duration / 60) * categoryData.hourlyRate,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Create time entry and delete session in a batch
    const batch = writeBatch(db);
    
    const timeEntryRef = doc(collection(db, TIME_ENTRIES_COLLECTION));
    batch.set(timeEntryRef, timeEntry);
    
    const sessionRef = doc(db, TIME_SESSIONS_COLLECTION, sessionId);
    batch.delete(sessionRef);
    
    await batch.commit();
    
    return timeEntryRef.id;
  } catch (error) {
    console.error('Error stopping time session:', error);
    throw error;
  }
};

export const getActiveSessionsForUser = async (userId: string, tenantId?: string): Promise<TimeSession[]> => {
  try {
    let sessionsQuery;
    if (tenantId) {
      sessionsQuery = query(
        collection(db, TIME_SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc')
      );
    } else {
      sessionsQuery = query(
        collection(db, TIME_SESSIONS_COLLECTION),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc')
      );
    }
    
    const snapshot = await getDocs(sessionsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeSession[];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    throw error;
  }
};

export const getActiveSessionsForTicket = async (ticketId: string, tenantId?: string): Promise<TimeSession[]> => {
  try {
    let sessionsQuery;
    if (tenantId) {
      sessionsQuery = query(
        collection(db, TIME_SESSIONS_COLLECTION),
        where('ticketId', '==', ticketId),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc')
      );
    } else {
      sessionsQuery = query(
        collection(db, TIME_SESSIONS_COLLECTION),
        where('ticketId', '==', ticketId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc')
      );
    }
    
    const snapshot = await getDocs(sessionsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeSession[];
  } catch (error) {
    console.error('Error fetching active sessions for ticket:', error);
    throw error;
  }
};

/**
 * Time Entries Management
 */
export const createTimeEntry = async (
  ticketId: string,
  userId: string,
  userEmail: string,
  userName: string,
  tenantId: string,
  entryData: TimeEntryFormData
): Promise<string> => {
  try {
    // Get category data
    const categoryDoc = await getDoc(doc(db, TIME_CATEGORIES_COLLECTION, entryData.categoryId));
    if (!categoryDoc.exists()) {
      throw new Error('Category not found');
    }
    
    const categoryData = categoryDoc.data() as TimeCategory;
    
    // Calculate duration if not provided
    let duration = entryData.duration;
    if (!duration && entryData.startTime && entryData.endTime) {
      duration = Math.round((entryData.endTime - entryData.startTime) / 60000);
    }
    
    if (!duration || duration <= 0) {
      throw new Error('Duration must be greater than 0');
    }
    
    const timeEntry: Omit<TimeEntry, 'id'> = {
      ticketId,
      userId,
      userEmail,
      userName,
      tenantId,
      categoryId: entryData.categoryId,
      categoryName: categoryData.name,
      categoryType: categoryData.type,
      description: entryData.description,
      startTime: entryData.startTime,
      endTime: entryData.endTime,
      duration,
      isBillable: categoryData.isBillable,
      hourlyRate: categoryData.hourlyRate,
      totalCost: (duration / 60) * categoryData.hourlyRate,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const docRef = await addDoc(collection(db, TIME_ENTRIES_COLLECTION), timeEntry);
    return docRef.id;
  } catch (error) {
    console.error('Error creating time entry:', error);
    throw error;
  }
};

export const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>): Promise<void> => {
  try {
    const docRef = doc(db, TIME_ENTRIES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const deleteTimeEntry = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, TIME_ENTRIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting time entry:', error);
    throw error;
  }
};

export const getTimeEntriesForTicket = async (ticketId: string, tenantId?: string): Promise<TimeEntry[]> => {
  try {
    let entriesQuery;
    if (tenantId) {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('ticketId', '==', ticketId),
        where('tenantId', '==', tenantId),
        orderBy('startTime', 'desc')
      );
    } else {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('ticketId', '==', ticketId),
        orderBy('startTime', 'desc')
      );
    }
    
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];
  } catch (error) {
    console.error('Error fetching time entries for ticket:', error);
    throw error;
  }
};

export const getTimeEntriesForUser = async (
  userId: string,
  tenantId?: string,
  startDate?: number,
  endDate?: number
): Promise<TimeEntry[]> => {
  try {
    let entriesQuery;
    
    if (tenantId && startDate && endDate) {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', userId),
        where('tenantId', '==', tenantId),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate),
        orderBy('startTime', 'desc')
      );
    } else if (tenantId) {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', userId),
        where('tenantId', '==', tenantId),
        orderBy('startTime', 'desc')
      );
    } else if (startDate && endDate) {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', userId),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate),
        orderBy('startTime', 'desc')
      );
    } else {
      entriesQuery = query(
        collection(db, TIME_ENTRIES_COLLECTION),
        where('userId', '==', userId),
        orderBy('startTime', 'desc')
      );
    }
    
    const snapshot = await getDocs(entriesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeEntry[];
  } catch (error) {
    console.error('Error fetching time entries for user:', error);
    throw error;
  }
};

/**
 * Time Tracking Summary and Reporting
 */
export const getTimeTrackingSummary = async (
  ticketId: string,
  startDate?: number,
  endDate?: number
): Promise<TimeTrackingSummary> => {
  try {
    const entries = await getTimeEntriesForTicket(ticketId);
    
    // Filter by date range if provided
    const filteredEntries = entries.filter(entry => {
      if (startDate && entry.startTime < startDate) return false;
      if (endDate && entry.startTime > endDate) return false;
      return true;
    });
    
    const summary: TimeTrackingSummary = {
      ticketId,
      totalMinutes: 0,
      totalCost: 0,
      billableMinutes: 0,
      billableCost: 0,
      nonBillableMinutes: 0,
      entriesByCategory: {},
      entriesByUser: {},
      dateRange: {
        start: startDate || (filteredEntries.length > 0 ? Math.min(...filteredEntries.map(e => e.startTime)) : 0),
        end: endDate || (filteredEntries.length > 0 ? Math.max(...filteredEntries.map(e => e.startTime)) : 0)
      }
    };
    
    filteredEntries.forEach(entry => {
      // Total calculations
      summary.totalMinutes += entry.duration;
      summary.totalCost += entry.totalCost;
      
      if (entry.isBillable) {
        summary.billableMinutes += entry.duration;
        summary.billableCost += entry.totalCost;
      } else {
        summary.nonBillableMinutes += entry.duration;
      }
      
      // By category
      if (!summary.entriesByCategory[entry.categoryId]) {
        summary.entriesByCategory[entry.categoryId] = {
          categoryName: entry.categoryName,
          categoryType: entry.categoryType,
          minutes: 0,
          cost: 0,
          entries: 0
        };
      }
      summary.entriesByCategory[entry.categoryId].minutes += entry.duration;
      summary.entriesByCategory[entry.categoryId].cost += entry.totalCost;
      summary.entriesByCategory[entry.categoryId].entries += 1;
      
      // By user
      if (!summary.entriesByUser[entry.userId]) {
        summary.entriesByUser[entry.userId] = {
          userName: entry.userName,
          userEmail: entry.userEmail,
          minutes: 0,
          cost: 0,
          entries: 0
        };
      }
      summary.entriesByUser[entry.userId].minutes += entry.duration;
      summary.entriesByUser[entry.userId].cost += entry.totalCost;
      summary.entriesByUser[entry.userId].entries += 1;
    });
    
    return summary;
  } catch (error) {
    console.error('Error generating time tracking summary:', error);
    throw error;
  }
};

/**
 * Configuration Management
 */
export const getTimeTrackingConfig = async (): Promise<TimeTrackingConfig> => {
  try {
    const configDoc = await getDoc(doc(db, TIME_CONFIG_COLLECTION, 'default'));
    if (!configDoc.exists()) {
      await initializeDefaultConfig();
      return DEFAULT_TIME_TRACKING_CONFIG;
    }
    
    return configDoc.data() as TimeTrackingConfig;
  } catch (error) {
    console.error('Error fetching time tracking config:', error);
    return DEFAULT_TIME_TRACKING_CONFIG;
  }
};

export const updateTimeTrackingConfig = async (config: Partial<TimeTrackingConfig>): Promise<void> => {
  try {
    const docRef = doc(db, TIME_CONFIG_COLLECTION, 'default');
    await updateDoc(docRef, {
      ...config,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating time tracking config:', error);
    throw error;
  }
};

/**
 * Real-time subscriptions
 */
export const subscribeToActiveTimers = (
  userId: string,
  tenantId: string,
  callback: (timers: ActiveTimer[]) => void
): (() => void) => {
  const sessionsQuery = query(
    collection(db, TIME_SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('tenantId', '==', tenantId),
    where('isActive', '==', true)
  );
  
  return onSnapshot(sessionsQuery, async (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimeSession[];
    
    // Get category data for each session
    const timers: ActiveTimer[] = [];
    for (const session of sessions) {
      try {
        const categoryDoc = await getDoc(doc(db, TIME_CATEGORIES_COLLECTION, session.categoryId));
        if (categoryDoc.exists()) {
          const categoryData = categoryDoc.data() as TimeCategory;
          timers.push({
            sessionId: session.id,
            ticketId: session.ticketId,
            categoryId: session.categoryId,
            categoryName: categoryData.name,
            categoryType: categoryData.type,
            startTime: session.startTime,
            description: session.description,
            elapsedMinutes: Math.round((Date.now() - session.startTime) / 60000)
          });
        }
      } catch (error) {
        console.error('Error fetching category for session:', error);
      }
    }
    
    callback(timers);
  });
};

/**
 * Initialization helpers
 */
const initializeDefaultCategories = async (): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    DEFAULT_TIME_CATEGORIES.forEach(category => {
      const docRef = doc(collection(db, TIME_CATEGORIES_COLLECTION));
      batch.set(docRef, {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error initializing default categories:', error);
    throw error;
  }
};

const initializeDefaultConfig = async (): Promise<void> => {
  try {
    const docRef = doc(db, TIME_CONFIG_COLLECTION, 'default');
    await setDoc(docRef, {
      ...DEFAULT_TIME_TRACKING_CONFIG,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error initializing default config:', error);
    throw error;
  }
};