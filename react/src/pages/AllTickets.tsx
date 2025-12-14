/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box, 
  Typography, 
  Paper, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Ticket, TicketStatus } from '../lib/types/ticket';
import { getTickets } from '../lib/firebase/ticketService';
import SLAIndicator from '../components/tickets/SLAIndicator';

const AllTickets = () => {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || 'All'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus) {
      const capitalizedStatus = urlStatus === 'all' ? 'All' : 
        urlStatus.charAt(0).toUpperCase() + urlStatus.slice(1);
      setStatusFilter(capitalizedStatus);
    }
  }, [searchParams]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      // No filters for all tickets view - admins/techs see everything
      const fetchedTickets = await getTickets({});
      setTickets(fetchedTickets);
      setError(null);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError('Failed to load tickets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
  };
  
  // Filter tickets based on status
  const filteredTickets = statusFilter === 'All'
    ? tickets
    : tickets.filter(ticket => ticket.status === statusFilter);
  
  // Get status chip color
  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'primary';
      case 'Resolved':
        return 'success';
      case 'Closed':
        return 'default';
      case 'Accepted':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'On Hold':
        return 'warning';
      case 'Waiting':
        return 'info';
      case 'Paused':
        return 'secondary';
      default:
        return 'default';
    }
  };
  
  // Get priority chip color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'error';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
        return 'success';
      default:
        return 'default';
    }
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={loadTickets}
          sx={{ mr: 2 }}
        >
          Try Again
        </Button>
        <Button 
          variant="outlined" 
          component={Link} 
          to="/tickets/new"
        >
          Create New Ticket
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}
      >
        <Typography variant="h4" component="h1">
          All Tickets (Admin View)
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={Link} 
          to="/tickets/new"
          startIcon={<AddIcon />}
        >
          New Ticket
        </Button>
      </Box>
      
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}
      >
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Status Filter</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            label="Status Filter"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="All">All Tickets</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="In Progress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
            <MenuItem value="Accepted">Accepted</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
            <MenuItem value="On Hold">On Hold</MenuItem>
            <MenuItem value="Waiting">Waiting</MenuItem>
            <MenuItem value="Paused">Paused</MenuItem>
          </Select>
        </FormControl>
        
        <Typography variant="body2" color="text.secondary">
          Showing {filteredTickets.length} tickets
        </Typography>
      </Box>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table aria-label="tickets table">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>SLA Status</TableCell>
              <TableCell>Submitted By</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow 
                key={ticket.id}
              >
                <TableCell component="th" scope="row">
                  <Link 
                    to={`/tickets/${ticket.id}`}
                    style={{ 
                      textDecoration: 'none', 
                      color: 'inherit'
                    }}
                  >
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={ticket.status} 
                    color={getStatusColor(ticket.status)} 
                    size="small" 
                    variant="filled" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={ticket.priority} 
                    color={getPriorityColor(ticket.priority)} 
                    size="small" 
                    variant="filled" 
                  />
                </TableCell>
                <TableCell>
                  {ticket.sla ? (
                    <SLAIndicator sla={ticket.sla} compact={true} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No SLA
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{ticket.name}</TableCell>
                <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Ticket">
                    <IconButton 
                      component={Link} 
                      to={`/tickets/${ticket.id}`}
                      aria-label={`View ticket ${ticket.title}`}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredTickets.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No tickets found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AllTickets;