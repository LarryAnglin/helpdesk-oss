/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
  LinearProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow,
  Pause as PauseIcon,
  Info as InfoIcon,
  Web as WebIcon,
  Description as DocIcon,
  TableChart as SheetIcon,
  CalendarToday as CalendarIcon,
  PictureAsPdf as PdfIcon,
  Storage as DatabaseIcon,
  Sync as ProcessIcon
} from '@mui/icons-material';
import { KnowledgeSource, KnowledgeSourceType } from '../lib/types/knowledgeBase';
import { knowledgeBaseService } from '../lib/firebase/knowledgeBaseService';
import { useAuth } from '../lib/auth/AuthContext';
import { useTenant } from '../lib/context/TenantContext';
import KnowledgeSourceFormDialog from '../components/knowledge-base/KnowledgeSourceFormDialog';

const KnowledgeBaseManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<KnowledgeSource | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load knowledge sources
  const loadSources = async () => {
    try {
      setLoading(true);
      const allSources = await knowledgeBaseService.getAllSources();
      setSources(allSources);
    } catch (error) {
      showSnackbar('Failed to load knowledge sources', 'error');
      console.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Get icon for source type
  const getSourceTypeIcon = (type: KnowledgeSourceType) => {
    switch (type) {
      case 'website': return <WebIcon />;
      case 'google_doc': return <DocIcon />;
      case 'google_sheet': return <SheetIcon />;
      case 'google_calendar': return <CalendarIcon />;
      case 'pdf_upload':
      case 'pdf_url': return <PdfIcon />;
      case 'firestore_collection': return <DatabaseIcon />;
      default: return <InfoIcon />;
    }
  };

  // Get status color
  const getStatusColor = (status: KnowledgeSource['processingStatus']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'processing': return 'warning';
      case 'idle': return 'default';
      default: return 'default';
    }
  };

  // Get status label
  const getStatusLabel = (status: KnowledgeSource['processingStatus']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      case 'processing': return 'Processing';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  };

  // Handle create source
  const handleCreateSource = () => {
    setEditingSource(null);
    setFormDialogOpen(true);
  };

  // Handle edit source
  const handleEditSource = (source: KnowledgeSource) => {
    setEditingSource(source);
    setFormDialogOpen(true);
  };

  // Handle source form submission
  const handleSourceSubmit = async (sourceData: any) => {
    try {
      if (editingSource) {
        // Update existing source
        await knowledgeBaseService.updateSource({
          id: editingSource.id,
          ...sourceData
        }, user?.uid || '');
        showSnackbar('Knowledge source updated successfully', 'success');
      } else {
        // Create new source
        await knowledgeBaseService.createSource(sourceData, user?.uid || '', currentTenant?.id || 'default');
        showSnackbar('Knowledge source created successfully', 'success');
      }
      
      await loadSources();
      setFormDialogOpen(false);
    } catch (error) {
      showSnackbar('Failed to save knowledge source', 'error');
      console.error('Error saving source:', error);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (source: KnowledgeSource) => {
    setSourceToDelete(source);
    setDeleteDialogOpen(true);
  };

  // Handle source deletion
  const handleDeleteConfirm = async () => {
    if (!sourceToDelete) return;

    try {
      await knowledgeBaseService.deleteSource(sourceToDelete.id);
      showSnackbar('Knowledge source deleted successfully', 'success');
      await loadSources();
    } catch (error) {
      showSnackbar('Failed to delete knowledge source', 'error');
      console.error('Error deleting source:', error);
    } finally {
      setDeleteDialogOpen(false);
      setSourceToDelete(null);
    }
  };

  // Handle toggle source enabled status
  const handleToggleEnabled = async (source: KnowledgeSource) => {
    try {
      await knowledgeBaseService.updateSource({
        id: source.id,
        enabled: !source.enabled
      }, user?.uid || '');
      showSnackbar(`Source ${source.enabled ? 'disabled' : 'enabled'} successfully`, 'success');
      await loadSources();
    } catch (error) {
      showSnackbar('Failed to update source status', 'error');
      console.error('Error updating source:', error);
    }
  };

  // Handle process source manually
  const handleProcessSource = async (source: KnowledgeSource) => {
    if (!user) {
      showSnackbar('Must be logged in to process sources', 'error');
      return;
    }

    try {
      showSnackbar(`Starting to process "${source.name}"...`, 'info');
      
      // Get user token for authentication
      const token = await user.getIdToken();
      
      // Call the processing service
      const result = await knowledgeBaseService.processSource(source.id, token);
      
      if (result.success) {
        showSnackbar(
          `Successfully processed "${source.name}" - ${result.contentCount} items processed with ${result.tokenCount} tokens`, 
          'success'
        );
        
        // Reload sources to update status and stats
        await loadSources();
      } else {
        showSnackbar(`Failed to process "${source.name}": ${result.message}`, 'error');
      }
    } catch (error) {
      showSnackbar(
        `Failed to process "${source.name}": ${error instanceof Error ? error.message : 'Unknown error'}`, 
        'error'
      );
      console.error('Error processing source:', error);
    }
  };

  // Calculate totals
  const totalSources = sources.length;
  const enabledSources = sources.filter(s => s.enabled).length;
  const totalTokens = sources.reduce((sum, s) => sum + s.tokenCount, 0);
  const totalContent = sources.reduce((sum, s) => sum + s.contentCount, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Knowledge Base Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSources}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSource}
            disabled={loading}
          >
            Add Source
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Sources
            </Typography>
            <Typography variant="h4">
              {totalSources}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {enabledSources} enabled
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Content Items
            </Typography>
            <Typography variant="h4">
              {totalContent.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Tokens
            </Typography>
            <Typography variant="h4">
              {(totalTokens / 1000).toFixed(1)}K
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Sources Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Tokens</TableCell>
              <TableCell>Last Processed</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No knowledge sources configured yet. Add your first source to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow key={source.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSourceTypeIcon(source.type)}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {source.name}
                        </Typography>
                        <Chip
                          label={source.enabled ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={source.enabled ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={source.type.replace('_', ' ').toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(source.processingStatus)}
                      size="small"
                      color={getStatusColor(source.processingStatus)}
                      variant="filled"
                    />
                    {source.lastError && (
                      <Tooltip title={source.lastError}>
                        <InfoIcon sx={{ ml: 1, fontSize: 16, color: 'error.main' }} />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>{source.contentCount.toLocaleString()}</TableCell>
                  <TableCell>{(source.tokenCount / 1000).toFixed(1)}K</TableCell>
                  <TableCell>
                    {source.lastProcessed 
                      ? source.lastProcessed.toDate().toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Process Source">
                      <IconButton
                        size="small"
                        onClick={() => handleProcessSource(source)}
                        color="info"
                        disabled={!source.enabled}
                      >
                        <ProcessIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={source.enabled ? 'Disable' : 'Enable'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleEnabled(source)}
                        color={source.enabled ? 'warning' : 'success'}
                      >
                        {source.enabled ? <PauseIcon /> : <PlayArrow />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Source">
                      <IconButton
                        size="small"
                        onClick={() => handleEditSource(source)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Source">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(source)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Source Form Dialog */}
      <KnowledgeSourceFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleSourceSubmit}
        initialData={editingSource}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Knowledge Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this knowledge source? This will also delete all 
            associated content and cannot be undone.
          </Typography>
          {sourceToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {sourceToDelete.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Type: {sourceToDelete.type} • Content: {sourceToDelete.contentCount} items
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KnowledgeBaseManagementPage;