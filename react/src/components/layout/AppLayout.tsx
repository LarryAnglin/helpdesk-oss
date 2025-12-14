/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Box } from '@mui/material';
import { ReactNode } from 'react';
import Navbar from './Navbar';

interface AppLayoutProps {
  children?: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <Box sx={{ display: 'flex' }}>
      {/* Skip to content link - only visible when focused */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary-500 focus:text-white"
      >
        Skip to content
      </a>
      
      <Navbar />

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          mt: 8, // Top margin for the app bar
          p: 0,
          outline: 'none',
        }}
        aria-label="Main content"
      >
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;