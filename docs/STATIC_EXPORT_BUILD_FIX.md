<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export Build Fix

This document explains the changes made to fix the build process for the Next.js static export.

## Issues Fixed

The following errors were occurring during the static export build:

```
⨯ Middleware cannot be used with "output: export". 
See more info here: https://nextjs.org/docs/advanced-features/static-html-export

⨯ API Routes cannot be used with "output: export". 
See more info here: https://nextjs.org/docs/advanced-features/static-html-export
```

## Solutions Applied

1. **Disabled Middleware**:
   - Renamed `/src/middleware.ts` to `/src/middleware.ts.disabled`
   - This prevents Next.js from trying to include middleware in the static build

2. **Temporarily Moved API Routes**:
   - Relocated API routes from `/src/pages/api/` to `/src/api-routes-backup/`
   - Static exports cannot include API routes as they require a Node.js server

3. **Updated Next.js Configuration**:
   - Modified `next.config.js` to explicitly define the export paths
   - Changed output directory to match Firebase hosting configuration
   - Added placeholder configuration for dynamic routes

## Next.js Config Changes

The following changes were made to `next.config.js`:

```javascript
module.exports = {
  output: 'export',
  distDir: 'out',  // Changed to 'out' to match Firebase hosting
  
  // Specify explicit static paths
  exportPathMap: async function () {
    return {
      '/': { page: '/' },
      '/tickets': { page: '/tickets' },
      '/tickets/new': { page: '/tickets/new' },
      '/tickets/all': { page: '/tickets/all' },
      '/tickets/placeholder': { page: '/tickets/[id]', query: { id: 'placeholder' } }, 
      '/auth/signin': { page: '/auth/signin' },
      '/settings': { page: '/settings' },
      '/users': { page: '/users' },
      '/export': { page: '/export' },
    };
  },
  
  // Required for static exports
  images: {
    unoptimized: true,
  },
}
```

## Post-Build Steps

After building the static export, consider:

1. **Restoring API Routes**:
   ```bash
   mv /src/api-routes-backup/api /src/pages/
   ```

2. **Restoring Middleware**:
   ```bash
   mv /src/middleware.ts.disabled /src/middleware.ts
   ```

## Firebase Deployment

The Firebase hosting configuration in `firebase.json` should point to the `out` directory:

```json
"hosting": {
  "public": "out",
  "cleanUrls": true,
  "ignore": [
    "firebase.json",
    "**/.*",
    "**/node_modules/**"
  ],
  "rewrites": [
    {
      "source": "/api/**",
      "function": "api"
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

## Client-Side Authentication

Since middleware is disabled, all authentication must be handled client-side. The application now:

1. Uses client-side auth checks in the TicketDetail component
2. Performs manual redirects when authentication is required
3. Stores destination URLs in query parameters to redirect after login

## Understanding Static Exports

With static exports:
- No server-side rendering
- No API routes
- No middleware
- All data fetching happens client-side
- Authentication happens client-side
- Navigation is handled entirely in the browser

Firebase Functions now handle all API functionality previously provided by Next.js API routes.