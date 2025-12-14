/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { ticketsIndex, projectsIndex, isAlgoliaConfigured } from '@/lib/algolia/algoliaConfig';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AlgoliaManualSync() {
  const { userData, loading } = useAuth();
  const [ticketsData, setTicketsData] = useState('');
  const [projectsData, setProjectsData] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSyncTickets = async () => {
    setSyncStatus('loading');
    setMessage('');
    
    try {
      const tickets = JSON.parse(ticketsData);
      if (!Array.isArray(tickets)) {
        throw new Error('Tickets data must be an array');
      }
      
      const algoliaTickets = tickets.map(ticket => ({
        ...ticket,
        objectID: ticket.id
      }));
      
      await ticketsIndex?.saveObjects(algoliaTickets);
      setSyncStatus('success');
      setMessage(`Successfully synced ${tickets.length} tickets to Algolia`);
    } catch (error) {
      setSyncStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSyncProjects = async () => {
    setSyncStatus('loading');
    setMessage('');
    
    try {
      const projects = JSON.parse(projectsData);
      if (!Array.isArray(projects)) {
        throw new Error('Projects data must be an array');
      }
      
      const algoliaProjects = projects.map(project => ({
        ...project,
        objectID: project.id
      }));
      
      await projectsIndex?.saveObjects(algoliaProjects);
      setSyncStatus('success');
      setMessage(`Successfully synced ${projects.length} projects to Algolia`);
    } catch (error) {
      setSyncStatus('error');
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Checking authentication...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData || !(userData.role === 'system_admin' || userData.role === 'super_admin')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You must be an admin to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAlgoliaConfigured) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Algolia Not Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please configure Algolia credentials in the .env file first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Algolia Data Sync</CardTitle>
          <CardDescription>
            Manually input JSON data to sync to Algolia. This page is for initial setup or troubleshooting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Sync Tickets</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a JSON array of tickets to sync. You can export this from your Firebase console.
            </p>
            <Textarea
              placeholder='[{"id": "ticket1", "title": "Example Ticket", "status": "open", ...}]'
              value={ticketsData}
              onChange={(e) => setTicketsData(e.target.value)}
              className="font-mono text-sm"
              rows={10}
            />
            <Button 
              onClick={handleSyncTickets}
              disabled={syncStatus === 'loading' || !ticketsData}
              className="mt-2"
            >
              {syncStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Tickets'
              )}
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Sync Projects</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a JSON array of projects to sync. You can export this from your Firebase console.
            </p>
            <Textarea
              placeholder='[{"id": "project1", "title": "Example Project", "status": "In Progress", ...}]'
              value={projectsData}
              onChange={(e) => setProjectsData(e.target.value)}
              className="font-mono text-sm"
              rows={10}
            />
            <Button 
              onClick={handleSyncProjects}
              disabled={syncStatus === 'loading' || !projectsData}
              className="mt-2"
            >
              {syncStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Projects'
              )}
            </Button>
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              syncStatus === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">How to Export Data from Firebase</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Go to your Firebase Console</li>
              <li>Navigate to Firestore Database</li>
              <li>Select the collection (tickets or projects)</li>
              <li>Use the export feature or manually copy documents</li>
              <li>Format as a JSON array and paste above</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}