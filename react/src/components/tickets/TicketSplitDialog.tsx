/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as SplitIcon
} from '@mui/icons-material';
import { Ticket, TicketPriority } from '../../lib/types/ticket';
import { splitTicket } from '../../lib/firebase/ticketRelationshipService';
import { useAuth } from '../../lib/auth/AuthContext';

interface NewTicketData {
  title: string;
  description: string;
  assigneeId?: string;
  priority: TicketPriority;
}

interface TicketSplitDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket;
  onSplitComplete: (newTicketIds: string[]) => void;
}

const TicketSplitDialog: React.FC<TicketSplitDialogProps> = ({
  open,
  onClose,
  ticket,
  onSplitComplete
}) => {
  const { userData } = useAuth();
  const [reason, setReason] = useState('');
  const [newTickets, setNewTickets] = useState<NewTicketData[]>([
    {
      title: '',
      description: '',
      assigneeId: ticket.assigneeId,
      priority: ticket.priority
    },
    {
      title: '',
      description: '',
      assigneeId: ticket.assigneeId,
      priority: ticket.priority
    }
  ]);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priorityOptions: TicketPriority[] = ['Urgent', 'High', 'Medium', 'Low', 'None'];

  const handleAddTicket = () => {
    setNewTickets([
      ...newTickets,
      {
        title: '',
        description: '',
        assigneeId: ticket.assigneeId,
        priority: ticket.priority
      }
    ]);
  };

  const handleRemoveTicket = (index: number) => {
    if (newTickets.length > 2) {
      setNewTickets(newTickets.filter((_, i) => i !== index));
    }
  };

  const handleTicketChange = (index: number, field: keyof NewTicketData, value: string) => {
    const updated = [...newTickets];
    updated[index] = { ...updated[index], [field]: value };
    setNewTickets(updated);
  };

  const handleSplit = async () => {
    if (!userData) {
      setError('User not authenticated');
      return;
    }

    // Validation
    if (!reason.trim()) {
      setError('Please provide a reason for splitting this ticket');
      return;
    }

    const invalidTickets = newTickets.filter(t => !t.title.trim() || !t.description.trim());
    if (invalidTickets.length > 0) {
      setError('All new tickets must have a title and description');
      return;
    }

    try {
      setSplitting(true);
      setError(null);

      const { newTicketIds } = await splitTicket(
        ticket.id,
        {
          reason,
          newTickets: newTickets.map(t => ({
            title: t.title,
            description: t.description,
            assigneeId: t.assigneeId,
            priority: t.priority
          }))
        },
        userData.uid,
        userData.displayName || userData.email || 'Unknown'
      );

      onSplitComplete(newTicketIds);
      onClose();
    } catch (error) {
      console.error('Error splitting ticket:', error);
      setError('Failed to split ticket. Please try again.');
    } finally {
      setSplitting(false);
    }
  };

  const handleClose = () => {
    if (!splitting) {
      setReason('');
      setNewTickets([
        {
          title: '',
          description: '',
          assigneeId: ticket.assigneeId,
          priority: ticket.priority
        },
        {
          title: '',
          description: '',
          assigneeId: ticket.assigneeId,
          priority: ticket.priority
        }
      ]);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SplitIcon />
          Split Ticket: {ticket.title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          <Alert severity="info">
            This will create multiple new tickets from this original ticket. The original ticket will become the parent, 
            and the new tickets will be its children. All new tickets will inherit the original ticket's basic information.
          </Alert>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <TextField
            label="Reason for Splitting"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this ticket needs to be split (e.g., multiple unrelated issues, different teams needed, etc.)"
            required
            fullWidth
          />

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                New Tickets ({newTickets.length})
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddTicket}
                variant="outlined"
                size="small"
              >
                Add Another Ticket
              </Button>
            </Box>

            {newTickets.map((newTicket, index) => (
              <Card key={index} sx={{ mb: 2 }} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Ticket {index + 1}
                    </Typography>
                    {newTickets.length > 2 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveTicket(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Title"
                      value={newTicket.title}
                      onChange={(e) => handleTicketChange(index, 'title', e.target.value)}
                      required
                      fullWidth
                    />

                    <TextField
                      label="Description"
                      multiline
                      rows={3}
                      value={newTicket.description}
                      onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                      required
                      fullWidth
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          value={newTicket.priority}
                          label="Priority"
                          onChange={(e) => handleTicketChange(index, 'priority', e.target.value)}
                        >
                          {priorityOptions.map(priority => (
                            <MenuItem key={priority} value={priority}>
                              {priority}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label="Assignee ID (Optional)"
                        value={newTicket.assigneeId || ''}
                        onChange={(e) => handleTicketChange(index, 'assigneeId', e.target.value)}
                        placeholder="Leave empty to inherit from parent"
                        fullWidth
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={splitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSplit}
          variant="contained"
          disabled={splitting}
          startIcon={splitting ? <CircularProgress size={16} /> : <SplitIcon />}
        >
          {splitting ? 'Splitting...' : `Split into ${newTickets.length} Tickets`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TicketSplitDialog;