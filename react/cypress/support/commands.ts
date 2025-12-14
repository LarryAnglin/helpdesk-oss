/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// ***********************************************
// Custom commands for Cypress tests
// ***********************************************

// Login command - simplified for basic testing
Cypress.Commands.add('login', (email?: string, password?: string) => {
  // Just visit the signin page for now - tests can be updated later for proper auth
  cy.visit('/signin');
  
  // Verify we reach the signin page
  cy.contains('Sign in with Google').should('be.visible');
  
  // For now, just note that auth testing needs proper setup
  cy.log('Authentication testing requires Firebase emulator setup - skipping for now');
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu-button"]').click();
  cy.contains('Sign out').click();
  cy.url().should('include', '/signin');
});

// Create ticket command
Cypress.Commands.add('createTicket', (ticketData) => {
  cy.visit('/tickets/new');
  
  // Fill in required fields
  cy.get('input[name="title"]').type(ticketData.title || 'Test Ticket');
  cy.get('textarea[name="description"]').type(ticketData.description || 'Test description');
  
  if (ticketData.priority) {
    cy.get('[data-testid="priority-select"]').click();
    cy.contains(ticketData.priority).click();
  }
  
  if (ticketData.location) {
    cy.get('[data-testid="location-select"]').click();
    cy.contains(ticketData.location).click();
  }
  
  cy.get('input[name="computer"]').type(ticketData.computer || 'Test Computer');
  cy.get('input[name="name"]').type(ticketData.name || 'Test User');
  cy.get('input[name="email"]').type(ticketData.email || 'test@example.com');
  
  // Submit form
  cy.get('button[type="submit"]').contains(/Create Ticket|Submit/i).click();
  
  // Wait for redirect to tickets page
  cy.url().should('include', '/tickets');
  cy.contains('Ticket created successfully', { timeout: 10000 });
});

// File upload command
Cypress.Commands.add('uploadFile', (fileName: string, selector = 'input[type="file"]') => {
  cy.fixture(fileName).then(fileContent => {
    cy.get(selector).selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: fileName,
      mimeType: 'application/pdf'
    }, { force: true });
  });
});

// Wait for Firestore operations
Cypress.Commands.add('waitForFirestore', () => {
  // Wait for any pending Firestore operations
  cy.wait(1000); // Simple wait, can be improved with better Firebase integration
});

// Re-export to make TypeScript happy
export {};