/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
  Divider,
  Avatar
} from '@mui/material';
import {
  Schedule as TimeIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { StatusChange, TicketStatus } from '../../lib/types/ticket';

interface StatusHistoryCardProps {
  statusHistory?: StatusChange[];
  currentStatus: TicketStatus;
  createdAt: number;
}

const StatusHistoryCard: React.FC<StatusHistoryCardProps> = ({
  statusHistory,
  currentStatus,
  createdAt
}) => {
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'Open': return 'primary';
      case 'Resolved': return 'success';
      case 'Closed': return 'default';
      case 'Accepted': return 'success';
      case 'Rejected': return 'error';
      case 'On Hold': return 'warning';
      case 'Waiting': return 'info';
      case 'Paused': return 'default';
      default: return 'default';
    }
  };

  const currentTime = Date.now();
  const currentStatusDuration = statusHistory && statusHistory.length > 0 
    ? currentTime - statusHistory[statusHistory.length - 1].changedAt
    : currentTime - createdAt;

  if (!statusHistory || statusHistory.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Status History
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={currentStatus} 
              color={getStatusColor(currentStatus)} 
              size="small" 
            />
            <Typography variant="body2" color="text.secondary">
              Since creation ({formatDuration(currentStatusDuration)})
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Status History
        </Typography>
        
        <Box sx={{ position: 'relative' }}>
          {/* Initial status (created) */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, position: 'relative' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 2, mt: 0.5, fontSize: '0.75rem' }}>
              1
            </Avatar>
            <Box sx={{ flex: 1, minHeight: 60 }}>
              <Typography variant="body2" color="text.secondary">
                {formatDate(createdAt)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip 
                  label="Open" 
                  color="primary" 
                  size="small" 
                />
                <Typography variant="caption" color="text.secondary">
                  Ticket created
                </Typography>
              </Box>
              {statusHistory[0] && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <TimeIcon fontSize="small" />
                  Duration: {formatDuration(statusHistory[0].duration || 0)}
                </Typography>
              )}
            </Box>
            {/* Vertical line */}
            {statusHistory.length > 0 && (
              <Box sx={{ 
                position: 'absolute', 
                left: '16px', 
                top: '40px',
                bottom: '-20px',
                width: '2px', 
                bgcolor: 'divider' 
              }} />
            )}
          </Box>

          {/* Status changes */}
          {statusHistory.map((change, index) => (
            <Box key={change.id}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2, position: 'relative' }}>
                <Avatar sx={{ 
                  bgcolor: getStatusColor(change.toStatus) === 'primary' ? 'primary.main' :
                           getStatusColor(change.toStatus) === 'success' ? 'success.main' :
                           getStatusColor(change.toStatus) === 'error' ? 'error.main' :
                           getStatusColor(change.toStatus) === 'warning' ? 'warning.main' :
                           getStatusColor(change.toStatus) === 'info' ? 'info.main' :
                           'grey.500',
                  color: getStatusColor(change.toStatus) === 'default' ? 'text.primary' : 'white',
                  width: 32, 
                  height: 32, 
                  mr: 2, 
                  mt: 0.5, 
                  fontSize: '0.75rem' 
                }}>
                  {index + 2}
                </Avatar>
                <Box sx={{ flex: 1, minHeight: 60 }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(change.changedAt)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip 
                      label={change.toStatus} 
                      color={getStatusColor(change.toStatus)} 
                      size="small" 
                    />
                    <Tooltip title={change.changedByName}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {change.changedByName}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                  
                  {change.reason && (
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}>
                      "{change.reason}"
                    </Typography>
                  )}
                  
                  {change.duration && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <TimeIcon fontSize="small" />
                      Time in {change.fromStatus}: {formatDuration(change.duration)}
                    </Typography>
                  )}
                </Box>
                {/* Vertical line between items */}
                {index < statusHistory.length - 1 && (
                  <Box sx={{ 
                    position: 'absolute', 
                    left: '16px', 
                    top: '40px',
                    bottom: '-20px',
                    width: '2px', 
                    bgcolor: 'divider' 
                  }} />
                )}
              </Box>
              {index < statusHistory.length - 1 && <Divider sx={{ my: 1, ml: 6 }} />}
            </Box>
          ))}
        </Box>

      </CardContent>
    </Card>
  );
};

export default StatusHistoryCard;