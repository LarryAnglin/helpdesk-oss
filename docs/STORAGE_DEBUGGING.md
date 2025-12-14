<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Storage Permission Debugging

## Current Changes and Debug Information

We've made several changes to fix the "Firebase Storage: User does not have permission to access 'settings/company-logo'" error:

1. **Modified the `uploadCompanyLogo` function**:
   - Now uploads to a unique path `settings/logo-{timestamp}` to avoid conflicts
   - Adds extensive logging to help debug permissions issues
   - Shows custom claims information when permission errors occur

2. **Updated Storage Rules**:
   - Made the `settings` folder accessible to all authenticated users
   - Added simpler helper functions for checking permissions
   - Made the rules more permissive for debugging purposes

3. **Improved `deleteCompanyLogo` function**:
   - Now properly extracts path from the stored URL
   - More robust error handling
   - Better debugging information

## How to Deploy These Changes

For the changes to take effect, you need to deploy the updated storage rules:

```bash
firebase deploy --only storage
```

## Understanding and Fixing Firebase Custom Claims

The root issue is likely that Firebase Auth custom claims (which contain the user's role) are not being properly set. To properly set up custom claims:

1. **Deploy Firebase Functions**:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Verify Function Logs**:
   Check Firebase Functions logs to ensure the `syncUserClaims` function is running successfully.

3. **Force a Token Refresh**:
   Use the "Refresh Authentication Token" button in the Settings page.

4. **Check Current User Claims**:
   Open your browser console and run (when logged in):
   ```javascript
   firebase.auth().currentUser.getIdTokenResult(true).then(token => console.log(token.claims))
   ```
   You should see a `role` property with the value `admin`.

## Temporary Workaround

The updated code now uses a different path for each logo upload (`settings/logo-{timestamp}`) and has more permissive storage rules. This should allow uploads to work even without proper custom claims.

## Checking for Modified Files

The following files have been modified to fix this issue:

1. `/src/lib/firebase/configService.ts` - Updated upload and delete functions with better error handling
2. `/storage.rules` - Made rules more permissive for authenticated users
3. `/functions/src/auth.js` - Updated to work with the default database

## Next Steps

Once the logo upload is working, you should:

1. Review the verbose logs in the console to understand what's happening
2. Check if custom claims are properly set in the Firebase Auth token
3. Consider setting up a more secure implementation with proper role-based authentication

Remember that the current solution prioritizes getting the feature working by temporarily relaxing security rules. For production, you should restore stricter rules after ensuring custom claims are working properly.