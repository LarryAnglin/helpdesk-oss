/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import jsPDF from 'jspdf';
import { Timeline, TimelineEvent, TimelineExportOptions, DEFAULT_EXPORT_OPTIONS } from '../types/timeline';
import { groupEventsByDate } from './timelineService';
import { formatShortIdForDisplay } from './shortIdSearch';

// Base62 character set for short IDs
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Convert hex string to Base62
const hexToBase62 = (hex: string): string => {
  let num = BigInt('0x' + hex);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  return result || '0';
};

// Generate deterministic short ID from ticket ID using hash
const getShortIdFromTicket = (ticketId: string): string => {
  // Create a simple hash using built-in methods (compatible with all environments)
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Convert to Base62 and ensure 6 characters
  let base62 = hexToBase62(positiveHash);
  
  // Pad or truncate to exactly 6 characters
  if (base62.length < 6) {
    base62 = base62.padStart(6, BASE62_CHARS[0]);
  } else if (base62.length > 6) {
    base62 = base62.substring(0, 6);
  }
  
  return base62;
};

/**
 * Export timeline to PDF with professional formatting
 */
export async function exportTimelineToPDF(
  timeline: Timeline,
  options: TimelineExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let currentY = margin + 30; // Start lower to accommodate logo

  // Function to draw timeline line (removed - no longer needed)
  // const drawTimelineLine = (startY: number, endY?: number) => {
  //   // Timeline line removed per user request
  // };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin - 20) {
      pdf.addPage();
      currentY = margin + 30; // Account for logo space on new pages
      // Timeline line will be drawn in segments as needed
      return true;
    }
    return false;
  };

  // Helper function to add text with wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, lineHeight: number = 1.2) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    let yOffset = 0;
    lines.forEach((line: string) => {
      pdf.text(line, x, y + yOffset);
      yOffset += fontSize * lineHeight / 2.8; // Better line spacing
    });
    return yOffset; // Return total height used
  };

  // Add anglinAI logo with white background
  pdf.setFillColor(255, 255, 255); // White background
  pdf.rect(margin, margin - 2, 45, 18, 'F');
  pdf.setTextColor(220, 53, 69); // Red for entire logo
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('anglinAI', margin + 3, margin + 9); // Single text for proper spacing

  // Title - wrap if too long
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const titleHeight = addWrappedText(options.title || timeline.title, margin, currentY, contentWidth - 40, 18);
  currentY += titleHeight + 8;

  // Subtitle with creation date
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, currentY);
  currentY += 8;

  // Add line separator with color
  pdf.setDrawColor(25, 118, 210);
  pdf.setLineWidth(0.5);
  pdf.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 10;

  // Get visible events and group by date
  const visibleEvents = timeline.events.filter(event => event.isVisible);
  const groupedEvents = options.groupByDate ? groupEventsByDate(visibleEvents) : { 'All Events': visibleEvents };

  // Event type colors and styling
  const getEventStyling = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'submission': 
        return { 
          color: { r: 25, g: 118, b: 210 }, // Blue
          borderColor: { r: 25, g: 118, b: 210 },
          label: 'Submission'
        };
      case 'reply': 
        return { 
          color: { r: 76, g: 175, b: 80 }, // Green
          borderColor: { r: 76, g: 175, b: 80 },
          label: 'Reply'
        };
      case 'private_reply': 
        return { 
          color: { r: 255, g: 152, b: 0 }, // Orange
          borderColor: { r: 255, g: 152, b: 0 },
          label: 'Private Note'
        };
      case 'status_change': 
        return { 
          color: { r: 255, g: 193, b: 7 }, // Amber
          borderColor: { r: 255, g: 193, b: 7 },
          label: 'Status Change'
        };
      case 'assignment': 
        return { 
          color: { r: 156, g: 39, b: 176 }, // Purple
          borderColor: { r: 156, g: 39, b: 176 },
          label: 'Assignment'
        };
      case 'custom': 
        return { 
          color: { r: 96, g: 125, b: 139 }, // Blue Grey
          borderColor: { r: 96, g: 125, b: 139 },
          label: 'Custom'
        };
      default: 
        return { 
          color: { r: 158, g: 158, b: 158 }, // Grey
          borderColor: { r: 158, g: 158, b: 158 },
          label: 'Event'
        };
    }
  };

  // Process each date group
  Object.entries(groupedEvents).forEach(([date, events], groupIndex) => {
    if (groupIndex > 0) {
      currentY += 10; // Space between date groups
    }

    // Date header (if grouping by date) - more prominent
    if (options.groupByDate && date !== 'All Events') {
      checkNewPage(30);
      
      // Colored date background with more prominence
      pdf.setFillColor(25, 118, 210); // Brand blue
      pdf.rect(margin, currentY - 3, contentWidth, 20, 'F');
      
      // Make sure text is white and visible on blue background
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255); // Ensure white text
      
      const formattedDate = new Date(events[0].timestamp).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      pdf.text(formattedDate, margin + 8, currentY + 10);
      
      currentY += 25;
    }

    // Process events for this date
    events.forEach((event) => {
      const timeStr = options.showTimeOnly && options.groupByDate 
        ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(event.timestamp).toLocaleString();

      const styling = getEventStyling(event.type);

      // Calculate required height for compact card layout with proper spacing
      pdf.setFontSize(10);
      const titleLines = pdf.splitTextToSize(event.title, contentWidth - 70);
      const titleHeight = titleLines.length * 5; // Better line spacing
      
      pdf.setFontSize(9);
      let descHeight = 0;
      if (event.description && options.includeEventDetails) {
        // More aggressive truncation for compact view
        let description = event.description;
        if (description.length > 120) {
          description = description.substring(0, 120) + '...';
        }
        const descLines = pdf.splitTextToSize(description, contentWidth - 70);
        descHeight = descLines.length * 4; // Better line spacing
      }
      
      // More generous height calculation to ensure content fits
      const cardHeight = Math.max(30, titleHeight + descHeight + 25); // More padding

      checkNewPage(cardHeight + 5);

      // Compact card background
      const cardX = margin + 20;
      const cardY = currentY;
      const cardWidth = contentWidth - 20;
      
      // Simple card background
      pdf.setFillColor(250, 250, 250);
      pdf.rect(cardX, cardY, cardWidth, cardHeight, 'F');
      
      // Card border
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.rect(cardX, cardY, cardWidth, cardHeight, 'S');
      
      // Colored left border for event type (thinner)
      pdf.setFillColor(styling.borderColor.r, styling.borderColor.g, styling.borderColor.b);
      pdf.rect(cardX, cardY, 3, cardHeight, 'F');

      // Timeline marker removed - no longer needed without vertical line

      // Content area (more compact)
      const contentX = cardX + 8;
      let contentY = cardY + 8;

      // Time and event type in same line (compact header)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(timeStr, contentX, contentY);
      
      // Event type badge (no emoji)
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(styling.color.r, styling.color.g, styling.color.b);
      const timeWidth = pdf.getTextWidth(timeStr);
      pdf.text(styling.label.toUpperCase(), contentX + timeWidth + 10, contentY);
      
      contentY += 8;

      // Event title (compact)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      const titleHeight_actual = addWrappedText(event.title, contentX, contentY, cardWidth - 16, 10, 1.2);
      contentY += titleHeight_actual + 2;

      // Event description (compact, more truncated)
      if (event.description && options.includeEventDetails) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(70, 70, 70);
        
        // More aggressive truncation for compact view
        let description = event.description;
        if (description.length > 120) {
          description = description.substring(0, 120) + '...';
        }
        
        const descHeight_actual = addWrappedText(description, contentX, contentY, cardWidth - 16, 9, 1.1);
        contentY += descHeight_actual + 2;
      }

      // Author info (compact)
      if (event.author) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100, 100, 100);
        
        const authorText = `by ${event.author.name}`;
        pdf.text(authorText, contentX, contentY);
        
        if (event.author.role) {
          const authorWidth = pdf.getTextWidth(authorText);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(styling.color.r, styling.color.g, styling.color.b);
          pdf.text(` (${event.author.role.toUpperCase()})`, contentX + authorWidth, contentY);
        }
      }

      currentY += cardHeight + 8; // Compact spacing between cards
    });
  });

  // Timeline line removed - no longer needed

  // Footer
  const totalPages = pdf.internal.pages.length - 1; // Subtract 1 because pages array includes a null first element
  const shortId = getShortIdFromTicket(timeline.ticketId);
  const displayId = formatShortIdForDisplay(shortId);
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Footer line with color
    pdf.setDrawColor(25, 118, 210);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Page number
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 25, pageHeight - 8);
    
    // Short ID in footer
    pdf.text(`${displayId}`, margin, pageHeight - 8);
    
    // Add anglinAI logo to each page header (only if not first page)
    if (i > 1) {
      pdf.setFillColor(255, 255, 255); // White background
      pdf.rect(margin, margin - 2, 45, 18, 'F');
      pdf.setTextColor(220, 53, 69); // Red for entire logo
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('anglinAI', margin + 3, margin + 9); // Single text for proper spacing
    }
  }

  // Save the PDF with short ID
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Timeline-${displayId}-${dateStr}.pdf`;
  pdf.save(filename);
}

/**
 * Generate a print-friendly version of the timeline
 */
export function generateTimelinePrintHTML(
  timeline: Timeline,
  options: TimelineExportOptions = DEFAULT_EXPORT_OPTIONS
): string {
  const visibleEvents = timeline.events.filter(event => event.isVisible);
  const groupedEvents = options.groupByDate ? groupEventsByDate(visibleEvents) : { 'All Events': visibleEvents };

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${timeline.title}</title>
      <style>
        @media print {
          @page { margin: 1in; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
        }
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 15px; }
        .date-group { margin-bottom: 30px; }
        .date-header { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 15px; background: #f5f5f5; padding: 10px; }
        .event { margin-bottom: 20px; padding-left: 30px; position: relative; }
        .event::before { content: '●'; position: absolute; left: 0; color: #666; }
        .event-time { font-size: 10px; color: #888; margin-bottom: 5px; }
        .event-title { font-weight: bold; margin-bottom: 5px; }
        .event-description { color: #666; margin-bottom: 5px; }
        .event-author { font-size: 10px; color: #aaa; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${options.title || timeline.title}</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
  `;

  Object.entries(groupedEvents).forEach(([date, events]) => {
    if (options.groupByDate && date !== 'All Events') {
      const formattedDate = new Date(events[0].timestamp).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      html += `<div class="date-group"><div class="date-header">${formattedDate}</div>`;
    }

    events.forEach(event => {
      const timeStr = options.showTimeOnly && options.groupByDate 
        ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(event.timestamp).toLocaleString();

      html += `
        <div class="event">
          <div class="event-time">${timeStr}</div>
          <div class="event-title">${event.title}</div>
          ${event.description && options.includeEventDetails ? `<div class="event-description">${event.description}</div>` : ''}
          ${event.author ? `<div class="event-author">by ${event.author.name}</div>` : ''}
        </div>
      `;
    });

    if (options.groupByDate && date !== 'All Events') {
      html += '</div>';
    }
  });

  html += `
      </body>
    </html>
  `;

  return html;
}