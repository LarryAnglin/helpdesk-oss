/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket, TicketPriority } from '../types/ticket';
import { EscalationRule, TechAvailability } from '../types/automation';

/**
 * Check if a ticket matches escalation rule conditions
 */
export const matchesEscalationConditions = (
  ticket: Ticket, 
  rule: EscalationRule,
  currentTime: number = Date.now()
): boolean => {
  const { conditions } = rule;
  
  // Check priorities
  if (conditions.priorities && conditions.priorities.length > 0) {
    if (!conditions.priorities.includes(ticket.priority)) {
      return false;
    }
  }
  
  // Check statuses
  if (conditions.statuses && conditions.statuses.length > 0) {
    if (!conditions.statuses.includes(ticket.status)) {
      return false;
    }
  }
  
  // Check time since created
  if (conditions.timeSinceCreated) {
    const hoursSinceCreated = (currentTime - ticket.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreated < conditions.timeSinceCreated) {
      return false;
    }
  }
  
  // Check time since last response
  if (conditions.timeSinceResponse) {
    const lastResponseTime = ticket.firstResponseAt || ticket.createdAt;
    const hoursSinceResponse = (currentTime - lastResponseTime) / (1000 * 60 * 60);
    if (hoursSinceResponse < conditions.timeSinceResponse) {
      return false;
    }
  }
  
  // Check SLA breach status
  if (conditions.slaBreached) {
    if (!ticket.sla || 
        (ticket.sla.responseStatus !== 'breached' && ticket.sla.resolutionStatus !== 'breached')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Find techs for escalation based on role hierarchy
 */
export const findEscalationTargets = (
  escalationType: 'manager' | 'senior' | 'specific',
  allTechs: TechAvailability[],
  specificTechIds?: string[],
  currentAssigneeId?: string
): TechAvailability[] => {
  let targets: TechAvailability[] = [];
  
  switch (escalationType) {
    case 'manager':
      targets = allTechs.filter(tech => 
        tech.role === 'manager' && 
        tech.isActive &&
        tech.techId !== currentAssigneeId
      );
      break;
      
    case 'senior':
      targets = allTechs.filter(tech => 
        (tech.role === 'senior' || tech.role === 'manager') && 
        tech.isActive &&
        tech.techId !== currentAssigneeId
      );
      break;
      
    case 'specific':
      if (specificTechIds && specificTechIds.length > 0) {
        targets = allTechs.filter(tech => 
          specificTechIds.includes(tech.techId) && 
          tech.isActive &&
          tech.techId !== currentAssigneeId
        );
      }
      break;
  }
  
  // Sort by workload (least loaded first)
  return targets.sort((a, b) => a.currentTickets - b.currentTickets);
};

/**
 * Calculate escalation urgency score
 */
export const calculateEscalationUrgency = (
  ticket: Ticket,
  currentTime: number = Date.now()
): number => {
  let urgencyScore = 0;
  
  // Base score from priority
  const priorityWeights = {
    'Urgent': 40,
    'High': 30,
    'Medium': 20,
    'Low': 10,
    'None': 0
  };
  urgencyScore += priorityWeights[ticket.priority] || 0;
  
  // Add score based on age
  const hoursOld = (currentTime - ticket.createdAt) / (1000 * 60 * 60);
  if (hoursOld > 72) urgencyScore += 30;
  else if (hoursOld > 48) urgencyScore += 20;
  else if (hoursOld > 24) urgencyScore += 10;
  
  // Add score for SLA breach
  if (ticket.sla) {
    if (ticket.sla.responseStatus === 'breached') urgencyScore += 25;
    if (ticket.sla.resolutionStatus === 'breached') urgencyScore += 35;
    if (ticket.sla.responseStatus === 'at_risk') urgencyScore += 15;
    if (ticket.sla.resolutionStatus === 'at_risk') urgencyScore += 15;
  }
  
  // Add score if no response yet
  if (!ticket.firstResponseAt) {
    urgencyScore += 20;
  }
  
  return urgencyScore;
};

/**
 * Get escalation reason text
 */
export const getEscalationReason = (
  ticket: Ticket,
  rule: EscalationRule,
  currentTime: number = Date.now()
): string => {
  const reasons: string[] = [];
  
  if (rule.conditions.timeSinceCreated) {
    const hoursOld = (currentTime - ticket.createdAt) / (1000 * 60 * 60);
    if (hoursOld >= rule.conditions.timeSinceCreated) {
      reasons.push(`Ticket is ${Math.floor(hoursOld)} hours old`);
    }
  }
  
  if (rule.conditions.timeSinceResponse) {
    const lastResponseTime = ticket.firstResponseAt || ticket.createdAt;
    const hoursSinceResponse = (currentTime - lastResponseTime) / (1000 * 60 * 60);
    if (hoursSinceResponse >= rule.conditions.timeSinceResponse) {
      reasons.push(`No response for ${Math.floor(hoursSinceResponse)} hours`);
    }
  }
  
  if (rule.conditions.slaBreached && ticket.sla) {
    if (ticket.sla.responseStatus === 'breached') {
      reasons.push('Response SLA breached');
    }
    if (ticket.sla.resolutionStatus === 'breached') {
      reasons.push('Resolution SLA breached');
    }
  }
  
  if (ticket.priority === 'Urgent' || ticket.priority === 'High') {
    reasons.push(`${ticket.priority} priority ticket`);
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'Escalation rule triggered';
};

/**
 * Generate escalation notification message
 */
export const generateEscalationMessage = (
  ticket: Ticket,
  rule: EscalationRule,
  escalationReason: string,
  newAssignee?: TechAvailability
): string => {
  const template = rule.actions.notify?.message || 
    'Ticket #{ticketId} requires escalation. Reason: {reason}';
  
  let message = template
    .replace(/\{ticketId\}/g, ticket.id)
    .replace(/\{title\}/g, ticket.title)
    .replace(/\{priority\}/g, ticket.priority)
    .replace(/\{status\}/g, ticket.status)
    .replace(/\{reason\}/g, escalationReason)
    .replace(/\{customer\}/g, ticket.name);
  
  if (newAssignee) {
    message = message.replace(/\{assignee\}/g, newAssignee.techName);
  }
  
  const hoursOld = (Date.now() - ticket.createdAt) / (1000 * 60 * 60);
  message = message.replace(/\{timeOverdue\}/g, `${Math.floor(hoursOld)} hours`);
  
  return message;
};

/**
 * Check if ticket needs escalation based on all rules
 */
export const checkForEscalation = (
  ticket: Ticket,
  escalationRules: EscalationRule[],
  currentTime: number = Date.now()
): { rule: EscalationRule; urgency: number; reason: string } | null => {
  // Skip if ticket is already resolved/closed
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return null;
  }
  
  // Sort rules by priority (higher number = higher priority)
  const sortedRules = [...escalationRules]
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    if (matchesEscalationConditions(ticket, rule, currentTime)) {
      const urgency = calculateEscalationUrgency(ticket, currentTime);
      const reason = getEscalationReason(ticket, rule, currentTime);
      
      return { rule, urgency, reason };
    }
  }
  
  return null;
};

/**
 * Get suggested priority for escalated ticket
 */
export const getSuggestedEscalationPriority = (
  currentPriority: TicketPriority,
  urgencyScore: number
): TicketPriority => {
  // High urgency score suggests bumping up priority
  if (urgencyScore >= 80) {
    return 'Urgent';
  } else if (urgencyScore >= 60) {
    return currentPriority === 'Low' ? 'High' : 'Urgent';
  } else if (urgencyScore >= 40) {
    switch (currentPriority) {
      case 'Low': return 'Medium';
      case 'Medium': return 'High';
      default: return currentPriority;
    }
  }
  
  return currentPriority;
};

/**
 * Format escalation time for display
 */
export const formatEscalationTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h ago`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  } else {
    return `${minutes}m ago`;
  }
};