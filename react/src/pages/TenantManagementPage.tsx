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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  Snackbar,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Visibility as ViewIcon,
  Block as SuspendIcon,
  CheckCircle as ActivateIcon
} from '@mui/icons-material';
import { 
  Tenant, 
  TenantStatus, 
  TenantPlan,
  CreateTenantRequest,
} from '../lib/types/tenant';
import { tenantService } from '../lib/firebase/tenantService';

interface TenantFormData {
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  primaryColor: string;
  logoUrl: string;
  customDomain: string;
  maxUsers: number;
  maxTickets: number;
  maxStorage: number;
}

const TenantManagementPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    plan: 'free',
    status: 'trial',
    primaryColor: '#1976d2',
    logoUrl: '',
    customDomain: '',
    maxUsers: 5,
    maxTickets: 100,
    maxStorage: 1000
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const tenantList = await tenantService.getAllTenants();
      setTenants(tenantList);
    } catch (err) {
      setError('Failed to load tenants');
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        primaryColor: tenant.branding.primaryColor,
        logoUrl: tenant.branding.logoUrl || '',
        customDomain: tenant.branding.customDomain || '',
        maxUsers: tenant.limits.users,
        maxTickets: tenant.limits.tickets,
        maxStorage: tenant.limits.storage
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        slug: '',
        plan: 'free',
        status: 'trial',
        primaryColor: '#1976d2',
        logoUrl: '',
        customDomain: '',
        maxUsers: 5,
        maxTickets: 100,
        maxStorage: 1000
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTenant(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingTenant) {
        // Update existing tenant
        const updates = {
          name: formData.name,
          plan: formData.plan,
          status: formData.status,
          branding: {
            companyName: formData.name,
            primaryColor: formData.primaryColor,
            secondaryColor: '#666',
            logoUrl: formData.logoUrl,
            customDomain: formData.customDomain,
            emailFromName: formData.name,
            emailFromAddress: 'support@' + formData.slug + '.com',
            supportEmail: 'support@' + formData.slug + '.com'
          }
        };
        await tenantService.updateTenant(editingTenant.id, updates);
        setSnackbar({ open: true, message: 'Tenant updated successfully', severity: 'success' });
      } else {
        // Create new tenant
        const createRequest: CreateTenantRequest = {
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan,
          ownerEmail: 'admin@example.com', // TODO: Get from current user
          branding: {
            companyName: formData.name,
            primaryColor: formData.primaryColor,
            secondaryColor: '#666',
            logoUrl: formData.logoUrl,
            customDomain: formData.customDomain,
            emailFromName: formData.name,
            emailFromAddress: 'support@' + formData.slug + '.com',
            supportEmail: 'support@' + formData.slug + '.com'
          }
        };
        await tenantService.createTenant(createRequest);
        setSnackbar({ open: true, message: 'Tenant created successfully', severity: 'success' });
      }
      handleCloseDialog();
      loadTenants();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to save tenant', severity: 'error' });
      console.error('Error saving tenant:', err);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      try {
        await tenantService.deleteTenant(tenantId);
        setSnackbar({ open: true, message: 'Tenant deleted successfully', severity: 'success' });
        loadTenants();
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to delete tenant', severity: 'error' });
        console.error('Error deleting tenant:', err);
      }
    }
  };

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: TenantPlan) => {
    switch (plan) {
      case 'free': return 'default';
      case 'basic': return 'primary';
      case 'professional': return 'secondary';
      case 'enterprise': return 'success';
      default: return 'default';
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Tenant
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Organization</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Tickets</TableCell>
              <TableCell>Storage</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="action" />
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {tenant.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tenant.slug}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={tenant.plan}
                    color={getPlanColor(tenant.plan)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status}
                    color={getStatusColor(tenant.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {tenant.usage.users} / {tenant.limits.users}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getUsagePercentage(tenant.usage.users, tenant.limits.users)}
                      sx={{ width: 60, height: 4 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {tenant.usage.tickets} / {tenant.limits.tickets}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getUsagePercentage(tenant.usage.tickets, tenant.limits.tickets)}
                      sx={{ width: 60, height: 4 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {Math.round(tenant.usage.storage / 1024 / 1024)} / {Math.round(tenant.limits.storage / 1024 / 1024)} MB
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getUsagePercentage(tenant.usage.storage, tenant.limits.storage)}
                      sx={{ width: 60, height: 4 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleOpenDialog(tenant)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {tenant.status === 'active' ? (
                      <Tooltip title="Suspend">
                        <IconButton size="small" color="warning">
                          <SuspendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Activate">
                        <IconButton size="small" color="success">
                          <ActivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteTenant(tenant.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Organization Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                fullWidth
                required
                disabled={!!editingTenant}
                helperText="Used for URLs and API access"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Plan</InputLabel>
                <Select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as TenantPlan })}
                  label="Plan"
                >
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TenantStatus })}
                  label="Status"
                >
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Primary Color"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Logo URL"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Custom Domain"
                value={formData.customDomain}
                onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                fullWidth
                helperText="Optional custom domain for this tenant"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Max Users"
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Max Tickets"
                type="number"
                value={formData.maxTickets}
                onChange={(e) => setFormData({ ...formData, maxTickets: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Max Storage (MB)"
                type="number"
                value={formData.maxStorage}
                onChange={(e) => setFormData({ ...formData, maxStorage: parseInt(e.target.value) || 0 })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TenantManagementPage;