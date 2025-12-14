/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Smartphone as MobileIcon,
  Computer as DesktopIcon
} from '@mui/icons-material';
import { PWASettings } from '../../lib/types/config';
import { iconProcessingService, PWA_ICON_SIZES } from '../../lib/pwa/iconProcessingService';

interface PWASettingsSectionProps {
  settings: PWASettings;
  onSettingsChange: (settings: PWASettings) => void;
  loading?: boolean;
}

const PWASettingsSection: React.FC<PWASettingsSectionProps> = ({
  settings,
  onSettingsChange,
  loading = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleInputChange = (field: keyof PWASettings, value: string) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // Validate file
      const validationError = iconProcessingService.validateIconFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      // Create preview
      const preview = await iconProcessingService.createPreview(file);
      setPreviewUrl(preview);
      setUploadProgress(25);

      // Process icon into multiple sizes
      const result = await iconProcessingService.processIconFile(file, {
        quality: 0.9,
        format: 'png'
      });
      setUploadProgress(75);

      // Build generated icons object
      const generatedIcons: { [size: string]: string } = {};
      result.processedIcons.forEach(icon => {
        generatedIcons[`${icon.size}x${icon.size}`] = icon.url;
      });

      // Update settings
      onSettingsChange({
        ...settings,
        iconUrl: result.originalUrl,
        generatedIcons
      });

      setUploadProgress(100);
      
    } catch (error) {
      console.error('Icon upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleRemoveIcon = () => {
    onSettingsChange({
      ...settings,
      iconUrl: undefined,
      generatedIcons: undefined
    });
    setPreviewUrl(null);
  };

  const downloadManifest = () => {
    const manifest = generateManifest();
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateManifest = () => {
    const icons = settings.generatedIcons ? 
      PWA_ICON_SIZES.map(size => ({
        src: settings.generatedIcons![`${size}x${size}`] || '/icons/icon-192.png',
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'maskable any'
      })) : [];

    return {
      name: settings.appName,
      short_name: settings.shortName,
      description: settings.description,
      start_url: '/',
      display: 'standalone',
      background_color: settings.backgroundColor,
      theme_color: settings.themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      lang: 'en-US',
      categories: ['business', 'productivity', 'utilities'],
      icons
    };
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            PWA Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure Progressive Web App settings including icons and app metadata.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* App Information */}
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
              <TextField
                label="App Name"
                value={settings.appName}
                onChange={(e) => handleInputChange('appName', e.target.value)}
                disabled={loading}
                helperText="Full name displayed when installing the app"
                fullWidth
              />

              <TextField
                label="Short Name"
                value={settings.shortName}
                onChange={(e) => handleInputChange('shortName', e.target.value)}
                disabled={loading}
                helperText="Short name for home screen (12 chars max)"
                inputProps={{ maxLength: 12 }}
                fullWidth
              />

              <TextField
                label="Description"
                value={settings.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                helperText="Brief description of the app"
                fullWidth
              />

              <TextField
                label="Theme Color"
                value={settings.themeColor}
                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                disabled={loading}
                type="color"
                helperText="Primary color for the app interface"
                fullWidth
              />

              <TextField
                label="Background Color"
                value={settings.backgroundColor}
                onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                disabled={loading}
                type="color"
                helperText="Background color for splash screen"
                fullWidth
              />
            </Stack>
          </Box>

          {/* Icon Upload */}
          <Box sx={{ flex: 1 }}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                App Icon
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload a square icon (512x512 recommended). We'll generate all required sizes automatically.
              </Typography>

              {/* Current Icon Display */}
              {(settings.iconUrl || previewUrl) && (
                <Paper sx={{ p: 2, mb: 2, textAlign: 'center' }}>
                  <Avatar
                    src={previewUrl || settings.iconUrl}
                    sx={{ width: 128, height: 128, mx: 'auto', mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current Icon
                  </Typography>
                  
                  {settings.generatedIcons && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Generated Sizes:
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        {PWA_ICON_SIZES.map(size => (
                          <Chip
                            key={size}
                            label={`${size}x${size}`}
                            size="small"
                            color={settings.generatedIcons![`${size}x${size}`] ? 'success' : 'default'}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Upload Area */}
              <Paper
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => document.getElementById('icon-upload')?.click()}
              >
                <input
                  id="icon-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleIconUpload}
                  disabled={uploading || loading}
                />
                
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" gutterBottom>
                  {uploading ? 'Processing...' : 'Upload App Icon'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PNG, JPEG, or WebP • Max 5MB • Square recommended
                </Typography>
              </Paper>

              {uploading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {uploadProgress < 25 && 'Validating file...'}
                    {uploadProgress >= 25 && uploadProgress < 75 && 'Processing icon...'}
                    {uploadProgress >= 75 && uploadProgress < 100 && 'Uploading files...'}
                    {uploadProgress === 100 && 'Complete!'}
                  </Typography>
                </Box>
              )}

              {uploadError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {uploadError}
                </Alert>
              )}

              {/* Icon Actions */}
              {settings.iconUrl && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Tooltip title="Remove icon">
                    <IconButton onClick={handleRemoveIcon} disabled={loading}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download manifest.json">
                    <IconButton onClick={downloadManifest} disabled={loading}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* PWA Preview */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            PWA Preview
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1
              }}>
                <MobileIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Mobile Install
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {settings.shortName} • Add to Home Screen
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                p: 2, 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1
              }}>
                <DesktopIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    Desktop Install
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {settings.appName} • Install App
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Auto-save note */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Changes are automatically saved after 2 seconds of inactivity.
          </Typography>
        </Alert>

        {/* Help Text */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> After saving PWA settings, users may need to reload the app 
            to see updated icons and app information. The service worker will automatically 
            update the cached manifest.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default PWASettingsSection;