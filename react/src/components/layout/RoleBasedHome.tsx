/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth/AuthContext';
import Dashboard from '../../pages/Dashboard';

const RoleBasedHome: React.FC = () => {
  const { userData } = useAuth();

  // Redirect regular users to create ticket page
  if (userData?.role === 'user') {
    return <Navigate to="/create-ticket" replace />;
  }

  // Show dashboard for tech and admin users
  return <Dashboard />;
};

export default RoleBasedHome;