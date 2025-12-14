/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
// You'll need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportCollection(collectionName) {
  try {
    console.log(`Exporting ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();
    const data = [];
    
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Write to file
    fs.writeFileSync(`${collectionName}.json`, JSON.stringify(data, null, 2));
    console.log(`Exported ${data.length} documents to ${collectionName}.json`);
    
    return data;
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

// Export tickets and projects
async function exportAll() {
  await exportCollection('tickets');
  await exportCollection('projects');
  process.exit(0);
}

exportAll();