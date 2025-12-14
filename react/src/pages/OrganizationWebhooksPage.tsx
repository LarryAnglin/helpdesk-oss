// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as TestIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../lib/auth/AuthContext';
import { getOrganization } from '../lib/firebase/organizationService';
import { 
  getOrganizationWebhooks, 
  deleteWebhook, 
  toggleWebhookStatus,
  testWebhook,
  getWebhookStats
} from '../lib/firebase/webhookService';
import { WebhookConfig, WebhookStats } from '../lib/types/webhook';
import { Organization } from '../lib/types/organization';
import WebhookFormDialog from '../components/webhooks/WebhookFormDialog';
import WebhookDetailsDialog from '../components/webhooks/WebhookDetailsDialog';

const OrganizationWebhooksPage: React.FC = () => {
  const { userData } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [webhookStats, setWebhookStats] = useState<{ [key: string]: WebhookStats }>({});

  const isOwnerOrAdmin = userData?.organizationId && organization && 
    (organization.ownerUserId === userData.uid || organization.adminUserIds.includes(userData.uid));

  useEffect(() => {
    if (userData?.organizationId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [userData?.organizationId]);

  const loadData = async () => {
    if (!userData?.organizationId) return;
    
    try {
      setLoading(true);
      const [org, webhookList] = await Promise.all([
        getOrganization(userData.organizationId),
        getOrganizationWebhooks(userData.organizationId)
      ]);
      
      setOrganization(org);
      setWebhooks(webhookList);
      
      // Load stats for each webhook
      const stats: { [key: string]: WebhookStats } = {};
      await Promise.all(
        webhookList.map(async (webhook) => {
          try {
            stats[webhook.id] = await getWebhookStats(webhook.id);
          } catch (err) {
            console.error(`Error loading stats for webhook ${webhook.id}:`, err);
          }
        })
      );
      setWebhookStats(stats);
      
      setError(null);
    } catch (err) {
      console.error('Error loading webhooks:', err);
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = () => {
    setEditingWebhook(null);
    setFormDialogOpen(true);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormDialogOpen(true);
  };

  const handleViewWebhook = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    setDetailsDialogOpen(true);
  };

  const handleDeleteWebhook = async () => {
    if (!webhookToDelete) return;

    try {
      await deleteWebhook(webhookToDelete.id);
      await loadData();
      setDeleteConfirmOpen(false);
      setWebhookToDelete(null);
    } catch (err) {
      console.error('Error deleting webhook:', err);
      setError('Failed to delete webhook');
    }
  };

  const handleToggleStatus = async (webhook: WebhookConfig) => {
    try {
      await toggleWebhookStatus(webhook.id, !webhook.active);
      await loadData();
    } catch (err) {
      console.error('Error toggling webhook status:', err);
      setError('Failed to update webhook status');
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    setTesting(webhook.id);
    try {
      const result = await testWebhook(webhook.id);
      if (result.success) {
        alert('Webhook test successful!');
      } else {
        alert(`Webhook test failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Error testing webhook:', err);
      alert('Failed to test webhook');
    } finally {
      setTesting(null);
    }
  };

  const getStatusColor = (webhook: WebhookConfig) => {
    if (!webhook.active) return 'default';
    switch (webhook.status) {
      case 'active': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'organization': return 'Organization';
      case 'company': return 'Company';
      case 'user': return 'User';
      default: return scope;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!userData?.organizationId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          You don't belong to any organization yet. Complete the onboarding process to create one.
        </Alert>
      </Box>
    );
  }

  if (!organization) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Organization not found or you don't have access to it.
        </Alert>
      </Box>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Only organization owners and admins can manage webhooks.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Organization Webhooks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWebhook}
        >
          Create Webhook
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Organization Webhook Scoping
        </Typography>
        <Typography variant="body2">
          Organization webhooks are scoped to your organization and can be filtered by specific companies, 
          users, or event criteria. Only organization owners and admins can create and manage webhooks.
        </Typography>
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Events</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Success Rate</TableCell>
              <TableCell>Last Triggered</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {webhooks.map((webhook) => {
              const stats = webhookStats[webhook.id];
              const successRate = stats ? `${stats.successRate.toFixed(1)}%` : 'N/A';
              const lastTriggered = webhook.lastTriggered 
                ? new Date(webhook.lastTriggered.toDate?.() || webhook.lastTriggered).toLocaleDateString()
                : 'Never';

              return (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{webhook.name}</Typography>
                      {webhook.description && (
                        <Typography variant="caption" color="text.secondary">
                          {webhook.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {webhook.url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getScopeLabel(webhook.scope)} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={webhook.active ? webhook.status : 'Disabled'}
                      color={getStatusColor(webhook)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{successRate}</TableCell>
                  <TableCell>{lastTriggered}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewWebhook(webhook)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Test Webhook">
                      <IconButton
                        size="small"
                        onClick={() => handleTestWebhook(webhook)}
                        disabled={testing === webhook.id}
                      >
                        {testing === webhook.id ? <CircularProgress size={16} /> : <TestIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEditWebhook(webhook)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setWebhookToDelete(webhook);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={webhook.active}
                          onChange={() => handleToggleStatus(webhook)}
                          size="small"
                        />
                      }
                      label=""
                      sx={{ ml: 1 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {webhooks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No webhooks configured. Create your first webhook to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Webhook Dialog */}
      <WebhookFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        webhook={editingWebhook}
        organizationId={userData?.organizationId || ''}
        onSuccess={loadData}
      />

      {/* Webhook Details Dialog */}
      <WebhookDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        webhook={selectedWebhook}
        stats={selectedWebhook ? webhookStats[selectedWebhook.id] : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Webhook</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the webhook "{webhookToDelete?.name}"? 
            This action cannot be undone and all delivery history will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteWebhook} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationWebhooksPage;