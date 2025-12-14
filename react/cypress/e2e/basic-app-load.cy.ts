/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

describe('Basic App Loading', () => {
  it('should load the app and redirect to signin', () => {
    cy.visit('/');
    
    // Should redirect to signin since no auth
    cy.url().should('include', '/signin');
    
    // Should show the signin page
    cy.contains('Sign In').should('be.visible');
    cy.contains('Sign in with Google').should('be.visible');
    cy.contains('Welcome to the RCL Help Desk').should('be.visible');
  });

  it('should load the signin page directly', () => {
    cy.visit('/signin');
    
    // Should show all signin page elements
    cy.contains('Sign In').should('be.visible');
    cy.contains('Sign in with Google').should('be.visible');
    cy.contains('Only your-domain.com and your-domain.com email addresses are allowed').should('be.visible');
  });

  it('should have proper page title and meta', () => {
    cy.visit('/signin');
    
    // Check page title
    cy.title().should('include', 'Help Desk');
  });
});