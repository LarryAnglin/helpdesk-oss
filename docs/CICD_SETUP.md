<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# CI/CD Setup Guide

This guide will help you set up automatic deployment to Firebase whenever you push to your GitHub repository.

## Prerequisites

1. Firebase project already set up
2. GitHub repository
3. Firebase CLI installed locally (`npm install -g firebase-tools`)

## Step 1: Generate Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (your-project-id)
3. Click the gear icon ⚙️ and select "Project settings"
4. Go to the "Service accounts" tab
5. Click "Generate new private key"
6. Save the downloaded JSON file securely

## Step 2: Generate Firebase CI Token

Run this command in your terminal:

```bash
firebase login:ci
```

This will open a browser window for authentication. After logging in, you'll receive a token that looks like:
```
1//0e-xxx...xxxxx
```

Save this token securely.

## Step 3: Configure GitHub Secrets

Go to your GitHub repository settings:
1. Navigate to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the following secrets:

### Required Secrets

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `FIREBASE_SERVICE_ACCOUNT` | Entire JSON content from Step 1 | Service account JSON file |
| `FIREBASE_TOKEN` | Token from Step 2 | Output of `firebase login:ci` |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | `your-project-id` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console → Project settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `your-project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | `your-project-id.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | Firebase Console → Project settings |
| `VITE_FIREBASE_APP_ID` | App ID | Firebase Console → Project settings |
| `VITE_FIREBASE_MEASUREMENT_ID` | Measurement ID | Firebase Console → Project settings |
| `VITE_FIREBASE_FUNCTIONS_URL` | Functions URL | `https://us-central1-your-project-id.cloudfunctions.net` |

### How to Add Secrets

For simple values:
```
Name: VITE_FIREBASE_API_KEY
Value: YOUR_FIREBASE_API_KEY
```

For the service account JSON:
```
Name: FIREBASE_SERVICE_ACCOUNT
Value: [Paste the entire JSON content including the curly braces]
```

## Step 4: Update Firebase Configuration

Make sure your `firebase.json` in the root directory is configured correctly:

```json
{
  "hosting": {
    "public": "react/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

## Step 5: Test the Pipeline

1. Make a small change to your code
2. Commit and push to the main branch:
   ```bash
   git add .
   git commit -m "Test CI/CD pipeline"
   git push origin main
   ```
3. Go to the Actions tab in your GitHub repository
4. Watch the workflow run
5. Check your Firebase Hosting URL after completion

## Features of This CI/CD Pipeline

- **Automatic Deployment**: Deploys to Firebase on every push to main
- **PR Previews**: Creates preview deployments for pull requests
- **Full Stack**: Deploys React app, Functions, Firestore rules, and Storage rules
- **Build Validation**: Ensures the app builds successfully before deployment
- **Environment Variables**: Securely injects Firebase config during build

## Troubleshooting

### Build Fails
- Check the Actions tab for error logs
- Ensure all secrets are set correctly
- Verify the React app builds locally with `cd react && npm run build`

### Deployment Fails
- Check Firebase service account permissions
- Verify the Firebase token is still valid
- Ensure the project ID matches your Firebase project

### Missing Environment Variables
- Double-check all VITE_ prefixed secrets are set
- Ensure no typos in secret names
- Secrets are case-sensitive

## Additional Notes

- The pipeline runs on Ubuntu latest
- Node.js 20 is used for builds
- Dependencies are cached for faster builds
- PR previews expire after 7 days