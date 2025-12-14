/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';
import { createOrganization } from '../../lib/firebase/organizationService';
import { CreateOrganizationRequest } from '../../lib/types/organization';
import { createUser } from '../../lib/firebase/userClientService';
import { UserFormData } from '../../lib/types/user';

const steps = [
  'Welcome',
  'Organization Details',
  'Complete Setup'
];

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
];

const OnboardingWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<CreateOrganizationRequest>({
    name: '',
    description: '',
    billingEmail: user?.email || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    locale: 'en',
    plan: 'free_trial'
  });

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange = (field: keyof CreateOrganizationRequest) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return true; // Welcome step
      case 1:
        return formData.name.trim().length >= 2 && formData.billingEmail.trim().length > 0;
      default:
        return true;
    }
  };

  const handleCreateOrganization = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create organization
      const organizationId = await createOrganization(formData, user.uid);
      console.log('Organization created:', organizationId);
      
      // Step 2: Create user document with organization reference
      const userData: UserFormData = {
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: 'organization_admin', // Organization creator is organization admin
        photoURL: user.photoURL || undefined,
        disabled: false,
        organizationId // Link user to organization
      };
      
      await createUser(userData);
      console.log('User document created');
      
      // Step 3: Refresh user data in auth context
      await refreshUserData();
      console.log('User data refreshed');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error during onboarding:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" gutterBottom>
              Welcome to Help Desk!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Let's get you set up with your own help desk system. 
              This will only take a minute.
            </Typography>
            <Box sx={{ mb: 4 }}>
              <img
                src="/anglinai.png"
                alt="Help Desk"
                style={{ height: '80px', objectFit: 'contain' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              You'll get a 14-day free trial with full access to all features.
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" gutterBottom>
              Organization Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tell us about your organization
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Organization Name"
                fullWidth
                required
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="e.g., Acme Support Services"
                helperText="This will be the name of your help desk organization"
              />
              
              <TextField
                label="Description (Optional)"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange('description')}
                placeholder="Brief description of what your organization does"
              />
              
              <TextField
                label="Billing Email"
                fullWidth
                required
                type="email"
                value={formData.billingEmail}
                onChange={handleInputChange('billingEmail')}
                helperText="We'll send billing notifications to this email"
              />
              
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={formData.timezone}
                  onChange={handleInputChange('timezone')}
                  label="Timezone"
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz} value={tz}>
                      {tz}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" gutterBottom>
              Ready to Create Your Organization!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Here's what you'll get:
            </Typography>
            
            <Box sx={{ textAlign: 'left', mb: 4, mx: 'auto', maxWidth: 400 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✓ 14-day free trial with full access
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✓ Unlimited tickets and users
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✓ Multiple company support
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✓ Custom branding
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                ✓ Email notifications
              </Typography>
              <Typography variant="body2">
                ✓ File attachments and reporting
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Organization: <strong>{formData.name}</strong><br />
              Billing Email: <strong>{formData.billingEmail}</strong>
            </Typography>
          </Box>
        );

      default:
        return 'Unknown step';
    }
  };

  // If user already has userData, they don't need onboarding
  if (userData) {
    navigate('/');
    return null;
  }

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleCreateOrganization}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!validateStep(activeStep)}
              >
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default OnboardingWizard;