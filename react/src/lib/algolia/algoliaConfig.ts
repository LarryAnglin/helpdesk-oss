/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import algoliasearch from 'algoliasearch';
import algoliasearchLite from 'algoliasearch/lite';

// Initialize the Algolia client
const appId = import.meta.env.VITE_ALGOLIA_APP_ID || '';
const apiKey = import.meta.env.VITE_ALGOLIA_ADMIN_API_KEY || '';
const searchApiKey = import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY || '';
console.log("apiKey: ", apiKey)
console.log("searchApiKey: ", searchApiKey)
// Check if Algolia is configured
export const isAlgoliaConfigured = !!(appId && apiKey && searchApiKey);
console.log("appId: ", appId)
console.log("algolia configured: ", isAlgoliaConfigured)
// Initialize the Algolia client with proper API key based on environment
export const adminClient = isAlgoliaConfigured ? algoliasearch(appId, apiKey) : null;
export const searchClient = isAlgoliaConfigured ? algoliasearchLite(appId, searchApiKey) : null;

// Define index names
export const TICKETS_INDEX_NAME = 'tickets';
export const PROJECTS_INDEX_NAME = 'projects';

// Get specific indices
export const ticketsIndex = adminClient?.initIndex(TICKETS_INDEX_NAME);
export const projectsIndex = adminClient?.initIndex(PROJECTS_INDEX_NAME);

// Configure search parameters
export const ticketsSearchConfig = {
  hitsPerPage: 10,
  attributesToRetrieve: [
    'id',
    'title',
    'description',
    'status',
    'priority',
    'createdBy',
    'assignedTo',
    'updatedAt',
    'createdAt',
    'location',
  ],
  attributesToHighlight: ['title', 'description'],
  filters: '',
};

export const projectsSearchConfig = {
  hitsPerPage: 10,
  attributesToRetrieve: [
    'id',
    'title',
    'description',
    'status',
    'location',
    'price',
    'dueDate',
    'createdBy',
    'createdAt',
    'updatedAt',
  ],
  attributesToHighlight: ['title', 'description'],
  filters: '',
};

// Configure admin index settings
export const configureTicketsIndex = async () => {
  if (!ticketsIndex) {
    throw new Error('Algolia is not configured. Please check your credentials.');
  }
  await ticketsIndex.setSettings({
    // Searchable attributes (order matters for relevance)
    searchableAttributes: [
      'title',
      'description',
      'id',
      'location',
      'createdBy',
      'assignedTo',
    ],
    
    // Attributes for faceting (filtering)
    attributesForFaceting: [
      'status',
      'priority',
      'createdBy',
      'assignedTo',
      'location',
    ],
    
    // Custom ranking to sort by most recent first
    customRanking: ['desc(updatedAt)'],
    
    // Highlighting and snippeting
    attributesToHighlight: ['title', 'description'],
    attributesToSnippet: ['description:50'],
    
    // Pagination
    hitsPerPage: 20,
  });
};

export const configureProjectsIndex = async () => {
  if (!projectsIndex) {
    throw new Error('Algolia is not configured. Please check your credentials.');
  }
  await projectsIndex.setSettings({
    // Searchable attributes (order matters for relevance)
    searchableAttributes: [
      'title',
      'description',
      'location',
      'id',
    ],
    
    // Attributes for faceting (filtering)
    attributesForFaceting: [
      'status',
      'location',
      'createdBy',
    ],
    
    // Custom ranking to sort by most recent first
    customRanking: ['desc(updatedAt)'],
    
    // Highlighting and snippeting
    attributesToHighlight: ['title', 'description'],
    attributesToSnippet: ['description:50'],
    
    // Pagination
    hitsPerPage: 20,
  });
};