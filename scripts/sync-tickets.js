/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Sync Tickets to Algolia
 * 
 * This script syncs all tickets from Firestore to Algolia.
 * It's useful for initial setup or reindexing after changes to the index structure.
 * 
 * Usage:
 * - Ensure ALGOLIA and FIREBASE environment variables are set
 * - Run: node scripts/sync-tickets.js
 */

require('dotenv').config();
const admin = require('firebase-admin');
const algoliasearch = require('algoliasearch');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Use service account from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    console.error('Error: Firebase service account key is missing.');
    console.error('Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable.');
    process.exit(1);
  }
} catch (error) {
  console.error('Error parsing Firebase service account key:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
});

// Initialize Algolia client
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;

// Validate Algolia configuration
if (!appId || !apiKey) {
  console.error('Error: Algolia credentials are missing.');
  console.error('Please set NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY environment variables.');
  process.exit(1);
}

const algoliaClient = algoliasearch(appId, apiKey);
const ticketsIndex = algoliaClient.initIndex('tickets');
const firestore = admin.firestore();

// Prepares a ticket object for indexing in Algolia
function prepareTicketForIndexing(ticket) {
  return {
    objectID: ticket.id, // Required by Algolia for proper record updating
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    createdBy: ticket.participants?.find(p => p.userId === ticket.submitterId)?.name || '',
    createdByEmail: ticket.participants?.find(p => p.userId === ticket.submitterId)?.email || '',
    assignedTo: ticket.participants?.find(p => p.role === 'assignee')?.name || '',
    assignedToEmail: ticket.participants?.find(p => p.role === 'assignee')?.email || '',
    location: ticket.location || '',
    // Convert dates to Unix timestamps for sorting
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).getTime() / 1000 : 0,
    updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).getTime() / 1000 : 0,
    // Count of replies for potential filtering/sorting
    replyCount: ticket.replies?.length || 0,
    // Include reply text for searching, but limit to first 3
    replyText: ticket.replies?.slice(0, 3).map(reply => reply.message).join(' ') || '',
    // Include participant emails as an array for filtering
    participantEmails: ticket.participants?.map(p => p.email) || [],
  };
}

// Sync all tickets from Firestore to Algolia
async function syncTicketsToAlgolia() {
  console.log('Starting ticket sync to Algolia...');
  
  try {
    // Get all tickets from Firestore
    const ticketsSnapshot = await firestore.collection('tickets').get();
    
    if (ticketsSnapshot.empty) {
      console.log('No tickets found in Firestore.');
      return;
    }
    
    console.log(`Found ${ticketsSnapshot.size} tickets in Firestore.`);
    
    // Prepare tickets for Algolia
    const algoliaTickets = [];
    
    ticketsSnapshot.forEach(doc => {
      const ticket = {
        id: doc.id,
        ...doc.data()
      };
      
      algoliaTickets.push(prepareTicketForIndexing(ticket));
    });
    
    // Sync to Algolia
    console.log(`Saving ${algoliaTickets.length} tickets to Algolia...`);
    const result = await ticketsIndex.saveObjects(algoliaTickets);
    
    console.log(`✅ Successfully synced ${algoliaTickets.length} tickets to Algolia!`);
    console.log(`ObjectIDs: ${result.objectIDs.length}`);
    
  } catch (error) {
    console.error('❌ Error syncing tickets to Algolia:', error);
    process.exit(1);
  }
}

// Run the sync
syncTicketsToAlgolia()
  .then(() => {
    console.log('Sync completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Sync failed:', error);
    process.exit(1);
  });