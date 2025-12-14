/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Chip,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import { useAuth } from '../lib/auth/AuthContext';
import { hasRole } from '../lib/utils/roleUtils';
import { API_ENDPOINTS } from '../lib/apiConfig';
import ErrorDisplay from '../components/error/ErrorDisplay';

interface FieldMapping {
  [csvField: string]: string;
}

interface ImportResults {
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
    record: any;
  }>;
  importId?: string;
  dryRun?: boolean;
}

const TICKET_FIELDS = [
  { value: '', label: 'Do not import' },
  { value: 'id', label: 'Ticket ID' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'location', label: 'Location' },
  { value: 'computer', label: 'Computer' },
  { value: 'submitterName', label: 'Submitter Name' },
  { value: 'submitterEmail', label: 'Submitter Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'contactMethod', label: 'Contact Method' },
  { value: 'assigneeEmail', label: 'Assignee Email' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'resolvedAt', label: 'Resolved Date' },
  { value: 'isOnVpn', label: 'On VPN' }
];

const ImportPage = () => {
  const { user, userData } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [error, setError] = useState<any>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  
  // Options
  const [duplicateHandling, setDuplicateHandling] = useState<string>('skip');
  const [createMissingUsers, setCreateMissingUsers] = useState<boolean>(false);
  const [preserveTimestamps, setPreserveTimestamps] = useState<boolean>(true);
  const [preserveIds, setPreserveIds] = useState<boolean>(false);
  const [defaultStatus, setDefaultStatus] = useState<string>('Open');
  const [defaultPriority, setDefaultPriority] = useState<string>('Medium');

  const steps = ['Upload File', 'Configure Import', 'Preview & Options', 'Import'];

  // Check if user is admin
  if (!hasRole(userData?.role, 'system_admin')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Access Denied</AlertTitle>
          Only administrators can import tickets.
        </Alert>
      </Box>
    );
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isJSON = fileName.endsWith('.json');

    if (!isCSV && !isJSON) {
      setError({
        id: `UPLOAD_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'INVALID_FILE_TYPE',
        message: 'Please select a CSV or JSON file.',
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check file size (warn if > 5MB, require confirmation if > 10MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 10) {
      if (!confirm(`Large file detected (${fileSizeMB.toFixed(1)}MB). This may take several minutes to process. Continue?`)) {
        return;
      }
    } else if (fileSizeMB > 5) {
      alert(`Large file detected (${fileSizeMB.toFixed(1)}MB). Processing may take a few minutes.`);
    }

    setImportFile(file);
    setFileType(isCSV ? 'csv' : 'json');
    setError(null);
    setUploadProgress(0);

    const reader = new FileReader();
    
    // Show progress for large files
    if (fileSizeMB > 2) {
      setCurrentOperation('Reading file...');
      setLoading(true);
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      
      setCurrentOperation('Parsing file...');
      
      // Use setTimeout to allow UI to update
      setTimeout(() => {
        try {
          if (isCSV) {
            parseCsvPreview(content);
          } else {
            parseJsonPreview(content);
          }
        } finally {
          setLoading(false);
          setUploadProgress(0);
          setCurrentOperation('');
        }
      }, 100);
    };

    reader.onerror = () => {
      setError({
        id: `READ_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'FILE_READ_ERROR',
        message: 'Failed to read file. Please try again.',
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
      setLoading(false);
      setUploadProgress(0);
      setCurrentOperation('');
    };

    reader.readAsText(file);
  };

  const parseCsvPreview = (content: string) => {
    const lines = content.split('\n');
    if (lines.length < 2) {
      setError({
        id: `PARSE_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'INVALID_CSV',
        message: 'CSV file must contain at least a header row and one data row.',
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    setCsvHeaders(headers);

    // Parse sample data (first 5 rows)
    const sample = [];
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        sample.push(row);
      }
    }
    setSampleData(sample);

    // Auto-generate field mapping
    const autoMapping: FieldMapping = {};
    headers.forEach(header => {
      const normalized = header.toLowerCase().trim();
      const match = TICKET_FIELDS.find(field => {
        if (!field.value) return false;
        const fieldLower = field.label.toLowerCase();
        return normalized.includes(fieldLower) || fieldLower.includes(normalized);
      });
      if (match) {
        autoMapping[header] = match.value;
      }
    });
    setFieldMapping(autoMapping);

    setActiveStep(1);
  };

  const parseJsonPreview = (content: string) => {
    try {
      const data = JSON.parse(content);
      
      // Extract preview data for display
      let tickets = [];
      if (Array.isArray(data)) {
        tickets = data.slice(0, 5); // First 5 tickets
      } else if (data.tickets && Array.isArray(data.tickets)) {
        tickets = data.tickets.slice(0, 5);
      } else if (data.data && Array.isArray(data.data)) {
        tickets = data.data.slice(0, 5);
      } else if (typeof data === 'object' && data.id) {
        tickets = [data];
      }
      
      setSampleData(tickets);
      setActiveStep(1);
      
    } catch (parseError) {
      setError({
        id: `PARSE_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'INVALID_JSON',
        message: 'Invalid JSON format. Please check your file.',
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleFieldMappingChange = (csvField: string, ticketField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvField]: ticketField
    }));
  };

  const validateMapping = () => {
    const requiredFields = ['title', 'description', 'submitterEmail'];
    const mappedFields = Object.values(fieldMapping).filter(Boolean);
    
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingRequired.length > 0) {
      setError({
        id: `VALIDATION_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'MISSING_REQUIRED_FIELDS',
        message: `Required fields not mapped: ${missingRequired.join(', ')}`,
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
      return false;
    }

    return true;
  };

  const handlePreview = async () => {
    if (fileType === 'csv' && !validateMapping()) return;

    setError(null);
    setLoading(true);
    setCurrentOperation('Validating import data...');
    setProcessingProgress(0);

    try {
      const isJSON = fileType === 'json';
      const endpoint = isJSON ? 'import-json' : 'import-csv';
      
      const requestBody = isJSON ? {
        jsonContent: fileContent,
        options: {
          duplicateHandling,
          createMissingUsers,
          preserveTimestamps,
          preserveIds,
          defaultStatus,
          defaultPriority,
          dryRun: true
        }
      } : {
        csvContent: fileContent,
        fieldMapping,
        options: {
          duplicateHandling,
          createMissingUsers,
          defaultStatus,
          defaultPriority,
          dryRun: true
        }
      };

      const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', endpoint)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      setProcessingProgress(100);
      const result = await response.json();
      setImportResults(result.results);
      setActiveStep(2);

    } catch (err) {
      console.error('Preview error:', err);
      
      let errorInfo;
      try {
        const errorData = JSON.parse((err as Error).message);
        errorInfo = errorData.error ? { message: errorData.error } : errorData;
      } catch (parseError) {
        errorInfo = {
          id: `PREVIEW_${Date.now()}`,
          type: 'CLIENT_ERROR',
          code: 'PREVIEW_ERROR',
          message: 'Failed to preview import. Please check your CSV and try again.',
          action: 'RETRY',
          timestamp: new Date().toISOString()
        };
      }
      
      setError(errorInfo);
    } finally {
      setLoading(false);
      setProcessingProgress(0);
      setCurrentOperation('');
    }
  };

  const handleImport = async () => {
    setError(null);
    setLoading(true);
    setCurrentOperation('Importing tickets...');
    setProcessingProgress(0);

    try {
      const isJSON = fileType === 'json';
      const endpoint = isJSON ? 'import-json' : 'import-csv';
      
      const requestBody = isJSON ? {
        jsonContent: fileContent,
        options: {
          duplicateHandling,
          createMissingUsers,
          preserveTimestamps,
          preserveIds,
          defaultStatus,
          defaultPriority,
          dryRun: false
        }
      } : {
        csvContent: fileContent,
        fieldMapping,
        options: {
          duplicateHandling,
          createMissingUsers,
          defaultStatus,
          defaultPriority,
          dryRun: false
        }
      };

      const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', endpoint)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const result = await response.json();
      setImportResults(result.results);
      setActiveStep(3);

    } catch (err) {
      console.error('Import error:', err);
      
      let errorInfo;
      try {
        const errorData = JSON.parse((err as Error).message);
        errorInfo = errorData.error ? { message: errorData.error } : errorData;
      } catch (parseError) {
        errorInfo = {
          id: `IMPORT_${Date.now()}`,
          type: 'CLIENT_ERROR',
          code: 'IMPORT_ERROR',
          message: 'Failed to import tickets. Please try again.',
          action: 'RETRY',
          timestamp: new Date().toISOString()
        };
      }
      
      setError(errorInfo);
    } finally {
      setLoading(false);
      setProcessingProgress(0);
      setCurrentOperation('');
    }
  };

  const handleRollback = async (importId: string) => {
    if (!confirm('Are you sure you want to rollback this import? This will delete all imported tickets and restore any updated tickets to their previous state.')) {
      return;
    }

    setLoading(true);
    setCurrentOperation('Rolling back import...');

    try {
      const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'rollback-import')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          importId,
          dryRun: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const result = await response.json();
      
      alert(`Import rollback completed successfully!\n\nTickets deleted: ${result.results.ticketsDeleted}\nTickets restored: ${result.results.ticketsRestored}\nUsers deleted: ${result.results.usersDeleted}`);
      
      // Reset to allow new import
      resetImport();

    } catch (err) {
      console.error('Rollback error:', err);
      
      let errorInfo;
      try {
        const errorData = JSON.parse((err as Error).message);
        errorInfo = errorData.error ? { message: errorData.error } : errorData;
      } catch (parseError) {
        errorInfo = {
          id: `ROLLBACK_${Date.now()}`,
          type: 'CLIENT_ERROR',
          code: 'ROLLBACK_ERROR',
          message: 'Failed to rollback import. Please try again.',
          action: 'RETRY',
          timestamp: new Date().toISOString()
        };
      }
      
      setError(errorInfo);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const resetImport = () => {
    setActiveStep(0);
    setImportFile(null);
    setFileContent('');
    setFileType('csv');
    setCsvHeaders([]);
    setSampleData([]);
    setFieldMapping({});
    setImportResults(null);
    setError(null);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Import Tickets
      </Typography>

      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => setError(null)}
          onDismiss={() => setError(null)}
          showTechnicalDetails={true}
          sx={{ mb: 3 }}
        />
      )}

      {loading && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="h6">
              {currentOperation || 'Processing...'}
            </Typography>
          </Box>
          
          {uploadProgress > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                File Upload Progress
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {uploadProgress}% complete
              </Typography>
            </Box>
          )}
          
          {processingProgress > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Processing Progress
              </Typography>
              <LinearProgress variant="determinate" value={processingProgress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {processingProgress}% complete
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: File Upload */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Upload File
            </Typography>
            
            <Box
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                mb: 3,
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Choose file to import
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click here or drag and drop your CSV or JSON file
              </Typography>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </Box>

            {importFile && (
              <Alert severity="info" sx={{ mt: 2 }}>
                File selected: {importFile.name} ({Math.round(importFile.size / 1024)} KB) - {fileType.toUpperCase()} format
              </Alert>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>File Format Requirements</AlertTitle>
              <Typography variant="subtitle2" gutterBottom>CSV Format:</Typography>
              <ul>
                <li>First row must contain column headers</li>
                <li>Required fields: Title, Description, Submitter Email</li>
                <li>Date format: YYYY-MM-DD or MM/DD/YYYY</li>
              </ul>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>JSON Format:</Typography>
              <ul>
                <li>Array of ticket objects or object with 'tickets' array</li>
                <li>Required fields: title, description, email or submitterEmail</li>
                <li>Supports nested data: replies, attachments, customFields</li>
                <li>Preserves relationships and complex data structures</li>
              </ul>
            </Alert>
          </Box>
        )}

        {/* Step 1: Configure Import */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {fileType === 'csv' ? 'Map CSV Fields to Ticket Fields' : 'JSON Import Preview'}
            </Typography>

            {fileType === 'csv' ? (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>CSV Column</TableCell>
                      <TableCell>Sample Data</TableCell>
                      <TableCell>Maps To</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {csvHeaders.map((header) => (
                      <TableRow key={header}>
                        <TableCell>
                          <Typography variant="subtitle2">{header}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {sampleData[0]?.[header] || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={fieldMapping[header] || ''}
                              onChange={(e) => handleFieldMappingChange(header, e.target.value)}
                            >
                              {TICKET_FIELDS.map((field) => (
                                <MenuItem key={field.value} value={field.value}>
                                  {field.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <AlertTitle>JSON Structure Detected</AlertTitle>
                  Found {sampleData.length} ticket{sampleData.length !== 1 ? 's' : ''} in the JSON file. 
                  No field mapping required - JSON import preserves all data structure.
                </Alert>
                
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxHeight: 400 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Sample Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleData[0] && Object.entries(sampleData[0]).slice(0, 10).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell>
                            <Typography variant="subtitle2">{key}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {typeof value === 'object' 
                                ? `${Array.isArray(value) ? 'Array' : 'Object'} (${Array.isArray(value) ? value.length : Object.keys(value || {}).length} items)`
                                : String(value).substring(0, 100) + (String(value).length > 100 ? '...' : '')
                              }
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button 
                variant="contained" 
                onClick={handlePreview}
                disabled={loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Preview Import'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 2: Preview & Options */}
        {activeStep === 2 && importResults && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Import Preview & Options
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Import Summary
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip label={`${importResults.total} Total Records`} color="primary" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                      <Typography>{importResults.created} will be created</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <WarningIcon color="warning" fontSize="small" />
                      <Typography>{importResults.updated} will be updated</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography color="text.secondary">{importResults.skipped} will be skipped</Typography>
                    </Box>
                    {importResults.errors.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorIcon color="error" fontSize="small" />
                        <Typography color="error">{importResults.errors.length} errors found</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Import Options
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Duplicate Handling
                    </Typography>
                    <RadioGroup
                      value={duplicateHandling}
                      onChange={(e) => setDuplicateHandling(e.target.value)}
                      sx={{ mb: 2 }}
                    >
                      <FormControlLabel value="skip" control={<Radio />} label="Skip duplicates" />
                      <FormControlLabel value="update" control={<Radio />} label="Update existing" />
                      <FormControlLabel value="create" control={<Radio />} label="Create new copies" />
                    </RadioGroup>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={createMissingUsers}
                          onChange={(e) => setCreateMissingUsers(e.target.checked)}
                        />
                      }
                      label="Create missing users"
                      sx={{ mb: 2 }}
                    />

                    {fileType === 'json' && (
                      <>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={preserveTimestamps}
                              onChange={(e) => setPreserveTimestamps(e.target.checked)}
                            />
                          }
                          label="Preserve original timestamps"
                          sx={{ mb: 2 }}
                        />

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={preserveIds}
                              onChange={(e) => setPreserveIds(e.target.checked)}
                            />
                          }
                          label="Preserve original ticket IDs"
                          sx={{ mb: 2 }}
                        />
                      </>
                    )}

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Default Status</InputLabel>
                        <Select
                          value={defaultStatus}
                          label="Default Status"
                          onChange={(e) => setDefaultStatus(e.target.value)}
                        >
                          <MenuItem value="Open">Open</MenuItem>
                          <MenuItem value="In Progress">In Progress</MenuItem>
                          <MenuItem value="Resolved">Resolved</MenuItem>
                          <MenuItem value="Closed">Closed</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Default Priority</InputLabel>
                        <Select
                          value={defaultPriority}
                          label="Default Priority"
                          onChange={(e) => setDefaultPriority(e.target.value)}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                          <MenuItem value="Urgent">Urgent</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {importResults.errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Validation Errors</AlertTitle>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {importResults.errors.map((error, index) => (
                    <Typography key={index} variant="body2">
                      Row {error.row}: {error.error}
                    </Typography>
                  ))}
                </Box>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button 
                variant="contained" 
                onClick={handleImport}
                disabled={loading || importResults.errors.length > 0}
              >
                {loading ? <CircularProgress size={20} /> : 'Import Tickets'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 3: Results */}
        {activeStep === 3 && importResults && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Import Complete
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>Import Successful</AlertTitle>
              Successfully imported {importResults.created} tickets and updated {importResults.updated} tickets.
            </Alert>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Final Results
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 150px' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {importResults.total}
                      </Typography>
                      <Typography variant="body2">Total Processed</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {importResults.created}
                      </Typography>
                      <Typography variant="body2">Created</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {importResults.updated}
                      </Typography>
                      <Typography variant="body2">Updated</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ flex: '1 1 150px' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="text.secondary">
                        {importResults.skipped}
                      </Typography>
                      <Typography variant="body2">Skipped</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" onClick={resetImport}>
                Import Another File
              </Button>
              
              {importResults && !importResults.dryRun && importResults.importId && (
                <Button 
                  variant="outlined" 
                  color="warning"
                  onClick={() => handleRollback(importResults.importId!)}
                >
                  Rollback This Import
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ImportPage;