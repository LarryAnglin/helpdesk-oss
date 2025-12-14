/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert
} from '@mui/material';
import {
  AccessTime,
  AttachMoney,
  TrendingUp,
  Person,
  Category
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  TimeTrackingSummary as TimeTrackingSummaryType,
  TimeCategory
} from '../../lib/types/timeTracking';
import {
  getTimeTrackingSummary,
  getTimeCategories
} from '../../lib/firebase/timeTrackingService';
import {
  formatDuration,
  formatCurrency,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth
} from '../../lib/utils/timeUtils';

interface TimeTrackingSummaryProps {
  ticketId: string;
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

const TimeTrackingSummaryComponent: React.FC<TimeTrackingSummaryProps> = ({ ticketId }) => {
  const [summary, setSummary] = useState<TimeTrackingSummaryType | null>(null);
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [summaryData, categoriesData] = await Promise.all([
          getTimeTrackingSummary(ticketId),
          getTimeCategories()
        ]);
        
        setSummary(summaryData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error loading time tracking summary:', err);
        setError('Failed to load time tracking summary');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticketId]);

  // Update summary when date range changes
  useEffect(() => {
    const updateSummary = async () => {
      try {
        let startDate: number | undefined;
        let endDate: number | undefined;

        const now = Date.now();

        switch (dateRange) {
          case 'today':
            startDate = getStartOfDay(now);
            endDate = getEndOfDay(now);
            break;
          case 'week':
            startDate = getStartOfWeek(now);
            endDate = getEndOfWeek(now);
            break;
          case 'month':
            startDate = getStartOfMonth(now);
            endDate = getEndOfMonth(now);
            break;
          case 'custom':
            if (customStartDate && customEndDate) {
              startDate = customStartDate.getTime();
              endDate = customEndDate.getTime();
            }
            break;
          case 'all':
          default:
            // No date filtering
            break;
        }

        const summaryData = await getTimeTrackingSummary(ticketId, startDate, endDate);
        setSummary(summaryData);
      } catch (err) {
        console.error('Error updating summary:', err);
        setError('Failed to update summary');
      }
    };

    updateSummary();
  }, [ticketId, dateRange, customStartDate, customEndDate]);

  const getCategoryById = (id: string): TimeCategory | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const getBillablePercentage = (): number => {
    if (!summary || summary.totalMinutes === 0) return 0;
    return (summary.billableMinutes / summary.totalMinutes) * 100;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LinearProgress sx={{ width: '100%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!summary) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No time tracking data available for this ticket.
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Time Tracking Summary
        </Typography>

        {/* Date Range Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              label="Date Range"
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>

          {dateRange === 'custom' && (
            <>
              <MuiDatePicker
                label="Start Date"
                value={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                slots={{ textField: TextField }}
              />
              <MuiDatePicker
                label="End Date"
                value={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                slots={{ textField: TextField }}
              />
            </>
          )}
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid sx={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" color="primary">
                    Total Time
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatDuration(summary.totalMinutes)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid sx={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6" color="success.main">
                    Total Cost
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(summary.totalCost)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid sx={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6" color="info.main">
                    Billable Time
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatDuration(summary.billableMinutes)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={getBillablePercentage()}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getBillablePercentage().toFixed(1)}% of total time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid sx={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AttachMoney sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6" color="warning.main">
                    Billable Cost
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(summary.billableCost)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Time by Category */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Category sx={{ mr: 1 }} />
              <Typography variant="h6">
                Time by Category
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Time</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Entries</TableCell>
                    <TableCell align="center">Billable</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(summary.entriesByCategory).map(([categoryId, data]) => {
                    const category = getCategoryById(categoryId);
                    return (
                      <TableRow key={categoryId}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: category?.color || '#ccc'
                              }}
                            />
                            {data.categoryName}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatDuration(data.minutes)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(data.cost)}
                        </TableCell>
                        <TableCell align="right">
                          {data.entries}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={category?.isBillable ? 'Billable' : 'Non-billable'}
                            color={category?.isBillable ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Time by User */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Person sx={{ mr: 1 }} />
              <Typography variant="h6">
                Time by User
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell align="right">Time</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Entries</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(summary.entriesByUser).map(([userId, data]) => (
                    <TableRow key={userId}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {data.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {data.userEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatDuration(data.minutes)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(data.cost)}
                      </TableCell>
                      <TableCell align="right">
                        {data.entries}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default TimeTrackingSummaryComponent;