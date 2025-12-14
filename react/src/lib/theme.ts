/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { createTheme } from '@mui/material/styles';
import { AccessibilityPreferences } from './types/config';
import { DynamicTheme } from './utils/colorUtils';

// Create a theme instance with dynamic colors
const createAppTheme = (
  mode: 'light' | 'dark', 
  _accessibilityPreferences: AccessibilityPreferences,
  dynamicTheme?: DynamicTheme
) => {
  // Get the current palette based on mode
  const currentPalette = dynamicTheme ? 
    (mode === 'dark' ? dynamicTheme.dark : dynamicTheme.light) : 
    null;

  // Fallback colors if dynamic theme is not available
  const fallbackPrimary = '#2563eb';
  const fallbackSecondary = '#9C27B0';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: currentPalette?.primary || fallbackPrimary,
        light: currentPalette?.primaryLight || fallbackPrimary,
        dark: currentPalette?.primaryDark || fallbackPrimary,
        contrastText: currentPalette?.onPrimary || '#fff',
      },
      secondary: {
        main: fallbackSecondary,
        light: '#BA68C8',
        dark: '#7B1FA2',
        contrastText: '#fff',
      },
      background: {
        default: currentPalette?.surface || (mode === 'light' ? '#f5f5f5' : '#121212'),
        paper: currentPalette?.surfaceVariant || (mode === 'light' ? '#fff' : '#2d2d2d'),
      },
      text: {
        primary: currentPalette?.onSurface || (mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.95)'),
        secondary: currentPalette?.onSurfaceVariant || (mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)'),
      },
      error: {
        main: currentPalette?.error || '#d32f2f',
        contrastText: currentPalette?.onError || '#fff',
      },
      warning: {
        main: currentPalette?.warning || '#f57c00',
        contrastText: currentPalette?.onWarning || '#fff',
      },
      success: {
        main: currentPalette?.success || '#388e3c',
        contrastText: currentPalette?.onSuccess || '#fff',
      },
      divider: currentPalette?.outline || (mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'),
    },
    zIndex: {
      appBar: 1200,
      drawer: 1100,
    },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            textTransform: 'none',
            fontWeight: 500,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
            },
          },
          outlined: {
            borderColor: currentPalette?.outline || undefined,
            '&:hover': {
              borderColor: currentPalette?.primary || undefined,
              backgroundColor: currentPalette?.surface || undefined,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0px 1px 3px rgba(0,0,0,0.12)',
            backgroundColor: currentPalette?.primary || undefined,
            color: currentPalette?.onPrimary || undefined,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
            backgroundColor: currentPalette?.surfaceVariant || undefined,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: currentPalette?.surfaceVariant || undefined,
          },
          rounded: {
            borderRadius: 8,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: currentPalette?.surface || undefined,
            borderRight: `1px solid ${currentPalette?.outlineVariant || 'rgba(0,0,0,0.12)'}`,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            backgroundColor: currentPalette?.primary || undefined,
            color: currentPalette?.onPrimary || undefined,
          },
        },
      },
    },
  });
};

export default createAppTheme;