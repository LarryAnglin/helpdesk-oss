/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardMedia,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { useConfig } from '../../lib/context/ConfigContext';
import { useAuth } from '../../lib/auth/AuthContext';
import { uploadCompanyLogo, deleteCompanyLogo } from '../../lib/firebase/configService';
import { hasRole } from '../../lib/utils/roleUtils';
import UploadIcon from '@mui/icons-material/Upload';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckIcon from '@mui/icons-material/Check';
import SyncIcon from '@mui/icons-material/Sync';
import MarkdownEditor from '../ui/MarkdownEditor';
import { SLASettings, DEFAULT_SLA_SETTINGS } from '../../lib/types/sla';
import { AutomationSettings, DEFAULT_AUTOMATION_SETTINGS } from '../../lib/types/automation';
import { SurveySettings, DEFAULT_SURVEY_SETTINGS } from '../../lib/types/survey';
import { AccessibilityPreferences, DEFAULT_ACCESSIBILITY_PREFERENCES, PWASettings, DEFAULT_PWA_SETTINGS } from '../../lib/types/config';
import ColorPicker from './ColorPicker';
import { AISettings, DEFAULT_AI_SETTINGS } from '../../lib/types/aiSettings';
import PWASettingsSection from './PWASettingsSection';
import FormFieldsManager from './FormFieldsManager';
import { NotificationSettings } from './NotificationSettings';
import HealthCheckDashboard from '../setup/HealthCheckDashboard';
import SetupWizard from '../setup/SetupWizard';
import { SettingsSectionWrapper } from './SettingsSectionWrapper';
import CommonSolutionsManager from '../admin/CommonSolutionsManager';
import { SLAEmailTester } from '../testing/SLAEmailTester';
import TimeCategoriesSettings from './TimeCategoriesSettings';
import HolidaySettings from './HolidaySettings';
import AIReferencesManager from './AIReferencesManager';
import EmailSettings from './EmailSettings';

interface SettingsFormProps {
  selectedSection?: string;
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  selectedSection
}) => {
  const { config, updateConfig, loading: configLoading, error: configError } = useConfig();
  const { userData, refreshToken } = useAuth();
  
  const [companyName, setCompanyName] = useState(config.companyName);
  const [supportEmail, setSupportEmail] = useState(config.supportEmail);
  const [supportPhone, setSupportPhone] = useState(config.supportPhone || '');
  const [allowedEmailDomains, setAllowedEmailDomains] = useState<string[]>(config.allowedEmailDomains || ['anglinai.com', 'your-domain.com']);
  const [newDomainInput, setNewDomainInput] = useState<string>('');
  const [domainInputError, setDomainInputError] = useState<string>('');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [pdfHeaderText, setPdfHeaderText] = useState(config.pdfHeaderText || '');
  const [footerMarkdown, setFooterMarkdown] = useState(config.footerMarkdown || '');
  const [slaSettings, setSlaSettings] = useState<SLASettings>(config.slaSettings || DEFAULT_SLA_SETTINGS);
  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(config.automationSettings || DEFAULT_AUTOMATION_SETTINGS);
  const [surveySettings, setSurveySettings] = useState<SurveySettings>(config.surveySettings || DEFAULT_SURVEY_SETTINGS);
  // Migrate legacy accessibility settings to new format
  const migrateAccessibilitySettings = (settings: AccessibilityPreferences): AccessibilityPreferences => {
    if (!settings.accentColors && settings.accentColor) {
      // Migrate legacy single color to dual colors
      return {
        ...settings,
        accentColors: {
          light: settings.accentColor,
          dark: settings.accentColor === '#FF8C00' ? '#FFA726' : settings.accentColor, // Slightly lighter for dark mode
        }
      };
    }
    return settings;
  };

  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilityPreferences>(
    migrateAccessibilitySettings(config.accessibility || DEFAULT_ACCESSIBILITY_PREFERENCES)
  );
  const [aiSettings, setAISettings] = useState<AISettings>(config.aiSettings || DEFAULT_AI_SETTINGS);
  const [pwaSettings, setPwaSettings] = useState<PWASettings>(config.pwaSettings || DEFAULT_PWA_SETTINGS);
  const [excludedEmailInput, setExcludedEmailInput] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [initialFormState, setInitialFormState] = useState<any>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if user is an admin (company_admin or higher)
  const isAdmin = hasRole(userData?.role, 'company_admin');
  const isRegularUser = userData?.role === 'user';
  
  
  // Initialize form state for change detection
  useEffect(() => {
    if (!initialFormState) {
      setInitialFormState({
        companyName,
        supportEmail,
        supportPhone,
        allowedEmailDomains,
        pdfHeaderText,
        footerMarkdown,
        slaSettings,
        automationSettings,
        surveySettings,
        accessibilitySettings,
        aiSettings,
        pwaSettings
      });
    }
  }, [companyName, supportEmail, supportPhone, allowedEmailDomains, pdfHeaderText, footerMarkdown, slaSettings, automationSettings, surveySettings, accessibilitySettings, aiSettings, pwaSettings, initialFormState]);
  
  // Auto-save function
  const performAutoSave = async () => {
    if (!companyName || !supportEmail) {
      return; // Don't auto-save if required fields are missing
    }

    try {
      setAutoSaving(true);
      setError(null);

      const configUpdate: any = {
        companyName,
        supportEmail,
      };
      
      if (supportPhone.trim()) {
        configUpdate.supportPhone = supportPhone;
      }
      
      if (allowedEmailDomains.length > 0) {
        configUpdate.allowedEmailDomains = allowedEmailDomains.filter(domain => domain.trim() !== '');
      }
      
      if (pdfHeaderText.trim()) {
        configUpdate.pdfHeaderText = pdfHeaderText;
      }
      
      if (footerMarkdown.trim()) {
        configUpdate.footerMarkdown = footerMarkdown;
      }
      
      configUpdate.slaSettings = slaSettings;
      configUpdate.automationSettings = automationSettings;
      configUpdate.surveySettings = surveySettings;
      configUpdate.accessibility = accessibilitySettings;
      configUpdate.aiSettings = aiSettings;
      configUpdate.pwaSettings = pwaSettings;

      await updateConfig(configUpdate);

      // Update initial state to reflect saved changes
      setInitialFormState({
        companyName,
        supportEmail,
        supportPhone,
        allowedEmailDomains,
        pdfHeaderText,
        footerMarkdown,
        slaSettings,
        automationSettings,
        surveySettings,
        accessibilitySettings,
        aiSettings,
        pwaSettings
      });

      setLastSaved(new Date());
    } catch (err: any) {
      console.error('Auto-save error:', err);
      setError(err.message || 'Auto-save failed');
    } finally {
      setAutoSaving(false);
    }
  };

  // Detect form changes and trigger auto-save
  useEffect(() => {
    if (initialFormState && !configLoading) {
      const currentState = {
        companyName,
        supportEmail,
        supportPhone,
        allowedEmailDomains,
        pdfHeaderText,
        footerMarkdown,
        slaSettings,
        automationSettings,
        surveySettings,
        accessibilitySettings,
        aiSettings,
        pwaSettings
      };
      
      // Compare against the actual server config, not just initialFormState
      const serverState = {
        companyName: config.companyName,
        supportEmail: config.supportEmail,
        supportPhone: config.supportPhone || '',
        allowedEmailDomains: config.allowedEmailDomains || ['anglinai.com', 'your-domain.com'],
        pdfHeaderText: config.pdfHeaderText || '',
        footerMarkdown: config.footerMarkdown || '',
        slaSettings: config.slaSettings || DEFAULT_SLA_SETTINGS,
        automationSettings: config.automationSettings || DEFAULT_AUTOMATION_SETTINGS,
        surveySettings: config.surveySettings || DEFAULT_SURVEY_SETTINGS,
        accessibilitySettings: config.accessibility || DEFAULT_ACCESSIBILITY_PREFERENCES,
        aiSettings: config.aiSettings || DEFAULT_AI_SETTINGS,
        pwaSettings: config.pwaSettings || DEFAULT_PWA_SETTINGS
      };
      
      const hasChanges = JSON.stringify(currentState) !== JSON.stringify(serverState);
      
      
      // Auto-save after 2 seconds of no changes - only if there are actually changes
      if (hasChanges && companyName && supportEmail) {
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
        }
        
        const timeout = setTimeout(() => {
          performAutoSave();
        }, 2000);
        
        setAutoSaveTimeout(timeout);
      } else {
        // Clear timeout if no changes
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
          setAutoSaveTimeout(null);
        }
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [companyName, supportEmail, supportPhone, allowedEmailDomains, pdfHeaderText, footerMarkdown, slaSettings, automationSettings, surveySettings, accessibilitySettings, aiSettings, pwaSettings, initialFormState, config, configLoading]);

  // Domain validation function
  const validateDomain = (domain: string): string => {
    if (!domain.trim()) {
      return '';
    }
    
    // Check for invalid characters
    if (domain.includes(' ')) {
      return 'Domain names cannot contain spaces';
    }
    if (domain.includes(',')) {
      return 'Enter one domain at a time (no commas)';
    }
    if (domain.includes('@')) {
      return 'Enter domain only (no @ symbol)';
    }
    
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return 'Please enter a valid domain name (e.g., example.com)';
    }
    
    // Check if domain already exists
    if (allowedEmailDomains.includes(domain)) {
      return 'This domain is already added';
    }
    
    return '';
  };

  const handleDomainInputChange = (value: string) => {
    setNewDomainInput(value);
    const error = validateDomain(value);
    setDomainInputError(error);
  };

  const addDomain = () => {
    const trimmedDomain = newDomainInput.trim();
    const error = validateDomain(trimmedDomain);
    
    if (!error && trimmedDomain) {
      setAllowedEmailDomains(prev => [...prev, trimmedDomain]);
      setNewDomainInput('');
      setDomainInputError('');
    }
  };

  const isDomainInputValid = newDomainInput.trim() && !domainInputError;

  // Helper function to check if a section should be visible
  const shouldShowSection = (sectionId: string) => {
    // If no selectedSection is provided, show all sections (desktop mode)
    // If selectedSection is provided, only show that section (mobile mode)
    return !selectedSection || selectedSection === sectionId;
  };

  // For regular users, only show notification and appearance settings
  if (isRegularUser) {
    return (
      <Box>
        {!selectedSection && (
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
        )}
        
        <SettingsSectionWrapper
          id="notifications"
          title="Notifications"
          description="Configure push notifications and alert preferences"
          visible={shouldShowSection('notifications')}
        >
          <NotificationSettings />
        </SettingsSectionWrapper>

        <SettingsSectionWrapper
          id="appearance"
          title="Appearance"
          description="Visual theme and accessibility settings"
          visible={shouldShowSection('appearance')}
        >
          <ColorPicker />
        </SettingsSectionWrapper>
      </Box>
    );
  }

  // Sync state with config changes
  useEffect(() => {
    setCompanyName(config.companyName);
    setSupportEmail(config.supportEmail);
    setSupportPhone(config.supportPhone || '');
    setAllowedEmailDomains(config.allowedEmailDomains || ['anglinai.com', 'your-domain.com']);
    setPdfHeaderText(config.pdfHeaderText || '');
    setFooterMarkdown(config.footerMarkdown || '');
    setSlaSettings(config.slaSettings || DEFAULT_SLA_SETTINGS);
    setAutomationSettings(config.automationSettings || DEFAULT_AUTOMATION_SETTINGS);
    setSurveySettings(config.surveySettings || DEFAULT_SURVEY_SETTINGS);
    setAccessibilitySettings(migrateAccessibilitySettings(config.accessibility || DEFAULT_ACCESSIBILITY_PREFERENCES));
    setAISettings(config.aiSettings || DEFAULT_AI_SETTINGS);
    setPwaSettings(config.pwaSettings || DEFAULT_PWA_SETTINGS);
  }, [config]);

  const handleSave = async () => {
    if (!companyName || !supportEmail) {
      setError('Company name and support email are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Only include fields with non-empty values
      const configUpdate: any = {
        companyName,
        supportEmail,
      };
      
      // Only add optional fields if they have values
      if (supportPhone.trim()) {
        configUpdate.supportPhone = supportPhone;
      }
      
      if (allowedEmailDomains.length > 0) {
        configUpdate.allowedEmailDomains = allowedEmailDomains.filter(domain => domain.trim() !== '');
      }
      
      if (pdfHeaderText.trim()) {
        configUpdate.pdfHeaderText = pdfHeaderText;
      }
      
      if (footerMarkdown.trim()) {
        configUpdate.footerMarkdown = footerMarkdown;
      }
      
      // Always include SLA, automation, survey, AI, accessibility, and PWA settings
      configUpdate.slaSettings = slaSettings;
      configUpdate.automationSettings = automationSettings;
      configUpdate.surveySettings = surveySettings;
      configUpdate.accessibility = accessibilitySettings;
      configUpdate.aiSettings = aiSettings;
      configUpdate.pwaSettings = pwaSettings;

      await updateConfig(configUpdate);

      // Update initial state to reflect saved changes
      setInitialFormState({
        companyName,
        supportEmail,
        supportPhone,
        allowedEmailDomains,
        pdfHeaderText,
        footerMarkdown,
        slaSettings,
        automationSettings,
        surveySettings,
        accessibilitySettings,
        aiSettings,
        pwaSettings
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setError(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    try {
      setLogoLoading(true);
      setError(null);
      
      await uploadCompanyLogo(file);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      setError(err.message || 'Failed to upload logo');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setLogoLoading(true);
      setError(null);
      
      await deleteCompanyLogo();
    } catch (err: any) {
      console.error('Error deleting logo:', err);
      setError(err.message || 'Failed to delete logo');
    } finally {
      setLogoLoading(false);
    }
  };

  // Function to refresh the user's token (useful if role claims aren't properly synced)
  const handleRefreshToken = async () => {
    try {
      setTokenRefreshing(true);
      setError(null);
      
      await refreshToken();
      setSuccess(true);
    } catch (err: any) {
      console.error('Error refreshing token:', err);
      setError(err.message || 'Failed to refresh authentication token');
    } finally {
      setTokenRefreshing(false);
    }
  };

  // SLA Settings handlers
  const handleSLAPriorityChange = (priority: 'urgent' | 'high' | 'medium' | 'low', field: string, value: any) => {
    setSlaSettings(prev => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        [field]: value
      }
    }));
  };

  const handleBusinessHoursChange = (field: string, value: any) => {
    setSlaSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [field]: value
      }
    }));
  };

  const handleHolidaysChange = (holidays: any[]) => {
    handleBusinessHoursChange('holidays', holidays);
  };

  // Survey settings handlers
  const handleAddExcludedEmail = () => {
    if (excludedEmailInput.trim() && !surveySettings.excludedEmails.includes(excludedEmailInput.trim())) {
      setSurveySettings(prev => ({
        ...prev,
        excludedEmails: [...prev.excludedEmails, excludedEmailInput.trim().toLowerCase()]
      }));
      setExcludedEmailInput('');
    }
  };

  const handleRemoveExcludedEmail = (email: string) => {
    setSurveySettings(prev => ({
      ...prev,
      excludedEmails: prev.excludedEmails.filter(e => e !== email)
    }));
  };

  return (
    <Box>
      {!selectedSection && (
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
      )}

      {/* Auto-save Status */}
      {lastSaved && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          icon={<CheckIcon />}
        >
          Auto-saved at {lastSaved.toLocaleTimeString()}
        </Alert>
      )}

      {autoSaving && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          icon={<SyncIcon className="animate-spin" />}
        >
          Saving changes...
        </Alert>
      )}

      {(error || configError) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || configError}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings updated successfully
        </Alert>
      )}

      <SettingsSectionWrapper
        id="company"
        title="Company Information"
        description="Configure your company details, contact information, and branding"
        visible={shouldShowSection('company')}
      >

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <TextField
              label="Company Name"
              fullWidth
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading || configLoading}
              margin="normal"
            />

            <TextField
              label="Support Email"
              fullWidth
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              required
              disabled={loading || configLoading}
              margin="normal"
              helperText="This email will receive ticket notifications"
            />

            <TextField
              label="Support Phone"
              fullWidth
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              disabled={loading || configLoading}
              margin="normal"
              helperText="Optional"
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Allowed Email Domains
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Only users with email addresses from these domains can sign up. Enter allowed domains one at a time and press Add. Leave empty to allow all domains.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="example.com"
                  value={newDomainInput}
                  onChange={(e) => handleDomainInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (isDomainInputValid) {
                        addDomain();
                      }
                    }
                  }}
                  disabled={loading || configLoading}
                  error={!!domainInputError}
                  helperText={domainInputError}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-error': {
                        backgroundColor: 'rgba(255, 0, 0, 0.04)',
                        animation: domainInputError ? 'flash 0.3s ease-in-out' : 'none',
                      }
                    },
                    '@keyframes flash': {
                      '0%': { backgroundColor: 'rgba(255, 0, 0, 0.04)' },
                      '50%': { backgroundColor: 'rgba(255, 0, 0, 0.12)' },
                      '100%': { backgroundColor: 'rgba(255, 0, 0, 0.04)' }
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={addDomain}
                  disabled={loading || configLoading || !isDomainInputValid}
                >
                  Add
                </Button>
              </Box>
              
              {allowedEmailDomains.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {allowedEmailDomains.map((domain) => (
                    <Chip
                      key={domain}
                      label={domain}
                      onDelete={() => setAllowedEmailDomains(prev => prev.filter(d => d !== domain))}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* PDF Export Headers & Footers Section */}
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            PDF Export Headers & Footers
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Configure custom headers and footers that will appear on PDF exports only.
          </Typography>
          
          <TextField
            label="PDF Header Text"
            fullWidth
            value={pdfHeaderText}
            onChange={(e) => setPdfHeaderText(e.target.value)}
            disabled={loading || configLoading}
            margin="normal"
            placeholder="Help Desk System - Confidential"
            helperText="Optional. Plain text that appears on the left side of PDF headers. The export date will appear on the right side."
            sx={{ mb: 3 }}
          />
          
          <Typography variant="subtitle1" gutterBottom>
            PDF Footer Content
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Add a custom footer for PDF exports. You can use markdown formatting for links, bold text, etc.
          </Typography>
          
          <MarkdownEditor
            value={footerMarkdown}
            onChange={setFooterMarkdown}
            label=""
            placeholder="Example:
© 2024 **Your Company Name**. All rights reserved.

For support, contact us at [support@example.com](mailto:support@example.com) or call (555) 123-4567.

*Hours: Monday-Friday 9AM-5PM EST*"
            helperText="Use markdown formatting for rich text. Leave empty to hide the custom footer. Page numbers (Page x of n) are automatically added to all PDF exports."
            rows={6}
          />
        </Box>

        {/* SLA Settings Section */}
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Service Level Agreements (SLA)
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Configure response and resolution time targets for different priority levels.
          </Typography>
          
          {/* Priority-based SLA Settings */}
          <Box sx={{ display: 'grid', gap: 3, mt: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' } }}>
            {(['urgent', 'high', 'medium', 'low'] as const).map((priority) => (
              <Box key={priority}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', mr: 1 }}>
                      {priority}
                    </Typography>
                    <Chip 
                      size="small" 
                      label={priority} 
                      color={
                        priority === 'urgent' ? 'error' : 
                        priority === 'high' ? 'warning' : 
                        priority === 'medium' ? 'info' : 'default'
                      } 
                    />
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={slaSettings[priority].enabled}
                        onChange={(e) => handleSLAPriorityChange(priority, 'enabled', e.target.checked)}
                        disabled={loading || configLoading}
                      />
                    }
                    label="Enabled"
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    label="Response Time"
                    type="number"
                    fullWidth
                    value={slaSettings[priority].responseTimeHours}
                    onChange={(e) => handleSLAPriorityChange(priority, 'responseTimeHours', Number(e.target.value))}
                    disabled={loading || configLoading || !slaSettings[priority].enabled}
                    margin="normal"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                    }}
                    helperText="Time to first response"
                  />
                  
                  <TextField
                    label="Resolution Time"
                    type="number"
                    fullWidth
                    value={slaSettings[priority].resolutionTimeHours}
                    onChange={(e) => handleSLAPriorityChange(priority, 'resolutionTimeHours', Number(e.target.value))}
                    disabled={loading || configLoading || !slaSettings[priority].enabled}
                    margin="normal"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                    }}
                    helperText="Time to resolution"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={slaSettings[priority].businessHoursOnly}
                        onChange={(e) => handleSLAPriorityChange(priority, 'businessHoursOnly', e.target.checked)}
                        disabled={loading || configLoading || !slaSettings[priority].enabled}
                      />
                    }
                    label="Business Hours Only"
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Box>
            ))}
          </Box>
          
          {/* Business Hours Configuration */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Business Hours Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Define your organization's business hours for SLA calculations.
            </Typography>
            
            <Box sx={{ display: 'grid', gap: 3, mt: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              <Box>
                <TextField
                  label="Start Time"
                  type="time"
                  fullWidth
                  value={slaSettings.businessHours.start}
                  onChange={(e) => handleBusinessHoursChange('start', e.target.value)}
                  disabled={loading || configLoading}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              
              <Box>
                <TextField
                  label="End Time"
                  type="time"
                  fullWidth
                  value={slaSettings.businessHours.end}
                  onChange={(e) => handleBusinessHoursChange('end', e.target.value)}
                  disabled={loading || configLoading}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
              
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={slaSettings.businessHours.timezone}
                    onChange={(e) => handleBusinessHoursChange('timezone', e.target.value)}
                    disabled={loading || configLoading}
                    label="Timezone"
                  >
                    <MenuItem value="America/New_York">Eastern Time</MenuItem>
                    <MenuItem value="America/Chicago">Central Time</MenuItem>
                    <MenuItem value="America/Denver">Mountain Time</MenuItem>
                    <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                    <MenuItem value="UTC">UTC</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Business Days</InputLabel>
                  <Select
                    multiple
                    value={slaSettings.businessHours.days}
                    onChange={(e) => handleBusinessHoursChange('days', e.target.value)}
                    disabled={loading || configLoading}
                    label="Business Days"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as number[]).map((day) => (
                          <Chip 
                            key={day} 
                            label={
                              ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                            } 
                            size="small" 
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                      <MenuItem key={index} value={index}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            {/* Holiday Configuration */}
            <Box sx={{ mt: 3 }}>
              <HolidaySettings
                holidays={slaSettings.businessHours.holidays || []}
                onHolidaysChange={handleHolidaysChange}
                disabled={loading || configLoading}
              />
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '66.67%' } }}>
            {/* This empty box maintains the layout for the logo section */}
          </Box>

          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '33.33%' } }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                Company Logo
              </Typography>
              
              <Card sx={{ mb: 2, height: 140, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {config.companyLogo ? (
                  <CardMedia
                    component="img"
                    image={config.companyLogo}
                    alt={config.companyName}
                    sx={{ 
                      objectFit: 'contain',
                      maxHeight: '100%',
                      width: 'auto',
                      maxWidth: '100%'
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No logo uploaded
                  </Typography>
                )}
              </Card>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                >
                  {logoLoading ? <CircularProgress size={24} /> : 'Upload Logo'}
                </Button>
                
                {config.companyLogo && (
                  <Tooltip title="Delete Logo">
                    <IconButton 
                      onClick={handleDeleteLogo}
                      disabled={logoLoading}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                  accept="image/*"
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </SettingsSectionWrapper>

      {/* Automation Settings Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="automation"
          title="Automation"
          description="Configure auto-assignment rules and escalation workflows"
          visible={shouldShowSection('automation')}
        >

          {/* Auto-Assignment Settings */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Auto-Assignment
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Automatically assign new tickets to available technicians based on rules.
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={automationSettings.autoAssignment.enabled}
                  onChange={(e) => setAutomationSettings(prev => ({
                    ...prev,
                    autoAssignment: {
                      ...prev.autoAssignment,
                      enabled: e.target.checked
                    }
                  }))}
                  disabled={loading || configLoading}
                />
              }
              label="Enable Auto-Assignment"
              sx={{ mb: 2 }}
            />

            {automationSettings.autoAssignment.enabled && (
              <Box sx={{ ml: 4, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Default assignment strategy when no specific rules match:
                </Typography>
                <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
                  <InputLabel>Assignment Strategy</InputLabel>
                  <Select
                    value={automationSettings.autoAssignment.defaultAssignment.type}
                    onChange={(e) => setAutomationSettings(prev => ({
                      ...prev,
                      autoAssignment: {
                        ...prev.autoAssignment,
                        defaultAssignment: {
                          ...prev.autoAssignment.defaultAssignment,
                          type: e.target.value as 'roundRobin' | 'balanced'
                        }
                      }
                    }))}
                    label="Assignment Strategy"
                    disabled={loading || configLoading}
                  >
                    <MenuItem value="roundRobin">Round Robin</MenuItem>
                    <MenuItem value="balanced">Balanced (Least Loaded)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>

          {/* Escalation Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Escalation Rules
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Automatically escalate overdue tickets to senior staff or managers.
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={automationSettings.escalation.enabled}
                  onChange={(e) => setAutomationSettings(prev => ({
                    ...prev,
                    escalation: {
                      ...prev.escalation,
                      enabled: e.target.checked
                    }
                  }))}
                  disabled={loading || configLoading}
                />
              }
              label="Enable Escalation Rules"
              sx={{ mb: 2 }}
            />

            {automationSettings.escalation.enabled && (
              <Box sx={{ ml: 4 }}>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  <Box>
                    <TextField
                      label="Max Response Time (hours)"
                      type="number"
                      fullWidth
                      size="small"
                      value={automationSettings.escalation.globalSettings.maxResponseTimeHours}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        escalation: {
                          ...prev.escalation,
                          globalSettings: {
                            ...prev.escalation.globalSettings,
                            maxResponseTimeHours: Number(e.target.value)
                          }
                        }
                      }))}
                      disabled={loading || configLoading}
                      helperText="Escalate if no response within this time"
                    />
                  </Box>
                  <Box>
                    <TextField
                      label="Max Resolution Time (hours)"
                      type="number"
                      fullWidth
                      size="small"
                      value={automationSettings.escalation.globalSettings.maxResolutionTimeHours}
                      onChange={(e) => setAutomationSettings(prev => ({
                        ...prev,
                        escalation: {
                          ...prev.escalation,
                          globalSettings: {
                            ...prev.escalation.globalSettings,
                            maxResolutionTimeHours: Number(e.target.value)
                          }
                        }
                      }))}
                      disabled={loading || configLoading}
                      helperText="Escalate if not resolved within this time"
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  💡 Advanced auto-assignment rules and escalation workflows can be configured through the admin API or by contacting support.
                </Typography>
              </Box>
            )}
          </Box>
        </SettingsSectionWrapper>
      )}

      {/* Survey Settings Section */}
      <SettingsSectionWrapper
        id="survey"
        title="Customer Surveys"
        description="Configure customer satisfaction surveys and feedback collection"
        visible={shouldShowSection('survey')}
      >

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Automatically send satisfaction surveys when tickets are closed to gather customer feedback.
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={surveySettings.enabled}
                onChange={(e) => setSurveySettings(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                disabled={loading || configLoading}
              />
            }
            label="Enable Satisfaction Surveys"
            sx={{ mb: 2 }}
          />

          {surveySettings.enabled && (
            <Box sx={{ ml: 4 }}>
              <Box sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <Box>
                  <TextField
                    label="Send Delay (minutes)"
                    type="number"
                    fullWidth
                    size="small"
                    value={surveySettings.sendDelay}
                    onChange={(e) => setSurveySettings(prev => ({
                      ...prev,
                      sendDelay: Number(e.target.value)
                    }))}
                    disabled={loading || configLoading}
                    helperText="Minutes after closure to send survey"
                    InputProps={{
                      inputProps: { min: 0, max: 1440 }
                    }}
                  />
                </Box>
              </Box>
              
              <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Excluded Email Addresses
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    These email addresses will never receive satisfaction surveys.
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="email@example.com"
                      value={excludedEmailInput}
                      onChange={(e) => setExcludedEmailInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExcludedEmail();
                        }
                      }}
                      disabled={loading || configLoading}
                    />
                    <Button
                      variant="outlined"
                      onClick={handleAddExcludedEmail}
                      disabled={loading || configLoading || !excludedEmailInput.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                  
                  {surveySettings.excludedEmails.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {surveySettings.excludedEmails.map((email) => (
                        <Chip
                          key={email}
                          label={email}
                          onDelete={() => handleRemoveExcludedEmail(email)}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
              </Box>

              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Survey Email Template
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <TextField
                    label="Email Subject"
                    fullWidth
                    size="small"
                    value={surveySettings.emailTemplate.subject}
                    onChange={(e) => setSurveySettings(prev => ({
                      ...prev,
                      emailTemplate: {
                        ...prev.emailTemplate,
                        subject: e.target.value
                      }
                    }))}
                    disabled={loading || configLoading}
                    helperText="Use {ticketId} to include the ticket number"
                  />
                </Box>
                
                <Box>
                  <TextField
                    label="Header Text"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={surveySettings.emailTemplate.headerText}
                    onChange={(e) => setSurveySettings(prev => ({
                      ...prev,
                      emailTemplate: {
                        ...prev.emailTemplate,
                        headerText: e.target.value
                      }
                    }))}
                    disabled={loading || configLoading}
                  />
                </Box>
                
                <Box>
                  <TextField
                    label="Footer Text"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={surveySettings.emailTemplate.footerText}
                    onChange={(e) => setSurveySettings(prev => ({
                      ...prev,
                      emailTemplate: {
                        ...prev.emailTemplate,
                        footerText: e.target.value
                      }
                    }))}
                    disabled={loading || configLoading}
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </SettingsSectionWrapper>

      {/* Time Categories & Rates Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="timeCategories"
          title="Time Categories & Billing Rates"
          description="Configure different types of work and their billing rates"
          visible={shouldShowSection('timeCategories')}
        >
          <TimeCategoriesSettings onUpdate={() => {}} />
        </SettingsSectionWrapper>
      )}

      {/* Appearance Settings */}
      <SettingsSectionWrapper
        id="appearance"
        title="Appearance Settings"
        description="Configure visual theme and accessibility preferences"
        visible={shouldShowSection('appearance')}
      >

        <ColorPicker />
      </SettingsSectionWrapper>

      {/* AI Settings Section */}
      <SettingsSectionWrapper
        id="ai"
        title="AI Configuration"
        description="Configure AI assistant settings and knowledge base integration"
        visible={shouldShowSection('ai')}
      >
        
        <Box>
          <Typography variant="h6" gutterBottom>
            General AI Configuration
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={aiSettings.enabled}
                onChange={(e) => setAISettings(prev => ({ ...prev, enabled: e.target.checked }))}
                disabled={loading || configLoading}
              />
            }
            label="Enable AI Self-Help System"
            sx={{ mb: 2 }}
          />
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Ticket Insights Learning
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Automatically extract key points from closed tickets to improve AI responses over time.
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={aiSettings.ticketInsightsEnabled}
                onChange={(e) => setAISettings(prev => ({ ...prev, ticketInsightsEnabled: e.target.checked }))}
                disabled={loading || configLoading || !aiSettings.enabled}
              />
            }
            label="Enable Ticket Insights"
            sx={{ mb: 2 }}
          />
          
          {aiSettings.ticketInsightsEnabled && (
            <Box sx={{ ml: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={aiSettings.autoAnalyzeClosedTickets}
                    onChange={(e) => setAISettings(prev => ({ ...prev, autoAnalyzeClosedTickets: e.target.checked }))}
                    disabled={loading || configLoading || !aiSettings.enabled}
                  />
                }
                label="Automatically analyze tickets when closed"
                sx={{ mb: 2 }}
              />
              
              <TextField
                label="Maximum Context Tokens"
                type="number"
                fullWidth
                value={aiSettings.maxInsightTokens}
                onChange={(e) => setAISettings(prev => ({ ...prev, maxInsightTokens: Number(e.target.value) }))}
                disabled={loading || configLoading || !aiSettings.enabled || !aiSettings.ticketInsightsEnabled}
                margin="normal"
                InputProps={{
                  endAdornment: <InputAdornment position="end">tokens</InputAdornment>,
                }}
                helperText="Maximum tokens to use for ticket insights context (1M tokens ≈ 3000+ pages). Default: 100,000"
                sx={{ mb: 2, maxWidth: 400 }}
              />
              
              <TextField
                label="Insight Retention Period"
                type="number"
                fullWidth
                value={aiSettings.insightRetentionDays}
                onChange={(e) => setAISettings(prev => ({ ...prev, insightRetentionDays: Number(e.target.value) }))}
                disabled={loading || configLoading || !aiSettings.enabled || !aiSettings.ticketInsightsEnabled}
                margin="normal"
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
                helperText="How long to keep ticket insights before automatic deletion. Default: 90 days"
                sx={{ maxWidth: 400 }}
              />
            </Box>
          )}
          
          <Alert severity="info" sx={{ mt: 2 }}>
            Ticket insights help the AI provide more accurate and contextual responses based on previously resolved issues. 
            Older insights are automatically compressed to fit within the token budget, prioritizing recent tickets.
          </Alert>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box>
          <Typography variant="h6" gutterBottom>
            Knowledge Base Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Configure how the AI uses external knowledge sources like websites, documents, and databases.
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={aiSettings.knowledgeBaseSettings.enabled}
                onChange={(e) => setAISettings(prev => ({
                  ...prev,
                  knowledgeBaseSettings: {
                    ...prev.knowledgeBaseSettings,
                    enabled: e.target.checked
                  }
                }))}
                disabled={loading || configLoading || !aiSettings.enabled}
              />
            }
            label="Enable Knowledge Base Integration"
            sx={{ mb: 2 }}
          />
          
          {aiSettings.knowledgeBaseSettings.enabled && (
            <Box sx={{ ml: 4 }}>
              <TextField
                label="Maximum Knowledge Base Tokens"
                type="number"
                fullWidth
                value={aiSettings.knowledgeBaseSettings.maxTokens}
                onChange={(e) => setAISettings(prev => ({
                  ...prev,
                  knowledgeBaseSettings: {
                    ...prev.knowledgeBaseSettings,
                    maxTokens: Number(e.target.value)
                  }
                }))}
                disabled={loading || configLoading || !aiSettings.enabled}
                margin="normal"
                InputProps={{
                  endAdornment: <InputAdornment position="end">tokens</InputAdornment>,
                }}
                helperText="Maximum tokens for knowledge base context. Default: 400,000 tokens"
                sx={{ mb: 2, maxWidth: 400 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={aiSettings.knowledgeBaseSettings.autoSelectRelevantSources}
                    onChange={(e) => setAISettings(prev => ({
                      ...prev,
                      knowledgeBaseSettings: {
                        ...prev.knowledgeBaseSettings,
                        autoSelectRelevantSources: e.target.checked
                      }
                    }))}
                    disabled={loading || configLoading || !aiSettings.enabled}
                  />
                }
                label="Auto-select relevant sources based on question"
                sx={{ mb: 2 }}
              />
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Processing Schedules
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Configure when different types of sources are automatically processed.
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mt: 1 }}>
                <TextField
                  label="Website Crawling"
                  value={aiSettings.knowledgeBaseSettings.processingSchedule.websites}
                  onChange={(e) => setAISettings(prev => ({
                    ...prev,
                    knowledgeBaseSettings: {
                      ...prev.knowledgeBaseSettings,
                      processingSchedule: {
                        ...prev.knowledgeBaseSettings.processingSchedule,
                        websites: e.target.value
                      }
                    }
                  }))}
                  disabled={loading || configLoading || !aiSettings.enabled}
                  size="small"
                  helperText="Cron expression"
                />
                <TextField
                  label="Google Docs Processing"
                  value={aiSettings.knowledgeBaseSettings.processingSchedule.googleDocs}
                  onChange={(e) => setAISettings(prev => ({
                    ...prev,
                    knowledgeBaseSettings: {
                      ...prev.knowledgeBaseSettings,
                      processingSchedule: {
                        ...prev.knowledgeBaseSettings.processingSchedule,
                        googleDocs: e.target.value
                      }
                    }
                  }))}
                  disabled={loading || configLoading || !aiSettings.enabled}
                  size="small"
                  helperText="Cron expression"
                />
                <TextField
                  label="PDF URL Checking"
                  value={aiSettings.knowledgeBaseSettings.processingSchedule.pdfUrls}
                  onChange={(e) => setAISettings(prev => ({
                    ...prev,
                    knowledgeBaseSettings: {
                      ...prev.knowledgeBaseSettings,
                      processingSchedule: {
                        ...prev.knowledgeBaseSettings.processingSchedule,
                        pdfUrls: e.target.value
                      }
                    }
                  }))}
                  disabled={loading || configLoading || !aiSettings.enabled}
                  size="small"
                  helperText="Cron expression"
                />
              </Box>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                Rate Limits
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr', mt: 1 }}>
                <TextField
                  label="Website Crawling Rate"
                  type="number"
                  value={aiSettings.knowledgeBaseSettings.rateLimits.websiteCrawling}
                  onChange={(e) => setAISettings(prev => ({
                    ...prev,
                    knowledgeBaseSettings: {
                      ...prev.knowledgeBaseSettings,
                      rateLimits: {
                        ...prev.knowledgeBaseSettings.rateLimits,
                        websiteCrawling: Number(e.target.value)
                      }
                    }
                  }))}
                  disabled={loading || configLoading || !aiSettings.enabled}
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">req/min</InputAdornment>,
                  }}
                  helperText="Requests per minute for website crawling"
                />
                <TextField
                  label="Google API Rate"
                  type="number"
                  value={aiSettings.knowledgeBaseSettings.rateLimits.googleApiCalls}
                  onChange={(e) => setAISettings(prev => ({
                    ...prev,
                    knowledgeBaseSettings: {
                      ...prev.knowledgeBaseSettings,
                      rateLimits: {
                        ...prev.knowledgeBaseSettings.rateLimits,
                        googleApiCalls: Number(e.target.value)
                      }
                    }
                  }))}
                  disabled={loading || configLoading || !aiSettings.enabled}
                  size="small"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">req/min</InputAdornment>,
                  }}
                  helperText="API calls per minute for Google services"
                />
              </Box>
            </Box>
          )}
          
          <Alert severity="info" sx={{ mt: 2 }}>
            The knowledge base allows the AI to access external sources like websites, Google Docs, PDFs, and databases 
            to provide more comprehensive and up-to-date responses. Sources are processed automatically according to the 
            schedule you configure.
          </Alert>
        </Box>

        <AIReferencesManager enabled={aiSettings.enabled} />
      </SettingsSectionWrapper>

      {/* Notification Settings Section */}
      <SettingsSectionWrapper
        id="notifications"
        title="Notifications"
        description="Configure push notifications and alert preferences"
        visible={shouldShowSection('notifications')}
      >
        <NotificationSettings />
      </SettingsSectionWrapper>

      {/* Email Configuration Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="email"
          title="Email Configuration"
          description="Choose your email service provider and configure delivery settings"
          visible={shouldShowSection('email')}
        >
          <EmailSettings />
        </SettingsSectionWrapper>
      )}

      {/* PWA Settings Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="pwa"
          title="Progressive Web App"
          description="Configure PWA settings for mobile and offline functionality"
          visible={shouldShowSection('pwa')}
        >
          <PWASettingsSection
            settings={pwaSettings}
            onSettingsChange={setPwaSettings}
            loading={loading || configLoading}
          />
        </SettingsSectionWrapper>
      )}

      {/* Form Fields Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="form"
          title="Ticket Form Configuration"
          description="Configure which fields appear on the ticket creation form"
          visible={shouldShowSection('form')}
        >
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Configure which fields appear on the ticket creation form. You can hide standard fields, edit their labels, and add custom fields as needed.
          </Typography>
          <FormFieldsManager 
            context="ticket_creation"
            onFieldsChange={(fields) => {
              console.log('Form fields updated:', fields);
            }}
          />
        </SettingsSectionWrapper>
      )}

      {/* System Health Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="setup"
          title="Setup Wizard"
          description="Initial setup and health checks for system configuration"
          visible={shouldShowSection('setup')}
        >
          
          <HealthCheckDashboard onRunSetup={() => setShowSetupWizard(true)} />
        </SettingsSectionWrapper>
      )}

      {/* Admin tools section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="system"
          title="System Settings"
          description="Advanced configuration and maintenance tools"
          visible={shouldShowSection('system')}
        >

          <Box>
            <Typography variant="body1" gutterBottom>
              If you&apos;re experiencing issues with permissions or storage access, try refreshing your authentication token.
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshToken}
              disabled={tokenRefreshing}
              sx={{ mt: 1 }}
            >
              {tokenRefreshing ? <CircularProgress size={24} /> : 'Refresh Authentication Token'}
            </Button>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Current role: <strong>{userData?.role || 'unknown'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              User ID: {userData?.uid || 'unknown'}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Box>
            <Typography variant="h6" gutterBottom>
              Email Testing Tools
            </Typography>
            <SLAEmailTester />
          </Box>
        </SettingsSectionWrapper>
      )}

      {/* Common Solutions Section */}
      {isAdmin && (
        <SettingsSectionWrapper
          id="commonSolutions"
          title="Common Solutions"
          description="Manage quick help links displayed on the login page to assist users with common issues"
          visible={shouldShowSection('commonSolutions')}
        >
          <CommonSolutionsManager />
        </SettingsSectionWrapper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading || configLoading || autoSaving || !companyName || !supportEmail}
          data-testid="settings-save-button"
        >
          {loading ? <CircularProgress size={24} /> : 'Save Now'}
        </Button>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
        Changes are automatically saved after 2 seconds of inactivity
      </Typography>

      {/* Setup Wizard */}
      <SetupWizard
        open={showSetupWizard}
        onComplete={() => setShowSetupWizard(false)}
      />
    </Box>
  );
};

export default SettingsForm;