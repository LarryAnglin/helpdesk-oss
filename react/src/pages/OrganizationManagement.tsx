// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../lib/auth/AuthContext';
import { 
  getOrganization, 
  updateOrganization, 
  getTrialDaysRemaining,
  isTrialExpired,
  getSubscriptionPlans
} from '../lib/firebase/organizationService';
import { getAllUsers } from '../lib/firebase/userClientService';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase/firebaseConfig';
import { Organization, OrganizationFormData, SubscriptionPlan } from '../lib/types/organization';
import UpgradeButton from '../components/billing/UpgradeButton';

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
];

const OrganizationManagement: React.FC = () => {
  const { userData } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [plans] = useState<SubscriptionPlan[]>(getSubscriptionPlans());
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    description: '',
    billingEmail: '',
    timezone: 'UTC',
    locale: 'en'
  });
  
  const [usageStats, setUsageStats] = useState({
    userCount: 0,
    companyCount: 0,
    ticketCount: 0
  });

  const isOwnerOrAdmin = userData?.organizationId && organization && 
    (organization.ownerUserId === userData.uid || organization.adminUserIds.includes(userData.uid));

  useEffect(() => {
    if (userData?.organizationId) {
      loadOrganization();
    } else {
      setLoading(false);
    }
  }, [userData?.organizationId]);

  const loadOrganization = async () => {
    if (!userData?.organizationId) return;
    
    try {
      setLoading(true);
      const org = await getOrganization(userData.organizationId);
      if (org) {
        setOrganization(org);
        setFormData({
          name: org.name,
          description: org.description || '',
          billingEmail: org.billing.billingEmail,
          timezone: org.settings.timezone || 'UTC',
          locale: org.settings.locale || 'en'
        });
        
        // Load usage statistics
        await loadUsageStatistics(userData.organizationId);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading organization:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStatistics = async (organizationId: string) => {
    try {
      console.log('loadUsageStatistics: Starting with organizationId:', organizationId);
      
      // Count users in this organization
      const usersQuery = query(
        collection(db, 'users'),
        where('organizationId', '==', organizationId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const userCount = usersSnapshot.size;
      console.log('loadUsageStatistics: Found', userCount, 'users');
      
      // Count companies in this organization  
      // Try multiple field name variations in case of field name mismatch
      let companyCount = 0;
      
      // First try standard organizationId field
      const companiesQuery1 = query(
        collection(db, 'companies'),
        where('organizationId', '==', organizationId)
      );
      const companiesSnapshot1 = await getDocs(companiesQuery1);
      companyCount = companiesSnapshot1.size;
      console.log('loadUsageStatistics: Found', companyCount, 'companies with organizationId field');
      
      // If no companies found, try alternative field names
      if (companyCount === 0) {
        try {
          const companiesQuery2 = query(
            collection(db, 'companies'),
            where('organization_id', '==', organizationId)
          );
          const companiesSnapshot2 = await getDocs(companiesQuery2);
          companyCount = companiesSnapshot2.size;
          console.log('loadUsageStatistics: Found', companyCount, 'companies with organization_id field');
        } catch (e) {
          console.log('organization_id field does not exist');
        }
      }
      
      // If still no companies found, check all companies and fix the field
      if (companyCount === 0) {
        console.log('No companies found with organizationId, checking all companies...');
        const allCompaniesSnapshot = await getDocs(collection(db, 'companies'));
        console.log(`Total companies in database: ${allCompaniesSnapshot.size}`);
        
        // Log first company to see its structure and try to fix it
        if (allCompaniesSnapshot.size > 0) {
          const firstCompany = allCompaniesSnapshot.docs[0];
          const companyData = firstCompany.data();
          console.log('First company data:', {
            id: firstCompany.id,
            name: companyData.name,
            organizationId: companyData.organizationId,
            organization_id: companyData.organization_id,
            allFields: Object.keys(companyData)
          });
          
          // If the company doesn't have organizationId, add it
          if (!companyData.organizationId && allCompaniesSnapshot.size === 1) {
            console.log('Fixing company organizationId field...');
            try {
              await updateDoc(doc(db, 'companies', firstCompany.id), {
                organizationId: organizationId,
                updatedAt: new Date()
              });
              console.log('Company organizationId field updated!');
              companyCount = 1; // We just fixed the only company
            } catch (fixError) {
              console.error('Error fixing company organizationId:', fixError);
            }
          }
        }
      }
      
      console.log('loadUsageStatistics: Final company count:', companyCount);
      
      // Count tickets in this organization
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('organizationId', '==', organizationId)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketCount = ticketsSnapshot.size;
      
      setUsageStats({
        userCount,
        companyCount,
        ticketCount
      });
    } catch (err) {
      console.error('Error loading usage statistics:', err);
      // Set defaults on error
      setUsageStats({
        userCount: 0,
        companyCount: 0,
        ticketCount: 0
      });
    }
  };

  const handleSave = async () => {
    console.log('handleSave called, organization:', organization);
    console.log('organization.id:', organization?.id);
    console.log('isOwnerOrAdmin:', isOwnerOrAdmin);
    
    if (!organization || !organization.id || !isOwnerOrAdmin) {
      setError('Organization not found or invalid');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('Calling updateOrganization with ID:', organization.id);
      await updateOrganization(organization.id, {
        ...formData,
        settings: {
          timezone: formData.timezone,
          locale: formData.locale,
          allowUserRegistration: organization.settings.allowUserRegistration,
          defaultUserRole: organization.settings.defaultUserRole
        }
      });
      
      await loadOrganization();
      setEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof OrganizationFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const getStatusColor = (status: Organization['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getPlanName = (planType: string) => {
    const plan = plans.find(p => p.type === planType);
    return plan?.name || planType;
  };

  const formatPrice = (price: number, interval: string) => {
    const amount = price / 100;
    return `$${amount.toFixed(2)}/${interval === 'year' ? 'year' : 'month'}`;
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

  const trialDays = getTrialDaysRemaining(organization);
  const expired = isTrialExpired(organization);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Organization Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Organization Info Card */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{organization.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {organization.description || 'No description'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip 
                  label={organization.status.charAt(0).toUpperCase() + organization.status.slice(1)}
                  color={getStatusColor(organization.status)}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body2">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
            </CardContent>
            
            {isOwnerOrAdmin && (
              <CardActions>
                <Button 
                  startIcon={<EditIcon />}
                  onClick={() => setEditDialogOpen(true)}
                  size="small"
                >
                  Edit Details
                </Button>
              </CardActions>
            )}
          </Card>
        </Grid>

        {/* Billing Info Card */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                  <PaymentIcon />
                </Avatar>
                <Typography variant="h6">Billing & Plan</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Current Plan</Typography>
                <Typography variant="h6">
                  {getPlanName(organization.billing.plan)}
                </Typography>
                {organization.billing.plan !== 'free_trial' && organization.billing.amount && (
                  <Typography variant="body2" color="text.secondary">
                    {formatPrice(organization.billing.amount, 
                      plans.find(p => p.type === organization.billing.plan)?.interval || 'month')}
                  </Typography>
                )}
              </Box>

              {organization.billing.plan === 'free_trial' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Trial Status</Typography>
                  {expired ? (
                    <Typography variant="body2" color="error.main">
                      Trial expired
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="warning.main">
                      {trialDays} days remaining
                    </Typography>
                  )}
                </Box>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Billing Email</Typography>
                <Typography variant="body2">
                  {organization.billing.billingEmail}
                </Typography>
              </Box>
            </CardContent>
            
            <CardActions>
              {organization.billing.plan === 'free_trial' ? (
                <UpgradeButton 
                  organization={organization}
                  size="small"
                  variant="outlined"
                />
              ) : (
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => window.location.href = '/billing'}
                >
                  Manage Billing
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>

        {/* Usage Stats Card */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'info.main' }}>
                  <PersonIcon />
                </Avatar>
                <Typography variant="h6">Usage Statistics</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {usageStats.userCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Users
                  </Typography>
                </Grid>
                <Grid xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="secondary">
                    {usageStats.companyCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Companies
                  </Typography>
                </Grid>
                <Grid xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info">
                    {usageStats.ticketCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tickets
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Settings Card */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'grey.600' }}>
                  <SettingsIcon />
                </Avatar>
                <Typography variant="h6">Settings</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Timezone</Typography>
                <Typography variant="body2">
                  {organization.settings.timezone}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Locale</Typography>
                <Typography variant="body2">
                  {organization.settings.locale?.toUpperCase()}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">User Registration</Typography>
                <Typography variant="body2">
                  {organization.settings.allowUserRegistration ? 'Allowed' : 'Restricted'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Organization Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Organization</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <TextField
              label="Organization Name"
              fullWidth
              value={formData.name}
              onChange={handleInputChange('name')}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange('description')}
            />
            
            <TextField
              label="Billing Email"
              fullWidth
              type="email"
              value={formData.billingEmail}
              onChange={handleInputChange('billingEmail')}
            />
            
            <FormControl fullWidth>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={formData.timezone}
                onChange={handleInputChange('timezone')}
                label="Timezone"
              >
                {timezones.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Locale</InputLabel>
              <Select
                value={formData.locale}
                onChange={handleInputChange('locale')}
                label="Locale"
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationManagement;