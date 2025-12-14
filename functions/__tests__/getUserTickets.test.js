const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');
const admin = require('firebase-admin');

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  apps: { length: 0 },
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn()
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

describe('getUserTicketsHttp Firebase Function', () => {
  let mockDb, mockAuth, mockReq, mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDb = {
      collection: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(),
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
    
    mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token'
      },
      body: {}
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('should return user tickets for regular user', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'regular-user-123',
      email: 'user@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        uid: 'regular-user-123',
        email: 'user@example.com',
        role: 'user'
      })
    };
    
    const mockTickets = [
      {
        id: 'ticket-1',
        title: 'User Ticket 1',
        submitterId: 'regular-user-123',
        status: 'Open'
      },
      {
        id: 'ticket-2', 
        title: 'User Ticket 2',
        submitterId: 'regular-user-123',
        status: 'Resolved'
      }
    ];
    
    const mockQuerySnapshot = {
      forEach: vi.fn((callback) => {
        mockTickets.forEach((ticket, index) => {
          callback({
            id: ticket.id,
            data: () => ({ ...ticket })
          });
        });
      })
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(), 
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockQuerySnapshot)
    });
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      tickets: expect.arrayContaining([
        expect.objectContaining({
          id: 'ticket-1',
          title: 'User Ticket 1'
        }),
        expect.objectContaining({
          id: 'ticket-2', 
          title: 'User Ticket 2'
        })
      ]),
      count: 2,
      userRole: 'user'
    });
  });

  it('should return all tickets for admin user', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
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
    
    const mockTickets = [
      {
        id: 'ticket-1',
        title: 'Any User Ticket 1',
        submitterId: 'user-456',
        status: 'Open'
      },
      {
        id: 'ticket-2',
        title: 'Any User Ticket 2', 
        submitterId: 'user-789',
        status: 'Resolved'
      }
    ];
    
    const mockQuerySnapshot = {
      forEach: vi.fn((callback) => {
        mockTickets.forEach((ticket) => {
          callback({
            id: ticket.id,
            data: () => ({ ...ticket })
          });
        });
      })
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockQuerySnapshot)
    });
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      tickets: expect.arrayContaining([
        expect.objectContaining({
          id: 'ticket-1',
          title: 'Any User Ticket 1'
        }),
        expect.objectContaining({
          id: 'ticket-2',
          title: 'Any User Ticket 2'
        })
      ]),
      count: 2,
      userRole: 'admin'
    });
  });

  it('should filter tickets by status when provided', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
    mockReq.body = { status: 'Open' };
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'tech-user-123',
      email: 'tech@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        role: 'tech'
      })
    };
    
    const mockOpenTickets = [
      {
        id: 'ticket-1',
        title: 'Open Ticket',
        status: 'Open'
      }
    ];
    
    const mockQuerySnapshot = {
      forEach: vi.fn((callback) => {
        mockOpenTickets.forEach((ticket) => {
          callback({
            id: ticket.id,
            data: () => ({ ...ticket })
          });
        });
      })
    };
    
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockQuerySnapshot)
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce(mockQuery);
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    // Should have called where clause for status filter
    expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'Open');
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      tickets: expect.arrayContaining([
        expect.objectContaining({
          status: 'Open'
        })
      ]),
      count: 1,
      userRole: 'tech'
    });
  });

  it('should filter by assigneeId for tech/admin users', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
    mockReq.body = { assigneeId: 'tech-user-123' };
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'admin-user-456',
      email: 'admin@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        role: 'admin'
      })
    };
    
    const mockAssignedTickets = [
      {
        id: 'ticket-1',
        title: 'Assigned Ticket',
        assigneeId: 'tech-user-123'
      }
    ];
    
    const mockQuerySnapshot = {
      forEach: vi.fn((callback) => {
        mockAssignedTickets.forEach((ticket) => {
          callback({
            id: ticket.id,
            data: () => ({ ...ticket })
          });
        });
      })
    };
    
    const mockQuery = {
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockQuerySnapshot)
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce(mockQuery);
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    // Should have called where clause for assigneeId filter
    expect(mockQuery.where).toHaveBeenCalledWith('assigneeId', '==', 'tech-user-123');
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      tickets: expect.arrayContaining([
        expect.objectContaining({
          assigneeId: 'tech-user-123'
        })
      ]),
      count: 1,
      userRole: 'admin'
    });
  });

  it('should return 404 for non-existent user profile', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'non-existent-user',
      email: 'nonexistent@example.com'
    });
    
    const mockUserDoc = {
      exists: false
    };
    
    mockDb.collection.mockReturnValue({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    });
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(404);  
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'User profile not found.'
    });
  });

  it('should enforce security for regular users accessing only their own tickets', async () => {
    const { getUserTicketsHttp } = require('../getUserTickets');
    
    mockAuth.verifyIdToken.mockResolvedValue({
      uid: 'regular-user-123',
      email: 'user@example.com'
    });
    
    const mockUserDoc = {
      exists: true,
      data: () => ({
        role: 'user'
      })
    };
    
    const mockTickets = [
      {
        id: 'ticket-1',
        title: 'User Own Ticket',
        submitterId: 'regular-user-123' // User's own ticket
      },
      {
        id: 'ticket-2',
        title: 'Other User Ticket', 
        submitterId: 'other-user-456', // Other user's ticket - should be filtered out
        participants: []
      }
    ];
    
    const mockQuerySnapshot = {
      forEach: vi.fn((callback) => {
        mockTickets.forEach((ticket) => {
          callback({
            id: ticket.id,
            data: () => ({ ...ticket })
          });
        });
      })
    };
    
    mockDb.collection.mockReturnValueOnce({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue(mockUserDoc)
      }))
    }).mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockQuerySnapshot)
    });
    
    await getUserTicketsHttp(mockReq, mockRes);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      tickets: [
        expect.objectContaining({
          id: 'ticket-1',
          title: 'User Own Ticket'
        })
        // ticket-2 should be filtered out due to security check
      ],
      count: 1,
      userRole: 'user'
    });
  });
});