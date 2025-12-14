/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket } from '../types/ticket';
import { TimelineEvent, Timeline, TimelineGenerationOptions, DEFAULT_TIMELINE_OPTIONS } from '../types/timeline';
import { getRelatedTickets } from '../firebase/ticketRelationshipService';
import { formatShortIdForDisplay } from './shortIdSearch';

// Base62 character set for short IDs
const BASE62_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Convert hex string to Base62
const hexToBase62 = (hex: string): string => {
  let num = BigInt('0x' + hex);
  let result = '';
  
  while (num > 0) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  
  return result || '0';
};

// Generate deterministic short ID from ticket ID using hash
const getShortIdFromTicket = (ticketId: string): string => {
  // Create a simple hash using built-in methods (compatible with all environments)
  let hash = 0;
  for (let i = 0; i < ticketId.length; i++) {
    const char = ticketId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number and then to hex
  const positiveHash = Math.abs(hash).toString(16);
  
  // Convert to Base62 and ensure 6 characters
  let base62 = hexToBase62(positiveHash);
  
  // Pad or truncate to exactly 6 characters
  if (base62.length < 6) {
    base62 = base62.padStart(6, BASE62_CHARS[0]);
  } else if (base62.length > 6) {
    base62 = base62.substring(0, 6);
  }
  
  return base62;
};

/**
 * Generate a summary for a timeline event using AI
 */
async function summarizeEventWithAI(eventType: string, content: string, author?: string): Promise<string> {
  // For now, we'll skip AI summarization and use basic summaries
  // TODO: Implement AI summarization endpoint when available
  return generateBasicSummary(eventType, content, author);
}

/**
 * Generate a basic summary without AI
 */
function generateBasicSummary(eventType: string, content: string, author?: string): string {
  const maxLength = 120;
  const authorPrefix = author ? `${author}: ` : '';
  
  switch (eventType) {
    case 'submission':
      return `Ticket submitted${author ? ` by ${author}` : ''}`;
    case 'reply':
      return `${authorPrefix}${content.length > maxLength ? content.substring(0, maxLength) + '...' : content}`;
    case 'private_reply':
      return `${authorPrefix}Private note: ${content.length > maxLength ? content.substring(0, maxLength) + '...' : content}`;
    case 'status_change':
      return `Status changed${author ? ` by ${author}` : ''}: ${content}`;
    case 'assignment':
      return `Ticket assigned${author ? ` by ${author}` : ''}: ${content}`;
    default:
      return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }
}

/**
 * Generate timeline events from ticket data
 */
export async function generateTimelineFromTicket(
  ticket: Ticket,
  options: TimelineGenerationOptions = DEFAULT_TIMELINE_OPTIONS
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // Add submission event
  if (options.includeSubmission) {
    const submissionContent = `${ticket.title}\n${ticket.description}`;
    const summary = options.summarizeWithAI 
      ? await summarizeEventWithAI('submission', submissionContent, ticket.name)
      : generateBasicSummary('submission', submissionContent, ticket.name);

    events.push({
      id: `submission-${ticket.id}`,
      timestamp: ticket.createdAt,
      type: 'submission',
      title: summary,
      description: `Ticket "${ticket.title}" was submitted`,
      originalData: {
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        location: ticket.location
      },
      author: {
        name: ticket.name,
        email: ticket.email,
        role: 'user'
      },
      isVisible: true,
      isEditable: true
    });
  }

  // Add status changes from status history
  if (options.includeStatusChanges && ticket.statusHistory) {
    for (const statusChange of ticket.statusHistory) {
      const summary = options.summarizeWithAI
        ? await summarizeEventWithAI('status_change', `Changed from ${statusChange.fromStatus} to ${statusChange.toStatus}`, statusChange.changedBy)
        : generateBasicSummary('status_change', `Changed from ${statusChange.fromStatus} to ${statusChange.toStatus}`, statusChange.changedBy);

      events.push({
        id: `status-${statusChange.changedAt}`,
        timestamp: statusChange.changedAt,
        type: 'status_change',
        title: summary,
        description: `Status changed from ${statusChange.fromStatus} to ${statusChange.toStatus}`,
        originalData: statusChange,
        author: {
          name: statusChange.changedBy || 'System',
          email: '',
          role: 'system_admin'
        },
        isVisible: true,
        isEditable: true
      });
    }
  }

  // Add replies
  if ((options.includeReplies || options.includePrivateReplies) && ticket.replies) {
    for (const reply of ticket.replies) {
      // Skip private replies if not included
      if (reply.isPrivate && !options.includePrivateReplies) continue;
      // Skip public replies if not included
      if (!reply.isPrivate && !options.includeReplies) continue;

      const eventType = reply.isPrivate ? 'private_reply' : 'reply';
      const summary = options.summarizeWithAI
        ? await summarizeEventWithAI(eventType, reply.message, reply.authorName)
        : generateBasicSummary(eventType, reply.message, reply.authorName);

      events.push({
        id: `reply-${reply.id}`,
        timestamp: reply.createdAt,
        type: eventType,
        title: summary,
        description: reply.isPrivate ? 'Private note added' : 'Reply added',
        originalData: reply,
        author: {
          name: reply.authorName,
          email: reply.authorEmail,
          role: reply.isPrivate ? 'system_admin' : 'user'
        },
        isVisible: true,
        isEditable: true
      });
    }
  }

  // Add events from related tickets
  if (options.includeRelatedTickets) {
    try {
      const relatedData = await getRelatedTickets(ticket.id);
      
      if (relatedData) {
        // Process all related tickets (parent, children, and other relationships)
        const allRelatedTickets = [];
        
        if (relatedData.parent) {
          allRelatedTickets.push({ ticket: relatedData.parent, relationshipType: 'parent' });
        }
        
        relatedData.children.forEach(child => {
          allRelatedTickets.push({ ticket: child, relationshipType: 'child' });
        });
        
        relatedData.related.forEach(({ ticket: relatedTicket, relationship }) => {
          allRelatedTickets.push({ ticket: relatedTicket, relationshipType: relationship.relationshipType });
        });

        // Generate events for each related ticket
        for (const { ticket: relatedTicket, relationshipType } of allRelatedTickets) {
          // Add submission event from related ticket
          const relatedSubmissionSummary = options.summarizeWithAI 
            ? await summarizeEventWithAI('submission', `${relatedTicket.title}\n${relatedTicket.description}`, relatedTicket.name)
            : generateBasicSummary('submission', `${relatedTicket.title}\n${relatedTicket.description}`, relatedTicket.name);

          events.push({
            id: `related-submission-${relatedTicket.id}`,
            timestamp: relatedTicket.createdAt,
            type: 'submission',
            title: `[${relationshipType.toUpperCase()}] ${relatedSubmissionSummary}`,
            description: `Related ticket "${relatedTicket.title}" was submitted (${relationshipType} ticket)`,
            originalData: {
              ...relatedTicket,
              relationshipType
            },
            author: {
              name: relatedTicket.name,
              email: relatedTicket.email,
              role: 'user'
            },
            isVisible: true,
            isEditable: true
          });

          // Add key replies from related ticket (limit to avoid overwhelming timeline)
          if (relatedTicket.replies && relatedTicket.replies.length > 0) {
            // Take first reply and last reply if different
            const keyReplies = relatedTicket.replies.length === 1 
              ? [relatedTicket.replies[0]]
              : [relatedTicket.replies[0], relatedTicket.replies[relatedTicket.replies.length - 1]];

            for (const reply of keyReplies) {
              if (!reply.isPrivate || options.includePrivateReplies) {
                const eventType = reply.isPrivate ? 'private_reply' : 'reply';
                const summary = options.summarizeWithAI
                  ? await summarizeEventWithAI(eventType, reply.message, reply.authorName)
                  : generateBasicSummary(eventType, reply.message, reply.authorName);

                events.push({
                  id: `related-reply-${reply.id}`,
                  timestamp: reply.createdAt,
                  type: eventType,
                  title: `[${relationshipType.toUpperCase()}] ${summary}`,
                  description: `${reply.isPrivate ? 'Private note' : 'Reply'} on related ticket (${relationshipType})`,
                  originalData: {
                    ...reply,
                    relationshipType,
                    relatedTicketId: relatedTicket.id
                  },
                  author: {
                    name: reply.authorName,
                    email: reply.authorEmail,
                    role: reply.isPrivate ? 'system_admin' : 'user'
                  },
                  isVisible: true,
                  isEditable: true
                });
              }
            }
          }

          // Add status changes from related ticket
          if (relatedTicket.statusHistory && relatedTicket.statusHistory.length > 0) {
            // Only include final status if resolved/closed
            const finalStatus = relatedTicket.statusHistory[relatedTicket.statusHistory.length - 1];
            if (finalStatus.toStatus === 'Resolved' || finalStatus.toStatus === 'Closed') {
              const summary = options.summarizeWithAI
                ? await summarizeEventWithAI('status_change', `Changed to ${finalStatus.toStatus}`, finalStatus.changedBy)
                : generateBasicSummary('status_change', `Changed to ${finalStatus.toStatus}`, finalStatus.changedBy);

              events.push({
                id: `related-status-${finalStatus.changedAt}`,
                timestamp: finalStatus.changedAt,
                type: 'status_change',
                title: `[${relationshipType.toUpperCase()}] ${summary}`,
                description: `Related ticket status changed to ${finalStatus.toStatus} (${relationshipType})`,
                originalData: {
                  ...finalStatus,
                  relationshipType,
                  relatedTicketId: relatedTicket.id
                },
                author: {
                  name: finalStatus.changedBy || 'System',
                  email: '',
                  role: 'system_admin'
                },
                isVisible: true,
                isEditable: true
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading related tickets for timeline:', error);
      // Continue without related tickets if there's an error
    }
  }

  // Sort events by timestamp
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
}

/**
 * Create a new timeline from ticket
 */
export async function createTimelineFromTicket(
  ticket: Ticket,
  options: TimelineGenerationOptions = DEFAULT_TIMELINE_OPTIONS,
  createdBy: string
): Promise<Timeline> {
  const events = await generateTimelineFromTicket(ticket, options);

  const shortId = getShortIdFromTicket(ticket.id);
  const displayId = formatShortIdForDisplay(shortId);
  
  return {
    id: `timeline-${ticket.id}-${Date.now()}`,
    ticketId: ticket.id,
    title: `Timeline for ${displayId}`,
    events,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy
  };
}

/**
 * Update timeline event
 */
export function updateTimelineEvent(
  timeline: Timeline,
  eventId: string,
  updates: Partial<Pick<TimelineEvent, 'title' | 'description' | 'isVisible'>>
): Timeline {
  return {
    ...timeline,
    events: timeline.events.map(event =>
      event.id === eventId ? { ...event, ...updates } : event
    ),
    updatedAt: Date.now()
  };
}

/**
 * Add custom event to timeline
 */
export function addCustomEvent(
  timeline: Timeline,
  event: Omit<TimelineEvent, 'id' | 'type' | 'isEditable'>
): Timeline {
  const customEvent: TimelineEvent = {
    ...event,
    id: `custom-${Date.now()}`,
    type: 'custom',
    isEditable: true
  };

  const updatedEvents = [...timeline.events, customEvent];
  updatedEvents.sort((a, b) => a.timestamp - b.timestamp);

  return {
    ...timeline,
    events: updatedEvents,
    updatedAt: Date.now()
  };
}

/**
 * Remove event from timeline
 */
export function removeTimelineEvent(timeline: Timeline, eventId: string): Timeline {
  return {
    ...timeline,
    events: timeline.events.filter(event => event.id !== eventId),
    updatedAt: Date.now()
  };
}

/**
 * Group timeline events by date
 */
export function groupEventsByDate(events: TimelineEvent[]): { [date: string]: TimelineEvent[] } {
  const groups: { [date: string]: TimelineEvent[] } = {};

  events.forEach(event => {
    const date = new Date(event.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
  });

  return groups;
}