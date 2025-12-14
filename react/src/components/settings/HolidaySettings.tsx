/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Holiday } from '../../lib/types/sla';

interface HolidaySettingsProps {
  holidays: Holiday[];
  onHolidaysChange: (holidays: Holiday[]) => void;
  disabled?: boolean;
}

interface HolidayFormData {
  name: string;
  date: string;
  isRecurring: boolean;
  description: string;
}

const HolidaySettings: React.FC<HolidaySettingsProps> = ({
  holidays,
  onHolidaysChange,
  disabled = false
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<HolidayFormData>({
    name: '',
    date: '',
    isRecurring: false,
    description: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<HolidayFormData>>({});

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      isRecurring: false,
      description: ''
    });
    setFormErrors({});
    setEditingHoliday(null);
  };

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        isRecurring: holiday.isRecurring,
        description: holiday.description || ''
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const validateForm = (): boolean => {
    const errors: Partial<HolidayFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Holiday name is required';
    }

    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      // Check if date is valid
      const date = new Date(formData.date);
      if (isNaN(date.getTime())) {
        errors.date = 'Invalid date format';
      }
    }

    // Check for duplicate names (excluding current holiday if editing)
    const duplicateName = holidays.some(h => 
      h.name.toLowerCase() === formData.name.toLowerCase() && 
      h.id !== editingHoliday?.id
    );
    
    if (duplicateName) {
      errors.name = 'A holiday with this name already exists';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const newHoliday: Holiday = {
      id: editingHoliday?.id || `holiday-${Date.now()}`,
      name: formData.name.trim(),
      date: formData.date,
      isRecurring: formData.isRecurring
    };
    
    // Only add description if it has a value
    if (formData.description.trim()) {
      newHoliday.description = formData.description.trim();
    }

    let updatedHolidays: Holiday[];
    if (editingHoliday) {
      // Update existing holiday
      updatedHolidays = holidays.map(h => h.id === editingHoliday.id ? newHoliday : h);
    } else {
      // Add new holiday
      updatedHolidays = [...holidays, newHoliday];
    }

    // Sort holidays by date
    updatedHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    onHolidaysChange(updatedHolidays);
    handleCloseDialog();
  };

  const handleDelete = (holidayId: string) => {
    const updatedHolidays = holidays.filter(h => h.id !== holidayId);
    onHolidaysChange(updatedHolidays);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCurrentYear = () => new Date().getFullYear();

  const getNextOccurrence = (holiday: Holiday) => {
    if (!holiday.isRecurring) {
      return holiday.date;
    }

    const currentYear = getCurrentYear();
    const holidayDate = new Date(holiday.date);
    const thisYearDate = new Date(currentYear, holidayDate.getMonth(), holidayDate.getDate());
    
    // If this year's occurrence has passed, show next year
    if (thisYearDate < new Date()) {
      const nextYearDate = new Date(currentYear + 1, holidayDate.getMonth(), holidayDate.getDate());
      return nextYearDate.toISOString().split('T')[0];
    }
    
    return thisYearDate.toISOString().split('T')[0];
  };

  // Get some common US holidays as suggestions
  const getCommonHolidays = () => {
    const currentYear = getCurrentYear();
    return [
      { name: "New Year's Day", date: `${currentYear}-01-01`, isRecurring: true },
      { name: "Independence Day", date: `${currentYear}-07-04`, isRecurring: true },
      { name: "Christmas Day", date: `${currentYear}-12-25`, isRecurring: true },
      { name: "Thanksgiving", date: `${currentYear}-11-28`, isRecurring: true },
      { name: "Labor Day", date: `${currentYear}-09-02`, isRecurring: true }
    ];
  };

  const addCommonHoliday = (commonHoliday: { name: string; date: string; isRecurring: boolean }) => {
    // Check if holiday already exists
    if (holidays.some(h => h.name.toLowerCase() === commonHoliday.name.toLowerCase())) {
      return;
    }

    const newHoliday: Holiday = {
      id: `holiday-${Date.now()}`,
      ...commonHoliday
    };

    const updatedHolidays = [...holidays, newHoliday];
    updatedHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    onHolidaysChange(updatedHolidays);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Holidays
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          onClick={() => handleOpenDialog()}
          disabled={disabled}
        >
          Add Holiday
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure holidays that will be excluded from business hours for SLA calculations. 
        Recurring holidays will automatically apply to future years.
      </Typography>

      {holidays.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No holidays configured. Business hours will apply every day that you've selected above.
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Holiday Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Next Occurrence</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {holiday.name}
                      </Typography>
                      {holiday.description && (
                        <Typography variant="caption" color="text.secondary">
                          {holiday.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {formatDate(holiday.date)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={holiday.isRecurring ? 'Annual' : 'One-time'} 
                      size="small"
                      color={holiday.isRecurring ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {holiday.isRecurring ? (
                      <Typography variant="body2">
                        {formatDate(getNextOccurrence(holiday))}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(holiday.date) < new Date() ? 'Past' : formatDate(holiday.date)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(holiday)}
                      disabled={disabled}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(holiday.id)}
                      disabled={disabled}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Quick add common holidays */}
      {holidays.length === 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Quick add common US holidays:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {getCommonHolidays().map((holiday) => (
              <Button
                key={holiday.name}
                size="small"
                variant="outlined"
                onClick={() => addCommonHoliday(holiday)}
                disabled={disabled}
              >
                {holiday.name}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Holiday Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={!!formErrors.name}
              helperText={formErrors.name}
              placeholder="e.g., Christmas Day, Company Anniversary"
            />

            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              error={!!formErrors.date}
              helperText={formErrors.date}
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
              }
              label="Recurring Holiday (repeats annually)"
            />

            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional notes about this holiday"
            />

            {formData.isRecurring && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This holiday will automatically apply to the same date every year for SLA calculations.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingHoliday ? 'Update' : 'Add'} Holiday
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidaySettings;