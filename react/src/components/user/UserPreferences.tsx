/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  Button,
  CircularProgress,
  Snackbar,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../lib/auth/AuthContext';
import { 
  NotificationPreferences, 
  DEFAULT_NOTIFICATION_PREFERENCES, 
  DEFAULT_TECH_NOTIFICATION_PREFERENCES
} from '../../lib/types/notifications';
import { updateUserNotificationPreferences, getUserNotificationPreferences } from '../../lib/firebase/userPreferencesService';
import { updateUserSMSPreferences, getUserSMSPreferences } from '../../lib/firebase/smsService';

interface UserSMSPreferences {
  globalSMSEnabled: boolean;
  phoneNumber: string;
  consentDate?: number;
  optInConfirmed: boolean;
}

interface UserPreferencesProps {
  open: boolean;
  onClose: () => void;
}

export function UserPreferences({ open, onClose }: UserPreferencesProps) {
  const { userData } = useAuth();
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [smsPreferences, setSmsPreferences] = useState<UserSMSPreferences>({
    globalSMSEnabled: false,
    phoneNumber: '',
    optInConfirmed: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expanded, setExpanded] = useState<string | false>('notifications');

  const isTech = userData?.role === 'tech' || userData?.role === 'company_admin' || userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin';
  const isAdminOrTech = userData?.role === 'tech' || userData?.role === 'company_admin' || userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin';

  useEffect(() => {
    if (open && userData) {
      loadPreferences();
    }
  }, [open, userData]);

  const loadPreferences = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      // Load notification preferences
      const userNotificationPrefs = await getUserNotificationPreferences(userData.uid);
      if (userNotificationPrefs) {
        setNotificationPreferences(userNotificationPrefs);
      } else {
        const defaultPrefs = isTech ? DEFAULT_TECH_NOTIFICATION_PREFERENCES : DEFAULT_NOTIFICATION_PREFERENCES;
        setNotificationPreferences(defaultPrefs);
      }

      // Load SMS preferences
      try {
        const userSMSPrefs = await getUserSMSPreferences(userData.uid);
        if (userSMSPrefs) {
          setSmsPreferences(userSMSPrefs);
        }
      } catch (error) {
        console.error('Failed to load SMS preferences:', error);
        // SMS preferences are optional, continue loading
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      setMessage({ text: 'Failed to load preferences', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPreferenceChange = (path: string, value: boolean) => {
    setNotificationPreferences(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current: any = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
  };

  const handleSMSPreferenceChange = (field: keyof UserSMSPreferences, value: boolean | string) => {
    setSmsPreferences(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Basic US phone number validation
    const phoneRegex = /^(\+1\s?)?(\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/;
    return phoneRegex.test(phoneNumber.trim());
  };

  const handleAdminSMSPreferenceChange = (field: string, value: boolean | string) => {
    setNotificationPreferences(prev => ({
      ...prev,
      adminSMSSettings: {
        ...prev.adminSMSSettings,
        enabled: prev.adminSMSSettings?.enabled || false,
        phoneNumber: prev.adminSMSSettings?.phoneNumber || '',
        optInConfirmed: prev.adminSMSSettings?.optInConfirmed || false,
        notifications: {
          newTickets: prev.adminSMSSettings?.notifications?.newTickets || false,
          statusChanges: prev.adminSMSSettings?.notifications?.statusChanges || false,
          ticketsClosed: prev.adminSMSSettings?.notifications?.ticketsClosed || false,
          highPriorityOnly: prev.adminSMSSettings?.notifications?.highPriorityOnly || false,
          ...prev.adminSMSSettings?.notifications
        },
        [field]: value
      }
    }));
  };

  const handleAdminSMSNotificationChange = (notificationType: string, value: boolean) => {
    setNotificationPreferences(prev => ({
      ...prev,
      adminSMSSettings: {
        ...prev.adminSMSSettings,
        enabled: prev.adminSMSSettings?.enabled || false,
        phoneNumber: prev.adminSMSSettings?.phoneNumber || '',
        optInConfirmed: prev.adminSMSSettings?.optInConfirmed || false,
        notifications: {
          newTickets: prev.adminSMSSettings?.notifications?.newTickets || false,
          statusChanges: prev.adminSMSSettings?.notifications?.statusChanges || false,
          ticketsClosed: prev.adminSMSSettings?.notifications?.ticketsClosed || false,
          highPriorityOnly: prev.adminSMSSettings?.notifications?.highPriorityOnly || false,
          ...prev.adminSMSSettings?.notifications,
          [notificationType]: value
        }
      }
    }));
  };

  const savePreferences = async () => {
    if (!userData) return;

    // Validate SMS phone number if SMS is enabled
    if (smsPreferences.globalSMSEnabled && !validatePhoneNumber(smsPreferences.phoneNumber)) {
      setMessage({ text: 'Please enter a valid US phone number for SMS notifications', type: 'error' });
      return;
    }

    // Validate admin SMS phone number if enabled
    if (notificationPreferences.adminSMSSettings?.enabled && 
        !validatePhoneNumber(notificationPreferences.adminSMSSettings.phoneNumber)) {
      setMessage({ text: 'Please enter a valid US phone number for admin SMS notifications', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Save notification preferences
      await updateUserNotificationPreferences(userData.uid, notificationPreferences);
      
      // Save SMS preferences if SMS is enabled
      if (smsPreferences.globalSMSEnabled) {
        await updateUserSMSPreferences(userData.uid, smsPreferences);
      }

      setMessage({ text: 'Preferences saved successfully', type: 'success' });
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ text: 'Failed to save preferences', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setMessage(null);
    onClose();
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Typography variant="h6">
            User Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your notification and communication preferences
          </Typography>
        </DialogTitle>
        
        <DialogContent dividers>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {/* SMS Preferences - Most Important First */}
              <Accordion 
                expanded={expanded === 'sms'} 
                onChange={handleAccordionChange('sms')}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">SMS Notifications</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Two-Step SMS Opt-in:</strong> You must first enable SMS notifications here, 
                        then opt-in for individual tickets when creating them. This ensures compliance with SMS regulations.
                      </Typography>
                    </Alert>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={smsPreferences.globalSMSEnabled}
                          onChange={(e) => handleSMSPreferenceChange('globalSMSEnabled', e.target.checked)}
                        />
                      }
                      label="Enable SMS Notifications"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Allow SMS text message notifications for ticket updates. Message and data rates may apply.
                    </Typography>

                    {smsPreferences.globalSMSEnabled && (
                      <Box sx={{ ml: 4, mt: 2 }}>
                        <TextField
                          fullWidth
                          label="Mobile Phone Number"
                          value={smsPreferences.phoneNumber}
                          onChange={(e) => handleSMSPreferenceChange('phoneNumber', e.target.value)}
                          placeholder="(555) 123-4567"
                          helperText="US phone number for SMS notifications. Required for SMS opt-in."
                          sx={{ mb: 2 }}
                        />
                        
                        {smsPreferences.optInConfirmed && (
                          <Alert severity="success" sx={{ mb: 2 }}>
                            ✅ SMS notifications are active. You can now opt-in to receive SMS updates when creating tickets.
                          </Alert>
                        )}
                        
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>SMS Compliance Notice:</strong><br/>
                            • Message and data rates may apply<br/>
                            • You can reply STOP to any message to unsubscribe<br/>
                            • Reply START to resubscribe<br/>
                            • Reply HELP for assistance<br/>
                            • We will only send ticket-related notifications
                          </Typography>
                        </Alert>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Email & Push Notifications */}
              <Accordion 
                expanded={expanded === 'notifications'} 
                onChange={handleAccordionChange('notifications')}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Email & Push Notifications</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences.emailEnabled}
                          onChange={(e) => handleNotificationPreferenceChange('emailEnabled', e.target.checked)}
                        />
                      }
                      label="Enable email notifications"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Receive notifications via email for ticket updates and system alerts.
                    </Typography>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences.pushEnabled}
                          onChange={(e) => handleNotificationPreferenceChange('pushEnabled', e.target.checked)}
                        />
                      }
                      label="Enable push notifications"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Receive instant notifications in your browser for important updates.
                    </Typography>

                    {(notificationPreferences.emailEnabled || notificationPreferences.pushEnabled) && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        
                        {isTech ? (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Technical Staff Notification Settings
                            </Typography>
                            <FormGroup>
                              {notificationPreferences.emailEnabled && (
                                <>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.techSettings?.newTicketCreated.email ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('techSettings.newTicketCreated.email', e.target.checked)}
                                      />
                                    }
                                    label="Email for new tickets created"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.techSettings?.ticketAssigned.email ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('techSettings.ticketAssigned.email', e.target.checked)}
                                      />
                                    }
                                    label="Email when tickets are assigned to me"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.techSettings?.ticketUpdated.email ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('techSettings.ticketUpdated.email', e.target.checked)}
                                      />
                                    }
                                    label="Email for ticket updates"
                                  />
                                </>
                              )}
                              {notificationPreferences.pushEnabled && (
                                <>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.techSettings?.newTicketCreated.push ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('techSettings.newTicketCreated.push', e.target.checked)}
                                      />
                                    }
                                    label="Push notifications for new tickets"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.techSettings?.ticketAssigned.push ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('techSettings.ticketAssigned.push', e.target.checked)}
                                      />
                                    }
                                    label="Push notifications for ticket assignments"
                                  />
                                </>
                              )}
                            </FormGroup>
                          </Box>
                        ) : (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              User Notification Settings
                            </Typography>
                            <FormGroup>
                              {notificationPreferences.emailEnabled && (
                                <>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.userSettings?.ticketUpdates.email ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('userSettings.ticketUpdates.email', e.target.checked)}
                                      />
                                    }
                                    label="Email for your ticket updates"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.userSettings?.systemAlerts.email ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('userSettings.systemAlerts.email', e.target.checked)}
                                      />
                                    }
                                    label="Email for system alerts"
                                  />
                                </>
                              )}
                              {notificationPreferences.pushEnabled && (
                                <>
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.userSettings?.ticketUpdates.push ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('userSettings.ticketUpdates.push', e.target.checked)}
                                      />
                                    }
                                    label="Push notifications for your ticket updates"
                                  />
                                  <FormControlLabel
                                    control={
                                      <Switch
                                        checked={notificationPreferences.userSettings?.systemAlerts.push ?? false}
                                        onChange={(e) => handleNotificationPreferenceChange('userSettings.systemAlerts.push', e.target.checked)}
                                      />
                                    }
                                    label="Push notifications for system alerts"
                                  />
                                </>
                              )}
                            </FormGroup>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Admin SMS Notifications - Only for admin/tech users */}
              {isAdminOrTech && (
                <Accordion 
                  expanded={expanded === 'adminSMS'} 
                  onChange={handleAccordionChange('adminSMS')}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Admin SMS Notifications</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>System-wide SMS notifications:</strong> Receive SMS alerts for all tickets in the system. 
                          This is separate from customer SMS notifications and requires its own opt-in consent.
                        </Typography>
                      </Alert>
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={notificationPreferences.adminSMSSettings?.enabled || false}
                            onChange={(e) => handleAdminSMSPreferenceChange('enabled', e.target.checked)}
                          />
                        }
                        label="Enable Admin SMS Notifications"
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Receive SMS notifications for system-wide ticket events. Message and data rates may apply.
                      </Typography>

                      {notificationPreferences.adminSMSSettings?.enabled && (
                        <Box sx={{ ml: 4, mt: 2 }}>
                          <TextField
                            fullWidth
                            label="Admin Mobile Phone Number"
                            value={notificationPreferences.adminSMSSettings?.phoneNumber || ''}
                            onChange={(e) => handleAdminSMSPreferenceChange('phoneNumber', e.target.value)}
                            placeholder="(555) 123-4567"
                            helperText="US phone number for admin SMS notifications"
                            sx={{ mb: 2 }}
                          />
                          
                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Notification Types
                          </Typography>
                          
                          <FormGroup sx={{ ml: 2 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={notificationPreferences.adminSMSSettings?.notifications?.newTickets || false}
                                  onChange={(e) => handleAdminSMSNotificationChange('newTickets', e.target.checked)}
                                />
                              }
                              label="New tickets created"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={notificationPreferences.adminSMSSettings?.notifications?.statusChanges || false}
                                  onChange={(e) => handleAdminSMSNotificationChange('statusChanges', e.target.checked)}
                                />
                              }
                              label="Ticket status changes"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={notificationPreferences.adminSMSSettings?.notifications?.ticketsClosed || false}
                                  onChange={(e) => handleAdminSMSNotificationChange('ticketsClosed', e.target.checked)}
                                />
                              }
                              label="Tickets closed/resolved"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={notificationPreferences.adminSMSSettings?.notifications?.highPriorityOnly || false}
                                  onChange={(e) => handleAdminSMSNotificationChange('highPriorityOnly', e.target.checked)}
                                />
                              }
                              label="High/Urgent priority tickets only"
                            />
                          </FormGroup>
                          
                          {notificationPreferences.adminSMSSettings?.optInConfirmed ? (
                            <Alert severity="success" sx={{ mt: 2 }}>
                              ✅ Admin SMS notifications are active. You will receive SMS alerts for selected events.
                            </Alert>
                          ) : (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              <Typography variant="body2">
                                <strong>Opt-in Required:</strong> After saving these settings, you will receive an SMS 
                                confirmation message. Reply START to activate admin notifications.
                              </Typography>
                            </Alert>
                          )}
                          
                          <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>SMS Compliance:</strong><br/>
                              • Message and data rates may apply<br/>
                              • Reply STOP to any message to unsubscribe<br/>
                              • Reply START to resubscribe<br/>
                              • Reply HELP for assistance<br/>
                              • Admin notifications are separate from customer notifications
                            </Typography>
                          </Alert>
                        </Box>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={savePreferences}
            disabled={saving || loading}
            startIcon={saving ? <CircularProgress size={20} /> : undefined}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
      >
        <Alert 
          onClose={() => setMessage(null)} 
          severity={message?.type} 
          sx={{ width: '100%' }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </>
  );
}