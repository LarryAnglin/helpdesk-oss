/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

describe.skip('File Attachment Functionality', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
    // Skip authentication for now - these tests need proper auth setup
    cy.visit('/');
  });

  describe('File Selection', () => {
    it.skip('should allow selecting files using the FileSelector component', () => {
      cy.visit('/tickets/new');
      
      // Verify FileSelector is present
      cy.contains('File Attachments').should('be.visible');
      cy.contains('Attach Files').should('be.visible');
      cy.contains('You can attach images, PDFs, documents').should('be.visible');
      
      // Upload a test file
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'test-document.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Verify file appears in the list
      cy.contains('test-document.pdf').should('be.visible');
      cy.contains('1 file(s) selected').should('be.visible');
      
      // Verify file size is displayed
      cy.contains(/\d+\s*(B|KB|MB)/).should('be.visible');
      
      // Verify remove button is present
      cy.get('[data-testid="close-icon"]').should('be.visible');
    });

    it('should display correct file icons based on file type', () => {
      cy.visit('/tickets/new');
      
      // Upload PDF file
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'document.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Verify PDF icon is shown
      cy.get('[data-testid="pdf-icon"]').should('be.visible');
      
      // Upload image file (simulated)
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'),
        fileName: 'image.png',
        mimeType: 'image/png'
      }, { force: true });
      
      // Verify image icon is shown
      cy.get('[data-testid="image-icon"]').should('be.visible');
    });

    it('should allow removing files from the selection', () => {
      cy.visit('/tickets/new');
      
      // Upload a file
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'removable.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Verify file is listed
      cy.contains('removable.pdf').should('be.visible');
      cy.contains('1 file(s) selected').should('be.visible');
      
      // Remove the file
      cy.get('[data-testid="close-icon"]').first().click();
      
      // Verify file is removed
      cy.contains('removable.pdf').should('not.exist');
      cy.contains('You can attach images, PDFs, documents').should('be.visible');
    });

    it('should show "Add More" button when files are selected', () => {
      cy.visit('/tickets/new');
      
      // Initially shows "Attach Files"
      cy.contains('Attach Files').should('be.visible');
      
      // Upload a file
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'first.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Should now show "Add More"
      cy.contains('Add More').should('be.visible');
      cy.contains('Attach Files').should('not.exist');
    });

    it('should handle multiple file selection', () => {
      cy.visit('/tickets/new');
      
      // Upload multiple files
      const files = [
        {
          contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'),
          fileName: 'image1.png',
          mimeType: 'image/png'
        },
        {
          contents: Cypress.Buffer.from('JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iag==', 'base64'),
          fileName: 'document1.pdf',
          mimeType: 'application/pdf'
        }
      ];
      
      cy.get('input[type="file"]').selectFile(files, { force: true });
      
      // Verify both files are listed
      cy.contains('image1.png').should('be.visible');
      cy.contains('document1.pdf').should('be.visible');
      cy.contains('2 file(s) selected').should('be.visible');
    });

    it('should enforce file limit', () => {
      cy.visit('/tickets/new');
      
      // Try to upload 6 files (exceeding the 5 file limit)
      const files = Array.from({ length: 6 }, (_, i) => ({
        contents: Cypress.Buffer.from('test content'),
        fileName: `file${i + 1}.txt`,
        mimeType: 'text/plain'
      }));
      
      cy.get('input[type="file"]').selectFile(files, { force: true });
      
      // Should show warning about max files
      cy.contains(/Maximum number of files.*reached/i).should('be.visible');
      
      // Should disable the attach button
      cy.get('button').contains(/Add More|Attach Files/i).should('be.disabled');
    });
  });

  describe('File Upload Integration', () => {
    it('should create ticket with file attachments', () => {
      cy.fixture('ticket').then((ticketData) => {
        const ticket = ticketData.minimal;
        
        cy.visit('/tickets/new');
        
        // Fill required fields
        cy.get('input[name="title"]').type(ticket.title);
        cy.get('textarea[name="description"]').type(ticket.description);
        cy.get('input[name="computer"]').type(ticket.computer);
        cy.get('input[name="name"]').clear().type(ticket.name);
        cy.get('input[name="email"]').clear().type(ticket.email);
        
        // Upload a file
        cy.fixture('test-file.pdf', 'base64').then(fileContent => {
          cy.get('input[type="file"]').selectFile({
            contents: Cypress.Buffer.from(fileContent, 'base64'),
            fileName: 'support-document.pdf',
            mimeType: 'application/pdf'
          }, { force: true });
        });
        
        // Verify file is attached
        cy.contains('support-document.pdf').should('be.visible');
        
        // Submit the ticket
        cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
        
        // Verify ticket was created successfully
        cy.url().should('include', '/tickets');
        cy.contains(ticket.title).should('be.visible');
      });
    });

    it('should preserve file selections during form validation errors', () => {
      cy.visit('/tickets/new');
      
      // Upload a file first
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'preserved.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Fill only title (missing other required fields)
      cy.get('input[name="title"]').type('Incomplete Ticket');
      
      // Try to submit (should fail validation)
      cy.get('button[type="submit"]').contains(/Create Ticket/i).click();
      
      // File should still be attached after validation error
      cy.contains('preserved.pdf').should('be.visible');
      cy.contains('1 file(s) selected').should('be.visible');
    });
  });

  describe('FileSelector Edge Cases', () => {
    it('should handle disabled state', () => {
      cy.visit('/tickets/new');
      
      // Fill form and start submission to trigger loading state
      cy.get('input[name="title"]').type('Test');
      cy.get('textarea[name="description"]').type('Test desc');
      cy.get('input[name="computer"]').type('TEST-PC');
      cy.get('input[name="name"]').clear().type('Test User');
      cy.get('input[name="email"]').clear().type('test@example.com');
      
      // The FileSelector should still be functional before submission
      cy.get('button').contains(/Attach Files/i).should('not.be.disabled');
    });

    it('should show file count and limits', () => {
      cy.visit('/tickets/new');
      
      // Upload 2 files
      const files = [
        {
          contents: Cypress.Buffer.from('content1'),
          fileName: 'file1.txt',
          mimeType: 'text/plain'
        },
        {
          contents: Cypress.Buffer.from('content2'),
          fileName: 'file2.txt',
          mimeType: 'text/plain'
        }
      ];
      
      cy.get('input[type="file"]').selectFile(files, { force: true });
      
      // Verify count and limits are shown
      cy.contains('2 file(s) selected').should('be.visible');
      cy.contains('2/5 max').should('be.visible');
      cy.contains('per file').should('be.visible');
    });

    it('should work on mobile viewport', () => {
      cy.setMobileViewport();
      
      cy.visit('/tickets/new');
      
      // File selector should still be functional on mobile
      cy.contains('File Attachments').should('be.visible');
      cy.contains('Attach Files').should('be.visible');
      
      // Upload a file on mobile
      cy.fixture('test-file.pdf', 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName: 'mobile-test.pdf',
          mimeType: 'application/pdf'
        }, { force: true });
      });
      
      // Verify file appears correctly on mobile
      cy.contains('mobile-test.pdf').should('be.visible');
      cy.get('[data-testid="close-icon"]').should('be.visible');
    });
  });

  describe('File Type Validation', () => {
    it('should accept common file types', () => {
      cy.visit('/tickets/new');
      
      // Test various accepted file types
      const acceptedFiles = [
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'image.png', type: 'image/png' },
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'text.txt', type: 'text/plain' },
        { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      ];
      
      acceptedFiles.forEach((file, index) => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from('test content'),
          fileName: file.name,
          mimeType: file.type
        }, { force: true });
        
        cy.contains(file.name).should('be.visible');
      });
      
      // Should show all 5 files
      cy.contains('5 file(s) selected').should('be.visible');
    });

    it('should show the input accept attribute correctly', () => {
      cy.visit('/tickets/new');
      
      // Verify the file input has correct accept attribute
      cy.get('input[type="file"]').should('have.attr', 'accept')
        .and('include', 'image/jpeg')
        .and('include', 'image/png')
        .and('include', 'application/pdf')
        .and('include', 'text/plain');
    });
  });
});