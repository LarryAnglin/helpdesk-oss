/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../lib/auth/AuthContext';
import OnboardingWizard from './OnboardingWizard';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ children }) => {
  const { user, userData, loading } = useAuth();

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no user, this shouldn't happen (ProtectedRoute should handle this)
  if (!user) {
    return null;
  }

  // If userData exists, user has completed onboarding
  if (userData) {
    return <>{children}</>;
  }

  // If user exists but no userData, show onboarding
  return <OnboardingWizard />;
};

export default OnboardingGuard;