/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// Test setup for Firebase Functions

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      where: jest.fn(() => ({
        get: jest.fn()
      })),
      add: jest.fn(),
      get: jest.fn()
    }))
  })),
  auth: jest.fn(() => ({
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    setCustomUserClaims: jest.fn()
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn(),
        download: jest.fn(),
        delete: jest.fn(),
        getSignedUrl: jest.fn()
      }))
    }))
  }))
}));

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  https: {
    onRequest: jest.fn((handler) => handler)
  },
  firestore: {
    document: jest.fn(() => ({
      onUpdate: jest.fn(),
      onCreate: jest.fn(),
      onDelete: jest.fn()
    }))
  },
  pubsub: {
    schedule: jest.fn(() => ({
      timeZone: jest.fn(() => ({
        onRun: jest.fn()
      }))
    }))
  },
  config: jest.fn(() => ({}))
}));

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};