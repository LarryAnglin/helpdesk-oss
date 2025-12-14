/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number | any): string {
  // Handle different timestamp formats
  if (!timestamp) {
    return 'N/A';
  }
  
  let dateValue: Date;
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      dateValue = timestamp.toDate();
    } 
    // Handle Firestore timestamp seconds/nanoseconds
    else if (timestamp && timestamp.seconds !== undefined) {
      dateValue = new Date(timestamp.seconds * 1000);
    }
    // Handle JavaScript milliseconds timestamp
    else if (typeof timestamp === 'number' && isFinite(timestamp)) {
      dateValue = new Date(timestamp);
    }
    // Handle invalid formats
    else {
      return 'N/A';
    }
    
    // Verify the date is valid
    if (!isFinite(dateValue.getTime())) {
      return 'N/A';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    }).format(dateValue);
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'Invalid date';
  }
}