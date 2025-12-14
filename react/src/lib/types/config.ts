/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { SLASettings, DEFAULT_SLA_SETTINGS } from './sla';
import { AutomationSettings, DEFAULT_AUTOMATION_SETTINGS } from './automation';
import { SurveySettings, DEFAULT_SURVEY_SETTINGS } from './survey';
import { AISettings, DEFAULT_AI_SETTINGS } from './aiSettings';

export interface AccessibilityPreferences {
  themeMode: 'light' | 'dark';
  fontSize: 'normal' | 'large' | 'x-large';
  highContrast: boolean;
  accentColor: string; // Legacy field for backward compatibility
  accentColors: {
    light: string;
    dark: string;
  };
}

export interface PWASettings {
  appName: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  iconUrl?: string; // Main uploaded icon URL
  generatedIcons?: {
    [size: string]: string; // Generated icon URLs by size
  };
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  themeMode: 'light',
  fontSize: 'normal',
  highContrast: false,
  accentColor: '#FF8C00', // Legacy field for backward compatibility
  accentColors: {
    light: '#FF8C00', // Default orange for light mode
    dark: '#FFA726',  // Slightly lighter orange for dark mode
  },
};

export const DEFAULT_PWA_SETTINGS: PWASettings = {
  appName: 'Help Desk - IT Support',
  shortName: 'Help Desk',
  description: 'AI-powered IT support and help desk application',
  themeColor: '#1976d2',
  backgroundColor: '#ffffff'
};

export interface AppConfig {
  companyName: string;
  companyLogo?: string;
  supportEmail: string;
  supportPhone?: string;
  adminNotificationEmail?: string;
  allowedEmailDomains?: string[];
  ticketCategories?: string[];
  accessibility?: AccessibilityPreferences;
  pdfHeaderText?: string;
  footerMarkdown?: string;
  slaSettings?: SLASettings;
  automationSettings?: AutomationSettings;
  surveySettings?: SurveySettings;
  aiSettings?: AISettings;
  pwaSettings?: PWASettings;
}

export const DEFAULT_CONFIG: AppConfig = {
  companyName: 'Help Desk',
  supportEmail: 'support@anglinai.com',
  allowedEmailDomains: ['anglinai.com', 'your-domain.com'],
  accessibility: DEFAULT_ACCESSIBILITY_PREFERENCES,
  slaSettings: DEFAULT_SLA_SETTINGS,
  automationSettings: DEFAULT_AUTOMATION_SETTINGS,
  surveySettings: DEFAULT_SURVEY_SETTINGS,
  aiSettings: DEFAULT_AI_SETTINGS,
  pwaSettings: DEFAULT_PWA_SETTINGS,
};