/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ticketsIndex, projectsIndex, isAlgoliaConfigured } from './algoliaConfig';
import { Ticket } from '../types/ticket';
import { Project } from '../types/project';

export async function syncTicketsToAlgolia() {
  if (!isAlgoliaConfigured || !ticketsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing tickets to Algolia...');
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    const tickets: any[] = [];

    ticketsSnapshot.forEach((doc) => {
      const data = doc.data() as Ticket;
      tickets.push({
        ...data,
        objectID: doc.id, // Algolia requires objectID
        id: doc.id,
      });
    });

    if (tickets.length > 0) {
      await ticketsIndex.saveObjects(tickets);
      console.log(`✓ Synced ${tickets.length} tickets to Algolia`);
    } else {
      console.log('No tickets found to sync');
    }
  } catch (error) {
    console.error('Error syncing tickets:', error);
    throw error;
  }
}

export async function syncProjectsToAlgolia() {
  if (!isAlgoliaConfigured || !projectsIndex) {
    throw new Error('Algolia is not configured');
  }

  try {
    console.log('Syncing projects to Algolia...');
    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    const projects: any[] = [];

    projectsSnapshot.forEach((doc) => {
      const data = doc.data() as Project;
      projects.push({
        ...data,
        objectID: doc.id, // Algolia requires objectID
        id: doc.id,
      });
    });

    if (projects.length > 0) {
      await projectsIndex.saveObjects(projects);
      console.log(`✓ Synced ${projects.length} projects to Algolia`);
    } else {
      console.log('No projects found to sync');
    }
  } catch (error) {
    console.error('Error syncing projects:', error);
    throw error;
  }
}

export async function syncAllDataToAlgolia() {
  try {
    await syncTicketsToAlgolia();
    await syncProjectsToAlgolia();
    console.log('All data synced successfully!');
  } catch (error) {
    console.error('Error syncing data to Algolia:', error);
    throw error;
  }
}

// Run this function when the file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  syncAllDataToAlgolia().catch(console.error);
}