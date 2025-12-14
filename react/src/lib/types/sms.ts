/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export type SMSConsentStatus = 'pending' | 'confirmed' | 'denied' | 'stopped';

export interface SMSPreferences {
  id: string;
  tenantId: string;
  phoneNumber: string; // Normalized format: +15551234567
  status: SMSConsentStatus;
  userId?: string; // Link to user if registered
  userName?: string;
  userEmail?: string;
  optInDate?: number;
  optOutDate?: number;
  lastMessageDate?: number;
  ticketIds: string[]; // Which tickets this number is associated with
  messageCount: number; // Total messages sent
  createdAt: number;
  updatedAt: number;
}

export interface SMSMessage {
  id: string;
  tenantId: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'received';
  twilioMessageSid?: string;
  ticketId?: string;
  messageType: 'opt_in' | 'confirmation' | 'ticket_update' | 'opt_out' | 'user_reply';
  createdAt: number;
  deliveredAt?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface SMSTemplate {
  type: 'opt_in' | 'confirmed' | 'stopped' | 'ticket_created' | 'ticket_updated' | 'ticket_resolved';
  message: string;
  variables?: string[]; // e.g., ['ticketId', 'status']
}

export const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  opt_in: {
    type: 'opt_in',
    message: '{companyName} Help Desk: Reply START to receive updates for ticket #{ticketId}. Message and data rates may apply. Reply STOP to opt out anytime.',
    variables: ['companyName', 'ticketId']
  },
  confirmed: {
    type: 'confirmed', 
    message: "You're now subscribed to SMS updates for {companyName} Help Desk tickets. Reply STOP anytime to unsubscribe.",
    variables: ['companyName']
  },
  stopped: {
    type: 'stopped',
    message: "You've been unsubscribed from {companyName} Help Desk SMS updates. No more messages will be sent. Contact {contactInfo} for support.",
    variables: ['companyName', 'contactInfo']
  },
  ticket_created: {
    type: 'ticket_created',
    message: '{companyName} Support: Ticket #{ticketId} created - {title}. We\'ll keep you updated. Reply STOP to unsubscribe. Help: {contactInfo}',
    variables: ['companyName', 'ticketId', 'title', 'contactInfo']
  },
  ticket_updated: {
    type: 'ticket_updated',
    message: '{companyName} Support: Ticket #{ticketId} updated - Status: {status}. {message} Reply STOP to opt out.',
    variables: ['companyName', 'ticketId', 'status', 'message']
  },
  ticket_resolved: {
    type: 'ticket_resolved',
    message: '{companyName} Support: Ticket #{ticketId} resolved! {message} Reply STOP to unsubscribe.',
    variables: ['companyName', 'ticketId', 'message']
  },
  help_response: {
    type: 'confirmed',
    message: '{companyName} Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: {contactInfo}',
    variables: ['companyName', 'contactInfo']
  }
};