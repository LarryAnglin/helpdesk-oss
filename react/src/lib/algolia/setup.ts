/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { configureTicketsIndex, configureProjectsIndex } from './algoliaConfig';

export async function setupAlgoliaIndices() {
  try {
    console.log('Setting up Algolia indices...');
    
    // Configure the tickets index
    await configureTicketsIndex();
    console.log('✓ Tickets index configured');
    
    // Configure the projects index
    await configureProjectsIndex();
    console.log('✓ Projects index configured');
    
    console.log('Algolia indices setup complete!');
  } catch (error) {
    console.error('Error setting up Algolia indices:', error);
    throw error;
  }
}

// Run this function when the file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  setupAlgoliaIndices().catch(console.error);
}