/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { SLASettings, SLAStatus, SLAStatusType } from '../types/sla';
import { TicketPriority } from '../types/ticket';

/**
 * Calculate business hours between two timestamps
 */
export const calculateBusinessHours = (
  startTime: number,
  endTime: number,
  businessHours: SLASettings['businessHours']
): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  let totalHours = 0;
  
  const [startHour, startMin] = businessHours.start.split(':').map(Number);
  const [endHour, endMin] = businessHours.end.split(':').map(Number);
  // const businessStart = startHour + startMin / 60;
  // const businessEnd = endHour + endMin / 60;
  // const businessDayHours = businessEnd - businessStart;
  
  const current = new Date(start);
  
  while (current < end) {
    const dayOfWeek = current.getDay();
    
    // Check if current day is a business day
    if (businessHours.days.includes(dayOfWeek)) {
      const dayStart = new Date(current);
      dayStart.setHours(startHour, startMin, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, endMin, 0, 0);
      
      const periodStart = current < dayStart ? dayStart : current;
      const periodEnd = end > dayEnd ? dayEnd : end;
      
      if (periodStart < periodEnd) {
        totalHours += (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
      }
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }
  
  return totalHours;
};

/**
 * Add business hours to a timestamp
 */
export const addBusinessHours = (
  startTime: number,
  hoursToAdd: number,
  businessHours: SLASettings['businessHours']
): number => {
  const start = new Date(startTime);
  const [startHour, startMin] = businessHours.start.split(':').map(Number);
  const [endHour, endMin] = businessHours.end.split(':').map(Number);
  // const businessStart = startHour + startMin / 60;
  // const businessEnd = endHour + endMin / 60;
  // const businessDayHours = businessEnd - businessStart;
  
  let remainingHours = hoursToAdd;
  const current = new Date(start);
  
  while (remainingHours > 0) {
    const dayOfWeek = current.getDay();
    
    if (businessHours.days.includes(dayOfWeek)) {
      const dayStart = new Date(current);
      dayStart.setHours(startHour, startMin, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(endHour, endMin, 0, 0);
      
      let workStart = current < dayStart ? dayStart : current;
      
      // If we're past business hours, move to next business day
      if (current >= dayEnd) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }
      
      const hoursLeftInDay = (dayEnd.getTime() - workStart.getTime()) / (1000 * 60 * 60);
      
      if (remainingHours <= hoursLeftInDay) {
        // We can finish today
        current.setTime(workStart.getTime() + remainingHours * 60 * 60 * 1000);
        remainingHours = 0;
      } else {
        // Use up the rest of today and continue tomorrow
        remainingHours -= hoursLeftInDay;
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
    } else {
      // Not a business day, move to next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }
  }
  
  return current.getTime();
};

/**
 * Calculate SLA deadlines for a ticket
 */
export const calculateSLADeadlines = (
  createdAt: number,
  priority: TicketPriority,
  slaSettings: SLASettings
): { responseDeadline: number; resolutionDeadline: number } => {
  const priorityKey = priority.toLowerCase() as keyof Omit<SLASettings, 'businessHours'>;
  const config = slaSettings[priorityKey];
  
  if (!config.enabled) {
    return {
      responseDeadline: 0,
      resolutionDeadline: 0
    };
  }
  
  let responseDeadline: number;
  let resolutionDeadline: number;
  
  if (config.businessHoursOnly) {
    responseDeadline = addBusinessHours(createdAt, config.responseTimeHours, slaSettings.businessHours);
    resolutionDeadline = addBusinessHours(createdAt, config.resolutionTimeHours, slaSettings.businessHours);
  } else {
    responseDeadline = createdAt + (config.responseTimeHours * 60 * 60 * 1000);
    resolutionDeadline = createdAt + (config.resolutionTimeHours * 60 * 60 * 1000);
  }
  
  return { responseDeadline, resolutionDeadline };
};

/**
 * Get SLA status for a metric (response or resolution)
 */
export const getSLAStatus = (
  deadline: number,
  actualTime?: number,
  currentTime: number = Date.now()
): SLAStatusType => {
  if (deadline === 0) return 'pending'; // SLA disabled
  
  if (actualTime) {
    // Already completed
    return actualTime <= deadline ? 'met' : 'breached';
  }
  
  // Still pending
  const timeLeft = deadline - currentTime;
  const totalTime = deadline - (deadline - timeLeft);
  const warningThreshold = totalTime * 0.8; // 80% of time passed
  
  if (currentTime > deadline) {
    return 'breached';
  } else if (timeLeft < warningThreshold) {
    return 'at_risk';
  } else {
    return 'pending';
  }
};

/**
 * Calculate complete SLA status for a ticket
 */
export const calculateSLAStatus = (
  createdAt: number,
  priority: TicketPriority,
  firstResponseAt?: number,
  resolvedAt?: number,
  slaSettings?: SLASettings,
  currentTime: number = Date.now()
  // TODO: Add pausedTime parameter to subtract from SLA calculations
): SLAStatus | undefined => {
  if (!slaSettings) return undefined;
  
  const priorityKey = priority.toLowerCase() as keyof Omit<SLASettings, 'businessHours'>;
  const config = slaSettings[priorityKey];
  
  if (!config.enabled) return undefined;
  
  const { responseDeadline, resolutionDeadline } = calculateSLADeadlines(
    createdAt,
    priority,
    slaSettings
  );
  
  const responseStatus = getSLAStatus(responseDeadline, firstResponseAt, currentTime);
  const resolutionStatus = getSLAStatus(resolutionDeadline, resolvedAt, currentTime);
  
  // Calculate actual times if completed
  let responseTime: number | undefined;
  let resolutionTime: number | undefined;
  
  if (firstResponseAt) {
    if (config.businessHoursOnly) {
      responseTime = calculateBusinessHours(createdAt, firstResponseAt, slaSettings.businessHours);
    } else {
      responseTime = (firstResponseAt - createdAt) / (1000 * 60 * 60);
    }
  }
  
  if (resolvedAt) {
    if (config.businessHoursOnly) {
      resolutionTime = calculateBusinessHours(createdAt, resolvedAt, slaSettings.businessHours);
    } else {
      resolutionTime = (resolvedAt - createdAt) / (1000 * 60 * 60);
    }
  }
  
  return {
    responseDeadline,
    resolutionDeadline,
    responseStatus,
    resolutionStatus,
    responseTime,
    resolutionTime,
    isBusinessHours: config.businessHoursOnly
  };
};

/**
 * Format time remaining for display
 */
export const formatTimeRemaining = (deadline: number, currentTime: number = Date.now()): string => {
  const timeLeft = deadline - currentTime;
  
  if (timeLeft <= 0) {
    const overdue = Math.abs(timeLeft);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h overdue`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m overdue`;
    } else {
      return `${minutes}m overdue`;
    }
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

/**
 * Get SLA status color for UI display
 */
export const getSLAStatusColor = (status: SLAStatusType): string => {
  switch (status) {
    case 'met':
      return 'success';
    case 'pending':
      return 'info';
    case 'at_risk':
      return 'warning';
    case 'breached':
      return 'error';
    default:
      return 'default';
  }
};