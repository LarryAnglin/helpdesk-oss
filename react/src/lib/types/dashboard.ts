/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export interface TicketMetrics {
  total: number;
  open: number;
  resolved: number;
  closed: number;
  waiting: number;
  paused: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  none: number;
  overdue: number;
  averageResponseTime: number; // in hours
  averageResolutionTime: number; // in hours
  slaComplianceRate: number; // percentage
}

export interface SLAMetrics {
  responseCompliance: number; // percentage
  resolutionCompliance: number; // percentage
  totalBreached: number;
  atRisk: number;
  onTime: number;
  averageResponseTime: number;
  averageResolutionTime: number;
}

export interface TechPerformance {
  techId: string;
  techName: string;
  techEmail: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  slaCompliance: number;
  workload: 'low' | 'medium' | 'high' | 'overloaded';
}

export interface DashboardData {
  overview: {
    totalTickets: number;
    openTickets: number;
    resolvedToday: number;
    averageResolutionTime: number;
    slaCompliance: number;
  };
  ticketMetrics: TicketMetrics;
  slaMetrics: SLAMetrics;
  techPerformance: TechPerformance[];
  recentActivity: {
    ticketId: string;
    title: string;
    action: string;
    timestamp: number;
    techName?: string;
  }[];
  trends: {
    daily: {
      date: string;
      created: number;
      resolved: number;
      slaBreached: number;
    }[];
    weekly: {
      week: string;
      created: number;
      resolved: number;
      slaCompliance: number;
    }[];
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export const DEFAULT_DATE_RANGES = {
  today: () => ({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date(new Date().setHours(23, 59, 59, 999))
  }),
  yesterday: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      start: new Date(yesterday.setHours(0, 0, 0, 0)),
      end: new Date(yesterday.setHours(23, 59, 59, 999))
    };
  },
  thisWeek: () => {
    const now = new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay()));
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },
  thisMonth: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  },
  last30Days: () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
};