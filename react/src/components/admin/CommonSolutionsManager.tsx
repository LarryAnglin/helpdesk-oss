/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
  Launch as LaunchIcon,
  TextSnippet as TextIcon
} from '@mui/icons-material';
import { CommonSolution } from '../../lib/types/commonSolutions';
import {
  getAllCommonSolutions,
  createCommonSolution,
  updateCommonSolution,
  deleteCommonSolution
} from '../../lib/firebase/commonSolutionsService';

const CommonSolutionsManager = () => {
  const [solutions, setSolutions] = useState<CommonSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<CommonSolution | null>(null);
  const [formData, setFormData] = useState({ title: '', link: '', inlineText: '', isActive: true, order: 0 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [solutionToDelete, setSolutionToDelete] = useState<CommonSolution | null>(null);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    try {
      setLoading(true);
      const allSolutions = await getAllCommonSolutions();
      setSolutions(allSolutions);
    } catch (error) {
      console.error('Error loading solutions:', error);
      showSnackbar('Failed to load common solutions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (solution?: CommonSolution) => {
    if (solution) {
      setEditingSolution(solution);
      setFormData({
        title: solution.title,
        link: solution.link,
        inlineText: solution.inlineText || '',
        isActive: solution.isActive,
        order: solution.order
      });
    } else {
      setEditingSolution(null);
      setFormData({
        title: '',
        link: '',
        inlineText: '',
        isActive: true,
        order: Math.max(...solutions.map(s => s.order), 0) + 1
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSolution(null);
    setFormData({ title: '', link: '', inlineText: '', isActive: true, order: 0 });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showSnackbar('Title is required', 'error');
      return;
    }

    // Either link or inline text is required
    if (!formData.link.trim() && !formData.inlineText.trim()) {
      showSnackbar('Either a link or inline text is required', 'error');
      return;
    }

    try {
      if (editingSolution) {
        await updateCommonSolution({
          id: editingSolution.id,
          title: formData.title.trim(),
          link: formData.link.trim(),
          inlineText: formData.inlineText.trim() || undefined,
          isActive: formData.isActive,
          order: formData.order
        });
        showSnackbar('Common solution updated successfully', 'success');
      } else {
        await createCommonSolution({
          title: formData.title.trim(),
          link: formData.link.trim(),
          inlineText: formData.inlineText.trim() || undefined,
          isActive: formData.isActive,
          order: formData.order
        });
        showSnackbar('Common solution created successfully', 'success');
      }

      handleCloseDialog();
      loadSolutions();
    } catch (error) {
      console.error('Error saving solution:', error);
      showSnackbar('Failed to save common solution', 'error');
    }
  };

  const handleDeleteClick = (solution: CommonSolution) => {
    setSolutionToDelete(solution);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!solutionToDelete) return;

    try {
      await deleteCommonSolution(solutionToDelete.id);
      showSnackbar('Common solution deleted successfully', 'success');
      setDeleteDialogOpen(false);
      setSolutionToDelete(null);
      loadSolutions();
    } catch (error) {
      console.error('Error deleting solution:', error);
      showSnackbar('Failed to delete common solution', 'error');
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Common Solutions Manager
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage common solutions displayed on the login page to help users quickly find answers.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Solution
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {solutions.map((solution) => (
                <TableRow key={solution.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <DragHandleIcon color="action" sx={{ mr: 1, cursor: 'grab' }} />
                      {solution.order}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {solution.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {solution.inlineText ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Tooltip title="Inline text solution">
                          <TextIcon fontSize="small" color="action" />
                        </Tooltip>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {solution.inlineText}
                        </Typography>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {solution.link}
                        </Typography>
                        <IconButton
                          size="small"
                          href={solution.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LaunchIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={solution.isActive ? 'Active' : 'Inactive'}
                      color={solution.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(solution)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(solution)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {solutions.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              No common solutions created yet. Add some to help users find quick answers.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSolution ? 'Edit Common Solution' : 'Add Common Solution'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
              helperText="The title displayed to users"
            />

            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
              Provide either a link to an external page OR inline text for simple solutions. If both are provided, inline text takes priority.
            </Alert>

            <TextField
              fullWidth
              label="Link (URL)"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              margin="normal"
              placeholder="https://..."
              helperText="External link to a help page or documentation"
              disabled={!!formData.inlineText}
            />

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 1 }}>
              — OR —
            </Typography>

            <TextField
              fullWidth
              label="Inline Text"
              value={formData.inlineText}
              onChange={(e) => setFormData({ ...formData, inlineText: e.target.value })}
              margin="normal"
              multiline
              rows={4}
              placeholder="Enter a short explanation that will be displayed directly to users..."
              helperText="Simple text shown in an expandable panel (best for brief instructions)"
              disabled={!!formData.link}
            />

            <TextField
              fullWidth
              label="Order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              margin="normal"
              helperText="Lower numbers appear first"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active (visible to users)"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSolution ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Common Solution</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{solutionToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CommonSolutionsManager;