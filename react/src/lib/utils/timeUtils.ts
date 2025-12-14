/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Utility functions for time tracking
 */

/**
 * Format duration in minutes to human-readable format
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

/**
 * Calculate duration between two timestamps
 */
export const calculateDuration = (startTime: number, endTime: number): number => {
  return Math.round((endTime - startTime) / 60000); // Convert to minutes
};

/**
 * Format time for display (HH:MM AM/PM)
 */
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for display
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date and time for display
 */
export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get the start of day timestamp
 */
export const getStartOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get the end of day timestamp
 */
export const getEndOfDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Get the start of week timestamp (Monday)
 */
export const getStartOfWeek = (timestamp: number): number => {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get the end of week timestamp (Sunday)
 */
export const getEndOfWeek = (timestamp: number): number => {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  date.setDate(diff);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Get the start of month timestamp
 */
export const getStartOfMonth = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * Get the end of month timestamp
 */
export const getEndOfMonth = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

/**
 * Round time to nearest interval
 */
export const roundToNearest = (minutes: number, interval: number): number => {
  return Math.round(minutes / interval) * interval;
};

/**
 * Convert decimal hours to minutes
 */
export const hoursToMinutes = (hours: number): number => {
  return Math.round(hours * 60);
};

/**
 * Convert minutes to decimal hours
 */
export const minutesToHours = (minutes: number): number => {
  return minutes / 60;
};

/**
 * Check if a timestamp is today
 */
export const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  return date.toDateString() === today.toDateString();
};

/**
 * Check if a timestamp is this week
 */
export const isThisWeek = (timestamp: number): boolean => {
  const now = Date.now();
  const startOfWeek = getStartOfWeek(now);
  const endOfWeek = getEndOfWeek(now);
  return timestamp >= startOfWeek && timestamp <= endOfWeek;
};

/**
 * Check if a timestamp is this month
 */
export const isThisMonth = (timestamp: number): boolean => {
  const now = Date.now();
  const startOfMonth = getStartOfMonth(now);
  const endOfMonth = getEndOfMonth(now);
  return timestamp >= startOfMonth && timestamp <= endOfMonth;
};

/**
 * Get relative time description
 */
export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (days < 30) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(timestamp);
  }
};

/**
 * Parse duration string (e.g., "1h 30m" or "90m") to minutes
 */
export const parseDuration = (durationString: string): number => {
  const hoursMatch = durationString.match(/(\d+)h/);
  const minutesMatch = durationString.match(/(\d+)m/);
  
  let totalMinutes = 0;
  
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]) * 60;
  }
  
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  
  return totalMinutes;
};

/**
 * Format duration for time input fields (HH:MM)
 */
export const formatDurationForInput = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Parse duration from time input (HH:MM) to minutes
 */
export const parseDurationFromInput = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + minutes;
};