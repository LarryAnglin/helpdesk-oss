const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');
const { Parser } = require('json2csv');
const { verifyIdToken } = require('./utils/auth');

const corsHandler = cors({ origin: true });

/**
 * Export tickets to CSV format
 * Supports filtering and customization options
 */
exports.exportCSV = onRequest(async (req, res) => {
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
      
      // Only admins and techs can export
      if (userRole !== 'admin' && userRole !== 'tech') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get export options from request
      const {
        ticketIds = null,
        includeReplies = false,
        includeCustomFields = false,
        includeAttachments = false,
        dateFrom = null,
        dateTo = null,
        status = null,
        priority = null,
        assigneeId = null,
        tenantId = userData.currentTenantId
      } = req.body;

      // Build query
      let query = admin.firestore().collection('tickets');
      
      // Apply tenant filter
      if (tenantId) {
        query = query.where('tenantId', '==', tenantId);
      }

      // Apply filters
      if (status) {
        query = query.where('status', '==', status);
      }
      if (priority) {
        query = query.where('priority', '==', priority);
      }
      if (assigneeId) {
        query = query.where('assigneeId', '==', assigneeId);
      }

      // Get tickets
      const snapshot = await query.get();
      let tickets = [];
      
      snapshot.forEach(doc => {
        const ticket = { id: doc.id, ...doc.data() };
        
        // Apply date filters (post-query since Firestore doesn't support range queries well)
        const createdAt = ticket.createdAt?.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
        if (dateFrom && createdAt < new Date(dateFrom)) return;
        if (dateTo && createdAt > new Date(dateTo)) return;
        
        // Apply ticketIds filter if specified
        if (ticketIds && !ticketIds.includes(doc.id)) return;
        
        tickets.push(ticket);
      });

      // Get user data for email mapping
      const userIds = new Set();
      tickets.forEach(ticket => {
        if (ticket.submitterId) userIds.add(ticket.submitterId);
        if (ticket.assigneeId) userIds.add(ticket.assigneeId);
      });

      const userMap = {};
      if (userIds.size > 0) {
        const userDocs = await admin.firestore().collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', Array.from(userIds))
          .get();
        
        userDocs.forEach(doc => {
          const user = doc.data();
          userMap[doc.id] = {
            email: user.email,
            displayName: user.displayName
          };
        });
      }

      // Transform tickets for CSV
      const csvData = tickets.map(ticket => {
        const row = {
          id: ticket.id,
          title: ticket.title || '',
          description: ticket.description || '',
          status: ticket.status || '',
          priority: ticket.priority || '',
          location: ticket.location || '',
          computer: ticket.computer || '',
          submitterName: ticket.name || '',
          submitterEmail: ticket.email || userMap[ticket.submitterId]?.email || '',
          submitterPhone: ticket.phone || '',
          contactMethod: ticket.contactMethod || '',
          assigneeEmail: userMap[ticket.assigneeId]?.email || '',
          assigneeName: userMap[ticket.assigneeId]?.displayName || '',
          createdAt: ticket.createdAt?.toDate ? ticket.createdAt.toDate().toISOString() : ticket.createdAt || '',
          updatedAt: ticket.updatedAt?.toDate ? ticket.updatedAt.toDate().toISOString() : ticket.updatedAt || '',
          resolvedAt: ticket.resolvedAt?.toDate ? ticket.resolvedAt.toDate().toISOString() : ticket.resolvedAt || '',
          isOnVpn: ticket.isOnVpn || false,
          replyCount: ticket.replies?.length || 0,
          attachmentCount: ticket.attachments?.length || 0,
          attachmentNames: ticket.attachments?.map(att => att.name || att.fileName).join('; ') || '',
          attachmentSizes: ticket.attachments?.map(att => att.size || 0).join('; ') || '',
          attachmentTypes: ticket.attachments?.map(att => att.type || att.contentType).join('; ') || ''
        };

        // Add custom fields if requested
        if (includeCustomFields && ticket.customFields) {
          ticket.customFields.forEach(field => {
            row[`custom_${field.name || field.id}`] = field.value || '';
          });
        }

        return row;
      });

      // Define fields for CSV
      const fields = [
        { label: 'Ticket ID', value: 'id' },
        { label: 'Title', value: 'title' },
        { label: 'Description', value: 'description' },
        { label: 'Status', value: 'status' },
        { label: 'Priority', value: 'priority' },
        { label: 'Location', value: 'location' },
        { label: 'Computer', value: 'computer' },
        { label: 'Submitter Name', value: 'submitterName' },
        { label: 'Submitter Email', value: 'submitterEmail' },
        { label: 'Submitter Phone', value: 'submitterPhone' },
        { label: 'Contact Method', value: 'contactMethod' },
        { label: 'Assignee Email', value: 'assigneeEmail' },
        { label: 'Assignee Name', value: 'assigneeName' },
        { label: 'Created At', value: 'createdAt' },
        { label: 'Updated At', value: 'updatedAt' },
        { label: 'Resolved At', value: 'resolvedAt' },
        { label: 'Is On VPN', value: 'isOnVpn' },
        { label: 'Reply Count', value: 'replyCount' },
        { label: 'Attachment Count', value: 'attachmentCount' }
      ];

      // Add attachment fields if requested
      if (includeAttachments) {
        fields.push(
          { label: 'Attachment Names', value: 'attachmentNames' },
          { label: 'Attachment Sizes', value: 'attachmentSizes' },
          { label: 'Attachment Types', value: 'attachmentTypes' }
        );
      }

      // Add custom field columns if present
      if (includeCustomFields && csvData.length > 0) {
        const customFieldKeys = Object.keys(csvData[0]).filter(key => key.startsWith('custom_'));
        customFieldKeys.forEach(key => {
          fields.push({
            label: key.replace('custom_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: key
          });
        });
      }

      // Create CSV
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(csvData);

      // Create separate CSV files for replies and attachments if requested
      let repliesCSV = '';
      let attachmentsCSV = '';

      if (includeReplies) {
        const repliesData = [];
        tickets.forEach(ticket => {
          if (ticket.replies && ticket.replies.length > 0) {
            ticket.replies.forEach(reply => {
              repliesData.push({
                ticketId: ticket.id,
                replyId: reply.id || '',
                message: reply.message || '',
                authorName: reply.authorName || '',
                authorEmail: reply.authorEmail || '',
                authorRole: reply.authorRole || '',
                isInternal: reply.isInternal || false,
                createdAt: reply.createdAt?.toDate ? reply.createdAt.toDate().toISOString() : reply.createdAt || ''
              });
            });
          }
        });

        if (repliesData.length > 0) {
          const replyFields = [
            { label: 'Ticket ID', value: 'ticketId' },
            { label: 'Reply ID', value: 'replyId' },
            { label: 'Message', value: 'message' },
            { label: 'Author Name', value: 'authorName' },
            { label: 'Author Email', value: 'authorEmail' },
            { label: 'Author Role', value: 'authorRole' },
            { label: 'Is Internal', value: 'isInternal' },
            { label: 'Created At', value: 'createdAt' }
          ];
          
          const repliesParser = new Parser({ fields: replyFields });
          repliesCSV = repliesParser.parse(repliesData);
        }
      }

      // If attachments are requested, create a separate CSV
      if (includeAttachments) {
        const attachmentsData = [];
        tickets.forEach(ticket => {
          if (ticket.attachments && ticket.attachments.length > 0) {
            ticket.attachments.forEach(attachment => {
              attachmentsData.push({
                ticketId: ticket.id,
                fileName: attachment.name || attachment.fileName || '',
                originalName: attachment.originalName || '',
                size: attachment.size || 0,
                type: attachment.type || attachment.contentType || '',
                url: attachment.url || attachment.downloadURL || '',
                uploadedAt: attachment.uploadedAt?.toDate ? attachment.uploadedAt.toDate().toISOString() : attachment.uploadedAt || '',
                uploadedBy: attachment.uploadedBy || ''
              });
            });
          }
        });

        if (attachmentsData.length > 0) {
          const attachmentFields = [
            { label: 'Ticket ID', value: 'ticketId' },
            { label: 'File Name', value: 'fileName' },
            { label: 'Original Name', value: 'originalName' },
            { label: 'Size (bytes)', value: 'size' },
            { label: 'Type', value: 'type' },
            { label: 'URL', value: 'url' },
            { label: 'Uploaded At', value: 'uploadedAt' },
            { label: 'Uploaded By', value: 'uploadedBy' }
          ];
          
          const attachmentsParser = new Parser({ fields: attachmentFields });
          attachmentsCSV = attachmentsParser.parse(attachmentsData);
        }
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `tickets_export_${timestamp}.csv`;

      // Return response
      if (includeReplies && repliesCSV || includeAttachments && attachmentsCSV) {
        // Return JSON with multiple CSVs
        const response = {
          success: true,
          data: {
            tickets: {
              filename: filename,
              content: csv,
              count: csvData.length
            }
          }
        };

        if (includeReplies && repliesCSV) {
          response.data.replies = {
            filename: `replies_${timestamp}.csv`,
            content: repliesCSV
          };
        }

        if (includeAttachments && attachmentsCSV) {
          response.data.attachments = {
            filename: `attachments_${timestamp}.csv`,
            content: attachmentsCSV
          };
        }

        res.status(200).json(response);
      } else {
        // Return single CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
      }

    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ 
        error: 'Failed to export tickets',
        details: error.message 
      });
    }
  });
});