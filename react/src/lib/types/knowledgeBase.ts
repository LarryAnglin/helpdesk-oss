/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Timestamp } from 'firebase/firestore';

export type KnowledgeSourceType = 
  | 'website' 
  | 'google_doc' 
  | 'google_sheet' 
  | 'google_calendar'
  | 'pdf_upload' 
  | 'pdf_url' 
  | 'firestore_collection';

export interface KnowledgeSource {
  id: string;
  tenantId?: string;
  name: string;
  type: KnowledgeSourceType;
  enabled: boolean;
  config: KnowledgeSourceConfig;
  lastProcessed?: Timestamp;
  lastError?: string;
  processingStatus: 'idle' | 'processing' | 'error' | 'completed';
  tokenCount: number;
  contentCount: number; // Number of documents/pages/items processed
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type KnowledgeSourceConfig = 
  | WebsiteConfig 
  | GoogleDocConfig 
  | GoogleSheetConfig 
  | GoogleCalendarConfig
  | PDFUploadConfig 
  | PDFUrlConfig 
  | FirestoreCollectionConfig;

export interface WebsiteConfig {
  type: 'website';
  baseUrl: string;
  maxDepth: number; // How many levels deep to crawl
  maxPages: number; // Maximum pages to crawl
  includePatterns: string[]; // URL patterns to include
  excludePatterns: string[]; // URL patterns to exclude
  respectRobotsTxt: boolean;
  rateLimitMs: number; // Milliseconds between requests
}

export interface GoogleDocConfig {
  type: 'google_doc';
  shareableLink: string;
  documentId: string; // Extracted from the link
}

export interface GoogleSheetConfig {
  type: 'google_sheet';
  shareableLink: string;
  spreadsheetId: string; // Extracted from the link
  processAllSheets: boolean;
  specificSheets?: string[]; // If not processing all sheets
}

export interface GoogleCalendarConfig {
  type: 'google_calendar';
  shareableLink: string;
  calendarId: string; // Extracted from the link
  daysAhead: number; // How many days in the future to include
  daysBack: number; // How many days in the past to include
}

export interface PDFUploadConfig {
  type: 'pdf_upload';
  fileName: string;
  fileSize: number;
  storagePath: string; // Path in Firebase Storage
  uploadedAt: Timestamp;
}

export interface PDFUrlConfig {
  type: 'pdf_url';
  url: string;
  checkForUpdates: boolean;
  lastModified?: string; // HTTP Last-Modified header value
}

export interface FirestoreCollectionConfig {
  type: 'firestore_collection';
  collectionPath: string;
  documentFields: string[]; // Which fields to include in processing
  maxDocuments: number; // Limit to prevent excessive token usage
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  whereConditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
}

export interface ProcessedContent {
  id: string;
  tenantId?: string;
  sourceId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  content: string;
  summary?: string; // AI-generated summary for better context
  url?: string; // Original URL if applicable
  metadata: ProcessedContentMetadata;
  tokenCount: number;
  processedAt: Timestamp;
  storagePath?: string; // Path in Firebase Storage if stored there
}

export type ProcessedContentMetadata = 
  | WebsiteMetadata 
  | GoogleDocMetadata 
  | GoogleSheetMetadata 
  | GoogleCalendarMetadata
  | PDFMetadata 
  | FirestoreMetadata;

export interface WebsiteMetadata {
  type: 'website';
  url: string;
  pageTitle?: string;
  lastCrawled: Date;
  depth: number; // How deep in the crawl this page was found
}

export interface GoogleDocMetadata {
  type: 'google_doc';
  documentId: string;
  documentTitle?: string;
  lastModified?: Date;
}

export interface GoogleSheetMetadata {
  type: 'google_sheet';
  spreadsheetId: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  lastModified?: Date;
}

export interface GoogleCalendarMetadata {
  type: 'google_calendar';
  calendarId: string;
  eventCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface PDFMetadata {
  type: 'pdf';
  fileName: string;
  pageCount: number;
  fileSize: number;
  hasOCR: boolean; // Whether OCR was applied
  lastModified?: Date;
}

export interface FirestoreMetadata {
  type: 'firestore';
  collectionPath: string;
  documentId: string;
  documentCount: number;
  lastQueried: Date;
}

export interface KnowledgeBaseSettings {
  enabled: boolean;
  maxTokens: number; // Total token budget for knowledge base sources
  autoSelectRelevantSources: boolean; // Whether to auto-select sources or include all
  processingSchedule: {
    websites: string; // Cron expression for website crawling
    googleDocs: string; // Cron expression for Google Docs processing
    pdfUrls: string; // Cron expression for PDF URL checking
  };
  rateLimits: {
    websiteCrawling: number; // Requests per minute
    googleApiCalls: number; // API calls per minute
  };
}

export const DEFAULT_KNOWLEDGE_BASE_SETTINGS: KnowledgeBaseSettings = {
  enabled: true,
  maxTokens: 400000, // 400K tokens
  autoSelectRelevantSources: true,
  processingSchedule: {
    websites: '0 2 * * *', // Daily at 2 AM
    googleDocs: '0 3 * * *', // Daily at 3 AM
    pdfUrls: '0 4 * * *', // Daily at 4 AM
  },
  rateLimits: {
    websiteCrawling: 10, // 10 requests per minute
    googleApiCalls: 100, // 100 API calls per minute
  }
};

export interface KnowledgeBaseQuery {
  question: string;
  selectedSources?: string[]; // Specific source IDs to include
  maxTokens?: number; // Override default token limit
  includeMetadata?: boolean; // Whether to include source metadata in response
}

export interface KnowledgeBaseResponse {
  relevantContent: ProcessedContent[];
  totalTokensUsed: number;
  sourcesUsed: string[]; // Source IDs that contributed content
  wasFiltered: boolean; // Whether some sources were excluded due to token limits
  suggestions?: {
    tryWithMoreSources: boolean;
    availableSources: string[]; // Additional sources that could be included
  };
}

// Utility types for form handling
export interface CreateKnowledgeSourceRequest {
  name: string;
  type: KnowledgeSourceType;
  config: Partial<KnowledgeSourceConfig>;
  enabled?: boolean;
}

export interface UpdateKnowledgeSourceRequest {
  id: string;
  name?: string;
  config?: Partial<KnowledgeSourceConfig>;
  enabled?: boolean;
}