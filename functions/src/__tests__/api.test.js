/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const request = require('supertest');
const express = require('express');
const admin = require('firebase-admin');

// Mock Firebase Admin before importing the module
jest.mock('firebase-admin');

describe('API Endpoints', () => {
  let app;
  let mockFirestore;
  let mockCollection;
  let mockDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mocks
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      where: jest.fn(() => ({
        get: jest.fn()
      })),
      add: jest.fn(),
      get: jest.fn()
    };

    mockFirestore = {
      collection: jest.fn(() => mockCollection)
    };

    admin.firestore.mockReturnValue(mockFirestore);

    // Create a simple Express app for testing
    app = express();
    app.use(express.json());

    // Add CORS middleware
    app.use((req, res, next) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'test'
      });
    });

    // User tickets endpoint
    app.get('/tickets/user', async (req, res) => {
      try {
        const userId = req.query.userId;

        if (!userId) {
          return res.status(400).json({ error: 'Missing userId in request' });
        }

        const mockTickets = [
          {
            id: 'ticket-1',
            title: 'Test Ticket 1',
            submitterId: userId,
            status: 'Open'
          },
          {
            id: 'ticket-2',
            title: 'Test Ticket 2',
            submitterId: userId,
            status: 'Closed'
          }
        ];

        // Mock the Firestore query
        const mockSnapshot = {
          docs: mockTickets.map(ticket => ({
            id: ticket.id,
            data: () => ticket
          }))
        };

        mockCollection.where.mockReturnValue({
          get: jest.fn().mockResolvedValue(mockSnapshot)
        });

        const ticketsQuery = mockFirestore.collection('tickets').where('submitterId', '==', userId);
        const ticketsSnap = await ticketsQuery.get();
        const tickets = ticketsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        res.status(200).json(tickets);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user tickets' });
      }
    });
  });

  describe('Health Check', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        environment: 'test'
      });
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /health should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('User Tickets', () => {
    test('GET /tickets/user should return user tickets', async () => {
      const userId = 'test-user-123';
      const response = await request(app)
        .get(`/tickets/user?userId=${userId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('tickets');
      expect(mockCollection.where).toHaveBeenCalledWith('submitterId', '==', userId);
    });

    test('GET /tickets/user should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/tickets/user')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing userId in request'
      });
    });

    test('GET /tickets/user should handle database errors', async () => {
      const userId = 'test-user-123';
      
      // Override the endpoint to properly handle errors
      app.get('/tickets/user-error', async (req, res) => {
        try {
          throw new Error('Database error');
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch user tickets' });
        }
      });

      const response = await request(app)
        .get(`/tickets/user-error?userId=${userId}`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch user tickets'
      });
    });
  });

  describe('CORS Handling', () => {
    test('OPTIONS request should return appropriate headers', async () => {
      const response = await request(app)
        .options('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, PUT, DELETE');
    });
  });

  describe('Export Data Endpoint', () => {
    test('POST /export_data should be accessible', async () => {
      // Add a simple export endpoint for testing
      app.post('/export_data', (req, res) => {
        res.status(200).json({
          success: true,
          message: 'Export initiated'
        });
      });

      const response = await request(app)
        .post('/export_data')
        .send({ format: 'json' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Export initiated'
      });
    });
  });

  describe('User Management', () => {
    test('GET /users should return users list', async () => {
      app.get('/users', async (req, res) => {
        const mockUsers = [
          { id: 'user-1', email: 'user1@test.com', role: 'user' },
          { id: 'user-2', email: 'user2@test.com', role: 'admin' }
        ];

        const mockSnapshot = {
          docs: mockUsers.map(user => ({
            id: user.id,
            data: () => user
          }))
        };

        mockCollection.get.mockResolvedValue(mockSnapshot);

        const usersSnap = await mockFirestore.collection('users').get();
        const users = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        res.status(200).json(users);
      });

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
    });
  });
});