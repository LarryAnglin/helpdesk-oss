/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

/**
 * Error classification and handling utilities
 */

// Error types
const ERROR_TYPES = {
  USER_ERROR: 'USER_ERROR',           // User can fix this (bad input, missing data, etc.)
  CLIENT_ERROR: 'CLIENT_ERROR',       // Client-side issue (network, browser, etc.)
  SERVER_ERROR: 'SERVER_ERROR',       // Server-side issue requiring admin attention
  SYSTEM_ERROR: 'SYSTEM_ERROR'        // Critical system failure
};

// Error codes for consistent handling
const ERROR_CODES = {
  // User actionable errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_DATA: 'MISSING_DATA',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  
  // Client errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Server errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PDF_GENERATION_ERROR: 'PDF_GENERATION_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  
  // System errors
  MEMORY_ERROR: 'MEMORY_ERROR',
  DISK_SPACE_ERROR: 'DISK_SPACE_ERROR',
  CRITICAL_FAILURE: 'CRITICAL_FAILURE'
};

/**
 * Classify an error based on its type and context
 */
const classifyError = (error, context = {}) => {
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Authentication/Authorization errors - USER_ERROR
  if (error.code === 'auth/invalid-token' || error.code === 'auth/token-expired') {
    return {
      type: ERROR_TYPES.USER_ERROR,
      code: ERROR_CODES.UNAUTHORIZED,
      userMessage: 'Your session has expired. Please sign in again.',
      action: 'REFRESH_AUTH'
    };
  }
  
  if (error.code === 'permission-denied') {
    return {
      type: ERROR_TYPES.USER_ERROR,
      code: ERROR_CODES.FORBIDDEN,
      userMessage: 'You do not have permission to perform this action.',
      action: 'CONTACT_ADMIN'
    };
  }
  
  // Input validation errors - USER_ERROR
  if (errorMessage.includes('invalid input') || errorMessage.includes('validation failed')) {
    return {
      type: ERROR_TYPES.USER_ERROR,
      code: ERROR_CODES.INVALID_INPUT,
      userMessage: 'Please check your input and try again.',
      action: 'FIX_INPUT'
    };
  }
  
  // PDF generation errors - SERVER_ERROR
  if (errorMessage.includes('pdfkit') || errorMessage.includes('pdf') || context.operation === 'pdf_export') {
    return {
      type: ERROR_TYPES.SERVER_ERROR,
      code: ERROR_CODES.PDF_GENERATION_ERROR,
      userMessage: 'We encountered an issue generating your PDF export.',
      action: 'CONTACT_SUPPORT',
      technicalDetails: error.message
    };
  }
  
  // Database errors - SERVER_ERROR
  if (errorMessage.includes('firestore') || errorMessage.includes('database') || error.code?.startsWith('firestore/')) {
    return {
      type: ERROR_TYPES.SERVER_ERROR,
      code: ERROR_CODES.DATABASE_ERROR,
      userMessage: 'We are experiencing database connectivity issues.',
      action: 'CONTACT_SUPPORT',
      technicalDetails: error.message
    };
  }
  
  // Memory/Resource errors - SYSTEM_ERROR
  if (errorMessage.includes('out of memory') || errorMessage.includes('memory limit')) {
    return {
      type: ERROR_TYPES.SYSTEM_ERROR,
      code: ERROR_CODES.MEMORY_ERROR,
      userMessage: 'Our system is currently experiencing high load.',
      action: 'ESCALATE_IMMEDIATELY',
      technicalDetails: error.message
    };
  }
  
  // Network/External service errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('enotfound')) {
    return {
      type: ERROR_TYPES.CLIENT_ERROR,
      code: ERROR_CODES.NETWORK_ERROR,
      userMessage: 'Please check your internet connection and try again.',
      action: 'RETRY'
    };
  }
  
  // Default to server error for unknown issues
  return {
    type: ERROR_TYPES.SERVER_ERROR,
    code: ERROR_CODES.CRITICAL_FAILURE,
    userMessage: 'We encountered an unexpected error.',
    action: 'CONTACT_SUPPORT',
    technicalDetails: error.message
  };
};

/**
 * Generate an error ID for tracking
 */
const generateErrorId = () => {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
};

/**
 * Log error with appropriate severity and context
 */
const logError = async (error, classification, context = {}) => {
  const errorId = generateErrorId();
  const timestamp = new Date().toISOString();
  
  const logData = {
    errorId,
    timestamp,
    type: classification.type,
    code: classification.code,
    originalError: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    userAgent: context.userAgent,
    userId: context.userId,
    action: classification.action
  };
  
  // Log to console with appropriate level
  const logLevel = classification.type === ERROR_TYPES.SYSTEM_ERROR ? 'error' : 
                   classification.type === ERROR_TYPES.SERVER_ERROR ? 'error' : 'warn';
  
  console[logLevel](`[${errorId}] ${classification.type}:`, logData);
  
  // For server and system errors, log to Firestore for tracking
  if (classification.type === ERROR_TYPES.SERVER_ERROR || classification.type === ERROR_TYPES.SYSTEM_ERROR) {
    try {
      await admin.firestore().collection('error_logs').add({
        ...logData,
        needsAttention: true,
        resolved: false
      });
    } catch (firestoreError) {
      console.error('Failed to log error to Firestore:', firestoreError);
    }
  }
  
  return errorId;
};

/**
 * Send error notification to support team for critical issues
 */
const notifySupport = async (errorId, classification, context = {}) => {
  if (classification.action === 'ESCALATE_IMMEDIATELY' || 
      classification.type === ERROR_TYPES.SYSTEM_ERROR) {
    
    // Here you would integrate with your notification system
    // For now, we'll just log it prominently
    console.error(`🚨 CRITICAL ERROR REQUIRES IMMEDIATE ATTENTION: ${errorId}`);
    console.error('Classification:', classification);
    console.error('Context:', context);
    
    // TODO: Integrate with email, Slack, PagerDuty, etc.
    // Example integrations:
    // - Send email to support team
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Send SMS to on-call engineer
  }
};

/**
 * Create standardized error response
 */
const createErrorResponse = (error, context = {}) => {
  const classification = classifyError(error, context);
  const errorId = generateErrorId();
  
  // Log the error
  logError(error, classification, { ...context, errorId }).catch(console.error);
  
  // Notify support if needed
  if (classification.action === 'ESCALATE_IMMEDIATELY' || 
      classification.action === 'CONTACT_SUPPORT') {
    notifySupport(errorId, classification, context).catch(console.error);
  }
  
  const response = {
    success: false,
    error: {
      id: errorId,
      type: classification.type,
      code: classification.code,
      message: classification.userMessage,
      action: classification.action,
      timestamp: new Date().toISOString()
    }
  };
  
  // Include technical details for server errors to help with troubleshooting
  if (classification.type === ERROR_TYPES.SERVER_ERROR && classification.technicalDetails) {
    response.error.technicalDetails = classification.technicalDetails;
  }
  
  // Include support contact info for errors that require support
  if (classification.action === 'CONTACT_SUPPORT' || classification.action === 'ESCALATE_IMMEDIATELY') {
    response.error.support = {
      message: "Our technical team has been notified and is working on this issue.",
      contact: {
        email: "support@yourcompany.com",
        phone: "+1-555-SUPPORT",
        hours: "Monday-Friday 9AM-5PM EST"
      },
      trackingId: errorId
    };
  }
  
  return response;
};

/**
 * Get HTTP status code based on error classification
 */
const getHttpStatusCode = (classification) => {
  switch (classification.type) {
    case ERROR_TYPES.USER_ERROR:
      switch (classification.code) {
        case ERROR_CODES.UNAUTHORIZED: return 401;
        case ERROR_CODES.FORBIDDEN: return 403;
        case ERROR_CODES.NOT_FOUND: return 404;
        case ERROR_CODES.INVALID_INPUT: return 400;
        default: return 400;
      }
    case ERROR_TYPES.CLIENT_ERROR: return 400;
    case ERROR_TYPES.SERVER_ERROR: return 500;
    case ERROR_TYPES.SYSTEM_ERROR: return 503;
    default: return 500;
  }
};

module.exports = {
  ERROR_TYPES,
  ERROR_CODES,
  classifyError,
  generateErrorId,
  logError,
  notifySupport,
  createErrorResponse,
  getHttpStatusCode
};