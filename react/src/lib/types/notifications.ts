/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// Types of notifications in the system
export type NotificationType = 
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_updated'
  | 'ticket_resolved'
  | 'ticket_reply'
  | 'system_alert'
  | 'survey_request';

// Delivery channels for notifications
export type NotificationChannel = 'email' | 'push' | 'sms';

// User notification preferences
export interface NotificationPreferences {
  // Global notification settings
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled?: boolean;
  
  // For tech users - granular ticket notifications
  techSettings?: {
    newTicketCreated: {
      email: boolean;
      push: boolean;
    };
    ticketAssigned: {
      email: boolean;
      push: boolean;
    };
    ticketUpdated: {
      email: boolean;
      push: boolean;
    };
    ticketResolved: {
      email: boolean;
      push: boolean;
    };
    ticketReply: {
      email: boolean;
      push: boolean;
    };
  };
  
  // Admin/Tech SMS settings - system-wide notifications
  adminSMSSettings?: {
    enabled: boolean;
    phoneNumber: string;
    optInConfirmed: boolean;
    consentDate?: number;
    notifications: {
      newTickets: boolean;
      statusChanges: boolean;
      ticketsClosed: boolean;
      highPriorityOnly: boolean;
    };
  };
  
  // For regular users - simple on/off per channel
  userSettings?: {
    ticketUpdates: {
      email: boolean;
      push: boolean;
    };
    systemAlerts: {
      email: boolean;
      push: boolean;
    };
    surveys: {
      email: boolean;
      push: boolean;
    };
  };
}

// FCM token management
export interface FCMToken {
  token: string;
  deviceInfo: string;
  userAgent: string;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

// User preferences including notifications
export interface UserPreferences {
  userId: string;
  notifications: NotificationPreferences;
  fcmTokens: FCMToken[];
  createdAt: number;
  updatedAt: number;
}

// Push notification payload structure
export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    ticketId?: string;
    url?: string;
    action?: string;
    [key: string]: any;
  };
  actions?: NotificationAction[];
}

// Notification action buttons
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Notification subscription status
export interface NotificationSubscription {
  enabled: boolean;
  permission: NotificationPermission;
  fcmToken?: string;
  error?: string;
}

// Default notification preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  userSettings: {
    ticketUpdates: {
      email: true,
      push: false,
    },
    systemAlerts: {
      email: true,
      push: false,
    },
    surveys: {
      email: true,
      push: false,
    },
  },
};

// Default tech notification preferences
export const DEFAULT_TECH_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  techSettings: {
    newTicketCreated: {
      email: true,
      push: false,
    },
    ticketAssigned: {
      email: true,
      push: false,
    },
    ticketUpdated: {
      email: true,
      push: false,
    },
    ticketResolved: {
      email: true,
      push: false,
    },
    ticketReply: {
      email: true,
      push: false,
    },
  },
};

// Notification template configuration
export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  icon: string;
  tag: string;
  data: Record<string, any>;
  actions: NotificationAction[];
}

// System notification templates
export const NOTIFICATION_TEMPLATES: Record<NotificationType, Partial<NotificationTemplate>> = {
  ticket_created: {
    title: 'New Support Ticket',
    icon: '/icons/ticket-192.png',
    tag: 'ticket_created',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  ticket_assigned: {
    title: 'Ticket Assigned to You',
    icon: '/icons/assigned-192.png',
    tag: 'ticket_assigned',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'accept', title: 'Accept', icon: '/icons/accept.png' }
    ]
  },
  ticket_updated: {
    title: 'Ticket Updated',
    icon: '/icons/update-192.png',
    tag: 'ticket_updated',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  ticket_resolved: {
    title: 'Ticket Resolved',
    icon: '/icons/resolved-192.png',
    tag: 'ticket_resolved',
    actions: [
      { action: 'view', title: 'View Ticket', icon: '/icons/view.png' },
      { action: 'feedback', title: 'Leave Feedback', icon: '/icons/feedback.png' }
    ]
  },
  ticket_reply: {
    title: 'New Reply on Ticket',
    icon: '/icons/reply-192.png',
    tag: 'ticket_reply',
    actions: [
      { action: 'view', title: 'View Reply', icon: '/icons/view.png' },
      { action: 'reply', title: 'Quick Reply', icon: '/icons/reply.png' }
    ]
  },
  system_alert: {
    title: 'System Alert',
    icon: '/icons/alert-192.png',
    tag: 'system_alert',
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  survey_request: {
    title: 'Feedback Requested',
    icon: '/icons/survey-192.png',
    tag: 'survey_request',
    actions: [
      { action: 'survey', title: 'Take Survey', icon: '/icons/survey.png' },
      { action: 'later', title: 'Remind Later' }
    ]
  }
};