const admin = require('firebase-admin');

/**
 * Verify Firebase ID token
 * @param {string} idToken - The Firebase ID token to verify
 * @returns {Promise<admin.auth.DecodedIdToken>} The decoded token
 */
exports.verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid authentication token');
  }
};