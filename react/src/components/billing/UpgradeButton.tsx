// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Upgrade as UpgradeIcon
} from '@mui/icons-material';
import { Organization } from '../../lib/types/organization';
import { 
  createCheckoutSession, 
  redirectToCheckout,
  STRIPE_PLANS,
  getPlanById
} from '../../lib/stripe/stripeService';
import PricingCard from './PricingCard';

interface UpgradeButtonProps {
  organization: Organization;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
  fullWidth?: boolean;
}

const UpgradeButton: React.FC<UpgradeButtonProps> = ({
  organization,
  size = 'medium',
  variant = 'contained',
  fullWidth = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
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
        successUrl: `${window.location.origin}/organization?upgraded=true`,
        cancelUrl: `${window.location.origin}/organization?upgrade_canceled=true`
      });

      await redirectToCheckout(sessionId);
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setUpgrading(false);
    }
  };

  const handleClose = () => {
    if (!upgrading) {
      setDialogOpen(false);
      setError(null);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        startIcon={<UpgradeIcon />}
        onClick={() => setDialogOpen(true)}
        color="primary"
      >
        Upgrade Plan
      </Button>

      <Dialog 
        open={dialogOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5">
            Upgrade Your Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a plan that fits your needs
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={3}>
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
          
          {upgrading && (
            <Grid container justifyContent="center" sx={{ mt: 3 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center' }}>
                Redirecting to checkout...
              </Typography>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={upgrading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UpgradeButton;