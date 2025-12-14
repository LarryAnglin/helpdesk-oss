/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CommonSolution } from '../types/commonSolutions';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface TicketContext {
  id: string;
  title: string;
  description: string;
  status: string;
  replies?: string[];
  createdAt: Date;
  resolvedAt?: Date;
}

interface AIReference {
  id: string;
  title: string;
  type: 'json' | 'pdf' | 'url';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface RateLimitEntry {
  ip: string;
  hourlyCount: number;
  dailyCount: number;
  hourlyWindowStart: number;
  dailyWindowStart: number;
}

class PublicAIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly HOURLY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly HOURLY_LIMIT = 10; // 10 requests per hour
  private readonly DAILY_LIMIT = 20; // 20 requests per day
  private readonly MAX_TICKETS_FOR_CONTEXT = 50; // Limit to avoid context bloat
  private readonly MAX_CONTEXT_LENGTH = 8000; // Characters limit for context

  constructor() {
    // Clean up old rate limit entries every 10 minutes
    setInterval(() => this.cleanupRateLimit(), 10 * 60 * 1000);
  }

  private getClientIP(): string {
    // In a real deployment, you'd get this from request headers
    // For now, use a session-based identifier
    let sessionId = sessionStorage.getItem('ai_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2);
      sessionStorage.setItem('ai_session_id', sessionId);
    }
    return sessionId;
  }

  private cleanupRateLimit(): void {
    const now = Date.now();
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now - entry.dailyWindowStart > this.DAILY_WINDOW_MS) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  checkRateLimit(): { 
    allowed: boolean; 
    hourlyRemaining: number; 
    dailyRemaining: number; 
    hourlyResetTime: number;
    dailyResetTime: number;
    limitType?: 'hourly' | 'daily';
  } {
    const clientIP = this.getClientIP();
    const now = Date.now();
    const entry = this.rateLimitMap.get(clientIP);

    if (!entry) {
      // First request
      this.rateLimitMap.set(clientIP, {
        ip: clientIP,
        hourlyCount: 1,
        dailyCount: 1,
        hourlyWindowStart: now,
        dailyWindowStart: now
      });
      return {
        allowed: true,
        hourlyRemaining: this.HOURLY_LIMIT - 1,
        dailyRemaining: this.DAILY_LIMIT - 1,
        hourlyResetTime: now + this.HOURLY_WINDOW_MS,
        dailyResetTime: now + this.DAILY_WINDOW_MS
      };
    }

    // Check if windows need reset
    const hourlyExpired = now - entry.hourlyWindowStart > this.HOURLY_WINDOW_MS;
    const dailyExpired = now - entry.dailyWindowStart > this.DAILY_WINDOW_MS;

    if (hourlyExpired) {
      entry.hourlyCount = 0;
      entry.hourlyWindowStart = now;
    }
    
    if (dailyExpired) {
      entry.dailyCount = 0;
      entry.dailyWindowStart = now;
    }

    // Check limits
    if (entry.hourlyCount >= this.HOURLY_LIMIT) {
      return {
        allowed: false,
        hourlyRemaining: 0,
        dailyRemaining: Math.max(0, this.DAILY_LIMIT - entry.dailyCount),
        hourlyResetTime: entry.hourlyWindowStart + this.HOURLY_WINDOW_MS,
        dailyResetTime: entry.dailyWindowStart + this.DAILY_WINDOW_MS,
        limitType: 'hourly'
      };
    }

    if (entry.dailyCount >= this.DAILY_LIMIT) {
      return {
        allowed: false,
        hourlyRemaining: Math.max(0, this.HOURLY_LIMIT - entry.hourlyCount),
        dailyRemaining: 0,
        hourlyResetTime: entry.hourlyWindowStart + this.HOURLY_WINDOW_MS,
        dailyResetTime: entry.dailyWindowStart + this.DAILY_WINDOW_MS,
        limitType: 'daily'
      };
    }

    // Allow request
    entry.hourlyCount++;
    entry.dailyCount++;
    
    return {
      allowed: true,
      hourlyRemaining: this.HOURLY_LIMIT - entry.hourlyCount,
      dailyRemaining: this.DAILY_LIMIT - entry.dailyCount,
      hourlyResetTime: entry.hourlyWindowStart + this.HOURLY_WINDOW_MS,
      dailyResetTime: entry.dailyWindowStart + this.DAILY_WINDOW_MS
    };
  }

  async getTicketContext(): Promise<TicketContext[]> {
    try {
      // Get recently closed tickets (system-wide as requested)
      const ticketsRef = collection(db, 'tickets');
      const closedTicketsQuery = query(
        ticketsRef,
        where('status', '==', 'closed'),
        orderBy('resolvedAt', 'desc'),
        limit(this.MAX_TICKETS_FOR_CONTEXT)
      );

      const snapshot = await getDocs(closedTicketsQuery);
      const tickets: TicketContext[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Get replies for this ticket
        const repliesRef = collection(db, 'tickets', doc.id, 'replies');
        const repliesQuery = query(repliesRef, orderBy('createdAt', 'asc'));
        const repliesSnapshot = await getDocs(repliesQuery);
        
        const replies = repliesSnapshot.docs.map(replyDoc => {
          const replyData = replyDoc.data();
          return replyData.content || replyData.message || '';
        }).filter(reply => reply.length > 0);

        tickets.push({
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          status: data.status || 'closed',
          replies,
          createdAt: data.createdAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate() || new Date()
        });
      }

      console.log(`Retrieved ${tickets.length} closed tickets for AI context`);
      return tickets;
    } catch (error) {
      console.error('Error fetching ticket context:', error);
      return [];
    }
  }

  async getAIReferences(): Promise<AIReference[]> {
    try {
      const referencesRef = collection(db, 'ai_references');
      const referencesQuery = query(referencesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(referencesQuery);

      const references: AIReference[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        references.push({
          id: doc.id,
          title: data.title || '',
          type: data.type || 'text',
          content: data.content || '',
          metadata: data.metadata || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      }

      console.log(`Retrieved ${references.length} AI references`);
      return references;
    } catch (error) {
      console.error('Error fetching AI references:', error);
      return [];
    }
  }

  async getCommonSolutions(): Promise<CommonSolution[]> {
    try {
      const solutionsRef = collection(db, 'commonSolutions');
      const solutionsQuery = query(
        solutionsRef,
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(solutionsQuery);

      const solutions: CommonSolution[] = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        solutions.push({
          id: doc.id,
          title: data.title || '',
          link: data.link || '',
          isActive: data.isActive || true,
          order: data.order || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || ''
        });
      }

      console.log(`Retrieved ${solutions.length} common solutions`);
      return solutions;
    } catch (error) {
      console.error('Error fetching common solutions:', error);
      return [];
    }
  }

  private truncateContext(context: string, maxLength: number): string {
    if (context.length <= maxLength) {
      return context;
    }
    
    // Truncate and add indicator
    return context.substring(0, maxLength - 100) + '\n\n[... context truncated to avoid token limits ...]';
  }

  private formatTicketContext(tickets: TicketContext[]): string {
    if (tickets.length === 0) {
      return 'No previous tickets available for context.';
    }

    let context = `## Previous Support Tickets (${tickets.length} most recent closed tickets):\n\n`;
    
    for (const ticket of tickets) {
      context += `### Ticket: ${ticket.title}\n`;
      context += `**Status:** ${ticket.status}\n`;
      context += `**Description:** ${ticket.description}\n`;
      
      if (ticket.replies && ticket.replies.length > 0) {
        context += `**Resolution/Replies:**\n`;
        ticket.replies.forEach((reply) => {
          context += `- ${reply}\n`;
        });
      }
      
      context += `**Resolved:** ${ticket.resolvedAt?.toLocaleDateString() || 'Unknown'}\n\n`;
    }

    return this.truncateContext(context, Math.floor(this.MAX_CONTEXT_LENGTH * 0.7));
  }

  private formatReferenceContext(references: AIReference[]): string {
    if (references.length === 0) {
      return '';
    }

    let context = `## Reference Information (${references.length} items):\n\n`;
    
    for (const ref of references) {
      context += `### ${ref.title} (${ref.type.toUpperCase()})\n`;
      context += `${ref.content}\n\n`;
    }

    return this.truncateContext(context, Math.floor(this.MAX_CONTEXT_LENGTH * 0.3));
  }

  private formatCommonSolutionsContext(solutions: CommonSolution[]): string {
    if (solutions.length === 0) {
      return '';
    }

    let context = '## Common Solutions and Quick Links:\n\n';
    context += 'These are commonly requested solutions and helpful links that users frequently need:\n\n';
    
    for (const solution of solutions) {
      context += `• **${solution.title}**: ${solution.link}\n`;
    }
    context += '\n';

    return context;
  }

  async askQuestion(question: string): Promise<{
    answer: string;
    sources: string[];
    hourlyRemaining: number;
    dailyRemaining: number;
  }> {
    // Check rate limiting
    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      const resetDate = new Date(rateCheck.limitType === 'hourly' ? rateCheck.hourlyResetTime : rateCheck.dailyResetTime);
      const limitType = rateCheck.limitType === 'hourly' ? 'hourly' : 'daily';
      const timeUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 1000 / 60); // minutes
      
      throw new Error(`You've reached your ${limitType} question limit. Please try again in ${timeUntilReset} minute${timeUntilReset !== 1 ? 's' : ''}.`);
    }

    try {
      // Get context data
      console.log('Gathering context for AI query...');
      const [tickets, references, commonSolutions] = await Promise.all([
        this.getTicketContext(),
        this.getAIReferences(),
        this.getCommonSolutions()
      ]);

      // Format context
      const ticketContext = this.formatTicketContext(tickets);
      const referenceContext = this.formatReferenceContext(references);
      const solutionsContext = this.formatCommonSolutionsContext(commonSolutions);

      // Create comprehensive prompt
      const prompt = `You are a helpful IT support assistant. A user has asked a question and you have access to historical ticket data, reference information, and common solutions to provide accurate, contextual answers.

**User Question:** "${question}"

**Context Information:**
${solutionsContext}

${ticketContext}

${referenceContext}

**Instructions:**
- Provide a helpful, clear answer based on the available context
- If the question relates to any of the common solutions provided, direct the user to the appropriate link
- If you find similar issues in the ticket history, reference them
- Include step-by-step instructions when appropriate
- Be friendly and professional
- If the question is outside IT support scope, politely explain and suggest alternatives
- If you're unsure or the issue seems complex, recommend creating a support ticket
- Format your response with clear headings and bullet points when helpful

**Response Guidelines:**
- Start with a direct answer to the question
- Provide relevant background from the ticket history if applicable
- Include any warnings or important notes
- End with next steps or escalation recommendations if needed`;

      console.log('Sending query to Gemini AI...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      // Determine sources used
      const sources = [];
      if (commonSolutions.length > 0) {
        sources.push(`${commonSolutions.length} common solutions`);
      }
      if (tickets.length > 0) {
        sources.push(`${tickets.length} previous support tickets`);
      }
      if (references.length > 0) {
        sources.push(`${references.length} reference documents`);
      }
      if (sources.length === 0) {
        sources.push('General IT knowledge');
      }

      console.log('AI response generated successfully');
      return {
        answer,
        sources,
        hourlyRemaining: rateCheck.hourlyRemaining,
        dailyRemaining: rateCheck.dailyRemaining
      };

    } catch (error) {
      console.error('Error processing AI question:', error);
      throw new Error('Failed to process your question. Please try again later.');
    }
  }
}

export const publicAIService = new PublicAIService();