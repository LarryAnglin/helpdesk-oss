/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Card,
  CardContent,
  Stack,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Description as FileIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as DefaultFileIcon
} from '@mui/icons-material';
import { TicketAttachment } from '../../lib/types/ticket';
import { fileUploadService } from '../../lib/firebase/fileUploadService';

interface FileUploadProps {
  ticketId?: string;
  attachments: TicketAttachment[];
  onAttachmentsChange: (attachments: TicketAttachment[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  allowedTypes?: string[];
  showPreviews?: boolean;
  disabled?: boolean;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  uploading: boolean;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  ticketId,
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  allowedTypes,
  showPreviews = true,
  disabled = false
}) => {
  const [pendingFiles, setPendingFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get file icon based on type
  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <ImageIcon />;
    if (contentType === 'application/pdf') return <PdfIcon />;
    if (contentType.includes('document') || contentType.includes('text')) return <FileIcon />;
    return <DefaultFileIcon />;
  };

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || disabled) return;

    const fileArray = Array.from(files);
    
    // Check file limits
    if (attachments.length + pendingFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process each file
    const newPendingFiles: FileWithPreview[] = [];
    
    for (const file of fileArray) {
      // Validate file
      const validationError = fileUploadService.validateFile(file, {
        maxSizeBytes,
        allowedTypes
      });

      if (validationError) {
        newPendingFiles.push({
          file,
          uploading: false,
          error: validationError
        });
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (showPreviews && fileUploadService.isImage(file)) {
        try {
          preview = await fileUploadService.createImageThumbnail(file);
        } catch (error) {
          console.warn('Failed to create thumbnail:', error);
        }
      }

      newPendingFiles.push({
        file,
        preview,
        uploading: false
      });
    }

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  };

  // Upload pending files
  const uploadPendingFiles = async () => {
    if (!ticketId) {
      alert('Ticket ID is required for file upload');
      return;
    }

    const filesToUpload = pendingFiles.filter(pf => !pf.error && !pf.uploading);
    if (filesToUpload.length === 0) return;

    // Mark files as uploading
    setPendingFiles(prev => 
      prev.map(pf => ({
        ...pf,
        uploading: filesToUpload.some(f => f.file === pf.file) ? true : pf.uploading
      }))
    );

    try {
      const files = filesToUpload.map(pf => pf.file);
      const newAttachments = await fileUploadService.uploadFiles(files, ticketId, undefined, {
        maxSizeBytes,
        allowedTypes
      });

      // Update attachments
      onAttachmentsChange([...attachments, ...newAttachments]);

      // Remove successfully uploaded files from pending
      setPendingFiles(prev => 
        prev.filter(pf => !filesToUpload.some(f => f.file === pf.file))
      );

    } catch (error) {
      // Mark files as failed
      setPendingFiles(prev => 
        prev.map(pf => ({
          ...pf,
          uploading: false,
          error: filesToUpload.some(f => f.file === pf.file) 
            ? (error instanceof Error ? error.message : 'Upload failed')
            : pf.error
        }))
      );
    }
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove attachment
  const removeAttachment = async (attachment: TicketAttachment) => {
    try {
      await fileUploadService.deleteFile(attachment.fileUrl);
      onAttachmentsChange(attachments.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <Box>
      {/* File Drop Zone */}
      <Card
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Drop files here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Maximum {maxFiles} files, {fileUploadService.formatFileSize(maxSizeBytes)} each
          </Typography>
          {allowedTypes && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Supported: {allowedTypes.join(', ')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes?.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
        disabled={disabled}
      />

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Files to Upload
          </Typography>
          <Stack spacing={1}>
            {pendingFiles.map((pendingFile, index) => (
              <Card key={index} variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getFileIcon(pendingFile.file.type)}
                    
                    {pendingFile.preview && (
                      <Box
                        component="img"
                        src={pendingFile.preview}
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    
                    <Box flex={1}>
                      <Typography variant="body2" noWrap>
                        {pendingFile.file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fileUploadService.formatFileSize(pendingFile.file.size)}
                      </Typography>
                    </Box>

                    {pendingFile.uploading && (
                      <Box sx={{ width: 100 }}>
                        <LinearProgress />
                      </Box>
                    )}

                    {pendingFile.error && (
                      <Chip label="Error" color="error" size="small" />
                    )}

                    <IconButton
                      size="small"
                      onClick={() => removePendingFile(index)}
                      disabled={pendingFile.uploading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  {pendingFile.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {pendingFile.error}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>

          {ticketId && pendingFiles.some(pf => !pf.error && !pf.uploading) && (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={uploadPendingFiles}
              sx={{ mt: 1 }}
              disabled={disabled}
            >
              Upload Files
            </Button>
          )}
        </Box>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Attachments ({attachments.length})
          </Typography>
          <Stack spacing={1}>
            {attachments.map((attachment) => (
              <Card key={attachment.id} variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getFileIcon(attachment.contentType)}
                    
                    <Box flex={1}>
                      <Typography 
                        component="a" 
                        href={attachment.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        variant="body2" 
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        noWrap
                      >
                        {attachment.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {fileUploadService.formatFileSize(attachment.size)} • 
                        {new Date(attachment.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                    <Tooltip title="Remove attachment">
                      <IconButton
                        size="small"
                        onClick={() => removeAttachment(attachment)}
                        disabled={disabled}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;