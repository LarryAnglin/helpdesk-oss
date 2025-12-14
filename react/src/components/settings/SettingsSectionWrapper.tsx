import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface SettingsSectionWrapperProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  visible?: boolean;
}

export const SettingsSectionWrapper: React.FC<SettingsSectionWrapperProps> = ({
  id,
  title,
  description,
  children,
  visible = true
}) => {
  if (!visible) return null;

  return (
    <Paper 
      id={`settings-section-${id}`}
      sx={{ 
        p: 3, 
        mb: 3,
        scrollMarginTop: '80px' // Account for sticky header
      }}
    >
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>
        {children}
      </Box>
    </Paper>
  );
};