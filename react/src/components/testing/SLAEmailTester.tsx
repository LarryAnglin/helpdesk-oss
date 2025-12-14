/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../lib/auth/AuthContext';
import { useConfig } from '../../lib/context/ConfigContext';
import { testSLAEmails, testSingleSLAEmail } from '../../lib/testing/slaEmailTester';
import EmailIcon from '@mui/icons-material/Email';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export function SLAEmailTester() {
  const { userData } = useAuth();
  const { config } = useConfig();
  const [testEmail, setTestEmail] = useState(userData?.email || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Single test states
  const [singleTestPriority, setSingleTestPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [singleTestDate, setSingleTestDate] = useState<Date>(new Date());
  const [singleTestLoading, setSingleTestLoading] = useState(false);

  // Check if user is admin
  const isAdmin = userData?.role === 'system_admin' || userData?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <Alert severity="error">
        Access denied. Only administrators can run SLA email tests.
      </Alert>
    );
  }

  const handleRunFullTest = async () => {
    if (!testEmail.trim()) {
      setResult({ type: 'error', message: 'Please enter a test email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      await testSLAEmails(testEmail, config.slaSettings);
      setResult({ 
        type: 'success', 
        message: `✅ Successfully sent 7 test emails to ${testEmail}. Check your inbox for SLA expectation examples. All test documents have been cleaned up.` 
      });
    } catch (error: any) {
      console.error('SLA email test failed:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Test failed: ${error.message || 'Unknown error occurred'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunSingleTest = async () => {
    if (!testEmail.trim()) {
      setResult({ type: 'error', message: 'Please enter a test email address' });
      return;
    }

    setSingleTestLoading(true);
    setResult(null);

    try {
      await testSingleSLAEmail(singleTestPriority, singleTestDate, testEmail, config.slaSettings);
      setResult({ 
        type: 'success', 
        message: `✅ Successfully sent single test email (${singleTestPriority} priority) to ${testEmail}. Test document has been cleaned up.` 
      });
    } catch (error: any) {
      console.error('Single SLA email test failed:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Single test failed: ${error.message || 'Unknown error occurred'}` 
      });
    } finally {
      setSingleTestLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h6" gutterBottom>
          SLA Email Testing
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Test the SLA expectation messaging in ticket acknowledgment emails with various scenarios.
        </Typography>

        <Paper sx={{ p: 3, mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Test Email Address"
              fullWidth
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              helperText="Email address where test messages will be sent"
              type="email"
              required
            />
          </Box>

          {result && (
            <Alert severity={result.type} sx={{ mb: 3 }}>
              {result.message}
            </Alert>
          )}

          {/* Full Test Suite */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                📧 Full Test Suite
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Sends 7 test emails with different priority/time combinations:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 2, pl: 2 }}>
                <Typography component="li" variant="body2">• Urgent - Friday Evening</Typography>
                <Typography component="li" variant="body2">• High - Monday Morning</Typography>
                <Typography component="li" variant="body2">• Medium - Wednesday Afternoon</Typography>
                <Typography component="li" variant="body2">• Medium - Friday Evening (business hours test)</Typography>
                <Typography component="li" variant="body2">• Low - Saturday Morning</Typography>
                <Typography component="li" variant="body2">• High - Tuesday Night</Typography>
                <Typography component="li" variant="body2">• Urgent - Right Now</Typography>
              </Box>
              
              <Button
                variant="contained"
                onClick={handleRunFullTest}
                disabled={loading || !testEmail.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                fullWidth
              >
                {loading ? 'Sending Test Emails...' : 'Run Full Test Suite'}
              </Button>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }} />

          {/* Single Test */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                🎯 Single Test
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Test a specific priority and submission time combination:
              </Typography>
              
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={singleTestPriority}
                    onChange={(e) => setSingleTestPriority(e.target.value as any)}
                    label="Priority"
                  >
                    <MenuItem value="Urgent">Urgent (1 hour response)</MenuItem>
                    <MenuItem value="High">High (4 hour response)</MenuItem>
                    <MenuItem value="Medium">Medium (8 business hour response)</MenuItem>
                    <MenuItem value="Low">Low (24 business hour response)</MenuItem>
                  </Select>
                </FormControl>

                <DateTimePicker
                  label="Submission Date & Time"
                  value={singleTestDate}
                  onChange={(newValue) => setSingleTestDate(newValue || new Date())}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "Choose when the ticket would be submitted"
                    }
                  }}
                />
              </Box>

              <Button
                variant="outlined"
                onClick={handleRunSingleTest}
                disabled={singleTestLoading || !testEmail.trim()}
                startIcon={singleTestLoading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
                fullWidth
              >
                {singleTestLoading ? 'Sending Single Test...' : 'Send Single Test Email'}
              </Button>
            </CardContent>
          </Card>

          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>💡 How it works:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                1. Creates test email documents in the Firestore <code>mail</code> collection<br/>
                2. Firebase email extension processes and sends the emails<br/>
                3. Waits for processing, then automatically deletes test documents<br/>
                4. Each email includes SLA expectations based on current settings
              </Typography>
            </Alert>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>⚠️ Important:</strong> Test emails are sent to real email addresses. 
                Make sure you own the email address you're testing with.
              </Typography>
            </Alert>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}