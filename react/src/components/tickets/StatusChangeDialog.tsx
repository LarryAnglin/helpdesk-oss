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
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box
} from '@mui/material';
import { TicketStatus } from '../../lib/types/ticket';

interface StatusChangeDialogProps {
  open: boolean;
  newStatus: TicketStatus;
  currentStatus: TicketStatus;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  open,
  newStatus,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const finalReason = reason === 'custom' ? customReason : reason;
    if (finalReason.trim()) {
      onConfirm(finalReason.trim());
      setReason('');
      setCustomReason('');
    }
  };

  const handleCancel = () => {
    onCancel();
    setReason('');
    setCustomReason('');
  };

  const getDialogContent = () => {
    if (newStatus === 'Paused') {
      return {
        title: 'Pause Ticket',
        description: 'Please provide a reason for pausing this ticket. This will stop SLA time tracking.',
        placeholder: 'Why is this ticket being paused?',
        presetReasons: [
          'Waiting for parts',
          'Waiting for vendor response',
          'Need additional information from customer',
          'Escalated to external team',
          'System maintenance window',
          'Budget approval required',
          'custom'
        ]
      };
    } else if (newStatus === 'Waiting') {
      return {
        title: 'Set Ticket to Waiting',
        description: 'Please specify what you are waiting for.',
        placeholder: 'What are you waiting for?',
        presetReasons: [
          'Customer response',
          'Customer to test solution',
          'Customer to provide information',
          'Customer to schedule appointment',
          'Manager approval',
          'Third-party response',
          'custom'
        ]
      };
    }
    return null;
  };

  const content = getDialogContent();
  if (!content) return null;

  const isValid = reason === 'custom' ? customReason.trim().length > 0 : reason.length > 0;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{content.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {content.description}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Reason</InputLabel>
            <Select
              value={reason}
              label="Reason"
              onChange={(e) => setReason(e.target.value)}
            >
              {content.presetReasons.map((presetReason) => (
                <MenuItem key={presetReason} value={presetReason}>
                  {presetReason === 'custom' ? 'Other (specify below)' : presetReason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {reason === 'custom' && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Custom Reason"
            placeholder={content.placeholder}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        )}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          This reason will be added as a private note and logged in the ticket history.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!isValid}
        >
          {newStatus === 'Paused' ? 'Pause Ticket' : 'Set to Waiting'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusChangeDialog;