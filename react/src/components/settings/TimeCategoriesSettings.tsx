/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { TimeCategory, TimeEntryType } from '../../lib/types/timeTracking';
import { 
  getTimeCategories, 
  createTimeCategory, 
  updateTimeCategory, 
  deleteTimeCategory 
} from '../../lib/firebase/timeTrackingService';

interface TimeCategoriesSettingsProps {
  onUpdate?: () => void;
}

const TimeCategoriesSettings: React.FC<TimeCategoriesSettingsProps> = ({ onUpdate }) => {
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TimeCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'active' as TimeEntryType,
    description: '',
    hourlyRate: 0,
    isBillable: true,
    color: '#4CAF50'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeTypeOptions = [
    { value: 'active', label: 'Active Work', description: 'Direct work on tasks' },
    { value: 'research', label: 'Research', description: 'Learning and investigation' },
    { value: 'waiting', label: 'Waiting', description: 'Waiting for external input' },
    { value: 'travel', label: 'Travel', description: 'Travel time' },
    { value: 'administrative', label: 'Administrative', description: 'Admin tasks' }
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getTimeCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading time categories:', error);
      setError('Failed to load time categories');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: TimeCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      description: category.description || '',
      hourlyRate: category.hourlyRate,
      isBillable: category.isBillable,
      color: category.color || '#4CAF50'
    });
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'active',
      description: '',
      hourlyRate: 0,
      isBillable: true,
      color: '#4CAF50'
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!formData.name.trim()) {
        setError('Category name is required');
        return;
      }

      if (formData.hourlyRate < 0) {
        setError('Hourly rate cannot be negative');
        return;
      }

      if (editingCategory) {
        // Update existing category
        await updateTimeCategory(editingCategory.id, formData);
      } else {
        // Create new category
        await createTimeCategory(formData);
      }

      await loadCategories();
      setDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: TimeCategory) => {
    if (!confirm(`Are you sure you want to delete the "${category.name}" category? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteTimeCategory(category.id);
      await loadCategories();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTypeLabel = (type: TimeEntryType) => {
    const option = timeTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Time Categories & Billing Rates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure different types of work and their billing rates. These categories are used when tracking time on tickets.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add Category
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Hourly Rate</TableCell>
                <TableCell align="center">Billable</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: category.color || '#4CAF50'
                        }}
                      />
                      <Typography variant="body2" fontWeight={category.isDefault ? 'bold' : 'normal'}>
                        {category.name}
                        {category.isDefault && (
                          <Chip label="Default" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{getTypeLabel(category.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {category.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      <MoneyIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(category.hourlyRate)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={category.isBillable ? 'Billable' : 'Non-billable'}
                      color={category.isBillable ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit category">
                      <IconButton size="small" onClick={() => handleEdit(category)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!category.isDefault && (
                      <Tooltip title="Delete category">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(category)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCategory ? 'Edit Time Category' : 'Add Time Category'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Category Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />

              <TextField
                select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as TimeEntryType })}
                fullWidth
                SelectProps={{ native: true }}
              >
                {timeTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </TextField>

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Optional description of this category"
              />

              <TextField
                label="Hourly Rate"
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                fullWidth
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isBillable}
                    onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                  />
                }
                label="Billable to customers"
              />

              <TextField
                label="Color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                sx={{ width: 120 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={saving}
            >
              {saving ? <CircularProgress size={20} /> : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TimeCategoriesSettings;