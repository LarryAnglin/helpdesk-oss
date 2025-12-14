/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  adminClient, 
  ticketsIndex, 
  projectsIndex, 
  isAlgoliaConfigured,
  configureTicketsIndex,
  configureProjectsIndex
} from './algoliaConfig';
import { getTickets } from '../firebase/ticketService';
import { getAllProjects } from '../firebase/projectService';

export interface AlgoliaSetupStatus {
  apiKeysConfigured: boolean;
  indicesExist: boolean;
  indicesConfigured: boolean;
  dataIndexed: boolean;
  searchTested: boolean;
  errors: string[];
}

export interface AlgoliaSetupResult {
  success: boolean;
  message: string;
  status: AlgoliaSetupStatus;
}

/**
 * Check the current status of Algolia setup
 */
export const checkAlgoliaSetup = async (): Promise<AlgoliaSetupStatus> => {
  const status: AlgoliaSetupStatus = {
    apiKeysConfigured: false,
    indicesExist: false,
    indicesConfigured: false,
    dataIndexed: false,
    searchTested: false,
    errors: []
  };

  // Check if API keys are configured
  status.apiKeysConfigured = isAlgoliaConfigured;
  
  if (!status.apiKeysConfigured) {
    status.errors.push('Algolia API keys not configured in environment variables');
    return status;
  }

  if (!adminClient || !ticketsIndex || !projectsIndex) {
    status.errors.push('Algolia client not initialized');
    return status;
  }

  try {
    // Check if indices exist
    const [ticketsSettings, projectsSettings] = await Promise.all([
      ticketsIndex.getSettings().catch(() => null),
      projectsIndex.getSettings().catch(() => null)
    ]);

    status.indicesExist = !!(ticketsSettings && projectsSettings);

    if (status.indicesExist) {
      // Check if indices are properly configured
      const ticketsHasConfig = ticketsSettings && 
        ticketsSettings.searchableAttributes && 
        ticketsSettings.searchableAttributes.length > 0;
      
      const projectsHasConfig = projectsSettings && 
        projectsSettings.searchableAttributes && 
        projectsSettings.searchableAttributes.length > 0;

      status.indicesConfigured = !!(ticketsHasConfig && projectsHasConfig);

      // Check if data is indexed
      try {
        const [ticketsCount, projectsCount] = await Promise.all([
          ticketsIndex.search('*', { hitsPerPage: 1 }).then((result: any) => result.nbHits),
          projectsIndex.search('*', { hitsPerPage: 1 }).then((result: any) => result.nbHits)
        ]);

        status.dataIndexed = ticketsCount > 0 || projectsCount > 0;
      } catch (error) {
        status.errors.push(`Error checking indexed data: ${error}`);
      }

      // Test search functionality
      if (status.dataIndexed) {
        try {
          await ticketsIndex.search('test', { hitsPerPage: 1 });
          status.searchTested = true;
        } catch (error: any) {
          status.errors.push(`Search test failed: ${error}`);
        }
      }
    }
  } catch (error) {
    status.errors.push(`Error checking Algolia setup: ${error}`);
  }

  return status;
};

/**
 * Initialize Algolia indices with proper configuration
 */
export const initializeAlgoliaIndices = async (): Promise<AlgoliaSetupResult> => {
  if (!isAlgoliaConfigured) {
    return {
      success: false,
      message: 'Algolia API keys not configured',
      status: await checkAlgoliaSetup()
    };
  }

  if (!adminClient || !ticketsIndex || !projectsIndex) {
    return {
      success: false,
      message: 'Algolia client not initialized',
      status: await checkAlgoliaSetup()
    };
  }

  try {
    console.log('Configuring Algolia indices...');
    
    // Configure both indices
    await Promise.all([
      configureTicketsIndex(),
      configureProjectsIndex()
    ]);

    console.log('Algolia indices configured successfully');

    return {
      success: true,
      message: 'Algolia indices initialized and configured successfully',
      status: await checkAlgoliaSetup()
    };
  } catch (error) {
    console.error('Error initializing Algolia indices:', error);
    return {
      success: false,
      message: `Failed to initialize indices: ${error}`,
      status: await checkAlgoliaSetup()
    };
  }
};

/**
 * Index existing data from Firestore to Algolia
 */
export const indexExistingData = async (): Promise<AlgoliaSetupResult> => {
  if (!isAlgoliaConfigured || !adminClient || !ticketsIndex || !projectsIndex) {
    return {
      success: false,
      message: 'Algolia not properly configured',
      status: await checkAlgoliaSetup()
    };
  }

  try {
    console.log('Fetching existing data from Firestore...');
    
    // Fetch all tickets and projects
    const [tickets, projects] = await Promise.all([
      getTickets().catch((error: any) => {
        console.warn('Could not fetch tickets:', error);
        return [];
      }),
      getAllProjects().catch((error: any) => {
        console.warn('Could not fetch projects:', error);
        return [];
      })
    ]);

    console.log(`Found ${tickets.length} tickets and ${projects.length} projects to index`);

    // Prepare data for Algolia
    const ticketObjects = tickets.map((ticket: any) => ({
      objectID: ticket.id,
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdBy: ticket.name,
      createdByEmail: ticket.email,
      assignedTo: ticket.assigneeId || '',
      assignedToEmail: '',
      location: ticket.location,
      updatedAt: ticket.updatedAt,
      createdAt: ticket.createdAt,
      submitterId: ticket.submitterId,
      participants: ticket.participants || [],
      replies: ticket.replies || [],
      attachments: ticket.attachments || []
    }));

    const projectObjects = projects.map((project: any) => ({
      objectID: project.id,
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      location: project.location,
      price: project.price,
      dueDate: project.dueDate,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }));

    // Index the data
    const promises = [];
    
    if (ticketObjects.length > 0) {
      promises.push(ticketsIndex.saveObjects(ticketObjects));
    }
    
    if (projectObjects.length > 0) {
      promises.push(projectsIndex.saveObjects(projectObjects));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log('Data indexed successfully');
    } else {
      console.log('No data to index');
    }

    return {
      success: true,
      message: `Successfully indexed ${ticketObjects.length} tickets and ${projectObjects.length} projects`,
      status: await checkAlgoliaSetup()
    };
  } catch (error) {
    console.error('Error indexing data:', error);
    return {
      success: false,
      message: `Failed to index data: ${error}`,
      status: await checkAlgoliaSetup()
    };
  }
};

/**
 * Test search functionality
 */
export const testSearchFunctionality = async (): Promise<AlgoliaSetupResult> => {
  if (!isAlgoliaConfigured || !ticketsIndex || !projectsIndex) {
    return {
      success: false,
      message: 'Algolia not properly configured',
      status: await checkAlgoliaSetup()
    };
  }

  try {
    console.log('Testing search functionality...');
    
    // Test tickets search
    const ticketsSearchResult = await ticketsIndex.search('*', { hitsPerPage: 5 });
    
    // Test projects search
    const projectsSearchResult = await projectsIndex.search('*', { hitsPerPage: 5 });

    const ticketsFound = ticketsSearchResult.nbHits;
    const projectsFound = projectsSearchResult.nbHits;

    console.log(`Search test results: ${ticketsFound} tickets, ${projectsFound} projects found`);

    if (ticketsFound === 0 && projectsFound === 0) {
      return {
        success: false,
        message: 'Search is working but no data found. Try indexing some data first.',
        status: await checkAlgoliaSetup()
      };
    }

    return {
      success: true,
      message: `Search is working! Found ${ticketsFound} tickets and ${projectsFound} projects`,
      status: await checkAlgoliaSetup()
    };
  } catch (error) {
    console.error('Error testing search:', error);
    return {
      success: false,
      message: `Search test failed: ${error}`,
      status: await checkAlgoliaSetup()
    };
  }
};

/**
 * Complete Algolia setup - run all setup steps
 */
export const runCompleteAlgoliaSetup = async (): Promise<AlgoliaSetupResult> => {
  try {
    console.log('Starting complete Algolia setup...');

    // Step 1: Initialize indices
    const initResult = await initializeAlgoliaIndices();
    if (!initResult.success) {
      return initResult;
    }

    // Step 2: Index existing data
    const indexResult = await indexExistingData();
    if (!indexResult.success) {
      return indexResult;
    }

    // Step 3: Test search
    const testResult = await testSearchFunctionality();
    
    return {
      success: testResult.success,
      message: testResult.success 
        ? 'Algolia setup completed successfully! Search is ready to use.'
        : testResult.message,
      status: await checkAlgoliaSetup()
    };
  } catch (error) {
    console.error('Error during complete setup:', error);
    return {
      success: false,
      message: `Setup failed: ${error}`,
      status: await checkAlgoliaSetup()
    };
  }
};

/**
 * Clear all data from Algolia indices (useful for testing)
 */
export const clearAlgoliaData = async (): Promise<AlgoliaSetupResult> => {
  if (!isAlgoliaConfigured || !adminClient || !ticketsIndex || !projectsIndex) {
    return {
      success: false,
      message: 'Algolia not properly configured',
      status: await checkAlgoliaSetup()
    };
  }

  try {
    console.log('Clearing Algolia data...');
    
    await Promise.all([
      ticketsIndex.clearObjects(),
      projectsIndex.clearObjects()
    ]);

    console.log('Algolia data cleared successfully');

    return {
      success: true,
      message: 'All Algolia data cleared successfully',
      status: await checkAlgoliaSetup()
    };
  } catch (error) {
    console.error('Error clearing Algolia data:', error);
    return {
      success: false,
      message: `Failed to clear data: ${error}`,
      status: await checkAlgoliaSetup()
    };
  }
};