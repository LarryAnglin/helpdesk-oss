const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { logger } = require("firebase-functions");

// Set global options
setGlobalOptions({ region: "us-central1" });

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_CONFIG) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const SETUP_COLLECTION = 'system';
const SETUP_DOC_ID = 'setup_config';

exports.checkSetupStatusHTTP = onCall(async (request) => {
  try {
    const { auth: contextAuth } = request;
    
    // Verify user is authenticated
    if (!contextAuth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get the current setup document
    const setupDoc = await db.collection(SETUP_COLLECTION).doc(SETUP_DOC_ID).get();
    
    let setupData = {};
    if (setupDoc.exists) {
      setupData = setupDoc.data();
    }

    // Check if setup is already complete
    if (setupData.isComplete) {
      logger.info('Setup is already complete', { userId: contextAuth.uid });
      return {
        success: true,
        message: 'Setup is already complete',
        setupStatus: setupData
      };
    }

    logger.info('Setup status check requested', { 
      userId: contextAuth.uid,
      currentSetup: setupData 
    });

    // Return current setup status
    return {
      success: true,
      message: 'Setup status retrieved',
      setupStatus: setupData,
      exists: setupDoc.exists
    };

  } catch (error) {
    logger.error('Error checking setup status:', error);
    throw new HttpsError('internal', 'Failed to check setup status');
  }
});

exports.markSetupCompleteHTTP = onCall(async (request) => {
  try {
    const { auth: contextAuth } = request;
    
    // Verify user is authenticated
    if (!contextAuth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get user data to check if they're admin
    const userDoc = await db.collection('users').doc(contextAuth.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Verify user is admin
    if (userData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admin users can mark setup as complete');
    }

    logger.info('Marking setup as complete', { 
      userId: contextAuth.uid,
      userEmail: userData.email 
    });

    // Create/update the setup document with complete status
    const setupData = {
      isComplete: true,
      hasFirebaseConfig: true,
      hasRequiredServices: true,
      hasAdminUser: true,
      servicesStatus: {
        firestore: true,
        authentication: true,
        storage: true,
        functions: true,
        hosting: true
      },
      secretsStatus: {
        emailExtension: true, // Assume email is working if they can create tickets
        vapidKey: false,
        algolia: false,
        geminiApi: false
      },
      completedAt: Date.now(),
      completedBy: contextAuth.uid,
      adminEmail: userData.email || contextAuth.email,
      lastUpdated: Date.now()
    };

    await db.collection(SETUP_COLLECTION).doc(SETUP_DOC_ID).set(setupData, { merge: true });

    logger.info('Setup marked as complete successfully', { 
      userId: contextAuth.uid,
      setupData 
    });

    return {
      success: true,
      message: 'Setup marked as complete successfully',
      setupStatus: setupData
    };

  } catch (error) {
    logger.error('Error marking setup as complete:', error);
    throw new HttpsError('internal', 'Failed to mark setup as complete');
  }
});

exports.resetSetupStatusHTTP = onCall(async (request) => {
  try {
    const { auth: contextAuth } = request;
    
    // Verify user is authenticated
    if (!contextAuth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Get user data to check if they're admin
    const userDoc = await db.collection('users').doc(contextAuth.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Verify user is admin
    if (userData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admin users can reset setup status');
    }

    logger.info('Resetting setup status', { 
      userId: contextAuth.uid,
      userEmail: userData.email 
    });

    // Reset the setup document
    const setupData = {
      isComplete: false,
      hasFirebaseConfig: false,
      hasRequiredServices: false,
      hasAdminUser: false,
      servicesStatus: {
        firestore: false,
        authentication: false,
        storage: false,
        functions: false,
        hosting: false
      },
      secretsStatus: {
        emailExtension: false,
        vapidKey: false,
        algolia: false,
        geminiApi: false
      },
      resetAt: Date.now(),
      resetBy: contextAuth.uid,
      lastUpdated: Date.now()
    };

    await db.collection(SETUP_COLLECTION).doc(SETUP_DOC_ID).set(setupData, { merge: true });

    logger.info('Setup status reset successfully', { 
      userId: contextAuth.uid,
      setupData 
    });

    return {
      success: true,
      message: 'Setup status reset successfully',
      setupStatus: setupData
    };

  } catch (error) {
    logger.error('Error resetting setup status:', error);
    throw new HttpsError('internal', 'Failed to reset setup status');
  }
});