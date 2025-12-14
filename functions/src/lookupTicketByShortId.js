/**
 * Cloud function to lookup a ticket by its short ID
 * This function handles the mapping from short ID (e.g., "A3k9Bm") to the full ticket document
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

// Initialize Firestore
const db = getFirestore();

// Base62 character set for validation
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Validate if a string is a valid short ID format
 */
function isValidShortIdFormat(shortId) {
  if (!shortId || typeof shortId !== 'string' || shortId.length !== 6) {
    return false;
  }
  
  // Check if all characters are valid base62
  return shortId.split('').every(char => BASE62_CHARS.includes(char));
}

/**
 * Convert short ID back to ticket ID using the same deterministic algorithm
 * This reverses the process from getShortIdFromTicket in emailService.ts
 */
function getTicketIdFromShortId(shortId) {
  // Convert Base62 back to BigInt
  let num = BigInt(0);
  const base = BigInt(62);
  
  for (let i = 0; i < shortId.length; i++) {
    const char = shortId[i];
    const value = BigInt(BASE62_CHARS.indexOf(char));
    num = num * base + value;
  }
  
  // Convert back to hex (remove '0x' prefix)
  const hex = num.toString(16);
  
  // The original ticket ID was the first 8 characters of the hex
  // So we need to find a ticket ID whose first 8 hex chars produce this short ID
  return hex.padStart(8, '0');
}

/**
 * Find ticket by short ID
 * Since the short ID is deterministic based on the ticket ID, we need to search
 * for tickets where the first 8 hex chars of the ID match our calculation
 */
async function findTicketByShortId(shortId) {
  try {
    // Get all tickets and check their IDs
    const ticketsRef = db.collection('tickets');
    const snapshot = await ticketsRef.get();
    
    for (const doc of snapshot.docs) {
      const ticketId = doc.id;
      
      // Calculate what the short ID would be for this ticket
      const hex = ticketId.substring(0, 8);
      const calculatedShortId = hexToBase62(hex);
      
      // Case-insensitive comparison
      if (calculatedShortId.toLowerCase() === shortId.toLowerCase()) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding ticket by short ID:', error);
    throw error;
  }
}

/**
 * Convert hex string to Base62 (same as in emailService.ts)
 */
function hexToBase62(hex) {
  let num = BigInt('0x' + hex);
  let result = '';
  
  if (num === BigInt(0)) {
    return BASE62_CHARS[0];
  }
  
  const base = BigInt(62);
  while (num > 0) {
    result = BASE62_CHARS[Number(num % base)] + result;
    num = num / base;
  }
  
  return result.padStart(6, BASE62_CHARS[0]);
}

/**
 * Check if user has permission to view the ticket
 */
async function checkTicketPermission(ticket, userRecord) {
  const userRole = userRecord.customClaims?.role;
  const userId = userRecord.uid;
  
  // Admins and techs can view all tickets
  if (userRole === 'admin' || userRole === 'tech') {
    return true;
  }
  
  // Regular users can only view their own tickets
  if (userRole === 'user' && ticket.submitterId === userId) {
    return true;
  }
  
  return false;
}

/**
 * Main cloud function
 */
exports.lookupTicketByShortId = onCall(async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { shortId } = request.data;
    
    // Validate input
    if (!shortId) {
      throw new HttpsError('invalid-argument', 'Short ID is required');
    }
    
    // Validate short ID format
    if (!isValidShortIdFormat(shortId)) {
      throw new HttpsError('invalid-argument', 'Invalid short ID format');
    }
    
    // Get user record for permission checking
    const userRecord = await getAuth().getUser(request.auth.uid);
    
    // Find the ticket
    const ticket = await findTicketByShortId(shortId);
    
    if (!ticket) {
      // Return null instead of error to allow fallback to regular search
      return { ticket: null, found: false };
    }
    
    // Check permissions
    const hasPermission = await checkTicketPermission(ticket, userRecord);
    
    if (!hasPermission) {
      throw new HttpsError('permission-denied', 'User does not have permission to view this ticket');
    }
    
    return { 
      ticket: ticket, 
      found: true,
      shortId: shortId 
    };
    
  } catch (error) {
    console.error('Error in lookupTicketByShortId:', error);
    
    // Re-throw HttpsErrors as-is
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Convert other errors to internal error
    throw new HttpsError('internal', 'Failed to lookup ticket by short ID');
  }
});