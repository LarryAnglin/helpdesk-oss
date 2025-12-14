/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('../lib/firebase/config', () => ({
  auth: {
    currentUser: { uid: 'test-user-123', email: 'test@example.com' }
  },
  db: {},
  storage: {},
  analytics: null
}));

vi.mock('../lib/firebase/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-123', email: 'test@example.com' }
  },
  db: {},
  storage: {},
  analytics: null
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  User: vi.fn()
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn()
}));

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn()
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock canvas for PWA icon processing
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  fillStyle: '',
  strokeStyle: ''
});

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob([''], { type: 'image/png' }));
});

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,');

// Mock File and FileReader
(global as any).File = class MockFile {
  constructor(public data: any[], public name: string, public options: any = {}) {}
  get size() { return this.data.length; }
  get type() { return this.options.type || ''; }
};

(global as any).FileReader = class MockFileReader {
  result: any = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  readAsDataURL(_file: any) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mock-data';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
  
  readAsText(_file: any) {
    setTimeout(() => {
      this.result = 'mock file content';
      if (this.onload) {
        this.onload({ target: { result: this.result } });
      }
    }, 0);
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Image
(global as any).Image = class MockImage {
  src: string = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width: number = 100;
  height: number = 100;
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};