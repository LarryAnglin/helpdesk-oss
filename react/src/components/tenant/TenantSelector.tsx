/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTenant } from '../../lib/context/TenantContext';
import { Tenant } from '../../lib/types/tenant';

interface TenantSelectorProps {
  compact?: boolean;
}

const TenantSelector: React.FC<TenantSelectorProps> = ({ compact = false }) => {
  const { currentTenant, availableTenants, switchTenant, loading } = useTenant();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTenantSelect = async (tenant: Tenant) => {
    if (tenant.id !== currentTenant?.id) {
      await switchTenant(tenant.id);
    }
    handleClose();
  };

  const getStatusColor = (status: Tenant['status']) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'warning';
      case 'suspended': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getPlanColor = (plan: Tenant['plan']) => {
    switch (plan) {
      case 'free': return 'default';
      case 'basic': return 'primary';
      case 'professional': return 'secondary';
      case 'enterprise': return 'success';
      default: return 'default';
    }
  };

  if (loading || !currentTenant) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BusinessIcon color="action" />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          endIcon={availableTenants.length > 1 ? <ArrowDownIcon /> : undefined}
          disabled={availableTenants.length <= 1}
          sx={{ 
            minWidth: 'auto',
            color: 'white',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.87)', // WCAG compliant contrast
              borderColor: 'rgba(255, 255, 255, 0.5)'
            }
          }}
        >
          <BusinessIcon sx={{ mr: 0.5 }} />
          {currentTenant.name}
        </Button>

        {availableTenants.length > 1 && (
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            {availableTenants.map((tenant) => (
              <MenuItem
                key={tenant.id}
                onClick={() => handleTenantSelect(tenant)}
                selected={tenant.id === currentTenant.id}
              >
                <ListItemIcon>
                  {tenant.id === currentTenant.id ? <CheckIcon /> : <BusinessIcon />}
                </ListItemIcon>
                <ListItemText primary={tenant.name} />
              </MenuItem>
            ))}
          </Menu>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleClick}
        endIcon={availableTenants.length > 1 ? <ArrowDownIcon /> : undefined}
        disabled={availableTenants.length <= 1}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          minWidth: 200,
          maxWidth: 300
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: currentTenant.branding.primaryColor }}>
            <BusinessIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {currentTenant.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Chip
                label={currentTenant.status}
                color={getStatusColor(currentTenant.status)}
                size="small"
                sx={{ fontSize: '0.75rem', height: 16 }}
              />
              <Chip
                label={currentTenant.plan}
                color={getPlanColor(currentTenant.plan)}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.75rem', height: 16 }}
              />
            </Box>
          </Box>
        </Box>
      </Button>

      {availableTenants.length > 1 && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: { minWidth: 250, maxWidth: 350 }
          }}
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Switch Organization
            </Typography>
          </Box>
          <Divider />
          
          {availableTenants.map((tenant) => (
            <MenuItem
              key={tenant.id}
              onClick={() => handleTenantSelect(tenant)}
              selected={tenant.id === currentTenant.id}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, bgcolor: tenant.branding.primaryColor }}>
                  {tenant.id === currentTenant.id ? <CheckIcon /> : <BusinessIcon />}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={tenant.name}
                secondary={
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip
                      label={tenant.status}
                      color={getStatusColor(tenant.status)}
                      size="small"
                      sx={{ fontSize: '0.7rem', height: 14 }}
                    />
                    <Chip
                      label={tenant.plan}
                      color={getPlanColor(tenant.plan)}
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: '0.7rem', height: 14 }}
                    />
                  </Box>
                }
              />
            </MenuItem>
          ))}
        </Menu>
      )}
    </Box>
  );
};

export default TenantSelector;