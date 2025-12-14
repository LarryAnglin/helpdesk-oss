/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Help as HelpIcon,
  Speed as SpeedIcon,
  SmartToy as AIIcon,
  Quiz as FAQIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { helpDeskAI, ProgressStep } from '../../lib/ai/aiService';
import { FAQMatch } from '../../lib/ai/faqService';
import { useConfig } from '../../lib/context/ConfigContext';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: string[];
  tokenUsage?: any;
  faqMatch?: FAQMatch;
}

interface SelfHelpChatProps {
  onCreateTicket?: (question: string, suggestedSolution: string) => void;
  initialQuestion?: string;
}

const SelfHelpChat: React.FC<SelfHelpChatProps> = ({ onCreateTicket, initialQuestion }) => {
  const { config } = useConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState(initialQuestion || '');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'system',
      content: `👋 **Welcome to IT Self-Help!**

I'm your AI assistant here to help with common IT issues. I can help you with:

• **Password & Account Issues** - Resets, lockouts, login problems
• **Email Problems** - Outlook issues, setup, troubleshooting  
• **Software Issues** - Applications not working, installation requests
• **Hardware Problems** - Slow computers, crashes, performance
• **Network Issues** - WiFi, VPN, connectivity problems
• **Printer Issues** - Setup, drivers, printing problems

Just describe your issue and I'll provide step-by-step solutions. If I can't help, I'll guide you to create a support ticket.

**What can I help you with today?**`,
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);

    // Initialize AI service
    helpDeskAI.setProgressCallback(setProgress);
    helpDeskAI.loadKnowledgeBase().catch(console.error);

    // If there's an initial question, process it
    if (initialQuestion) {
      handleSendMessage(initialQuestion);
    }
  }, [initialQuestion]);

  useEffect(() => {
    // Only auto-scroll if there's more than the welcome message
    // and if the user has actually sent a message
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message?: string) => {
    const questionText = message || currentMessage.trim();
    if (!questionText || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: questionText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);
    setProgress(null);

    try {
      const result = await helpDeskAI.processQuestion(questionText, config);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources,
        tokenUsage: result.tokenUsage,
        faqMatch: result.faqMatch
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error processing question:', err);
      setError('Sorry, I encountered an error. Please try again or create a support ticket.');
      
      const supportPhone = config.supportPhone || 'IT Support';
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `❌ **Error occurred** - Please try rephrasing your question or contact IT support at ${supportPhone} for immediate assistance.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateTicket = () => {
    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    const lastAssistantMessage = messages.filter(m => m.type === 'assistant').pop();
    
    if (onCreateTicket && lastUserMessage) {
      onCreateTicket(
        lastUserMessage.content,
        lastAssistantMessage?.content || 'No solution provided'
      );
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setProgress(null);
    try {
      await helpDeskAI.loadKnowledgeBase();
    } catch (err) {
      console.error('Error refreshing knowledge base:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestedQuestions = () => [
    "I forgot my password",
    "My computer is running very slow",
    "I can't send emails",
    "WiFi is not working",
    "Printer won't print",
    "Need software installed"
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpIcon color="primary" />
            <Typography variant="h6">IT Self-Help Assistant</Typography>
            <Chip 
              size="small" 
              label="AI Powered" 
              color="primary" 
              icon={<AIIcon />} 
            />
          </Box>
          <IconButton onClick={handleRefresh} disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        {progress && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {progress.description}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={progress.progress} 
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </Paper>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        {messages.map((message) => (
          <Box key={message.id} sx={{ mb: 2 }}>
            <Card 
              sx={{ 
                maxWidth: message.type === 'user' ? '70%' : '100%',
                ml: message.type === 'user' ? 'auto' : 0,
                mr: message.type === 'user' ? 0 : 'auto',
                bgcolor: message.type === 'user' 
                  ? 'common.white' 
                  : message.type === 'system' 
                    ? 'background.paper' 
                    : 'background.paper',
                border: message.type === 'user' ? 1 : message.type === 'system' ? 1 : 0,
                borderColor: message.type === 'user' ? 'primary.main' : message.type === 'system' ? 'info.main' : 'transparent'
              }}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                {message.type === 'user' ? (
                  <Typography 
                    variant="body1" 
                    sx={{ color: 'common.black' }}
                  >
                    {message.content}
                  </Typography>
                ) : (
                  <Box sx={{ color: 'text.primary' }}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    
                    {/* Show sources and metadata */}
                    {(message.sources || message.faqMatch || message.tokenUsage) && (
                      <Box sx={{ mt: 2 }}>
                        <Divider sx={{ mb: 1 }} />
                        
                        {message.faqMatch && (
                          <Chip
                            size="small"
                            icon={<FAQIcon />}
                            label={`FAQ Match (${(message.faqMatch.confidence * 100).toFixed(0)}%)`}
                            color="success"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        
                        {message.sources && (
                          <Chip
                            size="small"
                            icon={<SpeedIcon />}
                            label={`Source: ${message.sources.join(', ')}`}
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        
                        {message.tokenUsage && (
                          <Chip
                            size="small"
                            label={`${message.tokenUsage.model} - $${message.tokenUsage.estimatedCost.toFixed(4)}`}
                            variant="outlined"
                            sx={{ mb: 1 }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                )}
                
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ display: 'block', mt: 1 }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
        
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Questions */}
      {messages.length === 1 && !isLoading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Common Questions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {getSuggestedQuestions().map((question) => (
              <Chip
                key={question}
                label={question}
                onClick={() => handleSendMessage(question)}
                sx={{ cursor: 'pointer' }}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Input */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            ref={inputRef}
            fullWidth
            variant="outlined"
            placeholder="Describe your IT issue..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <Button
            variant="contained"
            onClick={() => handleSendMessage()}
            disabled={!currentMessage.trim() || isLoading}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            <SendIcon />
          </Button>
        </Box>
        
        {onCreateTicket && messages.length > 1 && (
          <Button
            variant="outlined"
            onClick={handleCreateTicket}
            fullWidth
            size="small"
          >
            Still Need Help? Create Support Ticket
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default SelfHelpChat;