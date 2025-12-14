/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../lib/auth/AuthContext';
import WelcomePage from './Welcome';

const Home = () => {
  const { userData } = useAuth();

  if (userData?.role === 'user') {
    return <WelcomePage />;
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 'bold', mb: 2 }}
        >
          Welcome to the Help Desk
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
          Submit and track IT support tickets for technical issues and requests
        </Typography>
        <Button
          component={Link}
          to="/tickets/new"
          variant="contained"
          size="large"
          startIcon={<AddCircleOutlineIcon />}
          sx={{ px: 4, py: 1.5 }}
        >
          Submit a New Ticket
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, mb: 6 }}>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper
            component={Link}
            to="/tickets"
            sx={{
              p: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              textDecoration: 'none',
              color: 'text.primary',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
          >
            <ListAltIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              View Your Tickets
            </Typography>
            <Typography color="text.secondary">
              Check the status of your existing support requests and view responses
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
          <Paper
            component="div"
            sx={{
              p: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              color: 'text.primary',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4,
              },
            }}
          >
            <HelpOutlineIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Need Help?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              For urgent technical issues, please contact IT Support directly
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                Email: <strong>larry@your-domain.com</strong>
              </Typography>
              <Typography variant="body2">
                Phone: <strong>(512) 222-8925</strong>
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* <Paper
        sx={{
          p: 4,
          borderRadius: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="h5" gutterBottom fontWeight="bold">
          IT Support Hours
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography variant="body1" gutterBottom fontWeight="medium">
              Monday - Friday
            </Typography>
            <Typography variant="body2" paragraph>
              8:00 AM - 5:00 PM
            </Typography>
          </Box>
          <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
            <Typography variant="body1" gutterBottom fontWeight="medium">
              Weekends & Holidays
            </Typography>
            <Typography variant="body2">
              Emergency support only
            </Typography>
          </Box>
        </Box>
      </Paper> */}
    </Box>
  );
};

export default Home;