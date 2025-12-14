/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { KnowledgeBaseSettings, DEFAULT_KNOWLEDGE_BASE_SETTINGS } from './knowledgeBase';

export interface AISettings {
  enabled: boolean;
  ticketInsightsEnabled: boolean;
  maxInsightTokens: number; // Maximum tokens to use for ticket insights context
  insightRetentionDays: number; // How long to keep ticket insights
  autoAnalyzeClosedTickets: boolean; // Whether to automatically analyze closed tickets
  knowledgeBaseSettings: KnowledgeBaseSettings; // Knowledge base configuration
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: true,
  ticketInsightsEnabled: true,
  maxInsightTokens: 100000, // 100K tokens by default
  insightRetentionDays: 90, // Keep insights for 90 days
  autoAnalyzeClosedTickets: true,
  knowledgeBaseSettings: DEFAULT_KNOWLEDGE_BASE_SETTINGS
};