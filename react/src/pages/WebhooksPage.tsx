/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useAuth } from '../lib/auth/AuthContext';
import { hasRole } from '../lib/utils/roleUtils';
import { API_ENDPOINTS } from '../lib/apiConfig';
import { WebhookConfig, WebhookEventType, WebhookTestResult } from '../lib/types/webhook';

interface WebhookFormData {
  name: string;
  description: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: { [key: string]: string };
  events: WebhookEventType[];
  secret: string;
  retryCount: number;
  timeout: number;
  active: boolean;
}

const WEBHOOK_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
  { value: 'ticket.created', label: 'Ticket Created', description: 'Triggered when a new ticket is submitted' },
  { value: 'ticket.updated', label: 'Ticket Updated', description: 'Triggered when any ticket field is modified' },
  { value: 'ticket.resolved', label: 'Ticket Resolved', description: 'Triggered when ticket status changes to Resolved' },
  { value: 'ticket.closed', label: 'Ticket Closed', description: 'Triggered when ticket status changes to Closed' },
  { value: 'ticket.escalated', label: 'Ticket Escalated', description: 'Triggered when escalation rules are executed' },
  { value: 'ticket.assigned', label: 'Ticket Assigned', description: 'Triggered when ticket is assigned to a user' },
  { value: 'ticket.reply_added', label: 'Reply Added', description: 'Triggered when a reply is added to a ticket' },
  { value: 'ticket.status_changed', label: 'Status Changed', description: 'Triggered when ticket status changes' },
  { value: 'ticket.priority_changed', label: 'Priority Changed', description: 'Triggered when ticket priority changes' }
];

const WebhooksPage: React.FC = () => {
  const { user, userData } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null);
  const [testResults, setTestResults] = useState<{ [webhookId: string]: WebhookTestResult }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    description: '',
    url: '',
    method: 'POST',
    headers: {},
    events: [],
    secret: '',
    retryCount: 3,
    timeout: 30000,
    active: true
  });

  const [headersText, setHeadersText] = useState('');

  // Check if user is admin
  if (!hasRole(userData?.role, 'system_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Only administrators can manage webhooks.
        </Alert>
      </Box>
    );
  }

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'webhooks')}`, {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load webhooks');
      }

      const data = await response.json();
      setWebhooks(data.webhooks);
    } catch (error) {
      showSnackbar('Failed to load webhooks', 'error');
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCreateWebhook = () => {
    setEditingWebhook(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      method: 'POST',
      headers: {},
      events: [],
      secret: '',
      retryCount: 3,
      timeout: 30000,
      active: true
    });
    setHeadersText('');
    setDialogOpen(true);
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      description: webhook.description || '',
      url: webhook.url,
      method: webhook.method,
      headers: webhook.headers,
      events: webhook.events,
      secret: webhook.secret || '',
      retryCount: webhook.retryCount,
      timeout: webhook.timeout,
      active: webhook.active
    });
    setHeadersText(JSON.stringify(webhook.headers, null, 2));
    setDialogOpen(true);
  };

  const handleDeleteWebhook = (webhook: WebhookConfig) => {
    setWebhookToDelete(webhook);
    setDeleteDialogOpen(true);
  };

  const parseHeaders = (text: string): { [key: string]: string } => {
    try {
      if (!text.trim()) return {};
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON format for headers');
    }
  };

  const handleSaveWebhook = async () => {
    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }
      if (!formData.url.trim()) {
        throw new Error('URL is required');
      }
      if (formData.events.length === 0) {
        throw new Error('At least one event must be selected');
      }

      // Parse headers
      let headers = {};
      try {
        headers = parseHeaders(headersText);
      } catch (error) {
        throw new Error('Invalid headers format. Please use valid JSON.');
      }

      const webhookData = {
        ...formData,
        headers,
        ...(editingWebhook && { id: editingWebhook.id })
      };

      const url = `${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'webhooks')}`;
      const method = editingWebhook ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save webhook');
      }

      showSnackbar(
        editingWebhook ? 'Webhook updated successfully' : 'Webhook created successfully',
        'success'
      );
      setDialogOpen(false);
      loadWebhooks();
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const confirmDeleteWebhook = async () => {
    if (!webhookToDelete) return;

    try {
      const response = await fetch(
        `${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'webhooks')}?id=${webhookToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await user?.getIdToken()}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete webhook');
      }

      showSnackbar('Webhook deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
      loadWebhooks();
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'webhooks/test')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          url: webhook.url,
          method: webhook.method,
          headers: webhook.headers,
          secret: webhook.secret
        })
      });

      if (!response.ok) {
        throw new Error('Failed to test webhook');
      }

      const result: WebhookTestResult = await response.json();
      setTestResults(prev => ({ ...prev, [webhook.id]: result }));
      
      showSnackbar(
        result.success ? 'Webhook test successful' : 'Webhook test failed',
        result.success ? 'success' : 'error'
      );
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const getStatusColor = (webhook: WebhookConfig) => {
    if (!webhook.active) return 'default';
    if (webhook.failureCount > webhook.successCount * 0.1) return 'error';
    if (webhook.successCount > 0) return 'success';
    return 'warning';
  };

  const getStatusText = (webhook: WebhookConfig) => {
    if (!webhook.active) return 'Inactive';
    if (webhook.successCount === 0 && webhook.failureCount === 0) return 'Untested';
    if (webhook.failureCount > webhook.successCount * 0.1) return 'Failing';
    return 'Healthy';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Webhooks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWebhook}
        >
          Create Webhook
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Webhooks allow external systems to receive real-time notifications when events occur in your helpdesk.
        Configure webhooks to integrate with your existing tools and workflows.
      </Alert>

      {webhooks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No webhooks configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first webhook to start receiving event notifications.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateWebhook}>
            Create Webhook
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {webhooks.map((webhook) => (
            <Box key={webhook.id} sx={{ width: '100%', maxWidth: { md: '48%' }, display: 'inline-block' }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {webhook.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={getStatusText(webhook)}
                      color={getStatusColor(webhook) as any}
                    />
                  </Box>

                  {webhook.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {webhook.description}
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>URL:</strong> {webhook.url}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Method:</strong> {webhook.method}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Events:</strong> {webhook.events.length} event{webhook.events.length !== 1 ? 's' : ''}
                  </Typography>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2">Event Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {webhook.events.map(event => {
                        const eventInfo = WEBHOOK_EVENTS.find(e => e.value === event);
                        return (
                          <Chip
                            key={event}
                            label={eventInfo?.label || event}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        );
                      })}
                    </AccordionDetails>
                  </Accordion>

                  {webhook.successCount > 0 || webhook.failureCount > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Success:</strong> {webhook.successCount} | <strong>Failures:</strong> {webhook.failureCount}
                      </Typography>
                    </Box>
                  ) : null}

                  {testResults[webhook.id] && (
                    <Alert 
                      severity={testResults[webhook.id].success ? 'success' : 'error'} 
                      sx={{ mt: 2 }}
                    >
                      Test {testResults[webhook.id].success ? 'passed' : 'failed'} 
                      (HTTP {testResults[webhook.id].httpStatus}, {testResults[webhook.id].responseTime}ms)
                    </Alert>
                  )}
                </CardContent>

                <CardActions>
                  <Tooltip title="Test webhook">
                    <IconButton
                      size="small"
                      onClick={() => testWebhook(webhook)}
                      color="primary"
                    >
                      <TestIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit webhook">
                    <IconButton
                      size="small"
                      onClick={() => handleEditWebhook(webhook)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete webhook">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteWebhook(webhook)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Method</InputLabel>
                  <Select
                    value={formData.method}
                    label="Method"
                    onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
                  >
                    <MenuItem value="POST">POST</MenuItem>
                    <MenuItem value="PUT">PUT</MenuItem>
                    <MenuItem value="PATCH">PATCH</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
              />
              <TextField
                fullWidth
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
                required
              />
              <Typography variant="subtitle2" gutterBottom>
                Events to trigger webhook
              </Typography>
              <FormGroup>
                {WEBHOOK_EVENTS.map((event) => (
                  <FormControlLabel
                    key={event.value}
                    control={
                      <Checkbox
                        checked={formData.events.includes(event.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              events: [...prev.events, event.value]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              events: prev.events.filter(ev => ev !== event.value)
                            }));
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{event.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.description}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Secret (optional)"
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  type="password"
                  helperText="Used to sign webhook payloads for verification"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                  }
                  label="Active"
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Retry Count"
                  type="number"
                  value={formData.retryCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) || 0 }))}
                  inputProps={{ min: 0, max: 10 }}
                  helperText="Number of retry attempts (0-10)"
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label="Timeout (ms)"
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                  inputProps={{ min: 1000, max: 60000 }}
                  helperText="Request timeout in milliseconds (1s-60s)"
                />
              </Box>
            </Box>
              <TextField
                fullWidth
                label="Custom Headers (JSON)"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                multiline
                rows={4}
                placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                helperText="Optional custom headers as JSON object"
              />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveWebhook} variant="contained">
            {editingWebhook ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Webhook</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the webhook "{webhookToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteWebhook} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WebhooksPage;