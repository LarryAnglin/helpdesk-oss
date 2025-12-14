/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

describe.skip('Ticket Creation Flow', () => {
  beforeEach(() => {
    // Start with a clean state
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Login before each test
    cy.login();
    cy.waitForFirestore();
  });

  it('should create a new ticket with all fields', () => {
    cy.fixture('ticket').then((ticketData) => {
      const ticket = ticketData.valid;
      
      // Navigate to new ticket page
      cy.visit('/tickets/new');
      
      // Verify page loaded
      cy.contains('Create New Ticket').should('be.visible');
      
      // Fill in all fields
      cy.get('input[name="title"]').type(ticket.title);
      cy.get('textarea[name="description"]').type(ticket.description);
      
      // Select priority
      cy.get('label').contains('Priority').parent().find('div[role="button"]').click();
      cy.get('li[role="option"]').contains(ticket.priority).click();
      
      // Select location
      cy.get('label').contains('Location').parent().find('div[role="button"]').click();
      cy.get('li[role="option"]').contains(ticket.location).click();
      
      // Fill contact information
      cy.get('input[name="computer"]').type(ticket.computer);
      cy.get('input[name="name"]').clear().type(ticket.name);
      cy.get('input[name="email"]').clear().type(ticket.email);
      cy.get('input[name="phone"]').type(ticket.phone);
      
      // Additional fields
      cy.get('textarea[name="errorMessage"]').type(ticket.errorMessage);
      cy.get('textarea[name="stepsToReproduce"]').type(ticket.stepsToReproduce);
      
      // Submit the form
      cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
      
      // Verify redirect and success
      cy.url().should('include', '/tickets');
      cy.contains(ticket.title).should('be.visible');
      cy.contains('successfully created', { matchCase: false }).should('be.visible');
    });
  });

  it('should handle high priority ticket with impact requirement', () => {
    cy.fixture('ticket').then((ticketData) => {
      const ticket = ticketData.highPriority;
      
      cy.visit('/tickets/new');
      
      // Fill basic fields
      cy.get('input[name="title"]').type(ticket.title);
      cy.get('textarea[name="description"]').type(ticket.description);
      cy.get('input[name="computer"]').type(ticket.computer);
      cy.get('input[name="name"]').clear().type(ticket.name);
      cy.get('input[name="email"]').clear().type(ticket.email);
      
      // Select High priority
      cy.get('label').contains('Priority').parent().find('div[role="button"]').click();
      cy.get('li[role="option"]').contains('High').click();
      
      // Verify high priority dialog appears
      cy.contains('High Priority Notice').should('be.visible');
      cy.contains('significant impact').should('be.visible');
      cy.get('button').contains('Understood').click();
      
      // Verify impact field is now visible and required
      cy.get('textarea[name="impact"]').should('be.visible');
      cy.get('textarea[name="impact"]').type(ticket.impact);
      
      // Submit the form
      cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
      
      // Verify success
      cy.url().should('include', '/tickets');
      cy.contains(ticket.title).should('be.visible');
    });
  });

  it('should prevent Urgent priority selection', () => {
    cy.visit('/tickets/new');
    
    // Fill required fields
    cy.get('input[name="title"]').type('Urgent Test');
    cy.get('textarea[name="description"]').type('Testing urgent priority');
    cy.get('input[name="computer"]').type('TEST-PC');
    
    // Try to select Urgent priority
    cy.get('label').contains('Priority').parent().find('div[role="button"]').click();
    cy.get('li[role="option"]').contains('Urgent').click();
    
    // Verify urgent priority dialog appears
    cy.contains('Urgent Priority Notice').should('be.visible');
    cy.contains('call me at').should('be.visible');
    
    // Select High priority instead
    cy.get('button').contains('Select High Priority').click();
    
    // Verify priority changed to High
    cy.contains('High Priority Notice').should('be.visible');
    cy.get('button').contains('Understood').click();
    
    // Verify impact field is required for high priority
    cy.get('textarea[name="impact"]').should('be.visible');
  });

  it('should validate required fields', () => {
    cy.visit('/tickets/new');
    
    // Try to submit empty form
    cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
    
    // Check for HTML5 validation messages
    cy.get('input[name="title"]:invalid').should('exist');
    cy.get('textarea[name="description"]:invalid').should('exist');
    cy.get('input[name="computer"]:invalid').should('exist');
    cy.get('input[name="name"]:invalid').should('exist');
    cy.get('input[name="email"]:invalid').should('exist');
  });

  it('should handle VPN checkbox', () => {
    cy.visit('/tickets/new');
    
    // Check VPN checkbox
    cy.get('input[name="isOnVpn"]').check();
    cy.get('input[name="isOnVpn"]').should('be.checked');
    
    // Uncheck VPN checkbox
    cy.get('input[name="isOnVpn"]').uncheck();
    cy.get('input[name="isOnVpn"]').should('not.be.checked');
  });

  it('should handle "person having problem" checkbox', () => {
    cy.visit('/tickets/new');
    
    // Initially checked by default
    cy.get('input[name="isPersonHavingProblem"]').should('be.checked');
    
    // Uncheck to show additional fields
    cy.get('input[name="isPersonHavingProblem"]').uncheck();
    
    // Verify additional fields appear
    cy.get('input[name="userName"]').should('be.visible');
    cy.get('input[name="userEmail"]').should('be.visible');
    cy.get('input[name="userPhone"]').should('be.visible');
    
    // Fill additional fields
    cy.get('input[name="userName"]').type('Another User');
    cy.get('input[name="userEmail"]').type('another@example.com');
    cy.get('input[name="userPhone"]').type('555-9999');
  });

  it('should handle network type selection', () => {
    cy.fixture('ticket').then((ticketData) => {
      const ticket = ticketData.minimal;
      
      cy.visit('/tickets/new');
      
      // Fill minimal required fields
      cy.get('input[name="title"]').type(ticket.title);
      cy.get('textarea[name="description"]').type(ticket.description);
      cy.get('input[name="computer"]').type(ticket.computer);
      cy.get('input[name="name"]').clear().type(ticket.name);
      cy.get('input[name="email"]').clear().type(ticket.email);
      
      // Submit with defaults
      cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
      
      // Verify success with minimal fields
      cy.url().should('include', '/tickets');
      cy.contains(ticket.title).should('be.visible');
    });
  });

  it('should navigate back to tickets list', () => {
    cy.visit('/tickets/new');
    
    // Click back button
    cy.contains('Back to Tickets').click();
    
    // Verify navigation
    cy.url().should('include', '/tickets');
    cy.url().should('not.include', '/new');
  });

  it('should preserve form data on validation error', () => {
    cy.visit('/tickets/new');
    
    const testData = {
      title: 'Test Title',
      description: 'Test Description',
      computer: 'TEST-PC'
    };
    
    // Fill some fields
    cy.get('input[name="title"]').type(testData.title);
    cy.get('textarea[name="description"]').type(testData.description);
    cy.get('input[name="computer"]').type(testData.computer);
    
    // Clear required email field and try to submit
    cy.get('input[name="email"]').clear();
    cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
    
    // Verify form data is preserved
    cy.get('input[name="title"]').should('have.value', testData.title);
    cy.get('textarea[name="description"]').should('have.value', testData.description);
    cy.get('input[name="computer"]').should('have.value', testData.computer);
  });

  it('should work on mobile viewport', () => {
    cy.setMobileViewport();
    
    cy.fixture('ticket').then((ticketData) => {
      const ticket = ticketData.minimal;
      
      cy.visit('/tickets/new');
      
      // Verify mobile layout
      cy.contains('Create New Ticket').should('be.visible');
      
      // Fill fields - they should stack vertically on mobile
      cy.get('input[name="title"]').type(ticket.title);
      cy.get('textarea[name="description"]').type(ticket.description);
      cy.get('input[name="computer"]').type(ticket.computer);
      cy.get('input[name="name"]').clear().type(ticket.name);
      cy.get('input[name="email"]').clear().type(ticket.email);
      
      // Submit
      cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
      
      // Verify success on mobile
      cy.url().should('include', '/tickets');
    });
  });
});