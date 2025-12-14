/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Link
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  Link as LinkIcon,
  Code,
  Help
} from '@mui/icons-material';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  rows?: number;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  label = "Content",
  placeholder = "Enter markdown content...",
  helperText,
  rows = 6
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    const textarea = document.querySelector('textarea[name="markdown-editor"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    let newText = '';
    if (syntax.includes('{}')) {
      newText = syntax.replace('{}', textToInsert);
    } else {
      newText = syntax + textToInsert + syntax;
    }
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      const newCursorPos = start + newText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 10);
  };

  const markdownHelp = [
    { syntax: '**bold**', description: 'Bold text' },
    { syntax: '*italic*', description: 'Italic text' },
    { syntax: '[link text](url)', description: 'Links' },
    { syntax: '- item', description: 'Bullet list' },
    { syntax: '1. item', description: 'Numbered list' },
    { syntax: '`code`', description: 'Inline code' },
    { syntax: '## Heading', description: 'Headings' },
    { syntax: '> quote', description: 'Blockquote' },
    { syntax: '---', description: 'Horizontal rule' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {label}
        </Typography>
        <Tooltip title="Markdown Help">
          <IconButton 
            size="small" 
            onClick={() => setShowHelp(!showHelp)}
            color={showHelp ? 'primary' : 'default'}
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
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
            {markdownHelp.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px' }}>
                  {item.syntax}
                </code>
                <span style={{ color: '#666' }}>{item.description}</span>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      <Paper sx={{ border: 1, borderColor: 'divider' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Edit" />
            <Tab label="Preview" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box>
            {/* Toolbar */}
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 0.5 }}>
              <Tooltip title="Bold">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('**', 'bold text')}
                >
                  <FormatBold />
                </IconButton>
              </Tooltip>
              <Tooltip title="Italic">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('*', 'italic text')}
                >
                  <FormatItalic />
                </IconButton>
              </Tooltip>
              <Tooltip title="Bullet List">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('- ', 'list item')}
                >
                  <FormatListBulleted />
                </IconButton>
              </Tooltip>
              <Tooltip title="Numbered List">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('1. ', 'list item')}
                >
                  <FormatListNumbered />
                </IconButton>
              </Tooltip>
              <Tooltip title="Link">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('[{}](url)', 'link text')}
                >
                  <LinkIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Code">
                <IconButton 
                  size="small" 
                  onClick={() => insertMarkdown('`', 'code')}
                >
                  <Code />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Editor */}
            <TextField
              name="markdown-editor"
              multiline
              rows={rows}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { border: 'none' },
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: '14px'
                }
              }}
              fullWidth
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ p: 2, minHeight: `${rows * 24}px` }}>
            {value ? (
              <ReactMarkdown
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
                Nothing to preview. Enter some markdown content to see the preview.
              </Typography>
            )}
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

export default MarkdownEditor;