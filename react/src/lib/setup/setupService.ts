/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getFunctions } from 'firebase/functions';
import { checkAlgoliaSetup } from '../algolia/setupHelper';

export interface SetupStatus {
  isComplete: boolean;
  hasFirebaseConfig: boolean;
  hasRequiredServices: boolean;
  hasAdminUser: boolean;
  servicesStatus: {
    firestore: boolean;
    authentication: boolean;
    storage: boolean;
    functions: boolean;
    hosting: boolean;
  };
  secretsStatus: {
    emailExtension: boolean; // Firebase Extensions Trigger Email
    vapidKey: boolean;
    algolia?: boolean;
    geminiApi?: boolean;
  };
  timestamp?: number;
}

export interface FirebaseConfigInput {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseURL?: string;
}

export interface SecretConfig {
  emailSender?: string; // Default email sender address for Firebase Extensions
  vapidKey?: string;
  algolia?: {
    appId: string;
    adminApiKey: string;
    searchApiKey: string;
  };
  geminiApiKey?: string;
}

const SETUP_DOC_ID = 'setup_config';
const SETUP_COLLECTION = 'system';

/**
 * Check if the initial setup has been completed
 */
export async function checkSetupStatus(): Promise<SetupStatus> {
  try {
    const setupDoc = await getDoc(doc(db, SETUP_COLLECTION, SETUP_DOC_ID));
    
    if (!setupDoc.exists()) {
      return {
        isComplete: false,
        hasFirebaseConfig: false,
        hasRequiredServices: false,
        hasAdminUser: false,
        servicesStatus: {
          firestore: false,
          authentication: false,
          storage: false,
          functions: false,
          hosting: false
        },
        secretsStatus: {
          emailExtension: false,
          vapidKey: false
        }
      };
    }
    
    const data = setupDoc.data();
    
    // Migrate old structure to new structure if needed
    const migratedData: SetupStatus = {
      ...data,
      servicesStatus: data.servicesStatus || {
        firestore: false,
        authentication: false,
        storage: false,
        functions: false,
        hosting: false
      },
      secretsStatus: {
        // Migrate from old mailgun structure to new emailExtension structure
        emailExtension: data.secretsStatus?.mailgun || data.secretsStatus?.emailExtension || false,
        vapidKey: data.secretsStatus?.vapidKey || false,
        algolia: data.secretsStatus?.algolia,
        geminiApi: data.secretsStatus?.geminiApi
      }
    } as SetupStatus;
    
    return migratedData;
  } catch (error) {
    // If we can't read the doc, setup is definitely not complete
    console.error('Error checking setup status:', error);
    return {
      isComplete: false,
      hasFirebaseConfig: false,
      hasRequiredServices: false,
      hasAdminUser: false,
      servicesStatus: {
        firestore: false,
        authentication: false,
        storage: false,
        functions: false,
        hosting: false
      },
      secretsStatus: {
        emailExtension: false,
        vapidKey: false
      }
    };
  }
}

/**
 * Save Firebase configuration (public keys only)
 */
export async function saveFirebaseConfig(config: FirebaseConfigInput): Promise<void> {
  try {
    const setupRef = doc(db, SETUP_COLLECTION, SETUP_DOC_ID);
    
    await setDoc(setupRef, {
      firebaseConfig: config,
      hasFirebaseConfig: true,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving Firebase config:', error);
    throw new Error('Failed to save Firebase configuration');
  }
}

/**
 * Validate Firebase services are properly configured
 */
export async function validateServices(): Promise<{
  valid: boolean;
  services: SetupStatus['servicesStatus'];
  errors: string[];
}> {
  const errors: string[] = [];
  const services: SetupStatus['servicesStatus'] = {
    firestore: false,
    authentication: false,
    storage: false,
    functions: false,
    hosting: true // Assume hosting is working if they can access the app
  };

  // Test Firestore
  try {
    await getDoc(doc(db, SETUP_COLLECTION, 'test'));
    services.firestore = true;
  } catch (error) {
    errors.push('Firestore is not properly configured');
  }

  // Test Authentication
  try {
    // Check if auth is available
    const { auth } = await import('../firebase/firebaseConfig');
    if (auth) {
      services.authentication = true;
    }
  } catch (error) {
    errors.push('Authentication is not properly configured');
  }

  // Test Functions - just check if Functions is available
  try {
    const functions = getFunctions();
    // If we can get the functions instance, consider it working
    // We can't easily test without a real function, and that's okay
    services.functions = !!functions;
  } catch (error) {
    // Functions might not be deployed yet, which is okay
    services.functions = false;
  }

  // Test Storage
  try {
    const { storage } = await import('../firebase/firebaseConfig');
    if (storage) {
      services.storage = true;
    }
  } catch (error) {
    errors.push('Storage is not properly configured');
  }

  const valid = services.firestore && services.authentication;
  
  return { valid, services, errors };
}

/**
 * Validate Algolia search configuration
 */
export async function validateAlgoliaSetup(): Promise<{
  valid: boolean;
  status: {
    apiKeysConfigured: boolean;
    indicesConfigured: boolean;
    dataIndexed: boolean;
    searchTested: boolean;
  };
  errors: string[];
}> {
  try {
    const algoliaStatus = await checkAlgoliaSetup();
    
    return {
      valid: algoliaStatus.apiKeysConfigured && 
             algoliaStatus.indicesConfigured && 
             algoliaStatus.dataIndexed && 
             algoliaStatus.searchTested,
      status: {
        apiKeysConfigured: algoliaStatus.apiKeysConfigured,
        indicesConfigured: algoliaStatus.indicesConfigured,
        dataIndexed: algoliaStatus.dataIndexed,
        searchTested: algoliaStatus.searchTested
      },
      errors: algoliaStatus.errors
    };
  } catch (error) {
    return {
      valid: false,
      status: {
        apiKeysConfigured: false,
        indicesConfigured: false,
        dataIndexed: false,
        searchTested: false
      },
      errors: [`Error checking Algolia setup: ${error}`]
    };
  }
}

/**
 * Generate setup script for Firebase Functions secrets
 */
export function generateSetupScript(secrets: SecretConfig): string {
  // Generate both bash and batch scripts
  const bashScript = generateBashScript(secrets);
  const batchScript = generateBatchScript(secrets);
  
  return `${bashScript}\n\n${'='.repeat(80)}\n\n${batchScript}`;
}

/**
 * Generate bash script for Linux/Mac
 */
function generateBashScript(secrets: SecretConfig): string {
  const scriptParts: string[] = [
    '#!/bin/bash',
    '# Help Desk Setup Script (Linux/Mac)',
    '# Generated on ' + new Date().toISOString(),
    '',
    'echo "Setting up Firebase Extensions and Functions configuration..."',
    '',
    '# Step 1: Install Firebase Extensions',
    'echo "Installing Firebase Extensions..."',
    'firebase ext:install --project=$GOOGLE_CLOUD_PROJECT firebase/firestore-send-email --auto-approve || true',
    ''
  ];

  if (secrets.emailSender) {
    scriptParts.push(
      '# Configure default email sender',
      'firebase functions:config:set \\',
      `  email.sender="${secrets.emailSender}"`,
      ''
    );
  }

  if (secrets.vapidKey) {
    scriptParts.push(
      '# VAPID Key for Push Notifications',
      'firebase functions:config:set \\',
      `  vapid.key="${secrets.vapidKey}"`,
      ''
    );
  }

  if (secrets.algolia) {
    scriptParts.push(
      '# Algolia Search Configuration',
      'firebase functions:config:set \\',
      `  algolia.app_id="${secrets.algolia.appId}" \\`,
      `  algolia.admin_key="${secrets.algolia.adminApiKey}" \\`,
      `  algolia.search_key="${secrets.algolia.searchApiKey}"`,
      ''
    );
  }

  if (secrets.geminiApiKey) {
    scriptParts.push(
      '# Google Gemini API',
      'firebase functions:config:set \\',
      `  gemini.api_key="${secrets.geminiApiKey}"`,
      ''
    );
  }

  scriptParts.push(
    '',
    '# Step 2: Deploy functions with new configuration',
    'echo "Deploying Firebase Functions..."',
    'firebase deploy --only functions',
    '',
    '# Step 3: Configure Firestore security rules for mail collection',
    'echo "Updating Firestore rules for email extensions..."',
    'firebase deploy --only firestore:rules',
    '',
    'echo "Setup complete!"',
    'echo ""',
    'echo "Next steps:"',
    'echo "1. Go to Firebase Console > Extensions"',
    'echo "2. Configure the Trigger Email extension with your email provider"',
    'echo "3. Test email functionality from your Help Desk application"'
  );

  return scriptParts.join('\n');
}

/**
 * Generate batch script for Windows
 */
function generateBatchScript(secrets: SecretConfig): string {
  const scriptParts: string[] = [
    '@echo off',
    'REM Help Desk Setup Script (Windows)',
    'REM Generated on ' + new Date().toISOString(),
    '',
    'echo Setting up Firebase Extensions and Functions configuration...',
    '',
    'REM Step 1: Install Firebase Extensions',
    'echo Installing Firebase Extensions...',
    'firebase ext:install --project=%GOOGLE_CLOUD_PROJECT% firebase/firestore-send-email --auto-approve',
    'if errorlevel 1 echo Warning: Extension installation may have failed, continuing...',
    ''
  ];

  // Build the config command parts
  const configParts: string[] = [];
  
  if (secrets.emailSender) {
    configParts.push(`email.sender="${secrets.emailSender}"`);
  }

  if (secrets.vapidKey) {
    configParts.push(`vapid.key="${secrets.vapidKey}"`);
  }

  if (secrets.algolia) {
    configParts.push(
      `algolia.app_id="${secrets.algolia.appId}"`,
      `algolia.admin_key="${secrets.algolia.adminApiKey}"`,
      `algolia.search_key="${secrets.algolia.searchApiKey}"`
    );
  }

  if (secrets.geminiApiKey) {
    configParts.push(`gemini.api_key="${secrets.geminiApiKey}"`);
  }

  if (configParts.length > 0) {
    scriptParts.push(
      'REM Configure Firebase Functions',
      'echo Configuring Firebase Functions...',
      `firebase functions:config:set ${configParts.join(' ')}`,
      ''
    );
  }

  scriptParts.push(
    'REM Step 2: Deploy functions with new configuration',
    'echo Deploying Firebase Functions...',
    'firebase deploy --only functions',
    '',
    'REM Step 3: Configure Firestore security rules for mail collection',
    'echo Updating Firestore rules for email extensions...',
    'firebase deploy --only firestore:rules',
    '',
    'echo Setup complete!',
    'echo.',
    'echo Next steps:',
    'echo 1. Go to Firebase Console ^> Extensions',
    'echo 2. Configure the Trigger Email extension with your email provider',
    'echo 3. Test email functionality from your Help Desk application',
    'pause'
  );

  return scriptParts.join('\n');
}

/**
 * Mark setup as complete
 */
export async function completeSetup(adminEmail: string): Promise<void> {
  try {
    const setupRef = doc(db, SETUP_COLLECTION, SETUP_DOC_ID);
    
    await updateDoc(setupRef, {
      isComplete: true,
      hasAdminUser: true,
      adminEmail,
      completedAt: Date.now()
    });
  } catch (error) {
    console.error('Error completing setup:', error);
    throw new Error('Failed to complete setup');
  }
}

/**
 * Update secrets status (called after running setup script)
 */
export async function updateSecretsStatus(secrets: Partial<SetupStatus['secretsStatus']>): Promise<void> {
  try {
    const setupRef = doc(db, SETUP_COLLECTION, SETUP_DOC_ID);
    
    await updateDoc(setupRef, {
      secretsStatus: secrets,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating secrets status:', error);
    throw new Error('Failed to update secrets status');
  }
}

/**
 * Get stored Firebase configuration
 */
export async function getStoredFirebaseConfig(): Promise<FirebaseConfigInput | null> {
  try {
    const setupDoc = await getDoc(doc(db, SETUP_COLLECTION, SETUP_DOC_ID));
    
    if (setupDoc.exists() && setupDoc.data().firebaseConfig) {
      return setupDoc.data().firebaseConfig as FirebaseConfigInput;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting stored config:', error);
    return null;
  }
}

/**
 * Check if running in development mode
 */
export function isDevMode(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
}

/**
 * Reset setup (for development/testing)
 */
export async function resetSetup(): Promise<void> {
  if (!isDevMode()) {
    throw new Error('Reset is only available in development mode');
  }
  
  try {
    const setupRef = doc(db, SETUP_COLLECTION, SETUP_DOC_ID);
    await setDoc(setupRef, {
      isComplete: false,
      hasFirebaseConfig: false,
      hasRequiredServices: false,
      hasAdminUser: false,
      servicesStatus: {
        firestore: false,
        authentication: false,
        storage: false,
        functions: false,
        hosting: false
      },
      secretsStatus: {
        mailgun: false,
        vapidKey: false
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error resetting setup:', error);
    throw new Error('Failed to reset setup');
  }
}