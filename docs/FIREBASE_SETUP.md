<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Firebase Setup for Help Desk

This guide walks you through setting up Firebase services for the Help Desk application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Help Desk")
4. Choose whether to enable Google Analytics (recommended)
5. Accept the terms and create the project

## 2. Register Your Web App

1. From the Firebase project dashboard, click the "</>" icon (Web)
2. Enter a nickname for your app (e.g., "Help Desk Web")
3. Optionally set up Firebase Hosting
4. Click "Register app"
5. Copy the Firebase configuration object for use in your `.env.local` file

## 3. Configure Authentication

1. In the Firebase Console, go to "Authentication" 
2. Click "Get started"
3. Enable the "Google" sign-in provider:
   - Click "Google" in the list of providers
   - Enable the provider
   - Configure your support email
   - Save

## 4. Set Up Firestore Database

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in production mode (recommended)
4. Choose a location close to your users
5. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
6. Deploy Firestore indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## 5. Set Up Firebase Storage

1. In the Firebase Console, go to "Storage"
2. Click "Get started"
3. Choose a location close to your users
4. Deploy Storage security rules:
   ```bash
   firebase deploy --only storage:rules
   ```

## 6. Set Up Firebase Functions

1. In the Firebase Console, go to "Functions"
2. If prompted, upgrade to the Blaze (pay as you go) plan
   - This is required for Functions, but the free tier is generous
3. Initialize Firebase in your local project if not already done:
   ```bash
   firebase init
   ```
4. Deploy the Functions:
   ```bash
   firebase deploy --only functions
   ```

## 7. Set Up Service Account for Admin SDK

### Option 1: Using a Service Account JSON File

1. Go to your Firebase project in the [Firebase Console](https://console.firebase.google.com/)
2. Click on the gear icon (⚙️) next to "Project Overview" and select "Project settings"
3. Go to the "Service accounts" tab
4. Click "Generate new private key" button
5. Save the JSON file securely (do not commit this to your repository!)

Now, you have two options for using this key:

#### A. Convert to environment variable (recommended for production)

For security reasons, it's best to store the entire JSON content as an environment variable:

1. Open the JSON file
2. Copy ALL the contents including the curly braces
3. In your `.env.local` file, add:

```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

IMPORTANT: Make sure to enclose the entire JSON content in single quotes, and ensure it's properly escaped if needed.

#### B. Reference a local file (development only)

Alternatively, for local development, you can reference the file directly:

```javascript
// In src/lib/firebase/firebaseAdmin.ts (DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION)
import * as fs from 'fs';
import { resolve } from 'path';

let serviceAccountKey;
try {
  const serviceAccountPath = resolve('./service-account.json');
  serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('Error loading service account:', error);
  serviceAccountKey = {};
}
```

### Option 2: Using Application Default Credentials

For simpler setup, particularly in environments like Firebase Hosting or Google Cloud:

1. Set up the Firebase CLI and log in with `firebase login`
2. Use the application default credentials in your code (already set up as fallback)

## 8. Configure Environment Variables

Create a `.env.local` file with your Firebase configuration:

```
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## 9. Install Firebase CLI Tools

If you haven't already, install the Firebase CLI:

```bash
npm install -g firebase-tools
```

Login to your Firebase account:

```bash
firebase login
```

## 10. Initialize Firebase in Your Project

If not already initialized:

```bash
firebase init
```

Select the following features:
- Firestore
- Functions
- Storage
- Hosting
- Emulators (optional, but useful for local development)

## 11. Deploy to Firebase

Deploy everything:

```bash
./scripts/deploy.sh
```

Or deploy specific features:

```bash
# Deploy only Functions
firebase deploy --only functions

# Deploy only Hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules
```

## 12. Checking Deployment Status

After deploying, you can check your deployment status:

1. Firebase Hosting: Visit `https://YOUR-PROJECT-ID.web.app`
2. Firebase Functions: Check the Firebase Console > Functions
3. Firestore Rules: Check Firebase Console > Firestore > Rules
4. Storage Rules: Check Firebase Console > Storage > Rules

## Development Mode Without Firebase Admin

If you don't have a Firebase service account set up yet, you can run in development mode:

1. Set this environment variable:
```
SKIP_AUTH_VERIFICATION=true
```

This will bypass authentication checks and provide mock data for users and other admin operations.

IMPORTANT: This should ONLY be used during development.

## Troubleshooting

### Authentication Issues

- Make sure your Firebase Auth domain is correctly set in `.env.local`
- Check that the Google Sign-In provider is enabled
- Verify allowed domains if you've restricted sign-ins

### Function Deployment Issues

- Check for errors in the Firebase Console > Functions > Logs
- Make sure you're on the Blaze plan (required for outbound network requests)
- Check Node.js version compatibility (should be Node.js 20)

### Hosting Issues

- Verify your `firebase.json` configuration
- Check that the `public` directory path is correct
- Make sure the `nextServer` function exists and is exported correctly

### Database Access Issues

- Check Firestore security rules
- Verify that user roles are being set correctly
- Check for database indexes if you're using complex queries

### "Expected property name or '}' in JSON at position 1"

This error occurs when the FIREBASE_SERVICE_ACCOUNT_KEY environment variable contains invalid JSON. Common causes:

1. Missing quotes around the JSON content
2. JSON content has unescaped quotes
3. The environment variable is not set correctly

Solutions:
- Double-check that your JSON is properly formatted and enclosed in quotes
- Try escaping any special characters in your JSON string
- Ensure you're not adding extra quotes inside the JSON content