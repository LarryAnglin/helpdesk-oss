const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Check open tickets and their assignments
 */
exports.checkOpenTickets = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Get all tickets
    const ticketsSnapshot = await db.collection('tickets').get();
    const tickets = [];
    ticketsSnapshot.forEach(doc => {
      tickets.push({ id: doc.id, ...doc.data() });
    });

    // Filter and analyze
    const openTickets = tickets.filter(t => t.status === 'Open');
    const inProgressTickets = tickets.filter(t => t.status === 'In Progress');
    const assignedToLarry = tickets.filter(t => t.assigneeId === 'urTxRZ7Z14WRdkRNq1CYrIEie943');
    
    const statusBreakdown = {};
    tickets.forEach(ticket => {
      statusBreakdown[ticket.status] = (statusBreakdown[ticket.status] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      analysis: {
        totalTickets: tickets.length,
        openTickets: openTickets.length,
        inProgressTickets: inProgressTickets.length,
        assignedToLarry: assignedToLarry.length,
        statusBreakdown: statusBreakdown,
        openTicketSamples: openTickets.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          submitterId: t.submitterId,
          createdAt: t.createdAt
        })),
        inProgressSamples: inProgressTickets.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId
        }))
      }
    });

  } catch (error) {
    console.error('Error checking open tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});