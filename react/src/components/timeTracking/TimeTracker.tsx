/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Add,
  Timer,
  AccessTime,
  AttachMoney,
  Edit,
  Delete
} from '@mui/icons-material';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTenant } from '../../lib/context/TenantContext';
import {
  TimeCategory,
  TimeEntry,
  ActiveTimer,
  TimeEntryFormData
} from '../../lib/types/timeTracking';
import {
  getTimeCategories,
  startTimeSession,
  stopTimeSession,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntriesForTicket,
  subscribeToActiveTimers
} from '../../lib/firebase/timeTrackingService';
import { formatDuration, formatCurrency } from '../../lib/utils/timeUtils';

interface TimeTrackerProps {
  ticketId: string;
  onTimeEntryChange?: () => void;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ ticketId, onTimeEntryChange }) => {
  const { user, userData } = useAuth();
  const { currentTenant } = useTenant();
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [timerDescription, setTimerDescription] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [manualEntryData, setManualEntryData] = useState<TimeEntryFormData>({
    categoryId: '',
    description: '',
    startTime: Date.now(),
    endTime: Date.now(),
    duration: 0
  });

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [categoriesData, entriesData] = await Promise.all([
          getTimeCategories(),
          getTimeEntriesForTicket(ticketId)
        ]);
        
        setCategories(categoriesData);
        setTimeEntries(entriesData);
        
        // Set default category
        const defaultCategory = categoriesData.find(cat => cat.isDefault);
        if (defaultCategory) {
          setSelectedCategoryId(defaultCategory.id);
        }
      } catch (err) {
        console.error('Error loading time tracking data:', err);
        setError('Failed to load time tracking data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [ticketId]);

  // Subscribe to active timers
  useEffect(() => {
    if (!user || !currentTenant?.id) return;

    const unsubscribe = subscribeToActiveTimers(user.uid, currentTenant.id, (timers: ActiveTimer[]) => {
      setActiveTimers(timers);
    });

    return unsubscribe;
  }, [user, currentTenant?.id]);

  // Update active timer elapsed time every minute
  useEffect(() => {
    if (activeTimers.length === 0) return;

    const interval = setInterval(() => {
      setActiveTimers(prevTimers =>
        prevTimers.map(timer => ({
          ...timer,
          elapsedMinutes: Math.round((Date.now() - timer.startTime) / 60000)
        }))
      );
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [activeTimers]);

  const handleStartTimer = async () => {
    if (!user || !userData || !selectedCategoryId) return;

    try {
      await startTimeSession(ticketId, user.uid, selectedCategoryId, timerDescription);
      setTimerDescription('');
      setError(null);
    } catch (err) {
      console.error('Error starting timer:', err);
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handleStopTimer = async (sessionId: string) => {
    if (!user || !userData) return;

    try {
      await stopTimeSession(sessionId, user.uid, userData.email, userData.displayName || userData.email);
      
      // Refresh time entries
      const updatedEntries = await getTimeEntriesForTicket(ticketId);
      setTimeEntries(updatedEntries);
      setError(null);
      
      if (onTimeEntryChange) {
        onTimeEntryChange();
      }
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const handleManualEntrySubmit = async () => {
    if (!user || !userData || !manualEntryData.categoryId || !currentTenant?.id) return;

    try {
      if (editingEntry) {
        await updateTimeEntry(editingEntry.id, manualEntryData);
      } else {
        await createTimeEntry(ticketId, user.uid, userData.email, userData.displayName || userData.email, currentTenant.id, manualEntryData);
      }
      
      // Refresh time entries
      const updatedEntries = await getTimeEntriesForTicket(ticketId);
      setTimeEntries(updatedEntries);
      
      setShowManualEntry(false);
      setEditingEntry(null);
      setManualEntryData({
        categoryId: '',
        description: '',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0
      });
      
      if (onTimeEntryChange) {
        onTimeEntryChange();
      }
    } catch (err) {
      console.error('Error creating/updating time entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save time entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await deleteTimeEntry(entryId);
      
      // Refresh time entries
      const updatedEntries = await getTimeEntriesForTicket(ticketId);
      setTimeEntries(updatedEntries);
      
      if (onTimeEntryChange) {
        onTimeEntryChange();
      }
    } catch (err) {
      console.error('Error deleting time entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete time entry');
    }
  };

  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setManualEntryData({
      categoryId: entry.categoryId,
      description: entry.description || '',
      startTime: entry.startTime,
      endTime: entry.endTime || entry.startTime + (entry.duration * 60000),
      duration: entry.duration
    });
    setShowManualEntry(true);
  };

  const getCategoryById = (id: string): TimeCategory | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const getActiveTimerForTicket = (): ActiveTimer | undefined => {
    return activeTimers.find(timer => timer.ticketId === ticketId);
  };

  const calculateTotal = () => {
    return timeEntries.reduce((total, entry) => total + entry.totalCost, 0);
  };

  const calculateTotalTime = () => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeTimer = getActiveTimerForTicket();
  const totalTime = calculateTotalTime();
  const totalCost = calculateTotal();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Time Tracking
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Timer Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Timer />
            <Typography variant="h6">
              {activeTimer ? 'Active Timer' : 'Start Timer'}
            </Typography>
          </Box>

          {activeTimer ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label={activeTimer.categoryName}
                  color="primary"
                  size="small"
                />
                <Typography variant="h5" color="primary">
                  {formatDuration(activeTimer.elapsedMinutes)}
                </Typography>
              </Box>
              
              {activeTimer.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {activeTimer.description}
                </Typography>
              )}
              
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={() => handleStopTimer(activeTimer.sessionId)}
              >
                Stop Timer
              </Button>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  label="Description (optional)"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrow />}
                  onClick={handleStartTimer}
                  disabled={!selectedCategoryId}
                >
                  Start Timer
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setShowManualEntry(true)}
                >
                  Add Manual Entry
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Time Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime />
              <Typography variant="h6">
                Total Time: {formatDuration(totalTime)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney />
              <Typography variant="h6">
                Total Cost: {formatCurrency(totalCost)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Time Entries List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Time Entries
          </Typography>
          
          {timeEntries.length === 0 ? (
            <Typography color="text.secondary">
              No time entries yet. Start a timer or add a manual entry.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {timeEntries.map((entry) => {
                const category = getCategoryById(entry.categoryId);
                return (
                  <Box
                    key={entry.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={entry.categoryName}
                          size="small"
                          style={{ backgroundColor: category?.color || '#ccc' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(entry.startTime).toLocaleString()}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body1" fontWeight="bold">
                        {formatDuration(entry.duration)} - {formatCurrency(entry.totalCost)}
                      </Typography>
                      
                      {entry.description && (
                        <Typography variant="body2" color="text.secondary">
                          {entry.description}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onClose={() => setShowManualEntry(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEntry ? 'Edit Time Entry' : 'Add Manual Time Entry'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={manualEntryData.categoryId}
                onChange={(e) => setManualEntryData({ ...manualEntryData, categoryId: e.target.value })}
                label="Category"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Description"
              value={manualEntryData.description}
              onChange={(e) => setManualEntryData({ ...manualEntryData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Time"
                type="datetime-local"
                value={new Date(manualEntryData.startTime).toISOString().slice(0, 16)}
                onChange={(e) => setManualEntryData({ 
                  ...manualEntryData, 
                  startTime: new Date(e.target.value).getTime() 
                })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              
              <TextField
                label="End Time"
                type="datetime-local"
                value={new Date(manualEntryData.endTime || manualEntryData.startTime).toISOString().slice(0, 16)}
                onChange={(e) => setManualEntryData({ 
                  ...manualEntryData, 
                  endTime: new Date(e.target.value).getTime() 
                })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            
            <TextField
              label="Duration (minutes)"
              type="number"
              value={manualEntryData.duration}
              onChange={(e) => setManualEntryData({ 
                ...manualEntryData, 
                duration: parseInt(e.target.value) || 0 
              })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowManualEntry(false)}>Cancel</Button>
          <Button 
            onClick={handleManualEntrySubmit}
            variant="contained"
            disabled={!manualEntryData.categoryId || (manualEntryData.duration || 0) <= 0}
          >
            {editingEntry ? 'Update' : 'Add'} Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeTracker;