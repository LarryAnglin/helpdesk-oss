/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../lib/context/ConfigContext';
import createAppTheme from '../../lib/theme';
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from '../../lib/types/config';

interface DynamicThemeProviderProps {
  children: ReactNode;
}

const DynamicThemeProvider = ({ children }: DynamicThemeProviderProps) => {
  const { mode, dynamicTheme } = useTheme();
  const { config } = useConfig();
  
  // Get accessibility preferences from config (with fallback to defaults)
  const accessibilityPreferences = config?.accessibility || DEFAULT_ACCESSIBILITY_PREFERENCES;
  
  // Create the theme based on the current mode, dynamic colors, and accessibility preferences
  const theme = createAppTheme(mode, accessibilityPreferences, dynamicTheme);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

export default DynamicThemeProvider;