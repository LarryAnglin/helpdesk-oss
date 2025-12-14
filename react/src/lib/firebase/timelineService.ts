/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Timeline } from '../types/timeline';

const TIMELINES_COLLECTION = 'timelines';

/**
 * Save a timeline to Firestore
 */
export const saveTimeline = async (timeline: Timeline): Promise<string> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // If timeline has no ID, create a new document
    if (!timeline.id || timeline.id.startsWith('timeline-')) {
      const docRef = await addDoc(collection(db, TIMELINES_COLLECTION), {
        ...timeline,
        createdBy: currentUser.uid,
        updatedAt: Date.now()
      });
      
      // Update the timeline with the actual Firestore document ID
      await updateDoc(docRef, { id: docRef.id });
      
      return docRef.id;
    } else {
      // Update existing timeline
      const timelineRef = doc(db, TIMELINES_COLLECTION, timeline.id);
      await updateDoc(timelineRef, {
        ...timeline,
        updatedAt: Date.now()
      });
      
      return timeline.id;
    }
  } catch (error) {
    console.error('Error saving timeline:', error);
    throw error;
  }
};

/**
 * Get a timeline by ID
 */
export const getTimeline = async (timelineId: string): Promise<Timeline | null> => {
  try {
    const timelineRef = doc(db, TIMELINES_COLLECTION, timelineId);
    const timelineSnap = await getDoc(timelineRef);
    
    if (timelineSnap.exists()) {
      return { id: timelineSnap.id, ...timelineSnap.data() } as Timeline;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting timeline:', error);
    throw error;
  }
};

/**
 * Get all timelines for a ticket
 */
export const getTimelinesForTicket = async (ticketId: string): Promise<Timeline[]> => {
  try {
    const q = query(
      collection(db, TIMELINES_COLLECTION),
      where('ticketId', '==', ticketId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Timeline[];
  } catch (error) {
    console.error('Error getting timelines for ticket:', error);
    throw error;
  }
};

/**
 * Get the most recent timeline for a ticket
 */
export const getLatestTimelineForTicket = async (ticketId: string): Promise<Timeline | null> => {
  try {
    const q = query(
      collection(db, TIMELINES_COLLECTION),
      where('ticketId', '==', ticketId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Timeline;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting latest timeline for ticket:', error);
    throw error;
  }
};

/**
 * Auto-save timeline with debouncing
 */
let saveTimeoutMap = new Map<string, NodeJS.Timeout>();

export const autoSaveTimeline = async (timeline: Timeline, debounceMs: number = 2000): Promise<void> => {
  const timelineKey = timeline.id || timeline.ticketId;
  
  // Clear existing timeout for this timeline
  const existingTimeout = saveTimeoutMap.get(timelineKey);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // Set new timeout
  const newTimeout = setTimeout(async () => {
    try {
      await saveTimeline(timeline);
      console.log('Timeline auto-saved:', timeline.id);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
    saveTimeoutMap.delete(timelineKey);
  }, debounceMs);
  
  saveTimeoutMap.set(timelineKey, newTimeout);
};