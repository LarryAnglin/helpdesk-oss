const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');

const corsHandler = cors({ origin: true });

/**
 * Check current ticket assignments and organization/company structure
 */
exports.checkTicketAssignments = onRequest({ 
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

      // Get all organizations
      const orgsSnapshot = await db.collection('organizations').get();
      const organizations = [];
      orgsSnapshot.forEach(doc => {
        organizations.push({ id: doc.id, ...doc.data() });
      });

      // Get all companies
      const companiesSnapshot = await db.collection('companies').get();
      const companies = [];
      companiesSnapshot.forEach(doc => {
        companies.push({ id: doc.id, ...doc.data() });
      });

      // Analyze ticket assignments
      const analysis = {
        totalTickets: tickets.length,
        organizations: organizations.length,
        companies: companies.length,
        ticketAssignments: {
          hasOrganizationId: 0,
          hasCompanyId: 0,
          hasTenantId: 0,
          hasNone: 0
        },
        organizationsList: organizations.map(org => ({
          id: org.id,
          name: org.name,
          status: org.status
        })),
        companiesList: companies.map(comp => ({
          id: comp.id,
          name: comp.name,
          organizationId: comp.organizationId
        })),
        sampleTickets: tickets.slice(0, 5).map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          organizationId: ticket.organizationId || null,
          companyId: ticket.companyId || null,
          tenantId: ticket.tenantId || null,
          submitterId: ticket.submitterId || null
        }))
      };

      // Count assignment types
      tickets.forEach(ticket => {
        if (ticket.organizationId) analysis.ticketAssignments.hasOrganizationId++;
        if (ticket.companyId) analysis.ticketAssignments.hasCompanyId++;
        if (ticket.tenantId) analysis.ticketAssignments.hasTenantId++;
        if (!ticket.organizationId && !ticket.companyId && !ticket.tenantId) {
          analysis.ticketAssignments.hasNone++;
        }
      });

      res.status(200).json({
        success: true,
        analysis,
        recommendations: {
          needsOrganizationAssignment: analysis.ticketAssignments.hasOrganizationId < analysis.totalTickets,
          needsCompanyAssignment: analysis.ticketAssignments.hasCompanyId < analysis.totalTickets,
          hasMultipleOrganizations: organizations.length > 1,
          hasMultipleCompanies: companies.length > 1
        }
      });

  } catch (error) {
    console.error('Error checking ticket assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update all tickets to assign to a specific organization and company
 */
exports.assignTicketsToOrgAndCompany = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

    try {
      const { organizationId, companyId, dryRun = true } = req.body;

      if (!organizationId && !companyId) {
        return res.status(400).json({ 
          error: 'Either organizationId or companyId must be provided' 
        });
      }

      const db = admin.firestore();
      
      // Verify organization exists
      if (organizationId) {
        const orgDoc = await db.collection('organizations').doc(organizationId).get();
        if (!orgDoc.exists) {
          return res.status(404).json({ error: 'Organization not found' });
        }
      }

      // Verify company exists
      if (companyId) {
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) {
          return res.status(404).json({ error: 'Company not found' });
        }
      }

      // Get all tickets
      const ticketsSnapshot = await db.collection('tickets').get();
      const updates = [];
      const batch = db.batch();

      ticketsSnapshot.forEach(doc => {
        const ticket = doc.data();
        const updateData = {};
        let needsUpdate = false;

        // Add organizationId if provided and missing
        if (organizationId && !ticket.organizationId) {
          updateData.organizationId = organizationId;
          needsUpdate = true;
        }

        // Add companyId if provided and missing
        if (companyId && !ticket.companyId) {
          updateData.companyId = companyId;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          
          if (!dryRun) {
            batch.update(doc.ref, updateData);
          }
          
          updates.push({
            ticketId: doc.id,
            title: ticket.title,
            currentAssignments: {
              organizationId: ticket.organizationId || null,
              companyId: ticket.companyId || null,
              tenantId: ticket.tenantId || null
            },
            proposedUpdates: updateData
          });
        }
      });

      // Execute batch update if not dry run
      if (!dryRun && updates.length > 0) {
        await batch.commit();
      }

      res.status(200).json({
        success: true,
        dryRun,
        totalTickets: ticketsSnapshot.size,
        ticketsToUpdate: updates.length,
        updates: updates,
        message: dryRun 
          ? `Preview: ${updates.length} tickets would be updated`
          : `Successfully updated ${updates.length} tickets`
      });

  } catch (error) {
    console.error('Error assigning tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});