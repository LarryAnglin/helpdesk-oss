const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Manually fix user claims by updating the user document to trigger the sync
 */
exports.manualClaimsFix = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  try {
    const userId = 'urTxRZ7Z14WRdkRNq1CYrIEie943'; // Larry's user ID
    const tenantId = 'CVnhIgM8Hy1FuuN0JUwr';
    
    const db = admin.firestore();
    
    // Get current user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    // Set the custom claims directly
    const customClaims = {
      role: 'super_admin',
      tenantId: tenantId,
      organizationId: userData.organizationId || null,
      companyId: userData.companyId || null,
      updatedAt: Date.now()
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Also update the user document to ensure currentTenantId is set
    await db.collection('users').doc(userId).update({
      currentTenantId: tenantId,
      role: 'super_admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      success: true,
      message: 'Custom claims fixed for Larry',
      customClaims: customClaims,
      userDocument: {
        currentTenantId: tenantId,
        role: 'super_admin'
      }
    });

  } catch (error) {
    console.error('Error fixing claims:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});