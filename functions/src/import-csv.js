const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { parse } = require('csv-parse/sync');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Import tickets from CSV format
 * Supports field mapping and validation
 */
exports.importCSV = onRequest(async (req, res) => {
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
        csvContent,
        fieldMapping,
        options = {}
      } = req.body;

      if (!csvContent) {
        return res.status(400).json({ error: 'CSV content is required' });
      }

      const {
        duplicateHandling = 'skip', // 'skip', 'update', 'create'
        createMissingUsers = false,
        defaultStatus = 'Open',
        defaultPriority = 'Medium',
        dryRun = false,
        tenantId = userData.currentTenantId
      } = options;

      // Parse CSV
      let records;
      try {
        records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Failed to parse CSV',
          details: parseError.message 
        });
      }

      if (records.length === 0) {
        return res.status(400).json({ error: 'No records found in CSV' });
      }

      // Build default field mapping if not provided
      const mapping = fieldMapping || buildDefaultFieldMapping(Object.keys(records[0]));
      
      const results = {
        total: records.length,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      // Track import data for rollback
      const importTracking = {
        createdTicketIds: [],
        updatedTicketIds: [],
        createdUserIds: [],
        backup: {
          updatedTickets: []
        }
      };

      // Process records
      const batch = admin.firestore().batch();
      let batchCount = 0;
      const maxBatchSize = 500;

      // Cache for user lookups
      const userCache = new Map();
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // Account for header row
        
        try {
          // Map CSV fields to ticket fields
          const ticket = await mapRecordToTicket(record, mapping, {
            userCache,
            createMissingUsers,
            defaultStatus,
            defaultPriority,
            tenantId,
            rowNumber
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
              // Backup original ticket for rollback
              if (!dryRun) {
                importTracking.backup.updatedTickets.push(existingTicket.data());
                importTracking.updatedTicketIds.push(existingTicket.id);
                
                batch.update(existingTicket.ref, {
                  ...ticket,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                batchCount++;
              }
              results.updated++;
            } else {
              // Create new with different ID
              delete ticket.id;
              const newRef = admin.firestore().collection('tickets').doc();
              if (!dryRun) {
                importTracking.createdTicketIds.push(newRef.id);
                
                batch.set(newRef, {
                  ...ticket,
                  id: newRef.id,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                batchCount++;
              }
              results.created++;
            }
          } else {
            // Create new ticket
            const newRef = ticket.id 
              ? admin.firestore().collection('tickets').doc(ticket.id)
              : admin.firestore().collection('tickets').doc();
            
            if (!dryRun) {
              importTracking.createdTicketIds.push(newRef.id);
              
              batch.set(newRef, {
                ...ticket,
                id: newRef.id,
                createdAt: ticket.createdAt || admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
            row: rowNumber,
            error: error.message,
            record: record
          });
        }
      }

      // Commit remaining batch
      if (batchCount > 0 && !dryRun) {
        await batch.commit();
      }

      // Save import history for rollback (only for actual imports, not dry runs)
      if (!dryRun && (results.created > 0 || results.updated > 0)) {
        const importHistoryRef = admin.firestore().collection('importHistory').doc();
        await importHistoryRef.set({
          id: importHistoryRef.id,
          tenantId: tenantId,
          importDate: admin.firestore.FieldValue.serverTimestamp(),
          importBy: userId,
          fileType: 'csv',
          fileName: 'import.csv', // Could be enhanced to include actual filename
          results: results,
          createdTicketIds: importTracking.createdTicketIds,
          updatedTicketIds: importTracking.updatedTicketIds,
          createdUserIds: importTracking.createdUserIds,
          backup: importTracking.backup,
          rolledBack: false
        });
        
        results.importId = importHistoryRef.id;
      }

      // Return results
      res.status(200).json({
        success: true,
        dryRun,
        results
      });

    } catch (error) {
      console.error('Error importing CSV:', error);
      res.status(500).json({ 
        error: 'Failed to import tickets',
        details: error.message 
      });
    }
  });
});

/**
 * Build default field mapping based on CSV headers
 */
function buildDefaultFieldMapping(headers) {
  const mapping = {};
  
  // Common field mappings
  const commonMappings = {
    'ticket id': 'id',
    'id': 'id',
    'title': 'title',
    'subject': 'title',
    'summary': 'title',
    'description': 'description',
    'details': 'description',
    'body': 'description',
    'status': 'status',
    'state': 'status',
    'priority': 'priority',
    'urgency': 'priority',
    'location': 'location',
    'site': 'location',
    'computer': 'computer',
    'device': 'computer',
    'machine': 'computer',
    'submitter name': 'submitterName',
    'requester name': 'submitterName',
    'name': 'submitterName',
    'submitter email': 'submitterEmail',
    'requester email': 'submitterEmail',
    'email': 'submitterEmail',
    'phone': 'phone',
    'telephone': 'phone',
    'contact method': 'contactMethod',
    'assignee': 'assigneeEmail',
    'assigned to': 'assigneeEmail',
    'technician': 'assigneeEmail',
    'created': 'createdAt',
    'created at': 'createdAt',
    'date created': 'createdAt',
    'updated': 'updatedAt',
    'updated at': 'updatedAt',
    'resolved': 'resolvedAt',
    'resolved at': 'resolvedAt',
    'closed at': 'resolvedAt',
    'vpn': 'isOnVpn',
    'on vpn': 'isOnVpn',
    'is on vpn': 'isOnVpn'
  };

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim();
    if (commonMappings[normalized]) {
      mapping[header] = commonMappings[normalized];
    }
  });

  return mapping;
}

/**
 * Map a CSV record to a ticket object
 */
async function mapRecordToTicket(record, mapping, options) {
  const {
    userCache,
    createMissingUsers,
    defaultStatus,
    defaultPriority,
    tenantId,
    rowNumber
  } = options;

  const ticket = {
    tenantId
  };

  // Process each mapped field
  for (const [csvField, ticketField] of Object.entries(mapping)) {
    if (!record[csvField]) continue;
    
    const value = record[csvField].trim();
    if (!value) continue;

    switch (ticketField) {
      case 'id':
        ticket.id = value;
        break;
        
      case 'title':
        ticket.title = value;
        break;
        
      case 'description':
        ticket.description = value;
        break;
        
      case 'status':
        // Validate status
        const validStatuses = ['Open', 'Resolved', 'Closed', 'Accepted', 'Rejected', 'On Hold', 'Waiting', 'Paused'];
        const normalizedStatus = value.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        ticket.status = validStatuses.includes(normalizedStatus) ? normalizedStatus : defaultStatus;
        break;
        
      case 'priority':
        // Validate priority
        const validPriorities = ['Urgent', 'High', 'Medium', 'Low', 'None'];
        const normalizedPriority = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        
        ticket.priority = validPriorities.includes(normalizedPriority) ? normalizedPriority : defaultPriority;
        break;
        
      case 'location':
        ticket.location = value;
        break;
        
      case 'computer':
        ticket.computer = value;
        break;
        
      case 'submitterName':
        ticket.name = value;
        break;
        
      case 'submitterEmail':
        ticket.email = value.toLowerCase();
        
        // Try to find user by email
        let user = userCache.get(ticket.email);
        if (!user) {
          const userQuery = await admin.firestore()
            .collection('users')
            .where('email', '==', ticket.email)
            .limit(1)
            .get();
          
          if (!userQuery.empty) {
            user = userQuery.docs[0];
            userCache.set(ticket.email, user);
            ticket.submitterId = user.id;
          } else if (createMissingUsers) {
            // Create placeholder user
            const newUserRef = admin.firestore().collection('users').doc();
            const newUser = {
              uid: newUserRef.id,
              email: ticket.email,
              displayName: ticket.name || ticket.email,
              role: 'user',
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await newUserRef.set(newUser);
            userCache.set(ticket.email, { id: newUserRef.id, data: () => newUser });
            ticket.submitterId = newUserRef.id;
            
            // Track created user for rollback
            if (!dryRun) {
              importTracking.createdUserIds.push(newUserRef.id);
            }
          }
        } else {
          ticket.submitterId = user.id;
        }
        break;
        
      case 'phone':
        ticket.phone = value;
        break;
        
      case 'contactMethod':
        ticket.contactMethod = value;
        break;
        
      case 'assigneeEmail':
        const assigneeEmail = value.toLowerCase();
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
        break;
        
      case 'createdAt':
        ticket.createdAt = parseDate(value);
        break;
        
      case 'updatedAt':
        ticket.updatedAt = parseDate(value);
        break;
        
      case 'resolvedAt':
        ticket.resolvedAt = parseDate(value);
        break;
        
      case 'isOnVpn':
        ticket.isOnVpn = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
        break;
        
      default:
        // Handle custom fields
        if (ticketField.startsWith('custom_')) {
          if (!ticket.customFields) {
            ticket.customFields = [];
          }
          ticket.customFields.push({
            id: ticketField.replace('custom_', ''),
            name: ticketField.replace('custom_', ''),
            value: value
          });
        }
    }
  }

  // Validate required fields
  if (!ticket.title) {
    throw new Error(`Row ${rowNumber}: Title is required`);
  }
  
  if (!ticket.description) {
    throw new Error(`Row ${rowNumber}: Description is required`);
  }
  
  if (!ticket.email && !ticket.submitterId) {
    throw new Error(`Row ${rowNumber}: Submitter email is required`);
  }

  // Set defaults
  ticket.status = ticket.status || defaultStatus;
  ticket.priority = ticket.priority || defaultPriority;

  return ticket;
}

/**
 * Parse date string to Firestore timestamp
 */
function parseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return null;
  }
  return admin.firestore.Timestamp.fromDate(date);
}