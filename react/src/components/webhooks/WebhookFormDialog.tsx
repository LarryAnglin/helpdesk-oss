// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Alert,
  Autocomplete,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import { useAuth } from '../../lib/auth/AuthContext';
import { createWebhook, updateWebhook, validateWebhookUrl } from '../../lib/firebase/webhookService';
import { getAllCompanies } from '../../lib/firebase/companyService';
import { 
  WebhookConfig, 
  WebhookFormData, 
  WebhookEventType, 
  WebhookHttpMethod,
  WebhookScope,
  WebhookFilter
} from '../../lib/types/webhook';
import { Company } from '../../lib/types/company';

interface WebhookFormDialogProps {
  open: boolean;
  onClose: () => void;
  webhook?: WebhookConfig | null;
  organizationId: string;
  onSuccess: () => void;
}

const WEBHOOK_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
  { value: 'ticket.created', label: 'Ticket Created', description: 'When a new ticket is created' },
  { value: 'ticket.updated', label: 'Ticket Updated', description: 'When ticket details are modified' },
  { value: 'ticket.resolved', label: 'Ticket Resolved', description: 'When a ticket is marked as resolved' },
  { value: 'ticket.closed', label: 'Ticket Closed', description: 'When a ticket is closed' },
  { value: 'ticket.escalated', label: 'Ticket Escalated', description: 'When a ticket is escalated' },
  { value: 'ticket.assigned', label: 'Ticket Assigned', description: 'When a ticket is assigned to someone' },
  { value: 'ticket.reply_added', label: 'Reply Added', description: 'When a reply is added to a ticket' },
  { value: 'ticket.status_changed', label: 'Status Changed', description: 'When ticket status changes' },
  { value: 'ticket.priority_changed', label: 'Priority Changed', description: 'When ticket priority changes' }
];

const HTTP_METHODS: WebhookHttpMethod[] = ['POST', 'PUT', 'PATCH'];

const WEBHOOK_SCOPES: { value: WebhookScope; label: string; description: string }[] = [
  { value: 'organization', label: 'Organization', description: 'All events in the organization' },
  { value: 'company', label: 'Company', description: 'Events from specific companies only' },
  { value: 'user', label: 'User', description: 'Events from specific users only' }
];

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];

const WebhookFormDialog: React.FC<WebhookFormDialogProps> = ({
  open,
  onClose,
  webhook,
  organizationId,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
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
    active: true,
    scope: 'organization',
    filters: {}
  });

  const isEditing = !!webhook;

  useEffect(() => {
    if (open) {
      loadCompanies();
      if (webhook) {
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
          active: webhook.active,
          scope: webhook.scope,
          filters: webhook.filters || {}
        });
      } else {
        // Reset form for new webhook
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
          active: true,
          scope: 'organization',
          filters: {}
        });
      }
      setError(null);
    }
  }, [open, webhook]);

  const loadCompanies = async () => {
    try {
      const companiesList = await getAllCompanies();
      setCompanies(companiesList);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Webhook name is required');
      return;
    }

    if (!formData.url.trim()) {
      setError('Webhook URL is required');
      return;
    }

    if (!validateWebhookUrl(formData.url)) {
      setError('Please enter a valid HTTPS URL');
      return;
    }

    if (formData.events.length === 0) {
      setError('Please select at least one event');
      return;
    }

    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (isEditing && webhook) {
        await updateWebhook(webhook.id, formData);
      } else {
        await createWebhook(organizationId, formData, user.uid);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving webhook:', err);
      setError(err instanceof Error ? err.message : 'Failed to save webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [key]: value
      }
    }));
  };

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return {
        ...prev,
        headers: newHeaders
      };
    });
  };

  const addHeader = () => {
    const key = prompt('Header name:');
    if (key) {
      const value = prompt('Header value:');
      if (value) {
        handleHeaderChange(key, value);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Webhook' : 'Create Webhook'}
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Basic Info */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Webhook Name"
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>HTTP Method</InputLabel>
                    <Select
                      value={formData.method}
                      onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as WebhookHttpMethod }))}
                      label="HTTP Method"
                    >
                      {HTTP_METHODS.map(method => (
                        <MenuItem key={method} value={method}>{method}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Webhook URL"
                    fullWidth
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    required
                    helperText="Must be a valid HTTPS URL"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Scope and Filtering */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Scope & Filtering</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Webhook Scope</InputLabel>
                    <Select
                      value={formData.scope}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        scope: e.target.value as WebhookScope,
                        filters: {} // Reset filters when scope changes
                      }))}
                      label="Webhook Scope"
                    >
                      {WEBHOOK_SCOPES.map(scope => (
                        <MenuItem key={scope.value} value={scope.value}>
                          <Box>
                            <Typography variant="body2">{scope.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {scope.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {formData.scope === 'company' && (
                  <Grid item xs={12}>
                    <Autocomplete
                      multiple
                      options={companies}
                      getOptionLabel={(company) => company.name}
                      value={companies.filter(c => formData.filters.companyIds?.includes(c.id))}
                      onChange={(_, selectedCompanies) => {
                        setFormData(prev => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            companyIds: selectedCompanies.map(c => c.id)
                          }
                        }));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Filter by Companies"
                          helperText="Select specific companies to filter events"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((company, index) => (
                          <Chip
                            variant="outlined"
                            label={company.name}
                            {...getTagProps({ index })}
                            key={company.id}
                          />
                        ))
                      }
                    />
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={PRIORITY_OPTIONS}
                    value={formData.filters.priorities || []}
                    onChange={(_, priorities) => {
                      setFormData(prev => ({
                        ...prev,
                        filters: { ...prev.filters, priorities }
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Filter by Priority"
                        helperText="Only trigger for specific priorities"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={STATUS_OPTIONS}
                    value={formData.filters.statuses || []}
                    onChange={(_, statuses) => {
                      setFormData(prev => ({
                        ...prev,
                        filters: { ...prev.filters, statuses }
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Filter by Status"
                        helperText="Only trigger for specific statuses"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Events */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Events</Typography>
              <Autocomplete
                multiple
                options={WEBHOOK_EVENTS}
                getOptionLabel={(event) => event.label}
                value={WEBHOOK_EVENTS.filter(e => formData.events.includes(e.value))}
                onChange={(_, selectedEvents) => {
                  setFormData(prev => ({
                    ...prev,
                    events: selectedEvents.map(e => e.value)
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Events"
                    helperText="Choose which events should trigger this webhook"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((event, index) => (
                    <Chip
                      variant="outlined"
                      label={event.label}
                      {...getTagProps({ index })}
                      key={event.value}
                    />
                  ))
                }
              />
            </Paper>
          </Grid>

          {/* Advanced Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Advanced Settings</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Retry Count"
                    type="number"
                    fullWidth
                    value={formData.retryCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, retryCount: parseInt(e.target.value) || 0 }))}
                    inputProps={{ min: 0, max: 10 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Timeout (ms)"
                    type="number"
                    fullWidth
                    value={formData.timeout}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    inputProps={{ min: 1000, max: 60000 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Secret (optional)"
                    fullWidth
                    value={formData.secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                    helperText="For signature verification"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
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

              {/* Headers */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>Custom Headers</Typography>
              
              {Object.entries(formData.headers).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    label="Header Name"
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const newHeaders = { ...formData.headers };
                      delete newHeaders[key];
                      newHeaders[newKey] = value;
                      setFormData(prev => ({ ...prev, headers: newHeaders }));
                    }}
                  />
                  <TextField
                    size="small"
                    label="Header Value"
                    value={value}
                    onChange={(e) => handleHeaderChange(key, e.target.value)}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeHeader(key)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              
              <Button size="small" onClick={addHeader}>
                Add Header
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookFormDialog;