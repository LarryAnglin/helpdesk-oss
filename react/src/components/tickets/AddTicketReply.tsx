/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  CircularProgress,
  Alert,
  Typography,
  Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { addReply } from '../../lib/firebase/ticketService';
import EnhancedMarkdownEditor from '../ui/EnhancedMarkdownEditor';

interface AddTicketReplyProps {
  ticketId: string;
  onReplyAdded: () => void;
}

const AddTicketReply: React.FC<AddTicketReplyProps> = ({ ticketId, onReplyAdded }) => {
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      // Clear the input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleFileRemove = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await addReply(ticketId, {
        message: message.trim(),
        isPrivate,
        attachments: files
      });

      // Reset form
      setMessage('');
      setIsPrivate(false);
      setFiles([]);
      
      // Clear the file input as well
      const fileInput = document.getElementById('reply-file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Notify parent component
      onReplyAdded();
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Typography variant="h6">Add Reply</Typography>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <EnhancedMarkdownEditor
          value={message}
          onChange={setMessage}
          label="Your Reply"
          placeholder="Type your reply here..."
          disabled={loading}
          required
          rows={6}
          minHeight={150}
          maxHeight={400}
        />

        <Stack direction="row" alignItems="center" spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                disabled={loading}
              />
            }
            label="Private Reply (only visible to staff)"
          />

          <input
            accept="image/*,application/pdf,.doc,.docx"
            style={{ display: 'none' }}
            id="reply-file-upload"
            multiple
            type="file"
            onChange={handleFileChange}
            disabled={loading}
          />
          <label htmlFor="reply-file-upload">
            <Button
              variant="outlined"
              component="span"
              size="small"
              startIcon={<AttachFileIcon />}
              disabled={loading}
            >
              Attach Files
            </Button>
          </label>
        </Stack>

        {files.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Attached Files:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {files.map((file, index) => (
                <Chip
                  key={`${file.name}-${index}`}
                  label={`${file.name} (${formatFileSize(file.size)})`}
                  onDelete={() => handleFileRemove(index)}
                  deleteIcon={<CloseIcon />}
                  variant="outlined"
                  size="small"
                  sx={{ maxWidth: 300 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={() => {
              setMessage('');
              setIsPrivate(false);
              setFiles([]);
              setError(null);
              // Clear the file input as well
              const fileInput = document.getElementById('reply-file-upload') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            }}
            disabled={loading}
          >
            Clear
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !message.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {loading ? 'Sending...' : 'Send Reply'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default AddTicketReply;