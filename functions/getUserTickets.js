const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Default SLA settings
const DEFAULT_SLA_SETTINGS = {
  urgent: {
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    businessHoursOnly: false,
    enabled: true
  },
  high: {
    responseTimeHours: 4,
    resolutionTimeHours: 8,
    businessHoursOnly: false,
    enabled: true
  },
  medium: {
    responseTimeHours: 8,
    resolutionTimeHours: 24,
    businessHoursOnly: true,
    enabled: true
  },
  low: {
    responseTimeHours: 24,
    resolutionTimeHours: 72,
    businessHoursOnly: true,
    enabled: true
  },
  businessHours: {
    start: "09:00",
    end: "17:00",
    days: [1, 2, 3, 4, 5], // Monday-Friday
    timezone: "America/Chicago"
  }
};

// Calculate SLA status for a ticket
function calculateSLAStatus(createdAt, priority, firstResponseAt, resolvedAt, slaSettings, currentTime = Date.now()) {
  if (!slaSettings || !priority) return undefined;
  
  const priorityKey = priority.toLowerCase();
  const config = slaSettings[priorityKey];
  
  if (!config || !config.enabled) return undefined;
  
  // Calculate deadlines
  let responseDeadline, resolutionDeadline;
  
  if (config.businessHoursOnly) {
    // For business hours, add complex calculation (simplified here)
    responseDeadline = createdAt + (config.responseTimeHours * 60 * 60 * 1000);
    resolutionDeadline = createdAt + (config.resolutionTimeHours * 60 * 60 * 1000);
  } else {
    responseDeadline = createdAt + (config.responseTimeHours * 60 * 60 * 1000);
    resolutionDeadline = createdAt + (config.resolutionTimeHours * 60 * 60 * 1000);
  }
  
  // Calculate status
  function getSLAStatus(deadline, actualTime, currentTime) {
    if (deadline === 0) return 'pending';
    
    if (actualTime) {
      return actualTime <= deadline ? 'met' : 'breached';
    }
    
    if (currentTime > deadline) {
      return 'breached';
    } else if ((deadline - currentTime) < (deadline - createdAt) * 0.2) {
      return 'at_risk';
    } else {
      return 'pending';
    }
  }
  
  const responseStatus = getSLAStatus(responseDeadline, firstResponseAt, currentTime);
  const resolutionStatus = getSLAStatus(resolutionDeadline, resolvedAt, currentTime);
  
  return {
    responseDeadline,
    resolutionDeadline,
    responseStatus,
    resolutionStatus,
    responseTime: firstResponseAt ? (firstResponseAt - createdAt) / (1000 * 60 * 60) : undefined,
    resolutionTime: resolvedAt ? (resolvedAt - createdAt) / (1000 * 60 * 60) : undefined,
    isBusinessHours: config.businessHoursOnly
  };
}

// Use HTTP function with manual auth handling
exports.getUserTicketsHttp = functions.https.onRequest(async (req, res) => {
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
    // Get user data to check role
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    if (!userData) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found.'
      );
    }

    // Build the query based on user role
    let ticketsQuery = db.collection('tickets');
    
    // Apply filters based on the data passed
    const { status, priority, limit = 100 } = data || {};
    
    // For regular users, only show their own tickets
    if (userData.role === 'user') {
      ticketsQuery = ticketsQuery.where('submitterId', '==', userId);
    } else if (userData.role === 'super_admin' || userData.role === 'system_admin' || userData.role === 'tech' || userData.role === 'admin') {
      // Super admins, system admins, techs and admins can see all tickets
      // Apply optional filters if provided
      if (data?.assigneeId) {
        ticketsQuery = ticketsQuery.where('assigneeId', '==', data.assigneeId);
      }
      if (data?.submitterId) {
        ticketsQuery = ticketsQuery.where('submitterId', '==', data.submitterId);
      }
    } else {
      // Unknown role - default to user behavior
      ticketsQuery = ticketsQuery.where('submitterId', '==', userId);
    }
    
    // Apply common filters
    if (status && status !== 'All') {
      ticketsQuery = ticketsQuery.where('status', '==', status);
    }
    if (priority) {
      ticketsQuery = ticketsQuery.where('priority', '==', priority);
    }
    
    // Order by creation date (newest first) and limit
    ticketsQuery = ticketsQuery
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    // Execute the query
    const ticketsSnapshot = await ticketsQuery.get();
    
    // Transform the data
    const tickets = [];
    ticketsSnapshot.forEach(doc => {
      const ticketData = doc.data();
      
      // For regular users, double-check they should see this ticket
      if (userData.role === 'user') {
        // Check if user is submitter or participant
        const isSubmitter = ticketData.submitterId === userId;
        const isParticipant = ticketData.participants && 
          ticketData.participants.some(p => p.userId === userId || p.email === userEmail);
        
        if (!isSubmitter && !isParticipant) {
          // Skip this ticket - user shouldn't see it
          return;
        }
      }
      
      // Calculate SLA status for the ticket
      let slaStatus = null;
      if (ticketData.createdAt && ticketData.priority) {
        const createdAt = ticketData.createdAt?.toMillis ? ticketData.createdAt.toMillis() : ticketData.createdAt;
        const firstResponseAt = ticketData.firstResponseAt?.toMillis ? ticketData.firstResponseAt.toMillis() : ticketData.firstResponseAt;
        const resolvedAt = ticketData.resolvedAt?.toMillis ? ticketData.resolvedAt.toMillis() : ticketData.resolvedAt;
        
        slaStatus = calculateSLAStatus(
          createdAt,
          ticketData.priority,
          firstResponseAt,
          resolvedAt,
          DEFAULT_SLA_SETTINGS
        );
      }
      
      tickets.push({
        id: doc.id,
        ...ticketData,
        sla: slaStatus
      });
    });
    
    console.log(`User ${userId} (${userData.role}) fetched ${tickets.length} tickets`);
    
    res.status(200).json({
      tickets,
      count: tickets.length,
      userRole: userData.role
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch tickets',
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