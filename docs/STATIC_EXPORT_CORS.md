<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export and CORS Handling

## CORS Fix Applied (April 2025)

This document explains how we've implemented static export support and CORS error handling in the Help Desk application.

## Static Export Support

Next.js static export (`output: 'export'`) allows deploying the application as static HTML/CSS/JS files without requiring a Node.js server. This enables simpler hosting on platforms like Firebase Hosting.

### How Static Export Is Implemented

1. **Configuration in `next.config.js`**:
   ```javascript
   const nextConfig = {
     // Enable static export
     output: 'export',
     distDir: 'out',
     
     // Disable certain features for static export
     experimental: {
       appDir: true,
       esmExternals: true
     },
     
     images: {
       // Required when using static export
       unoptimized: true,
     },
   }
   ```

2. **Custom Build Script (`scripts/buildHandler.js`)**:
   - Temporarily disables middleware during build
   - Moves API routes to avoid build errors
   - Creates a special environment file for the build

3. **Static Routes for Dynamic Pages**:
   ```typescript
   // src/app/(app)/tickets/[id]/page.tsx
   export async function generateStaticParams() {
     return [
       { id: 'placeholder' },
       { id: 'XrjzHmNk8EkI2KoLYaTX' },
       { id: 'dynamic' },
       { id: 'invalid' },
       { id: '/tickets/XrjzHmNk8EkI2KoLYaTX' },
     ];
   }
   ```

4. **Client-Side Navigation**:
   ```typescript
   // Reliable navigation method for static exports
   const link = document.createElement('a');
   link.href = `/tickets/${ticket.id}`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   ```

## CORS Handling in Static Export

When running a static export locally or from certain hosting environments, Cross-Origin Resource Sharing (CORS) can block access to Firebase services.

### CORS Error Detection

1. **Global Error Event Listener**:
   ```typescript
   // src/components/auth/SignInPage.tsx
   useEffect(() => {
     const handleGlobalError = (event: ErrorEvent) => {
       if (event.message && (
           event.message.includes('Firestore') || 
           event.message.includes('firestore.googleapis.com') ||
           event.message.includes('access control checks')
         )) {
         console.warn('Detected Firestore CORS error:', event.message);
         setFirestoreError(true);
       }
     };
     
     window.addEventListener('error', handleGlobalError);
     return () => window.removeEventListener('error', handleGlobalError);
   }, []);
   ```

2. **Timeout Detection**:
   ```typescript
   // Set a timeout to detect if sign-in takes too long (possible CORS issue)
   const signInTimeoutId = setTimeout(() => {
     console.warn('Sign-in is taking longer than expected - possible CORS issue');
     setError('Sign-in is taking longer than expected. This may be due to CORS restrictions.');
     setLoading(false);
   }, 10000); // 10 seconds timeout
   ```

3. **Network Error Detection**:
   ```typescript
   if (error.message && (
       error.message.includes('network') || 
       error.message.includes('connection') ||
       error.message.includes('CORS') ||
       error.message.includes('access control')
     )) {
     setError('Sign-in failed due to network or CORS issues. This is common when running the static export locally.');
   }
   ```

### Preventing Redirect Loops

A common issue with CORS in static exports is an infinite authentication loop. We prevent this with:

```typescript
// Guard against redirect loops
if (redirectAttempted) {
  return;
}

// If there's a Firestore error, don't redirect
if (firestoreError) {
  console.warn('Skipping redirect due to Firestore CORS error');
  setError('Unable to access Firestore database. This is likely due to CORS restrictions in the static export.');
  return;
}
```

## Firebase Functions CORS Configuration

For APIs hosted in Firebase Functions, we've added comprehensive CORS headers:

```javascript
// functions/src/cors.js
const corsOptions = {
  origin: true, // Reflect the request origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

const handleCors = (req, res, next) => {
  // Set comprehensive CORS headers
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, PATCH');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  next();
};
```

## Building and Deploying Static Export

### Building Static Export

```bash
# Use our custom build script for static export
npm run build:static
```

This runs `scripts/buildHandler.js` which:
1. Temporarily disables middleware (by renaming middleware.ts to middleware.ts.disabled)
2. Moves API routes out of the way to prevent build errors
3. Creates a temporary .env.production.local file with special flags
4. Runs Next.js build with static export settings
5. Restores all files after the build completes

### Deploying to Firebase Hosting

```bash
# Deploy the static export to Firebase Hosting
firebase deploy --only hosting
```

## Testing Static Export

1. **Local Testing** (will have CORS issues):
   ```bash
   # Install serve package if you don't have it
   npm install -g serve
   
   # Serve the static export
   serve -s out
   ```

2. **Deployed Testing** (recommended):
   - Deploy to Firebase Hosting using the command above
   - Test on your Firebase Hosting URL: `https://YOUR-PROJECT-ID.web.app`

## Local Testing with Demo Mode

To enable testing the static export locally without CORS issues, we've added a special "Demo Mode" feature:

1. **How Demo Mode Works:**
   - When running on localhost, the application detects CORS issues with Firestore
   - A "Continue in Demo Mode" button appears when CORS errors are detected
   - Clicking this button bypasses authentication requirements for local testing
   - This allows you to navigate the application UI without Firebase access

2. **Enabling Demo Mode:**
   - Build the static export with `npm run build:static`
   - Serve locally with `serve -s out` or similar
   - Try to log in with Google
   - When CORS errors are detected, click "Continue in Demo Mode"
   - You'll be redirected to the main application

3. **Demo Mode Limitations:**
   - No real data is retrieved from Firebase
   - Creating or updating tickets won't work
   - User roles and permissions aren't enforced
   - UI components will display but with placeholder or empty data

4. **Implementation Details:**
   ```typescript
   // In SignInPage.tsx
   const [bypassAuth, setBypassAuth] = useState(false);
   const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
   
   // When CORS errors occur on localhost, show demo mode button
   {isLocalhost && firestoreError && (
     <Button
       variant="outlined"
       color="secondary"
       fullWidth
       onClick={() => setBypassAuth(true)}
       className="mb-4 py-2"
     >
       Continue in Demo Mode
     </Button>
   )}
   
   // Skip authentication checks in demo mode
   if (bypassAuth && isLocalhost) {
     console.log('LOCALHOST DEMO MODE: Bypassing authentication checks');
     setRedirectAttempted(true);
     window.location.href = '/tickets';
     return;
   }
   ```

## CORS Fix for Firebase Functions and Hosting (April 2025 Update)

For applications that use Firebase Hosting for the frontend and Firebase Functions for the backend API, CORS issues can occur if the configuration isn't set up properly. We've implemented a simplified, foolproof CORS handling system:

1. **Direct API Access Strategy**:
   ```typescript
   // src/lib/apiConfig.ts
   // Use direct Firebase Functions URL instead of rewrite
   export const FUNCTION_URL = 'https://us-central1-your-project-id.cloudfunctions.net';
   
   export const API_ENDPOINTS = {
     USERS: `${FUNCTION_URL}/api/users`,
     // other endpoints...
   };
   ```

2. **Completely Open CORS Middleware**:
   ```javascript
   // functions/src/cors.js - simplified for debugging
   const corsMiddleware = cors({
     origin: '*',  // Allow any origin for troubleshooting
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', Accept', 'Authorization'],
     credentials: false,
     maxAge: 86400 // 24 hours
   });
   ```

3. **Handle OPTIONS Requests at Multiple Levels**:
   ```javascript
   // functions/index.js - direct handler for OPTIONS
   exports.api = functions.https.onRequest((req, res) => {
     if (req.method === 'OPTIONS') {
       res.set('Access-Control-Allow-Origin', '*');
       res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
       res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
       res.set('Access-Control-Max-Age', '86400');
       res.status(204).send('');
       return;
     }
     // Pass to Express app
     return apiMethods.api(req, res);
   });
   ```

4. **Multiple Levels of CORS Protection**:
   - Top-level function wrapper in `functions/index.js`
   - Express middleware in `functions/src/api.js`
   - Standalone OPTIONS handler for all routes
   - CORS headers applied to every API response
   
5. **Add Origin Header in Frontend Requests**:
   ```typescript
   // Set up default headers with required CORS headers
   const headers = {
     'Content-Type': 'application/json',
     'Accept': 'application/json',
     'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://your-project-id.web.app',
     ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
   };
   ```

6. **CORS Test Endpoint for Diagnostics**:
   ```javascript
   // Special CORS test endpoint in functions/index.js
   exports.corsTest = functions.https.onRequest((req, res) => {
     res.set('Access-Control-Allow-Origin', '*');
     res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
     
     if (req.method === 'OPTIONS') {
       res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
       res.set('Access-Control-Max-Age', '86400');
       res.status(204).send('');
       return;
     }
     
     res.status(200).json({
       status: 'ok',
       message: 'CORS test successful',
       origin: req.headers.origin || 'N/A',
       headers: req.headers
     });
   });
   ```

## Troubleshooting

1. **CORS Errors in Local Preview**:
   - This is expected when testing locally
   - Use the "Continue in Demo Mode" button for basic UI testing
   - For full functionality, deploy to Firebase Hosting

2. **Missing Files in Static Export**:
   - Check `next.config.js` to ensure `output: 'export'` is set
   - Verify `distDir: 'out'` is correct
   - Check for any build errors in the console

3. **Dynamic Routes Not Working**:
   - Ensure all dynamic routes have `generateStaticParams()` function
   - Add placeholder IDs for testing
   - Use client-side navigation for more reliable routing

4. **Authentication Issues**:
   - Verify Firebase configuration is correctly set in environment variables
   - Check for CORS errors in the console
   - If running locally, use Demo Mode
   - For production, test on the deployed Firebase Hosting URL

5. **CORS Issues with API Endpoints**:
   - Ensure `NEXT_PUBLIC_API_URL` is correctly set in your .env file
   - Verify that your Firebase Function CORS settings include your hosting domain
   - Check the browser console for specific CORS error messages
   - Deploy both functions and hosting for a clean test
   - If CORS issues persist, the app now falls back to demo data for static export environments