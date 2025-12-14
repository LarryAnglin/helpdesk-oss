const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Rollback a completed import operation
 * Restores the system to its state before the import
 */
exports.rollbackImport = onRequest(async (req, res) => {
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
      
      // Only admins can rollback imports
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can rollback imports' });
      }

      const {
        importId,
        dryRun = false
      } = req.body;

      if (!importId) {
        return res.status(400).json({ error: 'Import ID is required' });
      }

      // Get the import record
      const importDoc = await admin.firestore()
        .collection('importHistory')
        .doc(importId)
        .get();

      if (!importDoc.exists) {
        return res.status(404).json({ error: 'Import record not found' });
      }

      const importData = importDoc.data();
      
      if (importData.rolledBack) {
        return res.status(400).json({ error: 'Import has already been rolled back' });
      }

      if (!importData.backup || !importData.createdTicketIds) {
        return res.status(400).json({ error: 'Import backup data not available' });
      }

      const results = {
        ticketsDeleted: 0,
        ticketsRestored: 0,
        usersDeleted: 0,
        errors: []
      };

      // Start rollback process
      const batch = admin.firestore().batch();
      let batchCount = 0;
      const maxBatchSize = 500;

      try {
        // 1. Delete tickets that were created during import
        if (importData.createdTicketIds && importData.createdTicketIds.length > 0) {
          for (const ticketId of importData.createdTicketIds) {
            if (!dryRun) {
              const ticketRef = admin.firestore().collection('tickets').doc(ticketId);
              batch.delete(ticketRef);
              batchCount++;
            }
            results.ticketsDeleted++;

            if (batchCount >= maxBatchSize) {
              if (!dryRun) {
                await batch.commit();
              }
              batchCount = 0;
            }
          }
        }

        // 2. Restore tickets that were updated during import
        if (importData.backup && importData.backup.updatedTickets) {
          for (const backupTicket of importData.backup.updatedTickets) {
            if (!dryRun) {
              const ticketRef = admin.firestore().collection('tickets').doc(backupTicket.id);
              batch.set(ticketRef, backupTicket);
              batchCount++;
            }
            results.ticketsRestored++;

            if (batchCount >= maxBatchSize) {
              if (!dryRun) {
                await batch.commit();
              }
              batchCount = 0;
            }
          }
        }

        // 3. Delete users that were created during import
        if (importData.createdUserIds && importData.createdUserIds.length > 0) {
          for (const userId of importData.createdUserIds) {
            if (!dryRun) {
              const userRef = admin.firestore().collection('users').doc(userId);
              batch.delete(userRef);
              batchCount++;
            }
            results.usersDeleted++;

            if (batchCount >= maxBatchSize) {
              if (!dryRun) {
                await batch.commit();
              }
              batchCount = 0;
            }
          }
        }

        // Commit remaining operations
        if (batchCount > 0 && !dryRun) {
          await batch.commit();
        }

        // 4. Mark import as rolled back
        if (!dryRun) {
          await admin.firestore()
            .collection('importHistory')
            .doc(importId)
            .update({
              rolledBack: true,
              rollbackDate: admin.firestore.FieldValue.serverTimestamp(),
              rollbackBy: userId,
              rollbackResults: results
            });
        }

        res.status(200).json({
          success: true,
          dryRun,
          results,
          message: dryRun ? 'Rollback preview completed' : 'Import successfully rolled back'
        });

      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
        results.errors.push({
          operation: 'rollback',
          error: rollbackError.message
        });

        res.status(500).json({
          success: false,
          results,
          error: 'Rollback failed partially',
          details: rollbackError.message
        });
      }

    } catch (error) {
      console.error('Error in rollback operation:', error);
      res.status(500).json({ 
        error: 'Failed to rollback import',
        details: error.message 
      });
    }
  });
});

/**
 * List import history for rollback purposes
 */
exports.getImportHistory = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
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
      
      // Only admins can view import history
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can view import history' });
      }

      const tenantId = userData.currentTenantId;
      
      // Get import history for the current tenant
      const importQuery = await admin.firestore()
        .collection('importHistory')
        .where('tenantId', '==', tenantId)
        .orderBy('importDate', 'desc')
        .limit(50)
        .get();

      const imports = [];
      importQuery.forEach(doc => {
        const data = doc.data();
        imports.push({
          id: doc.id,
          importDate: data.importDate,
          importBy: data.importBy,
          fileType: data.fileType,
          fileName: data.fileName,
          results: data.results,
          rolledBack: data.rolledBack || false,
          rollbackDate: data.rollbackDate,
          rollbackBy: data.rollbackBy,
          canRollback: !data.rolledBack && data.backup && data.createdTicketIds
        });
      });

      res.status(200).json({
        success: true,
        imports
      });

    } catch (error) {
      console.error('Error getting import history:', error);
      res.status(500).json({ 
        error: 'Failed to get import history',
        details: error.message 
      });
    }
  });
});