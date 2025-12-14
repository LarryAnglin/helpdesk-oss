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
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { WebhookConfig, WebhookStats, WebhookDelivery } from '../../lib/types/webhook';
import { getWebhookDeliveries } from '../../lib/firebase/webhookService';

interface WebhookDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  webhook: WebhookConfig | null;
  stats?: WebhookStats;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const WebhookDetailsDialog: React.FC<WebhookDetailsDialogProps> = ({
  open,
  onClose,
  webhook,
  stats
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && webhook) {
      loadDeliveries();
    }
  }, [open, webhook]);

  const loadDeliveries = async () => {
    if (!webhook) return;

    setLoading(true);
    try {
      const deliveriesList = await getWebhookDeliveries(webhook.id);
      setDeliveries(deliveriesList);
      setError(null);
    } catch (err) {
      console.error('Error loading deliveries:', err);
      setError('Failed to load delivery history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" fontSize="small" />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'pending':
      case 'retrying':
        return <PendingIcon color="warning" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
      case 'retrying':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'organization':
        return 'Organization';
      case 'company':
        return 'Company';
      case 'user':
        return 'User';
      default:
        return scope;
    }
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{webhook.name}</Typography>
          <Chip
            label={webhook.active ? webhook.status : 'Disabled'}
            color={webhook.active ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Details" />
          <Tab label="Statistics" />
          <Tab label="Delivery History" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Webhook Details */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">URL</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {webhook.url}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Method</Typography>
                    <Chip label={webhook.method} size="small" variant="outlined" />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Scope</Typography>
                    <Chip label={getScopeLabel(webhook.scope)} size="small" />
                  </Box>

                  {webhook.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Description</Typography>
                      <Typography variant="body2">{webhook.description}</Typography>
                    </Box>
                  )}

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                    <Typography variant="body2">
                      {new Date(webhook.createdAt?.toDate?.() || webhook.createdAt).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body2">
                      {new Date(webhook.updatedAt?.toDate?.() || webhook.updatedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Configuration</Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Events</Typography>
                    <Box sx={{ mt: 1 }}>
                      {webhook.events.map(event => (
                        <Chip
                          key={event}
                          label={event}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Retry Count</Typography>
                    <Typography variant="body2">{webhook.retryCount}</Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Timeout</Typography>
                    <Typography variant="body2">{webhook.timeout}ms</Typography>
                  </Box>

                  {webhook.secret && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Secret Configured</Typography>
                      <Chip label="Yes" color="success" size="small" />
                    </Box>
                  )}

                  {Object.keys(webhook.headers).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Custom Headers</Typography>
                      <Box sx={{ mt: 1 }}>
                        {Object.entries(webhook.headers).map(([key, value]) => (
                          <Typography key={key} variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                            {key}: {value}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Filters */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Filters</Typography>
                  
                  {webhook.filters.companyIds && webhook.filters.companyIds.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Company Filter</Typography>
                      <Typography variant="body2">
                        {webhook.filters.companyIds.length} companies selected
                      </Typography>
                    </Box>
                  )}

                  {webhook.filters.priorities && webhook.filters.priorities.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Priority Filter</Typography>
                      <Box sx={{ mt: 1 }}>
                        {webhook.filters.priorities.map(priority => (
                          <Chip key={priority} label={priority} size="small" variant="outlined" sx={{ mr: 1 }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {webhook.filters.statuses && webhook.filters.statuses.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Status Filter</Typography>
                      <Box sx={{ mt: 1 }}>
                        {webhook.filters.statuses.map(status => (
                          <Chip key={status} label={status} size="small" variant="outlined" sx={{ mr: 1 }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {(!webhook.filters.companyIds || webhook.filters.companyIds.length === 0) &&
                   (!webhook.filters.priorities || webhook.filters.priorities.length === 0) &&
                   (!webhook.filters.statuses || webhook.filters.statuses.length === 0) && (
                    <Typography variant="body2" color="text.secondary">
                      No filters configured - webhook will trigger for all events
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Statistics */}
          {stats ? (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.totalDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Deliveries
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats.successfulDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {stats.failedDeliveries}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {stats.successRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Success Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Average Response Time</Typography>
                    <Typography variant="h4" color="primary">
                      {stats.averageResponseTime > 0 ? `${Math.round(stats.averageResponseTime)}ms` : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Last Delivery</Typography>
                    <Typography variant="body1">
                      {stats.lastDelivery 
                        ? new Date(stats.lastDelivery).toLocaleString()
                        : 'Never'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">No statistics available</Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Delivery History */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Delivered</TableCell>
                    <TableCell>HTTP Status</TableCell>
                    <TableCell>Attempts</TableCell>
                    <TableCell>Response</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(delivery.status)}
                          <Chip
                            label={delivery.status}
                            color={getStatusColor(delivery.status)}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{delivery.eventType}</TableCell>
                      <TableCell>
                        {new Date(delivery.createdAt?.toDate?.() || delivery.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {delivery.deliveredAt 
                          ? new Date(delivery.deliveredAt?.toDate?.() || delivery.deliveredAt).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {delivery.httpStatus ? (
                          <Chip
                            label={delivery.httpStatus}
                            color={delivery.httpStatus >= 200 && delivery.httpStatus < 300 ? 'success' : 'error'}
                            size="small"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {delivery.attempts}/{delivery.maxAttempts}
                      </TableCell>
                      <TableCell>
                        {delivery.error ? (
                          <Typography variant="caption" color="error">
                            {delivery.error.substring(0, 50)}...
                          </Typography>
                        ) : delivery.response ? (
                          <Typography variant="caption" color="success">
                            Success
                          </Typography>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No delivery history available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookDetailsDialog;