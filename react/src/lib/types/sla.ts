/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface SLAConfig {
  responseTimeHours: number;
  resolutionTimeHours: number;
  businessHoursOnly: boolean;
  enabled: boolean;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD format
  isRecurring: boolean; // true for annual holidays
  description?: string;
}

export interface SLASettings {
  urgent: SLAConfig;
  high: SLAConfig;
  medium: SLAConfig;
  low: SLAConfig;
  businessHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
    days: number[]; // [1,2,3,4,5] Monday-Friday
    timezone: string;
    holidays: Holiday[]; // holidays to exclude from business hours
  };
}

export interface SLAStatus {
  responseDeadline: number; // timestamp
  resolutionDeadline: number; // timestamp
  responseStatus: 'met' | 'breached' | 'at_risk' | 'pending';
  resolutionStatus: 'met' | 'breached' | 'at_risk' | 'pending';
  responseTime?: number; // actual response time in hours
  resolutionTime?: number; // actual resolution time in hours
  isBusinessHours: boolean;
}

export const DEFAULT_SLA_SETTINGS: SLASettings = {
  urgent: {
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    businessHoursOnly: false,
    enabled: true
  },
  high: {
    responseTimeHours: 4,
    resolutionTimeHours: 8,
    businessHoursOnly: false,
    enabled: true
  },
  medium: {
    responseTimeHours: 8,
    resolutionTimeHours: 24,
    businessHoursOnly: true,
    enabled: true
  },
  low: {
    responseTimeHours: 24,
    resolutionTimeHours: 72,
    businessHoursOnly: true,
    enabled: true
  },
  businessHours: {
    start: "09:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5], // Monday-Friday
    timezone: "America/Chicago",
    holidays: [] // no holidays by default
  }
};

export type SLAMetricType = 'response' | 'resolution';
export type SLAStatusType = 'met' | 'breached' | 'at_risk' | 'pending';