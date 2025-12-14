/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TicketForm from '../components/tickets/TicketForm';
import { Ticket, TicketFormData } from '../lib/types/ticket';
import { getTicket, updateTicket } from '../lib/firebase/ticketService';
import { useAuth } from '../lib/auth/AuthContext';
import { hasRole } from '../lib/utils/roleUtils';

const EditTicket = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTicket(id);
    }
  }, [id]);

  const loadTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const fetchedTicket = await getTicket(ticketId);
      if (fetchedTicket) {
        // Check if user has permission to edit this ticket
        const canEdit = hasRole(userData?.role, 'tech') || 
                       fetchedTicket.submitterId === userData?.uid;
        
        if (!canEdit) {
          setError('You do not have permission to edit this ticket');
          return;
        }
        
        setTicket(fetchedTicket);
        setError(null);
      } else {
        setError('Ticket not found');
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError('Failed to load ticket. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: TicketFormData) => {
    if (!ticket || !id) return;

    try {
      setUpdateLoading(true);
      setUpdateError(null);

      // Update participants array with new CC list
      const updatedParticipants = [...ticket.participants.filter(p => p.role !== 'cc')];
      
      // Add new CC participants
      if (formData.ccParticipants && formData.ccParticipants.length > 0) {
        for (const ccParticipant of formData.ccParticipants) {
          updatedParticipants.push({
            userId: '',
            name: ccParticipant.name,
            email: ccParticipant.email,
            role: 'cc' as const
          });
        }
      }

      await updateTicket(id, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status || ticket.status,
        location: formData.location,
        isOnVpn: formData.isOnVpn,
        computer: formData.computer,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        contactMethod: formData.contactMethod,
        errorMessage: formData.errorMessage,
        problemStartDate: formData.problemStartDate,
        isPersonHavingProblem: formData.isPersonHavingProblem,
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
        userPreferredContact: formData.userPreferredContact,
        impact: formData.impact,
        stepsToReproduce: formData.stepsToReproduce,
        participants: updatedParticipants
      });

      navigate(`/tickets/${id}`);
    } catch (err) {
      console.error('Error updating ticket:', err);
      setUpdateError('Failed to update ticket. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
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
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/tickets')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Tickets
        </Button>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ticket not found
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/tickets')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/tickets/${id}`)}
        sx={{ mb: 2 }}
      >
        Back to Ticket
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Edit Ticket
        </Typography>

        <TicketForm
          ticket={ticket}
          onSubmit={handleSubmit}
          loading={updateLoading}
          error={updateError}
        />
      </Paper>
    </Box>
  );
};

export default EditTicket;