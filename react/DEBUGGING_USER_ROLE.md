# Debugging User Role for larry@your-domain.com

## Summary of Investigation

I found the issue with your storage permission errors. The problem is that the user `larry@your-domain.com` likely does NOT have the role `super_admin` in their Firestore document, but the storage rules are expecting this specific role.

## How Storage Rules Work

Looking at `/Users/larryanglin/Projects/HelpDesk/react/storage.rules`, the `getUserRole()` function queries Firestore:

```javascript
function getUserRole() {
  return request.auth != null ? firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role : null;
}

function isSuperAdmin() {
  return request.auth != null && getUserRole() == 'super_admin';
}
```

For company logo uploads (path: `settings/logo-*`), the rules don't explicitly check for super_admin, but the error suggests the user doesn't have the right permissions.

## Steps to Debug the User's Role

### Option 1: Browser Console Method (Recommended)

1. Go to https://helpdesk.anglinai.com
2. Log in as larry@your-domain.com
3. Open Developer Tools (F12)
4. Go to Console tab
5. Copy and paste this code:

```javascript
// Copy the contents of check-user-role-console.js
```

I've created the file `/Users/larryanglin/Projects/HelpDesk/react/check-user-role-console.js` with the complete debugging script.

### Option 2: Check Application Logs

When larry@your-domain.com logs in, look for these console messages in the browser:

1. `"User data found:"` - Shows the complete user document
2. `"User role cookie set for existing user:"` - Shows what role was detected
3. `"Fetching user data for UID:"` - Shows the authentication process

### Option 3: Check Auth Context

The user data is loaded in `/Users/larryanglin/Projects/HelpDesk/react/src/lib/auth/AuthContext.tsx`:

- Line 78: `console.log('User data found:', data);`
- Line 83: `console.log('User role cookie set for existing user:', data.role);`

## Likely Root Causes

Based on my analysis, here are the most likely issues:

### 1. User Role Not Set to super_admin

The user might have a different role like:
- `system_admin` 
- `organization_admin`
- `company_admin`
- `user`
- `tech`

### 2. User Document Missing

The user document might not exist in Firestore's `users` collection.

### 3. Role Field Missing

The user document exists but doesn't have a `role` field.

## How Roles Are Assigned

Looking at the onboarding process in `/Users/larryanglin/Projects/HelpDesk/react/src/components/onboarding/OnboardingWizard.tsx`, new users get their role assigned through:

1. The `createUser` function calls a Cloud Function
2. The Cloud Function (at `${API_BASE_URL}/api/users`) creates the user document
3. The role assignment happens server-side

## Fixing the Issue

Once you identify the actual role value:

### If Role is Wrong:
Update the user document directly in Firestore:
```javascript
// In browser console on helpdesk.anglinai.com
const db = firebase.firestore();
await db.collection('users').doc('USER_UID_HERE').update({
  role: 'super_admin'
});
```

### If User Document Missing:
Create the user document with proper role.

### Alternative: Update Storage Rules
If you want to allow other admin roles to upload logos, update the storage rules:

```javascript
// In storage.rules, around line 140-142
match /{allPaths=**} {
  // Allow super_admin and system_admin to upload to settings
  allow read, write: if resource.name.matches('.*settings/.*') && 
                       (getUserRole() == 'super_admin' || getUserRole() == 'system_admin');
  allow read, write: if false;
}
```

## Error Details from configService.ts

When the upload fails, your app logs:
- Line 125: `"This is a permissions error. The current user likely does not have the correct role claims."`
- Line 129: Shows the user's custom claims from Firebase Auth

The key is that **Firestore roles** (in user documents) and **Firebase Auth custom claims** are different. Storage rules use Firestore data.

## Next Steps

1. Run the browser console script to see the actual role
2. Compare with what storage rules expect
3. Either fix the user role or update the rules
4. Test logo upload again

The debugging script will show you exactly what role is stored and whether it matches the storage rules expectations.