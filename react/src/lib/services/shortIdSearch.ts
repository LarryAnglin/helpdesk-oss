/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig';
import { Ticket } from '../types/ticket';

// Base62 character set for validation
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Check if a string matches the short ID pattern
 */
export function isValidShortIdFormat(text: string): boolean {
  if (!text || typeof text !== 'string' || text.length !== 6) {
    return false;
  }
  
  // Check if all characters are valid base62
  return text.split('').every(char => BASE62_CHARS.includes(char));
}

/**
 * Extract potential short IDs from search text
 * Handles various formats like "A3k9Bm", "TICKET-A3k9Bm", "#A3k9Bm", etc.
 */
export function extractShortIdsFromText(searchText: string): string[] {
  if (!searchText) return [];
  
  const words = searchText.split(/\s+/);
  const shortIds: string[] = [];
  
  for (const word of words) {
    // Clean the word - remove common prefixes and special characters
    const cleaned = word
      .replace(/^(ticket-|#|ticket:|id:)/i, '') // Remove common prefixes
      .replace(/[^\w]/g, ''); // Remove non-alphanumeric characters
    
    if (isValidShortIdFormat(cleaned)) {
      shortIds.push(cleaned);
    }
  }
  
  return [...new Set(shortIds)]; // Remove duplicates
}

/**
 * Cloud function interface
 */
interface LookupTicketByShortIdResponse {
  ticket: Ticket | null;
  found: boolean;
  shortId?: string;
}

/**
 * Call the cloud function to lookup a ticket by short ID
 */
export async function lookupTicketByShortId(shortId: string): Promise<Ticket | null> {
  try {
    const lookupFunction = httpsCallable<{ shortId: string }, LookupTicketByShortIdResponse>(
      functions,
      'lookupTicketByShortId'
    );
    
    const result = await lookupFunction({ shortId });
    
    if (result.data.found && result.data.ticket) {
      return result.data.ticket;
    }
    
    return null;
  } catch (error) {
    console.error('Error looking up ticket by short ID:', error);
    
    // Don't throw error - we want to fall back to regular search
    return null;
  }
}

/**
 * Smart search function that tries short ID lookup first, then falls back to regular search
 */
export async function smartTicketSearch(
  searchText: string,
  regularSearchFunction: (text: string) => Promise<Ticket[]>
): Promise<{ tickets: Ticket[], foundByShortId: boolean, shortIdUsed?: string }> {
  
  // Extract potential short IDs from the search text
  const shortIds = extractShortIdsFromText(searchText);
  
  // Try short ID lookup first if we found any potential short IDs
  for (const shortId of shortIds) {
    try {
      const ticket = await lookupTicketByShortId(shortId);
      if (ticket) {
        return {
          tickets: [ticket],
          foundByShortId: true,
          shortIdUsed: shortId
        };
      }
    } catch (error) {
      console.error(`Error looking up short ID ${shortId}:`, error);
      // Continue to try other short IDs or fall back to regular search
    }
  }
  
  // If no short ID matches found, do regular search
  try {
    const tickets = await regularSearchFunction(searchText);
    return {
      tickets,
      foundByShortId: false
    };
  } catch (error) {
    console.error('Error in regular search:', error);
    throw error; // Re-throw regular search errors
  }
}

/**
 * Check if search text contains any potential short IDs
 */
export function containsPotentialShortId(searchText: string): boolean {
  return extractShortIdsFromText(searchText).length > 0;
}

/**
 * Format short ID for display (adds common formatting)
 */
export function formatShortIdForDisplay(shortId: string): string {
  return `TICKET-${shortId.toUpperCase()}`;
}

/**
 * Clean short ID from various input formats
 */
export function cleanShortIdInput(input: string): string | null {
  const shortIds = extractShortIdsFromText(input);
  return shortIds.length > 0 ? shortIds[0] : null;
}