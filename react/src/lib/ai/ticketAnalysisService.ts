/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ticket } from '../types/ticket';
import { TicketInsight, ticketInsightsService } from '../firebase/ticketInsightsService';
import { Timestamp } from 'firebase/firestore';

export class TicketAnalysisService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Gemini API key not configured');
      this.genAI = null as any;
      return;
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  // Analyze a closed ticket and extract key insights
  async analyzeClosedTicket(ticket: Ticket): Promise<TicketInsight | null> {
    if (!this.model) {
      console.error('Gemini model not initialized');
      return null;
    }

    try {
      // Build conversation history
      const conversationHistory = this.buildConversationHistory(ticket);
      
      // Create prompt for analysis
      const prompt = `Analyze this resolved help desk ticket and extract key information that would be helpful for answering similar questions in the future.

Ticket Information:
- Title: ${ticket.title}
- Priority: ${ticket.priority}
- Status: ${ticket.status}
- Description: ${ticket.description}

Conversation History:
${conversationHistory}

Please extract and provide:
1. A concise summary of the problem (2-3 sentences max)
2. A clear summary of the solution that worked (3-4 sentences max)
3. 5-8 relevant keywords that would help identify similar issues
4. Any important patterns or insights that could help resolve similar issues faster

Format your response as JSON with the following structure:
{
  "problem": "Clear description of the issue",
  "solution": "Step-by-step solution that resolved the issue",
  "keywords": ["keyword1", "keyword2", ...],
  "insights": "Additional patterns or important notes"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const analysis = this.parseAnalysisResponse(text);
      if (!analysis) {
        console.error('Failed to parse analysis response');
        return null;
      }

      // Calculate resolution time
      const resolutionTime = Math.floor(
        (ticket.resolvedAt! - ticket.createdAt) / (1000 * 60)
      ); // in minutes

      // Create the insight
      const insight: Omit<TicketInsight, 'id'> = {
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        title: ticket.title,
        problem: analysis.problem,
        solution: analysis.solution + (analysis.insights ? '\n\nAdditional insights: ' + analysis.insights : ''),
        category: 'General', // Default category since tickets don't have a category field
        keywords: analysis.keywords,
        priority: ticket.priority === 'None' ? 'Low' : ticket.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
        resolutionTime,
        createdAt: Timestamp.fromMillis(ticket.createdAt),
        closedAt: Timestamp.fromMillis(ticket.resolvedAt || Date.now()),
        tokenCount: 0, // Will be calculated
        compactionLevel: 0
      };

      // Estimate token count
      insight.tokenCount = ticketInsightsService.estimateTokenCount(insight);

      // Save to Firestore
      const insightId = await ticketInsightsService.createInsight(insight);
      
      return { ...insight, id: insightId };
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      return null;
    }
  }

  // Build conversation history from ticket replies
  private buildConversationHistory(ticket: Ticket): string {
    if (!ticket.replies || ticket.replies.length === 0) {
      return 'No conversation history available.';
    }

    const history = ticket.replies
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(reply => {
        const date = new Date(reply.createdAt).toLocaleString();
        const role = reply.authorName.includes('Admin') || reply.authorName.includes('Support') ? 'Support' : 'User';
        return `[${date}] ${role}: ${reply.message}`;
      })
      .join('\n');

    return history;
  }

  // Parse the AI response to extract structured data
  private parseAnalysisResponse(text: string): {
    problem: string;
    solution: string;
    keywords: string[];
    insights?: string;
  } | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.problem || !parsed.solution || !Array.isArray(parsed.keywords)) {
        console.error('Missing required fields in parsed response');
        return null;
      }

      return {
        problem: parsed.problem.substring(0, 500), // Limit length
        solution: parsed.solution.substring(0, 1000), // Limit length
        keywords: parsed.keywords.slice(0, 10), // Max 10 keywords
        insights: parsed.insights?.substring(0, 500)
      };
    } catch (error) {
      console.error('Error parsing analysis response:', error);
      return null;
    }
  }

  // Batch analyze multiple tickets (for migration)
  async batchAnalyzeTickets(tickets: Ticket[]): Promise<{
    successful: number;
    failed: number;
    insights: TicketInsight[];
  }> {
    const results = {
      successful: 0,
      failed: 0,
      insights: [] as TicketInsight[]
    };

    for (const ticket of tickets) {
      // Only analyze resolved/closed tickets
      if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
        continue;
      }

      try {
        const insight = await this.analyzeClosedTicket(ticket);
        if (insight) {
          results.insights.push(insight);
          results.successful++;
        } else {
          results.failed++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze ticket ${ticket.id}:`, error);
        results.failed++;
      }
    }

    return results;
  }
}

// Export singleton instance
export const ticketAnalysisService = new TicketAnalysisService();