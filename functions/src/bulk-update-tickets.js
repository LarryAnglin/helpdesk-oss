/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 * Bulk update tickets for organization/company assignments
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Bulk update tickets with organization/company assignments
 * This script can:
 * 1. Add organizationId/companyId to tickets that don't have them
 * 2. Migrate from tenantId to organizationId
 * 3. Update specific tickets based on filters
 */
exports.bulkUpdateTickets = onRequest(async (req, res) => {
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
      
      // Only admins can perform bulk updates
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can perform bulk updates' });
      }

      const {
        updateType,
        filters = {},
        updates = {},
        dryRun = true
      } = req.body;

      console.log(`Starting bulk update: ${updateType}, dryRun: ${dryRun}`);

      let query = admin.firestore().collection('tickets');
      
      // Apply filters
      if (filters.tenantId) {
        query = query.where('tenantId', '==', filters.tenantId);
      }
      if (filters.submitterId) {
        query = query.where('submitterId', '==', filters.submitterId);
      }
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.hasNoOrganizationId) {
        // This will need to be handled differently since Firestore doesn't support "not exists" queries directly
        console.log('Note: Filtering for tickets without organizationId will be done in memory');
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return res.status(200).json({
          message: 'No tickets found matching filters',
          ticketsUpdated: 0,
          dryRun
        });
      }

      const updateResults = {
        totalTickets: snapshot.size,
        ticketsToUpdate: 0,
        ticketsUpdated: 0,
        errors: [],
        updatedTicketIds: [],
        updates: []
      };

      const batch = admin.firestore().batch();
      let batchSize = 0;
      const maxBatchSize = 500; // Firestore batch limit

      // Process each ticket
      for (const doc of snapshot.docs) {
        const ticket = { id: doc.id, ...doc.data() };
        let shouldUpdate = false;
        const ticketUpdates = {};

        // Apply update logic based on updateType
        switch (updateType) {
          case 'migrate_tenant_to_org':
            if (ticket.tenantId && !ticket.organizationId) {
              ticketUpdates.organizationId = ticket.tenantId;
              shouldUpdate = true;
            }
            break;

          case 'add_organization':
            if (updates.organizationId && !ticket.organizationId) {
              ticketUpdates.organizationId = updates.organizationId;
              shouldUpdate = true;
            }
            break;

          case 'add_company':
            if (updates.companyId && !ticket.companyId) {
              ticketUpdates.companyId = updates.companyId;
              shouldUpdate = true;
            }
            break;

          case 'update_by_submitter':
            if (ticket.submitterId && updates.organizationId) {
              // Could look up user's organization and assign
              ticketUpdates.organizationId = updates.organizationId;
              shouldUpdate = true;
            }
            break;

          case 'custom_updates':
            // Apply any custom field updates
            Object.keys(updates).forEach(field => {
              if (updates[field] !== null && updates[field] !== undefined) {
                ticketUpdates[field] = updates[field];
                shouldUpdate = true;
              }
            });
            break;

          default:
            return res.status(400).json({ error: `Unknown update type: ${updateType}` });
        }

        // Filter out tickets without organizationId if requested
        if (filters.hasNoOrganizationId && ticket.organizationId) {
          shouldUpdate = false;
        }

        if (shouldUpdate) {
          updateResults.ticketsToUpdate++;
          updateResults.updates.push({
            ticketId: ticket.id,
            currentValues: {
              organizationId: ticket.organizationId || null,
              companyId: ticket.companyId || null,
              tenantId: ticket.tenantId || null
            },
            newValues: ticketUpdates
          });

          if (!dryRun) {
            // Add update timestamp
            ticketUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            
            batch.update(doc.ref, ticketUpdates);
            batchSize++;
            updateResults.updatedTicketIds.push(ticket.id);

            // Execute batch if we hit the limit
            if (batchSize >= maxBatchSize) {
              try {
                await batch.commit();
                updateResults.ticketsUpdated += batchSize;
                batchSize = 0;
                // Create new batch for remaining updates
                const newBatch = admin.firestore().batch();
                batch = newBatch;
              } catch (error) {
                updateResults.errors.push({
                  error: error.message,
                  batchSize
                });
                break;
              }
            }
          }
        }
      }

      // Commit remaining batch
      if (!dryRun && batchSize > 0) {
        try {
          await batch.commit();
          updateResults.ticketsUpdated += batchSize;
        } catch (error) {
          updateResults.errors.push({
            error: error.message,
            batchSize
          });
        }
      }

      // In dry run mode, ticketsUpdated equals ticketsToUpdate
      if (dryRun) {
        updateResults.ticketsUpdated = updateResults.ticketsToUpdate;
      }

      console.log(`Bulk update complete: ${updateResults.ticketsUpdated} tickets updated`);

      return res.status(200).json({
        message: dryRun ? 'Dry run completed - no changes made' : 'Bulk update completed',
        ...updateResults,
        dryRun
      });

    } catch (error) {
      console.error('Error in bulk update:', error);
      return res.status(500).json({ 
        error: 'Failed to perform bulk update',
        details: error.message 
      });
    }
  });
});

/**
 * Get organization mapping suggestions based on user data
 */
exports.getOrganizationMappings = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      // Get unique submitterIds from tickets
      const ticketsSnapshot = await admin.firestore()
        .collection('tickets')
        .limit(1000)
        .get();

      const submitterIds = new Set();
      const tenantIds = new Set();
      
      ticketsSnapshot.docs.forEach(doc => {
        const ticket = doc.data();
        if (ticket.submitterId) submitterIds.add(ticket.submitterId);
        if (ticket.tenantId) tenantIds.add(ticket.tenantId);
      });

      // Get user organization mappings
      const userOrgMappings = [];
      for (const submitterId of submitterIds) {
        try {
          const userDoc = await admin.firestore()
            .collection('users')
            .doc(submitterId)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            userOrgMappings.push({
              userId: submitterId,
              userEmail: userData.email,
              organizationId: userData.organizationId || null,
              tenantId: userData.tenantId || null
            });
          }
        } catch (error) {
          console.error(`Error getting user ${submitterId}:`, error);
        }
      }

      // Get available organizations and companies
      const orgsSnapshot = await admin.firestore().collection('organizations').get();
      const organizations = orgsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const companiesSnapshot = await admin.firestore().collection('companies').get();
      const companies = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({
        userOrgMappings,
        availableOrganizations: organizations,
        availableCompanies: companies,
        uniqueTenantIds: Array.from(tenantIds),
        suggestions: generateMappingSuggestions(userOrgMappings, Array.from(tenantIds))
      });

    } catch (error) {
      console.error('Error getting organization mappings:', error);
      return res.status(500).json({ 
        error: 'Failed to get organization mappings',
        details: error.message 
      });
    }
  });
});

function generateMappingSuggestions(userMappings, tenantIds) {
  const suggestions = [];
  
  // Suggest migrating tenantId to organizationId
  if (tenantIds.length > 0) {
    suggestions.push({
      type: 'migrate_tenant_to_org',
      description: 'Migrate tenantId fields to organizationId for better structure',
      affectedTenants: tenantIds,
      recommended: true
    });
  }

  // Suggest assigning organization based on user mappings
  const usersWithOrgs = userMappings.filter(u => u.organizationId);
  if (usersWithOrgs.length > 0) {
    suggestions.push({
      type: 'assign_by_user_org',
      description: 'Assign tickets to organizations based on submitter user organization',
      affectedUsers: usersWithOrgs.length,
      recommended: true
    });
  }

  return suggestions;
}