/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket } from '../types/ticket';

interface ExportOptions {
  includeDetails?: boolean;
  includeReplies?: boolean;
}

/**
 * Convert tickets array to CSV format
 */
export const exportToCSV = (tickets: Ticket[], filename: string = 'tickets', options: ExportOptions = {}) => {
  const { includeDetails = false, includeReplies = false } = options;
  
  // Define base CSV headers
  let headers = ['Title', 'Status', 'Priority', 'Submitted By', 'Email', 'Phone', 'Description', 'Date Created', 'Date Updated'];
  
  // Add detail headers if requested
  if (includeDetails) {
    headers.push('Location', 'Computer', 'Contact Method', 'On VPN', 'Error Message', 'Problem Start Date', 'Steps to Reproduce', 'Impact');
  }
  
  // Add reply headers if requested
  if (includeReplies) {
    headers.push('Reply Count', 'Latest Reply Date', 'Conversation Summary');
  }
  
  // Convert tickets to CSV rows
  const rows = tickets.map(ticket => {
    let row = [
      `"${ticket.title.replace(/"/g, '""')}"`, // Escape quotes in title
      ticket.status,
      ticket.priority,
      `"${ticket.name.replace(/"/g, '""')}"`, // Escape quotes in name
      ticket.email,
      ticket.phone || '',
      `"${ticket.description.replace(/"/g, '""')}"`, // Escape quotes in description
      new Date(ticket.createdAt).toLocaleString(),
      new Date(ticket.updatedAt).toLocaleString()
    ];
    
    // Add detail columns if requested
    if (includeDetails) {
      row.push(
        ticket.location || '',
        ticket.computer || '',
        ticket.contactMethod || '',
        ticket.isOnVpn ? 'Yes' : 'No',
        `"${(ticket.errorMessage || '').replace(/"/g, '""')}"`,
        ticket.problemStartDate || '',
        `"${(ticket.stepsToReproduce || '').replace(/"/g, '""')}"`,
        `"${(ticket.impact || '').replace(/"/g, '""')}"`
      );
    }
    
    // Add reply columns if requested
    if (includeReplies) {
      const replies = ticket.replies || [];
      const publicReplies = replies.filter(r => !r.isPrivate);
      const privateReplies = replies.filter(r => r.isPrivate);
      
      const latestReply = replies.length > 0 ? 
        new Date(Math.max(...replies.map(r => r.createdAt))).toLocaleString() : '';
      
      const conversationSummary = replies.length > 0 ? 
        `${publicReplies.length} public replies, ${privateReplies.length} internal notes` : 'No replies';
      
      row.push(
        replies.length.toString(),
        latestReply,
        `"${conversationSummary}"`
      );
    }
    
    return row;
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Create and download file
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

/**
 * Convert tickets array to JSON format
 */
export const exportToJSON = (tickets: Ticket[], filename: string = 'tickets', options: ExportOptions = {}) => {
  const { includeDetails = false, includeReplies = false } = options;
  
  let exportData = tickets;
  
  // Filter data based on options if needed
  if (!includeDetails || !includeReplies) {
    exportData = tickets.map(ticket => {
      const filteredTicket: any = { ...ticket };
      
      if (!includeDetails) {
        // Remove detailed fields
        delete filteredTicket.location;
        delete filteredTicket.computer;
        delete filteredTicket.contactMethod;
        delete filteredTicket.isOnVpn;
        delete filteredTicket.errorMessage;
        delete filteredTicket.problemStartDate;
        delete filteredTicket.stepsToReproduce;
        delete filteredTicket.impact;
        delete filteredTicket.isPersonHavingProblem;
        delete filteredTicket.userName;
        delete filteredTicket.userPhone;
        delete filteredTicket.userEmail;
        delete filteredTicket.userPreferredContact;
        delete filteredTicket.agreeToTroubleshoot;
      }
      
      if (!includeReplies) {
        delete filteredTicket.replies;
      } else if (filteredTicket.replies) {
        // Keep replies but add metadata
        filteredTicket.replyStats = {
          total: filteredTicket.replies.length,
          public: filteredTicket.replies.filter((r: any) => !r.isPrivate).length,
          private: filteredTicket.replies.filter((r: any) => r.isPrivate).length
        };
      }
      
      return filteredTicket;
    });
  }
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

/**
 * Convert tickets array to Excel-compatible XML format (XLS)
 */
export const exportToXLS = (tickets: Ticket[], filename: string = 'tickets', options: ExportOptions = {}) => {
  const { includeDetails = false, includeReplies = false } = options;
  
  // Build dynamic headers
  let headerCells = [
    '<Cell><Data ss:Type="String">Title</Data></Cell>',
    '<Cell><Data ss:Type="String">Status</Data></Cell>',
    '<Cell><Data ss:Type="String">Priority</Data></Cell>',
    '<Cell><Data ss:Type="String">Submitted By</Data></Cell>',
    '<Cell><Data ss:Type="String">Email</Data></Cell>',
    '<Cell><Data ss:Type="String">Phone</Data></Cell>',
    '<Cell><Data ss:Type="String">Description</Data></Cell>',
    '<Cell><Data ss:Type="String">Date Created</Data></Cell>',
    '<Cell><Data ss:Type="String">Date Updated</Data></Cell>'
  ];
  
  if (includeDetails) {
    headerCells.push(
      '<Cell><Data ss:Type="String">Location</Data></Cell>',
      '<Cell><Data ss:Type="String">Computer</Data></Cell>',
      '<Cell><Data ss:Type="String">Contact Method</Data></Cell>',
      '<Cell><Data ss:Type="String">On VPN</Data></Cell>',
      '<Cell><Data ss:Type="String">Error Message</Data></Cell>',
      '<Cell><Data ss:Type="String">Problem Start Date</Data></Cell>',
      '<Cell><Data ss:Type="String">Steps to Reproduce</Data></Cell>',
      '<Cell><Data ss:Type="String">Impact</Data></Cell>'
    );
  }
  
  if (includeReplies) {
    headerCells.push(
      '<Cell><Data ss:Type="String">Reply Count</Data></Cell>',
      '<Cell><Data ss:Type="String">Latest Reply Date</Data></Cell>',
      '<Cell><Data ss:Type="String">Conversation Summary</Data></Cell>'
    );
  }
  
  // Excel XML template
  const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Tickets">
  <Table>
   <Row>
    ${headerCells.join('\n    ')}
   </Row>`;
  
  const xmlRows = tickets.map(ticket => {
    let cells = [
      `<Cell><Data ss:Type="String">${escapeXml(ticket.title)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${ticket.status}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${ticket.priority}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(ticket.name)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${ticket.email}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${ticket.phone || ''}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(ticket.description)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${new Date(ticket.createdAt).toLocaleString()}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${new Date(ticket.updatedAt).toLocaleString()}</Data></Cell>`
    ];
    
    if (includeDetails) {
      cells.push(
        `<Cell><Data ss:Type="String">${ticket.location || ''}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${ticket.computer || ''}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${ticket.contactMethod || ''}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${ticket.isOnVpn ? 'Yes' : 'No'}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(ticket.errorMessage || '')}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${ticket.problemStartDate || ''}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(ticket.stepsToReproduce || '')}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(ticket.impact || '')}</Data></Cell>`
      );
    }
    
    if (includeReplies) {
      const replies = ticket.replies || [];
      const publicReplies = replies.filter(r => !r.isPrivate);
      const privateReplies = replies.filter(r => r.isPrivate);
      
      const latestReply = replies.length > 0 ? 
        new Date(Math.max(...replies.map(r => r.createdAt))).toLocaleString() : '';
      
      const conversationSummary = replies.length > 0 ? 
        `${publicReplies.length} public replies, ${privateReplies.length} internal notes` : 'No replies';
      
      cells.push(
        `<Cell><Data ss:Type="Number">${replies.length}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${latestReply}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${escapeXml(conversationSummary)}</Data></Cell>`
      );
    }
    
    return `
   <Row>
    ${cells.join('\n    ')}
   </Row>`;
  }).join('');
  
  const xmlFooter = `
  </Table>
 </Worksheet>
</Workbook>`;
  
  const xmlContent = xmlHeader + xmlRows + xmlFooter;
  downloadFile(xmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
};

/**
 * Helper function to escape XML special characters
 */
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Helper function to download a file
 */
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};