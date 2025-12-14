/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import TicketList from '../components/tickets/TicketList';
import { Box } from '@mui/material';

const TicketsPage = () => {
  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4 }}>
      <TicketList />
    </Box>
  );
};

export default TicketsPage;