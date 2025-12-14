/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { TicketFormData } from '../lib/types/ticket';
import { createTicket } from '../lib/firebase/ticketService';
import { useAuth } from '../lib/auth/AuthContext';
import TicketFormWithCustomFields from '../components/tickets/TicketFormWithCustomFields';

const NewTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: TicketFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Pre-populate user information if available
      const ticketData: TicketFormData = {
        ...formData,
        name: formData.name || user?.displayName || '',
        email: formData.email || user?.email || '',
        status: 'Open'
      };

      await createTicket(ticketData);
      setSuccess(true);
      
      // Navigate after a brief success message
      setTimeout(() => {
        navigate('/tickets');
      }, 1500);
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Ticket created successfully! Redirecting to tickets list...
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/tickets')}
        sx={{ mb: 2 }}
        disabled={loading}
      >
        Back to Tickets
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create New Ticket
        </Typography>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Provide as much detail as possible to help us resolve your issue quickly.
        </Typography>

        <TicketFormWithCustomFields
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          context="ticket_creation"
        />
      </Paper>
    </Box>
  );
};

export default NewTicket;