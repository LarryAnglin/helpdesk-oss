/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  AccountTree as ParentIcon,
  CallSplit as ChildIcon,
  Link as RelatedIcon,
  ContentCopy as DuplicateIcon,
  Block as BlockIcon,
  Timeline as HistoryIcon,
  OpenInNew as OpenIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Ticket, TicketRelationship, SplitTicketHistory, MergeTicketHistory } from '../../lib/types/ticket';
import { 
  getRelatedTickets, 
  getSplitHistory, 
  getMergeHistory,
  // createTicketRelationship
} from '../../lib/firebase/ticketRelationshipService';
// import { useAuth } from '../../lib/auth/AuthContext';

interface RelatedTicketsCardProps {
  ticket: Ticket;
  onTicketClick?: (ticketId: string) => void;
  onAddRelationship?: () => void;
}

const RelatedTicketsCard: React.FC<RelatedTicketsCardProps> = ({
  ticket,
  onTicketClick,
  onAddRelationship
}) => {
  // const { user } = useAuth();
  const [relatedData, setRelatedData] = useState<{
    parent?: Ticket;
    children: Ticket[];
    related: { ticket: Ticket; relationship: TicketRelationship }[];
  } | null>(null);
  const [splitHistory, setSplitHistory] = useState<SplitTicketHistory[]>([]);
  const [mergeHistory, setMergeHistory] = useState<MergeTicketHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [newRelationship, setNewRelationship] = useState({
  //   targetTicketId: '',
  //   relationshipType: 'related_to' as TicketRelationshipType,
  //   description: ''
  // });
  // const [isCreatingRelationship, setIsCreatingRelationship] = useState(false);

  useEffect(() => {
    loadRelatedData();
  }, [ticket.id]);

  const loadRelatedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [related, split, merge] = await Promise.all([
        getRelatedTickets(ticket.id),
        getSplitHistory(ticket.id),
        getMergeHistory(ticket.id)
      ]);

      setRelatedData(related);
      setSplitHistory(split);
      setMergeHistory(merge);
    } catch (error) {
      console.error('Error loading related tickets:', error);
      setError('Failed to load related tickets');
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'parent_of':
      case 'child_of':
        return type === 'parent_of' ? <ChildIcon /> : <ParentIcon />;
      case 'related_to':
        return <RelatedIcon />;
      case 'duplicate_of':
        return <DuplicateIcon />;
      case 'blocks':
      case 'blocked_by':
        return <BlockIcon />;
      default:
        return <RelatedIcon />;
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case 'parent_of': return 'Parent of';
      case 'child_of': return 'Child of';
      case 'related_to': return 'Related to';
      case 'duplicate_of': return 'Duplicate of';
      case 'blocks': return 'Blocks';
      case 'blocked_by': return 'Blocked by';
      case 'split_from': return 'Split from';
      case 'merged_into': return 'Merged into';
      default: return type;
    }
  };

  const formatTicketStatus = (status: string) => {
    switch (status) {
      case 'Open': return 'success';
      case 'Closed': return 'default';
      case 'On Hold': return 'warning';
      case 'Waiting': return 'info';
      case 'Paused': return 'secondary';
      case 'Resolved': return 'primary';
      default: return 'default';
    }
  };

  const handleTicketClick = (ticketId: string) => {
    if (onTicketClick) {
      onTicketClick(ticketId);
    }
  };

  // const handleAddRelationship = async () => {
  //   if (!user || !newRelationship.targetTicketId.trim()) return;

  //   setIsCreatingRelationship(true);
  //   try {
  //     await createTicketRelationship(
  //       ticket.id,
  //       newRelationship.targetTicketId.trim(),
  //       newRelationship.relationshipType,
  //       user.uid,
  //       user.displayName || user.email || 'Unknown User',
  //       newRelationship.description.trim() || undefined
  //     );

  //     // Reset form and close dialog
  //     setNewRelationship({
  //       targetTicketId: '',
  //       relationshipType: 'related_to',
  //       description: ''
  //     });
  //     setAddRelationshipDialogOpen(false);

  //     // Reload related data to show the new relationship
  //     await loadRelatedData();
  //   } catch (error) {
  //     console.error('Error creating relationship:', error);
  //     setError('Failed to create relationship. Please check the ticket ID and try again.');
  //   } finally {
  //     setIsCreatingRelationship(false);
  //   }
  // };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  const hasRelationships = relatedData && (
    relatedData.parent || 
    relatedData.children.length > 0 || 
    relatedData.related.length > 0 || 
    splitHistory.length > 0 || 
    mergeHistory.length > 0
  );

  if (!hasRelationships) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Related Tickets
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                console.log('Add Related Ticket clicked');
                onAddRelationship?.();
              }}
            >
              Add Related Ticket
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            No related tickets found.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Related Tickets
            </Typography>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                console.log('Add Related Ticket clicked (with existing relationships)');
                onAddRelationship?.();
              }}
            >
              Add Related Ticket
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {relatedData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Parent Ticket */}
              {relatedData.parent && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Parent Ticket
                  </Typography>
                  <Box 
                    sx={{ 
                      p: 2, 
                      border: '1px solid', 
                      borderColor: 'divider', 
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    onClick={() => handleTicketClick(relatedData.parent!.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ParentIcon color="primary" />
                      <Chip 
                        label={relatedData.parent.status} 
                        color={formatTicketStatus(relatedData.parent.status)} 
                        size="small" 
                      />
                      <Chip 
                        label={relatedData.parent.priority} 
                        variant="outlined" 
                        size="small" 
                      />
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleTicketClick(relatedData.parent!.id); }}>
                        <OpenIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2">
                      {relatedData.parent.title}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Child Tickets */}
              {relatedData.children.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Child Tickets ({relatedData.children.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {relatedData.children.map((child, index) => (
                      <Box key={child.id}>
                        <ListItem 
                          sx={{ 
                            p: 2, 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                          onClick={() => handleTicketClick(child.id)}
                        >
                          <ListItemIcon>
                            <ChildIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {child.title}
                                </Typography>
                                <Chip 
                                  label={child.status} 
                                  color={formatTicketStatus(child.status)} 
                                  size="small" 
                                />
                                <Chip 
                                  label={child.priority} 
                                  variant="outlined" 
                                  size="small" 
                                />
                              </Box>
                            }
                            secondary={`ID: ${child.id}`}
                          />
                          <IconButton 
                            size="small" 
                            onClick={(e) => { e.stopPropagation(); handleTicketClick(child.id); }}
                          >
                            <OpenIcon fontSize="small" />
                          </IconButton>
                        </ListItem>
                        {index < relatedData.children.length - 1 && <Box sx={{ mb: 1 }} />}
                      </Box>
                    ))}
                  </List>
                </Box>
              )}

              {/* Other Relationships */}
              {relatedData.related.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Related Tickets ({relatedData.related.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {relatedData.related.map(({ ticket: relatedTicket, relationship }, index) => (
                      <Box key={relatedTicket.id}>
                        <ListItem 
                          sx={{ 
                            p: 2, 
                            border: '1px solid', 
                            borderColor: 'divider', 
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'action.hover' }
                          }}
                          onClick={() => handleTicketClick(relatedTicket.id)}
                        >
                          <ListItemIcon>
                            {getRelationshipIcon(relationship.relationshipType)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                  {relatedTicket.title}
                                </Typography>
                                <Chip 
                                  label={getRelationshipLabel(relationship.relationshipType)} 
                                  variant="outlined" 
                                  size="small" 
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  ID: {relatedTicket.id}
                                </Typography>
                                {relationship.description && (
                                  <Typography variant="caption" color="text.secondary">
                                    {relationship.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label={relatedTicket.status} 
                              color={formatTicketStatus(relatedTicket.status)} 
                              size="small" 
                            />
                            <IconButton 
                              size="small" 
                              onClick={(e) => { e.stopPropagation(); handleTicketClick(relatedTicket.id); }}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItem>
                        {index < relatedData.related.length - 1 && <Box sx={{ mb: 1 }} />}
                      </Box>
                    ))}
                  </List>
                </Box>
              )}

              {/* Split/Merge History */}
              {(splitHistory.length > 0 || mergeHistory.length > 0) && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryIcon />
                      <Typography variant="subtitle2">
                        Split/Merge History
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {splitHistory.map((split) => (
                        <Box key={split.id}>
                          <Typography variant="subtitle2" color="primary" gutterBottom>
                            Split on {new Date(split.splitAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Reason: {split.reason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Split by {split.splitByName} into {split.newTicketIds.length} tickets
                          </Typography>
                        </Box>
                      ))}

                      {mergeHistory.map((merge) => (
                        <Box key={merge.id}>
                          <Typography variant="subtitle2" color="secondary" gutterBottom>
                            Merged on {new Date(merge.mergedAt).toLocaleDateString()}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Reason: {merge.reason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Merged by {merge.mergedByName} from {merge.mergedTicketIds.length} tickets
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
  );
};

export default RelatedTicketsCard;