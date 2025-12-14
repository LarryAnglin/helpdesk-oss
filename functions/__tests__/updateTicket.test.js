const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');
const admin = require('firebase-admin');

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  apps: { length: 0 },
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn()
      }))
    }))
  })),
  auth: vi.fn(() => ({
    verifyIdToken: vi.fn()
  }))
}));

// Mock firebase-functions
vi.mock('firebase-functions', () => ({
  https: {
    onRequest: vi.fn((handler) => handler)
  }
}));

// Mock cors
vi.mock('cors', () => () => (req, res, next) => next());

describe('updateTicketHttp Firebase Function', () => {
  let mockDb, mockAuth, mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          update: vi.fn()
        }))
      }))
    };
    
    mockAuth = {
      verifyIdToken: vi.fn()
    };
    
    admin.firestore.mockReturnValue(mockDb);
    admin.auth.mockReturnValue(mockAuth);
    
    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token'
      },
      body: {
        ticketId: 'test-ticket-123',
        updates: {
          title: 'Updated Title',
          status: 'Resolved'
        }
      }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('should update a ticket successfully for admin user', async () => {
    const { updateTicketHttp } = require('../updateTicket');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'admin-user-123',
      email: 'admin@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        uid: 'admin-user-123',
        email: 'admin@example.com',
        role: 'admin'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Original Title',
        description: 'Test Description',
        status: 'Open',
        submitterId: 'user-456'
      })
    };
    
    const mockUpdatedTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Updated Title',
        description: 'Test Description',
        status: 'Resolved',
        submitterId: 'user-456',
        updatedAt: expect.any(Number)
      })
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)  // First call for user
          .mockResolvedValueOnce(mockTicketDoc)  // Second call for current ticket
          .mockResolvedValueOnce(mockUpdatedTicketDoc), // Third call for updated ticket
        update: vi.fn().mockResolvedValue()
      }))
    });
    
    await updateTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      ticket: expect.objectContaining({
        id: 'test-ticket-123',
        title: 'Updated Title',
        status: 'Resolved'
      }),
      userRole: 'admin'
    });
  });

  it('should restrict regular user updates to allowed fields only', async () => {
    const { updateTicketHttp } = require('../updateTicket');
    
    mockReq.body.updates = {
      title: 'Updated Title',
      assigneeId: 'unauthorized-change', // This should be restricted for regular users
      priority: 'High'
    };
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'regular-user-789',
      email: 'user@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        uid: 'regular-user-789',
        email: 'user@example.com',
        role: 'user'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      data: () => ({
        submitterId: 'regular-user-789', // User owns this ticket
        participants: []
      })
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)
          .mockResolvedValueOnce(mockTicketDoc)
      }))
    });
    
    await updateTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied - users can only update title, description, and priority'
    });
  });

  it('should deny access for user trying to update other user ticket', async () => {
    const { updateTicketHttp } = require('../updateTicket');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'regular-user-789',
      email: 'user@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        role: 'user'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      data: () => ({
        submitterId: 'other-user-456', // Different user owns this ticket
        participants: []
      })
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)
          .mockResolvedValueOnce(mockTicketDoc)
      }))
    });
    
    await updateTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied - you do not have permission to update this ticket'
    });
  });

  it('should return 404 for non-existent ticket', async () => {
    const { updateTicketHttp } = require('../updateTicket');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'admin-user-123',
      email: 'admin@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: 'admin' })
    };
    
    const mockTicketDoc = {
      exists: false
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)
          .mockResolvedValueOnce(mockTicketDoc)
      }))
    });
    
    await updateTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Ticket not found'
    });
  });

  it('should handle resolution timestamp for resolved tickets', async () => {
    const { updateTicketHttp } = require('../updateTicket');
    
    mockReq.body.updates = { status: 'Resolved' };
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'tech-user-123',
      email: 'tech@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: 'tech' })
    };
    
    const mockTicketDoc = {
      exists: true,
      data: () => ({
        title: 'Test Ticket',
        status: 'Open'
        // Note: no resolvedAt timestamp yet
      })
    };
    
    const mockUpdatedTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Test Ticket',
        status: 'Resolved',
        resolvedAt: expect.any(Number),
        updatedAt: expect.any(Number)
      })
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)
          .mockResolvedValueOnce(mockTicketDoc)
          .mockResolvedValueOnce(mockUpdatedTicketDoc),
        update: vi.fn().mockResolvedValue()
      }))
    });
    
    await updateTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      ticket: expect.objectContaining({
        status: 'Resolved',
        resolvedAt: expect.any(Number)
      }),
      userRole: 'tech'
    });
  });
});