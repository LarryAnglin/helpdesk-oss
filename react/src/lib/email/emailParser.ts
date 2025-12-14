/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Email parsing utilities for extracting clean reply content
 */

/**
 * Common email signature patterns
 */
const SIGNATURE_PATTERNS = [
  /^--\s*$/m, // Standard signature delimiter
  /^--- \w+.*$/m, // Outlook style
  /^Sent from my \w+.*$/m, // Mobile signatures
  /^Get Outlook for \w+.*$/m, // Outlook mobile
  /^This email was sent from.*$/m, // Generic mobile
  /^Sent via.*$/m, // Various apps
  /^Best regards,?$/m, // Common signature starts
  /^Kind regards,?$/m,
  /^Regards,?$/m,
  /^Thanks,?$/m,
  /^Thank you,?$/m,
  /^\w+\s+\w+\s*$/m, // Name only signatures
  /^Tel:.*$/m, // Phone numbers
  /^Phone:.*$/m,
  /^Email:.*$/m,
  /^Website:.*$/m,
];

/**
 * Quoted text patterns (original message being replied to)
 */
const QUOTED_TEXT_PATTERNS = [
  /^On .* wrote:$/m, // Gmail style
  /^From:.*$/m, // Outlook style
  /^Sent:.*$/m, // Outlook style
  /^To:.*$/m, // Outlook style
  /^Subject:.*$/m, // Outlook style
  /^Date:.*$/m, // Various clients
  /^>.*$/gm, // Standard quote prefix
  /^-----Original Message-----$/m, // Outlook
  /^________________________________$/m, // Outlook separator
  /^Begin forwarded message:$/m, // Apple Mail
  /^----- Reply message -----$/m, // Various clients
];

/**
 * Remove email signatures from text
 */
function removeSignatures(text: string): string {
  let cleanText = text;
  
  for (const pattern of SIGNATURE_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match && match.index !== undefined) {
      // Keep text before the signature
      cleanText = cleanText.substring(0, match.index).trim();
    }
  }
  
  return cleanText;
}

/**
 * Remove quoted text (original message being replied to)
 */
function removeQuotedText(text: string): string {
  let cleanText = text;
  
  for (const pattern of QUOTED_TEXT_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match && match.index !== undefined) {
      // Keep text before the quoted content
      cleanText = cleanText.substring(0, match.index).trim();
      break; // Stop at first match to avoid over-trimming
    }
  }
  
  return cleanText;
}

/**
 * Remove common email client artifacts
 */
function removeEmailArtifacts(text: string): string {
  return text
    // Remove multiple consecutive empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Extract reply content from HTML email
 */
function parseHtmlReply(html: string): string {
  if (!html) return '';
  
  // Convert HTML to plain text (basic conversion)
  let text = html
    // Replace line breaks with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return text;
}

/**
 * Main function to parse email content and extract clean reply
 */
export function parseEmailContent(plainText: string, htmlText?: string): string {
  // Prefer stripped text if available, otherwise use full text
  let content = plainText || '';
  
  // If we have HTML but no plain text, convert HTML to text
  if (!content && htmlText) {
    content = parseHtmlReply(htmlText);
  }
  
  if (!content) {
    return '';
  }
  
  // Apply cleaning steps in order
  content = removeQuotedText(content);
  content = removeSignatures(content);
  content = removeEmailArtifacts(content);
  
  return content;
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+)>/);
  return match ? match[1] : emailString;
}

/**
 * Parse email subject to extract ticket information
 */
export function parseEmailSubject(subject: string): {
  ticketId: string | null;
  isReply: boolean;
  cleanSubject: string;
} {
  // Check if it's a reply (starts with Re:)
  const isReply = /^Re:/i.test(subject);
  
  // Extract ticket ID from various formats
  const ticketIdMatch = subject.match(/(?:\[TICKET-(\d+)\]|#(\d+))/i);
  const ticketId = ticketIdMatch ? (ticketIdMatch[1] || ticketIdMatch[2]) : null;
  
  // Clean subject (remove Re:, ticket ID, etc.)
  const cleanSubject = subject
    .replace(/^Re:\s*/i, '')
    .replace(/\[TICKET-\d+\]/gi, '')
    .replace(/#\d+/g, '')
    .trim();
  
  return {
    ticketId,
    isReply,
    cleanSubject,
  };
}

/**
 * Validate email content quality
 */
export function validateEmailContent(content: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check minimum length
  if (content.length < 10) {
    issues.push('Content too short');
  }
  
  // Check for common spam patterns
  if (/^(unsubscribe|stop|opt-out)/i.test(content)) {
    issues.push('Appears to be unsubscribe request');
  }
  
  // Check for auto-reply patterns
  if (/(out of office|vacation|auto.?reply|away message)/i.test(content)) {
    issues.push('Appears to be auto-reply');
  }
  
  // Check for delivery failure patterns
  if (/(delivery failed|bounce|mailer.?daemon|postmaster)/i.test(content)) {
    issues.push('Appears to be delivery failure');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}