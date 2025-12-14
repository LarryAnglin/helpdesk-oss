/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography
} from '@mui/material';
import { TicketFormData, Ticket } from '../../lib/types/ticket';
import FileSelector from './FileSelector';
import { CcParticipantManager } from './CcParticipantManager';
import { useAuth } from '../../lib/auth/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import BlockIcon from '@mui/icons-material/Block';
import ErrorIcon from '@mui/icons-material/Error';
import { getUserSMSPreferences } from '../../lib/firebase/smsService';
import EnhancedMarkdownEditor from '../ui/EnhancedMarkdownEditor';

interface TicketFormProps {
  ticket?: Ticket;
  onSubmit: (data: TicketFormData) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const TicketForm: React.FC<TicketFormProps> = ({ ticket, onSubmit, loading = false, error = null }) => {
  const { user, userData } = useAuth();
  const [showHighPriorityDialog, setShowHighPriorityDialog] = useState(false);
  const [showUrgentPriorityDialog, setShowUrgentPriorityDialog] = useState(false);
  const [tempManagerName, setTempManagerName] = useState('');
  const [ccParticipants, setCcParticipants] = useState<Array<{name: string; email: string}>>([]);
  const [userSMSEnabled, setUserSMSEnabled] = useState(false);
  const [loadingSMSPrefs, setLoadingSMSPrefs] = useState(true);
  const [formData, setFormData] = useState<TicketFormData>({
    title: ticket?.title || '',
    description: ticket?.description || '',
    priority: ticket?.priority || 'Medium',
    status: ticket?.status || 'Open',
    location: ticket?.location || 'RCL',
    isOnVpn: ticket?.isOnVpn || false,
    computer: ticket?.computer || '',
    networkType: 'wireless',
    wirelessNetworkName: '',
    name: ticket?.name || user?.displayName || '',
    email: ticket?.email || user?.email || '',
    phone: ticket?.phone || '',
    contactMethod: ticket?.contactMethod || 'email',
    smsUpdates: ticket?.smsUpdates || false,
    smsPhoneNumber: ticket?.smsPhoneNumber || '',
    errorMessage: ticket?.errorMessage || '',
    problemStartDate: ticket?.problemStartDate || '',
    isPersonHavingProblem: ticket?.isPersonHavingProblem !== false,
    userName: ticket?.userName || '',
    userPhone: ticket?.userPhone || '',
    userEmail: ticket?.userEmail || '',
    userPreferredContact: ticket?.userPreferredContact || 'email',
    impact: ticket?.impact || '',
    stepsToReproduce: ticket?.stepsToReproduce || '',
    agreeToTroubleshoot: false,
    files: []
  });

  // Initialize CC participants from existing ticket
  useEffect(() => {
    if (ticket?.participants) {
      const ccList = ticket.participants
        .filter(p => p.role === 'cc')
        .map(p => ({ name: p.name || '', email: p.email }));
      setCcParticipants(ccList);
    }
  }, [ticket]);

  // Load user's SMS preferences to determine if SMS checkbox should be shown
  useEffect(() => {
    const loadUserSMSPreferences = async () => {
      if (!userData?.uid) {
        setLoadingSMSPrefs(false);
        return;
      }

      try {
        const smsPrefs = await getUserSMSPreferences(userData.uid);
        setUserSMSEnabled(smsPrefs?.globalSMSEnabled && smsPrefs?.optInConfirmed || false);
      } catch (error) {
        console.error('Error loading user SMS preferences:', error);
        setUserSMSEnabled(false);
      } finally {
        setLoadingSMSPrefs(false);
      }
    };

    loadUserSMSPreferences();
  }, [userData?.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'priority') {
      if (value === 'High') {
        setShowHighPriorityDialog(true);
      } else if (value === 'Urgent') {
        setShowUrgentPriorityDialog(true);
        return; // Don't set urgent priority yet
      }
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFilesChange = (files: File[]) => {
    setFormData(prev => ({ ...prev, files }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate SMS phone number if SMS updates are enabled
    if (formData.smsUpdates && !formData.smsPhoneNumber?.trim()) {
      alert('Please enter a phone number for SMS notifications');
      return;
    }
    
    // Validate phone number format (basic validation)
    if (formData.smsUpdates && formData.smsPhoneNumber) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$|^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
      const cleanPhone = formData.smsPhoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        alert('Please enter a valid phone number for SMS notifications');
        return;
      }
    }
    
    // Validate High priority requires impact
    if (formData.priority === 'High' && !formData.impact) {
      alert('Please describe the business impact for High priority tickets');
      return;
    }
    
    // Prevent Urgent priority submission
    if (formData.priority === 'Urgent') {
      setShowUrgentPriorityDialog(true);
      return;
    }
    
    // Include CC participants in form data
    const submitData = {
      ...formData,
      cc: ccParticipants.map(p => p.email).join(', '),
      ccParticipants: ccParticipants // Send full participant info
    };
    
    await onSubmit(submitData);
  };

  // Helper functions for SMS consent status display
  const getConsentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success.light';
      case 'pending': return 'warning.light';
      case 'denied': return 'error.light';
      case 'stopped': return 'grey.300';
      default: return 'grey.100';
    }
  };

  const getConsentStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircleIcon fontSize="small" color="success" />;
      case 'pending': return <PendingIcon fontSize="small" color="warning" />;
      case 'denied': return <ErrorIcon fontSize="small" color="error" />;
      case 'stopped': return <BlockIcon fontSize="small" color="disabled" />;
      default: return null;
    }
  };

  const getConsentStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'SMS notifications active';
      case 'pending': return 'Waiting for confirmation (reply START to confirm)';
      case 'denied': return 'SMS notifications declined';
      case 'stopped': return 'SMS notifications stopped (reply START to reactivate)';
      default: return 'Unknown status';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <TextField
          fullWidth
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          disabled={loading}
        />

        <EnhancedMarkdownEditor
          value={formData.description}
          onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
          label="Description"
          placeholder="Describe your issue in detail..."
          disabled={loading}
          required
          rows={6}
          minHeight={150}
          maxHeight={400}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => handleSelectChange('priority', e.target.value)}
              label="Priority"
              disabled={loading}
            >
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          {ticket && (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status || 'Open'}
                onChange={(e) => handleSelectChange('status', e.target.value)}
                label="Status"
                disabled={loading}
              >
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
                <MenuItem value="Accepted">Accepted</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
                <MenuItem value="Waiting">Waiting</MenuItem>
                <MenuItem value="Paused">Paused</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.location}
              onChange={(e) => handleSelectChange('location', e.target.value)}
              label="Location"
              disabled={loading}
            >
              <MenuItem value="RCL">RCL</MenuItem>
              <MenuItem value="RCL-EH">RCL-EH</MenuItem>
              <MenuItem value="My Home">My Home</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TextField
          fullWidth
          label="Computer or Device"
          name="computer"
          value={formData.computer}
          onChange={handleInputChange}
          required
          disabled={loading}
          helperText="What computer/device is having the issue?"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            disabled={loading}
          />
        </Stack>

        <FormControl fullWidth>
          <InputLabel>Preferred Contact Method</InputLabel>
          <Select
            value={formData.contactMethod}
            onChange={(e) => handleSelectChange('contactMethod', e.target.value)}
            label="Preferred Contact Method"
            disabled={loading}
          >
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="phone">Phone</MenuItem>
            <MenuItem value="text">Text</MenuItem>
          </Select>
        </FormControl>

        {/* SMS Notifications - Only show if user has globally enabled SMS */}
        {!loadingSMSPrefs && userSMSEnabled && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'background.paper', 
            borderRadius: 1, 
            border: '1px solid', 
            borderColor: 'divider' 
          }}>
            <Typography variant="subtitle2" gutterBottom color="text.primary">
              SMS Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Get real-time updates about your ticket via text message
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.smsUpdates}
                  onChange={handleCheckboxChange}
                  name="smsUpdates"
                  disabled={loading}
                />
              }
              label="Send me updates via SMS for this ticket"
            />

            {formData.smsUpdates && (
              <>
                <TextField
                  fullWidth
                  label="Cell Phone Number for SMS"
                  name="smsPhoneNumber"
                  value={formData.smsPhoneNumber}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="(555) 123-4567"
                  helperText="This number will be used for SMS notifications only"
                  sx={{ mt: 2 }}
                  inputProps={{
                    pattern: "[0-9()\\-\\s\\+]*",
                    title: "Please enter a valid phone number"
                  }}
                />
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    By checking this box, you consent to receive SMS updates for this specific ticket. 
                    Message and data rates may apply. Reply STOP to any message to unsubscribe.
                  </Typography>
                </Alert>
                
                {/* Show consent status for existing tickets */}
                {ticket?.smsConsent && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: getConsentStatusColor(ticket.smsConsent), borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {getConsentStatusIcon(ticket.smsConsent)}
                      SMS Status: {getConsentStatusText(ticket.smsConsent)}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* SMS Not Enabled Message */}
        {!loadingSMSPrefs && !userSMSEnabled && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>SMS notifications are not enabled.</strong> To receive text message updates, 
              click on your avatar in the top-right corner and select "User Preferences" to enable SMS notifications.
            </Typography>
          </Alert>
        )}

        {/* CC Recipients */}
        <CcParticipantManager
          participants={ccParticipants}
          onChange={setCcParticipants}
          disabled={loading}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isOnVpn}
              onChange={handleCheckboxChange}
              name="isOnVpn"
              disabled={loading}
            />
          }
          label="Connected to VPN?"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isPersonHavingProblem}
              onChange={handleCheckboxChange}
              name="isPersonHavingProblem"
              disabled={loading}
            />
          }
          label="Are you the person having the problem?"
        />

        {!formData.isPersonHavingProblem && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="User's Name"
              name="userName"
              value={formData.userName}
              onChange={handleInputChange}
              disabled={loading}
            />
            <TextField
              fullWidth
              label="User's Email"
              name="userEmail"
              value={formData.userEmail}
              onChange={handleInputChange}
              disabled={loading}
            />
            <TextField
              fullWidth
              label="User's Phone"
              name="userPhone"
              value={formData.userPhone}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Stack>
        )}

        <TextField
          fullWidth
          multiline
          rows={2}
          label="Error Message (if any)"
          name="errorMessage"
          value={formData.errorMessage}
          onChange={handleInputChange}
          disabled={loading}
        />

        {formData.priority === 'High' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Manager Approving After-Hours Costs"
            name="impact"
            value={formData.impact}
            onChange={handleInputChange}
            required
            disabled={loading}
            error={formData.priority === 'High' && !formData.impact}
            helperText="Please provide the name of the manager approving after-hours support costs (required for High priority)"
          />
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Steps to Reproduce"
          name="stepsToReproduce"
          value={formData.stepsToReproduce}
          onChange={handleInputChange}
          disabled={loading}
          helperText="How can we reproduce this issue?"
        />

        {/* File Attachments */}
        <FileSelector
          files={formData.files}
          onFilesChange={handleFilesChange}
          maxFiles={5}
          maxSizeBytes={10 * 1024 * 1024} // 10MB
          disabled={loading}
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Saving...' : (ticket ? 'Update Ticket' : 'Create Ticket')}
          </Button>
        </Box>
      </Stack>

      {/* High Priority Dialog */}
      <Dialog
        open={showHighPriorityDialog}
        onClose={() => {
          setShowHighPriorityDialog(false);
          setTempManagerName('');
          setFormData(prev => ({ ...prev, priority: 'Medium' }));
        }}
        aria-labelledby="high-priority-dialog-title"
      >
        <DialogTitle id="high-priority-dialog-title">High Priority Notice</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Submitting a High priority ticket may result in after-hours support costs if a response is required outside of normal business hours. 
            Please provide the name of the manager who is approving these potential expenses.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Manager Name (Approving After-Hours Costs)"
            fullWidth
            variant="outlined"
            value={tempManagerName}
            onChange={(e) => setTempManagerName(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowHighPriorityDialog(false);
              setTempManagerName('');
              setFormData(prev => ({ ...prev, priority: 'Medium' }));
            }} 
            color="secondary"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (tempManagerName.trim()) {
                setFormData(prev => ({ 
                  ...prev, 
                  priority: 'High',
                  impact: tempManagerName.trim()
                }));
                setShowHighPriorityDialog(false);
                setTempManagerName('');
              } else {
                alert('Please enter the manager name');
              }
            }} 
            color="primary"
            variant="contained"
          >
            Confirm High Priority
          </Button>
        </DialogActions>
      </Dialog>

      {/* Urgent Priority Dialog */}
      <Dialog
        open={showUrgentPriorityDialog}
        onClose={() => {
          setShowUrgentPriorityDialog(false);
          setTempManagerName('');
          setFormData(prev => ({ ...prev, priority: 'Medium' }));
        }}
        aria-labelledby="urgent-priority-dialog-title"
      >
        <DialogTitle id="urgent-priority-dialog-title">Urgent Priority Notice</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Submitting an Urgent priority ticket may result in significant after-hours support costs if a response is required outside of normal business hours. 
            If this is truly urgent, call me at 512 222 8925.
          </DialogContentText>
          <DialogContentText sx={{ mt: 2 }}>
            If you still need to submit an Urgent ticket, please provide the name of the manager who is approving these expenses:
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Manager Name (Approving After-Hours Costs)"
            fullWidth
            variant="outlined"
            value={tempManagerName}
            onChange={(e) => setTempManagerName(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setFormData(prev => ({ ...prev, priority: 'High' }));
              setShowUrgentPriorityDialog(false);
              setShowHighPriorityDialog(true);
            }} 
            color="secondary"
          >
            Select High Priority Instead
          </Button>
          <Button 
            onClick={() => {
              setFormData(prev => ({ ...prev, priority: 'Medium' }));
              setShowUrgentPriorityDialog(false);
              setTempManagerName('');
            }} 
            color="secondary"
          >
            Select Medium Priority
          </Button>
          <Button 
            onClick={() => {
              if (tempManagerName.trim()) {
                setFormData(prev => ({ 
                  ...prev, 
                  priority: 'Urgent',
                  impact: tempManagerName.trim()
                }));
                setShowUrgentPriorityDialog(false);
                setTempManagerName('');
              } else {
                alert('Please enter the manager name');
              }
            }} 
            color="primary"
            variant="contained"
          >
            Confirm Urgent Priority
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
};

export default TicketForm;