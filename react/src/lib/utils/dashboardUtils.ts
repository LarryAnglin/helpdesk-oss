/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket } from '../types/ticket';
import { TicketMetrics, SLAMetrics, TechPerformance, DateRange } from '../types/dashboard';

/**
 * Calculate comprehensive ticket metrics for dashboard
 */
export const calculateTicketMetrics = (tickets: Ticket[], dateRange?: DateRange): TicketMetrics => {
  let filteredTickets = tickets;
  
  if (dateRange) {
    filteredTickets = tickets.filter(ticket => {
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= dateRange.start && createdDate <= dateRange.end;
    });
  }

  const total = filteredTickets.length;
  const open = filteredTickets.filter(t => t.status === 'Open').length;
  const resolved = filteredTickets.filter(t => t.status === 'Resolved').length;
  const closed = filteredTickets.filter(t => t.status === 'Closed').length;
  const waiting = filteredTickets.filter(t => t.status === 'Waiting').length;
  const paused = filteredTickets.filter(t => t.status === 'Paused').length;
  
  const urgent = filteredTickets.filter(t => t.priority === 'Urgent').length;
  const high = filteredTickets.filter(t => t.priority === 'High').length;
  const medium = filteredTickets.filter(t => t.priority === 'Medium').length;
  const low = filteredTickets.filter(t => t.priority === 'Low').length;
  const none = filteredTickets.filter(t => t.priority === 'None').length;
  
  // Calculate overdue tickets (SLA breached or at risk)
  const overdue = filteredTickets.filter(t => 
    t.sla && (t.sla.responseStatus === 'breached' || t.sla.resolutionStatus === 'breached')
  ).length;
  
  // Calculate average response time (only for responded tickets)
  const respondedTickets = filteredTickets.filter(t => t.firstResponseAt);
  const totalResponseTime = respondedTickets.reduce((sum, ticket) => {
    if (ticket.firstResponseAt) {
      return sum + (ticket.firstResponseAt - ticket.createdAt);
    }
    return sum;
  }, 0);
  const averageResponseTime = respondedTickets.length > 0 
    ? totalResponseTime / (respondedTickets.length * 1000 * 60 * 60) // convert to hours
    : 0;
  
  // Calculate average resolution time (only for resolved tickets)
  const resolvedTickets = filteredTickets.filter(t => t.resolvedAt);
  const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
    if (ticket.resolvedAt) {
      return sum + (ticket.resolvedAt - ticket.createdAt);
    }
    return sum;
  }, 0);
  const averageResolutionTime = resolvedTickets.length > 0 
    ? totalResolutionTime / (resolvedTickets.length * 1000 * 60 * 60) // convert to hours
    : 0;
  
  // Calculate SLA compliance rate
  const ticketsWithSLA = filteredTickets.filter(t => t.sla);
  const compliantTickets = ticketsWithSLA.filter(t => 
    t.sla && t.sla.responseStatus === 'met' && t.sla.resolutionStatus === 'met'
  ).length;
  const slaComplianceRate = ticketsWithSLA.length > 0 
    ? (compliantTickets / ticketsWithSLA.length) * 100 
    : 100;

  return {
    total,
    open,
    resolved,
    closed,
    waiting,
    paused,
    urgent,
    high,
    medium,
    low,
    none,
    overdue,
    averageResponseTime,
    averageResolutionTime,
    slaComplianceRate
  };
};

/**
 * Calculate SLA-specific metrics
 */
export const calculateSLAMetrics = (tickets: Ticket[], dateRange?: DateRange): SLAMetrics => {
  let filteredTickets = tickets;
  
  if (dateRange) {
    filteredTickets = tickets.filter(ticket => {
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= dateRange.start && createdDate <= dateRange.end;
    });
  }

  const ticketsWithSLA = filteredTickets.filter(t => t.sla);
  
  if (ticketsWithSLA.length === 0) {
    return {
      responseCompliance: 100,
      resolutionCompliance: 100,
      totalBreached: 0,
      atRisk: 0,
      onTime: 0,
      averageResponseTime: 0,
      averageResolutionTime: 0
    };
  }

  // Response compliance
  const responseCompliant = ticketsWithSLA.filter(t => 
    t.sla?.responseStatus === 'met' || t.sla?.responseStatus === 'pending'
  ).length;
  const responseCompliance = (responseCompliant / ticketsWithSLA.length) * 100;

  // Resolution compliance
  const resolutionCompliant = ticketsWithSLA.filter(t => 
    t.sla?.resolutionStatus === 'met' || t.sla?.resolutionStatus === 'pending'
  ).length;
  const resolutionCompliance = (resolutionCompliant / ticketsWithSLA.length) * 100;

  // Status counts
  const totalBreached = ticketsWithSLA.filter(t => 
    t.sla?.responseStatus === 'breached' || t.sla?.resolutionStatus === 'breached'
  ).length;
  
  const atRisk = ticketsWithSLA.filter(t => 
    t.sla?.responseStatus === 'at_risk' || t.sla?.resolutionStatus === 'at_risk'
  ).length;
  
  const onTime = ticketsWithSLA.filter(t => 
    t.sla?.responseStatus === 'met' && t.sla?.resolutionStatus === 'met'
  ).length;

  // Average times
  const totalResponseTime = ticketsWithSLA.reduce((sum, ticket) => {
    return sum + (ticket.sla?.responseTime || 0);
  }, 0);
  const averageResponseTime = totalResponseTime / ticketsWithSLA.length;

  const totalResolutionTime = ticketsWithSLA.reduce((sum, ticket) => {
    return sum + (ticket.sla?.resolutionTime || 0);
  }, 0);
  const averageResolutionTime = totalResolutionTime / ticketsWithSLA.length;

  return {
    responseCompliance,
    resolutionCompliance,
    totalBreached,
    atRisk,
    onTime,
    averageResponseTime,
    averageResolutionTime
  };
};

/**
 * Calculate tech performance metrics
 */
export const calculateTechPerformance = (tickets: Ticket[], users: any[], dateRange?: DateRange): TechPerformance[] => {
  let filteredTickets = tickets;
  
  if (dateRange) {
    filteredTickets = tickets.filter(ticket => {
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= dateRange.start && createdDate <= dateRange.end;
    });
  }

  const techUsers = users.filter(user => user.role === 'tech' || user.role === 'admin');
  
  return techUsers.map(tech => {
    const assignedTickets = filteredTickets.filter(t => t.assigneeId === tech.uid);
    const resolvedTickets = assignedTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    
    // Calculate average response time for this tech
    const respondedTickets = assignedTickets.filter(t => t.firstResponseAt);
    const totalResponseTime = respondedTickets.reduce((sum, ticket) => {
      if (ticket.firstResponseAt) {
        return sum + (ticket.firstResponseAt - ticket.createdAt);
      }
      return sum;
    }, 0);
    const averageResponseTime = respondedTickets.length > 0 
      ? totalResponseTime / (respondedTickets.length * 1000 * 60 * 60)
      : 0;

    // Calculate average resolution time for this tech
    const techResolvedTickets = assignedTickets.filter(t => t.resolvedAt);
    const totalResolutionTime = techResolvedTickets.reduce((sum, ticket) => {
      if (ticket.resolvedAt) {
        return sum + (ticket.resolvedAt - ticket.createdAt);
      }
      return sum;
    }, 0);
    const averageResolutionTime = techResolvedTickets.length > 0 
      ? totalResolutionTime / (techResolvedTickets.length * 1000 * 60 * 60)
      : 0;

    // Calculate SLA compliance for this tech
    const techTicketsWithSLA = assignedTickets.filter(t => t.sla);
    const compliantTickets = techTicketsWithSLA.filter(t => 
      t.sla && t.sla.responseStatus === 'met' && t.sla.resolutionStatus === 'met'
    ).length;
    const slaCompliance = techTicketsWithSLA.length > 0 
      ? (compliantTickets / techTicketsWithSLA.length) * 100 
      : 100;

    // Determine workload
    const openTickets = assignedTickets.filter(t => 
      t.status === 'Open' || t.status === 'Waiting' || t.status === 'On Hold'
    ).length;
    
    let workload: 'low' | 'medium' | 'high' | 'overloaded';
    if (openTickets <= 3) workload = 'low';
    else if (openTickets <= 8) workload = 'medium';
    else if (openTickets <= 15) workload = 'high';
    else workload = 'overloaded';

    return {
      techId: tech.uid,
      techName: tech.displayName || tech.email,
      techEmail: tech.email,
      assignedTickets: assignedTickets.length,
      resolvedTickets: resolvedTickets.length,
      averageResponseTime,
      averageResolutionTime,
      slaCompliance,
      workload
    };
  });
};

/**
 * Generate daily trends data
 */
export const calculateDailyTrends = (tickets: Ticket[], days: number = 30) => {
  const trends = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayTickets = tickets.filter(ticket => {
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= date && createdDate < nextDate;
    });
    
    const resolvedToday = tickets.filter(ticket => {
      const resolvedDate = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
      return resolvedDate && resolvedDate >= date && resolvedDate < nextDate;
    });
    
    const slaBreachedToday = dayTickets.filter(ticket => 
      ticket.sla && (ticket.sla.responseStatus === 'breached' || ticket.sla.resolutionStatus === 'breached')
    );
    
    trends.push({
      date: date.toISOString().split('T')[0],
      created: dayTickets.length,
      resolved: resolvedToday.length,
      slaBreached: slaBreachedToday.length
    });
  }
  
  return trends;
};

/**
 * Get recent activity for dashboard
 */
export const getRecentActivity = (tickets: Ticket[], users: any[], limit: number = 10) => {
  const activities: any[] = [];
  
  // Recent ticket creations
  const recentTickets = [...tickets]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit / 2);
    
  recentTickets.forEach(ticket => {
    activities.push({
      ticketId: ticket.id,
      title: ticket.title,
      action: 'created',
      timestamp: ticket.createdAt
    });
  });
  
  // Recent resolutions
  const recentResolutions = tickets
    .filter(ticket => ticket.resolvedAt)
    .sort((a, b) => (b.resolvedAt || 0) - (a.resolvedAt || 0))
    .slice(0, limit / 2);
    
  recentResolutions.forEach(ticket => {
    const tech = users.find(user => user.uid === ticket.assigneeId);
    activities.push({
      ticketId: ticket.id,
      title: ticket.title,
      action: 'resolved',
      timestamp: ticket.resolvedAt || ticket.updatedAt,
      techName: tech?.displayName || tech?.email || 'Unknown'
    });
  });
  
  return activities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

/**
 * Format duration for display
 */
export const formatDuration = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  } else if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  } else {
    const days = Math.floor(hours / 24);
    const h = Math.floor(hours % 24);
    return h > 0 ? `${days}d ${h}h` : `${days}d`;
  }
};

/**
 * Get workload color for tech performance
 */
export const getWorkloadColor = (workload: string): string => {
  switch (workload) {
    case 'low': return 'success';
    case 'medium': return 'info';
    case 'high': return 'warning';
    case 'overloaded': return 'error';
    default: return 'default';
  }
};