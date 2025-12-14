// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../lib/auth/AuthContext';
import { getOrganization, isTrialExpired, getTrialDaysRemaining } from '../lib/firebase/organizationService';
import { Organization } from '../lib/types/organization';
import { 
  createCheckoutSession, 
  createBillingPortalSession, 
  redirectToCheckout,
  STRIPE_PLANS,
  getPlanById,
  formatPrice
} from '../lib/stripe/stripeService';
import PricingCard from '../components/billing/PricingCard';

const BillingPage: React.FC = () => {
  const { userData } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setOrganization(org);
      setError(null);
    } catch (err) {
      console.error('Error loading organization:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!organization || !isOwnerOrAdmin) return;

    const plan = getPlanById(planId);
    if (!plan) {
      setError('Invalid plan selected');
      return;
    }

    setUpgrading(true);
    setError(null);

    try {
      const { sessionId } = await createCheckoutSession({
        organizationId: organization.id,
        priceId: plan.stripePriceId,
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?canceled=true`
      });

      await redirectToCheckout(sessionId);
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!organization || !isOwnerOrAdmin) return;

    try {
      const { url } = await createBillingPortalSession({
        organizationId: organization.id,
        returnUrl: `${window.location.origin}/billing`
      });

      window.location.href = url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
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
          Only organization owners and admins can manage billing.
        </Alert>
      </Box>
    );
  }

  const trialDays = getTrialDaysRemaining(organization);
  const expired = isTrialExpired(organization);
  const isOnTrial = organization.billing.plan === 'free_trial';
  const currentPlan = getPlanById(organization.billing.plan);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Billing & Subscription
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Plan Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PaymentIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">Current Plan</Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {isOnTrial ? 'Free Trial' : currentPlan?.name || 'Unknown Plan'}
              </Typography>
              
              {isOnTrial && (
                <Box sx={{ mb: 2 }}>
                  {expired ? (
                    <Chip label="Trial Expired" color="error" />
                  ) : (
                    <Chip 
                      label={`${trialDays} days remaining`} 
                      color="warning" 
                      icon={<ScheduleIcon />}
                    />
                  )}
                </Box>
              )}

              {!isOnTrial && currentPlan && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    {formatPrice(currentPlan.price, currentPlan.interval)}
                  </Typography>
                  <Chip 
                    label={organization.billing.paymentStatus || 'Active'} 
                    color="success" 
                  />
                </Box>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              {!isOnTrial && organization.billing.stripeCustomerId && (
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={handleManageBilling}
                  sx={{ mb: 1 }}
                >
                  Manage Billing
                </Button>
              )}
              
              {organization.billing.nextPaymentDate && (
                <Typography variant="body2" color="text.secondary">
                  Next billing: {new Date(organization.billing.nextPaymentDate).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Trial Expiration Warning */}
      {isOnTrial && trialDays <= 3 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {expired ? 'Your trial has expired!' : `Your trial expires in ${trialDays} day${trialDays !== 1 ? 's' : ''}!`}
          </Typography>
          <Typography variant="body2">
            Upgrade now to continue using all features and avoid any service interruption.
          </Typography>
        </Alert>
      )}

      {/* Pricing Plans */}
      {(isOnTrial || expired) && (
        <>
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h5" gutterBottom>
            Choose Your Plan
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {STRIPE_PLANS.map((plan) => (
              <Grid item xs={12} md={6} key={plan.id}>
                <PricingCard
                  plan={plan}
                  onSelectPlan={handleUpgrade}
                  loading={upgrading}
                  disabled={upgrading}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Usage Stats */}
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Usage Overview
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {organization.userCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {organization.companyCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Companies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info">
                {organization.ticketCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tickets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BillingPage;