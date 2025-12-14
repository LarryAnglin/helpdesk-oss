<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Deployment Notes

Due to the Next.js App Router and dynamic routes like `/tickets/[id]`, we faced challenges using the static export mode (`output: 'export'`). 

When using static export mode with dynamic routes, Next.js requires `generateStaticParams()` to be implemented for each dynamic route to pre-render all possible paths. This works for sites with a fixed set of possible dynamic routes known at build time.

## Current Solution

Our current solution uses:

1. Firebase Hosting for static files
2. Firebase Functions to serve the Next.js application

This provides a simple landing page when users first visit the site, but the actual application functionality is served by a Firebase Function called `nextServer`.

## Alternative Approaches

### 1. Implement generateStaticParams

If you want to use static export, you can modify the dynamic route pages to implement `generateStaticParams()`. For example:

```typescript
// src/app/(app)/tickets/[id]/page.tsx
export async function generateStaticParams() {
  // This would need to fetch all possible ticket IDs at build time
  // Not ideal for a dynamic ticketing system where new tickets are created regularly
  return [
    { id: 'placeholder-id-1' },
    { id: 'placeholder-id-2' },
    // ...etc
  ];
}
```

### 2. Use Server-Side Rendering with Cloud Run

A better approach for production would be to use Google Cloud Run to host the Next.js application with full server-side rendering support:

1. Build the application with `output: 'standalone'`
2. Create a Dockerfile that serves the standalone output
3. Deploy to Cloud Run

This would provide full Next.js functionality including dynamic routes and API routes.

### 3. Use Vercel

Next.js is designed to work best with Vercel, which provides:

- Automatic deployment from Git
- Full support for dynamic routes
- Edge functions for API routes
- Global CDN

## Current Limitations

Our current Firebase Functions approach:

1. Serves a simple placeholder HTML for all routes
2. Does not provide actual Next.js functionality
3. Is meant as a temporary solution until a proper deployment strategy is implemented

## Next Steps

1. For a production deployment, consider migrating to Cloud Run or Vercel
2. Alternatively, refactor the application to use static export with client-side data fetching
3. Or implement `generateStaticParams()` for all dynamic routes if the set of possible values is known at build time