/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Ticket, TicketRelationshipType } from '../../lib/types/ticket';
import { getTicket, searchTickets } from '../../lib/firebase/ticketService';
import TicketSummary from './TicketSummary';
import TicketRepliesList from './TicketRepliesList';
import AddTicketReply from './AddTicketReply';
import TimeTracker from '../timeTracking/TimeTracker';
import StatusHistoryCard from './StatusHistoryCard';
import RelatedTicketsCard from './RelatedTicketsCard';
import TicketSplitDialog from './TicketSplitDialog';
import TicketMergeDialog from './TicketMergeDialog';
import TimelineViewer from '../timeline/TimelineViewer';
import TimelineEditor from '../timeline/TimelineEditor';
import { Timeline } from '../../lib/types/timeline';
import { createTimelineFromTicket } from '../../lib/services/timelineService';
import { openTimelinePrintDialog } from '../timeline/TimelinePrintDialog';
import { getLatestTimelineForTicket, saveTimeline } from '../../lib/firebase/timelineService';
import { createTicketRelationship } from '../../lib/firebase/ticketRelationshipService';
import { useAuth } from '../../lib/auth/AuthContext';
import { hasRole } from '../../lib/utils/roleUtils';
import { formatShortIdForDisplay } from '../../lib/services/shortIdSearch';

// Base62 character set for short IDs
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Convert hex string to Base62
const hexToBase62 = (hex: string): string => {
  let num = BigInt('0x' + hex);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  return result || '0';
};

// Generate deterministic short ID from ticket ID using hash
const getShortIdFromTicket = (ticketId: string): string => {
  // Create a simple hash using built-in methods (compatible with all environments)
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Convert to Base62 and ensure 6 characters
  let base62 = hexToBase62(positiveHash);
  
  // Pad or truncate to exactly 6 characters
  if (base62.length < 6) {
    base62 = base62.padStart(6, BASE62_CHARS[0]);
  } else if (base62.length > 6) {
    base62 = base62.substring(0, 6);
  }
  
  return base62;
};

const TicketDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [timelineEditorOpen, setTimelineEditorOpen] = useState(false);
  const [generatingTimeline, setGeneratingTimeline] = useState(false);
  const [includeRelatedTickets, setIncludeRelatedTickets] = useState(false);
  const [addRelationshipDialogOpen, setAddRelationshipDialogOpen] = useState(false);
  
  // Add relationship dialog state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState<TicketRelationshipType>('related_to');
  const [description, setDescription] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingRelationship, setIsCreatingRelationship] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket(id);
    }
  }, [id]);

  const handleBackToTickets = () => {
    // Check if there's a referrer state from navigation
    const from = location.state?.from;
    
    if (from) {
      // If we have a stored previous location, navigate back to it
      navigate(from);
    } else {
      // Try to go back in browser history first
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Fallback: determine appropriate default based on user role
        const isAdmin = hasRole(userData?.role, 'tech');
        const defaultPath = isAdmin ? '/tickets/all' : '/tickets';
        navigate(defaultPath);
      }
    }
  };

  const loadTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const [fetchedTicket, existingTimeline] = await Promise.all([
        getTicket(ticketId),
        getLatestTimelineForTicket(ticketId)
      ]);
      
      if (fetchedTicket) {
        setTicket(fetchedTicket);
        setTimeline(existingTimeline);
        setError(null);
      } else {
        setError('Ticket not found');
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError('Failed to load ticket. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyAdded = () => {
    // Reload the ticket to show the new reply
    if (id) {
      loadTicket(id);
    }
  };

  const handleTicketUpdate = () => {
    // Reload the ticket to show the updates
    if (id) {
      loadTicket(id);
    }
  };

  const handleSilentTicketUpdate = (updatedTicket: Ticket) => {
    // Update ticket state without re-rendering the entire UI
    setTicket(updatedTicket);
  };

  const handleSplitComplete = (newTicketIds: string[]) => {
    // Refresh the current ticket to show relationships
    handleTicketUpdate();
    // Optionally navigate to one of the new tickets
    console.log('Created new tickets:', newTicketIds);
  };

  const handleMergeComplete = () => {
    // Refresh the current ticket to show merged data
    handleTicketUpdate();
  };

  const handleRelatedTicketClick = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleCreateTimeline = async () => {
    if (!ticket) return;
    
    try {
      setGeneratingTimeline(true);
      const newTimeline = await createTimelineFromTicket(
        ticket, 
        {
          includeSubmission: true,
          includeReplies: true,
          includePrivateReplies: true,
          includeStatusChanges: true,
          includeAssignments: true,
          includeRelatedTickets: includeRelatedTickets,
          summarizeWithAI: false // Explicitly disable AI until endpoint is available
        }, 
        'current-user'
      );
      
      // Save the timeline immediately
      const savedTimelineId = await saveTimeline(newTimeline);
      const savedTimeline = { ...newTimeline, id: savedTimelineId };
      
      setTimeline(savedTimeline);
    } catch (error) {
      console.error('Error creating timeline:', error);
      // Could show an error alert here
    } finally {
      setGeneratingTimeline(false);
    }
  };

  const handleTimelineUpdate = (updatedTimeline: Timeline) => {
    setTimeline(updatedTimeline);
    setTimelineEditorOpen(false);
  };

  const handleExportTimelinePDF = () => {
    if (!timeline || !ticket) return;
    
    const shortId = getShortIdFromTicket(ticket.id);
    const displayId = formatShortIdForDisplay(shortId);
    
    // Truncate ticket title if too long
    const maxTitleLength = 50;
    const truncatedTitle = ticket.title.length > maxTitleLength 
      ? ticket.title.substring(0, maxTitleLength) + '...'
      : ticket.title;
    
    openTimelinePrintDialog(timeline, {
      title: `Timeline for ${displayId}: ${truncatedTitle}`,
      includeTicketSummary: true,
      includeEventDetails: true,
      groupByDate: true,
      showTimeOnly: true
    });
  };

  // Search tickets for relationship
  const handleSearchTickets = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchTickets(searchTerm.trim());
      // Filter out current ticket from results
      const filteredResults = results.filter(resultTicket => resultTicket.id !== ticket?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching tickets:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle ticket selection for relationship
  const handleTicketSelection = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  // Create relationships
  const handleCreateRelationships = async () => {
    if (!ticket || !user || selectedTickets.length === 0) return;

    setIsCreatingRelationship(true);
    try {
      // Create relationships for all selected tickets
      await Promise.all(
        selectedTickets.map(targetTicketId =>
          createTicketRelationship(
            ticket.id,
            targetTicketId,
            relationshipType,
            user.uid,
            user.displayName || user.email || 'Unknown User',
            description.trim() || undefined
          )
        )
      );

      // Reset form and close dialog
      setSelectedTickets([]);
      setSearchTerm('');
      setSearchResults([]);
      setRelationshipType('related_to');
      setDescription('');
      setAddRelationshipDialogOpen(false);

      // Reload ticket to show new relationships
      if (id) {
        loadTicket(id);
      }
    } catch (error) {
      console.error('Error creating relationships:', error);
      setError('Failed to create relationships. Please try again.');
    } finally {
      setIsCreatingRelationship(false);
    }
  };

  // Handle dialog close
  const handleCloseRelationshipDialog = () => {
    setSelectedTickets([]);
    setSearchTerm('');
    setSearchResults([]);
    setRelationshipType('related_to');
    setDescription('');
    setAddRelationshipDialogOpen(false);
  };

  // Search when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearchTickets(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !ticket) {
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Ticket not found'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/tickets')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Tickets
        </Button>
      </Box>
    );
  }


  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBackToTickets}
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      <TicketSummary 
        ticket={ticket} 
        onUpdate={handleTicketUpdate}
        onSplit={() => setSplitDialogOpen(true)}
        onMerge={() => setMergeDialogOpen(true)}
        onSilentUpdate={handleSilentTicketUpdate}
      />

      {/* Replies Section - Essential, right below ticket details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Replies ({ticket.replies.length})
        </Typography>
        
        <TicketRepliesList replies={ticket.replies} />
      </Paper>

      {/* Add Reply - Right after replies */}
      {ticket.status !== 'Closed' ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <AddTicketReply ticketId={ticket.id} onReplyAdded={handleReplyAdded} />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          This ticket is closed. No new replies can be added.
        </Alert>
      )}

      {/* Status History - Below replies */}
      <Box sx={{ mb: 3 }}>
        <StatusHistoryCard 
          statusHistory={ticket.statusHistory}
          currentStatus={ticket.status}
          createdAt={ticket.createdAt}
        />
      </Box>

      {/* Advanced Section - Collapsible */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="advanced-content"
          id="advanced-header"
        >
          <Typography variant="h6">Advanced</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Time Tracking */}
            <Paper sx={{ p: 3 }}>
              <TimeTracker ticketId={ticket.id} onTimeEntryChange={handleTicketUpdate} />
            </Paper>

            {/* Related Tickets */}
            <RelatedTicketsCard 
              ticket={ticket}
              onTicketClick={handleRelatedTicketClick}
              onAddRelationship={() => setAddRelationshipDialogOpen(true)}
            />

            {/* Timeline Section */}
            {timeline ? (
              <TimelineViewer
                timeline={timeline}
                onEdit={() => setTimelineEditorOpen(true)}
                onExportPDF={handleExportTimelinePDF}
              />
            ) : (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Ticket Timeline
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Create a visual timeline of all events for this ticket. Changes are automatically saved.
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={includeRelatedTickets}
                          onChange={(e) => setIncludeRelatedTickets(e.target.checked)}
                          disabled={generatingTimeline}
                        />
                      }
                      label="Include events from related tickets"
                    />
                  </Box>
                  <Button
                    startIcon={<TimelineIcon />}
                    variant="contained"
                    onClick={handleCreateTimeline}
                    disabled={generatingTimeline}
                    sx={{ ml: 2 }}
                  >
                    {generatingTimeline ? 'Generating...' : 'Generate Timeline'}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>


      {/* Split Dialog */}
      <TicketSplitDialog
        open={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        ticket={ticket}
        onSplitComplete={handleSplitComplete}
      />

      {/* Merge Dialog */}
      <TicketMergeDialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        primaryTicket={ticket}
        onMergeComplete={handleMergeComplete}
      />

      {/* Timeline Editor */}
      {timeline && timelineEditorOpen && (
        <TimelineEditor
          timeline={timeline}
          onTimelineUpdate={handleTimelineUpdate}
          onClose={() => setTimelineEditorOpen(false)}
        />
      )}

      {/* Add Relationship Dialog */}
      <Dialog 
        open={addRelationshipDialogOpen} 
        onClose={handleCloseRelationshipDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Related Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Search Field */}
            <TextField
              label="Search tickets"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter ticket ID, title, or description..."
              disabled={isCreatingRelationship}
            />

            {/* Relationship Type */}
            <FormControl fullWidth>
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as TicketRelationshipType)}
                label="Relationship Type"
                disabled={isCreatingRelationship}
              >
                <MenuItem value="related_to">Related to</MenuItem>
                <MenuItem value="duplicate_of">Duplicate of</MenuItem>
                <MenuItem value="blocks">Blocks</MenuItem>
                <MenuItem value="blocked_by">Blocked by</MenuItem>
                <MenuItem value="parent_of">Parent of</MenuItem>
                <MenuItem value="child_of">Child of</MenuItem>
              </Select>
            </FormControl>

            {/* Description */}
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context about this relationship..."
              disabled={isCreatingRelationship}
            />

            {/* Search Results */}
            {isSearching && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {searchResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Search Results ({searchResults.length})
                </Typography>
                <List sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {searchResults.map((resultTicket) => (
                    <ListItem key={resultTicket.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {resultTicket.title}
                            </Typography>
                            <Chip 
                              label={resultTicket.status} 
                              color={resultTicket.status === 'Open' ? 'success' : 'default'}
                              size="small" 
                            />
                            <Chip 
                              label={resultTicket.priority} 
                              variant="outlined" 
                              size="small" 
                            />
                          </Box>
                        }
                        secondary={`ID: ${resultTicket.id} • ${resultTicket.description.substring(0, 100)}${resultTicket.description.length > 100 ? '...' : ''}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant={selectedTickets.includes(resultTicket.id) ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleTicketSelection(resultTicket.id)}
                          disabled={isCreatingRelationship}
                          startIcon={selectedTickets.includes(resultTicket.id) ? undefined : <AddIcon />}
                        >
                          {selectedTickets.includes(resultTicket.id) ? 'Selected' : 'Select'}
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {searchTerm && !isSearching && searchResults.length === 0 && (
              <Alert severity="info">
                No tickets found matching "{searchTerm}"
              </Alert>
            )}

            {selectedTickets.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Selected Tickets ({selectedTickets.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedTickets.map((ticketId) => {
                    const selectedTicket = searchResults.find(t => t.id === ticketId);
                    return selectedTicket ? (
                      <Chip
                        key={ticketId}
                        label={`${selectedTicket.title} (${ticketId})`}
                        onDelete={() => handleTicketSelection(ticketId)}
                        disabled={isCreatingRelationship}
                      />
                    ) : null;
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRelationshipDialog} disabled={isCreatingRelationship}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRelationships} 
            variant="contained"
            disabled={selectedTickets.length === 0 || isCreatingRelationship}
          >
            {isCreatingRelationship ? 'Creating...' : `Create Relationship${selectedTickets.length > 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketDetails;