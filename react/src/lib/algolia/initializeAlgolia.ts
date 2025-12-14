/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { setupAlgoliaIndices } from './setup';
import { syncAllDataToAlgolia } from './syncData';

export async function initializeAlgolia() {
  try {
    console.log('Initializing Algolia...');
    
    // Step 1: Setup indices and configure settings
    await setupAlgoliaIndices();
    
    // Step 2: Sync existing data
    await syncAllDataToAlgolia();
    
    console.log('✓ Algolia initialization complete!');
  } catch (error) {
    console.error('Failed to initialize Algolia:', error);
    throw error;
  }
}

// Run this when executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  initializeAlgolia().catch(console.error);
}