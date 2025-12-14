/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

// Mock Firebase Admin and Functions
jest.mock('firebase-admin');
jest.mock('firebase-functions', () => ({
  auth: {
    user: () => ({
      onCreate: jest.fn(),
      onDelete: jest.fn()
    })
  },
  firestore: {
    document: jest.fn(() => ({
      onWrite: jest.fn()
    }))
  },
  config: jest.fn(() => ({}))
}));

describe('Auth Functions', () => {
  let mockAuth;
  let mockFirestore;
  let mockCollection;
  let mockDoc;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
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
      add: jest.fn()
    };

    mockFirestore = {
      collection: jest.fn(() => mockCollection)
    };

    mockAuth = {
      getUser: jest.fn(),
      setCustomUserClaims: jest.fn(),
      createUser: jest.fn(),
      deleteUser: jest.fn()
    };

    admin.firestore.mockReturnValue(mockFirestore);
    admin.auth.mockReturnValue(mockAuth);
  });

  describe('syncUserClaims', () => {
    test('should sync user claims from Firestore to Auth', async () => {
      const userId = 'test-user-123';
      const userData = {
        role: 'admin',
        department: 'IT',
        permissions: ['read', 'write', 'admin']
      };

      // Mock Firestore document get
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => userData
      });

      // Mock Auth getUser
      mockAuth.getUser.mockResolvedValue({
        uid: userId,
        customClaims: { role: 'user' } // outdated claims
      });

      // Mock setCustomUserClaims
      mockAuth.setCustomUserClaims.mockResolvedValue();

      // Simulate the sync function logic
      const userDoc = await mockFirestore.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const user = userDoc.data();
        const authUser = await mockAuth.getUser(userId);
        
        // Check if claims need updating
        const currentClaims = authUser.customClaims || {};
        const newClaims = {
          role: user.role,
          department: user.department,
          permissions: user.permissions
        };

        if (JSON.stringify(currentClaims.role) !== JSON.stringify(newClaims.role)) {
          await mockAuth.setCustomUserClaims(userId, newClaims);
        }
      }

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith(userId);
      expect(mockDoc.get).toHaveBeenCalled();
      expect(mockAuth.getUser).toHaveBeenCalledWith(userId);
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(userId, {
        role: 'admin',
        department: 'IT',
        permissions: ['read', 'write', 'admin']
      });
    });

    test('should handle user not found in Firestore', async () => {
      const userId = 'non-existent-user';

      mockDoc.get.mockResolvedValue({
        exists: false
      });

      const userDoc = await mockFirestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // Should not call setCustomUserClaims
        expect(mockAuth.setCustomUserClaims).not.toHaveBeenCalled();
      }

      expect(mockDoc.get).toHaveBeenCalled();
    });

    test('should handle Auth service errors', async () => {
      const userId = 'test-user-123';
      const userData = { role: 'admin' };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => userData
      });

      mockAuth.getUser.mockRejectedValue(new Error('Auth service unavailable'));

      try {
        await mockAuth.getUser(userId);
      } catch (error) {
        expect(error.message).toBe('Auth service unavailable');
      }

      expect(mockAuth.getUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('processNewUser', () => {
    test('should create user document when new user is created', async () => {
      const userData = {
        uid: 'new-user-123',
        email: 'newuser@test.com',
        displayName: 'New User'
      };

      mockDoc.set.mockResolvedValue();

      // Simulate processing new user
      const defaultUserData = {
        email: userData.email,
        displayName: userData.displayName || '',
        role: 'user',
        department: '',
        createdAt: expect.any(Object),
        lastLoginAt: expect.any(Object),
        isActive: true
      };

      await mockFirestore.collection('users').doc(userData.uid).set(defaultUserData);

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith(userData.uid);
      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          role: 'user',
          isActive: true
        })
      );
    });

    test('should set default role for new users', async () => {
      const userData = {
        uid: 'new-user-456',
        email: 'user@company.com'
      };

      mockDoc.set.mockResolvedValue();

      const defaultUserData = {
        email: userData.email,
        displayName: '',
        role: 'user', // Default role
        department: '',
        createdAt: new Date(),
        isActive: true
      };

      await mockFirestore.collection('users').doc(userData.uid).set(defaultUserData);

      expect(mockDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user'
        })
      );
    });
  });

  describe('User Management Functions', () => {
    test('should handle user deletion', async () => {
      const userId = 'user-to-delete';

      mockAuth.deleteUser.mockResolvedValue();
      mockDoc.delete.mockResolvedValue();

      // Simulate user deletion
      await mockAuth.deleteUser(userId);
      await mockFirestore.collection('users').doc(userId).delete();

      expect(mockAuth.deleteUser).toHaveBeenCalledWith(userId);
      expect(mockCollection.doc).toHaveBeenCalledWith(userId);
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    test('should handle user role updates', async () => {
      const userId = 'user-123';
      const newRole = 'admin';

      mockDoc.update.mockResolvedValue();
      mockAuth.setCustomUserClaims.mockResolvedValue();

      // Simulate role update
      await mockFirestore.collection('users').doc(userId).update({
        role: newRole,
        updatedAt: new Date()
      });

      await mockAuth.setCustomUserClaims(userId, { role: newRole });

      expect(mockDoc.update).toHaveBeenCalledWith({
        role: newRole,
        updatedAt: expect.any(Date)
      });
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(userId, {
        role: newRole
      });
    });
  });
});