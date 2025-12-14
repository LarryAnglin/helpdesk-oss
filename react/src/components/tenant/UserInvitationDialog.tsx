/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { UserRole } from '../../lib/types/user';
import { userTenantService } from '../../lib/services/userTenantService';
import { useTenant } from '../../lib/context/TenantContext';
import { useAuth } from '../../lib/auth/AuthContext';

interface UserInvitationDialogProps {
  open: boolean;
  onClose: () => void;
  onInviteSent?: (email: string, role: UserRole) => void;
}

const UserInvitationDialog: React.FC<UserInvitationDialogProps> = ({
  open,
  onClose,
  onInviteSent
}) => {
  const { currentTenant } = useTenant();
  const { userData } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentTenant || !userData) return;
    
    try {
      setLoading(true);
      setError(null);

      await userTenantService.inviteUserToTenant(
        currentTenant.id,
        email,
        role,
        userData.uid
      );

      onInviteSent?.(email, role);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('user');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite User to {currentTenant?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}
          
          <TextField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            disabled={loading}
          />
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              label="Role"
              disabled={loading}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="tech">Tech</MenuItem>
              <MenuItem value="organization_admin">Organization Admin</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={loading || !email.trim()}
        >
          {loading ? <CircularProgress size={20} /> : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserInvitationDialog;