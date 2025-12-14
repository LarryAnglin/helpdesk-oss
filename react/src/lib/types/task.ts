/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Timestamp } from 'firebase/firestore';

export type TaskStatus = 
  | 'Created' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Finished' 
  | 'Cancelled' 
  | 'Deferred'
  | 'Scheduled'
  | 'Closed';

export interface Task {
  id: string;
  projectId: string;
  description: string;
  partsRequired: string;
  toolsRequired: string;
  assignedTo: string; // User ID
  dueDate: Timestamp;
  cost: number;
  status: TaskStatus;
  order: number; // For drag and drop reordering
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskFormData {
  description: string;
  partsRequired: string;
  toolsRequired: string;
  assignedTo: string;
  dueDate: string; // ISO date string for form input
  cost: number;
}

// Type guard to check if a string is a valid TaskStatus
export function isValidTaskStatus(status: string): status is TaskStatus {
  return [
    'Created',
    'Assigned',
    'In Progress',
    'Finished',
    'Cancelled',
    'Deferred',
    'Scheduled',
    'Closed'
  ].includes(status);
}