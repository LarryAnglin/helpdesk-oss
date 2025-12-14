/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../lib/auth/AuthContext';
import OnboardingWizard from '../onboarding/OnboardingWizard';

console.log('ProtectedRoute component loaded');

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'tech' | 'company_admin' | 'organization_admin' | 'system_admin' | 'super_admin' | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, userData, loading } = useAuth();

  console.log('ProtectedRoute render - loading:', loading, 'user:', !!user, 'userData:', !!userData);

  if (loading) {
    console.log('ProtectedRoute: showing loading spinner');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    console.log('ProtectedRoute: redirecting to signin - no user');
    return <Navigate to="/signin" replace />;
  }

  if (!userData) {
    console.log('ProtectedRoute: user exists but no userData - showing onboarding');
    return <OnboardingWizard />;
  }

  // Check role-based access
  if (requiredRole) {
    if (Array.isArray(requiredRole)) {
      // Check if user has one of the required roles
      if (!requiredRole.includes(userData.role)) {
        console.log('ProtectedRoute: user role not in required roles - redirecting to home');
        return <Navigate to="/" replace />;
      }
    } else {
      // Single role check with hierarchy
      const roleHierarchy = { 
        user: 0, 
        tech: 1, 
        company_admin: 2, 
        organization_admin: 3, 
        system_admin: 4, 
        super_admin: 5 
      };
      const userRoleLevel = roleHierarchy[userData.role] ?? 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] ?? 0;

      if (userRoleLevel < requiredRoleLevel) {
        console.log('ProtectedRoute: insufficient role - redirecting to home');
        return <Navigate to="/" replace />;
      }
    }
  }

  console.log('ProtectedRoute: rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;