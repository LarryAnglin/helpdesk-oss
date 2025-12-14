const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Check current user assignments and fix user organization/company assignments
 */
exports.checkUserAssignments = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
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

    // Get all tenantUsers
    const tenantUsersSnapshot = await db.collection('tenantUsers').get();
    const tenantUsers = [];
    tenantUsersSnapshot.forEach(doc => {
      tenantUsers.push({ id: doc.id, ...doc.data() });
    });

    // Analyze user assignments
    const analysis = {
      totalUsers: users.length,
      organizations: organizations.length,
      companies: companies.length,
      tenantUsers: tenantUsers.length,
      userAssignments: {
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
      sampleUsers: users.slice(0, 5).map(user => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        organizationId: user.organizationId || null,
        companyId: user.companyId || null,
        currentTenantId: user.currentTenantId || null
      })),
      tenantUserMappings: tenantUsers.map(tu => ({
        id: tu.id,
        userId: tu.userId,
        tenantId: tu.tenantId,
        userEmail: users.find(u => u.id === tu.userId)?.email
      }))
    };

    // Count assignment types
    users.forEach(user => {
      if (user.organizationId) analysis.userAssignments.hasOrganizationId++;
      if (user.companyId) analysis.userAssignments.hasCompanyId++;
      if (user.currentTenantId) analysis.userAssignments.hasTenantId++;
      if (!user.organizationId && !user.companyId && !user.currentTenantId) {
        analysis.userAssignments.hasNone++;
      }
    });

    res.status(200).json({
      success: true,
      analysis,
      recommendations: {
        needsOrganizationAssignment: analysis.userAssignments.hasOrganizationId < analysis.totalUsers,
        needsCompanyAssignment: analysis.userAssignments.hasCompanyId < analysis.totalUsers,
        singleOrgCompany: organizations.length === 1 && companies.length === 1,
        targetOrganization: organizations.length === 1 ? organizations[0] : null,
        targetCompany: companies.length === 1 ? companies[0] : null
      }
    });

  } catch (error) {
    console.error('Error checking user assignments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update users to assign to specific organization and company
 */
exports.assignUsersToOrgAndCompany = onRequest({ 
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

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const updates = [];
    const batch = db.batch();

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      const updateData = {};
      let needsUpdate = false;

      // Add organizationId if provided and missing
      if (organizationId && !user.organizationId) {
        updateData.organizationId = organizationId;
        needsUpdate = true;
      }

      // Add companyId if provided and missing
      if (companyId && !user.companyId) {
        updateData.companyId = companyId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        if (!dryRun) {
          batch.update(doc.ref, updateData);
        }
        
        updates.push({
          userId: doc.id,
          email: user.email,
          displayName: user.displayName,
          currentAssignments: {
            organizationId: user.organizationId || null,
            companyId: user.companyId || null,
            role: user.role
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
      totalUsers: usersSnapshot.size,
      usersToUpdate: updates.length,
      updates: updates,
      message: dryRun 
        ? `Preview: ${updates.length} users would be updated`
        : `Successfully updated ${updates.length} users`
    });

  } catch (error) {
    console.error('Error assigning users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Auto-assign all tickets to a specific user (make them the assignee)
 */
exports.autoAssignAllTickets = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assigneeId, dryRun = true, onlyUnassigned = false } = req.body;

    if (!assigneeId) {
      return res.status(400).json({ 
        error: 'assigneeId is required' 
      });
    }

    const db = admin.firestore();
    
    // Verify user exists
    const userDoc = await db.collection('users').doc(assigneeId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Assignee user not found' });
    }

    const assigneeUser = userDoc.data();

    // Get tickets to assign
    let ticketsQuery = db.collection('tickets');
    
    // Only get unassigned tickets if requested
    if (onlyUnassigned) {
      ticketsQuery = ticketsQuery.where('assigneeId', '==', null);
    }

    const ticketsSnapshot = await ticketsQuery.get();
    const updates = [];
    const batch = db.batch();

    ticketsSnapshot.forEach(doc => {
      const ticket = doc.data();
      let needsUpdate = false;

      // Only update if not already assigned to this user
      if (ticket.assigneeId !== assigneeId) {
        // If onlyUnassigned is true, only update truly unassigned tickets
        if (!onlyUnassigned || !ticket.assigneeId) {
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const updateData = {
          assigneeId: assigneeId,
          status: ticket.status === 'Open' ? 'In Progress' : ticket.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (!dryRun) {
          batch.update(doc.ref, updateData);
        }
        
        updates.push({
          ticketId: doc.id,
          title: ticket.title,
          currentAssignee: ticket.assigneeId || 'Unassigned',
          newAssignee: assigneeId,
          currentStatus: ticket.status,
          newStatus: updateData.status
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
      assigneeUser: {
        id: assigneeId,
        email: assigneeUser.email,
        displayName: assigneeUser.displayName,
        role: assigneeUser.role
      },
      totalTickets: ticketsSnapshot.size,
      ticketsToUpdate: updates.length,
      updates: updates.slice(0, 10), // Show first 10 for preview
      message: dryRun 
        ? `Preview: ${updates.length} tickets would be assigned to ${assigneeUser.displayName || assigneeUser.email}`
        : `Successfully assigned ${updates.length} tickets to ${assigneeUser.displayName || assigneeUser.email}`
    });

  } catch (error) {
    console.error('Error auto-assigning tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});