/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Download,
  AccessTime,
  AttachMoney,
  Assessment,
  DateRange
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTenant } from '../../lib/context/TenantContext';
import {
  TimeEntry,
  TimeCategory
} from '../../lib/types/timeTracking';
import {
  getTimeEntriesForUser,
  getTimeCategories
} from '../../lib/firebase/timeTrackingService';
import {
  formatDuration,
  formatCurrency,
  formatDateTime,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth
} from '../../lib/utils/timeUtils';

type DateRange = 'today' | 'week' | 'month' | 'custom';

interface TimeReportData {
  totalMinutes: number;
  totalCost: number;
  billableMinutes: number;
  billableCost: number;
  entriesByCategory: { [categoryId: string]: { name: string; minutes: number; cost: number; entries: number } };
  entries: TimeEntry[];
}

const TimeReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [reportData, setReportData] = useState<TimeReportData | null>(null);
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getTimeCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    loadCategories();
  }, []);

  // Load report data when user or date range changes
  useEffect(() => {
    if (!user) return;

    const loadReportData = async () => {
      try {
        setLoading(true);
        setError(null);

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
              startDate = getStartOfDay(customStartDate.getTime());
              endDate = getEndOfDay(customEndDate.getTime());
            } else {
              setLoading(false);
              return;
            }
            break;
        }

        const entries = await getTimeEntriesForUser(user.uid, currentTenant?.id, startDate, endDate);

        // Calculate summary data
        const reportData: TimeReportData = {
          totalMinutes: 0,
          totalCost: 0,
          billableMinutes: 0,
          billableCost: 0,
          entriesByCategory: {},
          entries
        };

        entries.forEach(entry => {
          reportData.totalMinutes += entry.duration;
          reportData.totalCost += entry.totalCost;

          if (entry.isBillable) {
            reportData.billableMinutes += entry.duration;
            reportData.billableCost += entry.totalCost;
          }

          // Group by category
          if (!reportData.entriesByCategory[entry.categoryId]) {
            reportData.entriesByCategory[entry.categoryId] = {
              name: entry.categoryName,
              minutes: 0,
              cost: 0,
              entries: 0
            };
          }
          reportData.entriesByCategory[entry.categoryId].minutes += entry.duration;
          reportData.entriesByCategory[entry.categoryId].cost += entry.totalCost;
          reportData.entriesByCategory[entry.categoryId].entries += 1;
        });

        setReportData(reportData);
      } catch (err) {
        console.error('Error loading report data:', err);
        setError('Failed to load time report data');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [user, dateRange, customStartDate, customEndDate]);

  const handleExportCSV = () => {
    if (!reportData) return;

    const csvData = [
      ['Date', 'Ticket ID', 'Category', 'Description', 'Duration', 'Cost', 'Billable'],
      ...reportData.entries.map(entry => [
        new Date(entry.startTime).toLocaleDateString(),
        entry.ticketId,
        entry.categoryName,
        entry.description || '',
        formatDuration(entry.duration),
        entry.totalCost.toFixed(2),
        entry.isBillable ? 'Yes' : 'No'
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCategoryById = (id: string): TimeCategory | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const getDateRangeLabel = (): string => {
    switch (dateRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`;
        }
        return 'Custom Range';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Time Reports
          </Typography>
          
          {reportData && reportData.entries.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Date Range Filter */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <DateRange sx={{ color: 'primary.main' }} />
              
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  label="Date Range"
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>

              {dateRange === 'custom' && (
                <>
                  <DatePicker
                    label="Start Date"
                    value={customStartDate}
                    onChange={(date) => setCustomStartDate(date)}
                    slots={{ textField: TextField }}
                  />
                  <DatePicker
                    label="End Date"
                    value={customEndDate}
                    onChange={(date) => setCustomEndDate(date)}
                    slots={{ textField: TextField }}
                  />
                </>
              )}

              <Typography variant="h6" sx={{ ml: 'auto' }}>
                {getDateRangeLabel()}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {reportData ? (
          <>
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
                      {formatDuration(reportData.totalMinutes)}
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
                      {formatCurrency(reportData.totalCost)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid sx={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Assessment sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="h6" color="info.main">
                        Billable Time
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight="bold">
                      {formatDuration(reportData.billableMinutes)}
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
                      {formatCurrency(reportData.billableCost)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Category Breakdown */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Time by Category
                </Typography>
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
                      {Object.entries(reportData.entriesByCategory).map(([categoryId, data]) => {
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
                                {data.name}
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

            {/* Detailed Entries */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detailed Time Entries ({reportData.entries.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Ticket</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Duration</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell align="center">Billable</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.entries.map((entry) => {
                        const category = getCategoryById(entry.categoryId);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {formatDateTime(entry.startTime)}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {entry.ticketId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: category?.color || '#ccc'
                                  }}
                                />
                                {entry.categoryName}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {entry.description || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {formatDuration(entry.duration)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(entry.totalCost)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={entry.isBillable ? 'Yes' : 'No'}
                                color={entry.isBillable ? 'success' : 'default'}
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
          </>
        ) : (
          <Alert severity="info">
            No time entries found for the selected date range.
          </Alert>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default TimeReportsPage;