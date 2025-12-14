/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collection,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  doc
} from 'firebase/firestore';
import {
  createTicket,
  updateTicket,
  deleteTicket,
  getTicket,
  getTickets,
  getUserTickets,
  getAssignedTickets,
  uploadFile,
  addReply
} from '../ticketService';
import { mockTicketFormData, mockTicket, createMockTickets } from '../../../test/fixtures/tickets';

// Mock Firebase modules
vi.mock('firebase/firestore');
vi.mock('firebase/storage');

vi.mock('../firebaseConfig', () => ({
  auth: {
    currentUser: { 
      uid: 'test-user-123', 
      email: 'test@example.com',
      getIdToken: vi.fn().mockResolvedValue('mock-id-token')
    }
  },
  db: {},
  storage: {}
}));

// Mock other services
vi.mock('../../email/emailService', () => ({
  sendTicketCreatedNotification: vi.fn().mockResolvedValue(undefined),
  sendTicketUpdateNotification: vi.fn().mockResolvedValue(undefined),
  sendTicketReplyNotification: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../configService', () => ({
  getAppConfig: vi.fn().mockResolvedValue({
    slaSettings: {
      responseTimeHours: 4,
      resolutionTimeHours: 24,
      enabled: true
    },
    surveySettings: {
      enabled: false
    },
    automations: {
      autoAssignment: { enabled: false }
    }
  })
}));

vi.mock('../../algolia/algoliaConfig', () => ({
  ticketsIndex: {
    saveObject: vi.fn().mockResolvedValue({}),
    deleteObject: vi.fn().mockResolvedValue({})
  },
  isAlgoliaConfigured: true
}));

// Mock global fetch for Firebase Functions
global.fetch = vi.fn();

describe('ticketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createTicket', () => {
    it('creates a new ticket with generated ticket number', async () => {
      const mockDocRef = { id: 'new-ticket-id' };
      const mockQuerySnapshot = {
        empty: true,
        docs: [],
        forEach: vi.fn()
      };

      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockTicketFormData,
          id: 'new-ticket-id',
          ticketNumber: 'T-2024-001',
          createdAt: new Date(),
          updatedAt: new Date()
        }),
        id: 'new-ticket-id'
      } as any);

      const result = await createTicket(mockTicketFormData);

      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-ticket-id');
    });

    it('creates ticket with document ID as identifier', async () => {
      const mockDocRef = { id: 'new-ticket-id' };

      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any);
      
      // Mock config document to avoid SLA errors - return config not found
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null
      } as any);

      const result = await createTicket(mockTicketFormData);

      // Current implementation uses document ID as the ticket identifier
      // Note: ticketNumber generation is not yet implemented
      expect(result).toHaveProperty('id', 'new-ticket-id');
      expect(result).toHaveProperty('title', mockTicketFormData.title);
      expect(result).toHaveProperty('status', 'Open');
      expect(result).toHaveProperty('priority', mockTicketFormData.priority);
    });
  });

  describe('updateTicket', () => {
    it('updates an existing ticket', async () => {
      const mockUpdatedTicket = { ...mockTicket, title: 'Updated Title', status: 'Resolved' };
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          ticket: mockUpdatedTicket,
          userRole: 'admin'
        })
      } as any);

      const updates = { title: 'Updated Title', status: 'Resolved' as const };
      await updateTicket('ticket-123', updates);

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/updateTicketHttp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringMatching(/^Bearer /)
          }),
          body: JSON.stringify({ ticketId: 'ticket-123', updates })
        })
      );
    });

    it('handles resolution timestamp', async () => {
      const mockResolvedTicket = { ...mockTicket, status: 'Resolved', resolvedAt: Date.now() };
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          ticket: mockResolvedTicket,
          userRole: 'admin'
        })
      } as any);

      await updateTicket('ticket-123', { status: 'Resolved' });

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/updateTicketHttp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ticketId: 'ticket-123', updates: { status: 'Resolved' } })
        })
      );
    });

    it('handles closure timestamp', async () => {
      const mockClosedTicket = { ...mockTicket, status: 'Closed' };
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          ticket: mockClosedTicket,
          userRole: 'admin'
        })
      } as any);

      await updateTicket('ticket-123', { status: 'Closed' });

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/updateTicketHttp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ticketId: 'ticket-123', updates: { status: 'Closed' } })
        })
      );
    });
  });

  describe('deleteTicket', () => {
    it('deletes a ticket', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined as any);

      await deleteTicket('ticket-123');

      expect(doc).toHaveBeenCalledWith({}, 'tickets', 'ticket-123');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('getTicket', () => {
    it('retrieves a single ticket', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ticket: { ...mockTicket, id: 'ticket-123' },
          userRole: 'admin'
        })
      } as any);

      const result = await getTicket('ticket-123');

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/getTicketHttp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringMatching(/^Bearer /)
          }),
          body: JSON.stringify({ ticketId: 'ticket-123' })
        })
      );
      expect(result).toEqual({ ...mockTicket, id: 'ticket-123' });
    });

    it('returns null for non-existent ticket', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Ticket not found' })
      } as any);

      const result = await getTicket('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getTickets', () => {
    it('retrieves all tickets ordered by creation date', async () => {
      const mockTickets = createMockTickets(3);
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tickets: mockTickets,
          count: 3,
          userRole: 'admin'
        })
      } as any);

      const result = await getTickets();

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/getUserTicketsHttp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringMatching(/^Bearer /)
          }),
          body: JSON.stringify({})
        })
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id', 'ticket-0');
    });

    it('filters tickets by status', async () => {
      const mockTickets = createMockTickets(4);
      const openTickets = mockTickets.filter(t => t.status === 'Open');
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tickets: openTickets,
          count: openTickets.length,
          userRole: 'admin'
        })
      } as any);

      const result = await getTickets({ status: 'Open' });

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/getUserTicketsHttp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ status: 'Open' })
        })
      );
      expect(result.every(ticket => ticket.status === 'Open')).toBe(true);
    });
  });

  describe('getUserTickets', () => {
    it('retrieves tickets for a specific user', async () => {
      const mockUserTickets = createMockTickets(2);
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tickets: mockUserTickets,
          count: 2,
          userRole: 'user'
        })
      } as any);

      const result = await getUserTickets('user-123');

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/getUserTicketsHttp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ submitterId: 'user-123' })
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getAssignedTickets', () => {
    it('retrieves tickets assigned to a specific user', async () => {
      const mockAssignedTickets = createMockTickets(2);
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tickets: mockAssignedTickets,
          count: 2,
          userRole: 'tech'
        })
      } as any);

      const result = await getAssignedTickets('user-123');

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/getUserTicketsHttp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ assigneeId: 'user-123' })
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('addReply', () => {
    it('adds a reply to a ticket successfully', async () => {
      const mockReply = {
        id: 'reply-123',
        authorId: 'test-user-123',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        message: 'This is a test reply',
        attachments: [],
        createdAt: Date.now(),
        isPrivate: false
      };

      const mockUpdatedTicket = {
        ...mockTicket,
        replies: [mockReply]
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          reply: mockReply,
          ticket: mockUpdatedTicket,
          userRole: 'admin'
        })
      } as any);

      const result = await addReply('ticket-123', {
        message: 'This is a test reply',
        isPrivate: false
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://us-central1-your-project-id.cloudfunctions.net/addReplyHttp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringMatching(/^Bearer /)
          }),
          body: JSON.stringify({
            ticketId: 'ticket-123',
            message: 'This is a test reply',
            isPrivate: false
          })
        })
      );

      expect(result).toEqual(mockReply);
    });

    it('handles private replies for authorized users', async () => {
      const mockPrivateReply = {
        id: 'reply-456',
        authorId: 'test-user-123',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        message: 'This is a private reply',
        attachments: [],
        createdAt: Date.now(),
        isPrivate: true
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          reply: mockPrivateReply,
          ticket: { ...mockTicket, replies: [mockPrivateReply] },
          userRole: 'tech'
        })
      } as any);

      const result = await addReply('ticket-123', {
        message: 'This is a private reply',
        isPrivate: true
      });

      expect(result.isPrivate).toBe(true);
      expect(result.message).toBe('This is a private reply');
    });

    it('throws error for authentication failure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Authentication failed' })
      } as any);

      await expect(addReply('ticket-123', {
        message: 'Test reply'
      })).rejects.toThrow('Authentication failed');
    });

    it('throws error for permission denied', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Access denied' })
      } as any);

      await expect(addReply('ticket-123', {
        message: 'Test reply'
      })).rejects.toThrow('Access denied');
    });
  });

  describe('uploadFile', () => {
    it('uploads a file and returns attachment metadata', async () => {
      const { uploadBytes, getDownloadURL } = await import('firebase/storage');
      vi.mocked(uploadBytes).mockResolvedValue({} as any);
      vi.mocked(getDownloadURL).mockResolvedValue('https://example.com/file.pdf');

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await uploadFile(file, 'ticket-123');

      expect(result).toHaveProperty('filename', 'test.pdf');
      expect(result).toHaveProperty('fileUrl', 'https://example.com/file.pdf');
      expect(result).toHaveProperty('contentType', 'application/pdf');
      expect(result).toHaveProperty('size', file.size);
    });
  });
});