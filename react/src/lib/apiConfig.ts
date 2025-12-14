/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// Define the base URL for API endpoints
export const API_BASE_URL = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-your-project-id.cloudfunctions.net';
export const FUNCTION_URL = API_BASE_URL;

// Define API endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  VERIFY_TOKEN: `${API_BASE_URL}/api/verify-token`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
  AUTH_STATUS: `${API_BASE_URL}/api/auth-status`,
  CREATE_USER: `${API_BASE_URL}/api/users/create`,
  
  // User endpoints
  USERS: `${FUNCTION_URL}/api/users`,
  RESET_PASSWORD: `${API_BASE_URL}/api/users/reset-password`,
  
  // Ticket endpoints
  TICKETS: `${API_BASE_URL}/api/tickets`,
  SEARCH_TICKETS: `${FUNCTION_URL}/api/search-tickets`,
  
  // Project and task endpoints
  PROJECTS: `${FUNCTION_URL}/api/projects`,
  TASKS: `${FUNCTION_URL}/api/tasks`,
  
  // Email and export endpoints
  SEND_EMAIL: `${FUNCTION_URL}/api/send-email`,
  EXPORT_DATA: `${FUNCTION_URL}/api/export_data`,
  
  // Survey endpoints
  RECORD_SURVEY_RESPONSE: `${FUNCTION_URL}/recordSurveyResponse`,
  
  // Health check
  HEALTH: `${FUNCTION_URL}/api/health`,
};

// Helper function to make API calls with consistent error handling
export const callApi = async (
  url: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> => {
  try {
    console.log(`API call to ${url}`, { method: options.method || 'GET', hasToken: !!token });
    
    // Add headers including Authorization if token is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge existing headers if they exist
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Override with updated headers
    const updatedOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'same-origin',
    };

    // Make the request
    const response = await fetch(url, updatedOptions);
    
    console.log(`API response from ${url}:`, response.status, response.statusText);
    
    // Return the response directly (let the caller handle actual response data)
    return response;
  } catch (error) {
    console.error(`API call to ${url} failed:`, error);
    throw error;
  }
};