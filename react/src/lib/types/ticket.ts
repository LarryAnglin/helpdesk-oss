/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { SLAStatus } from './sla';
import { CustomFieldValue } from './customFields';

export type TicketStatus = 'Open' | 'Resolved' | 'Closed' | 'Accepted' | 'Rejected' | 'On Hold' | 'Waiting' | 'Paused';
export type TicketPriority = 'Urgent' | 'High' | 'Medium' | 'Low' | 'None';
export type TicketLocation = 'RCL' | 'RCL-EH' | 'My Home' | 'Other';

export interface TicketAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  contentType: string;
  size: number;
  uploadedAt: number;
}

export interface TicketParticipant {
  userId: string;
  name: string;
  email: string;
  role: 'submitter' | 'assignee' | 'cc';
}

export interface TicketReply {
  id: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  message: string;
  attachments: TicketAttachment[];
  createdAt: number;
  isPrivate: boolean;
}

export interface StatusChange {
  id: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  changedBy: string;
  changedByName: string;
  changedAt: number;
  reason?: string; // For Waiting and Paused statuses
  duration?: number; // Time spent in previous status (milliseconds)
}

export type TicketRelationshipType = 
  | 'parent_of' 
  | 'child_of' 
  | 'split_from' 
  | 'merged_into' 
  | 'related_to' 
  | 'duplicate_of' 
  | 'blocks' 
  | 'blocked_by';

export interface TicketRelationship {
  id: string;
  tenantId: string; // Multi-tenant isolation
  sourceTicketId: string;
  targetTicketId: string;
  relationshipType: TicketRelationshipType;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  description?: string;
}

export interface SplitTicketHistory {
  id: string;
  tenantId: string; // Multi-tenant isolation
  originalTicketId: string;
  newTicketIds: string[];
  reason: string;
  splitBy: string;
  splitByName: string;
  splitAt: number;
  fieldsDistribution: {
    [ticketId: string]: {
      title: string;
      description: string;
      assigneeId?: string;
      priority: TicketPriority;
    };
  };
}

export interface MergeTicketHistory {
  id: string;
  tenantId: string; // Multi-tenant isolation
  primaryTicketId: string;
  mergedTicketIds: string[];
  reason: string;
  mergedBy: string;
  mergedByName: string;
  mergedAt: number;
  preservedData: {
    replies: TicketReply[];
    timeEntries: any[]; // Time tracking entries
    attachments: TicketAttachment[];
  };
}

export interface Ticket {
  id: string;
  tenantId: string; // Multi-tenant isolation
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  location: TicketLocation;
  isOnVpn: boolean;
  computer: string;
  name: string;
  email: string;
  phone?: string;
  contactMethod: string;
  smsUpdates?: boolean;
  smsPhoneNumber?: string;
  smsConsent?: 'pending' | 'confirmed' | 'denied' | 'stopped';
  smsConsentDate?: number;
  errorMessage?: string;
  problemStartDate?: string;
  isPersonHavingProblem: boolean;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  userPreferredContact?: string;
  agreeToTroubleshoot?: boolean;
  impact?: string;
  stepsToReproduce?: string;
  attachments: TicketAttachment[];
  participants: TicketParticipant[];
  submitterId: string;
  assigneeId?: string;
  replies: TicketReply[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  firstResponseAt?: number;
  sla?: SLAStatus;
  customFields?: CustomFieldValue[];
  statusHistory?: StatusChange[];
  
  // Ticket Relationships
  parentTicketId?: string;
  childTicketIds?: string[];
  relationships?: TicketRelationship[];
  splitHistory?: SplitTicketHistory[];
  mergeHistory?: MergeTicketHistory[];
}

export interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  status?: TicketStatus;
  location: TicketLocation;
  isOnVpn: boolean;
  computer: string;
  networkType?: string;
  wirelessNetworkName?: string;
  name: string;
  email: string;
  cc?: string;
  ccParticipants?: Array<{name: string; email: string}>;
  phone?: string;
  contactMethod: string;
  smsUpdates?: boolean;
  smsPhoneNumber?: string;
  smsConsent?: 'pending' | 'confirmed' | 'denied' | 'stopped';
  smsConsentDate?: number;
  errorMessage?: string;
  problemStartDate?: string;
  isPersonHavingProblem: boolean;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  userPreferredContact?: string;
  agreeToTroubleshoot?: boolean;
  impact?: string;
  stepsToReproduce?: string;
  files: File[];
  attachments?: TicketAttachment[];
  customFields?: CustomFieldValue[];
}