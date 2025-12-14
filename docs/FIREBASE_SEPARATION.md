<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Firebase Client/Server Separation

## Problem

The application was encountering a common issue when using Firebase Admin SDK in a Next.js application:

```
Module not found: Can't resolve 'fs'
```

This error occurred because:

1. Firebase Admin SDK uses Node.js-specific modules like 'fs' that don't exist in the browser
2. The Admin SDK was being imported in a client component, causing the bundler to try to include it in client-side code
3. Since browsers don't have access to the file system, this resulted in a bundling error

## Solution

We implemented a proper client/server separation following Next.js best practices:

### 1. API Routes for Admin SDK Operations

Created server-side API endpoints in `src/pages/api/` that use the Firebase Admin SDK:

- `/api/users` - RESTful endpoint for user management (GET, POST, PUT, DELETE)
- `/api/users/reset-password` - Special endpoint for password resets

These endpoints:
- Run exclusively on the server where Node.js modules are available
- Handle authentication and permission checks
- Provide a secure interface to the Firebase Admin SDK

### 2. Client-Side Service

Created a `userClientService.ts` that:
- Makes fetch requests to the API endpoints
- Handles authentication tokens
- Provides the same function signatures as the original service
- Works safely in the browser without requiring Node.js modules

### 3. Updated Components

Modified the client components to use the client service instead of directly importing the Admin SDK:

- Updated imports in `UserList.tsx`, `UserCreateDialog.tsx`, and `UserEditDialog.tsx`
- Kept the same function names and signatures for minimal code changes

## Architecture Benefits

This separation provides several benefits:

1. **Security**: Admin SDK credentials stay on the server
2. **Bundle Size**: Smaller client-side bundles without server-only code
3. **Performance**: Reduced JavaScript parsing and execution time in the browser
4. **Maintainability**: Clear separation between client and server responsibilities

## Best Practices

When working with Firebase in Next.js applications:

1. Use the regular Firebase SDK for client-side authentication and basic operations
2. Use the Firebase Admin SDK exclusively in API routes or server components 
3. Create a clean API boundary between client and server code
4. Pass only the necessary data between client and server
5. Handle permissions and validation on both client and server sides