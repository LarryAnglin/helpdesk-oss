<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Firebase Storage Rules

## Storage Permission Issue Fixed

This document explains the fix for the Firebase Storage permission issue that was causing the following error when trying to upload the company logo:

```
Firebase Storage: User does not have permission to access 'settings/company-logo'. (storage/unauthorized)
```

## The Solution

### 1. Updated Storage Rules

We've updated the Firebase Storage rules in `storage.rules` to:

- Add helper functions for cleaner permission checks
- Temporarily allow any authenticated user to write to the settings folder
- Add better error handling for role-based permissions

### 2. Firebase Functions for Custom Claims

The main issue was that user custom claims (which contain the role information) were not being properly synced between Firestore and Firebase Auth. We've:

- Updated the `syncUserClaims` function to use the default database
- Added a token refresh mechanism to ensure custom claims are applied

### 3. Client-Side Token Refresh

We've added functionality to:
- Force refresh the user's token to pickup new custom claims
- View the current user role and ID in the Settings page
- Provide a button to refresh authentication when needed

## Deployment Steps

To deploy these changes:

1. **Update Firebase Functions**:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Deploy Storage Rules**:
   ```bash
   firebase deploy --only storage
   ```

3. **Update User Custom Claims** (if needed):
   If existing users don't have their role claims set, you may need to:
   - Make a small update to each user document in Firestore to trigger the `syncUserClaims` function
   - Have users click the "Refresh Authentication Token" button in Settings

## Long-Term Security

The current Storage rules include a temporary relaxation of security for the settings folder. Once user custom claims are properly synced, you should update the rules to:

```
// Company logo - only admins can write, all authenticated users can read
match /settings/company-logo {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

## Troubleshooting

If you still experience permission issues:

1. Check the Firebase console to verify that the updated Storage rules have been deployed
2. Examine the user's ID token in the browser console to verify that it contains the expected `role` claim
3. Try refreshing the authentication token using the button in Settings
4. Verify that the Firebase Functions are properly deployed and running
5. Check the Firebase Functions logs for any errors related to `syncUserClaims`