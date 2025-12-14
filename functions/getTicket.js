const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Get a single ticket by ID with security checks
exports.getTicketHttp = functions.https.onRequest(async (req, res) => {
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
        // Get ticket ID from request body
        const { ticketId } = data;
        
        if (!ticketId) {
          res.status(400).json({ error: 'Ticket ID is required' });
          return;
        }

        // Get user data to check role
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        
        if (!userData) {
          res.status(404).json({ error: 'User profile not found' });
          return;
        }

        // Get the ticket
        const ticketDoc = await db.collection('tickets').doc(ticketId).get();
        
        if (!ticketDoc.exists) {
          res.status(404).json({ error: 'Ticket not found' });
          return;
        }

        const ticketData = ticketDoc.data();
        
        // Check permissions based on user role
        if (userData.role === 'user') {
          // Regular users can only see their own tickets or tickets they're participants in
          const isSubmitter = ticketData.submitterId === userId;
          const isParticipant = ticketData.participants && 
            ticketData.participants.some(p => p.userId === userId || p.email === userEmail);
          
          if (!isSubmitter && !isParticipant) {
            res.status(403).json({ error: 'Access denied - you do not have permission to view this ticket' });
            return;
          }
        }
        // Tech and admin users can see all tickets (no additional check needed)

        const ticket = {
          id: ticketDoc.id,
          ...ticketData
        };

        console.log(`User ${userId} (${userData.role}) accessed ticket ${ticketId}`);
        
        res.status(200).json({
          ticket,
          userRole: userData.role
        });
        
      } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
          error: 'Failed to fetch ticket',
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