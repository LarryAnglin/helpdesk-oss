<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Firestore Indexes

This document describes the Firestore indexes required for the Help Desk application to function properly.

## Required Indexes

The following indexes must be created in your Firestore database:

1. **Tickets by Status and UpdatedAt**
   - Collection: `tickets`
   - Fields:
     - `status` (ASCENDING)
     - `updatedAt` (DESCENDING)
   - Used for: Sorting tickets by status and most recently updated

2. **Tickets by Participants and UpdatedAt**
   - Collection: `tickets`
   - Fields:
     - `participants` (ARRAY_CONTAINS)
     - `updatedAt` (DESCENDING)
   - Used for: Notifications and filtering tickets by participant

3. **Tickets by SubmitterId and UpdatedAt**
   - Collection: `tickets`
   - Fields:
     - `submitterId` (ASCENDING)
     - `updatedAt` (DESCENDING)
   - Used for: Filtering tickets by submitter and sorting by most recently updated

4. **Tickets by UpdatedAt**
   - Collection: `tickets`
   - Fields:
     - `updatedAt` (DESCENDING)
   - Used for: Global sorting of tickets by most recently updated

## Troubleshooting

If you encounter an error message like the following in your console:

```
FirebaseError: (firestore/failed-precondition) The query requires an index. You can create it here: https://console.firebase.google.com/...
```

Please click on the provided URL to create the required index. After creating the index, it may take a few minutes for it to be deployed and become active.

## Manual Index Creation

You can also deploy these indexes manually using the Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

The index definitions are stored in the `firestore.indexes.json` file at the root of the project.

## Missing Index Errors

The application is designed to gracefully handle missing index errors, but some features like notifications may not work correctly until all required indexes are created.