/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket, TicketFormData, TicketStatus, TicketPriority } from '../../lib/types/ticket';

export const mockTicketFormData: TicketFormData = {
  title: 'Test Ticket',
  description: 'This is a test ticket description',
  priority: 'Medium' as TicketPriority,
  status: 'Open' as TicketStatus,
  location: 'RCL',
  isOnVpn: false,
  computer: 'LAPTOP-001',
  networkType: 'wireless',
  wirelessNetworkName: 'CompanyWifi',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  contactMethod: 'email',
  errorMessage: 'Error: Connection timeout',
  problemStartDate: '2024-01-01',
  isPersonHavingProblem: true,
  userName: '',
  userPhone: '',
  userEmail: '',
  userPreferredContact: 'email',
  impact: '',
  stepsToReproduce: '1. Open application\n2. Click on button\n3. Error appears',
  agreeToTroubleshoot: true,
  files: []
};

export const mockTicket: Ticket = {
  id: 'ticket-123',
  tenantId: 'default',
  ...mockTicketFormData,
  status: 'Open',
  createdAt: new Date('2024-01-01T10:00:00Z').getTime(),
  updatedAt: new Date('2024-01-01T10:00:00Z').getTime(),
  submitterId: 'user-123',
  assigneeId: undefined,
  resolvedAt: undefined,
  attachments: [],
  participants: [{
    userId: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'submitter' as const
  }],
  replies: [],
  customFields: []
};

export const createMockTickets = (count: number): Ticket[] => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTicket,
    id: `ticket-${i}`,
    title: `Test Ticket ${i + 1}`,
    createdAt: Date.now() - i * 24 * 60 * 60 * 1000, // Each ticket 1 day older
    priority: ['Low', 'Medium', 'High'][i % 3] as TicketPriority,
    status: ['Open', 'In Progress', 'Resolved', 'Closed'][i % 4] as TicketStatus
  }));
};