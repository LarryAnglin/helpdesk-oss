<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# API Migration Guide

This guide explains how to migrate the Next.js API routes to Firebase Cloud Functions for the static site deployment approach.

## Overview

We've created a Firebase Cloud Functions API that mirrors the functionality of our Next.js API routes. This enables us to deploy our Next.js frontend as a static site to Firebase Hosting while still providing all the necessary backend functionality.

## API Endpoints

The following API endpoints are now available via Firebase Cloud Functions:

| Previous Next.js Endpoint | New Firebase Function Endpoint |
|---------------------------|--------------------------------|
| `/api/auth-status` | `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api/auth-status` |
| `/api/send-email` | `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api/send-email` |
| `/api/export-data` | `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api/export-data` |
| `/api/health` | `https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/api/health` |

## Client-Side Code Changes Required

To use these endpoints in your frontend code, you'll need to update your API calls from relative paths to absolute URLs. Here's how:

### 1. Create an API URL Configuration

Create a new file at `/src/lib/apiConfig.ts`:

```typescript
// Base URL for API calls (this could come from environment variables)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/YOUR_PROJECT_ID/us-central1';

// API endpoints
export const API_ENDPOINTS = {
  AUTH_STATUS: `${API_BASE_URL}/api/auth-status`,
  SEND_EMAIL: `${API_BASE_URL}/api/send-email`,
  EXPORT_DATA: `${API_BASE_URL}/api/export-data`,
  HEALTH: `${API_BASE_URL}/api/health`,
};
```

### 2. Update API Calls in Your Components

Example for email service:

```typescript
// Before
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(options),
});

// After
import { API_ENDPOINTS } from '@/lib/apiConfig';

const response = await fetch(API_ENDPOINTS.SEND_EMAIL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(options),
});
```

### 3. Update Authentication Headers

For authenticated API calls, make sure to include the authentication token:

```typescript
const token = await currentUser.getIdToken();

const response = await fetch(API_ENDPOINTS.EXPORT_DATA, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(options),
});
```

## CORS Configuration

The Firebase Functions API is configured with CORS to accept requests from any origin. You may want to restrict this in production to only accept requests from your application's domain.

## Environment Variables

Update your `.env.local` file to include the API URL:

```
NEXT_PUBLIC_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
```

## Deployment

1. Deploy the Firebase Functions:
   ```bash
   firebase deploy --only functions
   ```

2. Update the client-side code to use the new API endpoints.

3. Build the static Next.js site:
   ```bash
   npm run build
   ```

4. Deploy the static site to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Testing the API

You can test the API endpoints with curl:

```bash
curl -X GET https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/health
```

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{"exportFormat":"json","exportType":"tickets","dateRange":"all"}' \
  https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/export-data
```