<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Algolia Search Implementation

This document outlines the Algolia search implementation for the HelpDesk application.

__App id__
T5WDVP4AC3

__API__
d6720b7b6885eea0800246afc5d3a2dd

## Overview

We've integrated Algolia search to provide fast and powerful search capabilities for tickets in the HelpDesk application. The implementation includes:

1. Ticket indexing in Algolia
2. Real-time synchronization between Firestore and Algolia
3. Search API endpoint
4. Search UI component integrated with the ticket list
5. Direct client-side search for static exports

## Static Export Support

The search functionality has been configured to work in both regular and static export deployments using a Firebase Cloud Function:

1. **Firebase Cloud Function**: All search requests now go through a dedicated Firebase Cloud Function endpoint at `/search-tickets`. This provides:
   - Consistent behavior across both regular and static exports
   - Enhanced security (Algolia API keys remain on the server)
   - User permission enforcement on the server-side

2. **Configuration**: The Firebase Function URL is configured via the `NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL` environment variable.

## Setup

### 1. Algolia Account Setup

1. Create an Algolia account at [https://www.algolia.com/](https://www.algolia.com/)
2. Create a new application in your Algolia dashboard
3. Get your Application ID, Search API Key, and Admin API Key

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```
NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_algolia_search_api_key
ALGOLIA_ADMIN_API_KEY=your_algolia_admin_api_key
```

### 3. Initialize Algolia Indexes

Run the initialization script to set up the Algolia indexes with the correct settings:

```bash
node scripts/init-algolia.js
```

### 4. Sync Existing Tickets

If you have existing tickets in Firestore, sync them to Algolia:

```bash
node scripts/sync-tickets.js
```

## Implementation Details

### 1. Algolia Configuration

The Algolia configuration is defined in `src/lib/algolia/algoliaConfig.ts`. It sets up:

- Algolia clients for admin and search operations
- Index names and search configurations
- Index settings like searchable attributes, faceting, and ranking

### 2. Ticket Indexing

Tickets are prepared for indexing in `src/lib/algolia/ticketIndexService.ts`, which:

- Formats ticket data to optimize for search
- Provides functions for adding, updating, and removing tickets from the index

### 3. Synchronized Operations

The `src/lib/firebase/ticketServiceWithAlgolia.ts` file extends the regular ticket service to keep Algolia in sync:

- When tickets are created, they're added to Algolia
- When tickets are updated, the Algolia index is updated
- When tickets are deleted, they're removed from Algolia

### 4. Search API Endpoint

The search API endpoint at `src/pages/api/api/search-tickets.ts` provides:

- Secure access to search (requires authentication)
- Support for filtering by status, priority, assigned user, etc.
- Text search across ticket title, description, and replies

### 5. Search UI

The search UI is implemented in two components:

- `src/components/search/TicketSearch.tsx` - The search input and filters
- `src/components/tickets/TicketList.tsx` - Displays search results

## Search Features

The implementation supports:

- **Full-text search** across ticket title, description, and replies
- **Filtering** by status, priority, assigned user, and more
- **Faceting** for quick filtering options
- **Highlighting** of search matches in results
- **Sorting** by relevance or recency

## Maintenance

To maintain the search functionality:

1. Ensure all ticket operations go through the `ticketServiceWithAlgolia.ts` service
2. Keep Algolia environment variables secure
3. Run the sync script if you need to refresh the index

If you make changes to the index structure, you'll need to:

1. Update the index settings in `algoliaConfig.ts`
2. Run the initialization script
3. Re-sync the tickets

## Deployment Instructions

### 1. Deploy the Firebase Function

To deploy the search functionality to Firebase:

```bash
cd functions
npm install
npm run deploy
```

### 2. Update Environment Variables

After deploying, update your `.env.local` file with the correct Firebase Functions URL:

```
NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

### 3. Algolia Configuration in Functions

Ensure your Firebase Functions environment has the correct Algolia configuration:

```bash
firebase functions:config:set algolia.app_id="YOUR_APP_ID" algolia.api_key="YOUR_ADMIN_API_KEY"
```

## Security Considerations

The Firebase Function implementation ensures:

1. **Protected API Keys**: Your Algolia admin API key remains secure on the server.
2. **User Authentication**: All search requests are authenticated using Firebase Auth.
3. **Role-Based Access Control**: Search results are filtered based on the user's role.
4. **Data Privacy**: Users only see tickets they have permission to access.