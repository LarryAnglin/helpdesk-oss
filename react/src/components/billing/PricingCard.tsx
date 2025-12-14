// @ts-nocheck
/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  Check as CheckIcon
} from '@mui/icons-material';
import { StripePlan, formatPrice } from '../../lib/stripe/stripeService';

interface PricingCardProps {
  plan: StripePlan;
  isCurrentPlan?: boolean;
  onSelectPlan: (planId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  isCurrentPlan = false,
  onSelectPlan,
  loading = false,
  disabled = false
}) => {
  const handleSelect = () => {
    if (!disabled && !loading && !isCurrentPlan) {
      onSelectPlan(plan.id);
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: plan.isPopular ? 2 : 1,
        borderColor: plan.isPopular ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: plan.isPopular ? 6 : 4,
        }
      }}
    >
      {plan.isPopular && (
        <Chip
          label="Most Popular"
          color="primary"
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1
          }}
        />
      )}
      
      <CardContent sx={{ flexGrow: 1, pt: plan.isPopular ? 3 : 2 }}>
        <Typography variant="h5" component="h2" gutterBottom align="center">
          {plan.name}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
          {plan.description}
        </Typography>
        
        <Box sx={{ my: 3, textAlign: 'center' }}>
          <Typography variant="h3" component="div" color="primary">
            {formatPrice(plan.price, plan.interval)}
          </Typography>
          {plan.interval === 'year' && (
            <Typography variant="body2" color="text.secondary">
              Save 17% compared to monthly
            </Typography>
          )}
        </Box>
        
        <List dense>
          {plan.features.map((feature, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={feature}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant={plan.isPopular ? 'contained' : 'outlined'}
          size="large"
          onClick={handleSelect}
          disabled={disabled || loading || isCurrentPlan}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            `Choose ${plan.name}`
          )}
        </Button>
      </CardActions>
    </Card>
  );
};

export default PricingCard;