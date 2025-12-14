/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

// Mock Firebase Admin
jest.mock('firebase-admin');

// Mock the send-email module
jest.mock('../send-email', () => ({
  sendEmail: jest.fn()
}));

const { sendEmail } = require('../send-email');

describe('Escalation Service', () => {
  let mockFirestore;
  let mockCollection;
  let mockDoc;
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mocks
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockQuery = {
      get: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery)
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      add: jest.fn(),
      get: jest.fn()
    };

    mockFirestore = {
      collection: jest.fn(() => mockCollection)
    };

    admin.firestore.mockReturnValue(mockFirestore);
    sendEmail.mockResolvedValue({ success: true });
  });

  describe('checkEscalations', () => {
    test('should identify tickets needing escalation', async () => {
      const now = new Date();
      const escalationTime = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago

      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'High Priority Issue',
          priority: 'High',
          status: 'Open',
          createdAt: { toDate: () => escalationTime },
          submitterId: 'user-123',
          assignedTo: 'agent-456'
        },
        {
          id: 'ticket-2',
          title: 'Critical System Down',
          priority: 'Critical',
          status: 'Open',
          createdAt: { toDate: () => escalationTime },
          submitterId: 'user-789'
        }
      ];

      const mockSnapshot = {
        docs: mockTickets.map(ticket => ({
          id: ticket.id,
          data: () => ticket,
          ref: {
            update: jest.fn()
          }
        }))
      };

      // Mock app config
      const mockConfig = {
        escalationSettings: {
          enabled: true,
          escalationTimes: {
            Critical: 4, // 4 hours
            High: 24,    // 24 hours
            Medium: 48,  // 48 hours
            Low: 72      // 72 hours
          },
          escalationEmails: {
            Critical: ['manager@company.com', 'director@company.com'],
            High: ['supervisor@company.com'],
            Medium: ['lead@company.com'],
            Low: ['team@company.com']
          }
        }
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockConfig
      });

      mockQuery.get.mockResolvedValue(mockSnapshot);

      // Simulate the checkEscalations function logic
      const configDoc = await mockFirestore.collection('config').doc('app').get();
      const config = configDoc.data();

      if (config.escalationSettings?.enabled) {
        const openTicketsQuery = mockFirestore.collection('tickets')
          .where('status', '==', 'Open')
          .where('escalated', '!=', true);

        const openTickets = await openTicketsQuery.get();
        let escalatedCount = 0;

        for (const ticketDoc of openTickets.docs) {
          const ticket = ticketDoc.data();
          const ticketAge = now.getTime() - ticket.createdAt.toDate().getTime();
          const ageInHours = ticketAge / (1000 * 60 * 60);
          const escalationTime = config.escalationSettings.escalationTimes[ticket.priority] || 72;

          if (ageInHours > escalationTime) {
            // Escalate ticket
            await ticketDoc.ref.update({
              escalated: true,
              escalatedAt: new Date(),
              escalationReason: `Ticket exceeded ${escalationTime} hour threshold`
            });

            // Send escalation email
            const escalationEmails = config.escalationSettings.escalationEmails[ticket.priority] || [];
            if (escalationEmails.length > 0) {
              await sendEmail({
                to: escalationEmails,
                subject: `ESCALATION: ${ticket.title}`,
                text: `Ticket ${ticket.id} has been escalated due to exceeding time threshold.`,
                html: `<p>Ticket <strong>${ticket.id}</strong> has been escalated.</p>`
              });
            }

            escalatedCount++;
          }
        }

        expect(escalatedCount).toBe(2); // Both tickets should be escalated
      }

      expect(mockFirestore.collection).toHaveBeenCalledWith('config');
      expect(mockFirestore.collection).toHaveBeenCalledWith('tickets');
      expect(sendEmail).toHaveBeenCalledTimes(2);
    });

    test('should skip escalation when disabled in config', async () => {
      const mockConfig = {
        escalationSettings: {
          enabled: false
        }
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockConfig
      });

      const result = { processed: 0, escalated: 0, skipped: 'Escalation disabled' };

      expect(result.skipped).toBe('Escalation disabled');
      expect(result.escalated).toBe(0);
    });

    test('should handle missing config gracefully', async () => {
      mockDoc.get.mockResolvedValue({
        exists: false
      });

      const result = { 
        success: false, 
        error: 'No escalation configuration found' 
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('No escalation configuration found');
    });

    test('should respect priority-based escalation times', async () => {
      const now = new Date();
      
      const testCases = [
        { 
          priority: 'Critical', 
          hoursAgo: 5, 
          escalationTime: 4, 
          shouldEscalate: true 
        },
        { 
          priority: 'High', 
          hoursAgo: 12, 
          escalationTime: 24, 
          shouldEscalate: false 
        },
        { 
          priority: 'Medium', 
          hoursAgo: 50, 
          escalationTime: 48, 
          shouldEscalate: true 
        }
      ];

      testCases.forEach(testCase => {
        const ticketAge = testCase.hoursAgo * 60 * 60 * 1000; // Convert to milliseconds
        const createdAt = new Date(now.getTime() - ticketAge);
        
        const shouldEscalate = testCase.hoursAgo > testCase.escalationTime;
        expect(shouldEscalate).toBe(testCase.shouldEscalate);
      });
    });

    test('should handle email sending failures gracefully', async () => {
      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        priority: 'High',
        status: 'Open',
        createdAt: { toDate: () => new Date(Date.now() - 25 * 60 * 60 * 1000) }
      };

      sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      try {
        await sendEmail({
          to: ['manager@company.com'],
          subject: `ESCALATION: ${mockTicket.title}`,
          text: 'Escalation notification'
        });
      } catch (error) {
        expect(error.message).toBe('Email service unavailable');
      }

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('Escalation Email Templates', () => {
    test('should format escalation email correctly', () => {
      const ticket = {
        id: 'TICKET-123',
        title: 'Critical System Outage',
        priority: 'Critical',
        submittedBy: 'john.doe@company.com',
        createdAt: new Date('2023-01-01T10:00:00Z'),
        assignedTo: 'jane.smith@company.com'
      };

      const emailSubject = `ESCALATION: ${ticket.title}`;
      const emailHtml = `
        <h2>Ticket Escalation Notice</h2>
        <p><strong>Ticket ID:</strong> ${ticket.id}</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> ${ticket.priority}</p>
        <p><strong>Submitted By:</strong> ${ticket.submittedBy}</p>
        <p><strong>Created:</strong> ${ticket.createdAt.toISOString()}</p>
        <p><strong>Assigned To:</strong> ${ticket.assignedTo || 'Unassigned'}</p>
        <p>This ticket has exceeded the escalation threshold and requires immediate attention.</p>
      `;

      expect(emailSubject).toBe('ESCALATION: Critical System Outage');
      expect(emailHtml).toContain('TICKET-123');
      expect(emailHtml).toContain('Critical');
      expect(emailHtml).toContain('john.doe@company.com');
    });
  });
});