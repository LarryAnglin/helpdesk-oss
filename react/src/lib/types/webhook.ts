/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export type WebhookEventType = 
  | 'ticket.created'
  | 'ticket.updated' 
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'ticket.escalated'
  | 'ticket.assigned'
  | 'ticket.reply_added'
  | 'ticket.status_changed'
  | 'ticket.priority_changed';

export type WebhookStatus = 'active' | 'inactive' | 'failed';

export type WebhookHttpMethod = 'POST' | 'PUT' | 'PATCH';

export interface WebhookHeaders {
  [key: string]: string;
}

export type WebhookScope = 'organization' | 'company' | 'user';

export interface WebhookFilter {
  companyIds?: string[]; // Filter by specific companies
  userIds?: string[]; // Filter by specific users  
  priorities?: string[]; // Filter by ticket priorities
  statuses?: string[]; // Filter by ticket statuses
  tags?: string[]; // Filter by ticket tags
  assigneeIds?: string[]; // Filter by assigned users
}

export interface WebhookConfig {
  id: string;
  organizationId: string; // Changed from tenantId to organizationId
  tenantId?: string; // Keep for backward compatibility
  name: string;
  description?: string;
  url: string;
  method: WebhookHttpMethod;
  headers: WebhookHeaders;
  events: WebhookEventType[];
  status: WebhookStatus;
  secret?: string; // For signature verification
  retryCount: number;
  timeout: number; // in milliseconds
  active: boolean;
  scope: WebhookScope; // Scope of the webhook
  filters: WebhookFilter; // Event filtering criteria
  createdAt: Date | any; // Firestore timestamp
  updatedAt: Date | any; // Firestore timestamp
  createdBy: string;
  lastTriggered?: Date | any;
  successCount: number;
  failureCount: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  organizationId: string; // Changed from tenantId
  tenantId?: string; // Keep for backward compatibility
  eventType: WebhookEventType;
  url: string;
  method: WebhookHttpMethod;
  headers: WebhookHeaders;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  httpStatus?: number;
  response?: string;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date | any;
  deliveredAt?: Date | any;
  nextRetryAt?: Date | any;
  companyId?: string; // Company associated with the event
  userId?: string; // User associated with the event
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  webhook: {
    id: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  tenant?: { // Keep for backward compatibility
    id: string;
    name: string;
  };
  company?: {
    id: string;
    name: string;
  };
  data: any; // The actual event data (ticket, escalation, etc.)
  metadata?: {
    userId?: string;
    userAgent?: string;
    ipAddress?: string;
    source: 'web' | 'api' | 'email' | 'system';
  };
}

export interface WebhookTestResult {
  success: boolean;
  httpStatus: number;
  responseTime: number;
  response?: string;
  error?: string;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  lastDelivery?: Date;
  successRate: number;
}

export interface WebhookFormData {
  name: string;
  description?: string;
  url: string;
  method: WebhookHttpMethod;
  headers: WebhookHeaders;
  events: WebhookEventType[];
  secret?: string;
  retryCount: number;
  timeout: number;
  active: boolean;
  scope: WebhookScope;
  filters: WebhookFilter;
}

export interface CreateWebhookRequest {
  organizationId: string;
  webhook: WebhookFormData;
}

export interface UpdateWebhookRequest {
  webhookId: string;
  updates: Partial<WebhookFormData>;
}

// Escalation-specific types
export interface EscalationRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  priority: number; // Higher number = higher priority
  active: boolean;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface EscalationCondition {
  type: 'time_since_created' | 'time_since_updated' | 'priority' | 'status' | 'assignee' | 'no_response';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
  unit?: 'minutes' | 'hours' | 'days'; // For time-based conditions
}

export interface EscalationAction {
  type: 'webhook' | 'email' | 'assign' | 'priority_change' | 'status_change';
  config: any; // Action-specific configuration
}

export interface EscalationEvent {
  id: string;
  ticketId: string;
  tenantId: string;
  ruleId: string;
  ruleName: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  executedAt: Date | any;
  success: boolean;
  error?: string;
  metadata?: any;
}