/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  Button,
  CircularProgress,
  Snackbar
} from '@mui/material';
import { useAuth } from '../../lib/auth/AuthContext';
import { hasRole } from '../../lib/utils/roleUtils';
import { pushNotificationService } from '../../lib/notifications/pushNotificationService';
import { 
  NotificationPreferences, 
  DEFAULT_NOTIFICATION_PREFERENCES, 
  DEFAULT_TECH_NOTIFICATION_PREFERENCES,
  NotificationSubscription
} from '../../lib/types/notifications';
import { updateUserNotificationPreferences, getUserNotificationPreferences } from '../../lib/firebase/userPreferencesService';

export function NotificationSettings() {
  const { userData } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [subscription, setSubscription] = useState<NotificationSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isTech = hasRole(userData?.role, 'tech');

  useEffect(() => {
    loadPreferences();
    checkPushSubscription();
  }, [userData]);

  const loadPreferences = async () => {
    if (!userData) return;

    try {
      const userPrefs = await getUserNotificationPreferences(userData.uid);
      if (userPrefs) {
        setPreferences(userPrefs);
      } else {
        // Set default preferences based on user role
        const defaultPrefs = isTech ? DEFAULT_TECH_NOTIFICATION_PREFERENCES : DEFAULT_NOTIFICATION_PREFERENCES;
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setMessage({ text: 'Failed to load notification preferences', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const checkPushSubscription = async () => {
    try {
      const status = await pushNotificationService.getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error('Failed to check push subscription:', error);
    }
  };

  const handlePreferenceChange = (path: string, value: boolean) => {
    setPreferences(prev => {
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

  const handlePushToggle = async (enabled: boolean) => {
    if (!userData) return;

    setSaving(true);
    try {
      if (enabled) {
        const success = await pushNotificationService.subscribeUser(userData.uid);
        if (success) {
          handlePreferenceChange('pushEnabled', true);
          setMessage({ text: 'Push notifications enabled successfully', type: 'success' });
        } else {
          setMessage({ text: 'Failed to enable push notifications. Please check your browser settings.', type: 'error' });
        }
      } else {
        await pushNotificationService.unsubscribeUser(userData.uid);
        handlePreferenceChange('pushEnabled', false);
        setMessage({ text: 'Push notifications disabled', type: 'success' });
      }
      
      await checkPushSubscription();
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      setMessage({ text: 'Failed to update push notification settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    if (!userData) return;

    setSaving(true);
    try {
      await updateUserNotificationPreferences(userData.uid, preferences);
      setMessage({ text: 'Notification preferences saved successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ text: 'Failed to save preferences', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.emailEnabled}
                onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)}
              />
            }
            label="Enable email notifications"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Receive notifications via email for ticket updates and system alerts.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Push Notifications
          </Typography>
          
          {subscription?.permission === 'denied' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Push notifications are blocked in your browser. Please enable them in your browser settings to receive push notifications.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={preferences.pushEnabled && subscription?.enabled}
                onChange={(e) => handlePushToggle(e.target.checked)}
                disabled={saving || subscription?.permission === 'denied'}
              />
            }
            label="Enable push notifications"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Receive instant notifications in your browser for important updates.
          </Typography>

          {preferences.pushEnabled && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Notification Preferences
              </Typography>

              {isTech ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Technical Staff Settings
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.newTicketCreated.email ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.newTicketCreated.email', e.target.checked)}
                        />
                      }
                      label="Email for new tickets created"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.newTicketCreated.push ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.newTicketCreated.push', e.target.checked)}
                        />
                      }
                      label="Push notifications for new tickets created"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketAssigned.email ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketAssigned.email', e.target.checked)}
                        />
                      }
                      label="Email when tickets are assigned to you"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketAssigned.push ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketAssigned.push', e.target.checked)}
                        />
                      }
                      label="Push notifications when tickets are assigned to you"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketUpdated.email ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketUpdated.email', e.target.checked)}
                        />
                      }
                      label="Email for ticket updates"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketUpdated.push ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketUpdated.push', e.target.checked)}
                        />
                      }
                      label="Push notifications for ticket updates"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketReply.email ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketReply.email', e.target.checked)}
                        />
                      }
                      label="Email for new ticket replies"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.techSettings?.ticketReply.push ?? false}
                          onChange={(e) => handlePreferenceChange('techSettings.ticketReply.push', e.target.checked)}
                        />
                      }
                      label="Push notifications for new ticket replies"
                    />
                  </FormGroup>
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    User Settings
                  </Typography>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.userSettings?.ticketUpdates.email ?? false}
                          onChange={(e) => handlePreferenceChange('userSettings.ticketUpdates.email', e.target.checked)}
                        />
                      }
                      label="Email for your ticket updates"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.userSettings?.ticketUpdates.push ?? false}
                          onChange={(e) => handlePreferenceChange('userSettings.ticketUpdates.push', e.target.checked)}
                        />
                      }
                      label="Push notifications for your ticket updates"
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.userSettings?.systemAlerts.email ?? false}
                          onChange={(e) => handlePreferenceChange('userSettings.systemAlerts.email', e.target.checked)}
                        />
                      }
                      label="Email for system alerts"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.userSettings?.systemAlerts.push ?? false}
                          onChange={(e) => handlePreferenceChange('userSettings.systemAlerts.push', e.target.checked)}
                        />
                      }
                      label="Push notifications for system alerts"
                    />
                  </FormGroup>
                </Box>
              )}
            </>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={savePreferences}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : undefined}
            >
              Save Preferences
            </Button>
          </Box>
        </CardContent>
      </Card>

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
    </Box>
  );
}