/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 
  | 'Created' 
  | 'Approved' 
  | 'Denied' 
  | 'In Progress' 
  | 'Waiting' 
  | 'Cancelled' 
  | 'Deferred' 
  | 'Completed';

export interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  dueDate: Timestamp;
  status: ProjectStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tasks: string[]; // Array of task IDs
}

export interface ProjectFormData {
  title: string;
  description: string;
  location: string;
  price: number;
  dueDate: string; // ISO date string for form input
}

// Type guard to check if a string is a valid ProjectStatus
export function isValidProjectStatus(status: string): status is ProjectStatus {
  return [
    'Created',
    'Approved',
    'Denied',
    'In Progress',
    'Waiting',
    'Cancelled',
    'Deferred',
    'Completed'
  ].includes(status);
}