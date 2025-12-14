/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';
import { getAppConfig, updateAppConfig } from '../firebase/configService';
import { useAuth } from '../auth/AuthContext';
import { manifestService } from '../pwa/manifestService';

interface ConfigContextType {
  config: AppConfig;
  loading: boolean;
  error: string | null;
  updateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const appConfig = await getAppConfig();
        setConfig(appConfig);
      } catch (err: any) {
        console.error('Error fetching config:', err);
        setError('Failed to load application configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Update PWA manifest when settings change
  useEffect(() => {
    if (config.pwaSettings) {
      manifestService.updatePWAMetadata(config.pwaSettings);
    }
  }, [config.pwaSettings]);

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    if (!userData || !(userData.role === 'system_admin' || userData.role === 'super_admin')) {
      throw new Error('Only administrators can update configuration');
    }

    try {
      setLoading(true);
      setError(null);

      await updateAppConfig(newConfig);
      
      // Fetch the updated config
      const updatedConfig = await getAppConfig();
      setConfig(updatedConfig);
    } catch (err: any) {
      console.error('Error updating config:', err);
      setError('Failed to update configuration');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    config,
    loading,
    error,
    updateConfig
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};