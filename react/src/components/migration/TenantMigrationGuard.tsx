/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { tenantMigration, MigrationStatus } from '../../lib/migration/tenantMigration';
import { useAuth } from '../../lib/auth/AuthContext';

interface TenantMigrationGuardProps {
  children: React.ReactNode;
}

const TenantMigrationGuard: React.FC<TenantMigrationGuardProps> = ({ children }) => {
  const { user, userData } = useAuth();
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Only check migration for authenticated admin users
    if (user && userData && (userData.role === 'system_admin' || userData.role === 'super_admin')) {
      checkMigrationStatus();
    } else {
      // For unauthenticated users or non-admin users, assume no migration needed
      setMigrationNeeded(false);
    }
  }, [user, userData]);

  const checkMigrationStatus = async () => {
    try {
      const needed = await tenantMigration.isMigrationNeeded();
      setMigrationNeeded(needed);
      
      if (needed) {
        // Auto-start migration
        await runMigration();
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      setMigrationNeeded(false); // Assume no migration needed if check fails
    }
  };

  const runMigration = async () => {
    try {
      setMigrating(true);
      const result = await tenantMigration.runMigration();
      setMigrationStatus(result);
      
      if (result.completed) {
        setMigrationNeeded(false);
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus({
        completed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          defaultTenantCreated: false,
          usersUpdated: 0,
          ticketsUpdated: 0,
          projectsUpdated: 0,
          otherCollectionsUpdated: []
        }
      });
    } finally {
      setMigrating(false);
    }
  };

  // Show loading while checking migration status
  if (migrationNeeded === null) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Checking system status...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  // Show migration in progress
  if (migrating) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Setting up multi-tenant system...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This will preserve all your existing data and make it available in the new tenant system.
        </Typography>
        <LinearProgress />
        <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
          This may take a few minutes depending on the amount of data.
        </Typography>
      </Box>
    );
  }

  // Show migration completed or error
  if (migrationStatus && !migrationStatus.completed) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Migration Failed
          </Typography>
          <Typography>
            {migrationStatus.error}
          </Typography>
        </Alert>
        <Button variant="contained" onClick={runMigration} sx={{ mr: 2 }}>
          Retry Migration
        </Button>
        <Button onClick={() => setShowDetails(true)}>
          Show Details
        </Button>
      </Box>
    );
  }

  // Show migration success briefly
  if (migrationStatus && migrationStatus.completed) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            System Setup Complete!
          </Typography>
          <Typography>
            Your existing data has been successfully migrated to the new multi-tenant system.
            All your tickets, projects, and other data remain accessible.
          </Typography>
        </Alert>
        <Button onClick={() => setShowDetails(true)} sx={{ mr: 2 }}>
          Show Details
        </Button>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Continue to App
        </Button>
      </Box>
    );
  }

  // Render children if no migration needed
  return (
    <>
      {children}
      
      {/* Migration Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>Migration Details</DialogTitle>
        <DialogContent>
          {migrationStatus && (
            <List>
              <ListItem>
                <ListItemIcon>
                  {migrationStatus.details.defaultTenantCreated ? <CheckIcon color="success" /> : <ErrorIcon color="error" />}
                </ListItemIcon>
                <ListItemText 
                  primary="Default Tenant Created"
                  secondary="Created organization for existing data"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {migrationStatus.details.usersUpdated > 0 ? <CheckIcon color="success" /> : <InfoIcon color="info" />}
                </ListItemIcon>
                <ListItemText 
                  primary={`Users Updated: ${migrationStatus.details.usersUpdated}`}
                  secondary="Added tenant membership to existing users"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {migrationStatus.details.ticketsUpdated > 0 ? <CheckIcon color="success" /> : <InfoIcon color="info" />}
                </ListItemIcon>
                <ListItemText 
                  primary={`Tickets Updated: ${migrationStatus.details.ticketsUpdated}`}
                  secondary="Added tenant association to existing tickets"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {migrationStatus.details.projectsUpdated > 0 ? <CheckIcon color="success" /> : <InfoIcon color="info" />}
                </ListItemIcon>
                <ListItemText 
                  primary={`Projects Updated: ${migrationStatus.details.projectsUpdated}`}
                  secondary="Added tenant association to existing projects"
                />
              </ListItem>
              
              {migrationStatus.details.otherCollectionsUpdated.map((update, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Other Data: ${update}`}
                    secondary="Additional collections updated"
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TenantMigrationGuard;