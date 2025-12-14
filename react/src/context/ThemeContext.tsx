/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { generateDynamicTheme, DynamicTheme, isValidColor } from '../lib/utils/colorUtils';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  primaryColor: string;
  dynamicTheme: DynamicTheme;
  toggleColorMode: () => void;
  setPrimaryColor: (color: string) => void;
  resetToDefault: () => void;
}

const DEFAULT_PRIMARY_COLOR = '#2563eb'; // Blue

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [primaryColor, setPrimaryColorState] = useState<string>(DEFAULT_PRIMARY_COLOR);
  const [dynamicTheme, setDynamicTheme] = useState<DynamicTheme>(() => 
    generateDynamicTheme(DEFAULT_PRIMARY_COLOR)
  );

  // Load saved preferences on mount
  useEffect(() => {
    // Load theme mode
    const storedMode = localStorage.getItem('theme-mode');
    if (storedMode === 'dark' || storedMode === 'light') {
      setMode(storedMode);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }

    // Load primary color
    const storedColor = localStorage.getItem('theme-primary-color');
    if (storedColor && isValidColor(storedColor)) {
      setPrimaryColorState(storedColor);
      setDynamicTheme(generateDynamicTheme(storedColor));
    }
  }, []);

  // Apply CSS custom properties for dynamic theming
  useEffect(() => {
    const currentPalette = mode === 'dark' ? dynamicTheme.dark : dynamicTheme.light;
    const root = document.documentElement;

    // Set CSS custom properties for our dynamic theme
    root.style.setProperty('--color-primary', currentPalette.primary);
    root.style.setProperty('--color-primary-light', currentPalette.primaryLight);
    root.style.setProperty('--color-primary-dark', currentPalette.primaryDark);
    root.style.setProperty('--color-on-primary', currentPalette.onPrimary);
    root.style.setProperty('--color-on-primary-light', currentPalette.onPrimaryLight);
    root.style.setProperty('--color-on-primary-dark', currentPalette.onPrimaryDark);
    root.style.setProperty('--color-surface', currentPalette.surface);
    root.style.setProperty('--color-surface-variant', currentPalette.surfaceVariant);
    root.style.setProperty('--color-on-surface', currentPalette.onSurface);
    root.style.setProperty('--color-on-surface-variant', currentPalette.onSurfaceVariant);
    root.style.setProperty('--color-outline', currentPalette.outline);
    root.style.setProperty('--color-outline-variant', currentPalette.outlineVariant);
    root.style.setProperty('--color-error', currentPalette.error);
    root.style.setProperty('--color-on-error', currentPalette.onError);
    root.style.setProperty('--color-warning', currentPalette.warning);
    root.style.setProperty('--color-on-warning', currentPalette.onWarning);
    root.style.setProperty('--color-success', currentPalette.success);
    root.style.setProperty('--color-on-success', currentPalette.onSuccess);

    // Apply dark class for Tailwind CSS dark mode
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode, dynamicTheme]);

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  const setPrimaryColor = (color: string) => {
    if (!isValidColor(color)) {
      console.warn('Invalid color provided to setPrimaryColor:', color);
      return;
    }

    setPrimaryColorState(color);
    setDynamicTheme(generateDynamicTheme(color));
    localStorage.setItem('theme-primary-color', color);
  };

  const resetToDefault = () => {
    setPrimaryColorState(DEFAULT_PRIMARY_COLOR);
    setDynamicTheme(generateDynamicTheme(DEFAULT_PRIMARY_COLOR));
    localStorage.removeItem('theme-primary-color');
  };

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      primaryColor, 
      dynamicTheme, 
      toggleColorMode, 
      setPrimaryColor, 
      resetToDefault 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};