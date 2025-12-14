<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Next Steps for Static Export Migration

## 1. Complete API Route Migration

We've already migrated the following API routes to Firebase Functions:
- `/api/send-email` → Using the Firebase Function
- `/api/export-data` → Using the Firebase Function
- `/api/auth-status` → Using the Firebase Function

Additional API routes that need to be migrated:
- `/api/auth/refresh-token`
- `/api/verify-token`
- `/api/users`
- `/api/users/reset-password`

## 2. Client Component Conversion

Convert server components to client components:

1. Add `'use client'` directive to the top of components that need client-side data fetching
2. Update data fetching logic to use client-side approach with the new API endpoints
3. Ensure proper loading states and error handling for client-side fetching

## 3. Dynamic Route Handling

For dynamic routes like `/tickets/[id]`:

### Option 1: Use Client-Side Routing
1. Update the component to fetch data client-side using ticket ID from params
2. Use client component with React Router-style navigation

### Option 2: Implement Static Generation for Known Routes
If you have a fixed set of tickets that should be pre-rendered:
```typescript
// app/(app)/tickets/[id]/page.tsx
export async function generateStaticParams() {
  // Get list of ticket IDs to pre-render
  const ticketIds = ["ticket1", "ticket2", ...];
  
  return ticketIds.map(id => ({
    id: id,
  }));
}
```

## 4. Authentication Flow Updates

1. Update authentication flow to use the Firebase Auth directly in the client
2. Store authentication tokens in a secure way (HTTP-only cookies where possible)
3. Update the middleware.ts for static site compatibility

## 5. Configuration for Static Export

Update Next.js configuration for static export:

```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // ... other config
}
```

## 6. Testing

1. Test all functionality in a local environment first
2. Verify all API calls are correctly routing to Firebase Functions
3. Test authentication flow
4. Test dynamic routes and navigation
5. Verify file uploads and downloads

## 7. Deployment

1. Build the static site:
   ```bash
   npm run build
   ```

2. Deploy Firebase Functions:
   ```bash
   firebase deploy --only functions
   ```

3. Deploy the static site to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## 8. Monitoring and Optimization

1. Set up proper monitoring for the Firebase Functions
2. Optimize static assets and caching
3. Implement analytics to track user behavior
4. Monitor API usage and costs