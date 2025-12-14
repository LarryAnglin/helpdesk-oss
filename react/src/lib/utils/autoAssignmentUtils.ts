/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { Ticket, TicketPriority } from '../types/ticket';
import { AutoAssignmentRule, TechAvailability } from '../types/automation';

/**
 * Check if a ticket matches auto-assignment rule conditions
 */
export const matchesConditions = (ticket: Ticket, rule: AutoAssignmentRule): boolean => {
  const { conditions } = rule;
  
  // Check priorities
  if (conditions.priorities && conditions.priorities.length > 0) {
    if (!conditions.priorities.includes(ticket.priority)) {
      return false;
    }
  }
  
  // Check keywords in title or description
  if (conditions.keywords && conditions.keywords.length > 0) {
    const searchText = `${ticket.title} ${ticket.description}`.toLowerCase();
    const hasKeyword = conditions.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }
  
  // Check location
  if (conditions.location && conditions.location.length > 0) {
    if (!conditions.location.includes(ticket.location)) {
      return false;
    }
  }
  
  // Check categories (if implemented in the future)
  if (conditions.categories && conditions.categories.length > 0) {
    // This would require adding category field to tickets
    // For now, skip this check
  }
  
  return true;
};

/**
 * Get available techs based on workload and working hours
 */
export const getAvailableTechs = (
  allTechs: TechAvailability[], 
  currentTime: Date = new Date()
): TechAvailability[] => {
  return allTechs.filter(tech => {
    // Check if tech is active
    if (!tech.isActive) return false;
    
    // Check if tech is under their max ticket limit
    if (tech.currentTickets >= tech.maxTickets) return false;
    
    // Check working hours
    const currentDay = currentTime.getDay();
    if (!tech.workingHours.days.includes(currentDay)) return false;
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeDecimal = currentHour + currentMinute / 60;
    
    const [startHour, startMin] = tech.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = tech.workingHours.end.split(':').map(Number);
    const startTimeDecimal = startHour + startMin / 60;
    const endTimeDecimal = endHour + endMin / 60;
    
    if (currentTimeDecimal < startTimeDecimal || currentTimeDecimal > endTimeDecimal) {
      return false;
    }
    
    return true;
  });
};

/**
 * Apply round robin assignment strategy
 */
export const assignRoundRobin = (
  availableTechs: TechAvailability[], 
  lastAssignedTechId?: string
): TechAvailability | null => {
  if (availableTechs.length === 0) return null;
  
  if (!lastAssignedTechId) {
    return availableTechs[0];
  }
  
  const lastAssignedIndex = availableTechs.findIndex(tech => tech.techId === lastAssignedTechId);
  const nextIndex = (lastAssignedIndex + 1) % availableTechs.length;
  
  return availableTechs[nextIndex];
};

/**
 * Apply balanced assignment strategy (assign to tech with least tickets)
 */
export const assignBalanced = (availableTechs: TechAvailability[]): TechAvailability | null => {
  if (availableTechs.length === 0) return null;
  
  return availableTechs.reduce((leastLoaded, current) => 
    current.currentTickets < leastLoaded.currentTickets ? current : leastLoaded
  );
};

/**
 * Apply skill-based assignment strategy
 */
export const assignSkillBased = (
  availableTechs: TechAvailability[], 
  requiredSkills: string[]
): TechAvailability | null => {
  if (availableTechs.length === 0 || requiredSkills.length === 0) {
    return assignBalanced(availableTechs);
  }
  
  // Filter techs who have at least one of the required skills
  const skilledTechs = availableTechs.filter(tech => 
    requiredSkills.some(skill => tech.skills.includes(skill))
  );
  
  if (skilledTechs.length === 0) {
    // Fall back to balanced assignment if no skilled techs available
    return assignBalanced(availableTechs);
  }
  
  // Among skilled techs, choose the one with least tickets
  return assignBalanced(skilledTechs);
};

/**
 * Apply specific assignment strategy
 */
export const assignSpecific = (
  availableTechs: TechAvailability[], 
  specificTechIds: string[]
): TechAvailability | null => {
  if (availableTechs.length === 0 || specificTechIds.length === 0) return null;
  
  // Filter to only the specified techs who are available
  const specificTechs = availableTechs.filter(tech => 
    specificTechIds.includes(tech.techId)
  );
  
  if (specificTechs.length === 0) return null;
  
  // Use balanced assignment among the specific techs
  return assignBalanced(specificTechs);
};

/**
 * Find the best tech to assign a ticket to based on rules
 */
export const findBestAssignee = (
  ticket: Ticket,
  rules: AutoAssignmentRule[],
  availableTechs: TechAvailability[],
  lastAssignedTechId?: string
): TechAvailability | null => {
  // Sort rules by priority (higher number = higher priority)
  const sortedRules = [...rules]
    .filter(rule => rule.enabled)
    .sort((a, b) => b.priority - a.priority);
  
  // Try each rule in priority order
  for (const rule of sortedRules) {
    if (matchesConditions(ticket, rule)) {
      let candidateTechs = availableTechs;
      
      // If rule specifies specific techs, filter to those
      if (rule.assignment.techIds && rule.assignment.techIds.length > 0) {
        candidateTechs = availableTechs.filter(tech => 
          rule.assignment.techIds!.includes(tech.techId)
        );
      }
      
      let assignedTech: TechAvailability | null = null;
      
      // Apply assignment strategy
      switch (rule.assignment.type) {
        case 'roundRobin':
          assignedTech = assignRoundRobin(candidateTechs, lastAssignedTechId);
          break;
        case 'balanced':
          assignedTech = assignBalanced(candidateTechs);
          break;
        case 'specific':
          assignedTech = assignSpecific(candidateTechs, rule.assignment.techIds || []);
          break;
        case 'skillBased':
          assignedTech = assignSkillBased(candidateTechs, rule.assignment.skillTags || []);
          break;
      }
      
      if (assignedTech) {
        return assignedTech;
      }
    }
  }
  
  return null;
};

/**
 * Calculate tech workload level
 */
export const calculateWorkload = (currentTickets: number, maxTickets: number): 'low' | 'medium' | 'high' | 'overloaded' => {
  const percentage = (currentTickets / maxTickets) * 100;
  
  if (percentage >= 100) return 'overloaded';
  if (percentage >= 75) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
};

/**
 * Update tech availability after assignment
 */
export const updateTechAfterAssignment = (tech: TechAvailability): TechAvailability => {
  return {
    ...tech,
    currentTickets: tech.currentTickets + 1,
    lastAssigned: Date.now()
  };
};

/**
 * Get priority weight for assignment preferences
 */
export const getPriorityWeight = (priority: TicketPriority): number => {
  switch (priority) {
    case 'Urgent': return 4;
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 1;
  }
};