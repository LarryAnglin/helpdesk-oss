/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'submission' | 'reply' | 'private_reply' | 'status_change' | 'assignment' | 'custom';
  title: string;
  description: string;
  originalData?: any; // Store original ticket/reply data for reference
  author?: {
    name: string;
    email: string;
    role?: string;
  };
  isVisible: boolean; // Allow hiding events from timeline
  isEditable: boolean; // Allow manual editing of title/description
}

export interface Timeline {
  id: string;
  ticketId: string;
  title: string;
  events: TimelineEvent[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface TimelineGenerationOptions {
  includeSubmission: boolean;
  includeReplies: boolean;
  includePrivateReplies: boolean;
  includeStatusChanges: boolean;
  includeAssignments: boolean;
  includeRelatedTickets: boolean;
  summarizeWithAI: boolean;
}

export const DEFAULT_TIMELINE_OPTIONS: TimelineGenerationOptions = {
  includeSubmission: true,
  includeReplies: true,
  includePrivateReplies: true,
  includeStatusChanges: true,
  includeAssignments: true,
  includeRelatedTickets: false,
  summarizeWithAI: false // Disabled by default until AI endpoint is implemented
};

export interface TimelineExportOptions {
  title?: string;
  includeTicketSummary: boolean;
  includeEventDetails: boolean;
  groupByDate: boolean;
  showTimeOnly: boolean; // Show only time for events on same date
}

export const DEFAULT_EXPORT_OPTIONS: TimelineExportOptions = {
  includeTicketSummary: true,
  includeEventDetails: true,
  groupByDate: true,
  showTimeOnly: true
};