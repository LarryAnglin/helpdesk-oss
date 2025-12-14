/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert
} from '@mui/material';
import {
  AttachFile as AttachIcon,
  Close as RemoveIcon,
  Description as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as DefaultFileIcon
} from '@mui/icons-material';

interface FileSelectorProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}

const FileSelector: React.FC<FileSelectorProps> = ({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ],
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get icon for file type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon color="primary" />;
    if (file.type === 'application/pdf') return <PdfIcon color="error" />;
    if (file.type.includes('document') || file.type.includes('text')) return <FileIcon color="info" />;
    return <DefaultFileIcon color="action" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeBytes) {
      const maxSizeMB = maxSizeBytes / (1024 * 1024);
      return `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed for "${file.name}".`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Check file limits
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only select up to ${maxFiles} files total.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    // Show errors if any
    if (errors.length > 0) {
      alert(`File validation errors:\n${errors.join('\n')}`);
    }

    // Add valid files
    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove file
  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  // Handle attach button click
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="subtitle2">
          File Attachments
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AttachIcon />}
          onClick={handleAttachClick}
          disabled={disabled || files.length >= maxFiles}
        >
          {files.length === 0 ? 'Attach Files' : 'Add More'}
        </Button>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes?.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      {files.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2 }}>
          <List dense>
            {files.map((file, index) => (
              <ListItem key={`${file.name}-${index}`}>
                <ListItemIcon>
                  {getFileIcon(file)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(index)}
                    disabled={disabled}
                    size="small"
                    color="error"
                  >
                    <RemoveIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {files.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {files.length} file(s) selected • {files.length}/{maxFiles} max • {formatFileSize(maxSizeBytes)} per file
        </Typography>
      )}

      {files.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You can attach images, PDFs, documents, and other files to help describe your issue.
        </Typography>
      )}

      {files.length >= maxFiles && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Maximum number of files ({maxFiles}) reached. Remove a file to add another.
        </Alert>
      )}
    </Box>
  );
};

export default FileSelector;