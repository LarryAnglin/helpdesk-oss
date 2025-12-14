/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// ***********************************************************
// This file is processed and loaded automatically before your test files.
// You can change the location of this file or turn off processing
// it in the cypress.config.ts configuration file.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Cypress error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // we expect some Firebase/React errors during testing
  if (err.message.includes('Firebase') || 
      err.message.includes('ResizeObserver') ||
      err.message.includes('Non-Error promise rejection')) {
    return false;
  }
  // fail test for other errors
  return true;
});

// Add custom viewport sizes
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone 8 size
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad size
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1440, 900); // Desktop size
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      setDesktopViewport(): Chainable<void>;
      login(email?: string, password?: string): Chainable<void>;
      logout(): Chainable<void>;
      createTicket(ticketData: any): Chainable<void>;
      uploadFile(fileName: string, selector?: string): Chainable<void>;
      waitForFirestore(): Chainable<void>;
    }
  }
}