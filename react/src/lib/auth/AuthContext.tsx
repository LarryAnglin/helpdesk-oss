/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { API_ENDPOINTS, callApi } from '../apiConfig';

export type UserRole = 'user' | 'tech' | 'company_admin' | 'organization_admin' | 'system_admin' | 'super_admin';

import { UserTenantMembership } from '../types/user';

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  tenantMemberships: UserTenantMembership[];
  currentTenantId?: string;
  createdAt: number;
  organizationId?: string;
  companyId?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);


  const fetchUserData = async (uid: string) => {
    try {
      console.log('Fetching user data for UID:', uid);
      const docRef = doc(db, 'users', uid);
      
      // Add timeout to Firestore call
      const firestorePromise = getDoc(docRef);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 10000)
      );
      
      const docSnap = await Promise.race([firestorePromise, timeoutPromise]) as any;
  
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        console.log('User data found:', data);
        setUserData(data);
        
        // Set user role cookie for middleware to access
        setUserRoleCookie(data.role);
        console.log('User role cookie set for existing user:', data.role);
      } else {
        console.log('User data not found - user needs onboarding');
        // Don't automatically create user document - let onboarding wizard handle it
        setUserData(null);
        removeUserRoleCookie();
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      console.error('Error details:', (error as any).message);
      setUserData(null);
      removeUserRoleCookie();
      // Don't re-throw to prevent blocking the loading state
      console.log('Continuing despite user data fetch error');
    }
  };

  // Function to set the auth token cookie
  const setAuthCookie = (token: string) => {
    document.cookie = `auth_token=${token}; path=/; max-age=3600; SameSite=Strict`;
    console.log('Auth token cookie set');
  };

  // Function to remove the auth token cookie
  const removeAuthCookie = () => {
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict';
    console.log('Auth token cookie removed');
  };
  
  // Function to set the user role cookie for middleware access
  const setUserRoleCookie = (role: UserRole) => {
    document.cookie = `user_role=${role}; path=/; max-age=3600; SameSite=Strict`;
    console.log('User role cookie set:', role);
  };
  
  // Function to remove the user role cookie
  const removeUserRoleCookie = () => {
    document.cookie = 'user_role=; path=/; max-age=0; SameSite=Strict';
    console.log('User role cookie removed');
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      console.log('Current loading state:', loading);
      
      setUser(user);
      
      if (user) {
        console.log('Processing authenticated user:', user.email);
        // Get the user's token and set it as a cookie
        const token = await user.getIdToken();
        setAuthCookie(token);
        
        // Fetch user data and create the user document if it doesn't exist
        await fetchUserData(user.uid);
        console.log('User data processing complete');
      } else {
        console.log('No user - clearing auth data');
        setUserData(null);
        removeAuthCookie();
        removeUserRoleCookie();
      }
      
      console.log('Setting loading to false');
      setLoading(false);
    });

    return () => {
      console.log('Auth state listener cleanup');
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    console.log('Starting Google sign-in process...');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log('User authenticated:', user.email);

      await fetchUserData(user.uid);
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      removeAuthCookie();
      removeUserRoleCookie();
      setUserData(null);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  // Force token refresh function - useful after role changes
  const refreshToken = async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // First, get a fresh token
      const token = await user.getIdToken(true);
      
      // Call the server API to revoke refresh tokens
      const response = await callApi(API_ENDPOINTS.REFRESH_TOKEN, {
        method: 'POST',
        body: JSON.stringify({ token }),
      }, token);
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      // Get a new token with updated claims
      const newToken = await user.getIdToken(true);
      setAuthCookie(newToken);
      
      // Refresh the user data to get updated role
      await fetchUserData(user.uid);
      
      console.log('Token refreshed with updated claims');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  // Refresh user data - useful after onboarding completion
  const refreshUserData = async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      await fetchUserData(user.uid);
      console.log('User data refreshed');
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signInWithGoogle,
    signOut,
    refreshToken,
    refreshUserData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};