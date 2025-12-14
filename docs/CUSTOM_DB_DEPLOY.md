<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Custom Firestore Database Deployment Guide

This Help Desk application is configured to use a custom Firestore database named `rclhelpdb` instead of the default database. This document provides instructions for deploying with this custom database configuration.

## Prerequisites

- Ensure you have created a Firestore database named `rclhelpdb` in your Firebase project
- Firebase CLI installed and logged in
- The project has been properly set up with the necessary permissions (see fix-functions-permissions.md)

## Environment Variables

Update your `.env.local` file to include the database name:

```
NEXT_PUBLIC_FIREBASE_DATABASE_ID=rclhelpdb
```

## Setup Configuration

Before deploying the resources, you need to configure Firebase Functions to use the custom database:

```bash
cd functions
chmod +x setup-database.sh
./setup-database.sh
```

This script will:
1. Configure Firebase Functions environment variables
2. Set the custom database ID in Firebase Functions configuration
3. Deploy the functions with the proper configuration

## Deploy Firebase Resources

1. **Deploy Firestore Rules**

   The rules have been updated to target the `rclhelpdb` database:

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Deploy Firestore Indexes**

   Deploy the indexes to the custom database:

   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Deploy Storage Rules**

   ```bash
   firebase deploy --only storage
   ```

4. **Deploy Functions (Alternative Method)**

   If the setup script doesn't work, you can manually configure and deploy:

   ```bash
   # Set environment variables
   firebase functions:config:set firestore.database_id=rclhelpdb
   
   # Deploy the functions
   firebase deploy --only functions
   ```

## Troubleshooting

### Functions Deployment Issues

If you encounter issues with deploying functions:

1. Make sure the database exists in your Firebase project
2. Check that the service account has the proper permissions (see fix-functions-permissions.md)
3. Verify in the Firebase Console that your custom database is properly set up

### Client Connection Issues

If the client application cannot connect to the custom database:

1. Make sure your `.env.local` file contains the correct database ID
2. Verify the Firestore rules are properly deployed to the custom database
3. Check the browser console for any connection errors

## Database Management

### Accessing the Custom Database in Firebase Console

1. Go to the Firebase Console
2. Select your project
3. Navigate to Firestore Database
4. Use the database selector at the top of the page to switch to `rclhelpdb`

### Backup and Restore

When using a custom database, you'll need to specify the database ID in any export/import commands:

```bash
gcloud firestore export gs://your-backup-bucket/path --database=rclhelpdb
```

## Migration

If you need to migrate data from another database to `rclhelpdb`, you can use the Firebase Admin SDK in a script or Cloud Function:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function migrateData() {
  // Source database (default or another custom database)
  const sourceDb = admin.firestore().database('sourceDb');
  
  // Target database (rclhelpdb)
  const targetDb = admin.firestore().database('rclhelpdb');
  
  // Get data from source
  const usersSnapshot = await sourceDb.collection('users').get();
  
  // Write to target
  const batch = targetDb.batch();
  usersSnapshot.forEach(doc => {
    batch.set(targetDb.collection('users').doc(doc.id), doc.data());
  });
  
  await batch.commit();
}
```