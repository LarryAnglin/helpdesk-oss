const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');
const admin = require('firebase-admin');

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  apps: { length: 0 },
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn()
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

describe('getTicketHttp Firebase Function', () => {
  let mockDb, mockAuth, mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    };
    
    mockAuth = {
      verifyIdToken: vi.fn()
    };
    
    admin.firestore.mockReturnValue(mockDb);
    admin.auth.mockReturnValue(mockAuth);
    
    // Mock request and response
    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token'
      },
      body: {
        ticketId: 'test-ticket-123'
      }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('should retrieve a ticket successfully for admin user', async () => {
    // Import the function after mocks are set up
    const { getTicketHttp } = require('../getTicket');
    
    // Mock auth verification
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'test-user-123',
      email: 'admin@example.com'
    });
    
    // Mock user document
    const mockUserDoc = {
      exists: true,
      data: () => ({
        uid: 'test-user-123',
        email: 'admin@example.com',
        role: 'admin'
      })
    };
    
    // Mock ticket document
    const mockTicketDoc = {
      exists: true,
      id: 'test-ticket-123',
      data: () => ({
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'Open',
        submitterId: 'other-user-456'
      })
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockTicketDoc)
      }))
    });
    
    await getTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      ticket: {
        id: 'test-ticket-123',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'Open',
        submitterId: 'other-user-456'
      },
      userRole: 'admin'
    });
  });

  it('should deny access for regular user accessing other user ticket', async () => {
    const { getTicketHttp } = require('../getTicket');
    
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
      id: 'test-ticket-123',
      data: () => ({
        title: 'Test Ticket',
        submitterId: 'other-user-456',
        participants: []
      })
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockTicketDoc)
      }))
    });
    
    await getTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Access denied - you do not have permission to view this ticket'
    });
  });

  it('should return 404 for non-existent ticket', async () => {
    const { getTicketHttp } = require('../getTicket');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'test-user-123',
      email: 'admin@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({ role: 'admin' })
    };
    
    const mockTicketDoc = {
      exists: false
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockTicketDoc)
      }))
    });
    
    await getTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Ticket not found'
    });
  });

  it('should return 401 for invalid auth token', async () => {
    const { getTicketHttp } = require('../getTicket');
    
    mockAuth.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
    
    await getTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Authentication failed',
      message: 'Invalid token'
    });
  });

  it('should return 405 for non-POST requests', async () => {
    const { getTicketHttp } = require('../getTicket');
    
    mockReq.method = 'GET';
    
    await getTicketHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(405);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Method not allowed'
    });
  });
});