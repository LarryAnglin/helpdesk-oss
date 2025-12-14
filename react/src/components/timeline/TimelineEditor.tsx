/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
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
import { getTicket } from '../../lib/firebase/ticketService';
import { autoSaveTimeline } from '../../lib/firebase/timelineService';

interface TimelineEditorProps {
  timeline: Timeline;
  onTimelineUpdate: (timeline: Timeline) => void;
  onClose: () => void;
}

interface EventDialogState {
  open: boolean;
  event: TimelineEvent | null;
  isNew: boolean;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({
  timeline,
  onTimelineUpdate,
  onClose
}) => {
  const [editingTimeline, setEditingTimeline] = useState<Timeline>(timeline);
  const [eventDialog, setEventDialog] = useState<EventDialogState>({
    open: false,
    event: null,
    isNew: false
  });
  const [importTicketId, setImportTicketId] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [emailConversation, setEmailConversation] = useState<string>('');
  const [isParsingEmails, setIsParsingEmails] = useState<boolean>(false);
  const [jsonImportData, setJsonImportData] = useState<string>('');
  const [isImportingJson, setIsImportingJson] = useState<boolean>(false);

  // Auto-save timeline when it changes
  useEffect(() => {
    const timelineHasChanges = editingTimeline.updatedAt !== timeline.updatedAt;
    if (timelineHasChanges) {
      autoSaveTimeline(editingTimeline);
    }
  }, [editingTimeline, timeline.updatedAt]);

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

  const handleEventVisibilityToggle = (eventId: string) => {
    const updatedTimeline = {
      ...editingTimeline,
      events: editingTimeline.events.map(event =>
        event.id === eventId ? { ...event, isVisible: !event.isVisible } : event
      ),
      updatedAt: Date.now()
    };
    setEditingTimeline(updatedTimeline);
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEventDialog({
      open: true,
      event: { ...event },
      isNew: false
    });
  };

  const handleAddEvent = () => {
    const newEvent: TimelineEvent = {
      id: '',
      timestamp: Date.now(),
      type: 'custom',
      title: '',
      description: '',
      author: {
        name: 'Current User',
        email: '',
        role: 'admin'
      },
      isVisible: true,
      isEditable: true
    };

    setEventDialog({
      open: true,
      event: newEvent,
      isNew: true
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    const updatedTimeline = {
      ...editingTimeline,
      events: editingTimeline.events.filter(event => event.id !== eventId),
      updatedAt: Date.now()
    };
    setEditingTimeline(updatedTimeline);
  };

  const handleSaveEvent = () => {
    if (!eventDialog.event) return;

    let updatedEvents = [...editingTimeline.events];

    if (eventDialog.isNew) {
      const newEvent = {
        ...eventDialog.event,
        id: `custom-${Date.now()}`
      };
      updatedEvents.push(newEvent);
    } else {
      updatedEvents = updatedEvents.map(event =>
        event.id === eventDialog.event!.id ? eventDialog.event! : event
      );
    }

    // Sort events by timestamp
    updatedEvents.sort((a, b) => a.timestamp - b.timestamp);

    const updatedTimeline = {
      ...editingTimeline,
      events: updatedEvents,
      updatedAt: Date.now()
    };

    setEditingTimeline(updatedTimeline);
    setEventDialog({ open: false, event: null, isNew: false });
  };

  const parseEmailConversation = (conversationText: string): TimelineEvent[] => {
    const lines = conversationText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const emails: TimelineEvent[] = [];
    
    let currentEmail: {
      sender: string;
      timestamp: string;
      content: string[];
    } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line looks like a timestamp
      const timestampRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4},\s+\d{1,2}:\d{2}\s+(AM|PM)/;
      
      if (timestampRegex.test(line)) {
        // This is a timestamp line, so the previous line should be the sender
        if (i > 0) {
          const senderLine = lines[i - 1];
          
          // Save the previous email if we have one
          if (currentEmail) {
            const timestamp = parseEmailTimestamp(currentEmail.timestamp);
            if (timestamp) {
              emails.push({
                id: `email-import-${emails.length}-${Date.now()}`,
                timestamp: timestamp.getTime(),
                type: 'reply',
                title: `Email from ${currentEmail.sender}`,
                description: currentEmail.content.join('\n'),
                author: {
                  name: extractNameFromSender(currentEmail.sender),
                  email: extractEmailFromSender(currentEmail.sender),
                  role: 'user'
                },
                isVisible: true,
                isEditable: true
              });
            }
          }
          
          // Start a new email
          currentEmail = {
            sender: senderLine,
            timestamp: line,
            content: []
          };
        }
      } else if (currentEmail && !timestampRegex.test(line)) {
        // This is part of the email content (not a sender line or timestamp)
        const previousLine = i > 0 ? lines[i - 1] : '';
        if (!timestampRegex.test(previousLine)) {
          currentEmail.content.push(line);
        }
      }
    }
    
    // Don't forget the last email
    if (currentEmail) {
      const timestamp = parseEmailTimestamp(currentEmail.timestamp);
      if (timestamp) {
        emails.push({
          id: `email-import-${emails.length}-${Date.now()}`,
          timestamp: timestamp.getTime(),
          type: 'reply',
          title: `Email from ${currentEmail.sender}`,
          description: currentEmail.content.join('\n'),
          author: {
            name: extractNameFromSender(currentEmail.sender),
            email: extractEmailFromSender(currentEmail.sender),
            role: 'user'
          },
          isVisible: true,
          isEditable: true
        });
      }
    }
    
    return emails.sort((a, b) => a.timestamp - b.timestamp);
  };

  const parseEmailTimestamp = (timestampStr: string): Date | null => {
    try {
      // Remove the "(X days ago)" part if present
      const cleanTimestamp = timestampStr.replace(/\s*\([^)]+\)/, '');
      return new Date(cleanTimestamp);
    } catch (error) {
      console.error('Error parsing timestamp:', timestampStr, error);
      return null;
    }
  };

  const extractNameFromSender = (senderLine: string): string => {
    // Handle cases like "Larry Anglin <larry@anglinanalytics.com>" or just "Larry Anglin"
    const emailMatch = senderLine.match(/^(.+?)\s*<.+>$/);
    if (emailMatch) {
      return emailMatch[1].trim();
    }
    return senderLine.trim();
  };

  const extractEmailFromSender = (senderLine: string): string => {
    // Extract email from "Larry Anglin <larry@anglinanalytics.com>"
    const emailMatch = senderLine.match(/<(.+?)>/);
    return emailMatch ? emailMatch[1] : '';
  };

  const handleImportJsonEvents = async () => {
    if (!jsonImportData.trim()) return;
    
    setIsImportingJson(true);
    try {
      const parsedData = JSON.parse(jsonImportData);
      
      // Validate that it's an array
      if (!Array.isArray(parsedData)) {
        alert('JSON must be an array of timeline events');
        return;
      }

      const importedEvents: TimelineEvent[] = [];
      
      for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i];
        
        // Validate required fields
        if (!item.timestamp || !item.title) {
          alert(`Event ${i + 1}: Missing required fields 'timestamp' and 'title'`);
          return;
        }

        // Parse timestamp - support both ISO strings and Unix timestamps
        let timestamp: number;
        if (typeof item.timestamp === 'string') {
          timestamp = new Date(item.timestamp).getTime();
        } else if (typeof item.timestamp === 'number') {
          // If it's a small number, assume it's in seconds and convert to milliseconds
          timestamp = item.timestamp < 1000000000000 ? item.timestamp * 1000 : item.timestamp;
        } else {
          alert(`Event ${i + 1}: Invalid timestamp format`);
          return;
        }

        if (isNaN(timestamp)) {
          alert(`Event ${i + 1}: Could not parse timestamp '${item.timestamp}'`);
          return;
        }

        // Validate event type
        const validTypes = ['submission', 'reply', 'private_reply', 'status_change', 'assignment', 'custom'];
        const eventType = item.type || 'custom';
        if (!validTypes.includes(eventType)) {
          alert(`Event ${i + 1}: Invalid type '${eventType}'. Must be one of: ${validTypes.join(', ')}`);
          return;
        }

        const timelineEvent: TimelineEvent = {
          id: `json-import-${i}-${Date.now()}`,
          timestamp: timestamp,
          type: eventType as TimelineEvent['type'],
          title: item.title,
          description: item.description || '',
          author: {
            name: item.author?.name || 'Unknown',
            email: item.author?.email || '',
            role: item.author?.role || 'user'
          },
          isVisible: item.isVisible !== false, // Default to true
          isEditable: item.isEditable !== false // Default to true
        };

        importedEvents.push(timelineEvent);
      }

      if (importedEvents.length === 0) {
        alert('No valid events found in JSON data');
        return;
      }

      // Sort by timestamp
      importedEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Merge with existing events
      const combinedEvents = [...editingTimeline.events, ...importedEvents];
      combinedEvents.sort((a, b) => a.timestamp - b.timestamp);

      setEditingTimeline({
        ...editingTimeline,
        events: combinedEvents,
        updatedAt: Date.now()
      });

      setJsonImportData('');
      alert(`Successfully imported ${importedEvents.length} events from JSON data`);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      if (error instanceof SyntaxError) {
        alert('Invalid JSON format. Please check your JSON syntax.');
      } else {
        alert('Error importing JSON data. Please check the format and try again.');
      }
    } finally {
      setIsImportingJson(false);
    }
  };

  const handleImportEmailConversation = async () => {
    if (!emailConversation.trim()) return;
    
    setIsParsingEmails(true);
    try {
      const parsedEmails = parseEmailConversation(emailConversation);
      
      if (parsedEmails.length === 0) {
        alert('No emails could be parsed from the conversation. Please check the format.');
        return;
      }

      // Merge with existing events
      const combinedEvents = [...editingTimeline.events, ...parsedEmails];
      combinedEvents.sort((a, b) => a.timestamp - b.timestamp);

      setEditingTimeline({
        ...editingTimeline,
        events: combinedEvents,
        updatedAt: Date.now()
      });

      setEmailConversation('');
      alert(`Successfully imported ${parsedEmails.length} emails to the timeline`);
    } catch (error) {
      console.error('Error parsing email conversation:', error);
      alert('Error parsing email conversation. Please check the format and try again.');
    } finally {
      setIsParsingEmails(false);
    }
  };

  const handleImportFromTicket = async () => {
    if (!importTicketId.trim()) return;
    
    setIsImporting(true);
    try {
      const ticket = await getTicket(importTicketId.trim());
      if (!ticket) {
        alert('Ticket not found');
        return;
      }

      const importedEvents: TimelineEvent[] = [];

      // Add ticket submission
      importedEvents.push({
        id: `import-submission-${Date.now()}`,
        timestamp: ticket.createdAt,
        type: 'submission',
        title: `Ticket submitted: ${ticket.title}`,
        description: ticket.description,
        author: {
          name: ticket.name,
          email: ticket.email,
          role: 'user'
        },
        isVisible: true,
        isEditable: true
      });

      // Add all replies
      ticket.replies.forEach((reply) => {
        importedEvents.push({
          id: `import-reply-${reply.id}-${Date.now()}`,
          timestamp: reply.createdAt,
          type: reply.isPrivate ? 'private_reply' : 'reply',
          title: reply.isPrivate ? 'Private note added' : 'Reply posted',
          description: reply.message,
          author: {
            name: reply.authorName,
            email: reply.authorEmail,
            role: reply.isPrivate ? 'admin' : 'user'
          },
          isVisible: true,
          isEditable: true
        });
      });

      // Add status changes
      if (ticket.statusHistory) {
        ticket.statusHistory.forEach((statusChange) => {
          importedEvents.push({
            id: `import-status-${statusChange.id}-${Date.now()}`,
            timestamp: statusChange.changedAt,
            type: 'status_change',
            title: `Status changed from ${statusChange.fromStatus} to ${statusChange.toStatus}`,
            description: statusChange.reason || '',
            author: {
              name: statusChange.changedByName,
              email: '',
              role: 'admin'
            },
            isVisible: true,
            isEditable: true
          });
        });
      }

      // Sort by timestamp
      importedEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Merge with existing events
      const combinedEvents = [...editingTimeline.events, ...importedEvents];
      combinedEvents.sort((a, b) => a.timestamp - b.timestamp);

      setEditingTimeline({
        ...editingTimeline,
        events: combinedEvents,
        updatedAt: Date.now()
      });

      setImportTicketId('');
      alert(`Successfully imported ${importedEvents.length} events from ticket ${ticket.id}`);
    } catch (error) {
      console.error('Error importing ticket:', error);
      alert('Error importing ticket. Please check the ticket ID and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseTimeline = () => {
    // Final save before closing
    autoSaveTimeline(editingTimeline, 0); // Immediate save with no debounce
    onTimelineUpdate(editingTimeline);
    onClose();
  };

  const groupedEvents = groupEventsByDate(editingTimeline.events.filter(e => e.isVisible));

  return (
    <>
      <Dialog open={true} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon />
            Edit Timeline: {editingTimeline.title}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Timeline Title"
              value={editingTimeline.title}
              onChange={(e) => setEditingTimeline({
                ...editingTimeline,
                title: e.target.value,
                updatedAt: Date.now()
              })}
              sx={{ mb: 2 }}
            />
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Edit event titles and descriptions, add custom events, or hide events from the timeline.
              Use the visibility toggle to include/exclude events from the PDF export.
            </Alert>

            {/* Import from Ticket */}
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Import Events from Another Ticket
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  label="Ticket ID"
                  size="small"
                  value={importTicketId}
                  onChange={(e) => setImportTicketId(e.target.value)}
                  placeholder="Enter ticket ID to import events"
                  sx={{ flex: 1 }}
                  disabled={isImporting}
                />
                <Button
                  variant="outlined"
                  onClick={handleImportFromTicket}
                  disabled={!importTicketId.trim() || isImporting}
                  size="small"
                >
                  {isImporting ? 'Importing...' : 'Import Events'}
                </Button>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                This will import the submission, all replies, and status changes from the specified ticket.
              </Typography>
            </Box>

            {/* Import from Email Conversation */}
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Import Events from Email Conversation
              </Typography>
              <TextField
                label="Email Conversation"
                multiline
                rows={6}
                fullWidth
                value={emailConversation}
                onChange={(e) => setEmailConversation(e.target.value)}
                placeholder="Paste threaded email conversation here... 

Example format:
Sender Name
Jul 5, 2025, 6:25 PM (3 days ago)
Email message content here...

Another Sender <email@example.com>
Jul 5, 2025, 6:30 PM (3 days ago)
to Recipient

Another email message..."
                sx={{ mb: 2 }}
                disabled={isParsingEmails}
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleImportEmailConversation}
                  disabled={!emailConversation.trim() || isParsingEmails}
                  size="small"
                >
                  {isParsingEmails ? 'Parsing...' : 'Import Emails'}
                </Button>
                <Typography variant="caption" color="textSecondary">
                  Parses sender names, timestamps, and message content from threaded email conversations.
                </Typography>
              </Box>
            </Box>

            {/* Import from JSON */}
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Import Events from JSON
              </Typography>
              <TextField
                label="JSON Timeline Events"
                multiline
                rows={8}
                fullWidth
                value={jsonImportData}
                onChange={(e) => setJsonImportData(e.target.value)}
                placeholder={`Paste JSON array of timeline events here...

Example format:
[
  {
    "timestamp": "2025-07-09T14:30:00Z",
    "type": "submission",
    "title": "User reported Wi-Fi connectivity issue",
    "description": "Guest in cabin 12 unable to connect devices to Wi-Fi network",
    "author": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    }
  },
  {
    "timestamp": 1720535400000,
    "type": "reply", 
    "title": "Technician responded",
    "description": "Checked router settings and found configuration issue",
    "author": {
      "name": "Tech Support",
      "email": "tech@example.com",
      "role": "admin"
    }
  }
]

Supported types: submission, reply, private_reply, status_change, assignment, custom
Timestamp: ISO string or Unix timestamp (seconds or milliseconds)`}
                sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
                disabled={isImportingJson}
              />
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleImportJsonEvents}
                  disabled={!jsonImportData.trim() || isImportingJson}
                  size="small"
                >
                  {isImportingJson ? 'Importing...' : 'Import JSON Events'}
                </Button>
                <Typography variant="caption" color="textSecondary">
                  Flexible format - convert any structured data to JSON and import it.
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Events List */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Timeline Events</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={handleAddEvent}
              >
                Add Custom Event
              </Button>
            </Box>

            {Object.entries(groupedEvents).map(([date, events]) => (
              <Box key={date} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                  {formatDate(events[0].timestamp)}
                </Typography>
                
                <List dense>
                  {events.map((event) => (
                    <ListItem key={event.id} sx={{ pl: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 80 }}>
                        <Chip
                          icon={getEventIcon(event.type)}
                          label={formatTime(event.timestamp)}
                          size="small"
                          color={getEventColor(event.type) as any}
                          variant="outlined"
                          sx={{
                            '& .MuiChip-label': {
                              color: 'text.primary',
                              fontWeight: 'medium'
                            }
                          }}
                        />
                      </Box>
                      
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              {event.description}
                            </Typography>
                            {event.author && (
                              <Typography variant="caption" display="block" color="textSecondary">
                                by {event.author.name}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ ml: 2 }}
                      />
                      
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Tooltip title={event.isVisible ? 'Hide from timeline' : 'Show in timeline'}>
                            <IconButton
                              size="small"
                              onClick={() => handleEventVisibilityToggle(event.id)}
                              color={event.isVisible ? 'primary' : 'default'}
                            >
                              {event.isVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          {event.isEditable && (
                            <Tooltip title="Edit event">
                              <IconButton
                                size="small"
                                onClick={() => handleEditEvent(event)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {event.isEditable && (
                            <Tooltip title="Delete event">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEvent(event.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                
                {Object.keys(groupedEvents).indexOf(date) < Object.keys(groupedEvents).length - 1 && (
                  <Divider sx={{ my: 2 }} />
                )}
              </Box>
            ))}

            {editingTimeline.events.length === 0 && (
              <Alert severity="info">
                No events in this timeline. Add some custom events to get started.
              </Alert>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Typography variant="caption" color="textSecondary" sx={{ flex: 1, mr: 2 }}>
            Changes are automatically saved
          </Typography>
          <Button onClick={handleCloseTimeline} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Edit Dialog */}
      <Dialog 
        open={eventDialog.open} 
        onClose={() => setEventDialog({ open: false, event: null, isNew: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {eventDialog.isNew ? 'Add Custom Event' : 'Edit Event'}
        </DialogTitle>
        
        <DialogContent>
          {eventDialog.event && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Event Title"
                fullWidth
                value={eventDialog.event.title}
                onChange={(e) => setEventDialog({
                  ...eventDialog,
                  event: { ...eventDialog.event!, title: e.target.value }
                })}
                placeholder="Brief summary of what happened"
              />
              
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={eventDialog.event.description}
                onChange={(e) => setEventDialog({
                  ...eventDialog,
                  event: { ...eventDialog.event!, description: e.target.value }
                })}
                placeholder="Detailed description of the event"
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Date"
                  type="date"
                  value={eventDialog.event ? new Date(eventDialog.event.timestamp).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (!eventDialog.event) return;
                    const currentDate = new Date(eventDialog.event.timestamp);
                    // Parse date components manually to avoid timezone issues
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(year, month - 1, day); // month is 0-indexed
                    setEventDialog({
                      ...eventDialog,
                      event: { ...eventDialog.event, timestamp: newDate.getTime() }
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                
                <TextField
                  label="Time"
                  type="time"
                  value={eventDialog.event ? new Date(eventDialog.event.timestamp).toTimeString().slice(0, 5) : ''}
                  onChange={(e) => {
                    if (!eventDialog.event) return;
                    const currentDate = new Date(eventDialog.event.timestamp);
                    const [hours, minutes] = e.target.value.split(':');
                    currentDate.setHours(parseInt(hours), parseInt(minutes));
                    setEventDialog({
                      ...eventDialog,
                      event: { ...eventDialog.event, timestamp: currentDate.getTime() }
                    });
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={eventDialog.event.isVisible}
                    onChange={(e) => setEventDialog({
                      ...eventDialog,
                      event: { ...eventDialog.event!, isVisible: e.target.checked }
                    })}
                  />
                }
                label="Visible in timeline"
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setEventDialog({ open: false, event: null, isNew: false })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEvent} variant="contained">
            {eventDialog.isNew ? 'Add Event' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TimelineEditor;