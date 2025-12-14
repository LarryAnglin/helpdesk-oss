/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import { Timeline, TimelineEvent } from '../../lib/types/timeline';
import { groupEventsByDate } from '../../lib/services/timelineService';
import { formatShortIdForDisplay } from '../../lib/services/shortIdSearch';
import './TimelinePrintView.css';

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

interface TimelinePrintViewProps {
  timeline: Timeline;
  options?: {
    title?: string;
    groupByDate?: boolean;
    showTimeOnly?: boolean;
    includeEventDetails?: boolean;
  };
}

const TimelinePrintView: React.FC<TimelinePrintViewProps> = ({ timeline, options = {} }) => {
  const {
    title = timeline.title,
    groupByDate = true,
    showTimeOnly = true,
    includeEventDetails = true
  } = options;

  const visibleEvents = timeline.events.filter(event => event.isVisible);
  const groupedEvents = groupByDate ? groupEventsByDate(visibleEvents) : { 'All Events': visibleEvents };
  const shortId = getShortIdFromTicket(timeline.ticketId);
  const displayId = formatShortIdForDisplay(shortId);

  const getEventClassName = (type: TimelineEvent['type']) => {
    return `timeline-event timeline-event-${type.replace(/_/g, '-')}`;
  };

  const getEventLabel = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'submission': return 'Submission';
      case 'reply': return 'Reply';
      case 'private_reply': return 'Private Note';
      case 'status_change': return 'Status Change';
      case 'assignment': return 'Assignment';
      case 'custom': return 'Custom';
      default: return 'Event';
    }
  };

  return (
    <div className="timeline-print-view">
      <div className="timeline-header">
        <div className="timeline-logo">anglinAI</div>
        <h1 className="timeline-title">{title}</h1>
        <div className="timeline-subtitle">
          Generated on {new Date().toLocaleDateString()} • {displayId}
        </div>
      </div>

      <div className="timeline-content">
        {Object.entries(groupedEvents).map(([date, events]) => (
          <div key={date} className="timeline-date-group">
            {groupByDate && date !== 'All Events' && (
              <div className="timeline-date-header">
                {new Date(events[0].timestamp).toLocaleDateString([], {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
            
            <div className="timeline-events">
              {events.map((event) => (
                <div key={event.id} className={getEventClassName(event.type)}>
                  <div className="timeline-event-marker"></div>
                  <div className="timeline-event-content">
                    <div className="timeline-event-header">
                      <div className="timeline-event-time">
                        {showTimeOnly && groupByDate
                          ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="timeline-event-title">{getEventLabel(event.type)}</div>
                    
                    <div className="timeline-event-description">{event.title}</div>
                    
                    {event.description && includeEventDetails && (
                      <div className="timeline-event-details">{event.description}</div>
                    )}
                    
                    {event.author && (
                      <div className="timeline-event-author">
                        by {event.author.name}
                        {event.author.role && (
                          <span className="timeline-event-role"> ({event.author.role})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-footer">
        <div className="timeline-footer-id">{displayId}</div>
        <div className="timeline-footer-page">Page <span className="page-number"></span> of <span className="page-total"></span></div>
      </div>
    </div>
  );
};

export default TimelinePrintView;