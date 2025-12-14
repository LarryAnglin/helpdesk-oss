/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Task, TaskFormData } from '../types/task';
import { API_ENDPOINTS, callApi } from '../apiConfig';
import { auth } from './firebaseConfig';

const TASKS_COLLECTION = 'tasks';

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (taskSnap.exists()) {
      return { ...taskSnap.data(), id: taskSnap.id } as Task;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
};

export const getProjectTasks = async (projectId: string, tenantId?: string): Promise<Task[]> => {
  try {
    let tasksQuery;
    if (tenantId) {
      tasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('projectId', '==', projectId),
        where('tenantId', '==', tenantId),
        orderBy('order', 'asc')
      );
    } else {
      tasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('projectId', '==', projectId),
        orderBy('order', 'asc')
      );
    }
    
    const tasksSnap = await getDocs(tasksQuery);
    const tasks: Task[] = [];
    
    tasksSnap.forEach(doc => {
      tasks.push({ ...doc.data(), id: doc.id } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting project tasks:', error);
    throw error;
  }
};

export const getUserTasks = async (userId: string, tenantId?: string): Promise<Task[]> => {
  try {
    let tasksQuery;
    if (tenantId) {
      tasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('assignedTo', '==', userId),
        where('tenantId', '==', tenantId),
        orderBy('dueDate', 'asc')
      );
    } else {
      tasksQuery = query(
        collection(db, TASKS_COLLECTION),
        where('assignedTo', '==', userId),
        orderBy('dueDate', 'asc')
      );
    }
    
    const tasksSnap = await getDocs(tasksQuery);
    const tasks: Task[] = [];
    
    tasksSnap.forEach(doc => {
      tasks.push({ ...doc.data(), id: doc.id } as Task);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error getting user tasks:', error);
    throw error;
  }
};

export const subscribeToProjectTasks = (
  projectId: string,
  onTasksUpdate: (tasks: Task[]) => void,
  tenantId?: string
): Unsubscribe => {
  let tasksQuery;
  if (tenantId) {
    tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('projectId', '==', projectId),
      where('tenantId', '==', tenantId),
      orderBy('order', 'asc')
    );
  } else {
    tasksQuery = query(
      collection(db, TASKS_COLLECTION),
      where('projectId', '==', projectId),
      orderBy('order', 'asc')
    );
  }

  return onSnapshot(tasksQuery, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach(doc => {
      tasks.push({ ...doc.data(), id: doc.id } as Task);
    });
    onTasksUpdate(tasks);
  });
};

// Admin functions (use API endpoints)
export const createTask = async (projectId: string, taskData: TaskFormData): Promise<Task> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.PROJECTS}/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData)
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

export const updateTask = async (taskId: string, taskData: Partial<TaskFormData>): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.TASKS}/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.TASKS}/${taskId}`, {
      method: 'DELETE'
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId: string, newStatus: string): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.TASKS}/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

export const reorderTasks = async (projectId: string, taskOrders: { taskId: string; order: number }[]): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await callApi(`${API_ENDPOINTS.PROJECTS}/${projectId}/tasks/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ tasks: taskOrders })
    }, token);
    
    if (!response.ok) {
      throw new Error(`Failed to reorder tasks: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error reordering tasks:', error);
    throw error;
  }
};