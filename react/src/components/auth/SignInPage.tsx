/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Alert,
  Snackbar,
  Typography,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../../lib/auth/AuthContext';
import CommonSolutionsSection from './CommonSolutionsSection';
import AIQuestionBox from '../ai/AIQuestionBox';

const SignInPage = () => {
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch {
      setError('Failed to sign in with Google. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 4 }}>
        {/* Top section - Logo and Login */}
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            <img
              src="/redanglinai.png"
              alt="Help Desk"
              style={{ height: '80px', objectFit: 'contain', marginBottom: '2rem' }}
            />
            <Typography component="h1" variant="h5" sx={{ mb: 1 }}>
              Welcome to the Help Desk
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              Sign in to submit and track your support tickets.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{ py: 1.5 }}
            >
              Sign in with Google
            </Button>
          </Box>
        </Paper>

        {/* AI Support Assistant */}
        <AIQuestionBox />

        {/* Bottom section - Common Solutions */}
        <Paper elevation={3} sx={{ p: 4, flex: 1 }}>
          <CommonSolutionsSection />
        </Paper>
      </Container>

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowError(false)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SignInPage;