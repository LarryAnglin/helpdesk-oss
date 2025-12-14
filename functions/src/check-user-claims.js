const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * Check user's custom claims and compare with user document
 */
exports.checkUserClaims = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }

    const db = admin.firestore();
    
    // Get user record from Firebase Auth
    const userRecord = await admin.auth().getUser(userId);
    
    // Get user document from Firestore  
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Get user's tenant memberships
    const tenantUsersQuery = await db.collection('tenantUsers')
      .where('userId', '==', userId)
      .get();
    
    const tenantMemberships = [];
    tenantUsersQuery.forEach(doc => {
      tenantMemberships.push({ id: doc.id, ...doc.data() });
    });

    const analysis = {
      userId: userId,
      email: userRecord.email,
      firebaseAuth: {
        customClaims: userRecord.customClaims || {},
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled
      },
      firestoreUser: userData ? {
        role: userData.role,
        organizationId: userData.organizationId,
        companyId: userData.companyId,
        currentTenantId: userData.currentTenantId
      } : null,
      tenantMemberships: tenantMemberships,
      issues: []
    };

    // Check for issues
    if (!userData) {
      analysis.issues.push('User document does not exist in Firestore');
    }

    if (!userRecord.customClaims || Object.keys(userRecord.customClaims).length === 0) {
      analysis.issues.push('No custom claims set in Firebase Auth');
    }

    if (userData && userRecord.customClaims) {
      // Check if custom claims match user document
      if (userRecord.customClaims.role !== userData.role) {
        analysis.issues.push(`Role mismatch: Auth claims=${userRecord.customClaims.role}, Firestore=${userData.role}`);
      }
      
      if (userRecord.customClaims.tenantId !== userData.currentTenantId) {
        analysis.issues.push(`TenantId mismatch: Auth claims=${userRecord.customClaims.tenantId}, Firestore=${userData.currentTenantId}`);
      }
    }

    if (tenantMemberships.length === 0) {
      analysis.issues.push('No tenant memberships found');
    }

    res.status(200).json({
      success: true,
      analysis,
      recommendations: {
        needsClaimsSync: analysis.issues.length > 0,
        hasAdminRole: userData?.role && ['admin', 'company_admin', 'organization_admin', 'system_admin', 'super_admin'].includes(userData.role),
        hasTenantAccess: tenantMemberships.length > 0
      }
    });

  } catch (error) {
    console.error('Error checking user claims:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sync user claims to match Firestore user document
 */
exports.syncUserClaims = onRequest({ 
  cors: true,
  invoker: 'public'
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const db = admin.firestore();
    
    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User document not found' });
    }

    const userData = userDoc.data();
    
    // Get user's primary tenant membership
    const tenantUsersQuery = await db.collection('tenantUsers')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    let primaryTenantId = userData.currentTenantId;
    if (!primaryTenantId && !tenantUsersQuery.empty) {
      primaryTenantId = tenantUsersQuery.docs[0].data().tenantId;
    }

    // Set custom claims to match user document
    const customClaims = {
      role: userData.role || 'user',
      tenantId: primaryTenantId || null,
      organizationId: userData.organizationId || null,
      companyId: userData.companyId || null
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);

    // Update user document with current tenant if it was missing
    if (!userData.currentTenantId && primaryTenantId) {
      await db.collection('users').doc(userId).update({
        currentTenantId: primaryTenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.status(200).json({
      success: true,
      userId: userId,
      customClaims: customClaims,
      message: 'Custom claims synced successfully'
    });

  } catch (error) {
    console.error('Error syncing user claims:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});