/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  ConfirmationNumber as TicketIcon,
  AccountTree as TenantIcon
} from '@mui/icons-material';
import { organizationMigration, OrganizationMigrationStatus } from '../../lib/migration/organizationMigration';
import { useAuth } from '../../lib/auth/AuthContext';
import { hasRole } from '../../lib/utils/roleUtils';

const OrganizationMigrationManager: React.FC = () => {
  const { userData } = useAuth();
  const [migrationStatus, setMigrationStatus] = useState<{
    needed: boolean;
    organizationId?: string;
    companyId?: string;
    stats?: {
      totalUsers: number;
      totalTickets: number;
      totalTenants: number;
    };
  } | null>(null);
  const [migrationResult, setMigrationResult] = useState<OrganizationMigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only allow system admins and super admins to access this
  const canAccessMigration = hasRole(userData?.role, 'system_admin') || hasRole(userData?.role, 'super_admin');

  useEffect(() => {
    if (canAccessMigration) {
      checkMigrationStatus();
    }
  }, [canAccessMigration]);

  const checkMigrationStatus = async () => {
    try {
      setChecking(true);
      setError(null);
      const status = await organizationMigration.getMigrationStatus();
      setMigrationStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check migration status');
    } finally {
      setChecking(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowConfirmDialog(false);
      
      const result = await organizationMigration.runOrganizationMigration();
      setMigrationResult(result);
      
      // Refresh migration status after completion
      await checkMigrationStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setLoading(false);
    }
  };

  if (!canAccessMigration) {
    return (
      <Alert severity="error">
        You don't have permission to access the migration manager. Only System Admins and Super Admins can run migrations.
      </Alert>
    );
  }

  if (checking) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Checking migration status...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Organization & Company Migration Manager
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            This tool migrates your existing data to the new Organization and Company structure.
            It creates a "Default Organization" and "Default Company" and assigns all existing
            users, tickets, and data to these entities.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {migrationStatus && (
            <>
              {!migrationStatus.needed ? (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Migration Complete!</Typography>
                  <Typography variant="body2">
                    Your data has been successfully migrated to the Organization and Company structure.
                  </Typography>
                  {migrationStatus.organizationId && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Default Organization ID:</strong> {migrationStatus.organizationId}
                    </Typography>
                  )}
                  {migrationStatus.companyId && (
                    <Typography variant="body2">
                      <strong>Default Company ID:</strong> {migrationStatus.companyId}
                    </Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Migration Required</Typography>
                  <Typography variant="body2">
                    Your data needs to be migrated to the new Organization and Company structure.
                  </Typography>
                  
                  {migrationStatus.stats && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Data to be migrated:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <PeopleIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${migrationStatus.stats.totalUsers} Users`}
                            secondary="Will be assigned to Default Organization and Company"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <TicketIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${migrationStatus.stats.totalTickets} Tickets`}
                            secondary="Will be associated with Default Organization and Company"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <TenantIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`${migrationStatus.stats.totalTenants} Tenants`}
                            secondary="Will be linked to Default Organization"
                          />
                        </ListItem>
                      </List>
                    </Box>
                  )}
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              {migrationStatus.needed && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Migration Process
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    The migration will perform the following steps:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <BusinessIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Create Default Organization"
                        secondary="A new organization called 'Default Organization' will be created"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <BusinessIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Create Default Company"
                        secondary="A new company called 'Default Company' will be created within the organization"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PeopleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Update User Assignments"
                        secondary="All users will be assigned to the Default Organization and Company"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TicketIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Update Ticket Associations"
                        secondary="All tickets will be associated with the Default Organization and Company"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <TenantIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Update Tenant References"
                        secondary="All tenants will be linked to the Default Organization"
                      />
                    </ListItem>
                  </List>
                </Box>
              )}

              {loading && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Migration in progress...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}

              {migrationResult && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity={migrationResult.completed ? 'success' : 'error'}>
                    <Typography variant="subtitle2">
                      {migrationResult.completed ? 'Migration Completed Successfully!' : 'Migration Failed'}
                    </Typography>
                    
                    {migrationResult.error && (
                      <Typography variant="body2" color="error">
                        Error: {migrationResult.error}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Migration Results:
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            {migrationResult.details.defaultOrganizationCreated ? 
                              <CheckCircleIcon color="success" /> : 
                              <ErrorIcon color="error" />
                            }
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Default Organization: ${migrationResult.details.defaultOrganizationCreated ? 'Created' : 'Failed'}`}
                            secondary={migrationResult.details.organizationId ? `ID: ${migrationResult.details.organizationId}` : undefined}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            {migrationResult.details.defaultCompanyCreated ? 
                              <CheckCircleIcon color="success" /> : 
                              <ErrorIcon color="error" />
                            }
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Default Company: ${migrationResult.details.defaultCompanyCreated ? 'Created' : 'Failed'}`}
                            secondary={migrationResult.details.companyId ? `ID: ${migrationResult.details.companyId}` : undefined}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <InfoIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Users Updated: ${migrationResult.details.usersUpdated}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <InfoIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Tickets Updated: ${migrationResult.details.ticketsUpdated}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <InfoIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={`Tenants Updated: ${migrationResult.details.tenantsUpdated}`}
                          />
                        </ListItem>
                        {migrationResult.details.otherCollectionsUpdated.length > 0 && (
                          <ListItem>
                            <ListItemIcon>
                              <InfoIcon />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Other Collections Updated:"
                              secondary={migrationResult.details.otherCollectionsUpdated.join(', ')}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  </Alert>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  onClick={checkMigrationStatus}
                  disabled={loading}
                  variant="outlined"
                >
                  Refresh Status
                </Button>
                
                {migrationStatus.needed && (
                  <Button 
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={loading}
                    variant="contained"
                    color="primary"
                  >
                    {loading ? 'Migrating...' : 'Run Migration'}
                  </Button>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>
          Confirm Organization Migration
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to run the Organization and Company migration? This will:
          </Typography>
          <Typography component="div">
            <ul>
              <li>Create a "Default Organization" and "Default Company"</li>
              <li>Assign all existing users to these entities</li>
              <li>Associate all existing tickets with these entities</li>
              <li>Link all tenants to the Default Organization</li>
            </ul>
          </Typography>
          <Typography paragraph color="warning.main">
            <strong>Warning:</strong> This migration should only be run once. Make sure you have a backup of your data before proceeding.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button onClick={runMigration} variant="contained" color="primary">
            Run Migration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationMigrationManager;