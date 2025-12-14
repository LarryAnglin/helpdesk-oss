/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { searchClient, TICKETS_INDEX_NAME, PROJECTS_INDEX_NAME, isAlgoliaConfigured } from './algoliaConfig';

interface SearchOptions {
  filters?: string;
  hitsPerPage?: number;
  page?: number;
  [key: string]: any;
}

export interface SearchFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  createdBy?: string;
  location?: string;
}

export const searchTickets = async (
  query: string,
  filters?: SearchFilters,
  options?: SearchOptions
) => {
  try {
    if (!isAlgoliaConfigured || !searchClient) {
      console.warn('Algolia is not configured. Please set up your Algolia credentials.');
      return {
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: 0,
        processingTimeMS: 0,
        exhaustive: { nbHits: true },
        query: '',
        params: '',
      };
    }

    const filtersArray: string[] = [];
    
    // Build filters
    if (filters?.status) {
      filtersArray.push(`status:"${filters.status}"`);
    }
    if (filters?.priority) {
      filtersArray.push(`priority:"${filters.priority}"`);
    }
    if (filters?.assignedTo) {
      filtersArray.push(`assignedTo:"${filters.assignedTo}"`);
    }
    if (filters?.createdBy) {
      filtersArray.push(`createdBy:"${filters.createdBy}"`);
    }
    if (filters?.location) {
      filtersArray.push(`location:"${filters.location}"`);
    }
    
    const searchOptions: SearchOptions = {
      filters: filtersArray.join(' AND '),
      ...options,
    };
    
    const result = await searchClient.search([
      {
        indexName: TICKETS_INDEX_NAME,
        query,
        params: searchOptions,
      },
    ]);
    
    return result.results[0];
  } catch (error) {
    console.error('Error searching tickets:', error);
    throw error;
  }
};

export const searchProjects = async (
  query: string,
  filters?: SearchFilters,
  options?: SearchOptions
) => {
  try {
    if (!isAlgoliaConfigured || !searchClient) {
      console.warn('Algolia is not configured. Please set up your Algolia credentials.');
      return {
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        hitsPerPage: 0,
        processingTimeMS: 0,
        exhaustive: { nbHits: true },
        query: '',
        params: '',
      };
    }

    const filtersArray: string[] = [];
    
    // Build filters
    if (filters?.status) {
      filtersArray.push(`status:"${filters.status}"`);
    }
    if (filters?.location) {
      filtersArray.push(`location:"${filters.location}"`);
    }
    if (filters?.createdBy) {
      filtersArray.push(`createdBy:"${filters.createdBy}"`);
    }
    
    const searchOptions: SearchOptions = {
      filters: filtersArray.join(' AND '),
      ...options,
    };
    
    const result = await searchClient.search([
      {
        indexName: PROJECTS_INDEX_NAME,
        query,
        params: searchOptions,
      },
    ]);
    
    return result.results[0];
  } catch (error) {
    console.error('Error searching projects:', error);
    throw error;
  }
};