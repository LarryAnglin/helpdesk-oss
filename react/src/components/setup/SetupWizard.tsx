/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import {
  checkSetupStatus,
  saveFirebaseConfig,
  validateServices,
  generateSetupScript,
  completeSetup,
  updateSecretsStatus,
  SetupStatus,
  FirebaseConfigInput,
  SecretConfig,
  isDevMode,
  resetSetup
} from '../../lib/setup/setupService';

interface SetupWizardProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  'Welcome',
  'Firebase Configuration',
  'Service Validation',
  'Secrets Setup',
  'Complete Setup'
];

const SetupWizard: React.FC<SetupWizardProps> = ({ open, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Firebase config state
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigInput>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
    databaseURL: ''
  });
  
  // Secrets config state
  const [secrets, setSecrets] = useState<SecretConfig>({});
  const [includeOptionalServices, setIncludeOptionalServices] = useState(false);
  
  // Generated script
  const [setupScript, setSetupScript] = useState('');
  const [scriptCopied, setScriptCopied] = useState(false);

  useEffect(() => {
    if (open) {
      loadSetupStatus();
    }
  }, [open]);

  const loadSetupStatus = async () => {
    try {
      const status = await checkSetupStatus();
      setSetupStatus(status);
      
      // Skip to appropriate step based on current status
      if (status.hasFirebaseConfig && !status.hasRequiredServices) {
        setActiveStep(2);
      } else if (status.hasRequiredServices && !status.isComplete) {
        setActiveStep(3);
      }
    } catch (err) {
      console.error('Error loading setup status:', err);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFirebaseConfigSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
        throw new Error('API Key, Project ID, and Auth Domain are required');
      }
      
      await saveFirebaseConfig(firebaseConfig);
      handleNext();
    } catch (err: any) {
      setError(err.message || 'Failed to save Firebase configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateServices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const validation = await validateServices();
      
      if (!validation.valid) {
        setError('Some required services are not properly configured: ' + validation.errors.join(', '));
        return;
      }
      
      // Update setup status
      await updateSecretsStatus({
        emailExtension: false,
        vapidKey: false
      });
      
      handleNext();
    } catch (err: any) {
      setError(err.message || 'Failed to validate services');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = () => {
    try {
      const script = generateSetupScript(secrets);
      setSetupScript(script);
      handleNext();
    } catch (err: any) {
      setError(err.message || 'Failed to generate setup script');
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(setupScript);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy script:', err);
    }
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, mark setup as complete
      // In a real scenario, this would be called after the user confirms
      // they've run the setup script successfully
      await completeSetup('setup@example.com');
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSetup = async () => {
    if (!isDevMode()) return;
    
    try {
      await resetSetup();
      setActiveStep(0);
      await loadSetupStatus();
    } catch (err) {
      console.error('Failed to reset setup:', err);
    }
  };

  const parseFirebaseConfigFromJSON = (jsonText: string) => {
    try {
      let config;
      let cleanedText = jsonText.trim();
      
      // Check if this is the full Firebase console code snippet
      if (cleanedText.includes('const firebaseConfig = {')) {
        // Extract just the config object from the full code snippet
        const configStart = cleanedText.indexOf('const firebaseConfig = {') + 'const firebaseConfig = '.length;
        const configEnd = cleanedText.indexOf('};', configStart) + 1;
        cleanedText = cleanedText.substring(configStart, configEnd);
      }
      
      // First, try to parse as standard JSON
      try {
        config = JSON.parse(cleanedText);
      } catch (jsonError) {
        // If JSON parsing fails, try to handle JavaScript object notation
        // by wrapping property names in quotes
        const jsObjectRegex = /(\w+):\s*("[^"]*"|'[^']*'|[^,}\s]+)/g;
        
        // Only attempt conversion if it looks like a JavaScript object
        if (cleanedText.startsWith('{') && cleanedText.endsWith('}')) {
          const fixedJson = cleanedText.replace(jsObjectRegex, '"$1": $2');
          config = JSON.parse(fixedJson);
        } else {
          throw jsonError;
        }
      }
      
      setFirebaseConfig({
        apiKey: config.apiKey || '',
        authDomain: config.authDomain || '',
        projectId: config.projectId || '',
        storageBucket: config.storageBucket || '',
        messagingSenderId: config.messagingSenderId || '',
        appId: config.appId || '',
        measurementId: config.measurementId || '',
        databaseURL: config.databaseURL || ''
      });
      
      // Clear any previous error
      setError(null);
    } catch (err) {
      setError('Invalid format. Please check your Firebase configuration. You can paste the full code from Firebase console or just the config object.');
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Welcome to Help Desk Setup
            </Typography>
            <Typography variant="body1" paragraph>
              This wizard will guide you through setting up your Help Desk application. 
              We'll configure Firebase services, set up email notifications, and get 
              your system ready for users.
            </Typography>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                What you'll need:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Firebase project configuration</li>
                <li>Mailgun account (for email notifications)</li>
                <li>VAPID keys (for push notifications)</li>
                <li>Terminal access to run setup commands</li>
              </ul>
            </Alert>

            {isDevMode() && (
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={handleResetSetup}
                  size="small"
                >
                  Reset Setup (Dev Only)
                </Button>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Firebase Configuration
            </Typography>
            <Typography variant="body1" paragraph>
              Enter your Firebase project configuration. You can find this in your 
              Firebase console under Project Settings → General → Your apps.
            </Typography>

            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Paste Firebase Config</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  placeholder={`Paste your Firebase config (supports all formats):

Full Firebase console code:
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

JavaScript object only:
{
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id"
}

JSON format:
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com"
}`}
                  onChange={(e) => parseFirebaseConfigFromJSON(e.target.value)}
                  helperText="Paste the complete Firebase console code or just the config object - all formats supported"
                />
              </AccordionDetails>
            </Accordion>

            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
              Or enter values manually:
            </Typography>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <TextField
                label="API Key"
                value={firebaseConfig.apiKey}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                required
                size="small"
              />
              <TextField
                label="Auth Domain"
                value={firebaseConfig.authDomain}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, authDomain: e.target.value }))}
                required
                size="small"
              />
              <TextField
                label="Project ID"
                value={firebaseConfig.projectId}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value }))}
                required
                size="small"
              />
              <TextField
                label="Storage Bucket"
                value={firebaseConfig.storageBucket}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, storageBucket: e.target.value }))}
                size="small"
              />
              <TextField
                label="Messaging Sender ID"
                value={firebaseConfig.messagingSenderId}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, messagingSenderId: e.target.value }))}
                size="small"
              />
              <TextField
                label="App ID"
                value={firebaseConfig.appId}
                onChange={(e) => setFirebaseConfig(prev => ({ ...prev, appId: e.target.value }))}
                required
                size="small"
              />
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Service Validation
            </Typography>
            <Typography variant="body1" paragraph>
              Let's verify that your Firebase services are properly configured.
            </Typography>

            {setupStatus && setupStatus.servicesStatus && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {Object.entries(setupStatus.servicesStatus).map(([service, status]) => (
                  <Card key={service}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {status ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {service}
                      </Typography>
                      <Chip 
                        label={status ? 'Ready' : 'Not Configured'} 
                        color={status ? 'success' : 'error'}
                        size="small"
                      />
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              Make sure your Firebase project has the following services enabled:
              Firestore, Authentication, Storage, and Functions.
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Configure Secrets
            </Typography>
            <Typography variant="body1" paragraph>
              Set up your API keys and sensitive configuration. These will be stored 
              securely in Firebase Functions configuration.
            </Typography>

            <Box sx={{ display: 'grid', gap: 3 }}>
              {/* Email Service */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Email Service (Firebase Extensions)
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Email is now handled by Firebase Extensions! The setup script will install 
                    the Trigger Email extension which supports multiple email providers 
                    (SendGrid, Mailgun, SMTP, etc.) configured through Firebase Console.
                    <br /><br />
                    <strong>Important:</strong> When configuring the extension, you'll need to select a location. 
                    If your Firestore shows <strong>nam5</strong>, select <strong>Multi-region (United States)</strong>. 
                    <a 
                      href="https://github.com/anglinai/HelpDesk/blob/main/docs/firebase-email-setup.md" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ marginLeft: '8px' }}
                    >
                      See location mapping guide →
                    </a>
                  </Alert>
                  <TextField
                    fullWidth
                    label="Default Email Sender (Optional)"
                    value={secrets.emailSender || ''}
                    onChange={(e) => setSecrets(prev => ({ ...prev, emailSender: e.target.value }))}
                    size="small"
                    placeholder="Help Desk <noreply@yourapp.com>"
                    helperText="Default sender address for outgoing emails (can be configured later)"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Push Notifications (Required)
                  </Typography>
                  <TextField
                    fullWidth
                    label="VAPID Public Key"
                    value={secrets.vapidKey || ''}
                    onChange={(e) => setSecrets(prev => ({ ...prev, vapidKey: e.target.value }))}
                    size="small"
                    helperText="Generate at: https://web-push-codelab.glitch.me/"
                  />
                </CardContent>
              </Card>

              {/* Optional Services */}
              <FormControlLabel
                control={
                  <Switch
                    checked={includeOptionalServices}
                    onChange={(e) => setIncludeOptionalServices(e.target.checked)}
                  />
                }
                label="Configure optional services"
              />

              {includeOptionalServices && (
                <>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Search (Optional)
                      </Typography>
                      <Box sx={{ display: 'grid', gap: 2 }}>
                        <TextField
                          label="Algolia App ID"
                          value={secrets.algolia?.appId || ''}
                          onChange={(e) => setSecrets(prev => ({
                            ...prev,
                            algolia: {
                              appId: e.target.value,
                              adminApiKey: prev.algolia?.adminApiKey || '',
                              searchApiKey: prev.algolia?.searchApiKey || ''
                            }
                          }))}
                          size="small"
                        />
                        <TextField
                          label="Algolia Admin API Key"
                          value={secrets.algolia?.adminApiKey || ''}
                          onChange={(e) => setSecrets(prev => ({
                            ...prev,
                            algolia: {
                              appId: prev.algolia?.appId || '',
                              adminApiKey: e.target.value,
                              searchApiKey: prev.algolia?.searchApiKey || ''
                            }
                          }))}
                          type="password"
                          size="small"
                        />
                        <TextField
                          label="Algolia Search API Key"
                          value={secrets.algolia?.searchApiKey || ''}
                          onChange={(e) => setSecrets(prev => ({
                            ...prev,
                            algolia: {
                              appId: prev.algolia?.appId || '',
                              adminApiKey: prev.algolia?.adminApiKey || '',
                              searchApiKey: e.target.value
                            }
                          }))}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        AI Assistant (Optional)
                      </Typography>
                      <TextField
                        fullWidth
                        label="Google Gemini API Key"
                        value={secrets.geminiApiKey || ''}
                        onChange={(e) => setSecrets(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                        type="password"
                        size="small"
                        helperText="For AI-powered self-help features"
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h5" gutterBottom>
              Setup Script
            </Typography>
            <Typography variant="body1" paragraph>
              Two scripts are provided below - choose the one for your operating system:
            </Typography>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Setup Script</Typography>
                  <Tooltip title={scriptCopied ? 'Copied!' : 'Copy to clipboard'}>
                    <IconButton onClick={handleCopyScript} color={scriptCopied ? 'success' : 'default'}>
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={15}
                  value={setupScript}
                  variant="outlined"
                  InputProps={{
                    readOnly: true,
                    sx: { 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      backgroundColor: '#f5f5f5',
                      color: '#000000'
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Instructions:
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                For Linux/Mac:
              </Typography>
              <ol style={{ margin: 0, paddingLeft: 20, marginBottom: 12 }}>
                <li>Save the first script to a file (e.g., setup.sh)</li>
                <li>Make it executable: <code>chmod +x setup.sh</code></li>
                <li>Run it in your project directory: <code>./setup.sh</code></li>
              </ol>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                For Windows:
              </Typography>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>Save the second script to a file (e.g., setup.bat)</li>
                <li>Open Command Prompt in your project directory</li>
                <li>Run it: <code>setup.bat</code></li>
              </ol>
            </Alert>

            <Alert severity="info">
              After running the script, your Help Desk will be fully configured and ready to use!
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5">Help Desk Setup</Typography>
          {loading && <LinearProgress sx={{ width: 100 }} />}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Back
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button 
            onClick={handleCompleteSetup} 
            variant="contained"
            disabled={loading}
          >
            Complete Setup
          </Button>
        ) : activeStep === 1 ? (
          <Button 
            onClick={handleFirebaseConfigSubmit} 
            variant="contained"
            disabled={loading || !firebaseConfig.apiKey || !firebaseConfig.projectId}
          >
            Save & Continue
          </Button>
        ) : activeStep === 2 ? (
          <Button 
            onClick={handleValidateServices} 
            variant="contained"
            disabled={loading}
          >
            Validate Services
          </Button>
        ) : activeStep === 3 ? (
          <Button 
            onClick={handleGenerateScript} 
            variant="contained"
            disabled={!secrets.vapidKey}
          >
            Generate Script
          </Button>
        ) : (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SetupWizard;