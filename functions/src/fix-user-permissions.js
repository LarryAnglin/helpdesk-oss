const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Fix Larry's user permissions and custom claims
 */
exports.fixUserPermissions = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  try {
    const userId = 'urTxRZ7Z14WRdkRNq1CYrIEie943'; // Larry's user ID
    const tenantId = 'CVnhIgM8Hy1FuuN0JUwr';
    const organizationId = 'NybZTpEnwtfkRQrw3eh4';
    const companyId = 'DEgO9xQopLn4D9jEvboc';
    
    const db = admin.firestore();
    
    // 1. Fix Firebase Auth custom claims
    const customClaims = {
      role: 'super_admin',
      tenantId: tenantId,
      organizationId: organizationId,
      companyId: companyId,
      updatedAt: Date.now()
    };
    
    await admin.auth().setCustomUserClaims(userId, customClaims);
    
    // 2. Update user document
    await db.collection('users').doc(userId).update({
      role: 'super_admin',
      currentTenantId: tenantId,
      organizationId: organizationId,
      companyId: companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 3. Fix tenant permissions - find and update tenantUsers documents
    const tenantUsersQuery = await db.collection('tenantUsers')
      .where('userId', '==', userId)
      .where('tenantId', '==', tenantId)
      .get();
    
    const permissionUpdates = [];
    
    tenantUsersQuery.forEach(doc => {
      permissionUpdates.push(
        db.collection('tenantUsers').doc(doc.id).update({
          role: 'admin', // Upgrade from member to admin
          permissions: {
            canCreateTickets: true,
            canViewAllTickets: true,     // ← This was the key issue!
            canManageUsers: true,
            canManageSettings: true
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
    });
    
    await Promise.all(permissionUpdates);
    
    res.status(200).json({
      success: true,
      message: 'Fixed user permissions for Larry',
      customClaims: customClaims,
      tenantUsersUpdated: permissionUpdates.length,
      changes: {
        'Firebase Auth': 'Added tenantId, organizationId, companyId to custom claims',
        'User Document': 'Updated role and IDs',
        'Tenant Permissions': 'Set canViewAllTickets: true, role: admin'
      }
    });

  } catch (error) {
    console.error('Error fixing user permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});