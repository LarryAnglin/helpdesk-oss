/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  Print as PrintIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Article as ArticleIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { Timeline, TimelineEvent } from '../../lib/types/timeline';
import { groupEventsByDate } from '../../lib/services/timelineService';

interface TimelineViewerProps {
  timeline: Timeline;
  onEdit: () => void;
  onExportPDF: () => void;
}

const TimelineViewer: React.FC<TimelineViewerProps> = ({
  timeline,
  onEdit,
  onExportPDF
}) => {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'submission':
        return <ArticleIcon fontSize="small" />;
      case 'reply':
        return <PersonIcon fontSize="small" />;
      case 'private_reply':
        return <LockIcon fontSize="small" />;
      case 'status_change':
        return <SecurityIcon fontSize="small" />;
      case 'assignment':
        return <AssignmentIcon fontSize="small" />;
      case 'custom':
        return <TimelineIcon fontSize="small" />;
      default:
        return <TimeIcon fontSize="small" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'submission':
        return 'primary';
      case 'reply':
        return 'info';
      case 'private_reply':
        return 'warning';
      case 'status_change':
        return 'success';
      case 'assignment':
        return 'secondary';
      case 'custom':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const visibleEvents = timeline.events.filter(event => event.isVisible);
  const groupedEvents = groupEventsByDate(visibleEvents);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {timeline.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<EditIcon />}
            variant="outlined"
            onClick={onEdit}
          >
            Edit Timeline
          </Button>
          <Button
            startIcon={<PrintIcon />}
            variant="contained"
            onClick={onExportPDF}
          >
            Print Timeline
          </Button>
        </Box>
      </Box>

      {visibleEvents.length === 0 ? (
        <Alert severity="info">
          No events to display in this timeline.
        </Alert>
      ) : (
        <Box>
          {Object.entries(groupedEvents).map(([date, events]) => (
            <Box key={date} sx={{ mb: 4 }}>
              {/* Date Header */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                pb: 1,
                borderBottom: '2px solid',
                borderColor: 'primary.main'
              }}>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {formatDate(events[0].timestamp)}
                </Typography>
              </Box>
              
              {/* Events for this date */}
              <Box sx={{ position: 'relative', pl: 2 }}>
                {/* Vertical line for the day */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 24,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'divider'
                  }}
                />
                
                {events.map((event) => (
                  <Box key={event.id} sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                    {/* Time marker */}
                    <Box sx={{ 
                      minWidth: 80, 
                      display: 'flex', 
                      justifyContent: 'flex-end',
                      pr: 2
                    }}>
                      <Chip
                        icon={getEventIcon(event.type)}
                        label={formatTime(event.timestamp)}
                        size="small"
                        color={getEventColor(event.type) as any}
                        variant="filled"
                        sx={{
                          bgcolor: 'background.paper',
                          border: '2px solid',
                          borderColor: `${getEventColor(event.type)}.main`,
                          position: 'relative',
                          zIndex: 1,
                          color: 'text.primary',
                          '& .MuiChip-label': {
                            color: 'text.primary',
                            fontWeight: 'bold'
                          },
                          '& .MuiChip-icon': {
                            color: `${getEventColor(event.type)}.main`
                          }
                        }}
                      />
                    </Box>
                    
                    {/* Event content */}
                    <Box sx={{ flex: 1, pl: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                        {event.title}
                      </Typography>
                      
                      {event.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                          {event.description}
                        </Typography>
                      )}
                      
                      {event.author && (
                        <Typography variant="caption" color="textSecondary">
                          by {event.author.name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
              
              {/* Divider between dates */}
              {Object.keys(groupedEvents).indexOf(date) < Object.keys(groupedEvents).length - 1 && (
                <Divider sx={{ mt: 2 }} />
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="textSecondary">
          Timeline created on {new Date(timeline.createdAt).toLocaleDateString()} 
          {timeline.updatedAt !== timeline.createdAt && 
            `, last updated on ${new Date(timeline.updatedAt).toLocaleDateString()}`
          }
        </Typography>
      </Box>
    </Paper>
  );
};

export default TimelineViewer;