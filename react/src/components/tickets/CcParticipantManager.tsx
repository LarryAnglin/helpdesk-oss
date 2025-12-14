import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Stack,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

interface CcParticipant {
  name: string;
  email: string;
}

interface CcParticipantManagerProps {
  participants: CcParticipant[];
  onChange: (participants: CcParticipant[]) => void;
  disabled?: boolean;
  autoSave?: boolean;
  onAutoSave?: (participants: CcParticipant[]) => Promise<void>;
}

export function CcParticipantManager({
  participants,
  onChange,
  disabled = false,
  autoSave = false,
  onAutoSave
}: CcParticipantManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setError('');
    
    if (!newName.trim() || !newEmail.trim()) {
      setError('Both name and email are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const isDuplicate = participants.some(p => p.email.toLowerCase() === newEmail.toLowerCase());
    if (isDuplicate) {
      setError('This email is already in the CC list');
      return;
    }

    const newParticipants = [...participants, { name: newName.trim(), email: newEmail.trim() }];
    onChange(newParticipants);
    
    if (autoSave && onAutoSave) {
      try {
        setSaving(true);
        await onAutoSave(newParticipants);
      } catch (error) {
        setError('Failed to save CC participant. Please try again.');
        return;
      } finally {
        setSaving(false);
      }
    }
    
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleRemove = async (index: number) => {
    const updated = participants.filter((_, i) => i !== index);
    onChange(updated);
    
    if (autoSave && onAutoSave) {
      try {
        setSaving(true);
        await onAutoSave(updated);
      } catch (error) {
        setError('Failed to remove CC participant. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <Box>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">CC Recipients</Typography>
          {!showAddForm && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowAddForm(true)}
              disabled={disabled || saving}
            >
              Add CC
            </Button>
          )}
        </Box>

        {showAddForm && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                  disabled={disabled || saving}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                  disabled={disabled || saving}
                />
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ py: 0.5 }}>
                  {error}
                </Alert>
              )}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAdd}
                  disabled={disabled || saving}
                >
                  {saving ? 'Saving...' : 'Add'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewName('');
                    setNewEmail('');
                    setError('');
                  }}
                  disabled={disabled || saving}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {participants.length > 0 && (
          <Stack spacing={1}>
            {participants.map((participant, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                  color: 'text.primary'
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.primary">
                    {participant.name}
                  </Typography>
                  <Typography variant="caption" color="text.primary">
                    {participant.email}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(index)}
                  disabled={disabled || saving}
                  color="error"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Stack>
        )}

        {participants.length === 0 && !showAddForm && (
          <Typography variant="body2" color="text.secondary">
            No CC recipients added
          </Typography>
        )}
      </Stack>
    </Box>
  );
}