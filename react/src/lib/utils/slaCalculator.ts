/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { SLASettings, SLAConfig, Holiday } from '../types/sla';

export interface SLAExpectation {
  responseExpectedBy: Date;
  resolutionExpectedBy: Date;
  responseMessage: string;
  resolutionMessage: string;
  isBusinessHoursOnly: boolean;
}


/**
 * Check if a date is a holiday
 */
function isHoliday(date: Date, holidays: Holiday[]): boolean {
  // Format date as YYYY-MM-DD in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  return holidays.some(holiday => {
    if (holiday.isRecurring) {
      // For recurring holidays, check if month and day match
      const holidayDate = new Date(holiday.date + 'T00:00:00');
      const holidayMonth = String(holidayDate.getMonth() + 1).padStart(2, '0');
      const holidayDay = String(holidayDate.getDate()).padStart(2, '0');
      const recurringDateStr = `${year}-${holidayMonth}-${holidayDay}`;
      return dateStr === recurringDateStr;
    } else {
      // For one-time holidays, check exact date match
      return holiday.date === dateStr;
    }
  });
}

/**
 * Add business hours to a date, respecting business hours constraints and holidays
 */
function addBusinessHours(
  startDate: Date, 
  hoursToAdd: number, 
  businessHours: SLASettings['businessHours']
): Date {
  const result = new Date(startDate);
  let remainingHours = hoursToAdd;
  
  // Convert to business timezone
  const workingDate = new Date(result.toLocaleString("en-US", { timeZone: businessHours.timezone }));
  
  const [startHour, startMinute] = businessHours.start.split(':').map(Number);
  const [endHour, endMinute] = businessHours.end.split(':').map(Number);
  
  
  while (remainingHours > 0) {
    const dayOfWeek = workingDate.getDay();
    
    // Skip non-business days
    if (!businessHours.days.includes(dayOfWeek)) {
      workingDate.setDate(workingDate.getDate() + 1);
      workingDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }
    
    // Skip holidays
    if (isHoliday(workingDate, businessHours.holidays || [])) {
      workingDate.setDate(workingDate.getDate() + 1);
      workingDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }
    
    // Get current time in business hours
    const currentHour = workingDate.getHours() + workingDate.getMinutes() / 60;
    
    // If before business hours, move to start of business day
    if (currentHour < (startHour + startMinute / 60)) {
      workingDate.setHours(startHour, startMinute, 0, 0);
    }
    
    // If after business hours, move to next business day
    if (currentHour >= (endHour + endMinute / 60)) {
      workingDate.setDate(workingDate.getDate() + 1);
      workingDate.setHours(startHour, startMinute, 0, 0);
      continue;
    }
    
    // Calculate hours remaining in current business day
    const hoursLeftInDay = (endHour + endMinute / 60) - currentHour;
    
    if (remainingHours <= hoursLeftInDay) {
      // Can complete within current business day
      workingDate.setTime(workingDate.getTime() + remainingHours * 60 * 60 * 1000);
      remainingHours = 0;
    } else {
      // Move to next business day
      remainingHours -= hoursLeftInDay;
      workingDate.setDate(workingDate.getDate() + 1);
      workingDate.setHours(startHour, startMinute, 0, 0);
    }
  }
  
  return workingDate;
}

/**
 * Add regular hours (24/7) to a date
 */
function addRegularHours(startDate: Date, hoursToAdd: number): Date {
  const result = new Date(startDate);
  result.setTime(result.getTime() + hoursToAdd * 60 * 60 * 1000);
  return result;
}

/**
 * Format a date into a user-friendly expectation message
 */
function formatExpectationMessage(date: Date, hours: number, isBusinessHours: boolean): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  
  let timeframe: string;
  if (isToday) {
    timeframe = `today by ${timeString}`;
  } else if (isTomorrow) {
    timeframe = `tomorrow (${dateString}) by ${timeString}`;
  } else {
    timeframe = `by ${timeString} on ${dateString}`;
  }
  
  const hoursText = hours === 1 ? '1 hour' : `${hours} hours`;
  const businessText = isBusinessHours ? ' business' : '';
  
  return `within ${hoursText}${businessText} (${timeframe})`;
}

/**
 * Calculate SLA expectations for a ticket based on priority and submission time
 */
export function calculateSLAExpectation(
  priority: string,
  submissionDate: Date,
  slaSettings: SLASettings
): SLAExpectation | null {
  const priorityKey = priority.toLowerCase() as keyof Omit<SLASettings, 'businessHours'>;
  const slaConfig: SLAConfig = slaSettings[priorityKey];
  
  if (!slaConfig || !slaConfig.enabled) {
    return null;
  }
  
  const { responseTimeHours, resolutionTimeHours, businessHoursOnly } = slaConfig;
  
  let responseExpectedBy: Date;
  let resolutionExpectedBy: Date;
  
  if (businessHoursOnly) {
    // Calculate based on business hours
    responseExpectedBy = addBusinessHours(submissionDate, responseTimeHours, slaSettings.businessHours);
    resolutionExpectedBy = addBusinessHours(submissionDate, resolutionTimeHours, slaSettings.businessHours);
  } else {
    // Calculate based on regular 24/7 hours
    responseExpectedBy = addRegularHours(submissionDate, responseTimeHours);
    resolutionExpectedBy = addRegularHours(submissionDate, resolutionTimeHours);
  }
  
  return {
    responseExpectedBy,
    resolutionExpectedBy,
    responseMessage: formatExpectationMessage(responseExpectedBy, responseTimeHours, businessHoursOnly),
    resolutionMessage: formatExpectationMessage(resolutionExpectedBy, resolutionTimeHours, businessHoursOnly),
    isBusinessHoursOnly: businessHoursOnly
  };
}

/**
 * Generate SLA expectation text for inclusion in emails
 */
export function generateSLAExpectationText(
  priority: string,
  submissionDate: Date,
  slaSettings: SLASettings
): { plainText: string; htmlText: string } {
  const expectation = calculateSLAExpectation(priority, submissionDate, slaSettings);
  
  if (!expectation) {
    return {
      plainText: '',
      htmlText: ''
    };
  }
  
  const holidayCount = slaSettings.businessHours.holidays?.length || 0;
  const businessHoursNote = expectation.isBusinessHoursOnly 
    ? ` (calculated using business hours: ${slaSettings.businessHours.start}-${slaSettings.businessHours.end}, ${slaSettings.businessHours.timezone}${holidayCount > 0 ? `, excluding ${holidayCount} configured holiday${holidayCount === 1 ? '' : 's'}` : ''})`
    : '';
  
  const plainText = `
Service Level Expectations:
• Initial response: ${expectation.responseMessage}
• Resolution target: ${expectation.resolutionMessage}${businessHoursNote}
`;

  const htmlText = `
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1976d2;">
      <h4 style="margin: 0 0 10px 0; color: #1976d2;">Service Level Expectations</h4>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Initial response:</strong> ${expectation.responseMessage}</li>
        <li><strong>Resolution target:</strong> ${expectation.resolutionMessage}</li>
      </ul>
      ${expectation.isBusinessHoursOnly ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
        <em>Times calculated using business hours: ${slaSettings.businessHours.start}-${slaSettings.businessHours.end}, ${slaSettings.businessHours.timezone}${holidayCount > 0 ? `, excluding ${holidayCount} configured holiday${holidayCount === 1 ? '' : 's'}` : ''}</em>
      </p>` : ''}
    </div>
  `;
  
  return { plainText, htmlText };
}