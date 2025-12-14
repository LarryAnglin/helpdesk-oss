<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Deployment Setup Complete

Your Help Desk application has been configured for static deployment. Here's what has been done:

## 1. Dynamic Routes Configured for Static Export

- Updated `/src/app/(app)/tickets/[id]/page.tsx` to use client-side data fetching
- Implemented `generateStaticParams()` to pre-render a placeholder page

## 2. Next.js Configuration Updated

- Modified `next.config.js` to use `output: 'export'`
- Enabled `unoptimized: true` for images in static export

## 3. Firebase Hosting Configured

- Updated `firebase.json` to use the `out` directory as the public directory
- Added rewrites for API calls to go to the Firebase Functions
- Added fallback to `index.html` for client-side routing

## 4. Deployment Script Enhanced

- Added support for static export in `scripts/deploy.sh`
- Added redirect handler for SPA routing
- Created a 404 page that redirects to index.html

## 5. Environment Variables

- Created `src/lib/env.ts` to handle environment variables in a static build
- Updated API configuration to use these environment variables

## How to Deploy

Run the deployment script:

```bash
./scripts/deploy.sh
```

This will:
1. Build your Next.js application with static export
2. Prepare the static files for deployment with SPA routing support
3. Install dependencies in the functions directory
4. Deploy everything to Firebase

Your application will be available at your Firebase Hosting URL:
`https://YOUR-PROJECT-ID.web.app`

## Important Notes

1. **API Endpoints**: All API calls are now handled by Firebase Functions and configured in `src/lib/apiConfig.ts`

2. **Client-Side Routing**: The application uses client-side routing for dynamic pages like ticket details

3. **Environment Variables**: Make sure your Firebase configuration is properly set in `.env.local` for local development, and in your CI/CD environment for production deployment

4. **Authentication**: Authentication still works with Firebase Auth but is handled completely on the client-side