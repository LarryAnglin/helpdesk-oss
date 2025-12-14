/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, storage } from './firebaseConfig';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';

// Document reference
const CONFIG_DOC = 'settings/appConfig';

/**
 * Get the application configuration
 */
export const getAppConfig = async (): Promise<AppConfig> => {
  console.log("Fetching app config from Firestore");
  try {
    const configRef = doc(db, CONFIG_DOC);
    console.log("Config reference created, attempting to fetch document");
    const configSnap = await getDoc(configRef);
    console.log("Config document fetch completed, exists:", configSnap.exists());
    
    if (configSnap.exists()) {
      const config = configSnap.data() as AppConfig;
      console.log("Config data retrieved:", config);
      return config;
    } else {
      console.log("Config document does not exist, creating default config");
      // Create default config if it doesn't exist
      await setDoc(configRef, DEFAULT_CONFIG);
      console.log("Default config created successfully");
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('Error getting app config:', error);
    console.error('Error details:', (error as any).message, (error as any).code);
    console.log('Returning default config due to error');
    return DEFAULT_CONFIG;
  }
};

/**
 * Recursively remove undefined values from an object
 */
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
};

/**
 * Update the application configuration
 */
export const updateAppConfig = async (config: Partial<AppConfig>): Promise<void> => {
  try {
    const configRef = doc(db, CONFIG_DOC);
    
    // Get current config to merge with updates
    const currentConfigSnap = await getDoc(configRef);
    const currentConfig = currentConfigSnap.exists() 
      ? currentConfigSnap.data() as AppConfig
      : DEFAULT_CONFIG;
    
    // Clean the config object to remove any undefined values recursively
    const cleanedConfig = removeUndefinedValues(config);
    
    // Merge current config with cleaned updates
    const updatedConfig = {
      ...currentConfig,
      ...cleanedConfig
    };
    
    await setDoc(configRef, updatedConfig);
  } catch (error) {
    console.error('Error updating app config:', error);
    throw error;
  }
};

/**
 * Upload a company logo
 */
export const uploadCompanyLogo = async (file: File): Promise<string> => {
  try {
    // Force token refresh to get latest custom claims
    const auth = getAuth();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
    
    console.log("Uploading company logo, file size:", file.size, "bytes");
    
    // Use a timestamp to avoid caching issues
    const timestamp = Date.now();
    
    // Create a reference to the logo in Firebase Storage with timestamp to avoid conflicts
    // Using a different path that might not have the same permission restrictions
    const storageRef = ref(storage, `settings/logo-${timestamp}`);
    
    console.log("Storage reference created:", storageRef.fullPath);
    
    // Upload the file with metadata to help debug
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: auth.currentUser?.uid || 'unknown',
        uploadTime: new Date().toISOString()
      }
    };
    
    console.log("Starting upload with metadata:", metadata);
    
    // Upload the file
    const uploadResult = await uploadBytes(storageRef, file, metadata);
    console.log("Upload completed:", uploadResult.metadata.fullPath);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Download URL obtained:", downloadURL);
    
    // Update the config with the new logo URL
    await updateAppConfig({
      companyLogo: downloadURL
    });
    console.log("App config updated with new logo URL");
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading company logo:', error);
    // Log more details about the error
    if ((error as { code?: string }).code === 'storage/unauthorized') {
      const auth = getAuth() 
      console.error('This is a permissions error. The current user likely does not have the correct role claims.');
      console.error('Auth state:', auth.currentUser ? 'User is signed in' : 'No user signed in');
      if (auth.currentUser) {
        auth.currentUser.getIdTokenResult(true)
          .then((idTokenResult: { claims: any; }) => {
            console.log('User claims:', JSON.stringify(idTokenResult.claims));
          })
          .catch(err => console.error('Error getting token claims:', err));
      }
    }
    throw error;
  }
};

/**
 * Delete the company logo
 */
export const deleteCompanyLogo = async (): Promise<void> => {
  try {
    // Force token refresh to get latest custom claims
    const auth = getAuth();
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
    
    // Get current config to find the logo path
    const configRef = doc(db, CONFIG_DOC);
    const configSnap = await getDoc(configRef);
    const currentConfig = configSnap.exists() ? configSnap.data() as AppConfig : DEFAULT_CONFIG;
    
    if (!currentConfig.companyLogo) {
      console.log("No company logo to delete");
      return;
    }
    
    console.log("Attempting to delete logo:", currentConfig.companyLogo);
    
    try {
      // Extract the file path from the URL
      const logoUrl = new URL(currentConfig.companyLogo);
      const pathname = logoUrl.pathname;
      // The path will be like /v0/b/your-project.appspot.com/o/settings%2Flogo-timestamp
      // We need to extract just the path portion after /o/
      const encodedPath = pathname.split('/o/')[1];
      if (!encodedPath) {
        throw new Error("Could not parse logo path from URL");
      }
      
      // Decode the path
      const path = decodeURIComponent(encodedPath);
      console.log("Decoded path:", path);
      
      // Create a reference to the logo in Firebase Storage
      const storageRef = ref(storage, path);
      
      // Delete the file
      await deleteObject(storageRef);
      console.log("Logo file deleted successfully");
    } catch (storageError) {
      console.error("Error deleting storage file:", storageError);
      // Continue to update config even if storage delete fails
      console.log("Continuing to update config despite storage delete error");
    }
    
    // Update the config to remove the logo URL
    await updateAppConfig({
      companyLogo: undefined
    });
    console.log("Company logo removed from config");
  } catch (error) {
    console.error('Error in deleteCompanyLogo:', error);
    throw error;
  }
};