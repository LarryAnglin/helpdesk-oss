/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { TicketPriority } from './ticket';

export interface AutoAssignmentRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  conditions: {
    priorities?: TicketPriority[];
    keywords?: string[];
    location?: string[];
    categories?: string[];
  };
  assignment: {
    type: 'roundRobin' | 'balanced' | 'specific' | 'skillBased';
    techIds?: string[];
    skillTags?: string[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    priorities?: TicketPriority[];
    statuses?: string[];
    timeSinceCreated?: number; // hours
    timeSinceResponse?: number; // hours
    slaBreached?: boolean;
  };
  actions: {
    reassign?: {
      to: 'manager' | 'senior' | 'specific';
      techIds?: string[];
    };
    notify?: {
      emails: string[];
      message?: string;
    };
    updatePriority?: TicketPriority;
    updateStatus?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface TechAvailability {
  techId: string;
  techName: string;
  techEmail: string;
  role: 'tech' | 'senior' | 'manager';
  isActive: boolean;
  maxTickets: number;
  currentTickets: number;
  skills: string[];
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
    days: number[]; // [1,2,3,4,5] Monday-Friday
    timezone: string;
  };
  lastAssigned: number;
}

export interface AutomationSettings {
  autoAssignment: {
    enabled: boolean;
    rules: AutoAssignmentRule[];
    defaultAssignment: {
      type: 'roundRobin' | 'balanced';
      techIds: string[];
    };
  };
  escalation: {
    enabled: boolean;
    rules: EscalationRule[];
    globalSettings: {
      maxResponseTimeHours: number;
      maxResolutionTimeHours: number;
      escalationEmailTemplate: string;
    };
  };
}

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoAssignment: {
    enabled: false,
    rules: [],
    defaultAssignment: {
      type: 'roundRobin',
      techIds: []
    }
  },
  escalation: {
    enabled: false,
    rules: [],
    globalSettings: {
      maxResponseTimeHours: 24,
      maxResolutionTimeHours: 72,
      escalationEmailTemplate: 'Ticket #{ticketId} requires escalation. It has been {timeOverdue} overdue.'
    }
  }
};

export type AssignmentStrategy = 'roundRobin' | 'balanced' | 'specific' | 'skillBased';
export type EscalationTrigger = 'timeOverdue' | 'slaBreached' | 'noResponse' | 'priorityChange';