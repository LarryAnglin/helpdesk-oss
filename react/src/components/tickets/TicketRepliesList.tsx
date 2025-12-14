/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import {
  Box,
  Typography,
  Chip,
  Stack,
  Avatar,
  Button,
  Divider,
  Link
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ReplyIcon from '@mui/icons-material/Reply';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { TicketReply } from '../../lib/types/ticket';
import { useAuth } from '../../lib/auth/AuthContext';
import { useEffect, useState } from 'react';

interface TicketRepliesListProps {
  replies: TicketReply[];
}

const TicketRepliesList: React.FC<TicketRepliesListProps> = ({ replies }) => {
  const { userData } = useAuth();
  const [authorRoles, setAuthorRoles] = useState<{ [authorId: string]: string }>({});

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Function to determine if an author is a user (customer) vs staff
  const isUserReply = (reply: TicketReply): boolean => {
    // Check if we have cached role information
    const cachedRole = authorRoles[reply.authorId];
    if (cachedRole) {
      return cachedRole === 'user';
    }
    
    // Fallback: if no role info, assume it's a user reply if author is not current user
    // This is a temporary solution until we add proper role tracking
    return reply.authorId !== userData?.uid;
  };

  // Fetch author roles for replies (if needed in the future)
  useEffect(() => {
    // For now, we'll use a simple heuristic
    // In the future, this could fetch actual role data from Firestore
    const newAuthorRoles: { [authorId: string]: string } = {};
    
    replies.forEach(reply => {
      // Simple heuristic: if author is current user, use current user's role
      if (reply.authorId === userData?.uid) {
        newAuthorRoles[reply.authorId] = userData?.role || 'user';
      } else {
        // For other authors, we'll assume they are users unless we have evidence otherwise
        // This could be improved by fetching actual user data
        newAuthorRoles[reply.authorId] = 'user';
      }
    });
    
    setAuthorRoles(newAuthorRoles);
  }, [replies, userData]);

  if (replies.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No replies yet
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {replies.map((reply, index) => {
        // Only show private replies to staff
        if (reply.isPrivate && userData?.role === 'user') {
          return null;
        }

        return (
          <Box key={reply.id}>
            {index > 0 && <Divider sx={{ my: 2 }} />}
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Avatar sx={{ 
                bgcolor: isUserReply(reply) ? 'secondary.main' : 'primary.main', 
                width: 40, 
                height: 40 
              }}>
                {getInitials(reply.authorName)}
              </Avatar>
              
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">
                    {reply.authorName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(reply.createdAt)}
                  </Typography>
                  {isUserReply(reply) && (
                    <Chip
                      label="Reply"
                      size="small"
                      icon={<ReplyIcon fontSize="small" />}
                      color="secondary"
                    />
                  )}
                  {reply.isPrivate && (
                    <Chip
                      label="Private"
                      size="small"
                      icon={<LockIcon fontSize="small" />}
                      color="warning"
                    />
                  )}
                </Stack>

                <Box sx={{ 
                  mb: 1,
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
                    {reply.message}
                  </ReactMarkdown>
                </Box>

                {reply.attachments.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      Attachments:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {reply.attachments.map((attachment) => (
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
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

export default TicketRepliesList;