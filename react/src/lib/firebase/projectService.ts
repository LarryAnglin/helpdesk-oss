/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Project, ProjectFormData, ProjectStatus } from '../types/project';
import { auth } from './firebaseConfig';
import { projectsIndex, isAlgoliaConfigured } from '../algolia/algoliaConfig';

const PROJECTS_COLLECTION = 'projects';

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      return { ...projectSnap.data(), id: projectSnap.id } as Project;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

export const getAllProjects = async (tenantId?: string): Promise<Project[]> => {
  try {
    let projectsQuery;
    if (tenantId) {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      );
    } else {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    const projectsSnap = await getDocs(projectsQuery);
    const projects: Project[] = [];
    
    projectsSnap.forEach(doc => {
      projects.push({ ...doc.data(), id: doc.id } as Project);
    });
    
    return projects;
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
};

export const getUserProjects = async (userId: string, tenantId?: string): Promise<Project[]> => {
  try {
    let projectsQuery;
    if (tenantId) {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        where('createdBy', '==', userId),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc')
      );
    } else {
      projectsQuery = query(
        collection(db, PROJECTS_COLLECTION),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const projectsSnap = await getDocs(projectsQuery);
    const projects: Project[] = [];
    
    projectsSnap.forEach(doc => {
      projects.push({ ...doc.data(), id: doc.id } as Project);
    });
    
    return projects;
  } catch (error) {
    console.error('Error getting user projects:', error);
    throw error;
  }
};

export const subscribeToProjects = (
  onProjectsUpdate: (projects: Project[]) => void,
  tenantId?: string
): Unsubscribe => {
  let projectsQuery;
  if (tenantId) {
    projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('createdAt', 'desc')
    );
  } else {
    projectsQuery = query(
      collection(db, PROJECTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(projectsQuery, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach(doc => {
      projects.push({ ...doc.data(), id: doc.id } as Project);
    });
    onProjectsUpdate(projects);
  });
};

// Create a new project directly with Firestore
export const createProject = async (projectData: ProjectFormData, tenantId: string): Promise<Project> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const projectDoc = {
      title: projectData.title,
      description: projectData.description,
      status: 'Created' as ProjectStatus,
      priority: 'Medium' as const,
      location: projectData.location || 'RCL',
      dueDate: projectData.dueDate ? Timestamp.fromDate(new Date(projectData.dueDate)) : Timestamp.now(),
      price: projectData.price || 0,
      managerId: currentUser.uid,
      createdBy: currentUser.uid,
      tenantId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectDoc);
    
    const newProject: Project = {
      id: docRef.id,
      ...projectDoc,
      tasks: []
    };

    // Sync to Algolia if configured
    if (isAlgoliaConfigured && projectsIndex) {
      try {
        await projectsIndex.saveObject({
          ...newProject,
          objectID: docRef.id
        });
      } catch (algoliaError) {
        console.error('Error syncing to Algolia:', algoliaError);
        // Don't throw the error - we still want to return the project even if Algolia sync fails
      }
    }
    
    return newProject;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const updateProject = async (projectId: string, projectData: Partial<ProjectFormData>): Promise<void> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    
    // Remove any undefined values from projectData
    const cleanedData: any = {};
    Object.entries(projectData).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedData[key] = value;
      }
    });
    
    await updateDoc(projectRef, {
      ...cleanedData,
      updatedAt: Date.now()
    });

    // Update in Algolia if configured
    if (isAlgoliaConfigured && projectsIndex) {
      try {
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          await projectsIndex.saveObject({
            ...projectDoc.data(),
            ...cleanedData,
            id: projectId,
            objectID: projectId,
            updatedAt: Date.now()
          });
        }
      } catch (algoliaError) {
        console.error('Error updating Algolia:', algoliaError);
        // Don't throw the error - we still want the update to succeed
      }
    }
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await deleteDoc(projectRef);
    
    // Delete from Algolia if configured
    if (isAlgoliaConfigured && projectsIndex) {
      try {
        await projectsIndex.deleteObject(projectId);
      } catch (algoliaError) {
        console.error('Error deleting from Algolia:', algoliaError);
        // Don't throw the error - we still want the delete to succeed
      }
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const updateProjectStatus = async (projectId: string, newStatus: string): Promise<void> => {
  try {
    const statusUpdate = { status: newStatus as ProjectStatus };
    await updateDoc(doc(db, PROJECTS_COLLECTION, projectId), statusUpdate);
  } catch (error) {
    console.error('Error updating project status:', error);
    throw error;
  }
};