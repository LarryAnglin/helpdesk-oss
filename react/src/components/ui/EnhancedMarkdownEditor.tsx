/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Link,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  Link as LinkIcon,
  Code,
  Help,
  FormatQuote,
  TableChart,
  Title,
  Visibility,
  Edit,
  ViewColumn
} from '@mui/icons-material';

interface EnhancedMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  rows?: number;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

type EditorMode = 'edit' | 'preview' | 'split';

const EnhancedMarkdownEditor: React.FC<EnhancedMarkdownEditorProps> = ({
  value,
  onChange,
  label = "Content",
  placeholder = "Type your message here...\n\nYou can use **markdown** formatting:\n- **Bold text** with **text**\n- *Italic text* with *text*\n- Lists with - or 1.\n- [Links](url) with [text](url)\n- `Code` with backticks",
  helperText,
  rows = 6,
  minHeight = 150,
  maxHeight = 600,
  disabled = false,
  required = false,
  autoFocus = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mode, setMode] = useState<EditorMode>(value && value.trim() !== '' ? 'preview' : 'edit');
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Detect if we're on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // For web version, use enhanced features
  const isWebVersion = !isIOS;

  useEffect(() => {
    // On mobile, force edit mode if in split view
    if (isMobile && mode === 'split') {
      setMode('edit');
    }
  }, [isMobile, mode]);

  const handleModeChange = useCallback((newMode: EditorMode) => {
    if (isMobile && newMode === 'split') {
      // Don't allow split mode on mobile
      return;
    }
    setMode(newMode);
  }, [isMobile]);

  const insertMarkdown = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newValue = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + textToInsert.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 10);
  }, [value, onChange]);

  const toolbarActions = [
    {
      icon: FormatBold,
      title: 'Bold (Ctrl+B)',
      action: () => insertMarkdown('**', '**', 'bold text'),
      showOnMobile: true
    },
    {
      icon: FormatItalic,
      title: 'Italic (Ctrl+I)',
      action: () => insertMarkdown('*', '*', 'italic text'),
      showOnMobile: true
    },
    { type: 'separator', showOnMobile: false },
    {
      icon: Title,
      title: 'Heading',
      action: () => insertMarkdown('## ', '', 'Heading'),
      showOnMobile: false
    },
    {
      icon: FormatListBulleted,
      title: 'Bullet List',
      action: () => insertMarkdown('- ', '', 'List item'),
      showOnMobile: true
    },
    {
      icon: FormatListNumbered,
      title: 'Numbered List',
      action: () => insertMarkdown('1. ', '', 'List item'),
      showOnMobile: false
    },
    { type: 'separator', showOnMobile: false },
    {
      icon: LinkIcon,
      title: 'Link (Ctrl+K)',
      action: () => insertMarkdown('[', '](url)', 'link text'),
      showOnMobile: true
    },
    {
      icon: FormatQuote,
      title: 'Quote',
      action: () => insertMarkdown('> ', '', 'Quote'),
      showOnMobile: false
    },
    {
      icon: Code,
      title: 'Code',
      action: () => insertMarkdown('`', '`', 'code'),
      showOnMobile: true
    },
    {
      icon: TableChart,
      title: 'Table',
      action: () => insertMarkdown('\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', '', ''),
      showOnMobile: false
    }
  ];

  const markdownHelp = [
    { syntax: '**bold**', description: 'Bold text' },
    { syntax: '*italic*', description: 'Italic text' },
    { syntax: '[link text](url)', description: 'Links' },
    { syntax: '- item', description: 'Bullet list' },
    { syntax: '1. item', description: 'Numbered list' },
    { syntax: '`code`', description: 'Inline code' },
    { syntax: '```\ncode block\n```', description: 'Code block' },
    { syntax: '## Heading', description: 'Headings' },
    { syntax: '> quote', description: 'Blockquote' },
    { syntax: '---', description: 'Horizontal rule' },
    { syntax: '| Header |\n|--------|\n| Cell   |', description: 'Tables' },
  ];

  // Keyboard shortcuts handler (web only)
  useEffect(() => {
    if (!isWebVersion || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== textareaRef.current) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            insertMarkdown('**', '**', 'bold text');
            break;
          case 'i':
            e.preventDefault();
            insertMarkdown('*', '*', 'italic text');
            break;
          case 'k':
            e.preventDefault();
            insertMarkdown('[', '](url)', 'link text');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isWebVersion, disabled, insertMarkdown]);

  // For iOS, just return a simple TextField
  if (!isWebVersion) {
    return (
      <TextField
        fullWidth
        multiline
        rows={rows}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your reply here..."
        required={required}
        autoFocus={autoFocus}
        helperText={helperText}
      />
    );
  }

  // Enhanced web version
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {label && (
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {label}
          </Typography>
        )}
        <Tooltip title="Markdown Help">
          <IconButton 
            size="small" 
            onClick={() => setShowHelp(!showHelp)}
            color={showHelp ? 'primary' : 'default'}
            disabled={disabled}
          >
            <Help />
          </IconButton>
        </Tooltip>
      </Box>

      {showHelp && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Markdown Syntax Reference:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 1 }}>
            {markdownHelp.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, fontSize: '0.875rem' }}>
                <code style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '2px 6px', 
                  borderRadius: '3px',
                  whiteSpace: 'pre',
                  fontFamily: 'Monaco, Menlo, monospace',
                  fontSize: '0.8rem'
                }}>
                  {item.syntax}
                </code>
                <span style={{ color: '#666' }}>→ {item.description}</span>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <Paper sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        {/* Mode selector */}
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider', 
          px: 1, 
          py: 0.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'grey.50'
        }}>
          <Tabs 
            value={mode} 
            onChange={(_, newValue) => handleModeChange(newValue)}
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
          >
            <Tab 
              icon={<Edit fontSize="small" />} 
              iconPosition="start" 
              label="Edit" 
              value="edit"
              disabled={disabled}
              sx={{ minWidth: 80 }}
            />
            <Tab 
              icon={<Visibility fontSize="small" />} 
              iconPosition="start" 
              label="Preview" 
              value="preview"
              disabled={disabled}
              sx={{ minWidth: 100 }}
            />
            {!isMobile && (
              <Tab 
                icon={<ViewColumn fontSize="small" />} 
                iconPosition="start" 
                label="Split" 
                value="split"
                disabled={disabled}
                sx={{ minWidth: 80 }}
              />
            )}
          </Tabs>

          {/* Toolbar - only show in edit/split mode */}
          {(mode === 'edit' || mode === 'split') && (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {toolbarActions
                .filter(action => !isMobile || action.showOnMobile)
                .map((action, index) => (
                  action.type === 'separator' ? (
                    <Divider key={index} orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                  ) : (
                    <Tooltip key={index} title={action.title}>
                      <IconButton 
                        size="small" 
                        onClick={action.action}
                        disabled={disabled}
                        sx={{ p: 0.5 }}
                      >
                        {action.icon && <action.icon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  )
                ))}
            </Box>
          )}
        </Box>

        {/* Editor content */}
        {mode === 'split' && !isMobile ? (
          <Box sx={{ display: 'flex', height: `${Math.min(maxHeight, Math.max(minHeight, rows * 24))}px` }}>
            {/* Edit side */}
            <Box sx={{ width: '50%', borderRight: 1, borderColor: 'divider' }}>
              <TextField
                inputRef={textareaRef}
                multiline
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                autoFocus={autoFocus}
                variant="standard"
                sx={{
                  width: '100%',
                  height: '100%',
                  '& .MuiInputBase-root': {
                    height: '100%',
                    alignItems: 'flex-start',
                    px: 2,
                    py: 1
                  },
                  '& .MuiInputBase-input': {
                    height: '100% !important',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    overflow: 'auto !important'
                  }
                }}
                InputProps={{
                  disableUnderline: true
                }}
              />
            </Box>
            {/* Preview side */}
            <Box sx={{ 
              width: '50%', 
              p: 2, 
              overflow: 'auto',
              bgcolor: 'grey.50'
            }}>
              <Box className="markdown-preview" sx={{ 
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
                {value ? (
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
                    {value}
                  </ReactMarkdown>
                ) : (
                  <Typography color="text.secondary" fontStyle="italic">
                    Preview will appear here...
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        ) : mode === 'preview' ? (
          <Box sx={{ 
            p: 2, 
            minHeight: `${Math.max(minHeight, rows * 24)}px`,
            maxHeight: `${maxHeight}px`,
            overflow: 'auto'
          }}>
            <Box className="markdown-preview" sx={{ 
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
              {value ? (
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
                  {value}
                </ReactMarkdown>
              ) : (
                <Typography color="text.secondary" fontStyle="italic">
                  Nothing to preview. Enter some content to see the preview.
                </Typography>
              )}
            </Box>
          </Box>
        ) : (
          /* Edit mode */
          <Box>
            <TextField
              inputRef={textareaRef}
              fullWidth
              multiline
              rows={rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              autoFocus={autoFocus}
              variant="standard"
              sx={{
                '& .MuiInputBase-root': {
                  px: 2,
                  py: 1
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  minHeight: `${minHeight}px`,
                  maxHeight: `${maxHeight}px`,
                  overflow: 'auto !important'
                }
              }}
              InputProps={{
                disableUnderline: true
              }}
            />
          </Box>
        )}
      </Paper>

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default EnhancedMarkdownEditor;