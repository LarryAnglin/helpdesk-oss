/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { ticketsIndex, projectsIndex, isAlgoliaConfigured } from './algoliaConfig';
import { API_ENDPOINTS, callApi } from '../apiConfig';
import { auth } from '../firebase/firebaseConfig';

export async function syncTicketsToAlgoliaViaAdmin() {
  if (!isAlgoliaConfigured || !ticketsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing tickets to Algolia via Admin API...');
    const token = await auth.currentUser?.getIdToken();
    
    // Use admin API endpoint to get all tickets
    const response = await callApi(API_ENDPOINTS.TICKETS, {
      method: 'GET'
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.statusText}`);
    }
    
    const tickets = await response.json();
    
    if (tickets.length > 0) {
      const algoliaTickets = tickets.map((ticket: any) => ({
        ...ticket,
        objectID: ticket.id
      }));
      
      await ticketsIndex.saveObjects(algoliaTickets);
      console.log(`✓ Synced ${tickets.length} tickets to Algolia`);
    } else {
      console.log('No tickets found to sync');
    }
  } catch (error) {
    console.error('Error syncing tickets:', error);
    throw error;
  }
}

export async function syncProjectsToAlgoliaViaAdmin() {
  if (!isAlgoliaConfigured || !projectsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing projects to Algolia via Admin API...');
    const token = await auth.currentUser?.getIdToken();
    
    // Use admin API endpoint to get all projects
    const response = await callApi(API_ENDPOINTS.PROJECTS, {
      method: 'GET'
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    
    const projects = await response.json();
    
    if (projects.length > 0) {
      const algoliaProjects = projects.map((project: any) => ({
        ...project,
        objectID: project.id
      }));
      
      await projectsIndex.saveObjects(algoliaProjects);
      console.log(`✓ Synced ${projects.length} projects to Algolia`);
    } else {
      console.log('No projects found to sync');
    }
  } catch (error) {
    console.error('Error syncing projects:', error);
    throw error;
  }
}

export async function syncAllDataToAlgoliaViaAdmin() {
  try {
    await syncTicketsToAlgoliaViaAdmin();
    await syncProjectsToAlgoliaViaAdmin();
    console.log('All data synced successfully!');
  } catch (error) {
    console.error('Error syncing data to Algolia:', error);
    throw error;
  }
}