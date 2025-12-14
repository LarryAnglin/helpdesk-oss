/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { 
  Ticket, 
  TicketRelationship, 
  TicketRelationshipType, 
  SplitTicketHistory, 
  MergeTicketHistory
} from '../types/ticket';
import { getTicket, addReply } from './ticketService';
import { v4 as uuidv4 } from 'uuid';

const RELATIONSHIPS_COLLECTION = 'ticketRelationships';
const SPLIT_HISTORY_COLLECTION = 'ticketSplitHistory';
const MERGE_HISTORY_COLLECTION = 'ticketMergeHistory';

/**
 * Validate ticket relationship creation
 */
const validateRelationshipCreation = async (
  sourceTicketId: string,
  targetTicketId: string,
  relationshipType: TicketRelationshipType
): Promise<void> => {
  // Check if tickets exist
  const sourceTicket = await getTicket(sourceTicketId);
  const targetTicket = await getTicket(targetTicketId);
  
  if (!sourceTicket) {
    throw new Error(`Source ticket ${sourceTicketId} not found`);
  }
  
  if (!targetTicket) {
    throw new Error(`Target ticket ${targetTicketId} not found`);
  }
  
  // Prevent self-referencing relationships
  if (sourceTicketId === targetTicketId) {
    throw new Error('Cannot create a relationship between a ticket and itself');
  }
  
  // Check for circular relationships in parent-child chains
  if (relationshipType === 'parent_of' && targetTicket.parentTicketId === sourceTicketId) {
    throw new Error('Circular parent-child relationship detected');
  }
  
  if (relationshipType === 'child_of' && sourceTicket.parentTicketId === targetTicketId) {
    throw new Error('Circular parent-child relationship detected');
  }
  
  // Validate business rules
  if (relationshipType === 'merged_into' && targetTicket.status === 'Closed') {
    throw new Error('Cannot merge into a closed ticket');
  }
  
  if (relationshipType === 'duplicate_of' && sourceTicket.status !== 'Closed') {
    throw new Error('Only closed tickets can be marked as duplicates');
  }
};

/**
 * Create a relationship between two tickets
 */
export const createTicketRelationship = async (
  sourceTicketId: string,
  targetTicketId: string,
  relationshipType: TicketRelationshipType,
  userId: string,
  userName: string,
  description?: string
): Promise<string> => {
  try {
    // Validate the relationship
    await validateRelationshipCreation(sourceTicketId, targetTicketId, relationshipType);
    
    // Get tenant ID from source ticket
    const sourceTicket = await getTicket(sourceTicketId);
    if (!sourceTicket) {
      throw new Error('Source ticket not found');
    }
    
    const relationship: Omit<TicketRelationship, 'id'> = {
      tenantId: sourceTicket.tenantId,
      sourceTicketId,
      targetTicketId,
      relationshipType,
      createdBy: userId,
      createdByName: userName,
      createdAt: Date.now(),
      ...(description ? { description } : {})
    };

    const docRef = await addDoc(collection(db, RELATIONSHIPS_COLLECTION), relationship);
    
    // Create inverse relationship for bidirectional types
    const inverseType = getInverseRelationshipType(relationshipType);
    if (inverseType) {
      const inverseRelationship: Omit<TicketRelationship, 'id'> = {
        tenantId: sourceTicket.tenantId,
        sourceTicketId: targetTicketId,
        targetTicketId: sourceTicketId,
        relationshipType: inverseType,
        createdBy: userId,
        createdByName: userName,
        createdAt: Date.now(),
        ...(description ? { description } : {})
      };
      await addDoc(collection(db, RELATIONSHIPS_COLLECTION), inverseRelationship);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating ticket relationship:', error);
    throw error;
  }
};

/**
 * Get all relationships for a ticket
 */
export const getTicketRelationships = async (ticketId: string): Promise<TicketRelationship[]> => {
  try {
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('sourceTicketId', '==', ticketId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TicketRelationship));
  } catch (error) {
    console.error('Error fetching ticket relationships:', error);
    throw error;
  }
};

/**
 * Validate ticket split operation
 */
const validateTicketSplit = async (
  originalTicketId: string,
  splitData: {
    reason: string;
    newTickets: {
      title: string;
      description: string;
      assigneeId?: string;
      priority: string;
    }[];
  }
): Promise<void> => {
  const originalTicket = await getTicket(originalTicketId);
  
  if (!originalTicket) {
    throw new Error('Original ticket not found');
  }
  
  // Cannot split closed tickets
  if (originalTicket.status === 'Closed') {
    throw new Error('Cannot split a closed ticket');
  }
  
  // Cannot split tickets that are already children
  if (originalTicket.parentTicketId) {
    throw new Error('Cannot split a ticket that is already a child ticket');
  }
  
  // Validate split data
  if (!splitData.reason.trim()) {
    throw new Error('Split reason is required');
  }
  
  if (splitData.newTickets.length < 2) {
    throw new Error('At least 2 new tickets are required for a split');
  }
  
  if (splitData.newTickets.length > 10) {
    throw new Error('Cannot split into more than 10 tickets');
  }
  
  // Validate each new ticket
  for (const [index, newTicket] of splitData.newTickets.entries()) {
    if (!newTicket.title.trim()) {
      throw new Error(`New ticket ${index + 1} must have a title`);
    }
    
    if (!newTicket.description.trim()) {
      throw new Error(`New ticket ${index + 1} must have a description`);
    }
    
    if (newTicket.title.length > 200) {
      throw new Error(`New ticket ${index + 1} title is too long (max 200 characters)`);
    }
    
    if (newTicket.description.length > 5000) {
      throw new Error(`New ticket ${index + 1} description is too long (max 5000 characters)`);
    }
  }
};

/**
 * Split a ticket into multiple tickets
 */
export const splitTicket = async (
  originalTicketId: string,
  splitData: {
    reason: string;
    newTickets: {
      title: string;
      description: string;
      assigneeId?: string;
      priority: string;
    }[];
  },
  userId: string,
  userName: string
): Promise<{ newTicketIds: string[]; splitHistoryId: string }> => {
  try {
    // Validate the split operation
    await validateTicketSplit(originalTicketId, splitData);
    const batch = writeBatch(db);
    const originalTicket = await getTicket(originalTicketId);
    
    if (!originalTicket) {
      throw new Error('Original ticket not found');
    }

    const newTicketIds: string[] = [];
    const fieldsDistribution: SplitTicketHistory['fieldsDistribution'] = {};

    // Create new tickets
    for (const newTicketData of splitData.newTickets) {
      const newTicketId = uuidv4();
      const newTicket: Omit<Ticket, 'id'> = {
        ...originalTicket,
        tenantId: originalTicket.tenantId, // Inherit tenant from parent
        title: newTicketData.title,
        description: newTicketData.description,
        assigneeId: newTicketData.assigneeId || originalTicket.assigneeId,
        priority: newTicketData.priority as any,
        parentTicketId: originalTicketId,
        replies: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        statusHistory: [],
        relationships: [],
        splitHistory: [],
        mergeHistory: []
      };

      // Create the new ticket document
      const newTicketRef = doc(db, 'tickets', newTicketId);
      batch.set(newTicketRef, newTicket);
      
      newTicketIds.push(newTicketId);
      fieldsDistribution[newTicketId] = {
        title: newTicketData.title,
        description: newTicketData.description,
        assigneeId: newTicketData.assigneeId,
        priority: newTicketData.priority as any
      };

      // Create parent-child relationships
      await createTicketRelationship(
        originalTicketId,
        newTicketId,
        'parent_of',
        userId,
        userName,
        'Created from ticket split'
      );
    }

    // Update original ticket to reference child tickets
    const originalTicketRef = doc(db, 'tickets', originalTicketId);
    batch.update(originalTicketRef, {
      childTicketIds: newTicketIds,
      updatedAt: Date.now()
    });

    // Create split history record
    const splitHistory: Omit<SplitTicketHistory, 'id'> = {
      tenantId: originalTicket.tenantId,
      originalTicketId,
      newTicketIds,
      reason: splitData.reason,
      splitBy: userId,
      splitByName: userName,
      splitAt: Date.now(),
      fieldsDistribution
    };

    const splitHistoryRef = doc(collection(db, SPLIT_HISTORY_COLLECTION));
    batch.set(splitHistoryRef, splitHistory);

    await batch.commit();

    // Add private reply to original ticket documenting the split
    await addReply(originalTicketId, {
      message: `Ticket split into ${newTicketIds.length} child tickets:\n\n${splitData.newTickets.map((t, i) => `- ${t.title} (ID: ${newTicketIds[i]})`).join('\n')}\n\nReason: ${splitData.reason}`,
      isPrivate: true
    });

    return {
      newTicketIds,
      splitHistoryId: splitHistoryRef.id
    };
  } catch (error) {
    console.error('Error splitting ticket:', error);
    throw error;
  }
};

/**
 * Validate ticket merge operation
 */
const validateTicketMerge = async (
  primaryTicketId: string,
  ticketsToMerge: string[],
  reason: string
): Promise<void> => {
  const primaryTicket = await getTicket(primaryTicketId);
  
  if (!primaryTicket) {
    throw new Error('Primary ticket not found');
  }
  
  // Cannot merge into closed tickets
  if (primaryTicket.status === 'Closed') {
    throw new Error('Cannot merge into a closed ticket');
  }
  
  // Validate merge data
  if (!reason.trim()) {
    throw new Error('Merge reason is required');
  }
  
  if (ticketsToMerge.length === 0) {
    throw new Error('At least one ticket must be selected for merging');
  }
  
  if (ticketsToMerge.length > 20) {
    throw new Error('Cannot merge more than 20 tickets at once');
  }
  
  // Check if primary ticket is in the merge list
  if (ticketsToMerge.includes(primaryTicketId)) {
    throw new Error('Cannot merge a ticket into itself');
  }
  
  // Validate each ticket to be merged
  for (const ticketId of ticketsToMerge) {
    const ticket = await getTicket(ticketId);
    
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }
    
    // Cannot merge already closed tickets
    if (ticket.status === 'Closed') {
      throw new Error(`Cannot merge closed ticket ${ticketId}`);
    }
    
    // Cannot merge parent tickets that have children
    if (ticket.childTicketIds && ticket.childTicketIds.length > 0) {
      throw new Error(`Cannot merge ticket ${ticketId} because it has child tickets`);
    }
  }
  
  // Check for duplicate ticket IDs
  const uniqueTickets = [...new Set(ticketsToMerge)];
  if (uniqueTickets.length !== ticketsToMerge.length) {
    throw new Error('Duplicate tickets detected in merge list');
  }
};

/**
 * Merge multiple tickets into one primary ticket
 */
export const mergeTickets = async (
  primaryTicketId: string,
  ticketsToMerge: string[],
  reason: string,
  userId: string,
  userName: string
): Promise<string> => {
  try {
    // Validate the merge operation
    await validateTicketMerge(primaryTicketId, ticketsToMerge, reason);
    const batch = writeBatch(db);
    const primaryTicket = await getTicket(primaryTicketId);
    
    if (!primaryTicket) {
      throw new Error('Primary ticket not found');
    }

    const mergedData = {
      replies: [...primaryTicket.replies],
      timeEntries: [],
      attachments: [...primaryTicket.attachments]
    };

    // Collect data from tickets to be merged
    for (const ticketId of ticketsToMerge) {
      const ticket = await getTicket(ticketId);
      if (ticket) {
        // Add replies with source ticket reference
        ticket.replies.forEach(reply => {
          mergedData.replies.push({
            ...reply,
            message: `[Merged from ticket ${ticketId}]\n\n${reply.message}`
          });
        });

        // Add attachments
        mergedData.attachments.push(...ticket.attachments);

        // Mark ticket as merged (set status to closed and add merge reference)
        const ticketRef = doc(db, 'tickets', ticketId);
        batch.update(ticketRef, {
          status: 'Closed',
          updatedAt: Date.now(),
          resolvedAt: Date.now()
        });

        // Create merge relationship
        await createTicketRelationship(
          ticketId,
          primaryTicketId,
          'merged_into',
          userId,
          userName,
          `Merged due to: ${reason}`
        );
      }
    }

    // Update primary ticket with merged data
    const primaryTicketRef = doc(db, 'tickets', primaryTicketId);
    batch.update(primaryTicketRef, {
      replies: mergedData.replies,
      attachments: mergedData.attachments,
      updatedAt: Date.now()
    });

    // Create merge history record
    const mergeHistory: Omit<MergeTicketHistory, 'id'> = {
      tenantId: primaryTicket.tenantId,
      primaryTicketId,
      mergedTicketIds: ticketsToMerge,
      reason,
      mergedBy: userId,
      mergedByName: userName,
      mergedAt: Date.now(),
      preservedData: mergedData
    };

    const mergeHistoryRef = doc(collection(db, MERGE_HISTORY_COLLECTION));
    batch.set(mergeHistoryRef, mergeHistory);

    await batch.commit();

    // Add private reply to primary ticket documenting the merge
    await addReply(primaryTicketId, {
      message: `Merged ${ticketsToMerge.length} tickets into this ticket:\n\n${ticketsToMerge.map(id => `- Ticket ${id}`).join('\n')}\n\nReason: ${reason}`,
      isPrivate: true
    });

    return mergeHistoryRef.id;
  } catch (error) {
    console.error('Error merging tickets:', error);
    throw error;
  }
};

/**
 * Get related tickets (parent, children, and other relationships)
 */
export const getRelatedTickets = async (ticketId: string): Promise<{
  parent?: Ticket;
  children: Ticket[];
  related: { ticket: Ticket; relationship: TicketRelationship }[];
}> => {
  try {
    const relationships = await getTicketRelationships(ticketId);
    const ticket = await getTicket(ticketId);
    
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const result = {
      parent: undefined as Ticket | undefined,
      children: [] as Ticket[],
      related: [] as { ticket: Ticket; relationship: TicketRelationship }[]
    };

    // Get parent ticket
    if (ticket.parentTicketId) {
      const parentTicket = await getTicket(ticket.parentTicketId);
      if (parentTicket) {
        result.parent = parentTicket;
      }
    }

    // Get child tickets
    if (ticket.childTicketIds && ticket.childTicketIds.length > 0) {
      for (const childId of ticket.childTicketIds) {
        const childTicket = await getTicket(childId);
        if (childTicket) {
          result.children.push(childTicket);
        }
      }
    }

    // Get other related tickets
    for (const relationship of relationships) {
      if (relationship.relationshipType !== 'parent_of' && relationship.relationshipType !== 'child_of') {
        const relatedTicket = await getTicket(relationship.targetTicketId);
        if (relatedTicket) {
          result.related.push({
            ticket: relatedTicket,
            relationship
          });
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching related tickets:', error);
    throw error;
  }
};

/**
 * Validate relationship removal
 */
const validateRelationshipRemoval = async (relationshipId: string): Promise<void> => {
  const relationshipDoc = await getDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId));
  
  if (!relationshipDoc.exists()) {
    throw new Error('Relationship not found');
  }
  
  const relationship = relationshipDoc.data() as TicketRelationship;
  
  // Prevent removal of system-created relationships from splits/merges
  if (relationship.relationshipType === 'parent_of' || 
      relationship.relationshipType === 'child_of' ||
      relationship.relationshipType === 'merged_into' ||
      relationship.relationshipType === 'split_from') {
    
    // Only allow removal if created manually (has description mentioning manual creation)
    if (!relationship.description?.includes('manual') && 
        !relationship.description?.includes('user')) {
      throw new Error('Cannot remove system-generated relationships from split/merge operations');
    }
  }
};

/**
 * Remove a relationship between tickets
 */
export const removeTicketRelationship = async (relationshipId: string): Promise<void> => {
  try {
    // Validate the removal
    await validateRelationshipRemoval(relationshipId);
    
    await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId));
  } catch (error) {
    console.error('Error removing ticket relationship:', error);
    throw error;
  }
};

/**
 * Helper function to get inverse relationship type
 */
const getInverseRelationshipType = (type: TicketRelationshipType): TicketRelationshipType | null => {
  const inverseMap: Record<string, TicketRelationshipType> = {
    'parent_of': 'child_of',
    'child_of': 'parent_of',
    'blocks': 'blocked_by',
    'blocked_by': 'blocks',
    'related_to': 'related_to'
  };
  
  return inverseMap[type] || null;
};

/**
 * Get split history for a ticket
 */
export const getSplitHistory = async (ticketId: string): Promise<SplitTicketHistory[]> => {
  try {
    const q = query(
      collection(db, SPLIT_HISTORY_COLLECTION),
      where('originalTicketId', '==', ticketId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SplitTicketHistory));
  } catch (error) {
    console.error('Error fetching split history:', error);
    throw error;
  }
};

/**
 * Get merge history for a ticket
 */
export const getMergeHistory = async (ticketId: string): Promise<MergeTicketHistory[]> => {
  try {
    const q = query(
      collection(db, MERGE_HISTORY_COLLECTION),
      where('primaryTicketId', '==', ticketId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MergeTicketHistory));
  } catch (error) {
    console.error('Error fetching merge history:', error);
    throw error;
  }
};