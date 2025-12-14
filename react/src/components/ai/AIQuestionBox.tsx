/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip
} from '@mui/material';
import { 
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { publicAIService } from '../../lib/ai/publicAIService';

const AIQuestionBox = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');

    // Open the new tab immediately while we still have user interaction context
    const answerWindow = window.open('about:blank', '_blank');
    
    // Check if popup was blocked
    if (!answerWindow || answerWindow.closed) {
      setError('Please allow popups for this site to view AI responses. Check your browser\'s address bar for a popup blocker icon.');
      setLoading(false);
      return;
    }
    
    // Show loading message in the new tab
    if (answerWindow) {
      answerWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Support Assistant - Loading...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .loading {
              text-align: center;
              color: #1976d2;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #1976d2;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="spinner"></div>
            <h2>Loading AI Response...</h2>
            <p>Please wait while we generate your answer.</p>
          </div>
        </body>
        </html>
      `);
      answerWindow.document.close();
    }

    try {
      const result = await publicAIService.askQuestion(question.trim());
      
      // Update the already-opened tab with the actual answer
      if (answerWindow && !answerWindow.closed) {
        answerWindow.document.open();
        answerWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>AI Support Assistant - Answer</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
                color: #333;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #1976d2;
                border-bottom: 3px solid #1976d2;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              h2 {
                color: #333;
                margin-top: 25px;
                margin-bottom: 15px;
              }
              h3 {
                color: #555;
                margin-top: 20px;
                margin-bottom: 10px;
              }
              .question-box {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                border-left: 4px solid #1976d2;
              }
              .sources {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
              }
              .sources h4 {
                margin-top: 0;
                color: #1976d2;
              }
              ul {
                margin: 10px 0;
                padding-left: 25px;
              }
              li {
                margin-bottom: 8px;
              }
              code {
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Monaco', 'Courier New', monospace;
              }
              pre {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
                border: 1px solid #ddd;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 14px;
              }
              .rate-limit {
                background: #fff3e0;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
                border: 1px solid #ffcc02;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🤖 AI Support Assistant</h1>
              
              <div class="question-box">
                <strong>Your Question:</strong><br>
                ${question.replace(/\n/g, '<br>')}
              </div>


              <h2>Answer:</h2>
              <div>${result.answer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</div>

              <div class="sources">
                <h4>📚 Information Sources:</h4>
                <ul>
                  ${result.sources.map(source => `<li>${source}</li>`).join('')}
                </ul>
              </div>

              <div class="footer">
                <p>Generated by Help Desk AI Assistant • ${new Date().toLocaleString()}</p>
                <p><strong>Need more help?</strong> Create a support ticket for personalized assistance.</p>
              </div>
            </div>
          </body>
          </html>
        `);
        answerWindow.document.close();
        
        // Clear the question after successful submission
        setQuestion('');
      } else {
        // Window was closed by user during loading
        setError('The answer window was closed. Please try again.');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const quickQuestions = [
    "How do I reset my password?",
    "My computer is running slow, what should I do?",
    "How do I connect to the company WiFi?",
    "I can't send emails, what's wrong?"
  ];

  const handleQuickQuestion = (quickQuestion: string) => {
    setQuestion(quickQuestion);
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PsychologyIcon sx={{ color: '#1976d2', fontSize: '1.5rem' }} />
        <Typography variant="h6" sx={{ color: '#1a1a1a', fontWeight: 600 }}>
          AI Support Assistant
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: '#4a4a4a', mb: 2 }}>
        Get instant help with your IT questions. Our AI assistant has access to previous tickets and support documentation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask a question about IT support, troubleshooting, or technical issues..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            multiline
            minRows={2}
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                color: '#1a1a1a',
                '& input': {
                  color: '#1a1a1a',
                },
                '& textarea': {
                  color: '#1a1a1a',
                },
                '&::placeholder': {
                  color: '#666',
                  opacity: 1
                }
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: '#666',
                opacity: 1
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !question.trim()}
            sx={{ 
              minWidth: 'auto',
              px: 2,
              alignSelf: 'stretch'
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon />
            )}
          </Button>
        </Box>
      </Box>

      {/* Quick Questions */}
      <Box>
        <Typography variant="body2" sx={{ color: '#4a4a4a', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HelpIcon sx={{ fontSize: '1rem' }} />
          Quick questions:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {quickQuestions.map((quickQuestion, index) => (
            <Chip
              key={index}
              label={quickQuestion}
              variant="outlined"
              size="small"
              onClick={() => handleQuickQuestion(quickQuestion)}
            disabled={loading}
              sx={{
                '&:hover': {
                  backgroundColor: '#1976d2',
                  color: 'white',
                  borderColor: '#1976d2'
                }
              }}
            />
          ))}
        </Box>
      </Box>

      <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 2, textAlign: 'center' }}>
        Answers will open in a new tab
      </Typography>
    </Paper>
  );
};

export default AIQuestionBox;