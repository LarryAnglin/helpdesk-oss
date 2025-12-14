/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  FormControl,
  FormLabel,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Upload as UploadIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthContext';
import { Company, CompanyFormData } from '../lib/types/company';
import {
  createCompany,
  updateCompany,
  deleteCompany,
  getAllCompanies,
  getCompany,
  validateLogoFile
} from '../lib/firebase/companyService';

const CompanyManagement: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Check if user has permission
  const isCompanyAdmin = userData?.role === 'company_admin';
  const isOrgAdmin = userData?.role === 'organization_admin';
  const isSystemAdmin = userData?.role === 'system_admin';
  const isSuperAdmin = userData?.role === 'super_admin';
  const canManageCompanies = (isCompanyAdmin || isOrgAdmin || isSystemAdmin || isSuperAdmin) && userData?.organizationId;
  const canManageAllCompanies = isOrgAdmin || isSystemAdmin || isSuperAdmin;

  useEffect(() => {
    if (canManageCompanies) {
      loadCompanies();
    }
  }, [canManageCompanies]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      let companiesList: Company[] = [];
      
      if (canManageAllCompanies) {
        // Organization admins and above see all companies
        companiesList = await getAllCompanies();
      } else if (isCompanyAdmin && userData?.companyId) {
        // Company admins only see their own company
        const company = await getCompany(userData.companyId);
        if (company) {
          companiesList = [company];
        }
      }
      
      setCompanies(companiesList);
      setError(null);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        settings: company.settings
      });
      setLogoPreview(company.logoUrl || null);
    } else {
      setEditingCompany(null);
      setFormData({ name: '' });
      setLogoPreview(null);
    }
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCompany(null);
    setFormData({ name: '' });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const error = validateLogoFile(file);
      if (error) {
        setError(error);
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Company name is required');
      return;
    }

    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const dataToSave: CompanyFormData = {
        ...formData,
        logoFile: logoFile || undefined
      };

      if (editingCompany) {
        console.log('CompanyManagement: Updating existing company:', editingCompany.id);
        await updateCompany(editingCompany.id, dataToSave);
      } else {
        console.log('CompanyManagement: Creating new company with userData:', { 
          organizationId: userData?.organizationId, 
          userId: user.uid,
          hasLogoFile: !!dataToSave.logoFile 
        });
        
        if (!userData?.organizationId) {
          console.error('CompanyManagement: User missing organizationId:', userData);
          throw new Error('User must belong to an organization to create a company');
        }
        
        await createCompany(dataToSave, user.uid, userData.organizationId);
      }

      await loadCompanies();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving company:', err);
      setError(err instanceof Error ? err.message : 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;

    try {
      await deleteCompany(companyToDelete.id);
      await loadCompanies();
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
    } catch (err) {
      console.error('Error deleting company:', err);
      setError('Failed to delete company');
    }
  };

  if (!canManageCompanies) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to manage companies
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Company Management
        </Typography>
        {canManageAllCompanies && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Company
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Logo</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  {company.logoUrl ? (
                    <Avatar
                      src={company.logoUrl}
                      alt={company.name}
                      sx={{ width: 40, height: 40 }}
                    >
                      <BusinessIcon />
                    </Avatar>
                  ) : (
                    <Avatar sx={{ width: 40, height: 40 }}>
                      <BusinessIcon />
                    </Avatar>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">{company.name}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {company.userCount || 0}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={company.isActive ? 'Active' : 'Inactive'}
                    color={company.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(company.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      onClick={() => handleOpenDialog(company)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {canManageAllCompanies && (
                    <>
                      <Tooltip title="View Users">
                        <IconButton
                          onClick={() => navigate(`/users?companyId=${company.id}`)}
                          size="small"
                        >
                          <PeopleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => {
                            setCompanyToDelete(company);
                            setDeleteConfirmOpen(true);
                          }}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {companies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No companies found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'text.primary' }}>
          {editingCompany ? 'Edit Company' : 'Create Company'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Company Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!formData.name.trim() && saving}
              helperText={!formData.name.trim() && saving ? 'Company name is required' : ''}
              sx={{
                '& .MuiInputLabel-root': {
                  color: 'text.primary'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: 'primary.main'
                }
              }}
            />

            <Box>
              <FormControl>
                <FormLabel sx={{ color: 'text.primary' }}>Company Logo</FormLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                  {logoPreview ? (
                    <Avatar
                      src={logoPreview}
                      alt="Logo preview"
                      sx={{ width: 80, height: 80 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 80, height: 80 }}>
                      <BusinessIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    sx={{
                      color: 'text.primary',
                      borderColor: 'text.primary',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    Upload Logo
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/png,image/svg+xml"
                      onChange={handleLogoChange}
                    />
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Accepted formats: JPEG, PNG, SVG. Max size: 5MB
                </Typography>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || !formData.name.trim()}
          >
            {saving ? <CircularProgress size={24} /> : (editingCompany ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Company</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{companyToDelete?.name}"? 
            This will deactivate the company but preserve associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompanyManagement;