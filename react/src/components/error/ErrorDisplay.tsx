/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  Typography,
  Paper,
  Divider,
  Link as MuiLink,
  SxProps,
  Theme
} from '@mui/material';
import {
  ErrorOutline,
  Warning,
  Info,
  ContactSupport,
  Refresh,
  ExpandMore,
  ExpandLess,
  ContentCopy
} from '@mui/icons-material';

interface ErrorInfo {
  id: string;
  type: 'USER_ERROR' | 'CLIENT_ERROR' | 'SERVER_ERROR' | 'SYSTEM_ERROR';
  code: string;
  message: string;
  action: string;
  timestamp: string;
  technicalDetails?: string;
  support?: {
    message: string;
    contact: {
      email: string;
      phone: string;
      hours: string;
    };
    trackingId: string;
  };
}

interface ErrorDisplayProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
  sx?: SxProps<Theme>;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = false,
  sx
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [copiedTrackingId, setCopiedTrackingId] = React.useState(false);

  const getSeverity = (type: string) => {
    switch (type) {
      case 'USER_ERROR':
      case 'CLIENT_ERROR':
        return 'warning';
      case 'SERVER_ERROR':
        return 'error';
      case 'SYSTEM_ERROR':
        return 'error';
      default:
        return 'error';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'USER_ERROR':
        return <Info />;
      case 'CLIENT_ERROR':
        return <Warning />;
      case 'SERVER_ERROR':
      case 'SYSTEM_ERROR':
        return <ErrorOutline />;
      default:
        return <ErrorOutline />;
    }
  };

  const getActionButton = () => {
    switch (error.action) {
      case 'RETRY':
        return onRetry ? (
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        ) : null;

      case 'REFRESH_AUTH':
        return (
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Refresh Page
          </Button>
        );

      case 'FIX_INPUT':
        return onRetry ? (
          <Button
            variant="outlined"
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            Edit and Retry
          </Button>
        ) : null;

      case 'CONTACT_SUPPORT':
      case 'ESCALATE_IMMEDIATELY':
        return null; // Handled in support section

      default:
        return onRetry ? (
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onRetry}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        ) : null;
    }
  };

  const copyTrackingId = async (trackingId: string) => {
    try {
      await navigator.clipboard.writeText(trackingId);
      setCopiedTrackingId(true);
      setTimeout(() => setCopiedTrackingId(false), 2000);
    } catch (err) {
      console.error('Failed to copy tracking ID:', err);
    }
  };

  const isServerSideError = error.type === 'SERVER_ERROR' || error.type === 'SYSTEM_ERROR';

  return (
    <Alert
      severity={getSeverity(error.type)}
      icon={getIcon(error.type)}
      onClose={onDismiss}
      sx={{ mb: 2, ...sx }}
    >
      <AlertTitle>
        {error.type === 'USER_ERROR' && 'Action Required'}
        {error.type === 'CLIENT_ERROR' && 'Connection Issue'}
        {error.type === 'SERVER_ERROR' && 'Service Unavailable'}
        {error.type === 'SYSTEM_ERROR' && 'System Issue'}
      </AlertTitle>

      <Typography variant="body2" sx={{ mb: 1 }}>
        {error.message}
      </Typography>

      {/* Error ID and Type */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`Error ID: ${error.id}`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={error.type.replace('_', ' ')}
          size="small"
          color={isServerSideError ? 'error' : 'warning'}
        />
      </Box>

      {/* Action Button */}
      {getActionButton()}

      {/* Support Information for Server Errors */}
      {error.support && (
        <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ContactSupport sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" color="primary">
              We're Here to Help
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            {error.support.message}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Tracking ID:
            </Typography>
            <Chip
              label={error.support.trackingId}
              size="small"
              onClick={() => copyTrackingId(error.support!.trackingId)}
              onDelete={() => copyTrackingId(error.support!.trackingId)}
              deleteIcon={<ContentCopy />}
              color={copiedTrackingId ? 'success' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
            {copiedTrackingId && (
              <Typography variant="caption" color="success.main">
                Copied!
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Contact Support:
          </Typography>
          <Typography variant="body2">
            📧 Email:{' '}
            <MuiLink href={`mailto:${error.support.contact.email}?subject=Error Report - ${error.support.trackingId}`}>
              {error.support.contact.email}
            </MuiLink>
          </Typography>
          <Typography variant="body2">
            📞 Phone: {error.support.contact.phone}
          </Typography>
          <Typography variant="body2">
            🕒 Hours: {error.support.contact.hours}
          </Typography>
        </Paper>
      )}

      {/* Technical Details (for debugging) */}
      {(showTechnicalDetails || error.technicalDetails) && (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
          >
            Technical Details
          </Button>
          <Collapse in={showDetails}>
            <Paper elevation={1} sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
              <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                Error Code: {error.code}{'\n'}
                Timestamp: {error.timestamp}{'\n'}
                {error.technicalDetails && `Details: ${error.technicalDetails}`}
              </Typography>
            </Paper>
          </Collapse>
        </Box>
      )}
    </Alert>
  );
};

export default ErrorDisplay;