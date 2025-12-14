/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { ticketsIndex, projectsIndex, isAlgoliaConfigured } from './algoliaConfig';
import { getTickets } from '../firebase/ticketService';
import { getAllProjects } from '../firebase/projectService';

export async function syncTicketsToAlgoliaViaAPI() {
  if (!isAlgoliaConfigured || !ticketsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing tickets to Algolia via API...');
    // Use the service function that has proper authentication
    const tickets = await getTickets();
    
    if (tickets.length > 0) {
      const algoliaTickets = tickets.map(ticket => ({
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

export async function syncProjectsToAlgoliaViaAPI() {
  if (!isAlgoliaConfigured || !projectsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing projects to Algolia via API...');
    // Use the service function that has proper authentication
    const projects = await getAllProjects();
    
    if (projects.length > 0) {
      const algoliaProjects = projects.map(project => ({
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

export async function syncAllDataToAlgoliaViaAPI() {
  try {
    await syncTicketsToAlgoliaViaAPI();
    await syncProjectsToAlgoliaViaAPI();
    console.log('All data synced successfully!');
  } catch (error) {
    console.error('Error syncing data to Algolia:', error);
    throw error;
  }
}