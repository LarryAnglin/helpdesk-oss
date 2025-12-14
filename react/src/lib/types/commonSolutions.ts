/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface CommonSolution {
  id: string;
  title: string;
  link: string;
  inlineText?: string; // Optional inline text to display instead of a link
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateCommonSolutionRequest {
  title: string;
  link?: string;
  inlineText?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateCommonSolutionRequest {
  id: string;
  title?: string;
  link?: string;
  inlineText?: string;
  isActive?: boolean;
  order?: number;
}