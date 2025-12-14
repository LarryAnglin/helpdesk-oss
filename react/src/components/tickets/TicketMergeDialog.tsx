/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Autocomplete,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  MergeType as MergeIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Ticket } from '../../lib/types/ticket';
import { mergeTickets } from '../../lib/firebase/ticketRelationshipService';
import { searchTickets } from '../../lib/firebase/ticketService';
import { useAuth } from '../../lib/auth/AuthContext';

interface TicketMergeDialogProps {
  open: boolean;
  onClose: () => void;
  primaryTicket: Ticket;
  onMergeComplete: () => void;
}

const TicketMergeDialog: React.FC<TicketMergeDialogProps> = ({
  open,
  onClose,
  primaryTicket,
  onMergeComplete
}) => {
  const { userData } = useAuth();
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [searching, setSearching] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    try {
      setSearching(true);
      const results = await searchTickets(searchTerm);
      
      // Filter out the primary ticket and already selected tickets
      const filteredResults = results.filter(ticket => 
        ticket.id !== primaryTicket.id && 
        !selectedTickets.some(selected => selected.id === ticket.id) &&
        ticket.status !== 'Closed' // Don't allow merging closed tickets
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching tickets:', error);
      setError('Failed to search tickets');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTickets([...selectedTickets, ticket]);
    setSearchResults(searchResults.filter(t => t.id !== ticket.id));
    setSearchTerm('');
  };

  const handleRemoveTicket = (ticketId: string) => {
    setSelectedTickets(selectedTickets.filter(t => t.id !== ticketId));
  };

  const handleMerge = async () => {
    if (!userData) {
      setError('User not authenticated');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for merging these tickets');
      return;
    }

    if (selectedTickets.length === 0) {
      setError('Please select at least one ticket to merge');
      return;
    }

    try {
      setMerging(true);
      setError(null);

      await mergeTickets(
        primaryTicket.id,
        selectedTickets.map(t => t.id),
        reason,
        userData.uid,
        userData.displayName || userData.email || 'Unknown'
      );

      onMergeComplete();
      onClose();
    } catch (error) {
      console.error('Error merging tickets:', error);
      setError('Failed to merge tickets. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  const handleClose = () => {
    if (!merging) {
      setReason('');
      setSearchTerm('');
      setSelectedTickets([]);
      setSearchResults([]);
      setError(null);
      onClose();
    }
  };

  const formatTicketStatus = (status: string) => {
    switch (status) {
      case 'Open': return 'success';
      case 'On Hold': return 'warning';
      case 'Waiting': return 'info';
      case 'Paused': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MergeIcon />
          Merge Tickets into: {primaryTicket.title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          <Alert severity="info">
            This will merge other tickets into "{primaryTicket.title}". The selected tickets will be closed 
            and their replies, attachments, and time entries will be moved to the primary ticket.
          </Alert>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Primary Ticket (will remain open)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip 
                  label={primaryTicket.status} 
                  color={formatTicketStatus(primaryTicket.status)} 
                  size="small" 
                />
                <Chip 
                  label={primaryTicket.priority} 
                  variant="outlined" 
                  size="small" 
                />
              </Box>
              <Typography variant="body2">
                {primaryTicket.title}
              </Typography>
            </CardContent>
          </Card>

          <TextField
            label="Reason for Merging"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why these tickets should be merged (e.g., duplicate reports, same underlying issue, etc.)"
            required
            fullWidth
          />

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Search and Select Tickets to Merge
            </Typography>
            
            <Autocomplete
              options={searchResults}
              getOptionLabel={(ticket) => `${ticket.title} (${ticket.id})`}
              renderOption={(props, ticket) => (
                <Box component="li" {...props}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip 
                        label={ticket.status} 
                        color={formatTicketStatus(ticket.status)} 
                        size="small" 
                      />
                      <Chip 
                        label={ticket.priority} 
                        variant="outlined" 
                        size="small" 
                      />
                    </Box>
                    <Typography variant="body2">
                      {ticket.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {ticket.id} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              )}
              inputValue={searchTerm}
              onInputChange={(_, value) => setSearchTerm(value)}
              onChange={(_, ticket) => {
                if (ticket) {
                  handleSelectTicket(ticket);
                }
              }}
              loading={searching}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search tickets to merge"
                  placeholder="Type to search by title or ID..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                    endAdornment: (
                      <React.Fragment>
                        {searching ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              noOptionsText={searchTerm.length < 2 ? "Type at least 2 characters to search" : "No tickets found"}
            />
          </Box>

          {selectedTickets.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Selected Tickets to Merge ({selectedTickets.length})
              </Typography>
              
              <List>
                {selectedTickets.map((ticket) => (
                  <ListItem key={ticket.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip 
                            label={ticket.status} 
                            color={formatTicketStatus(ticket.status)} 
                            size="small" 
                          />
                          <Chip 
                            label={ticket.priority} 
                            variant="outlined" 
                            size="small" 
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" gutterBottom>
                            {ticket.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {ticket.id} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveTicket(ticket.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={merging}>
          Cancel
        </Button>
        <Button
          onClick={handleMerge}
          variant="contained"
          disabled={merging || selectedTickets.length === 0}
          startIcon={merging ? <CircularProgress size={16} /> : <MergeIcon />}
        >
          {merging ? 'Merging...' : `Merge ${selectedTickets.length} Ticket${selectedTickets.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketMergeDialog;