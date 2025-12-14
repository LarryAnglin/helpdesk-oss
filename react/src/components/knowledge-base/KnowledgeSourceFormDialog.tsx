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
  TextField,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Web as WebIcon,
  Description as DocIcon,
  TableChart as SheetIcon,
  CalendarToday as CalendarIcon,
  PictureAsPdf as PdfIcon,
  Storage as DatabaseIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { KnowledgeSource, KnowledgeSourceType, CreateKnowledgeSourceRequest } from '../../lib/types/knowledgeBase';

interface KnowledgeSourceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateKnowledgeSourceRequest) => Promise<void>;
  initialData?: KnowledgeSource | null;
}

const sourceTypes: Array<{ type: KnowledgeSourceType; label: string; icon: React.ReactNode; description: string }> = [
  {
    type: 'website',
    label: 'Website',
    icon: <WebIcon />,
    description: 'Crawl and extract content from websites'
  },
  {
    type: 'google_doc',
    label: 'Google Doc',
    icon: <DocIcon />,
    description: 'Import content from Google Documents'
  },
  {
    type: 'google_sheet',
    label: 'Google Sheet',
    icon: <SheetIcon />,
    description: 'Import data from Google Spreadsheets'
  },
  {
    type: 'google_calendar',
    label: 'Google Calendar',
    icon: <CalendarIcon />,
    description: 'Import events from Google Calendar'
  },
  {
    type: 'pdf_upload',
    label: 'PDF Upload',
    icon: <PdfIcon />,
    description: 'Upload PDF files from your computer'
  },
  {
    type: 'pdf_url',
    label: 'PDF URL',
    icon: <PdfIcon />,
    description: 'Import PDF files from URLs'
  },
  {
    type: 'firestore_collection',
    label: 'Firestore Collection',
    icon: <DatabaseIcon />,
    description: 'Query data from Firestore collections'
  }
];

const KnowledgeSourceFormDialog: React.FC<KnowledgeSourceFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialData
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<{
    name: string;
    type: KnowledgeSourceType | '';
    enabled: boolean;
    config: any;
  }>({
    name: '',
    type: '',
    enabled: true,
    config: {}
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const steps = ['Select Type', 'Configure', 'Review'];

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          type: initialData.type,
          enabled: initialData.enabled,
          config: { ...initialData.config }
        });
        setActiveStep(1); // Skip type selection for editing
      } else {
        setFormData({
          name: '',
          type: '',
          enabled: true,
          config: {}
        });
        setActiveStep(0);
      }
      setErrors({});
      setSelectedFile(null);
    }
  }, [open, initialData]);

  // Validation
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (activeStep === 0) {
      if (!formData.type) {
        newErrors.type = 'Please select a source type';
      }
    } else if (activeStep === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Source name is required';
      }

      // Type-specific validation
      if (formData.type === 'website') {
        if (!formData.config.baseUrl) {
          newErrors.baseUrl = 'Website URL is required';
        } else {
          try {
            new URL(formData.config.baseUrl);
          } catch {
            newErrors.baseUrl = 'Please enter a valid URL';
          }
        }
      } else if (formData.type === 'google_doc' || formData.type === 'google_sheet' || formData.type === 'google_calendar') {
        if (!formData.config.shareableLink) {
          newErrors.shareableLink = 'Shareable link is required';
        }
      } else if (formData.type === 'pdf_upload') {
        if (!selectedFile && !initialData) {
          newErrors.file = 'Please select a PDF file';
        }
      } else if (formData.type === 'pdf_url') {
        if (!formData.config.url) {
          newErrors.url = 'PDF URL is required';
        }
      } else if (formData.type === 'firestore_collection') {
        if (!formData.config.collectionPath) {
          newErrors.collectionPath = 'Collection path is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateCurrentStep()) {
      setActiveStep(prev => prev + 1);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      // Prepare config based on type
      let config = { ...formData.config };

      if (formData.type === 'website') {
        config = {
          type: 'website',
          baseUrl: config.baseUrl,
          maxDepth: config.maxDepth || 3,
          maxPages: config.maxPages || 50,
          includePatterns: config.includePatterns || [],
          excludePatterns: config.excludePatterns || [],
          respectRobotsTxt: config.respectRobotsTxt !== false,
          rateLimitMs: config.rateLimitMs || 1000
        };
      } else if (formData.type === 'google_doc') {
        const documentId = extractGoogleDocId(config.shareableLink);
        config = {
          type: 'google_doc',
          shareableLink: config.shareableLink,
          documentId
        };
      } else if (formData.type === 'google_sheet') {
        const spreadsheetId = extractGoogleSheetId(config.shareableLink);
        config = {
          type: 'google_sheet',
          shareableLink: config.shareableLink,
          spreadsheetId,
          processAllSheets: config.processAllSheets !== false,
          specificSheets: config.specificSheets || []
        };
      } else if (formData.type === 'google_calendar') {
        const calendarId = extractGoogleCalendarId(config.shareableLink);
        config = {
          type: 'google_calendar',
          shareableLink: config.shareableLink,
          calendarId,
          daysAhead: config.daysAhead || 30,
          daysBack: config.daysBack || 30
        };
      } else if (formData.type === 'pdf_upload') {
        config = {
          type: 'pdf_upload',
          fileName: selectedFile?.name || config.fileName,
          fileSize: selectedFile?.size || config.fileSize,
          storagePath: '', // Will be set by the service
          uploadedAt: new Date()
        };
      } else if (formData.type === 'pdf_url') {
        config = {
          type: 'pdf_url',
          url: config.url,
          checkForUpdates: config.checkForUpdates !== false
        };
      } else if (formData.type === 'firestore_collection') {
        config = {
          type: 'firestore_collection',
          collectionPath: config.collectionPath,
          documentFields: config.documentFields || [],
          maxDocuments: config.maxDocuments || 1000,
          orderBy: config.orderBy,
          whereConditions: config.whereConditions || []
        };
      }

      const requestData: CreateKnowledgeSourceRequest = {
        name: formData.name.trim(),
        type: formData.type as KnowledgeSourceType,
        config,
        enabled: formData.enabled
      };

      await onSubmit(requestData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions to extract IDs from Google links
  const extractGoogleDocId = (link: string): string => {
    const match = link.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  const extractGoogleSheetId = (link: string): string => {
    const match = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  const extractGoogleCalendarId = (link: string): string => {
    const match = link.match(/calendar\/embed\?src=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  // Render type selection step
  const renderTypeSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Knowledge Source Type
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Select the type of knowledge source you want to add to your AI assistant.
      </Typography>
      
      <Box sx={{ display: 'grid', gap: 2, mt: 3 }}>
        {sourceTypes.map((sourceType) => (
          <Paper
            key={sourceType.type}
            sx={{
              p: 2,
              cursor: 'pointer',
              border: formData.type === sourceType.type ? 2 : 1,
              borderColor: formData.type === sourceType.type ? 'primary.main' : 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
            onClick={() => setFormData(prev => ({ ...prev, type: sourceType.type }))}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {sourceType.icon}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {sourceType.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sourceType.description}
                </Typography>
              </Box>
              {formData.type === sourceType.type && (
                <Chip label="Selected" color="primary" size="small" />
              )}
            </Box>
          </Paper>
        ))}
      </Box>
      
      {errors.type && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errors.type}
        </Alert>
      )}
    </Box>
  );

  // Render configuration step
  const renderConfiguration = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure {sourceTypes.find(t => t.type === formData.type)?.label}
      </Typography>
      
      {/* Common fields */}
      <TextField
        label="Source Name"
        fullWidth
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        error={!!errors.name}
        helperText={errors.name || 'A descriptive name for this knowledge source'}
        margin="normal"
        required
      />

      <FormControlLabel
        control={
          <Switch
            checked={formData.enabled}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
        }
        label="Enable this source"
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      {/* Type-specific configuration */}
      {formData.type === 'website' && renderWebsiteConfig()}
      {formData.type === 'google_doc' && renderGoogleDocConfig()}
      {formData.type === 'google_sheet' && renderGoogleSheetConfig()}
      {formData.type === 'google_calendar' && renderGoogleCalendarConfig()}
      {formData.type === 'pdf_upload' && renderPDFUploadConfig()}
      {formData.type === 'pdf_url' && renderPDFUrlConfig()}
      {formData.type === 'firestore_collection' && renderFirestoreConfig()}
    </Box>
  );

  // Type-specific configuration renderers
  const renderWebsiteConfig = () => (
    <Box>
      <TextField
        label="Website URL"
        fullWidth
        value={formData.config.baseUrl || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, baseUrl: e.target.value }
        }))}
        error={!!errors.baseUrl}
        helperText={errors.baseUrl || 'The base URL to start crawling from'}
        margin="normal"
        required
        placeholder="https://example.com"
      />
      
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
        <TextField
          label="Max Depth"
          type="number"
          value={formData.config.maxDepth || 3}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            config: { ...prev.config, maxDepth: parseInt(e.target.value) }
          }))}
          helperText="How many levels deep to crawl"
          InputProps={{ inputProps: { min: 1, max: 10 } }}
        />
        <TextField
          label="Max Pages"
          type="number"
          value={formData.config.maxPages || 50}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            config: { ...prev.config, maxPages: parseInt(e.target.value) }
          }))}
          helperText="Maximum pages to crawl"
          InputProps={{ inputProps: { min: 1, max: 1000 } }}
        />
      </Box>
    </Box>
  );

  const renderGoogleDocConfig = () => (
    <TextField
      label="Google Doc Shareable Link"
      fullWidth
      value={formData.config.shareableLink || ''}
      onChange={(e) => setFormData(prev => ({
        ...prev,
        config: { ...prev.config, shareableLink: e.target.value }
      }))}
      error={!!errors.shareableLink}
      helperText={errors.shareableLink || 'Paste the shareable link from Google Docs'}
      margin="normal"
      required
      placeholder="https://docs.google.com/document/d/..."
    />
  );

  const renderGoogleSheetConfig = () => (
    <Box>
      <TextField
        label="Google Sheet Shareable Link"
        fullWidth
        value={formData.config.shareableLink || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, shareableLink: e.target.value }
        }))}
        error={!!errors.shareableLink}
        helperText={errors.shareableLink || 'Paste the shareable link from Google Sheets'}
        margin="normal"
        required
        placeholder="https://docs.google.com/spreadsheets/d/..."
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={formData.config.processAllSheets !== false}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, processAllSheets: e.target.checked }
            }))}
          />
        }
        label="Process all sheets in the spreadsheet"
        sx={{ mt: 2 }}
      />
    </Box>
  );

  const renderGoogleCalendarConfig = () => (
    <Box>
      <TextField
        label="Google Calendar Shareable Link"
        fullWidth
        value={formData.config.shareableLink || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, shareableLink: e.target.value }
        }))}
        error={!!errors.shareableLink}
        helperText={errors.shareableLink || 'Paste the embed link from Google Calendar'}
        margin="normal"
        required
        placeholder="https://calendar.google.com/calendar/embed?src=..."
      />
      
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
        <TextField
          label="Days Back"
          type="number"
          value={formData.config.daysBack || 30}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            config: { ...prev.config, daysBack: parseInt(e.target.value) }
          }))}
          helperText="Past events to include"
          InputProps={{ inputProps: { min: 0, max: 365 } }}
        />
        <TextField
          label="Days Ahead"
          type="number"
          value={formData.config.daysAhead || 30}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            config: { ...prev.config, daysAhead: parseInt(e.target.value) }
          }))}
          helperText="Future events to include"
          InputProps={{ inputProps: { min: 0, max: 365 } }}
        />
      </Box>
    </Box>
  );

  const renderPDFUploadConfig = () => (
    <Box>
      <input
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        id="pdf-upload"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />
      <label htmlFor="pdf-upload">
        <Button
          component="span"
          variant="outlined"
          startIcon={<UploadIcon />}
          fullWidth
          sx={{ mb: 2 }}
        >
          {selectedFile ? selectedFile.name : 'Choose PDF File'}
        </Button>
      </label>
      
      {errors.file && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {errors.file}
        </Alert>
      )}
      
      {selectedFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            File: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderPDFUrlConfig = () => (
    <Box>
      <TextField
        label="PDF URL"
        fullWidth
        value={formData.config.url || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, url: e.target.value }
        }))}
        error={!!errors.url}
        helperText={errors.url || 'Direct URL to a PDF file'}
        margin="normal"
        required
        placeholder="https://example.com/document.pdf"
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={formData.config.checkForUpdates !== false}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              config: { ...prev.config, checkForUpdates: e.target.checked }
            }))}
          />
        }
        label="Check for updates automatically"
        sx={{ mt: 2 }}
      />
    </Box>
  );

  const renderFirestoreConfig = () => (
    <Box>
      <TextField
        label="Collection Path"
        fullWidth
        value={formData.config.collectionPath || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, collectionPath: e.target.value }
        }))}
        error={!!errors.collectionPath}
        helperText={errors.collectionPath || 'Firestore collection path (e.g., users, tickets/123/replies)'}
        margin="normal"
        required
        placeholder="collection_name"
      />
      
      <TextField
        label="Document Fields"
        fullWidth
        value={formData.config.documentFields?.join(', ') || ''}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { 
            ...prev.config, 
            documentFields: e.target.value.split(',').map(f => f.trim()).filter(f => f)
          }
        }))}
        helperText="Comma-separated list of fields to include (leave empty for all fields)"
        margin="normal"
        placeholder="title, content, description"
      />
      
      <TextField
        label="Max Documents"
        type="number"
        value={formData.config.maxDocuments || 1000}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          config: { ...prev.config, maxDocuments: parseInt(e.target.value) }
        }))}
        helperText="Maximum number of documents to query"
        margin="normal"
        InputProps={{ inputProps: { min: 1, max: 10000 } }}
      />
    </Box>
  );

  // Render review step
  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Configuration
      </Typography>
      
      <Paper sx={{ p: 2, bgcolor: 'background.default', border: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom color="text.primary">
          Source Details
        </Typography>
        <Typography variant="body2" color="text.primary">
          <strong>Name:</strong> {formData.name}
        </Typography>
        <Typography variant="body2" color="text.primary">
          <strong>Type:</strong> {sourceTypes.find(t => t.type === formData.type)?.label}
        </Typography>
        <Typography variant="body2" color="text.primary">
          <strong>Status:</strong> {formData.enabled ? 'Enabled' : 'Disabled'}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" gutterBottom color="text.primary">
          Configuration
        </Typography>
        {Object.entries(formData.config).map(([key, value]) => (
          <Typography key={key} variant="body2" color="text.primary">
            <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : String(value)}
          </Typography>
        ))}
      </Paper>
      
      <Alert severity="info" sx={{ mt: 2 }}>
        After creating this source, it will be processed according to your schedule settings. 
        You can manually trigger processing from the management page.
      </Alert>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>
        {initialData ? 'Edit Knowledge Source' : 'Add Knowledge Source'}
      </DialogTitle>

      <DialogContent dividers>
        {!initialData && (
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}

        {activeStep === 0 && renderTypeSelection()}
        {activeStep === 1 && renderConfiguration()}
        {activeStep === 2 && renderReview()}
        {initialData && renderConfiguration()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        
        {activeStep > 0 && !initialData && (
          <Button onClick={handleBack} disabled={isSubmitting}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 && !initialData ? (
          <Button onClick={handleNext} variant="contained" disabled={!formData.type && activeStep === 0}>
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Source' : 'Create Source')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default KnowledgeSourceFormDialog;