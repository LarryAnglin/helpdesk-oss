/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebaseConfig';
import { Ticket, TicketAttachment, TicketFormData, TicketReply } from '../types/ticket';
import { v4 as uuidv4 } from 'uuid';
import { ticketsIndex, isAlgoliaConfigured } from '../algolia/algoliaConfig';
import { sendTicketCreatedNotification, sendTicketUpdateNotification, sendTicketReplyNotification } from '../email/emailService';
import { calculateSLAStatus } from '../utils/slaUtils';
import { getAppConfig } from './configService';
import { findBestAssignee } from '../utils/autoAssignmentUtils';
import { hasRole } from '../utils/roleUtils';
import { TechAvailability } from '../types/automation';

// Collection reference
const TICKETS_COLLECTION = 'tickets';

// Helper function to get current user's tenant ID
const getCurrentUserTenantId = async (_userId: string): Promise<string | null> => {
  try {
    // Try to get from user's custom claims first
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idTokenResult = await currentUser.getIdTokenResult();
      if (idTokenResult.claims.tenantId) {
        return idTokenResult.claims.tenantId as string;
      }
    }

    // No tenant ID found - user needs to be assigned to a tenant
    console.warn('No tenant ID found for user. User must be assigned to a tenant.');
    return null;
  } catch (error) {
    console.error('Error getting user tenant ID:', error);
    return null;
  }
};


// Upload a file to Firebase Storage
export const uploadFile = async (file: File, ticketId: string): Promise<TicketAttachment> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `tickets/${ticketId}/${fileName}`;
  
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  
  const downloadURL = await getDownloadURL(storageRef);
  
  return {
    id: uuidv4(),
    filename: file.name,
    fileUrl: downloadURL,
    contentType: file.type,
    size: file.size,
    uploadedAt: Date.now()
  };
};

// Create a new ticket
export const createTicket = async (ticketData: TicketFormData, tenantId?: string): Promise<Ticket> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Get tenant ID - either passed in or from current user context
    const ticketTenantId = tenantId || await getCurrentUserTenantId(currentUser.uid);
    if (!ticketTenantId) {
      throw new Error('No tenant found. Please ensure the system is properly configured or contact your administrator.');
    }

    // Generate a temporary ID for file uploads
    const tempTicketId = uuidv4();
    
    // Upload attachments if any
    const attachments: TicketAttachment[] = [];
    if (ticketData.files && ticketData.files.length > 0) {
      for (const file of ticketData.files) {
        const attachment = await uploadFile(file, tempTicketId);
        attachments.push(attachment);
      }
    }

    // Create ticket document - filter out undefined values
    const ticket: any = {
      tenantId: ticketTenantId,
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority || 'Medium',
      status: ticketData.status || 'Open',
      location: ticketData.location || 'RCL',
      isOnVpn: ticketData.isOnVpn || false,
      computer: ticketData.computer || '',
      name: ticketData.name,
      email: ticketData.email,
      phone: ticketData.phone || '',
      contactMethod: ticketData.contactMethod || 'email',
      smsUpdates: ticketData.smsUpdates || false,
      smsPhoneNumber: ticketData.smsPhoneNumber || '',
      submitterId: currentUser.uid,
      attachments,
      replies: [],
      participants: [{
        userId: currentUser.uid,
        name: ticketData.name,
        email: ticketData.email,
        role: 'submitter' as const
      }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Process CC participants
    if (ticketData.ccParticipants && ticketData.ccParticipants.length > 0) {
      for (const ccParticipant of ticketData.ccParticipants) {
        ticket.participants.push({
          userId: '', // CC participants may not be system users
          name: ccParticipant.name,
          email: ccParticipant.email,
          role: 'cc' as const
        });
      }
    } else if (ticketData.cc) {
      // Fallback to comma-separated emails if ccParticipants not provided
      const ccEmails = ticketData.cc.split(',').map(email => email.trim()).filter(email => email);
      for (const ccEmail of ccEmails) {
        ticket.participants.push({
          userId: '', // CC participants may not be system users
          name: ccEmail.split('@')[0], // Use email prefix as name
          email: ccEmail,
          role: 'cc' as const
        });
      }
    }

    // Add SMS consent fields only if SMS is enabled
    if (ticketData.smsUpdates) {
      ticket.smsConsent = 'pending';
      ticket.smsConsentDate = Date.now();
    }

    // Only add optional fields if they have values
    if (ticketData.errorMessage !== undefined && ticketData.errorMessage !== '') {
      ticket.errorMessage = ticketData.errorMessage;
    }
    if (ticketData.problemStartDate !== undefined && ticketData.problemStartDate !== '') {
      ticket.problemStartDate = ticketData.problemStartDate;
    }
    if (ticketData.isPersonHavingProblem !== undefined) {
      ticket.isPersonHavingProblem = ticketData.isPersonHavingProblem;
    }
    if (ticketData.userName !== undefined && ticketData.userName !== '') {
      ticket.userName = ticketData.userName;
    }
    if (ticketData.userPhone !== undefined && ticketData.userPhone !== '') {
      ticket.userPhone = ticketData.userPhone;
    }
    if (ticketData.userEmail !== undefined && ticketData.userEmail !== '') {
      ticket.userEmail = ticketData.userEmail;
    }
    if (ticketData.userPreferredContact !== undefined && ticketData.userPreferredContact !== '') {
      ticket.userPreferredContact = ticketData.userPreferredContact;
    }
    if (ticketData.agreeToTroubleshoot !== undefined) {
      ticket.agreeToTroubleshoot = ticketData.agreeToTroubleshoot;
    }
    if (ticketData.impact !== undefined && ticketData.impact !== '') {
      ticket.impact = ticketData.impact;
    }
    if (ticketData.stepsToReproduce !== undefined && ticketData.stepsToReproduce !== '') {
      ticket.stepsToReproduce = ticketData.stepsToReproduce;
    }
    if (ticketData.customFields !== undefined && ticketData.customFields.length > 0) {
      ticket.customFields = ticketData.customFields;
    }

    // Get user data to add organization and company assignments
    try {
      const currentUserData = await import('./userClientService').then(m => m.getUserById(currentUser.uid));
      
      // Add organization and company IDs from user data
      if (currentUserData?.organizationId) {
        ticket.organizationId = currentUserData.organizationId;
      }
      if (currentUserData?.companyId) {
        ticket.companyId = currentUserData.companyId;
      }
    } catch (error) {
      console.warn('Could not fetch user data for org/company assignment:', error);
    }

    const docRef = await addDoc(collection(db, TICKETS_COLLECTION), ticket);
    console.log("Ticket created.")
    
    // Calculate SLA status and handle auto-assignment
    let ticketWithSLA = { ...ticket };
    try {
      const config = await getAppConfig();
      
      // Calculate SLA
      if (config.slaSettings) {
        const slaStatus = calculateSLAStatus(
          ticket.createdAt,
          ticket.priority,
          undefined, // no first response yet
          undefined, // not resolved yet
          config.slaSettings
        );
        if (slaStatus) {
          // Filter out undefined values from slaStatus
          const cleanSlaStatus: any = {};
          Object.entries(slaStatus).forEach(([key, value]) => {
            if (value !== undefined) {
              cleanSlaStatus[key] = value;
            }
          });
          ticketWithSLA.sla = cleanSlaStatus;
        }
      }
      
      // Handle auto-assignment (only for admin/tech users to avoid permission errors)
      const currentUserData = await import('./userClientService').then(m => m.getUserById(currentUser.uid));
      const canPerformAutoAssignment = currentUserData && hasRole(currentUserData.role, 'tech');
      
      if (config.automationSettings?.autoAssignment.enabled && canPerformAutoAssignment) {
        try {
          console.log('Attempting auto-assignment for ticket');
          // Get all users to find available techs
          const { getAllUsers } = await import('./userClientService');
          const allUsers = await getAllUsers();
          
          // Convert users to TechAvailability format
          const availableTechs: TechAvailability[] = allUsers
            .filter(user => hasRole(user.role, 'tech'))
            .map(user => ({
              techId: user.uid,
              techName: user.displayName || user.email,
              techEmail: user.email,
              role: hasRole(user.role, 'system_admin') ? 'senior' : 'tech' as 'tech' | 'manager' | 'senior',
              isActive: true, // Assume active for now
              maxTickets: 15, // Default max tickets
              currentTickets: 0, // Would need to calculate from existing tickets
              skills: [], // Would need to be configured per user
              workingHours: {
                start: "09:00",
                end: "17:00",
                days: [1,2,3,4,5],
                timezone: "America/Chicago"
              },
              lastAssigned: 0
            }));
          
          const rules = config.automationSettings.autoAssignment.rules;
          const assignedTech = findBestAssignee(ticketWithSLA as Ticket, rules, availableTechs);
          
          if (assignedTech) {
            console.log('Auto-assigned ticket to:', assignedTech.techName);
            ticketWithSLA.assigneeId = assignedTech.techId;
          } else {
            console.log('No suitable tech found for auto-assignment');
          }
        } catch (assignmentError) {
          console.error('Error with auto-assignment:', assignmentError);
          // Continue without assignment if auto-assignment fails
        }
      } else if (config.automationSettings?.autoAssignment.enabled) {
        console.log('Auto-assignment enabled but skipped for regular user (permission restriction)');
      }
    } catch (configError) {
      console.error('Error loading config for ticket creation:', configError);
      // Continue without SLA/assignment if config loading fails
    }
    
    const newTicket = {
      id: docRef.id,
      ...ticketWithSLA
    } as Ticket;

    // Sync to Algolia if configured
    if (isAlgoliaConfigured && ticketsIndex) {
      try {
        await ticketsIndex.saveObject({
          ...newTicket,
          objectID: docRef.id
        });
      } catch (algoliaError) {
        console.error('Error syncing to Algolia:', algoliaError);
        // Don't throw the error - we still want to return the ticket even if Algolia sync fails
      }
    }
    
    // Send email notification
    try {
      await sendTicketCreatedNotification(newTicket);
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't throw the error - we still want to return the ticket even if email fails
    }
    
    return newTicket;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

// Get all tickets using secure Firebase Function
export const getTickets = async (filters?: {
  status?: string;
  priority?: string;
  assigneeId?: string;
  submitterId?: string;
  tenantId?: string;
  limit?: number;
}): Promise<Ticket[]> => {
  try {
    // Get current user to ensure authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    console.log('Current user:', currentUser.uid);
    console.log('Calling getUserTickets function with filters:', filters);
    
    // Get the auth token
    const token = await currentUser.getIdToken();
    
    // Call the HTTP function
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/getUserTicketsHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(filters || {})
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.tickets) {
      throw new Error('No tickets data returned from function');
    }
    
    console.log(`Received ${result.count} tickets for user with role: ${result.userRole}`);
    
    return result.tickets;
  } catch (error: any) {
    console.error('Error calling getUserTickets function:', error);
    console.error('Error message:', error?.message);
    
    // Re-throw with more context
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('You must be logged in to view tickets');
    } else if (error.message?.includes('500')) {
      throw new Error('Server error while fetching tickets. Please try again.');
    }
    
    throw error;
  }
};

// Get a single ticket by ID using secure Firebase Function
export const getTicket = async (ticketId: string): Promise<Ticket | null> => {
  try {
    // Get current user to ensure authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    console.log('Getting ticket:', ticketId);
    
    // Get the auth token
    const token = await currentUser.getIdToken();
    
    // Call the HTTP function
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/getTicketHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ticketId })
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Ticket not found
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.ticket) {
      return null;
    }
    
    console.log(`Retrieved ticket ${ticketId} for user with role: ${result.userRole}`);
    
    return result.ticket;
  } catch (error: any) {
    console.error('Error calling getTicket function:', error);
    
    // Re-throw with more context
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('You must be logged in to view this ticket');
    } else if (error.message?.includes('403')) {
      throw new Error('Access denied - you do not have permission to view this ticket');
    } else if (error.message?.includes('500')) {
      throw new Error('Server error while fetching ticket. Please try again.');
    }
    
    throw error;
  }
};

// Update a ticket using secure Firebase Function
export const updateTicket = async (ticketId: string, updates: Partial<Ticket>): Promise<void> => {
  try {
    // Get current user to ensure authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    console.log('Updating ticket:', ticketId, 'with updates:', updates);
    
    // Get the auth token
    const token = await currentUser.getIdToken();
    
    // Call the HTTP function
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/updateTicketHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ticketId, updates })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Update failed');
    }
    
    console.log(`Updated ticket ${ticketId} for user with role: ${result.userRole}`);
    
    // Handle post-update operations that are still done client-side
    const updatedTicket = result.ticket;
    
    // Sync to Algolia if configured
    if (isAlgoliaConfigured && ticketsIndex) {
      try {
        await ticketsIndex.saveObject({
          ...updatedTicket,
          objectID: ticketId
        });
      } catch (algoliaError) {
        console.error('Error syncing to Algolia:', algoliaError);
        // Don't throw the error - we still want the update to succeed even if Algolia sync fails
      }
    }

    // Send notification if there are meaningful changes (status or priority)
    if (updates.status || updates.priority || updates.assigneeId) {
      try {
        await sendTicketUpdateNotification(updatedTicket, updates);
      } catch (emailError) {
        console.error('Error sending update notification:', emailError);
        // Don't throw the error - we still want the update to succeed even if email fails
      }
    }
    
    // Schedule satisfaction survey if ticket was closed
    if (updates.status === 'Closed') {
      try {
        const config = await getAppConfig();
        if (config.surveySettings?.enabled) {
          // Note: The actual survey scheduling will be handled by a Cloud Function
          // We'll just log the event here for the function to pick up
          console.log(`Ticket ${ticketId} closed, survey will be scheduled`);
        }
      } catch (surveyError) {
        console.error('Error checking survey settings:', surveyError);
        // Don't throw - survey is not critical to ticket closure
      }
    }
  } catch (error: any) {
    console.error('Error calling updateTicket function:', error);
    
    // Re-throw with more context
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('You must be logged in to update this ticket');
    } else if (error.message?.includes('403')) {
      throw new Error('Access denied - you do not have permission to update this ticket');
    } else if (error.message?.includes('500')) {
      throw new Error('Server error while updating ticket. Please try again.');
    }
    
    throw error;
  }
};

// Add a reply to a ticket using secure Firebase Function
export const addReply = async (ticketId: string, replyData: {
  message: string;
  isPrivate?: boolean;
  attachments?: File[];
}): Promise<TicketReply> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Note: File upload handling would need to be implemented separately
    // For now, we'll pass the message and isPrivate flag
    console.log('Adding reply to ticket:', ticketId);
    
    // Get the auth token
    const token = await currentUser.getIdToken();
    
    // Call the HTTP function
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/addReplyHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        ticketId, 
        message: replyData.message,
        isPrivate: replyData.isPrivate || false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success || !result.reply) {
      throw new Error('Reply creation failed');
    }
    
    console.log(`Added reply to ticket ${ticketId} for user with role: ${result.userRole}`);
    
    const reply = result.reply;
    const updatedTicket = result.ticket;

    // Handle file attachments if provided (upload them separately and update the reply)
    if (replyData.attachments && replyData.attachments.length > 0) {
      try {
        const attachments: TicketAttachment[] = [];
        for (const file of replyData.attachments) {
          const attachment = await uploadFile(file, ticketId);
          attachments.push(attachment);
        }
        
        // Update the reply with attachments
        const updatedReplies = updatedTicket.replies.map((r: TicketReply) => 
          r.id === reply.id ? { ...r, attachments } : r
        );
        
        // Update the ticket with the new attachments
        await updateTicket(ticketId, { replies: updatedReplies });
        
        // Update the reply object to include attachments
        reply.attachments = attachments;
      } catch (attachmentError) {
        console.error('Error uploading attachments:', attachmentError);
        // Don't throw - the reply was created successfully, just without attachments
      }
    }

    // Send notification for the new reply
    if (!reply.isPrivate) {
      try {
        await sendTicketReplyNotification(updatedTicket, reply);
      } catch (emailError) {
        console.error('Error sending reply notification:', emailError);
        // Don't throw the error - we still want the reply to succeed even if email fails
      }
    }

    return reply;
  } catch (error: any) {
    console.error('Error calling addReply function:', error);
    
    // Re-throw with more context
    if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
      throw new Error('You must be logged in to add a reply');
    } else if (error.message?.includes('403')) {
      throw new Error('Access denied - you do not have permission to reply to this ticket');
    } else if (error.message?.includes('500')) {
      throw new Error('Server error while adding reply. Please try again.');
    }
    
    throw error;
  }
};

// Get user's tickets
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
  return getTickets({ submitterId: userId });
};

// Get tickets assigned to a user
export const getAssignedTickets = async (userId: string): Promise<Ticket[]> => {
  return getTickets({ assigneeId: userId });
};

// Delete a ticket
export const deleteTicket = async (ticketId: string): Promise<void> => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, TICKETS_COLLECTION, ticketId));

    // Delete from Algolia if configured
    if (isAlgoliaConfigured && ticketsIndex) {
      try {
        await ticketsIndex.deleteObject(ticketId);
      } catch (algoliaError) {
        console.error('Error deleting from Algolia:', algoliaError);
        // Don't throw the error - we still want the delete to succeed even if Algolia sync fails
      }
    }
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
};

// Search tickets by title or ID
export const searchTickets = async (searchTerm: string): Promise<Ticket[]> => {
  try {
    // Use Algolia if configured for better search
    if (isAlgoliaConfigured && ticketsIndex) {
      try {
        const { hits } = await ticketsIndex.search(searchTerm, {
          hitsPerPage: 20,
          attributesToRetrieve: ['*']
        });
        return hits.map(hit => ({
          ...hit as any,
          id: hit.objectID
        })) as Ticket[];
      } catch (algoliaError) {
        console.error('Error searching with Algolia:', algoliaError);
        // Fall back to Firestore search
      }
    }

    // Fallback to Firestore query (less efficient but still functional)
    const { getDocs, query, collection, orderBy, limit } = await import('firebase/firestore');
    
    // Try to search by ID first (exact match)
    if (searchTerm.length >= 6) {
      const exactMatch = await getTicket(searchTerm);
      if (exactMatch) {
        return [exactMatch];
      }
    }

    // If not found by ID, search by title (basic text matching)
    // Note: This is a simplified search - Algolia would be much better
    const q = query(
      collection(db, TICKETS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const allTickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Ticket[];

    // Filter tickets that contain the search term in title (case-insensitive)
    const searchLower = searchTerm.toLowerCase();
    return allTickets.filter(ticket => 
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.id.toLowerCase().includes(searchLower) ||
      ticket.description.toLowerCase().includes(searchLower)
    ).slice(0, 20); // Limit results
    
  } catch (error) {
    console.error('Error searching tickets:', error);
    throw error;
  }
};