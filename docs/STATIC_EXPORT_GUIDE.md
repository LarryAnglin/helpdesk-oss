<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export Guide for Help Desk Application

This guide provides instructions on deploying the Help Desk application as a static site with Firebase Functions handling backend functionality.

## Overview

The Help Desk application has been restructured to support static site deployment. This approach:

1. Deploys the Next.js frontend as static files to Firebase Hosting
2. Moves all API endpoints to Firebase Cloud Functions
3. Updates client-side code to call the Cloud Functions APIs

## Architecture

```
┌─────────────────┐    HTTP     ┌───────────────────┐
│                 │  Requests   │                   │
│  Static Files   │◄───────────►│   Web Browser     │
│  (Hosting)      │             │                   │
│                 │             │                   │
└────────┬────────┘             └─────────┬─────────┘
         │                                │
         │                                │
         │                                │
         │       HTTP Requests            │
         └───────────►┌──────────────────┐│
                      │                  ││
                      │  API Functions   │◄
                      │  (Functions)     │
                      │                  │
                      └──────────────────┘
```

## Benefits of Static Export

1. **Faster Loading**: Static sites load quickly and have better performance metrics
2. **Reduced Costs**: Static hosting is typically cheaper than server hosting
3. **Better SEO**: Pre-rendered pages are easier for search engines to index
4. **Improved Reliability**: Static sites are more resilient and have fewer points of failure
5. **Scalability**: Static sites can handle high traffic with minimal infrastructure

## How to Deploy

### 1. Build the Static Site

```bash
# Configure environment for static export
export NEXT_PUBLIC_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net

# Build the static site
npm run build
```

### 2. Deploy Firebase Functions

```bash
# Install dependencies for functions
cd functions
npm install
cd ..

# Deploy the functions
firebase deploy --only functions
```

### 3. Deploy to Firebase Hosting

```bash
# Deploy the static site to hosting
firebase deploy --only hosting
```

### 4. All-in-One Deployment

```bash
# Deploy everything at once
./scripts/deploy.sh
```

## Client-Side API Configuration

Update your API calls to use the new Firebase Functions endpoints:

```typescript
// Import API configuration
import { API_ENDPOINTS, callApi } from '@/lib/apiConfig';

// Example API call with authentication
const fetchData = async () => {
  const token = await currentUser.getIdToken();
  const response = await callApi(API_ENDPOINTS.EXPORT_DATA, {
    method: 'POST',
    body: JSON.stringify({ exportType: 'tickets' })
  }, token);
  
  const data = await response.json();
  // Handle the data...
};
```

## Dynamic Routes

Next.js dynamic routes (like `/tickets/[id]`) with static export require special handling:

1. The static export generates pages for routes known at build time
2. For truly dynamic routes (like unique tickets), client-side routing handles the navigation
3. Data for these routes is fetched client-side using Firebase Functions APIs

## Local Development

For local development with Firebase emulators:

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start Next.js dev server
npm run dev
```

Set environment variable to use local emulators:

```
NEXT_PUBLIC_API_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1
```

## Future Improvements

1. **Incremental Static Regeneration**: Consider moving to a hosting platform that supports ISR for dynamic content
2. **Server Components**: Evaluate Next.js hosting options that support React Server Components
3. **Edge Functions**: Explore Firebase Hosting with Cloud Run or Vercel Edge Functions for more dynamic capabilities
4. **Pre-rendering**: Implement `generateStaticParams()` for dynamic routes where the paths are known at build time