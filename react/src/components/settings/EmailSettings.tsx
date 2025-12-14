/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebaseConfig';
import { Email as EmailIcon, CheckCircle as CheckIcon, OpenInNew as OpenInNewIcon, Send as SendIcon } from '@mui/icons-material';
import { useAuth } from '../../lib/auth/AuthContext';

interface EmailConfig {
  provider: 'sendgrid' | 'ses';
  updatedAt: number;
  updatedBy: string;
}

const EmailSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'sendgrid' | 'ses'>('sendgrid');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const configRef = doc(db, 'config', 'email');
      const configDoc = await getDoc(configRef);

      if (configDoc.exists()) {
        const data = configDoc.data() as EmailConfig;
        setEmailConfig(data);
        setSelectedProvider(data.provider || 'sendgrid');
      } else {
        // Default to sendgrid if no config exists - this is normal for first-time setup
        setSelectedProvider('sendgrid');
        setEmailConfig(null);
      }
    } catch (error) {
      console.error('Error loading email config:', error);
      // Only show error for actual failures, not for missing config
      if ((error as any)?.code !== 'not-found') {
        setErrorMessage('Failed to load email configuration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const configRef = doc(db, 'config', 'email');
      const newConfig: EmailConfig = {
        provider: selectedProvider,
        updatedAt: Date.now(),
        updatedBy: 'admin' // TODO: Get actual user ID
      };

      await setDoc(configRef, newConfig);

      setEmailConfig(newConfig);
      setSuccessMessage(`Email provider successfully changed to ${selectedProvider.toUpperCase()}`);
    } catch (error) {
      console.error('Error saving email config:', error);
      setErrorMessage('Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) {
      setErrorMessage('No email address found for current user');
      return;
    }

    try {
      setSendingTest(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const providerToTest = emailConfig?.provider || selectedProvider;
      const providerName = providerToTest === 'ses' ? 'Amazon SES' : 'SendGrid';
      const timestamp = new Date().toLocaleString();

      const testEmailDoc = {
        to: [user.email],
        message: {
          subject: `Help Desk Test Email - ${providerName}`,
          text: `This is a test email from your Help Desk application.

Provider: ${providerName}
Sent to: ${user.email}
Sent at: ${timestamp}

If you received this email, your email configuration is working correctly!

Best regards,
Help Desk System`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Test Email Successful</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 16px; color: #333;">This is a test email from your Help Desk application.</p>

                <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666; width: 120px;"><strong>Provider:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">${providerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #666;"><strong>Sent to:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; color: #333;">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; color: #666;"><strong>Sent at:</strong></td>
                    <td style="padding: 10px; color: #333;">${timestamp}</td>
                  </tr>
                </table>

                <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                  <p style="margin: 0; color: #2e7d32;"><strong>Success!</strong> If you received this email, your email configuration is working correctly.</p>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Best regards,<br>
                  Help Desk System
                </p>
              </div>
            </div>
          `,
          from: 'Help Desk <helpdesk@mail.anglinai.com>'
        },
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'mail'), testEmailDoc);

      setSuccessMessage(`Test email sent to ${user.email} using ${providerName}. Check your inbox!`);
    } catch (error) {
      console.error('Error sending test email:', error);
      setErrorMessage('Failed to send test email. Please check your configuration.');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const hasChanges = emailConfig?.provider !== selectedProvider;

  return (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <EmailIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            Email Provider
          </Typography>
          {emailConfig && (
            <Chip
              label={`Current: ${emailConfig.provider.toUpperCase()}`}
              color="primary"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as 'sendgrid' | 'ses')}
          >
            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
              <FormControlLabel
                value="sendgrid"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      SendGrid
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Industry-leading email delivery platform with excellent deliverability
                    </Typography>
                    <List dense sx={{ mt: 1 }}>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="99.9% uptime SLA"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="Advanced analytics and reporting"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="Easy inbound email parsing"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    </List>
                  </Box>
                }
              />
            </Paper>

            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
              <FormControlLabel
                value="ses"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Amazon SES
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cost-effective, scalable email service from AWS
                    </Typography>
                    <List dense sx={{ mt: 1 }}>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="Very low cost ($0.10 per 1,000 emails)"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="Highly scalable with AWS infrastructure"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                      <ListItem>
                        <CheckIcon sx={{ mr: 1, fontSize: 16, color: 'success.main' }} />
                        <ListItemText
                          primary="Integrates with other AWS services"
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    </List>
                  </Box>
                }
              />
            </Paper>
          </RadioGroup>
        </FormControl>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {hasChanges ? 'You have unsaved changes' : 'No changes to save'}
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={handleSendTestEmail}
              disabled={sendingTest || hasChanges}
              startIcon={sendingTest ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>

        {user?.email && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Test email will be sent to: {user.email}
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuration Requirements
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure Firebase secrets using the terminal commands below. Run these in your functions directory.
        </Typography>

        {selectedProvider === 'sendgrid' && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                SendGrid Configuration:
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open('/docs/sendgrid-setup.html', '_blank')}
              >
                View Setup Guide
              </Button>
            </Box>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="SENDGRID_API_KEY"
                  secondary="Your SendGrid API key from Settings > API Keys in the SendGrid dashboard"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="SENDGRID_WEBHOOK_VERIFICATION_KEY"
                  secondary="Webhook verification key for secure inbound email processing (optional)"
                />
              </ListItem>
            </List>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Terminal commands:
              </Typography>
              firebase functions:secrets:set SENDGRID_API_KEY<br />
              firebase functions:secrets:set SENDGRID_WEBHOOK_VERIFICATION_KEY
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              Need help? Click "View Setup Guide" above for step-by-step instructions including domain verification and inbound email setup.
            </Alert>
          </Box>
        )}

        {selectedProvider === 'ses' && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">
                Amazon SES Configuration:
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open('/docs/amazon-ses-setup.html', '_blank')}
              >
                View Setup Guide
              </Button>
            </Box>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="AWS_ACCESS_KEY_ID"
                  secondary="Create an IAM user with AmazonSESFullAccess policy, then generate access keys"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="AWS_SECRET_ACCESS_KEY"
                  secondary="The secret key generated with your access key (only shown once)"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="AWS_SES_REGION"
                  secondary="AWS region where SES is configured (e.g., us-east-1, us-west-2, eu-west-1)"
                />
              </ListItem>
            </List>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Terminal commands:
              </Typography>
              firebase functions:secrets:set AWS_ACCESS_KEY_ID<br />
              firebase functions:secrets:set AWS_SECRET_ACCESS_KEY<br />
              firebase functions:secrets:set AWS_SES_REGION
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              Need help? Click "View Setup Guide" above for step-by-step instructions including domain verification, IAM setup, and inbound email via SNS.
            </Alert>
            <Alert severity="warning" sx={{ mt: 1 }}>
              New AWS accounts start in sandbox mode. You must request production access to send to unverified addresses.
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default EmailSettings;
