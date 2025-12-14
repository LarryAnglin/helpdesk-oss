<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Static Export Demo Data Fallback

This document explains how we've implemented a fallback to demo data for static exports when API access fails.

## Overview

When deploying a Next.js application as a static export to Firebase Hosting, you may encounter CORS issues when trying to access Firebase Functions APIs. This is because:

1. The static site is hosted on a different domain than the Firebase Functions
2. The Firebase Functions may not have CORS headers properly configured
3. The preflight OPTIONS requests used by browsers for CORS may not be correctly handled

Rather than having the application completely fail when API access doesn't work, we've implemented a fallback mechanism that uses demo data for key views.

## How It Works

The application now detects when it's running in a static export environment and automatically uses demo data in these cases:

```typescript
// Check if we're in a static export environment
const isStaticExport = typeof window !== 'undefined' && 
  (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' || 
   window.location.hostname.includes('web.app') || 
   window.location.hostname.includes('firebaseapp.com'));

if (isStaticExport) {
  // In static export, use demo data
  console.log('Static export environment detected, using demo data');
  const demoData = generateDemoData();
  // ...use demo data
}
```

## Components with Demo Data Fallback

1. **UserList** - Shows demo users when API access fails
2. **TicketList** - Shows demo tickets with different statuses and priorities
3. **TicketDetail** - Shows a demo ticket when viewing ticket details

## Demo Data Generation

Each component has its own `generateDemo*` function that creates realistic test data:

- **Users**: Admin, Tech, and Regular users with different statuses
- **Tickets**: Open, Resolved, and Closed tickets with various priorities
- **Ticket Details**: A demo ticket with replies and participant information

## User Experience

When using demo data, the application:

1. Shows a notification banner explaining that demo data is being displayed
2. Allows users to navigate the UI and see how the application works
3. Disables write operations (like creating tickets or replies)

## When to Use This Approach

This approach is recommended for:

1. Static exports where Firebase Functions access is problematic
2. Preview environments where you want to show the UI without real data
3. Demonstrating the application's capabilities without a backend
4. Keeping the application functional even when APIs are unavailable

## Customizing Demo Data

You can customize the demo data by editing the `generateDemo*` functions in each component. This allows you to create realistic scenarios for your specific use case.

## Improving CORS Support

While the demo data fallback provides a better user experience, it's still preferable to fix the CORS issues. See the STATIC_EXPORT_CORS.md document for details on fixing CORS issues with Firebase Functions.

## Implementation Details

The demo data fallback is implemented in:

1. `/src/components/users/UserList.tsx`
2. `/src/components/tickets/TicketList.tsx`
3. `/src/components/tickets/TicketDetail.tsx`

Each component detects when it's in a static export environment and falls back to demo data automatically when needed.