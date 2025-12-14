/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { searchTickets, searchProjects } from '../../lib/algolia/searchService';
import { smartTicketSearch, formatShortIdForDisplay } from '../../lib/services/shortIdSearch';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { formatDate } from '../../lib/utils';
import { isAlgoliaConfigured } from '../../lib/algolia/algoliaConfig';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  status: string;
  _highlightResult?: {
    title?: { value: string; matchLevel: string };
    description?: { value: string; matchLevel: string };
  };
  [key: string]: any;
}

// Helper function to render highlighted text
const HighlightedText = ({ text }: { text: string }) => {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: text.replace(/<em>/g, '<mark>').replace(/<\/em>/g, '</mark>'),
      }}
    />
  );
};

export function UnifiedSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [ticketResults, setTicketResults] = useState<SearchResult[]>([]);
  const [projectResults, setProjectResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [shortIdFound, setShortIdFound] = useState<string | null>(null);
  const navigate = useNavigate();

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTicketResults([]);
      setProjectResults([]);
      setShortIdFound(null);
      return;
    }

    setLoading(true);
    setShortIdFound(null);
    
    try {
      // Use smart search for tickets (tries short ID first, then regular search)
      const ticketSearchResult = await smartTicketSearch(searchQuery, async (text: string) => {
        const response = await searchTickets(text);
        return (response as any).hits.map((hit: any) => ({
          ...hit,
          priority: hit.priority || 'Medium',
          location: hit.location || 'Other',
          isOnVpn: hit.isOnVpn || false,
          computer: hit.computer || '',
          name: hit.name || '',
          email: hit.email || '',
          contactMethod: hit.contactMethod || '',
          isPersonHavingProblem: hit.isPersonHavingProblem || false,
          attachments: hit.attachments || [],
          participants: hit.participants || [],
          submitterId: hit.submitterId || '',
          replies: hit.replies || [],
          createdAt: hit.createdAt || 0,
          updatedAt: hit.updatedAt || 0
        }));
      });
      
      // Always search projects normally (no short IDs for projects)
      const projectsResponse = await searchProjects(searchQuery);

      setTicketResults(ticketSearchResult.tickets);
      setProjectResults((projectsResponse as any).hits as SearchResult[]);
      
      // Track if we found a ticket by short ID
      if (ticketSearchResult.foundByShortId && ticketSearchResult.shortIdUsed) {
        setShortIdFound(ticketSearchResult.shortIdUsed);
      }
      
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => performSearch(query), 300),
    []
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleResultClick = (type: 'ticket' | 'project', id: string) => {
    if (type === 'ticket') {
      navigate(`/tickets/${id}`);
    } else {
      navigate(`/projects/${id}`);
    }
    setOpen(false);
    setQuery('');
    setShortIdFound(null);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Closed':
      case 'resolved':
        return 'success';
      case 'In Progress':
      case 'open':
      case 'pending':
        return 'default';
      case 'Cancelled':
      case 'Denied':
        return 'destructive';
      case 'Waiting':
      case 'Deferred':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative bg-background/10 hover:bg-background/20 text-white border-white/20 hover:border-white/30 pl-3 pr-20"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="mr-2">Search</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/90 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search for tickets and projects across the system
            </DialogDescription>
          </DialogHeader>
          
          {!isAlgoliaConfigured ? (
            <div className="p-6">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <AlertCircle className="h-4 w-4" />
                <h3 className="font-semibold">Algolia Search Not Configured</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                To enable search functionality, please configure your Algolia credentials in the .env file:
              </p>
              <pre className="text-xs bg-muted p-3 rounded-md">
                VITE_ALGOLIA_APP_ID=your_app_id{'\n'}
                VITE_ALGOLIA_ADMIN_API_KEY=your_admin_key{'\n'}
                VITE_ALGOLIA_SEARCH_API_KEY=your_search_key
              </pre>
              <p className="text-sm text-muted-foreground mt-4">
                Sign up for a free account at{' '}
                <a href="https://www.algolia.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  algolia.com
                </a>
              </p>
            </div>
          ) : (
            <>
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="pl-10 pr-10 text-foreground"
                    autoFocus
                  />
                  {query && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery('');
                        setShortIdFound(null);
                      }}
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

          {query && (
            <div className="max-h-[400px] overflow-y-auto p-4 pt-0">
              {shortIdFound && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Search className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Found ticket by ID: {formatShortIdForDisplay(shortIdFound)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Searched by short ticket ID instead of text search
                  </p>
                </div>
              )}
              
              <Tabs defaultValue="tickets" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tickets">
                    Tickets ({ticketResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="projects">
                    Projects ({projectResults.length})
                  </TabsTrigger>
                </TabsList>

                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Searching...
                  </div>
                ) : (
                  <>
                    <TabsContent value="tickets" className="space-y-2">
                      {ticketResults.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No tickets found
                        </div>
                      ) : (
                        ticketResults.map((ticket) => (
                          <Card
                            key={ticket.id}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => handleResultClick('ticket', ticket.id)}
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">
                                    {ticket._highlightResult?.title?.value ? (
                                      <HighlightedText text={ticket._highlightResult.title.value} />
                                    ) : (
                                      ticket.title
                                    )}
                                  </CardTitle>
                                  <CardDescription className="line-clamp-2">
                                    {ticket._highlightResult?.description?.value ? (
                                      <HighlightedText text={ticket._highlightResult.description.value} />
                                    ) : (
                                      ticket.description
                                    )}
                                  </CardDescription>
                                </div>
                                <Badge variant={getStatusVariant(ticket.status)}>
                                  {ticket.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Priority: {ticket.priority}</span>
                                <span>Created: {formatDate(ticket.createdAt)}</span>
                              </div>
                            </CardHeader>
                          </Card>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="projects" className="space-y-2">
                      {projectResults.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No projects found
                        </div>
                      ) : (
                        projectResults.map((project) => (
                          <Card
                            key={project.id}
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => handleResultClick('project', project.id)}
                          >
                            <CardHeader className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">
                                    {project._highlightResult?.title?.value ? (
                                      <HighlightedText text={project._highlightResult.title.value} />
                                    ) : (
                                      project.title
                                    )}
                                  </CardTitle>
                                  <CardDescription className="line-clamp-2">
                                    {project._highlightResult?.description?.value ? (
                                      <HighlightedText text={project._highlightResult.description.value} />
                                    ) : (
                                      project.description
                                    )}
                                  </CardDescription>
                                </div>
                                <Badge variant={getStatusVariant(project.status)}>
                                  {project.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Location: {project.location}</span>
                                <span>Price: ${project.price}</span>
                              </div>
                            </CardHeader>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}