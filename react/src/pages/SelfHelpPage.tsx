/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Help as HelpIcon,
  ConfirmationNumber as TicketIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../lib/context/ConfigContext';
import SelfHelpChat from '../components/self-help/SelfHelpChat';

const SelfHelpPage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketData, setTicketData] = useState<{
    question: string;
    suggestedSolution: string;
  } | null>(null);

  const handleCreateTicket = (question: string, suggestedSolution: string) => {
    setTicketData({ question, suggestedSolution });
    setShowTicketDialog(true);
  };

  const handleConfirmTicket = () => {
    if (ticketData) {
      // Navigate to new ticket page with pre-filled data
      navigate('/tickets/new', {
        state: {
          prefilledTitle: ticketData.question,
          prefilledDescription: `Original Issue: ${ticketData.question}\n\nAI Suggested Solution:\n${ticketData.suggestedSolution}\n\nThe above solution did not resolve my issue. Additional details:`
        }
      });
    }
  };

  // Get support phone number from config
  const supportPhone = config.supportPhone || 'IT Support';
  const phoneHref = config.supportPhone ? `tel:${config.supportPhone}` : '#';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <HelpIcon sx={{ fontSize: 40 }} color="primary" />
          <Typography variant="h3" component="h1">
            IT Self-Help
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
        {/* Chat Interface */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '2 1 66%' } }}>
          <Paper sx={{ height: 600, p: 2 }}>
            <SelfHelpChat onCreateTicket={handleCreateTicket} />
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 33%' } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Quick Actions */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<TicketIcon />}
                  onClick={() => navigate('/tickets/new')}
                  fullWidth
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                >
                  Create Support Ticket
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SupportIcon />}
                  href={phoneHref}
                  fullWidth
                  disabled={!config.supportPhone}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      opacity: 0.9
                    }
                  }}
                >
                  Call IT Support ({supportPhone})
                </Button>
              </Box>
            </Paper>


            {/* Emergency Contact */}
            <Alert severity="warning">
              <Typography variant="subtitle2" gutterBottom>
                🚨 Emergency IT Issues
              </Typography>
              <Typography variant="body2">
                For urgent system outages or security incidents, call IT immediately at {supportPhone} or create a high-priority ticket.
              </Typography>
            </Alert>
          </Box>
        </Box>
      </Box>

      {/* Create Ticket Dialog */}
      <Dialog 
        open={showTicketDialog} 
        onClose={() => setShowTicketDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create Support Ticket
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            The AI assistant wasn't able to fully resolve your issue. Would you like to create a support ticket?
          </Typography>
          
          {ticketData && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Your Original Question:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Typography variant="body2">
                  {ticketData.question}
                </Typography>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>
                AI Suggested Solution:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 2 }}>
                <Typography variant="body2">
                  {ticketData.suggestedSolution.substring(0, 300)}
                  {ticketData.suggestedSolution.length > 300 && '...'}
                </Typography>
              </Paper>
              
              <Typography variant="body2" color="text.secondary">
                This information will be included in your ticket to help our IT team understand what you've already tried.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTicketDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmTicket} variant="contained">
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SelfHelpPage;