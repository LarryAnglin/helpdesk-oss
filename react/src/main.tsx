/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW, setupInstallPrompt } from './lib/pwa/serviceWorkerRegistration'

// Register service worker for PWA functionality
registerSW({
  onSuccess: () => {
    console.log('PWA: Service worker registered successfully');
  },
  onUpdate: (registration) => {
    console.log('PWA: New app version available');
    // You could show a "Update Available" notification here
    if (confirm('A new version of the Help Desk app is available. Update now?')) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  },
  onOffline: () => {
    console.log('PWA: App is running offline');
  },
  onOnline: () => {
    console.log('PWA: App is back online');
  }
});

// Setup PWA install prompt
setupInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
