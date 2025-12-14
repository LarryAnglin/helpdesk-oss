/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  Box,
  Chip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { SLAStatus, SLAStatusType } from '../../lib/types/sla';
import { formatTimeRemaining, getSLAStatusColor } from '../../lib/utils/slaUtils';

interface SLAIndicatorProps {
  sla: SLAStatus;
  compact?: boolean;
  showDetails?: boolean;
}

const SLAIndicator: React.FC<SLAIndicatorProps> = ({ 
  sla, 
  compact = false, 
  showDetails = false 
}) => {
  const getStatusIcon = (status: SLAStatusType) => {
    switch (status) {
      case 'met':
        return <CheckCircleIcon fontSize="small" />;
      case 'pending':
        return <ScheduleIcon fontSize="small" />;
      case 'at_risk':
        return <WarningIcon fontSize="small" />;
      case 'breached':
        return <ErrorIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const getStatusLabel = (status: SLAStatusType) => {
    switch (status) {
      case 'met':
        return 'Met';
      case 'pending':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'breached':
        return 'Breached';
      default:
        return 'Unknown';
    }
  };

  const getProgressValue = (deadline: number, status: SLAStatusType, currentTime: number = Date.now()) => {
    if (status === 'met' || status === 'breached') {
      return 100;
    }
    
    const timeElapsed = currentTime - (deadline - (24 * 60 * 60 * 1000)); // Assuming 24h total time for demo
    const totalTime = 24 * 60 * 60 * 1000;
    return Math.min(100, Math.max(0, (timeElapsed / totalTime) * 100));
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          size="small"
          icon={getStatusIcon(sla.responseStatus)}
          label={`Response: ${getStatusLabel(sla.responseStatus)}`}
          color={getSLAStatusColor(sla.responseStatus) as any}
          variant={sla.responseStatus === 'breached' ? 'filled' : 'outlined'}
        />
        <Chip
          size="small"
          icon={getStatusIcon(sla.resolutionStatus)}
          label={`Resolution: ${getStatusLabel(sla.resolutionStatus)}`}
          color={getSLAStatusColor(sla.resolutionStatus) as any}
          variant={sla.resolutionStatus === 'breached' ? 'filled' : 'outlined'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleIcon fontSize="small" />
        Service Level Agreement
        {sla.isBusinessHours && (
          <Chip size="small" label="Business Hours" variant="outlined" />
        )}
      </Typography>

      {/* Response SLA */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            First Response
          </Typography>
          <Chip
            size="small"
            icon={getStatusIcon(sla.responseStatus)}
            label={getStatusLabel(sla.responseStatus)}
            color={getSLAStatusColor(sla.responseStatus) as any}
            variant={sla.responseStatus === 'breached' ? 'filled' : 'outlined'}
          />
        </Box>
        
        {sla.responseStatus !== 'met' && (
          <Typography variant="caption" color="text.secondary">
            {formatTimeRemaining(sla.responseDeadline)}
          </Typography>
        )}
        
        {sla.responseTime && (
          <Typography variant="caption" color="text.secondary" display="block">
            Actual: {sla.responseTime.toFixed(1)} hours
          </Typography>
        )}
        
        {showDetails && sla.responseStatus === 'pending' && (
          <LinearProgress
            variant="determinate"
            value={getProgressValue(sla.responseDeadline, sla.responseStatus)}
            color={getSLAStatusColor(sla.responseStatus) as any}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </Box>

      {/* Resolution SLA */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            Resolution
          </Typography>
          <Chip
            size="small"
            icon={getStatusIcon(sla.resolutionStatus)}
            label={getStatusLabel(sla.resolutionStatus)}
            color={getSLAStatusColor(sla.resolutionStatus) as any}
            variant={sla.resolutionStatus === 'breached' ? 'filled' : 'outlined'}
          />
        </Box>
        
        {sla.resolutionStatus !== 'met' && (
          <Typography variant="caption" color="text.secondary">
            {formatTimeRemaining(sla.resolutionDeadline)}
          </Typography>
        )}
        
        {sla.resolutionTime && (
          <Typography variant="caption" color="text.secondary" display="block">
            Actual: {sla.resolutionTime.toFixed(1)} hours
          </Typography>
        )}
        
        {showDetails && sla.resolutionStatus === 'pending' && (
          <LinearProgress
            variant="determinate"
            value={getProgressValue(sla.resolutionDeadline, sla.resolutionStatus)}
            color={getSLAStatusColor(sla.resolutionStatus) as any}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        )}
      </Box>
    </Box>
  );
};

export default SLAIndicator;