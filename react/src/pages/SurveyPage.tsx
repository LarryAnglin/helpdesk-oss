/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Rating,
  Container,
} from '@mui/material';
import { API_ENDPOINTS } from '../lib/apiConfig';

const SurveyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const ticketId = searchParams.get('ticket');
  const presetRating = searchParams.get('rating');

  const [rating, setRating] = useState<number | null>(presetRating ? parseInt(presetRating) : null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token || !rating) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.RECORD_SURVEY_RESPONSE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          rating,
          feedback: feedback.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit survey');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Survey submission error:', err);
      setError(err.message || 'Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Alert severity="error">
            Invalid survey link. Please use the link from your email.
          </Alert>
        </Box>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom color="primary">
              Thank You!
            </Typography>
            <Typography variant="body1" paragraph>
              We appreciate your feedback. Your response helps us improve our service.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can close this window now.
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Customer Satisfaction Survey
          </Typography>
          
          {ticketId && (
            <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
              Ticket #{ticketId}
            </Typography>
          )}

          <Box sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              How satisfied were you with our support?
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <Rating
                value={rating}
                onChange={(_, newValue) => setRating(newValue)}
                size="large"
                sx={{ fontSize: '3rem' }}
              />
            </Box>

            {rating && (
              <Typography variant="body2" color="text.secondary" align="center">
                {rating === 1 && 'Very Dissatisfied'}
                {rating === 2 && 'Dissatisfied'}
                {rating === 3 && 'Neutral'}
                {rating === 4 && 'Satisfied'}
                {rating === 5 && 'Very Satisfied'}
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Additional Comments (Optional)
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Please share any additional feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={submitting}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={!rating || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Feedback'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default SurveyPage;