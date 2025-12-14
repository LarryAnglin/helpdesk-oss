const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Add a reply to a ticket with security checks
exports.addReplyHttp = functions.https.onRequest(async (req, res) => {
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
        // Get ticket ID and reply data from request body
        const { ticketId, message, isPrivate } = data;
        
        if (!ticketId) {
          res.status(400).json({ error: 'Ticket ID is required' });
          return;
        }

        if (!message || typeof message !== 'string' || message.trim() === '') {
          res.status(400).json({ error: 'Message is required' });
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
        let canReply = false;
        
        if (userData.role === 'super_admin' || userData.role === 'system_admin' || userData.role === 'admin' || userData.role === 'tech') {
          canReply = true; // Super admins, system admins, admins and techs can reply to any ticket
        } else if (userData.role === 'user') {
          // Regular users can only reply to their own tickets or tickets they're participants in
          const isSubmitter = ticketData.submitterId === userId;
          const isParticipant = ticketData.participants && 
            ticketData.participants.some(p => p.userId === userId || p.email === userEmail);
          
          if (isSubmitter || isParticipant) {
            canReply = true;
            // Regular users cannot create private replies
            if (isPrivate) {
              res.status(403).json({ 
                error: 'Access denied - regular users cannot create private replies' 
              });
              return;
            }
          }
        }

        if (!canReply) {
          res.status(403).json({ error: 'Access denied - you do not have permission to reply to this ticket' });
          return;
        }

        // Generate a unique ID for the reply
        const { v4: uuidv4 } = require('uuid');
        
        // Create the reply object
        const reply = {
          id: uuidv4(),
          authorId: userId,
          authorName: userData.displayName || userData.email || 'Unknown User',
          authorEmail: userData.email || userEmail,
          message: message.trim(),
          attachments: [], // Note: File uploads would need additional handling
          createdAt: Date.now(),
          isPrivate: isPrivate || false
        };

        // Add the reply to the ticket's replies array
        const replies = [...(ticketData.replies || []), reply];
        
        // Check if this is the first non-private response from staff (for SLA tracking)
        const isFirstResponse = !ticketData.firstResponseAt && 
                               !reply.isPrivate && 
                               userId !== ticketData.submitterId;
        
        let updateData = { 
          replies,
          updatedAt: Date.now()
        };
        
        // If this is the first response, track it for SLA
        if (isFirstResponse) {
          updateData.firstResponseAt = Date.now();
        }
        
        // Update the ticket
        await db.collection('tickets').doc(ticketId).update(updateData);

        // Get the updated ticket
        const updatedTicketDoc = await db.collection('tickets').doc(ticketId).get();
        const updatedTicket = {
          id: updatedTicketDoc.id,
          ...updatedTicketDoc.data()
        };

        console.log(`User ${userId} (${userData.role}) added reply to ticket ${ticketId}`);
        
        res.status(200).json({
          success: true,
          reply,
          ticket: updatedTicket,
          userRole: userData.role
        });
        
      } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({
          error: 'Failed to add reply',
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