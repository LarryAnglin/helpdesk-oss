/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Collapse,
  Box,
  IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { CommonSolution } from '../../lib/types/commonSolutions';
import { getActiveCommonSolutions } from '../../lib/firebase/commonSolutionsService';

const CommonSolutionsSection = () => {
  const [solutions, setSolutions] = useState<CommonSolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  useEffect(() => {
    const fetchSolutions = async () => {
      try {
        setLoading(true);
        const activeSolutions = await getActiveCommonSolutions();
        setSolutions(activeSolutions);
      } catch (err) {
        console.error('Error fetching common solutions:', err);
        setError('Failed to load common solutions');
      } finally {
        setLoading(false);
      }
    };

    fetchSolutions();
  }, []);

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 4, mt: 3, backgroundColor: 'white' }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          Common Solutions
        </Typography>
        <List dense>
          {[1, 2, 3].map((item) => (
            <ListItem key={item}>
              <ListItemIcon>
                <Skeleton variant="circular" width={24} height={24} />
              </ListItemIcon>
              <ListItemText>
                <Skeleton variant="text" width="80%" />
              </ListItemText>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  if (error || solutions.length === 0) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ p: 4, mt: 3, backgroundColor: 'white' }}>
      <Typography variant="h4" gutterBottom sx={{ 
        color: '#1a1a1a', 
        textAlign: 'center',
        mb: 3,
        fontWeight: 600,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 1 
      }}>
        <HelpOutlineIcon sx={{ fontSize: '2rem', color: '#1976d2' }} />
        Common Solutions
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: '#4a4a4a', textAlign: 'center' }}>
        Need quick help? Check out these common solutions before signing in.
      </Typography>
      
      <List sx={{ mt: 2 }}>
        {solutions.map((solution) => (
          <Box key={solution.id} sx={{ mb: 1 }}>
            <ListItem
              sx={{
                pl: 2,
                pr: 2,
                py: 1.5,
                borderRadius: expandedId === solution.id ? '8px 8px 0 0' : 2,
                border: '1px solid',
                borderColor: expandedId === solution.id ? 'primary.main' : 'divider',
                borderBottom: expandedId === solution.id ? 'none' : '1px solid',
                cursor: solution.inlineText ? 'pointer' : 'default',
                '&:hover': {
                  backgroundColor: solution.inlineText ? 'action.hover' : 'primary.main',
                  borderColor: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: solution.inlineText ? '#1976d2' : 'white'
                  },
                  '& .MuiLink-root': {
                    color: 'white'
                  },
                  '& .solution-title': {
                    color: solution.inlineText ? '#1a1a1a' : 'white'
                  }
                }
              }}
              onClick={() => solution.inlineText && handleToggleExpand(solution.id)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HelpOutlineIcon sx={{ color: '#1976d2' }} />
              </ListItemIcon>
              <ListItemText>
                {solution.inlineText ? (
                  <Typography
                    className="solution-title"
                    sx={{
                      color: '#1a1a1a',
                      fontWeight: 500,
                      fontSize: '1rem'
                    }}
                  >
                    {solution.title}
                  </Typography>
                ) : (
                  <Link
                    href={solution.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      textDecoration: 'none',
                      color: '#1a1a1a',
                      fontWeight: 500,
                      fontSize: '1rem',
                      '&:hover': {
                        textDecoration: 'none'
                      }
                    }}
                  >
                    {solution.title}
                  </Link>
                )}
              </ListItemText>
              {solution.inlineText && (
                <IconButton size="small" sx={{ ml: 1 }}>
                  {expandedId === solution.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              )}
            </ListItem>
            {solution.inlineText && (
              <Collapse in={expandedId === solution.id}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: '#f8f9fa',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#4a4a4a',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6
                    }}
                  >
                    {solution.inlineText}
                  </Typography>
                </Box>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
    </Paper>
  );
};

export default CommonSolutionsSection;