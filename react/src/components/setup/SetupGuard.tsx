/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Container,
  Paper
} from '@mui/material';
import {
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import {
  checkSetupStatus,
  SetupStatus
} from '../../lib/setup/setupService';
import SetupWizard from './SetupWizard';
import HealthCheckDashboard from './HealthCheckDashboard';
import { useAuth } from '../../lib/auth/AuthContext';
import { hasRole } from '../../lib/utils/roleUtils';

interface SetupGuardProps {
  children: React.ReactNode;
}

const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
  const { user, userData, loading: authLoading } = useAuth();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showHealthCheck, setShowHealthCheck] = useState(false);

  console.log('SetupGuard render - authLoading:', authLoading, 'user:', !!user, 'userData:', !!userData, 'loading:', loading);

  useEffect(() => {
    console.log('SetupGuard useEffect - authLoading:', authLoading, 'user:', !!user, 'userData:', !!userData);
    if (!authLoading && user && userData) {
      // Only check setup status for admin users
      if (hasRole(userData.role, 'system_admin')) {
        console.log('SetupGuard: admin user, calling checkSetup');
        checkSetup();
      } else {
        console.log('SetupGuard: non-admin user, assuming setup complete');
        setSetupStatus({
          isComplete: true,
          hasFirebaseConfig: true,
          hasRequiredServices: true,
          hasAdminUser: true,
          servicesStatus: {
            firestore: true,
            authentication: true,
            storage: true,
            functions: true,
            hosting: true
          },
          secretsStatus: {
            emailExtension: true,
            vapidKey: true
          }
        });
        setLoading(false);
      }
    } else if (!authLoading && !user) {
      console.log('SetupGuard: no user, setting loading to false');
      setLoading(false);
    }
  }, [user, userData, authLoading]);

  const checkSetup = async () => {
    try {
      console.log('SetupGuard: checking setup status');
      const status = await checkSetupStatus();
      console.log('SetupGuard: setup status received:', status);
      setSetupStatus(status);
      
      // Show setup wizard if setup is not complete
      if (!status.isComplete) {
        console.log('SetupGuard: setup incomplete, showing wizard');
        setShowSetupWizard(true);
      } else {
        console.log('SetupGuard: setup complete');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      // If we can't check setup status, assume setup is needed
      console.log('SetupGuard: error checking setup, showing wizard');
      setShowSetupWizard(true);
    } finally {
      console.log('SetupGuard: setting loading to false');
      setLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    setShowSetupWizard(false);
    await checkSetup();
  };

  const handleShowSetup = () => {
    setShowSetupWizard(true);
  };

  const handleShowHealthCheck = () => {
    setShowHealthCheck(true);
  };

  // Show loading while checking auth and setup status
  if (authLoading || loading) {
    console.log('SetupGuard: showing loading screen - authLoading:', authLoading, 'loading:', loading);
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6">Loading Help Desk...</Typography>
        <Typography variant="body2" color="textSecondary">
          Checking system configuration
        </Typography>
      </Box>
    );
  }

  // If not authenticated, let the main app handle auth flow
  if (!user) {
    console.log('SetupGuard: no user, passing to main app');
    return <>{children}</>;
  }

  // Non-admin users always proceed to main app (setup is admin-only concern)
  if (!hasRole(userData?.role, 'system_admin')) {
    console.log('SetupGuard: non-admin user, proceeding to main app');
    return <>{children}</>;
  }

  // Admin users: check if setup is complete
  if (setupStatus?.isComplete) {
    console.log('SetupGuard: admin user, setup complete, rendering main app');
    return <>{children}</>;
  }

  // Admin user - show setup options
  console.log('SetupGuard: admin user, showing setup options');
  return (
    <>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <BuildIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4">
                Help Desk Setup
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Configure your Help Desk system to get started
              </Typography>
            </Box>
          </Box>

          {setupStatus && (
            <Box sx={{ mb: 3 }}>
              <Alert 
                severity={setupStatus.isComplete ? 'success' : 'warning'}
                icon={setupStatus.isComplete ? <CheckCircleIcon /> : <BuildIcon />}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Setup Status: {setupStatus.isComplete ? 'Complete' : 'Incomplete'}
                </Typography>
                <Typography variant="body2">
                  {setupStatus.isComplete 
                    ? 'Your Help Desk is fully configured and ready to use.'
                    : 'Some configuration is still needed to fully activate all features.'
                  }
                </Typography>
              </Alert>
            </Box>
          )}

          <Box display="flex" gap={2} mb={4}>
            <Button
              variant="contained"
              startIcon={<BuildIcon />}
              onClick={handleShowSetup}
              size="large"
            >
              {setupStatus?.isComplete ? 'Reconfigure System' : 'Start Setup'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleShowHealthCheck}
              size="large"
            >
              View System Health
            </Button>
          </Box>

          {showHealthCheck && (
            <HealthCheckDashboard onRunSetup={handleShowSetup} />
          )}
        </Paper>
      </Container>

      <SetupWizard
        open={showSetupWizard}
        onComplete={handleSetupComplete}
      />
    </>
  );
};

export default SetupGuard;