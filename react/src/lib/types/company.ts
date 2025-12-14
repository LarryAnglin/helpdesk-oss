/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface Company {
  id: string;
  name: string;
  organizationId: string; // Organization this company belongs to
  logoUrl?: string;
  logoFilename?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string; // User ID who created the company
  
  // Settings
  settings?: {
    primaryColor?: string; // Future: custom theme color
    emailDomain?: string; // Future: for auto-assigning users by email
  };
  
  // Status
  isActive: boolean;
  
  // Metadata
  userCount?: number; // Maintained by cloud function or manual update
  tenantIds?: string[]; // List of tenant IDs this company has access to
}

export interface CompanyFormData {
  name: string;
  logoFile?: File;
  settings?: Company['settings'];
}

export interface CompanyWithStats extends Company {
  activeUsers: number;
  totalTickets: number;
  openTickets: number;
}