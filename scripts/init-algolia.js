/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

/**
 * Initialize Algolia Indexes
 * 
 * This script configures Algolia indexes for the Help Desk application.
 * It sets up proper settings for the tickets index including searchable attributes,
 * faceting attributes, and ranking settings.
 * 
 * Usage:
 * - Set ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY environment variables
 * - Run: node scripts/init-algolia.js
 */

require('dotenv').config();
const algoliasearch = require('algoliasearch');

// Get configuration from environment variables
const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;

// Validate configuration
if (!appId || !apiKey) {
  console.error('Error: Algolia credentials are missing.');
  console.error('Please set NEXT_PUBLIC_ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY environment variables.');
  process.exit(1);
}

// Initialize Algolia client
const client = algoliasearch(appId, apiKey);

// Define index names
const TICKETS_INDEX_NAME = 'tickets';

// Configure the tickets index
async function configureTicketsIndex() {
  console.log(`Configuring Algolia index: ${TICKETS_INDEX_NAME}...`);
  
  try {
    const index = client.initIndex(TICKETS_INDEX_NAME);
    
    // Set index settings
    await index.setSettings({
      // Searchable attributes (order matters for relevance)
      searchableAttributes: [
        'title',
        'description',
        'id',
        'location',
        'createdBy',
        'assignedTo',
        'replyText'
      ],
      
      // Attributes for faceting (filtering)
      attributesForFaceting: [
        'status',
        'priority',
        'createdByEmail',
        'assignedToEmail',
        'location',
        'participantEmails'
      ],
      
      // Custom ranking to sort by most recent first
      customRanking: ['desc(updatedAt)'],
      
      // Highlighting and snippeting
      attributesToHighlight: ['title', 'description', 'replyText'],
      attributesToSnippet: ['description:50', 'replyText:50'],
      
      // Pagination
      hitsPerPage: 20,
      
      // Typo tolerance settings
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      typoTolerance: 'strict',
      
      // Distinct settings - only one result per ticket ID
      distinct: true,
      attributeForDistinct: 'id',
    });
    
    console.log(`✅ Successfully configured ${TICKETS_INDEX_NAME} index!`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error configuring ${TICKETS_INDEX_NAME} index:`, error);
    return false;
  }
}

// Execute configuration
async function initializeAlgolia() {
  console.log('Initializing Algolia indexes...');
  
  let success = true;
  
  // Configure tickets index
  const ticketsResult = await configureTicketsIndex();
  if (!ticketsResult) success = false;
  
  // Add more index configurations here if needed
  
  if (success) {
    console.log('✅ Algolia initialization completed successfully!');
  } else {
    console.error('❌ Algolia initialization completed with errors.');
    process.exit(1);
  }
}

// Run the initialization
initializeAlgolia();