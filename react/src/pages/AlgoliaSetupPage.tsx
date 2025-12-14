/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import AlgoliaSetupPanel from '../components/admin/AlgoliaSetupPanel';

const AlgoliaSetupPage: React.FC = () => {
  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Algolia Search Configuration
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure and initialize Algolia search for your help desk system. This will enable 
        fast, searchable access to tickets and projects.
      </Typography>
      
      <AlgoliaSetupPanel />
    </Box>
  );
};

export default AlgoliaSetupPage;