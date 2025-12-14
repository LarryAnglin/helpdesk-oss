/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Search,
  Settings,
  CloudUpload,
  PlayArrow,
  Refresh,
  Delete
} from '@mui/icons-material';
import {
  checkAlgoliaSetup,
  initializeAlgoliaIndices,
  indexExistingData,
  testSearchFunctionality,
  runCompleteAlgoliaSetup,
  clearAlgoliaData,
  AlgoliaSetupStatus,
  AlgoliaSetupResult
} from '../../lib/algolia/setupHelper';

const AlgoliaSetupPanel: React.FC = () => {
  const [status, setStatus] = useState<AlgoliaSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AlgoliaSetupResult | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Load initial status
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const currentStatus = await checkAlgoliaSetup();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Error checking Algolia status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeIndices = async () => {
    setLoading(true);
    setResult(null);
    try {
      const setupResult = await initializeAlgoliaIndices();
      setResult(setupResult);
      await checkStatus(); // Refresh status
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error}`,
        status: status!
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIndexData = async () => {
    setLoading(true);
    setResult(null);
    try {
      const setupResult = await indexExistingData();
      setResult(setupResult);
      await checkStatus(); // Refresh status
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error}`,
        status: status!
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSearch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const setupResult = await testSearchFunctionality();
      setResult(setupResult);
      await checkStatus(); // Refresh status
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error}`,
        status: status!
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    setResult(null);
    try {
      const setupResult = await runCompleteAlgoliaSetup();
      setResult(setupResult);
      await checkStatus(); // Refresh status
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error}`,
        status: status!
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    setResult(null);
    try {
      const setupResult = await clearAlgoliaData();
      setResult(setupResult);
      await checkStatus(); // Refresh status
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error}`,
        status: status!
      });
    } finally {
      setLoading(false);
      setShowClearDialog(false);
    }
  };

  const getStatusIcon = (isComplete: boolean, hasError: boolean = false) => {
    if (hasError) return <Error color="error" />;
    if (isComplete) return <CheckCircle color="success" />;
    return <Warning color="warning" />;
  };

  const getStatusColor = (isComplete: boolean, hasError: boolean = false) => {
    if (hasError) return 'error';
    if (isComplete) return 'success';
    return 'warning';
  };

  const getOverallProgress = () => {
    if (!status) return 0;
    let completed = 0;
    if (status.apiKeysConfigured) completed++;
    if (status.indicesExist && status.indicesConfigured) completed++;
    if (status.dataIndexed) completed++;
    if (status.searchTested) completed++;
    return (completed / 4) * 100;
  };

  const isSetupComplete = () => {
    return status?.apiKeysConfigured && 
           status?.indicesConfigured && 
           status?.dataIndexed && 
           status?.searchTested;
  };

  if (loading && !status) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Algolia Search Setup
      </Typography>

      {/* Overall Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Search />
            <Typography variant="h6">
              Setup Progress
            </Typography>
            <Chip 
              label={isSetupComplete() ? 'Complete' : 'In Progress'} 
              color={isSetupComplete() ? 'success' : 'warning'}
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={getOverallProgress()} 
            sx={{ mb: 1 }}
          />
          
          <Typography variant="body2" color="text.secondary">
            {Math.round(getOverallProgress())}% complete
          </Typography>
        </CardContent>
      </Card>

      {/* Status Checklist */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Status
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon>
                {getStatusIcon(status?.apiKeysConfigured || false)}
              </ListItemIcon>
              <ListItemText 
                primary="Configure Algolia API Keys"
                secondary={
                  status?.apiKeysConfigured 
                    ? "API keys are configured in environment variables"
                    : "Add VITE_ALGOLIA_APP_ID, VITE_ALGOLIA_ADMIN_API_KEY, and VITE_ALGOLIA_SEARCH_API_KEY to .env file"
                }
              />
              <Chip 
                label={status?.apiKeysConfigured ? 'Done' : 'Required'} 
                color={getStatusColor(status?.apiKeysConfigured || false)}
                size="small"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                {getStatusIcon(
                  status?.indicesExist && status?.indicesConfigured || false,
                  status?.indicesExist && !status?.indicesConfigured
                )}
              </ListItemIcon>
              <ListItemText 
                primary="Initialize Search Indices"
                secondary={
                  status?.indicesConfigured 
                    ? "Search indices are properly configured"
                    : status?.indicesExist
                    ? "Indices exist but need configuration"
                    : "Create and configure search indices for tickets and projects"
                }
              />
              <Chip 
                label={
                  status?.indicesConfigured ? 'Done' : 
                  status?.indicesExist ? 'Needs Config' : 'Required'
                } 
                color={getStatusColor(
                  status?.indicesConfigured || false,
                  status?.indicesExist && !status?.indicesConfigured
                )}
                size="small"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                {getStatusIcon(status?.dataIndexed || false)}
              </ListItemIcon>
              <ListItemText 
                primary="Index Existing Data"
                secondary={
                  status?.dataIndexed 
                    ? "Existing tickets and projects have been indexed"
                    : "Upload existing data to search indices"
                }
              />
              <Chip 
                label={status?.dataIndexed ? 'Done' : 'Required'} 
                color={getStatusColor(status?.dataIndexed || false)}
                size="small"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                {getStatusIcon(status?.searchTested || false)}
              </ListItemIcon>
              <ListItemText 
                primary="Test Search Functionality"
                secondary={
                  status?.searchTested 
                    ? "Search is working correctly"
                    : "Verify that search returns results"
                }
              />
              <Chip 
                label={status?.searchTested ? 'Done' : 'Required'} 
                color={getStatusColor(status?.searchTested || false)}
                size="small"
              />
            </ListItem>
          </List>

          {status?.errors && status.errors.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Setup Errors:
              </Typography>
              {status.errors.map((error, index) => (
                <Typography key={index} variant="body2">
                  • {error}
                </Typography>
              ))}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Actions
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={handleCompleteSetup}
              disabled={loading || !status?.apiKeysConfigured}
            >
              Run Complete Setup
            </Button>

            <Divider orientation="vertical" flexItem />

            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={handleInitializeIndices}
              disabled={loading || !status?.apiKeysConfigured}
            >
              Initialize Indices
            </Button>

            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={handleIndexData}
              disabled={loading || !status?.indicesConfigured}
            >
              Index Data
            </Button>

            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleTestSearch}
              disabled={loading || !status?.dataIndexed}
            >
              Test Search
            </Button>

            <Divider orientation="vertical" flexItem />

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={checkStatus}
              disabled={loading}
            >
              Refresh Status
            </Button>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setShowClearDialog(true)}
              disabled={loading}
            >
              Clear Data
            </Button>
          </Box>

          {loading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Running setup operation...
              </Typography>
            </Box>
          )}

          {result && (
            <Alert 
              severity={result.success ? 'success' : 'error'} 
              sx={{ mt: 2 }}
            >
              {result.message}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Environment Variables Info */}
      {!status?.apiKeysConfigured && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Required Environment Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add these variables to your <code>.env</code> file:
            </Typography>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
{`VITE_ALGOLIA_APP_ID=your_app_id
VITE_ALGOLIA_ADMIN_API_KEY=your_admin_api_key
VITE_ALGOLIA_SEARCH_API_KEY=your_search_api_key`}
            </pre>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Get your API keys from{' '}
              <a 
                href="https://www.algolia.com/account/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Algolia Dashboard
              </a>
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={showClearDialog} onClose={() => setShowClearDialog(false)}>
        <DialogTitle>Clear Algolia Data</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to clear all data from Algolia? This will remove all indexed tickets and projects. 
            You can re-index the data afterwards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleClearData} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlgoliaSetupPanel;