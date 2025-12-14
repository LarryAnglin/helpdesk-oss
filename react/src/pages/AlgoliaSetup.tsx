/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Search, Settings, CloudUpload, RefreshCw, PlayCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { hasRole } from '@/lib/utils/roleUtils';
import {
  checkAlgoliaSetup,
  initializeAlgoliaIndices,
  indexExistingData,
  testSearchFunctionality,
  runCompleteAlgoliaSetup,
  AlgoliaSetupStatus
} from '../lib/algolia/setupHelper';

export default function AlgoliaSetup() {
  const { userData, loading } = useAuth();
  const [status, setStatus] = useState<AlgoliaSetupStatus | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  // Check if user is admin
  useEffect(() => {
    if (!loading && userData && !hasRole(userData.role, 'system_admin')) {
      setMessage('You must be an admin to access this page.');
      setStatusLoading(false);
      return;
    }
    
    if (!loading && hasRole(userData?.role, 'system_admin')) {
      checkStatus();
    }
  }, [userData, loading]);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const currentStatus = await checkAlgoliaSetup();
      setStatus(currentStatus);
      setMessage('');
    } catch (error) {
      console.error('Error checking Algolia status:', error);
      setMessage(`Error checking status: ${error}`);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    setOperationLoading(true);
    setMessage('');
    
    try {
      const result = await runCompleteAlgoliaSetup();
      setMessage(result.message);
      if (result.success) {
        await checkStatus(); // Refresh status
      }
    } catch (error) {
      setMessage(`Setup failed: ${error}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleInitializeIndices = async () => {
    setOperationLoading(true);
    setMessage('');
    
    try {
      const result = await initializeAlgoliaIndices();
      setMessage(result.message);
      if (result.success) {
        await checkStatus(); // Refresh status
      }
    } catch (error) {
      setMessage(`Index initialization failed: ${error}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleIndexData = async () => {
    setOperationLoading(true);
    setMessage('');
    
    try {
      const result = await indexExistingData();
      setMessage(result.message);
      if (result.success) {
        await checkStatus(); // Refresh status
      }
    } catch (error) {
      setMessage(`Data indexing failed: ${error}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleTestSearch = async () => {
    setOperationLoading(true);
    setMessage('');
    
    try {
      const result = await testSearchFunctionality();
      setMessage(result.message);
      if (result.success) {
        await checkStatus(); // Refresh status
      }
    } catch (error) {
      setMessage(`Search test failed: ${error}`);
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading || statusLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasRole(userData?.role, 'system_admin')) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be an admin to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSetupComplete = status?.apiKeysConfigured && 
                         status?.indicesConfigured && 
                         status?.dataIndexed && 
                         status?.searchTested;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Algolia Search Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure and initialize Algolia search for your help desk system. This will enable 
          fast, searchable access to tickets and projects.
        </p>
      </div>

      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Setup Progress
            {isSetupComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
          </CardTitle>
          <CardDescription>
            Current status of your Algolia search configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>API Keys Configured</span>
              {status?.apiKeysConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span>Search Indices Configured</span>
              {status?.indicesConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span>Data Indexed</span>
              {status?.dataIndexed ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span>Search Functionality Tested</span>
              {status?.searchTested ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Complete Setup
            </CardTitle>
            <CardDescription>
              Run the full setup process automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCompleteSetup}
              disabled={operationLoading || !status?.apiKeysConfigured}
              className="w-full"
            >
              {operationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayCircle className="h-4 w-4 mr-2" />
              )}
              Run Complete Setup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Refresh Status
            </CardTitle>
            <CardDescription>
              Check current setup status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={checkStatus}
              disabled={operationLoading}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Initialize Indices
            </CardTitle>
            <CardDescription>
              Create and configure search indices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={handleInitializeIndices}
              disabled={operationLoading || !status?.apiKeysConfigured}
              className="w-full"
            >
              {operationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Initialize Indices
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5" />
              Index Data
            </CardTitle>
            <CardDescription>
              Upload existing tickets and projects to search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={handleIndexData}
              disabled={operationLoading || !status?.indicesConfigured}
              className="w-full"
            >
              {operationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              Index Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Test Search
          </CardTitle>
          <CardDescription>
            Verify that search functionality is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline"
            onClick={handleTestSearch}
            disabled={operationLoading || !status?.dataIndexed}
            className="w-full"
          >
            {operationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Test Search Functionality
          </Button>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {message && (
        <Card>
          <CardContent className="pt-6">
            <div className={`p-3 rounded-md ${
              message.includes('success') || message.includes('working') || message.includes('complete')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.includes('Error') || message.includes('failed')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {message}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Help */}
      {!status?.apiKeysConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              API Keys Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Your Algolia API keys are already configured in the environment variables:</p>
            <div className="bg-gray-100 p-3 rounded-md text-sm font-mono">
              <div>VITE_ALGOLIA_APP_ID=T5WDVP4AC3</div>
              <div>VITE_ALGOLIA_ADMIN_API_KEY=********</div>
              <div>VITE_ALGOLIA_SEARCH_API_KEY=********</div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The setup system should detect these automatically. If you're seeing this message, 
              there might be an issue with the configuration detection.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {status?.errors && status.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Setup Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}