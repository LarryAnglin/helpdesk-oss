/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useConfig } from '../../lib/context/ConfigContext';

const Footer: React.FC = () => {
  const { config } = useConfig();

  // Don't render footer if no content is configured
  if (!config.footerMarkdown?.trim()) {
    return null;
  }

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
        py: 3
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            '& p': { margin: 0 },
            '& p + p': { mt: 1 },
            '& a': {
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            },
            '& ul, & ol': {
              margin: 0,
              paddingLeft: 2
            },
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              marginTop: 1,
              marginBottom: 0.5
            },
            '& hr': {
              border: 'none',
              borderTop: 1,
              borderColor: 'divider',
              my: 1
            },
            '& code': {
              backgroundColor: 'grey.100',
              padding: '2px 4px',
              borderRadius: 1,
              fontSize: '0.875em',
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
            },
            '& blockquote': {
              borderLeft: 4,
              borderColor: 'grey.300',
              paddingLeft: 2,
              margin: 0,
              fontStyle: 'italic',
              color: 'text.secondary'
            }
          }}
        >
          <ReactMarkdown
            components={{
              // Custom component for links to handle external links properly
              a: ({ href, children, ...props }) => (
                <a
                  href={href}
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  {...props}
                >
                  {children}
                </a>
              ),
              // Typography components for consistent styling
              h1: ({ children }) => (
                <Typography variant="h4" component="h1" gutterBottom>
                  {children}
                </Typography>
              ),
              h2: ({ children }) => (
                <Typography variant="h5" component="h2" gutterBottom>
                  {children}
                </Typography>
              ),
              h3: ({ children }) => (
                <Typography variant="h6" component="h3" gutterBottom>
                  {children}
                </Typography>
              ),
              p: ({ children }) => (
                <Typography variant="body2" component="p">
                  {children}
                </Typography>
              )
            }}
          >
            {config.footerMarkdown}
          </ReactMarkdown>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;