/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');
const { createErrorResponse, getHttpStatusCode } = require('./errorHandler');

const exportPDF = async (req, res) => {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    let userId;
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      const errorResponse = createErrorResponse(error, { 
        operation: 'authentication',
        userId: 'unknown',
        userAgent: req.headers['user-agent']
      });
      return res.status(getHttpStatusCode({ type: 'USER_ERROR', code: 'UNAUTHORIZED' })).json(errorResponse);
    }

    const { tickets, options, config } = req.body;
    
    if (!tickets || !Array.isArray(tickets)) {
      const errorResponse = createErrorResponse(new Error('Invalid tickets data provided'), { 
        operation: 'input_validation',
        userId,
        userAgent: req.headers['user-agent']
      });
      return res.status(400).json(errorResponse);
    }

    // Default options
    const exportOptions = {
      includeDetails: options?.includeDetails ?? true,
      includeReplies: options?.includeReplies ?? true,
      pageBreakBetweenTickets: options?.pageBreakBetweenTickets ?? false
    };

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 80, // Increased top margin for header
        bottom: 80, // Increased bottom margin for footer
        left: 50,
        right: 50
      },
      bufferPages: true // Enable buffering to add page numbers later
    });

    // Helper function to add header and footer to each page
    const addHeadersAndFooters = () => {
      const pageCount = doc.bufferedPageRange().count;
      
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Add header
        if (config?.pdfHeaderText) {
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#666666')
             .text(config.pdfHeaderText, 50, 30, { width: 200, align: 'left' });
        }
        
        // Add date to right side of header
        const exportDate = new Date().toLocaleDateString();
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666666')
           .text(exportDate, 350, 30, { width: 200, align: 'right' });
        
        // Add page numbers
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
             width: doc.page.width - 100,
             align: 'center'
           });
        
        // Add custom footer from settings if provided
        if (config?.footerMarkdown) {
          // Simple markdown to text conversion for PDF (strip markdown syntax)
          const footerText = config.footerMarkdown
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
            .replace(/^#+\s+/gm, '') // Remove headers
            .trim();
          
          if (footerText) {
            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#666666')
               .text(footerText, 50, doc.page.height - 35, {
                 width: doc.page.width - 100,
                 align: 'center'
               });
          }
        }
      }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe the PDF directly to the response with error handling
    doc.pipe(res);
    
    // Handle PDF generation errors
    doc.on('error', (err) => {
      console.error('PDF document error:', err);
      if (!res.headersSent) {
        const errorResponse = createErrorResponse(err, { 
          operation: 'pdf_export',
          userId,
          userAgent: req.headers['user-agent'],
          ticketCount: tickets.length
        });
        res.status(500).json(errorResponse);
      }
    });

    // Add header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Help Desk Tickets Export', { align: 'center' });
    
    doc.moveDown();
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.text(`Total Tickets: ${tickets.length}`, { align: 'center' });
    
    doc.moveDown(2);

    // Add tickets
    tickets.forEach((ticket, index) => {
      // Add page break before each ticket (except the first one) if option is enabled
      if (exportOptions.pageBreakBetweenTickets && index > 0) {
        doc.addPage();
      }
      // Check if we need a new page (only if page break option is not enabled)
      else if (!exportOptions.pageBreakBetweenTickets && doc.y > 700) {
        doc.addPage();
      }

      // Ticket header
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#1976d2')
         .text(`Ticket #${index + 1}: ${ticket.title}`);
      
      doc.moveDown(0.5);

      // Ticket details
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('black');

      // Create a two-column layout for ticket details
      const leftColumn = 60;
      const rightColumn = 300;
      let currentY = doc.y;

      // Left column
      doc.text('Status:', leftColumn, currentY);
      doc.text('Priority:', leftColumn, currentY + 15);
      doc.text('Created:', leftColumn, currentY + 30);
      doc.text('Updated:', leftColumn, currentY + 45);

      // Right column with values
      doc.font('Helvetica-Bold');
      doc.text(ticket.status, rightColumn, currentY);
      
      // Color code priority
      const priorityColors = {
        'Urgent': '#d32f2f',
        'High': '#f57c00',
        'Medium': '#1976d2',
        'Low': '#388e3c',
        'None': '#757575'
      };
      doc.fillColor(priorityColors[ticket.priority] || 'black')
         .text(ticket.priority, rightColumn, currentY + 15);
      
      doc.fillColor('black')
         .font('Helvetica')
         .text(new Date(ticket.createdAt).toLocaleString(), rightColumn, currentY + 30)
         .text(new Date(ticket.updatedAt).toLocaleString(), rightColumn, currentY + 45);

      // Move to next line after details
      doc.y = currentY + 60;

      // Customer information
      doc.font('Helvetica-Bold')
         .text('Customer Information:', leftColumn);
      doc.moveDown(0.3);
      
      doc.font('Helvetica')
         .text(`Name: ${ticket.name}`, leftColumn + 20)
         .text(`Email: ${ticket.email}`, leftColumn + 20);
      
      if (ticket.phone) {
        doc.text(`Phone: ${ticket.phone}`, leftColumn + 20);
      }

      doc.moveDown();

      // Description
      doc.font('Helvetica-Bold')
         .text('Description:', leftColumn);
      doc.moveDown(0.3);
      
      doc.font('Helvetica')
         .text(ticket.description || 'No description provided', {
           width: 500,
           align: 'justify',
           indent: 20
         });

      // Include additional details if requested
      if (exportOptions.includeDetails) {
        doc.moveDown();
        
        // Additional ticket details
        const detailFields = [
          { label: 'Location', value: ticket.location },
          { label: 'Computer', value: ticket.computer },
          { label: 'Contact Method', value: ticket.contactMethod },
          { label: 'On VPN', value: ticket.isOnVpn ? 'Yes' : 'No' },
          { label: 'Error Message', value: ticket.errorMessage },
          { label: 'Problem Start Date', value: ticket.problemStartDate },
          { label: 'Steps to Reproduce', value: ticket.stepsToReproduce },
          { label: 'Impact', value: ticket.impact },
          { label: 'Person Having Problem', value: ticket.isPersonHavingProblem ? 'Yes' : 'No' }
        ];

        const relevantDetails = detailFields.filter(field => field.value);
        
        if (relevantDetails.length > 0) {
          doc.font('Helvetica-Bold')
             .text('Additional Details:', leftColumn);
          doc.moveDown(0.3);
          
          relevantDetails.forEach(detail => {
            doc.font('Helvetica-Bold')
               .text(`${detail.label}:`, leftColumn + 20);
            doc.font('Helvetica')
               .text(detail.value, leftColumn + 20, doc.y, {
                 width: 480,
                 align: 'left'
               });
            doc.moveDown(0.5);
          });
        }
      }

      // Include replies if requested
      if (exportOptions.includeReplies && ticket.replies && ticket.replies.length > 0) {
        doc.moveDown();
        
        doc.font('Helvetica-Bold')
           .text('Conversation History:', leftColumn);
        doc.moveDown(0.5);

        ticket.replies.forEach((reply, replyIndex) => {
          // Check if we need a new page (only if page break option is not enabled)
          if (!exportOptions.pageBreakBetweenTickets && doc.y > 650) {
            doc.addPage();
          }

          const replyType = reply.isPrivate ? 'Internal Note' : 'Public Reply';
          const bgColor = reply.isPrivate ? '#fff3cd' : '#d4edda';
          
          // Reply header
          doc.fontSize(9)
             .font('Helvetica-Bold')
             .fillColor(reply.isPrivate ? '#856404' : '#155724')
             .text(`${replyType} #${replyIndex + 1}`, leftColumn + 20);
          
          doc.fontSize(8)
             .font('Helvetica')
             .fillColor('#666666')
             .text(`By: ${reply.authorName} (${reply.authorEmail})`, leftColumn + 20)
             .text(`Date: ${new Date(reply.createdAt).toLocaleString()}`, leftColumn + 20);
          
          doc.moveDown(0.3);
          
          // Reply message
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('black')
             .text(reply.message, {
               width: 480,
               align: 'justify',
               indent: 40
             });
          
          // Reply attachments
          if (reply.attachments && reply.attachments.length > 0) {
            doc.moveDown(0.3);
            doc.fontSize(8)
               .font('Helvetica-Bold')
               .text('Attachments:', leftColumn + 40);
            
            reply.attachments.forEach(attachment => {
              doc.fontSize(8)
                 .font('Helvetica')
                 .text(`• ${attachment.filename}`, leftColumn + 60);
            });
          }
          
          doc.moveDown(0.5);
        });
      }

      // Add separator between tickets
      if (index < tickets.length - 1) {
        doc.moveDown(2);
        doc.strokeColor('#cccccc')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(545, doc.y)
           .stroke();
        doc.moveDown(2);
      }
    });

    // Add headers and footers to all pages
    addHeadersAndFooters();

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('PDF export error:', error);
    
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      const errorResponse = createErrorResponse(error, { 
        operation: 'pdf_export',
        userId: userId || 'unknown',
        userAgent: req.headers['user-agent'],
        ticketCount: req.body?.tickets?.length || 0
      });
      const statusCode = getHttpStatusCode({ type: 'SERVER_ERROR', code: 'PDF_GENERATION_ERROR' });
      res.status(statusCode).json(errorResponse);
    }
  }
};

module.exports = { exportPDF };