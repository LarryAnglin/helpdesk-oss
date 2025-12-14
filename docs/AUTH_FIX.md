<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Authentication & Middleware Fix

## Issue: Infinite Redirect Loop After Authentication

The application was experiencing an infinite redirect loop after user authentication. The root cause was:

1. The middleware was checking for an `auth_token` cookie to determine if a user is authenticated
2. This cookie was not being set when a user signed in with Google
3. The cookie-based authentication check in middleware failed, causing users to be redirected back to the sign-in page
4. The sign-in page detected an authenticated user and redirected back to the dashboard, creating a loop

## Solution

We implemented the following fixes:

### 1. Setting Auth Token Cookies

We modified the AuthContext to set an `auth_token` cookie when a user is authenticated:

```typescript
// Function to set the auth token cookie
const setAuthCookie = (token: string) => {
  document.cookie = `auth_token=${token}; path=/; max-age=3600; SameSite=Strict`;
  console.log('Auth token cookie set');
};
```

This cookie is now set:
- When the Firebase Auth state changes and a user is detected
- When the user signs in with Google
- When the user is redirected from the sign-in page

### 2. Improved Middleware

We enhanced the middleware to:
- Better detect public paths that don't require authentication
- Properly check for the auth_token cookie
- Add more detailed logging to troubleshoot auth issues
- Only redirect from the sign-in page when a user is authenticated

### 3. Token Verification API

We added a server-side API endpoint that can verify Firebase Auth tokens:

```typescript
// src/pages/api/verify-token.ts
export default async function handler(req, res) {
  // Get the token from the request body
  const { token } = req.body;

  // Verify the token using Firebase Admin SDK
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  // Return the user information
  return res.status(200).json({
    uid: decodedToken.uid,
    email: decodedToken.email,
    authenticated: true
  });
}
```

### 4. Authentication Utilities

We created client-side auth utilities in `src/lib/auth/authUtils.ts` to:
- Check for authentication status based on cookies
- Get the auth token from cookies
- Verify tokens with the server

## How It Works

1. When a user signs in with Google, Firebase Auth authenticates them
2. The AuthContext detects the auth state change and requests an ID token
3. The ID token is stored as a cookie named `auth_token`
4. The middleware checks for this cookie on each page request
5. If the cookie is present, the user is considered authenticated
6. If the cookie is missing on protected routes, the user is redirected to sign in

## Future Enhancements

While the current solution works, here are some recommended enhancements for production:

1. **Server-Side Session Management**: Use server-side sessions with session IDs instead of storing the JWT directly in cookies
2. **HTTP-Only Cookies**: Use HTTP-only cookies set by the server rather than client-side cookies
3. **Token Refreshing**: Implement automatic token refreshing to handle token expiration
4. **CSRF Protection**: Add CSRF tokens for sensitive operations