/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface SurveyResponse {
  id: string;
  ticketId: string;
  rating: 1 | 2 | 3 | 4 | 5; // 1=Very Dissatisfied, 5=Very Satisfied
  feedback?: string;
  respondentEmail: string;
  respondentName: string;
  techId?: string;
  techName?: string;
  createdAt: number;
  ticketTitle: string;
  ticketPriority: string;
  resolutionTime: number; // in hours
}

export interface SurveySettings {
  enabled: boolean;
  sendDelay: number; // minutes after closure to send survey
  excludedEmails: string[]; // emails that should never receive surveys
  reminderEnabled: boolean;
  reminderDelay: number; // days after initial survey to send reminder
  emailTemplate: {
    subject: string;
    headerText: string;
    footerText: string;
    ratingLabels: {
      1: string;
      2: string;
      3: string;
      4: string;
      5: string;
    };
  };
}

export const DEFAULT_SURVEY_SETTINGS: SurveySettings = {
  enabled: true,
  sendDelay: 15, // 15 minutes after closure
  excludedEmails: [],
  reminderEnabled: false,
  reminderDelay: 3, // 3 days
  emailTemplate: {
    subject: 'How was your support experience? - Ticket #{ticketId}',
    headerText: 'We value your feedback! Please take a moment to rate your recent support experience.',
    footerText: 'Thank you for helping us improve our service.',
    ratingLabels: {
      1: 'Very Dissatisfied',
      2: 'Dissatisfied',
      3: 'Neutral',
      4: 'Satisfied',
      5: 'Very Satisfied'
    }
  }
};

export interface SurveyMetrics {
  totalResponses: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  responseRate: number; // percentage
  nps: number; // Net Promoter Score
}

export type SurveyRating = 1 | 2 | 3 | 4 | 5;