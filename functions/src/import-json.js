const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Import tickets from JSON format
 * Supports nested data structures and complex relationships
 */
exports.importJSON = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await verifyIdToken(idToken);
      const userId = decodedToken.uid;

      // Get user details and verify permissions
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      const userRole = userData.role || 'user';
      
      // Only admins can import
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can import tickets' });
      }

      const {
        jsonContent,
        options = {}
      } = req.body;

      if (!jsonContent) {
        return res.status(400).json({ error: 'JSON content is required' });
      }

      const {
        duplicateHandling = 'skip', // 'skip', 'update', 'create'
        createMissingUsers = false,
        preserveTimestamps = true,
        preserveIds = false,
        defaultStatus = 'Open',
        defaultPriority = 'Medium',
        dryRun = false,
        tenantId = userData.currentTenantId
      } = options;

      // Parse JSON
      let data;
      try {
        data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Failed to parse JSON',
          details: parseError.message 
        });
      }

      // Handle different JSON structures
      let tickets = [];
      if (Array.isArray(data)) {
        tickets = data;
      } else if (data.tickets && Array.isArray(data.tickets)) {
        tickets = data.tickets;
      } else if (data.data && Array.isArray(data.data)) {
        tickets = data.data;
      } else if (typeof data === 'object' && data.id) {
        // Single ticket object
        tickets = [data];
      } else {
        return res.status(400).json({ error: 'Invalid JSON structure. Expected array of tickets or object with tickets array.' });
      }

      if (tickets.length === 0) {
        return res.status(400).json({ error: 'No tickets found in JSON' });
      }

      const results = {
        total: tickets.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      // Process tickets
      const batch = admin.firestore().batch();
      let batchCount = 0;
      const maxBatchSize = 500;

      // Cache for user lookups
      const userCache = new Map();
      
      for (let i = 0; i < tickets.length; i++) {
        const ticketData = tickets[i];
        const ticketIndex = i + 1;
        
        try {
          // Process and validate ticket
          const ticket = await processJSONTicket(ticketData, {
            userCache,
            createMissingUsers,
            preserveTimestamps,
            preserveIds,
            defaultStatus,
            defaultPriority,
            tenantId,
            ticketIndex
          });

          // Check for duplicates
          let existingTicket = null;
          if (ticket.id) {
            const existingDoc = await admin.firestore()
              .collection('tickets')
              .doc(ticket.id)
              .get();
            if (existingDoc.exists) {
              existingTicket = existingDoc;
            }
          }

          // Handle based on duplicate policy
          if (existingTicket) {
            if (duplicateHandling === 'skip') {
              results.skipped++;
              continue;
            } else if (duplicateHandling === 'update') {
              if (!dryRun) {
                batch.update(existingTicket.ref, {
                  ...ticket,
                  updatedAt: preserveTimestamps && ticket.updatedAt ? 
                    ticket.updatedAt : admin.firestore.FieldValue.serverTimestamp()
                });
                batchCount++;
              }
              results.updated++;
            } else {
              // Create new with different ID
              delete ticket.id;
              const newRef = admin.firestore().collection('tickets').doc();
              if (!dryRun) {
                batch.set(newRef, {
                  ...ticket,
                  id: newRef.id,
                  createdAt: preserveTimestamps && ticket.createdAt ? 
                    ticket.createdAt : admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: preserveTimestamps && ticket.updatedAt ? 
                    ticket.updatedAt : admin.firestore.FieldValue.serverTimestamp()
                });
                batchCount++;
              }
              results.created++;
            }
          } else {
            // Create new ticket
            const newRef = (preserveIds && ticket.id) 
              ? admin.firestore().collection('tickets').doc(ticket.id)
              : admin.firestore().collection('tickets').doc();
            
            if (!dryRun) {
              batch.set(newRef, {
                ...ticket,
                id: newRef.id,
                createdAt: preserveTimestamps && ticket.createdAt ? 
                  ticket.createdAt : admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: preserveTimestamps && ticket.updatedAt ? 
                  ticket.updatedAt : admin.firestore.FieldValue.serverTimestamp()
              });
              batchCount++;
            }
            results.created++;
          }

          results.processed++;

          // Commit batch if needed
          if (batchCount >= maxBatchSize) {
            if (!dryRun) {
              await batch.commit();
            }
            batchCount = 0;
          }

        } catch (error) {
          results.errors.push({
            ticket: ticketIndex,
            error: error.message,
            data: ticketData
          });
        }
      }

      // Commit remaining batch
      if (batchCount > 0 && !dryRun) {
        await batch.commit();
      }

      // Return results
      res.status(200).json({
        success: true,
        dryRun,
        results
      });

    } catch (error) {
      console.error('Error importing JSON:', error);
      res.status(500).json({ 
        error: 'Failed to import tickets',
        details: error.message 
      });
    }
  });
});

/**
 * Process and validate a JSON ticket object
 */
async function processJSONTicket(ticketData, options) {
  const {
    userCache,
    createMissingUsers,
    preserveTimestamps,
    preserveIds,
    defaultStatus,
    defaultPriority,
    tenantId,
    ticketIndex
  } = options;

  // Start with the provided ticket data
  const ticket = { ...ticketData };

  // Set tenant ID
  ticket.tenantId = tenantId;

  // Validate required fields
  if (!ticket.title) {
    throw new Error(`Ticket ${ticketIndex}: Title is required`);
  }
  
  if (!ticket.description) {
    throw new Error(`Ticket ${ticketIndex}: Description is required`);
  }

  // Process user references
  if (ticket.email || ticket.submitterEmail) {
    const email = (ticket.email || ticket.submitterEmail).toLowerCase();
    ticket.email = email;
    
    // Try to find user by email
    let user = userCache.get(email);
    if (!user) {
      const userQuery = await admin.firestore()
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!userQuery.empty) {
        user = userQuery.docs[0];
        userCache.set(email, user);
        ticket.submitterId = user.id;
      } else if (createMissingUsers) {
        // Create placeholder user
        const newUserRef = admin.firestore().collection('users').doc();
        const newUser = {
          uid: newUserRef.id,
          email: email,
          displayName: ticket.name || ticket.submitterName || email,
          role: 'user',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await newUserRef.set(newUser);
        userCache.set(email, { id: newUserRef.id, data: () => newUser });
        ticket.submitterId = newUserRef.id;
      }
    } else {
      ticket.submitterId = user.id;
    }
  }

  // Process assignee
  if (ticket.assigneeEmail) {
    const assigneeEmail = ticket.assigneeEmail.toLowerCase();
    let assignee = userCache.get(assigneeEmail);
    if (!assignee) {
      const assigneeQuery = await admin.firestore()
        .collection('users')
        .where('email', '==', assigneeEmail)
        .limit(1)
        .get();
      
      if (!assigneeQuery.empty) {
        assignee = assigneeQuery.docs[0];
        userCache.set(assigneeEmail, assignee);
        ticket.assigneeId = assignee.id;
      }
    } else {
      ticket.assigneeId = assignee.id;
    }
  }

  // Validate and normalize status
  if (ticket.status) {
    const validStatuses = ['Open', 'Resolved', 'Closed', 'Accepted', 'Rejected', 'On Hold', 'Waiting', 'Paused'];
    const normalizedStatus = ticket.status.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    if (validStatuses.includes(normalizedStatus)) {
      ticket.status = normalizedStatus;
    } else {
      ticket.status = defaultStatus;
    }
  } else {
    ticket.status = defaultStatus;
  }

  // Validate and normalize priority
  if (ticket.priority) {
    const validPriorities = ['Urgent', 'High', 'Medium', 'Low', 'None'];
    const normalizedPriority = ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1).toLowerCase();
    
    if (validPriorities.includes(normalizedPriority)) {
      ticket.priority = normalizedPriority;
    } else {
      ticket.priority = defaultPriority;
    }
  } else {
    ticket.priority = defaultPriority;
  }

  // Process timestamps
  if (preserveTimestamps) {
    ['createdAt', 'updatedAt', 'resolvedAt'].forEach(field => {
      if (ticket[field]) {
        ticket[field] = parseTimestamp(ticket[field]);
      }
    });
  }

  // Process replies if present
  if (ticket.replies && Array.isArray(ticket.replies)) {
    ticket.replies = ticket.replies.map(reply => {
      if (preserveTimestamps && reply.createdAt) {
        reply.createdAt = parseTimestamp(reply.createdAt);
      }
      return reply;
    });
  }

  // Process attachments if present
  if (ticket.attachments && Array.isArray(ticket.attachments)) {
    ticket.attachments = ticket.attachments.map(attachment => {
      if (preserveTimestamps && attachment.uploadedAt) {
        attachment.uploadedAt = parseTimestamp(attachment.uploadedAt);
      }
      return attachment;
    });
  }

  // Process custom fields if present
  if (ticket.customFields && Array.isArray(ticket.customFields)) {
    // Ensure custom fields have proper structure
    ticket.customFields = ticket.customFields.map(field => ({
      id: field.id || field.name,
      name: field.name || field.id,
      value: field.value,
      type: field.type || 'text'
    }));
  }

  // Remove legacy fields that shouldn't be stored
  delete ticket.submitterEmail;
  delete ticket.submitterName;
  delete ticket.assigneeEmail;

  return ticket;
}

/**
 * Parse timestamp string to Firestore timestamp
 */
function parseTimestamp(timestampStr) {
  if (!timestampStr) return null;
  
  // If it's already a Firestore timestamp
  if (timestampStr._seconds !== undefined) {
    return timestampStr;
  }
  
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return admin.firestore.Timestamp.fromDate(date);
}