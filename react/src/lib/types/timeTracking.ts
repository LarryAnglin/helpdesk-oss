/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Time tracking types for the Help Desk system
 */

export type TimeEntryType = 'active' | 'research' | 'waiting' | 'travel' | 'administrative';

export interface TimeCategory {
  id: string;
  tenantId?: string; // Multi-tenant isolation (optional for defaults)
  name: string;
  type: TimeEntryType;
  description?: string;
  hourlyRate: number;
  isBillable: boolean;
  color?: string;
  isDefault?: boolean;
}

export interface TimeEntry {
  id: string;
  tenantId: string; // Multi-tenant isolation
  ticketId: string;
  userId: string;
  userEmail: string;
  userName: string;
  categoryId: string;
  categoryName: string;
  categoryType: TimeEntryType;
  description?: string;
  startTime: number;
  endTime?: number;
  duration: number; // in minutes
  isBillable: boolean;
  hourlyRate: number;
  totalCost: number;
  isActive: boolean; // true if timer is currently running
  createdAt: number;
  updatedAt: number;
}

export interface TimeSession {
  id: string;
  ticketId: string;
  userId: string;
  categoryId: string;
  tenantId?: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
  description?: string;
}

export interface TimeTrackingConfig {
  defaultCategories: TimeCategory[];
  autoStopInactiveMinutes: number;
  reminderIntervalMinutes: number;
  requireDescriptionForBillable: boolean;
  allowOverlappingTimers: boolean;
  roundToNearestMinutes: number;
}

export interface TimeTrackingSummary {
  ticketId: string;
  totalMinutes: number;
  totalCost: number;
  billableMinutes: number;
  billableCost: number;
  nonBillableMinutes: number;
  entriesByCategory: {
    [categoryId: string]: {
      categoryName: string;
      categoryType: TimeEntryType;
      minutes: number;
      cost: number;
      entries: number;
    };
  };
  entriesByUser: {
    [userId: string]: {
      userName: string;
      userEmail: string;
      minutes: number;
      cost: number;
      entries: number;
    };
  };
  dateRange: {
    start: number;
    end: number;
  };
}

export interface TimeEntryFormData {
  categoryId: string;
  description?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export interface ActiveTimer {
  sessionId: string;
  ticketId: string;
  categoryId: string;
  categoryName: string;
  categoryType: TimeEntryType;
  startTime: number;
  description?: string;
  elapsedMinutes: number;
}

// Default time categories
export const DEFAULT_TIME_CATEGORIES: Omit<TimeCategory, 'id'>[] = [
  {
    name: 'Active Work',
    type: 'active',
    description: 'Direct work on resolving the ticket',
    hourlyRate: 75,
    isBillable: true,
    color: '#4CAF50',
    isDefault: true
  },
  {
    name: 'Research',
    type: 'research',
    description: 'Researching solutions or learning new technologies',
    hourlyRate: 60,
    isBillable: false,
    color: '#2196F3'
  },
  {
    name: 'Waiting for User',
    type: 'waiting',
    description: 'Waiting for user response or action',
    hourlyRate: 0,
    isBillable: false,
    color: '#FF9800'
  },
  {
    name: 'Travel Time',
    type: 'travel',
    description: 'Travel to/from user location',
    hourlyRate: 50,
    isBillable: true,
    color: '#9C27B0'
  },
  {
    name: 'Administrative',
    type: 'administrative',
    description: 'Documentation, reporting, or administrative tasks',
    hourlyRate: 45,
    isBillable: false,
    color: '#607D8B'
  }
];

// Default configuration
export const DEFAULT_TIME_TRACKING_CONFIG: TimeTrackingConfig = {
  defaultCategories: DEFAULT_TIME_CATEGORIES as TimeCategory[],
  autoStopInactiveMinutes: 15,
  reminderIntervalMinutes: 30,
  requireDescriptionForBillable: true,
  allowOverlappingTimers: false,
  roundToNearestMinutes: 1
};