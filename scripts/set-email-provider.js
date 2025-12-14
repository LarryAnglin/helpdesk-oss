/*
 * Set email provider in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setEmailProvider() {
  try {
    const provider = process.argv[2] || 'sendgrid';

    console.log(`Setting email provider to: ${provider}`);

    await db.collection('config').doc('email').set({
      provider: provider,
      updatedAt: Date.now(),
      updatedBy: 'system'
    });

    console.log(`✅ Email provider set to '${provider}' in Firestore`);

    // Verify
    const doc = await db.collection('config').doc('email').get();
    console.log('Current config:', doc.data());

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting email provider:', error);
    process.exit(1);
  }
}

setEmailProvider();
