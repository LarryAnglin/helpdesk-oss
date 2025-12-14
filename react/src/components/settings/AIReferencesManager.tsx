/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { aiReferenceService, AIReference } from '../../lib/ai/referenceService';

interface AIReferencesManagerProps {
  enabled: boolean;
}

const AIReferencesManager = ({ enabled }: AIReferencesManagerProps) => {
  const [references, setReferences] = useState<AIReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<AIReference | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'json' as 'json' | 'pdf' | 'url' | 'markdown',
    content: '',
    url: '',
    metadata: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (enabled) {
      loadReferences();
    }
  }, [enabled]);

  const loadReferences = async () => {
    try {
      setLoading(true);
      const data = await aiReferenceService.getAllReferences();
      setReferences(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load references');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (reference?: AIReference) => {
    if (reference) {
      setEditingReference(reference);
      setFormData({
        title: reference.title,
        type: reference.type,
        content: reference.content,
        url: reference.url || '',
        metadata: reference.metadata ? JSON.stringify(reference.metadata, null, 2) : ''
      });
    } else {
      setEditingReference(null);
      setFormData({
        title: '',
        type: 'json',
        content: '',
        url: '',
        metadata: ''
      });
    }
    setFormError('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReference(null);
    setFormError('');
  };

  const handleSaveReference = async () => {
    try {
      setFormLoading(true);
      setFormError('');

      if (!formData.title.trim()) {
        setFormError('Title is required');
        return;
      }

      if (!formData.content.trim() && formData.type !== 'url') {
        setFormError('Content is required');
        return;
      }

      if (formData.type === 'url' && !formData.url.trim()) {
        setFormError('URL is required for URL references');
        return;
      }

      if (formData.type === 'json') {
        const jsonValidation = aiReferenceService.validateJSON(formData.content);
        if (!jsonValidation.isValid) {
          setFormError(`Invalid JSON: ${jsonValidation.error}`);
          return;
        }
      }

      let parsedMetadata = {};
      if (formData.metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(formData.metadata);
        } catch (err) {
          setFormError('Invalid metadata JSON format');
          return;
        }
      }

      const referenceData: any = {
        title: formData.title.trim(),
        type: formData.type,
        content: formData.content.trim()
      };

      // Only include url if it has a value
      if (formData.url.trim()) {
        referenceData.url = formData.url.trim();
      }

      // Only include metadata if it has content
      if (Object.keys(parsedMetadata).length > 0) {
        referenceData.metadata = parsedMetadata;
      }

      if (editingReference?.id) {
        await aiReferenceService.updateReference(editingReference.id, referenceData);
      } else {
        await aiReferenceService.addReference(referenceData);
      }

      await loadReferences();
      handleCloseDialog();

    } catch (err: any) {
      setFormError(err.message || 'Failed to save reference');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteReference = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reference?')) {
      return;
    }

    try {
      await aiReferenceService.deleteReference(id);
      await loadReferences();
    } catch (err: any) {
      setError(err.message || 'Failed to delete reference');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setFormLoading(true);
      let content = '';
      let type: 'json' | 'pdf' | 'url' | 'markdown' = 'json';

      if (file.type === 'application/pdf') {
        type = 'pdf';
        content = await aiReferenceService.extractTextFromPDF(file);
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        type = 'json';
        content = await file.text();
        
        const validation = aiReferenceService.validateJSON(content);
        if (!validation.isValid) {
          setFormError(`Invalid JSON file: ${validation.error}`);
          return;
        }
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        type = 'markdown';
        content = await file.text();
      } else {
        // Default to markdown for text files since it's more flexible
        type = 'markdown';
        content = await file.text();
      }

      setFormData(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        type,
        content,
        metadata: JSON.stringify({ originalFileName: file.name }, null, 2)
      }));

    } catch (err: any) {
      setFormError(err.message || 'Failed to process file');
    } finally {
      setFormLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'json': return <CodeIcon />;
      case 'markdown': return <DescriptionIcon />;
      case 'pdf': return <PictureAsPdfIcon />;
      case 'url': return <LinkIcon />;
      default: return <CodeIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'json': return 'primary';
      case 'markdown': return 'info';
      case 'pdf': return 'error';
      case 'url': return 'success';
      default: return 'default';
    }
  };

  if (!enabled) {
    return (
      <Card sx={{ mt: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" align="center">
            Enable AI Self-Help System above to configure reference materials
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Reference Materials
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          Add Reference
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add reference materials like JSON data, PDF documents, and web content that the AI will use for answering questions.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Content Preview</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {references.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No references found. Add your first reference to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                references.map((reference) => (
                  <TableRow key={reference.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon(reference.type)}
                        {reference.title}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={reference.type.toUpperCase()}
                        color={getTypeColor(reference.type) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {reference.content}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(reference)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReference(reference.id!)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingReference ? 'Edit Reference' : 'Add Reference'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab label="Manual Entry" />
            <Tab label="File Upload" />
          </Tabs>

          {tabValue === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                size="small"
              />
              
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <MenuItem value="json">JSON Data</MenuItem>
                  <MenuItem value="markdown">Markdown</MenuItem>
                  <MenuItem value="url">Web URL</MenuItem>
                </Select>
              </FormControl>

              {formData.type === 'url' && (
                <TextField
                  fullWidth
                  label="URL"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  size="small"
                  placeholder="https://example.com/documentation"
                />
              )}

              <TextField
                fullWidth
                label="Content"
                multiline
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={
                  formData.type === 'json' 
                    ? 'Enter JSON data...' 
                    : formData.type === 'markdown'
                    ? 'Enter Markdown content...\n\n# Main Heading\n## Section\n- List item\n**Bold text**\n`code`'
                    : 'Enter content...'
                }
              />
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 1 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={formLoading}
                sx={{ mb: 2 }}
              >
                Upload File
                <input
                  type="file"
                  hidden
                  accept=".json,.pdf,.txt,.md,.markdown"
                  onChange={handleFileUpload}
                />
              </Button>
              
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Supported formats: JSON (.json), Markdown (.md, .markdown), PDF (.pdf), Text (.txt)
              </Typography>

              {formData.content && (
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  size="small"
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveReference}
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIReferencesManager;