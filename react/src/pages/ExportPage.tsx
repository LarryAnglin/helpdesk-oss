/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  SelectChangeEvent,
  FormControlLabel,
  Radio,
  RadioGroup,
  CircularProgress,
  Autocomplete,
  Checkbox,
  FormGroup
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DownloadIcon from '@mui/icons-material/Download';
import { Ticket } from '../lib/types/ticket';
import { getTickets } from '../lib/firebase/ticketService';
import { useAuth } from '../lib/auth/AuthContext';
import { useConfig } from '../lib/context/ConfigContext';
import { exportToJSON, exportToXLS } from '../lib/utils/exportUtils';
import { API_ENDPOINTS } from '../lib/apiConfig';
import ErrorDisplay from '../components/error/ErrorDisplay';

const ExportPage = () => {
  const { user, userData } = useAuth();
  const { config } = useConfig();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<any>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [exportFormat, setExportFormat] = useState<string>('csv');
  
  // Content inclusion options
  const [includeDetails, setIncludeDetails] = useState<boolean>(true);
  const [includeReplies, setIncludeReplies] = useState<boolean>(true);
  const [includeCustomFields, setIncludeCustomFields] = useState<boolean>(false);
  const [includeAttachments, setIncludeAttachments] = useState<boolean>(false);
  const [pageBreakBetweenTickets, setPageBreakBetweenTickets] = useState<boolean>(false);
  
  // Statistics
  const [filteredCount, setFilteredCount] = useState(0);

  useEffect(() => {
    if (userData) {
      loadData();
    }
  }, [userData]);

  useEffect(() => {
    applyFilters();
  }, [tickets, statusFilter, priorityFilter, customerFilter, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // For regular users, only load tickets they're involved in (submitted or CC'd)
      const ticketsData = userData?.role === 'user' 
        ? await getTickets({ submitterId: userData.uid })
        : await getTickets();
      setTickets(ticketsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError({
        id: `LOAD_${Date.now()}`,
        type: 'CLIENT_ERROR',
        code: 'NETWORK_ERROR',
        message: 'Failed to load tickets. Please check your connection and try again.',
        action: 'RETRY',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];
    
    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Customer filter
    if (customerFilter) {
      filtered = filtered.filter(ticket => 
        ticket.email.toLowerCase().includes(customerFilter.toLowerCase()) ||
        ticket.name.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    
    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(ticket => 
        new Date(ticket.createdAt) >= dateFrom
      );
    }
    
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ticket => 
        new Date(ticket.createdAt) <= endOfDay
      );
    }
    
    setFilteredCount(filtered.length);
  };

  const getFilteredTickets = () => {
    let filtered = [...tickets];
    
    if (statusFilter !== 'All') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    if (customerFilter) {
      filtered = filtered.filter(ticket => 
        ticket.email.toLowerCase().includes(customerFilter.toLowerCase()) ||
        ticket.name.toLowerCase().includes(customerFilter.toLowerCase())
      );
    }
    
    if (dateFrom) {
      filtered = filtered.filter(ticket => 
        new Date(ticket.createdAt) >= dateFrom
      );
    }
    
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ticket => 
        new Date(ticket.createdAt) <= endOfDay
      );
    }
    
    return filtered;
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    
    try {
      const filteredTickets = getFilteredTickets();
      const filename = `tickets_export_${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === 'pdf') {
        // Call server-side PDF generation
        const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'export-pdf')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          },
          body: JSON.stringify({ 
            tickets: filteredTickets,
            options: {
              includeDetails,
              includeReplies,
              pageBreakBetweenTickets
            },
            config: {
              pdfHeaderText: config.pdfHeaderText,
              footerMarkdown: config.footerMarkdown
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(JSON.stringify(errorData));
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (exportFormat === 'csv') {
        // Use server-side CSV export for better performance and features
        const response = await fetch(`${API_ENDPOINTS.EXPORT_DATA.replace('export_data', 'export-csv')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user?.getIdToken()}`
          },
          body: JSON.stringify({
            ticketIds: filteredTickets.map(t => t.id),
            includeReplies,
            includeCustomFields,
            includeAttachments,
            dateFrom: dateFrom?.toISOString(),
            dateTo: dateTo?.toISOString(),
            status: statusFilter !== 'All' ? statusFilter : null,
            priority: priorityFilter !== 'All' ? priorityFilter : null
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(JSON.stringify(errorData));
        }
        
        // Check if response is JSON (includes replies) or direct CSV
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          // Multiple CSV files (tickets and replies)
          const data = await response.json();
          if (data.data.tickets) {
            // Download tickets CSV
            const ticketsBlob = new Blob([data.data.tickets.content], { type: 'text/csv' });
            const ticketsUrl = window.URL.createObjectURL(ticketsBlob);
            const ticketsLink = document.createElement('a');
            ticketsLink.href = ticketsUrl;
            ticketsLink.download = data.data.tickets.filename;
            document.body.appendChild(ticketsLink);
            ticketsLink.click();
            document.body.removeChild(ticketsLink);
            window.URL.revokeObjectURL(ticketsUrl);
            
            // Download additional CSV files if present
            let delay = 1000;
            if (data.data.replies) {
              setTimeout(() => {
                const repliesBlob = new Blob([data.data.replies.content], { type: 'text/csv' });
                const repliesUrl = window.URL.createObjectURL(repliesBlob);
                const repliesLink = document.createElement('a');
                repliesLink.href = repliesUrl;
                repliesLink.download = data.data.replies.filename;
                document.body.appendChild(repliesLink);
                repliesLink.click();
                document.body.removeChild(repliesLink);
                window.URL.revokeObjectURL(repliesUrl);
              }, delay);
              delay += 1000;
            }
            
            if (data.data.attachments) {
              setTimeout(() => {
                const attachmentsBlob = new Blob([data.data.attachments.content], { type: 'text/csv' });
                const attachmentsUrl = window.URL.createObjectURL(attachmentsBlob);
                const attachmentsLink = document.createElement('a');
                attachmentsLink.href = attachmentsUrl;
                attachmentsLink.download = data.data.attachments.filename;
                document.body.appendChild(attachmentsLink);
                attachmentsLink.click();
                document.body.removeChild(attachmentsLink);
                window.URL.revokeObjectURL(attachmentsUrl);
              }, delay);
            }
          }
        } else {
          // Single CSV file
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else {
        // Use existing client-side export functions for JSON and Excel
        const exportOptions = { includeDetails, includeReplies };
        switch (exportFormat) {
          case 'json':
            exportToJSON(filteredTickets, filename, exportOptions);
            break;
          case 'excel':
            exportToXLS(filteredTickets, filename, exportOptions);
            break;
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      
      // Try to parse server error response
      let errorInfo;
      try {
        const errorData = JSON.parse((err as Error).message);
        if (errorData.error) {
          errorInfo = errorData.error;
        }
      } catch (parseError) {
        // Fallback for non-server errors
        errorInfo = {
          id: `EXPORT_${Date.now()}`,
          type: 'CLIENT_ERROR',
          code: 'EXPORT_ERROR',
          message: 'Failed to export tickets. Please try again.',
          action: 'RETRY',
          timestamp: new Date().toISOString()
        };
      }
      
      setError(errorInfo);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setCustomerFilter(null);
    setDateFrom(null);
    setDateTo(null);
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
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          Export Tickets
        </Typography>

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => {
              setError(null);
              if (error.code === 'NETWORK_ERROR') {
                loadData();
              }
            }}
            onDismiss={() => setError(null)}
            showTechnicalDetails={true}
          />
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Filter Options
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Status Filter */}
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Priority Filter */}
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e: SelectChangeEvent) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="All">All Priorities</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Customer Filter */}
            <Box sx={{ flex: '2 1 500px', minWidth: '250px' }}>
              <Autocomplete
                options={Array.from(new Set(tickets.map(t => t.email)))}
                value={customerFilter}
                onChange={(_, value) => setCustomerFilter(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Customer (Email or Name)" placeholder="Type to search..." />
                )}
                freeSolo
              />
            </Box>

            {/* Date Range */}
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={(date: Date | null) => setDateFrom(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={(date: Date | null) => setDateTo(date)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Box>

            {/* Clear Filters Button */}
            <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ height: '56px' }}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </Box>
          </Box>

          {/* Results Summary */}
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">
              Found <strong>{filteredCount}</strong> tickets matching your filters
            </Typography>
            {filteredCount > 0 && (
              <Chip 
                label={`${filteredCount} ticket${filteredCount !== 1 ? 's' : ''}`} 
                color="primary" 
                size="small" 
              />
            )}
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            Export Format
          </Typography>

          <RadioGroup
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            sx={{ mb: 3 }}
          >
            <FormControlLabel value="csv" control={<Radio />} label="CSV (Comma Separated Values)" />
            <FormControlLabel value="json" control={<Radio />} label="JSON (JavaScript Object Notation)" />
            <FormControlLabel value="excel" control={<Radio />} label="Excel (XLS)" />
            <FormControlLabel value="pdf" control={<Radio />} label="PDF (Portable Document Format)" />
          </RadioGroup>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Content Options
          </Typography>
          
          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                />
              }
              label="Include detailed ticket information and conversations"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Includes all ticket details like error messages, steps to reproduce, impact, and all public conversations with users.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeReplies}
                  onChange={(e) => setIncludeReplies(e.target.checked)}
                />
              }
              label="Include internal replies and notes"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Includes private/internal notes and replies made by technical staff that are not visible to users.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeCustomFields}
                  onChange={(e) => setIncludeCustomFields(e.target.checked)}
                />
              }
              label="Include custom fields (CSV only)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Includes any custom fields that have been added to tickets. Each custom field will appear as a separate column in the CSV export.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeAttachments}
                  onChange={(e) => setIncludeAttachments(e.target.checked)}
                />
              }
              label="Include attachment metadata (CSV only)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Exports attachment information as a separate CSV file with file names, sizes, types, and download URLs. Also adds attachment summary columns to the main tickets CSV.
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={pageBreakBetweenTickets}
                  onChange={(e) => setPageBreakBetweenTickets(e.target.checked)}
                />
              }
              label="Start each ticket on a new page (PDF only)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
              Forces a page break before each ticket in PDF exports. Useful for printing individual tickets or creating separated documentation.
            </Typography>
          </FormGroup>

          <Button
            variant="contained"
            size="large"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || filteredCount === 0}
            sx={{ minWidth: 200 }}
          >
            {exporting ? 'Exporting...' : `Export ${filteredCount} Tickets`}
          </Button>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ExportPage;