/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link
} from '@mui/material';
import { useState, useEffect } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Ticket } from '../../lib/types/ticket';
import { updateTicket, deleteTicket, addReply, getTicket } from '../../lib/firebase/ticketService';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CcParticipantManager } from './CcParticipantManager';
import StatusChangeDialog from './StatusChangeDialog';
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

interface TicketSummaryProps {
  ticket: Ticket;
  onUpdate: () => void;
  onSplit?: () => void;
  onMerge?: () => void;
  onSilentUpdate?: (updatedTicket: Ticket) => void;
}

interface OptimisticTicket extends Ticket {
  _isOptimistic?: boolean;
  _originalStatus?: string;
}

const TicketSummary: React.FC<TicketSummaryProps> = ({ ticket, onUpdate: _onUpdate, onSplit, onMerge, onSilentUpdate }) => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);
  const [optimisticTicket, setOptimisticTicket] = useState<OptimisticTicket>(ticket);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Update optimistic ticket when prop changes
  useEffect(() => {
    setOptimisticTicket(ticket);
  }, [ticket]);

  const canEdit = userData?.role === 'tech' || 
                 userData?.role === 'company_admin' || 
                 userData?.role === 'organization_admin' || 
                 userData?.role === 'system_admin' || 
                 userData?.role === 'super_admin' || 
                 ticket.submitterId === userData?.uid;

  const canDelete = userData?.role === 'tech' || userData?.role === 'company_admin' || userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin';
  const isStaff = userData?.role === 'tech' || userData?.role === 'company_admin' || userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusChange = async (newStatus: string) => {
    // If regular user is trying to close/cancel ticket, show confirmation
    if (newStatus === 'Closed' && !isStaff && ticket.status !== 'Closed') {
      setCancelConfirmOpen(true);
      handleMenuClose();
      return;
    }

    // If status requires a reason, show dialog
    if (newStatus === 'Waiting' || newStatus === 'Paused') {
      setPendingStatusChange(newStatus);
      setStatusDialogOpen(true);
      handleMenuClose();
      return;
    }

    if (!userData) return;

    // Immediate UI update (optimistic)
    const originalStatus = optimisticTicket.status;
    const updatedTicket: OptimisticTicket = {
      ...optimisticTicket,
      status: newStatus as any,
      _isOptimistic: true,
      _originalStatus: originalStatus,
      ...(newStatus === 'Resolved' ? { resolvedAt: Date.now() } : {}),
      updatedAt: Date.now()
    };
    
    setOptimisticTicket(updatedTicket);
    handleMenuClose();

    // Background database update
    try {
      // Calculate duration in previous status
      const previousStatusDuration = Date.now() - ticket.updatedAt;
      
      // Create status change record
      const statusChange = {
        id: `status_${Date.now()}`,
        fromStatus: ticket.status,
        toStatus: newStatus as any,
        changedBy: userData.uid,
        changedByName: userData.displayName || userData.email,
        changedAt: Date.now(),
        duration: previousStatusDuration
      };

      // Prepare status history update
      const newStatusHistory = [...(ticket.statusHistory || []), statusChange];
      
      await updateTicket(ticket.id, { 
        status: newStatus as 'Open' | 'Resolved' | 'Closed',
        statusHistory: newStatusHistory,
        ...(newStatus === 'Resolved' ? { resolvedAt: Date.now() } : {})
      });
      // Don't call onUpdate() - optimistic update already handled UI
      
      // Silently fetch updated ticket data to sync state
      if (onSilentUpdate) {
        try {
          const updatedTicket = await getTicket(ticket.id);
          if (updatedTicket) {
            onSilentUpdate(updatedTicket);
          }
        } catch (err) {
          console.error('Error fetching updated ticket:', err);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Revert optimistic update
      setOptimisticTicket({
        ...ticket,
        _isOptimistic: false
      });
      
      // Show error dialog
      setErrorMessage(`Failed to update ticket status to "${newStatus}". ${error instanceof Error ? error.message : 'Please try again.'}`);
      setErrorDialogOpen(true);
    }
  };

  const handleCancelConfirm = async () => {
    if (!userData) return;

    // Immediate UI update (optimistic)
    const originalStatus = optimisticTicket.status;
    const updatedTicket: OptimisticTicket = {
      ...optimisticTicket,
      status: 'Closed',
      _isOptimistic: true,
      _originalStatus: originalStatus,
      updatedAt: Date.now()
    };
    
    setOptimisticTicket(updatedTicket);
    setCancelConfirmOpen(false);

    // Background database update
    try {
      // Calculate duration in previous status
      const previousStatusDuration = Date.now() - ticket.updatedAt;
      
      // Create status change record
      const statusChange = {
        id: `status_${Date.now()}`,
        fromStatus: ticket.status,
        toStatus: 'Closed' as any,
        changedBy: userData.uid,
        changedByName: userData.displayName || userData.email,
        changedAt: Date.now(),
        duration: previousStatusDuration
      };

      // Prepare status history update
      const newStatusHistory = [...(ticket.statusHistory || []), statusChange];
      
      await updateTicket(ticket.id, { 
        status: 'Closed',
        statusHistory: newStatusHistory
      });
      // Don't call onUpdate() - optimistic update already handled UI
      
      // Silently fetch updated ticket data to sync state
      if (onSilentUpdate) {
        try {
          const updatedTicket = await getTicket(ticket.id);
          if (updatedTicket) {
            onSilentUpdate(updatedTicket);
          }
        } catch (err) {
          console.error('Error fetching updated ticket:', err);
        }
      }
    } catch (error) {
      console.error('Error canceling ticket:', error);
      
      // Revert optimistic update
      setOptimisticTicket({
        ...ticket,
        _isOptimistic: false
      });
      
      // Show error dialog
      setErrorMessage(`Failed to cancel ticket. ${error instanceof Error ? error.message : 'Please try again.'}`);
      setErrorDialogOpen(true);
    }
  };

  const handleStatusChangeWithReason = async (reason: string) => {
    if (!pendingStatusChange || !userData) return;

    try {
      setUpdating(true);
      
      // Calculate duration in previous status
      const previousStatusDuration = Date.now() - ticket.updatedAt;
      
      // Create status change record
      const statusChange = {
        id: `status_${Date.now()}`,
        fromStatus: ticket.status,
        toStatus: pendingStatusChange as any,
        changedBy: userData.uid,
        changedByName: userData.displayName || userData.email,
        changedAt: Date.now(),
        reason: reason,
        duration: previousStatusDuration
      };

      // Prepare status history update
      const newStatusHistory = [...(ticket.statusHistory || []), statusChange];
      
      // Update ticket status and history
      await updateTicket(ticket.id, { 
        status: pendingStatusChange as any,
        statusHistory: newStatusHistory
      });
      
      // Add private reply with status change reason
      const statusMessage = `Status changed from "${ticket.status}" to "${pendingStatusChange}"\n\nReason: ${reason}`;
      
      await addReply(ticket.id, {
        message: statusMessage,
        isPrivate: true
      });
      
      // Don't call onUpdate() - we don't want to interrupt the UI after status change with reason
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
      setStatusDialogOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleStatusDialogCancel = () => {
    setStatusDialogOpen(false);
    setPendingStatusChange(null);
  };

  const handlePriorityChange = async (newPriority: string) => {
    // Immediate UI update (optimistic)
    const updatedTicket: OptimisticTicket = {
      ...optimisticTicket,
      priority: newPriority as any,
      _isOptimistic: true,
      updatedAt: Date.now()
    };
    
    setOptimisticTicket(updatedTicket);
    handleMenuClose();

    // Background database update
    try {
      await updateTicket(ticket.id, { priority: newPriority as 'Low' | 'Medium' | 'High' | 'Urgent' });
      // Don't call onUpdate() - optimistic update already handled UI
      
      // Silently fetch updated ticket data to sync state
      if (onSilentUpdate) {
        try {
          const updatedTicket = await getTicket(ticket.id);
          if (updatedTicket) {
            onSilentUpdate(updatedTicket);
          }
        } catch (err) {
          console.error('Error fetching updated ticket:', err);
        }
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      
      // Revert optimistic update
      setOptimisticTicket({
        ...ticket,
        _isOptimistic: false
      });
      
      // Show error dialog
      setErrorMessage(`Failed to update ticket priority to "${newPriority}". ${error instanceof Error ? error.message : 'Please try again.'}`);
      setErrorDialogOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'error';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      case 'Low': return 'success';
      case 'None': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await deleteTicket(ticket.id);
      navigate('/tickets');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleCcParticipantsChange = (_newParticipants: { name: string; email: string }[]) => {
    // This is just for UI updates, actual saving happens in handleAutoSaveCcParticipants
  };

  const handleAutoSaveCcParticipants = async (newParticipants: { name: string; email: string }[]) => {
    try {
      // Update participants array with new CC list
      const updatedParticipants = [...ticket.participants.filter(p => p.role !== 'cc')];
      
      // Add new CC participants
      for (const ccParticipant of newParticipants) {
        updatedParticipants.push({
          userId: '',
          name: ccParticipant.name,
          email: ccParticipant.email,
          role: 'cc' as const
        });
      }

      await updateTicket(ticket.id, {
        participants: updatedParticipants
      });

      // Don't call onUpdate() - we don't want to interrupt the UI
    } catch (error) {
      console.error('Error updating CC participants:', error);
      throw new Error('Failed to update CC participants');
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          {ticket.title}
        </Typography>
        
        {canEdit && (
          <Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/tickets/edit/${ticket.id}`)}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
            {canDelete && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DeleteIcon />}
                color="error"
                onClick={() => setDeleteConfirmOpen(true)}
                sx={{ mr: 1 }}
                disabled={updating || deleting}
              >
                Delete
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleMenuOpen}
              disabled={updating}
            >
              <MoreVertIcon />
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>Change Status</MenuItem>
              <MenuItem onClick={() => handleStatusChange('Open')}>Open</MenuItem>
              {isStaff && <MenuItem onClick={() => handleStatusChange('In Progress')}>In Progress</MenuItem>}
              {isStaff && <MenuItem onClick={() => handleStatusChange('Resolved')}>Resolved</MenuItem>}
              {isStaff && <MenuItem onClick={() => handleStatusChange('Waiting')}>Waiting</MenuItem>}
              {isStaff && <MenuItem onClick={() => handleStatusChange('Paused')}>Paused</MenuItem>}
              <MenuItem onClick={() => handleStatusChange('Closed')}>
                {isStaff ? 'Closed' : 'Cancel Ticket'}
              </MenuItem>
              {isStaff && (
                <>
                  <MenuItem disabled>Change Priority</MenuItem>
                  <MenuItem onClick={() => handlePriorityChange('Low')}>Low</MenuItem>
                  <MenuItem onClick={() => handlePriorityChange('Medium')}>Medium</MenuItem>
                  <MenuItem onClick={() => handlePriorityChange('High')}>High</MenuItem>
                  <MenuItem onClick={() => handlePriorityChange('Urgent')}>Urgent</MenuItem>
                </>
              )}
              {isStaff && optimisticTicket.status !== 'Closed' && (
                <>
                  <MenuItem disabled>Ticket Management</MenuItem>
                  {onSplit && (
                    <MenuItem 
                      onClick={() => {
                        handleMenuClose();
                        onSplit();
                      }}
                    >
                      <ContentCopyIcon sx={{ mr: 1 }} fontSize="small" />
                      Split Ticket
                    </MenuItem>
                  )}
                  {onMerge && (
                    <MenuItem 
                      onClick={() => {
                        handleMenuClose();
                        onMerge();
                      }}
                    >
                      <MergeTypeIcon sx={{ mr: 1 }} fontSize="small" />
                      Merge Tickets
                    </MenuItem>
                  )}
                </>
              )}
            </Menu>
          </Box>
        )}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip 
          label={optimisticTicket.status} 
          color={getStatusColor(optimisticTicket.status)} 
          size="small" 
          clickable={isStaff}
          onClick={isStaff ? handleMenuOpen : undefined}
          sx={optimisticTicket._isOptimistic ? { 
            opacity: 0.8, 
            '@keyframes pulse': {
              '0%': { opacity: 0.8 },
              '50%': { opacity: 0.4 },
              '100%': { opacity: 0.8 }
            },
            animation: 'pulse 1.5s ease-in-out infinite'
          } : {}}
        />
        <Chip 
          label={optimisticTicket.priority} 
          color={getPriorityColor(optimisticTicket.priority)} 
          size="small" 
          clickable={isStaff}
          onClick={isStaff ? handleMenuOpen : undefined}
        />
        <Chip 
          label={optimisticTicket.location} 
          size="small" 
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Submitted By
          </Typography>
          <Typography variant="body2">
            {ticket.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {ticket.email}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Created
          </Typography>
          <Typography variant="body2">
            {formatDate(ticket.createdAt)}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Last Updated
          </Typography>
          <Typography variant="body2">
            {formatDate(ticket.updatedAt)}
          </Typography>
        </Box>

        {ticket.resolvedAt && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Resolved
            </Typography>
            <Typography variant="body2">
              {formatDate(ticket.resolvedAt)}
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Ticket IDs */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Short ID
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {formatShortIdForDisplay(getShortIdFromTicket(ticket.id))}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            System ID
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {ticket.id}
          </Typography>
        </Box>
      </Stack>

      {/* CC Recipients */}
      {isStaff ? (
        <Box sx={{ mt: 2 }}>
          <CcParticipantManager
            participants={ticket.participants?.filter(p => p.role === 'cc').map(p => ({ name: p.name, email: p.email })) || []}
            onChange={handleCcParticipantsChange}
            autoSave={true}
            onAutoSave={handleAutoSaveCcParticipants}
          />
        </Box>
      ) : (
        ticket.participants && ticket.participants.filter(p => p.role === 'cc').length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              CC Recipients
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ticket.participants
                .filter(p => p.role === 'cc')
                .map((participant, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: (theme) => theme.palette.primary.main + '20', // 20% opacity
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.primary.main + '40', // 40% opacity  
                      borderRadius: 1,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.875rem'
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: (theme) => theme.palette.primary.dark,
                        fontWeight: 500 
                      }}
                    >
                      {participant.name} ({participant.email})
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Box>
        )
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Description
        </Typography>
        <Box sx={{ 
          '& h1, & h2, & h3, & h4, & h5, & h6': { 
            mt: 2, 
            mb: 1,
            fontWeight: 600 
          },
          '& p': { mb: 1 },
          '& ul, & ol': { pl: 3, mb: 1 },
          '& li': { mb: 0.5 },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            pl: 2,
            ml: 0,
            color: 'text.secondary',
            fontStyle: 'italic'
          },
          '& code': {
            bgcolor: 'grey.200',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: 'Monaco, Menlo, monospace',
            fontSize: '0.9em'
          },
          '& pre': {
            bgcolor: 'grey.900',
            color: 'common.white',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            mb: 2
          },
          '& pre code': {
            bgcolor: 'transparent',
            p: 0,
            color: 'inherit'
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            mb: 2
          },
          '& th, & td': {
            border: '1px solid',
            borderColor: 'divider',
            p: 1
          },
          '& th': {
            bgcolor: 'grey.100',
            fontWeight: 600
          },
          '& hr': {
            my: 2,
            border: 'none',
            borderTop: '1px solid',
            borderColor: 'divider'
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline'
            }
          }
        }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              a: ({ href, children }) => (
                <Link href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </Link>
              ),
            }}
          >
            {ticket.description}
          </ReactMarkdown>
        </Box>
      </Box>

      {ticket.errorMessage && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Error Message
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {ticket.errorMessage}
          </Typography>
        </Box>
      )}

      {ticket.stepsToReproduce && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Steps to Reproduce
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {ticket.stepsToReproduce}
          </Typography>
        </Box>
      )}

      {ticket.impact && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Impact
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {ticket.impact}
          </Typography>
        </Box>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Computer
          </Typography>
          <Typography variant="body2">
            {ticket.computer}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Contact Method
          </Typography>
          <Typography variant="body2">
            {ticket.contactMethod}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            VPN Connected
          </Typography>
          <Typography variant="body2">
            {ticket.isOnVpn ? 'Yes' : 'No'}
          </Typography>
        </Box>
      </Stack>

      {ticket.attachments.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Attachments
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {ticket.attachments.map((attachment) => (
              <Button
                key={attachment.id}
                variant="outlined"
                size="small"
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mb: 1 }}
              >
                {attachment.filename}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Ticket</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this ticket? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            autoFocus
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Ticket Confirmation Dialog */}
      <Dialog
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">Cancel Ticket</DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Are you sure you want to cancel this ticket? This will close the ticket and mark it as no longer needing support.
            You can still view the ticket history, but it will not appear in active ticket lists.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmOpen(false)} disabled={updating}>
            Keep Open
          </Button>
          <Button 
            onClick={handleCancelConfirm} 
            color="warning" 
            autoFocus
            disabled={updating}
          >
            {updating ? 'Canceling...' : 'Cancel Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      <StatusChangeDialog
        open={statusDialogOpen}
        newStatus={pendingStatusChange as any}
        currentStatus={optimisticTicket.status}
        onConfirm={handleStatusChangeWithReason}
        onCancel={handleStatusDialogCancel}
      />

      {/* Error Dialog */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">Update Failed</DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description">
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TicketSummary;