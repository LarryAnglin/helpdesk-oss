/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Build as BuildIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import {
  checkSetupStatus,
  validateAlgoliaSetup,
  SetupStatus
} from '../../lib/setup/setupService';
import { useAuth } from '../../lib/auth/AuthContext';

interface HealthCheckDashboardProps {
  onRunSetup?: () => void;
}

interface ServiceCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  icon: React.ReactNode;
  details?: string[];
  fixInstructions?: string;
}

const HealthCheckDashboard: React.FC<HealthCheckDashboardProps> = ({ onRunSetup }) => {
  const { userData } = useAuth();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [serviceChecks, setServiceChecks] = useState<ServiceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    setLoading(true);
    try {
      const [status, algoliaStatus] = await Promise.all([
        checkSetupStatus(),
        validateAlgoliaSetup().catch(() => ({ valid: false, status: null, errors: [] }))
      ]);

      setSetupStatus(status);
      generateServiceChecks(status, algoliaStatus);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateServiceChecks = (status: SetupStatus | null, algoliaStatus?: any) => {
    const checks: ServiceCheck[] = [];

    // Provide fallback values if status is null or incomplete
    const servicesStatus = status?.servicesStatus || {
      firestore: false,
      authentication: false,
      storage: false,
      functions: false,
      hosting: false
    };

    const secretsStatus = status?.secretsStatus || {
      emailExtension: false,
      vapidKey: false
    };

    // Core Firebase Services
    checks.push({
      name: 'Firestore Database',
      status: servicesStatus.firestore ? 'healthy' : 'error',
      message: servicesStatus.firestore ? 'Connected and accessible' : 'Cannot connect to Firestore',
      icon: <StorageIcon />,
      details: servicesStatus.firestore ? [
        'Database rules configured',
        'Collections accessible',
        'Read/write permissions working'
      ] : [
        'Check Firebase project configuration',
        'Verify Firestore is enabled',
        'Check security rules'
      ],
      fixInstructions: !servicesStatus.firestore ? 
        'Enable Firestore in your Firebase console and check your configuration.' : undefined
    });

    checks.push({
      name: 'Authentication',
      status: servicesStatus.authentication ? 'healthy' : 'error',
      message: servicesStatus.authentication ? 'Auth service ready' : 'Authentication not configured',
      icon: <SecurityIcon />,
      details: servicesStatus.authentication ? [
        'Google OAuth configured',
        'Email domain validation working',
        'User roles system active'
      ] : [
        'Enable Authentication in Firebase',
        'Configure Google OAuth provider',
        'Set up email domain restrictions'
      ],
      fixInstructions: !servicesStatus.authentication ? 
        'Enable Authentication in Firebase console and configure Google as a sign-in provider.' : undefined
    });

    checks.push({
      name: 'Cloud Functions',
      status: servicesStatus.functions ? 'healthy' : 'warning',
      message: servicesStatus.functions ? 'Functions deployed and running' : 'Functions not deployed',
      icon: <CloudIcon />,
      details: servicesStatus.functions ? [
        'API endpoints accessible',
        'Email service configured',
        'Background jobs running'
      ] : [
        'Deploy Cloud Functions',
        'Configure environment variables',
        'Test function endpoints'
      ],
      fixInstructions: !servicesStatus.functions ? 
        'Deploy your Firebase Functions using: firebase deploy --only functions' : undefined
    });

    checks.push({
      name: 'Cloud Storage',
      status: servicesStatus.storage ? 'healthy' : 'warning',
      message: servicesStatus.storage ? 'File storage ready' : 'Storage not configured',
      icon: <StorageIcon />,
      details: servicesStatus.storage ? [
        'File uploads working',
        'Image attachments supported',
        'Security rules configured'
      ] : [
        'Enable Cloud Storage',
        'Configure security rules',
        'Test file upload'
      ]
    });

    // Email Service
    checks.push({
      name: 'Email Service',
      status: secretsStatus.emailExtension ? 'healthy' : 'warning',
      message: secretsStatus.emailExtension ? 'Firebase Extensions configured' : 'Email extension not installed',
      icon: <EmailIcon />,
      details: secretsStatus.emailExtension ? [
        'Trigger Email extension installed',
        'Email provider configured',
        'Mail collection accessible'
      ] : [
        'Install Trigger Email extension',
        'Configure email provider in Firebase Console',
        'Test email delivery'
      ],
      fixInstructions: !secretsStatus.emailExtension ? 
        'Install the Firebase Extensions Trigger Email extension using the setup script.' : undefined
    });

    // Push Notifications - Check actual environment variables
    const hasVapidKey = !!import.meta.env.VITE_VAPID_KEY;
    checks.push({
      name: 'Push Notifications',
      status: hasVapidKey ? 'healthy' : 'warning',
      message: hasVapidKey ? 'VAPID key configured' : 'Push notifications not configured',
      icon: <NotificationsIcon />,
      details: hasVapidKey ? [
        'VAPID key configured in environment',
        'Service worker ready for registration',
        'Push messaging available'
      ] : [
        'Generate VAPID keys',
        'Add VITE_VAPID_KEY to environment variables',
        'Test push notifications'
      ]
    });

    // Search Service - Always show if environment variables are present
    const hasAlgoliaEnvVars = import.meta.env.VITE_ALGOLIA_APP_ID && import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY;
    if (hasAlgoliaEnvVars) {
      const isSearchConfigured = algoliaStatus?.valid || false;
      const searchStatus = algoliaStatus?.status;
      
      checks.push({
        name: 'Search Service',
        status: isSearchConfigured ? 'healthy' : 'warning',
        message: isSearchConfigured ? 'Algolia search fully configured' : 'Search not configured',
        icon: <SearchIcon />,
        details: isSearchConfigured ? [
          'Algolia API keys configured',
          'Search indices created and configured',
          'Data indexed and searchable',
          'Search functionality tested'
        ] : [
          searchStatus?.apiKeysConfigured ? '✓ API keys configured' : '✗ Configure Algolia API keys',
          searchStatus?.indicesConfigured ? '✓ Indices configured' : '✗ Initialize search indices',
          searchStatus?.dataIndexed ? '✓ Data indexed' : '✗ Index existing data',
          searchStatus?.searchTested ? '✓ Search tested' : '✗ Test search functionality'
        ]
      });
    }

    // AI Assistant - Check actual environment variables
    const hasGeminiApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
    if (hasGeminiApiKey) {
      checks.push({
        name: 'AI Assistant',
        status: 'healthy',
        message: 'Gemini AI configured',
        icon: <PsychologyIcon />,
        details: [
          'Gemini API key configured in environment',
          'AI self-help features available',
          'Content generation ready'
        ]
      });
    }

    setServiceChecks(checks);
  };

  const toggleExpanded = (checkName: string) => {
    setExpandedChecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checkName)) {
        newSet.delete(checkName);
      } else {
        newSet.add(checkName);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: ServiceCheck['status']) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: ServiceCheck['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <ErrorIcon color="disabled" />;
    }
  };

  const getOverallStatus = () => {
    const errorCount = serviceChecks.filter(check => check.status === 'error').length;
    const warningCount = serviceChecks.filter(check => check.status === 'warning').length;
    
    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  const isAdmin = userData?.role === 'system_admin' || userData?.role === 'super_admin';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Running health checks...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">System Health</Typography>
        <Box>
          <Tooltip title="Refresh health checks">
            <IconButton onClick={runHealthChecks} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {isAdmin && onRunSetup && (
            <Button 
              variant="outlined" 
              startIcon={<BuildIcon />}
              onClick={onRunSetup}
              sx={{ ml: 1 }}
            >
              Run Setup
            </Button>
          )}
        </Box>
      </Box>

      {/* Overall Status */}
      <Alert 
        severity={getOverallStatus() === 'healthy' ? 'success' : getOverallStatus() as 'warning' | 'error'} 
        sx={{ mb: 3 }}
        icon={getStatusIcon(getOverallStatus())}
      >
        <Typography variant="h6">
          {getOverallStatus() === 'healthy' && 'All systems operational'}
          {getOverallStatus() === 'warning' && 'Some services need attention'}
          {getOverallStatus() === 'error' && 'Critical services need configuration'}
        </Typography>
        <Typography variant="body2">
          {serviceChecks.filter(c => c.status === 'healthy').length} of {serviceChecks.length} services healthy
        </Typography>
      </Alert>

      {/* Service Checks */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
          gap: 2 
        }}
      >
        {serviceChecks.map((check) => (
          <Card key={check.name} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ minHeight: '64px' }}>
                  <Box display="flex" alignItems="center" flex={1}>
                    <Box sx={{ mr: 2 }}>{check.icon}</Box>
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                        {check.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
                        {check.message}
                      </Typography>
                    </Box>
                    <Box sx={{ ml: 1 }}>
                      <Chip 
                        label={check.status} 
                        color={getStatusColor(check.status) as any}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                  </Box>
                  {check.details && (
                    <IconButton 
                      size="small"
                      onClick={() => toggleExpanded(check.name)}
                      sx={{ ml: 1 }}
                    >
                      {expandedChecks.has(check.name) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  )}
                </Box>

                <Collapse in={expandedChecks.has(check.name)}>
                  <Box sx={{ mt: 2 }}>
                    {check.details && (
                      <List dense>
                        {check.details.map((detail, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              {getStatusIcon(check.status)}
                            </ListItemIcon>
                            <ListItemText primary={detail} />
                          </ListItem>
                        ))}
                      </List>
                    )}
                    
                    {check.fixInstructions && (
                      <Paper sx={{ p: 2, mt: 2, backgroundColor: 'action.hover' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          How to fix:
                        </Typography>
                        <Typography variant="body2">
                          {check.fixInstructions}
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
        ))}
      </Box>

      {/* Setup Status */}
      {setupStatus && !setupStatus.isComplete && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Setup Incomplete
          </Typography>
          <Typography variant="body2">
            Your Help Desk setup is not complete. Some features may not work correctly.
            {isAdmin && onRunSetup && ' Click "Run Setup" to complete the configuration.'}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default HealthCheckDashboard;