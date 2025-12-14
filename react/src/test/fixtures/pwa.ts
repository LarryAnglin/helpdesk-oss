/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { PWASettings } from '../../lib/types/config';

export const mockPWASettings: PWASettings = {
  appName: 'Test Help Desk',
  shortName: 'TestDesk',
  description: 'Test help desk application',
  themeColor: '#1976d2',
  backgroundColor: '#ffffff',
  iconUrl: 'https://example.com/icon.png',
  generatedIcons: {
    '72x72': 'https://example.com/icon-72.png',
    '96x96': 'https://example.com/icon-96.png',
    '128x128': 'https://example.com/icon-128.png',
    '144x144': 'https://example.com/icon-144.png',
    '152x152': 'https://example.com/icon-152.png',
    '192x192': 'https://example.com/icon-192.png',
    '384x384': 'https://example.com/icon-384.png',
    '512x512': 'https://example.com/icon-512.png'
  }
};

export const mockEmptyPWASettings: PWASettings = {
  appName: '',
  shortName: '',
  description: '',
  themeColor: '#1976d2',
  backgroundColor: '#ffffff'
};

export const mockIconProcessingResult = {
  originalUrl: 'https://example.com/original.png',
  processedIcons: [
    { size: 72, url: 'https://example.com/icon-72.png', format: 'png' },
    { size: 96, url: 'https://example.com/icon-96.png', format: 'png' },
    { size: 128, url: 'https://example.com/icon-128.png', format: 'png' },
    { size: 144, url: 'https://example.com/icon-144.png', format: 'png' },
    { size: 152, url: 'https://example.com/icon-152.png', format: 'png' },
    { size: 192, url: 'https://example.com/icon-192.png', format: 'png' },
    { size: 384, url: 'https://example.com/icon-384.png', format: 'png' },
    { size: 512, url: 'https://example.com/icon-512.png', format: 'png' }
  ]
};