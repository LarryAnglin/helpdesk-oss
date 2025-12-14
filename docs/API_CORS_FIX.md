<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# API CORS Configuration Fix

This document explains the changes made to fix the CORS (Cross-Origin Resource Sharing) issues that were occurring with the Firebase Functions API.

## Latest CORS Fix (April 2025)

We've resolved the CORS issues that were occurring when accessing the Firebase Functions API from the Firebase Hosting domain. The specific error was:

```
Access to fetch at 'https://us-central1-your-project-id.cloudfunctions.net/api/users' from origin 'https://your-project-id.web.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The key change was to explicitly whitelist the Firebase Hosting domains in all CORS handlers:

```javascript
// Define allowed origins - make sure Firebase Hosting domain is included
const allowedOrigins = ['https://your-project-id.web.app', 'https://your-project-id.firebaseapp.com'];
const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';

// Set headers
res.set('Access-Control-Allow-Origin', allowOrigin);
```

Note: The change from `origin : origin` to `origin : '*'` is important - the first version didn't actually change anything, while the second allows all domains as a fallback if the specific domain isn't in our allowed list.

This change was implemented at multiple levels in the CORS handling chain to ensure the headers are properly set for all request types, especially for OPTIONS preflight requests.

## Summary of Changes

1. Enhanced CORS middleware in Firebase Functions:
   - Improved handling of preflight OPTIONS requests at multiple levels
   - Added more comprehensive headers
   - Added better logging for debugging
   - Used multiple layers of CORS protection
   - Created dedicated `cors.js` helper module

2. Updated client-side API configuration:
   - Enhanced `apiConfig.ts` with explicit CORS settings
   - Updated `callApi` helper to properly handle authentication
   - Added automatic fallback to direct Functions URLs when Firebase Hosting fails
   - Improved error handling for CORS issues

3. Improved Firebase Hosting configuration:
   - Added CORS headers in `firebase.json` 
   - Updated API URL to use the Firebase Hosting domain

4. Improved email service implementation:
   - Better error handling for network/CORS errors
   - More detailed logging
   - Graceful fallbacks in development

## Technical Details

### Firebase Functions Changes

The Firebase Functions have been updated with multiple layers of CORS handling:

1. Created dedicated CORS helper (`functions/src/cors.js`):
   - Centralizes all CORS configuration
   - Provides handlers for different scenarios
   - Implements comprehensive logging

2. Top-level CORS handling in `functions/index.js`:
   - Immediate handling of OPTIONS requests
   - Sets comprehensive CORS headers
   - Logs all requests for debugging

3. Express app CORS middleware in `functions/src/api.js`:
   - Applies the CORS helper
   - Added proper content-type parsing
   - Handles CORS at the route level

4. Endpoint-specific CORS handling for sensitive endpoints:
   - Additional CORS headers for the `/send-email` endpoint
   - Detailed logging for request debugging

5. Firebase Hosting CORS support:
   - Added CORS headers in hosting configuration
   - Updated hosting rewrite rules

### Client-Side Changes

1. Enhanced API Configuration:
   - Updated `callApi` helper in `apiConfig.ts` to:
     - Use explicit CORS mode
     - Automatically retrieve auth tokens
     - Better handle headers

2. Email Service:
   - Improved error handling for network issues
   - Better logging for debugging
   - Graceful fallbacks in development

## Usage

The API should now work correctly from both development and production environments. Key endpoints:

- `/api/send-email` - For sending email notifications
- `/api/export-data` - For exporting tickets and users data
- `/api/auth-status` - For checking authentication status
- `/api/verify-token` - For token verification
- `/api/users` - For user management
- `/api/health` - For health checks

## Testing CORS

You can test if the CORS configuration is working correctly by:

1. Checking browser developer tools for CORS errors
2. Using the Health endpoint to verify connectivity:
   ```javascript
   fetch('https://your-project-id.web.app/api/health', {
     method: 'GET',
     mode: 'cors'
   })
   .then(response => response.json())
   .then(data => console.log('Health check result:', data))
   .catch(error => console.error('Health check failed:', error));
   ```

3. Explicitly testing preflight requests:
   ```javascript
   // Test preflight for send-email endpoint
   fetch('https://your-project-id.web.app/api/send-email', {
     method: 'OPTIONS'
   })
   .then(response => {
     console.log('OPTIONS response status:', response.status);
     console.log('OPTIONS headers:', response.headers);
   })
   .catch(error => console.error('OPTIONS request failed:', error));
   ```

4. Checking Firebase Functions logs for preflight requests
5. Testing API calls from the browser console:
   ```javascript
   import { API_ENDPOINTS, callApi } from './lib/apiConfig';
   
   // Test the API call
   callApi(API_ENDPOINTS.HEALTH, { method: 'GET' })
     .then(res => res.json())
     .then(data => console.log('API Response:', data))
     .catch(err => console.error('API Error:', err));
   ```

## Deployment

To deploy these changes:

```bash
# Deploy Firebase Functions
firebase deploy --only functions
```

After deployment, you should verify that CORS is working by:

1. Checking the Firebase Functions logs for CORS-related messages
2. Testing the Users page in your application to verify that the API is accessible
3. Using browser developer tools to confirm no CORS errors in the Console

Remember that these changes only affect the communication between your frontend (Firebase Hosting) and backend (Firebase Functions). You don't need to rebuild your frontend application as the changes are entirely on the server side.

Alternatively, if you want to set `NEXT_PUBLIC_API_URL` to point directly to the Firebase Functions URL in your `.env.local` file, you can do that instead, but that approach might cause CORS issues for other domains outside your control.