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

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

describe('addReplyHttp Firebase Function', () => {
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
        message: 'This is a test reply',
        isPrivate: false
      }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('should add a reply successfully for tech user', async () => {
    const { addReplyHttp } = require('../addReply');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'tech-user-123',
      email: 'tech@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        uid: 'tech-user-123',
        email: 'tech@example.com',
        displayName: 'Tech User',
        role: 'tech'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Test Ticket',
        submitterId: 'user-456',
        replies: []
      })
    };
    
    const mockUpdatedTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Test Ticket',
        submitterId: 'user-456',
        replies: [{
          id: 'mock-uuid-123',
          authorId: 'tech-user-123',
          authorName: 'Tech User',
          authorEmail: 'tech@example.com',
          message: 'This is a test reply',
          attachments: [],
          createdAt: expect.any(Number),
          isPrivate: false
        }],
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
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      reply: expect.objectContaining({
        id: 'mock-uuid-123',
        authorId: 'tech-user-123',
        authorName: 'Tech User',
        message: 'This is a test reply',
        isPrivate: false
      }),
      ticket: expect.objectContaining({
        id: 'test-ticket-123',
        replies: expect.arrayContaining([
          expect.objectContaining({
            message: 'This is a test reply'
          })
        ])
      }),
      userRole: 'tech'
    });
  });

  it('should prevent regular users from creating private replies', async () => {
    const { addReplyHttp } = require('../addReply');
    
    mockReq.body.isPrivate = true; // Regular user trying to create private reply
    
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
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied - regular users cannot create private replies'
    });
  });

  it('should deny access for user trying to reply to other user ticket', async () => {
    const { addReplyHttp } = require('../addReply');
    
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
        participants: [] // User is not a participant
      })
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn()
          .mockResolvedValueOnce(mockUserDoc)
          .mockResolvedValueOnce(mockTicketDoc)
      }))
    });
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied - you do not have permission to reply to this ticket'
    });
  });

  it('should allow user to reply to ticket they are participant in', async () => {
    const { addReplyHttp } = require('../addReply');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'participant-user-789',
      email: 'participant@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: 'Participant User',
        email: 'participant@example.com',
        role: 'user'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      data: () => ({
        submitterId: 'other-user-456',
        participants: [{
          userId: 'participant-user-789',
          email: 'participant@example.com'
        }],
        replies: []
      })
    };
    
    const mockUpdatedTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        submitterId: 'other-user-456',
        participants: [{
          userId: 'participant-user-789',
          email: 'participant@example.com'
        }],
        replies: [expect.objectContaining({
          message: 'This is a test reply'
        })],
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
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        reply: expect.objectContaining({
          message: 'This is a test reply',
          isPrivate: false
        })
      })
    );
  });

  it('should return 400 for missing message', async () => {
    const { addReplyHttp } = require('../addReply');
    
    mockReq.body.message = ''; // Empty message
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'tech-user-123',
      email: 'tech@example.com'
    });
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Message is required'
    });
  });

  it('should track first response timestamp for SLA', async () => {
    const { addReplyHttp } = require('../addReply');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'tech-user-123',
      email: 'tech@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        displayName: 'Tech User',
        email: 'tech@example.com',
        role: 'tech'
      })
    };
    
    const mockTicketDoc = {
      exists: true,
      data: () => ({
        submitterId: 'user-456', // Different from responder
        replies: []
        // Note: no firstResponseAt timestamp yet
      })
    };
    
    const mockUpdatedTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        submitterId: 'user-456',
        replies: [expect.objectContaining({
          message: 'This is a test reply'
        })],
        firstResponseAt: expect.any(Number), // Should be set
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
    
    await addReplyHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        ticket: expect.objectContaining({
          firstResponseAt: expect.any(Number)
        })
      })
    );
  });
});