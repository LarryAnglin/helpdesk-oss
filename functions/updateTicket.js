const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Update a ticket with security checks
exports.updateTicketHttp = functions.https.onRequest(async (req, res) => {
  // Handle CORS
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Get the authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized - no token provided' });
        return;
      }

      // Extract the token
      const token = authHeader.substring(7);
      
      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Authenticated user:', decodedToken.uid);
      
      const userId = decodedToken.uid;
      const userEmail = decodedToken.email;
      const data = req.body;

      try {
        // Get ticket ID and updates from request body
        const { ticketId, updates } = data;
        
        if (!ticketId) {
          res.status(400).json({ error: 'Ticket ID is required' });
          return;
        }

        if (!updates || typeof updates !== 'object') {
          res.status(400).json({ error: 'Updates object is required' });
          return;
        }

        // Get user data to check role
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        
        if (!userData) {
          res.status(404).json({ error: 'User profile not found' });
          return;
        }

        // Get the current ticket to check permissions
        const ticketDoc = await db.collection('tickets').doc(ticketId).get();
        
        if (!ticketDoc.exists) {
          res.status(404).json({ error: 'Ticket not found' });
          return;
        }

        const ticketData = ticketDoc.data();
        
        // Check permissions based on user role
        let canUpdate = false;
        
        if (userData.role === 'super_admin' || userData.role === 'system_admin' || userData.role === 'admin') {
          canUpdate = true; // Super admins, system admins, and admins can update any ticket
        } else if (userData.role === 'tech') {
          canUpdate = true; // Techs can update any ticket
        } else if (userData.role === 'user') {
          // Regular users can only update their own tickets, and only certain fields
          const isSubmitter = ticketData.submitterId === userId;
          const isParticipant = ticketData.participants && 
            ticketData.participants.some(p => p.userId === userId || p.email === userEmail);
          
          if (isSubmitter || isParticipant) {
            // Users can only update limited fields
            const allowedUserFields = ['priority', 'description', 'title'];
            const updateFields = Object.keys(updates);
            const hasRestrictedFields = updateFields.some(field => 
              !allowedUserFields.includes(field) && field !== 'updatedAt'
            );
            
            if (hasRestrictedFields) {
              res.status(403).json({ 
                error: 'Access denied - users can only update title, description, and priority' 
              });
              return;
            }
            
            canUpdate = true;
          }
        }

        if (!canUpdate) {
          res.status(403).json({ error: 'Access denied - you do not have permission to update this ticket' });
          return;
        }

        // Prepare update data
        let updateData = {
          ...updates,
          updatedAt: Date.now()
        };

        // Check if ticket is being resolved for SLA tracking
        const isBeingResolved = updates.status && 
                              (updates.status === 'Resolved' || updates.status === 'Closed');
        
        if (isBeingResolved) {
          // Set resolution time if not already set
          if (!ticketData.resolvedAt) {
            updateData.resolvedAt = Date.now();
          }
        }

        // Perform the update
        await db.collection('tickets').doc(ticketId).update(updateData);

        // Get the updated ticket
        const updatedTicketDoc = await db.collection('tickets').doc(ticketId).get();
        const updatedTicket = {
          id: updatedTicketDoc.id,
          ...updatedTicketDoc.data()
        };

        console.log(`User ${userId} (${userData.role}) updated ticket ${ticketId}`);
        
        res.status(200).json({
          success: true,
          ticket: updatedTicket,
          userRole: userData.role
        });
        
      } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
          error: 'Failed to update ticket',
          message: error.message
        });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      res.status(401).json({
        error: 'Authentication failed',
        message: authError.message
      });
    }
  });
});