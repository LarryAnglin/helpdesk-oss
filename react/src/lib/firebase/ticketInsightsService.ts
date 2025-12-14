/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy, 
  limit,
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface TicketInsight {
  id?: string;
  ticketId: string;
  tenantId: string;
  title: string;
  problem: string;
  solution: string;
  category: string;
  keywords: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  resolutionTime: number; // in minutes
  createdAt: Timestamp;
  closedAt: Timestamp;
  tokenCount: number; // Approximate token count for this insight
  compactionLevel: number; // 0 = full detail, 1 = moderate, 2 = highly compressed
}

export interface CompactedInsight {
  problem: string;
  solution: string;
  keywords: string[];
  tokenCount: number;
}

export class TicketInsightsService {
  private collectionName = 'ticketInsights';

  // Create a new ticket insight
  async createInsight(insight: Omit<TicketInsight, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...insight,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating ticket insight:', error);
      throw new Error('Failed to create ticket insight');
    }
  }

  // Get all insights ordered by closed date (newest first)
  async getAllInsights(tenantId?: string, maxResults?: number): Promise<TicketInsight[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.collectionName),
          where('tenantId', '==', tenantId),
          orderBy('closedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy('closedAt', 'desc')
        );
      }
      
      if (maxResults) {
        q = query(q, limit(maxResults));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TicketInsight));
    } catch (error) {
      console.error('Error fetching ticket insights:', error);
      throw new Error('Failed to fetch ticket insights');
    }
  }

  // Get insights with token budget management
  async getInsightsForContext(tenantId?: string, maxTokens: number = 100000): Promise<{
    insights: TicketInsight[];
    totalTokens: number;
    compactionApplied: boolean;
  }> {
    try {
      const allInsights = await this.getAllInsights(tenantId);
      let totalTokens = 0;
      const selectedInsights: TicketInsight[] = [];
      let compactionApplied = false;

      // First pass: Add insights until we approach the token limit
      for (const insight of allInsights) {
        if (totalTokens + insight.tokenCount <= maxTokens * 0.9) { // Leave 10% buffer
          selectedInsights.push(insight);
          totalTokens += insight.tokenCount;
        } else {
          break;
        }
      }

      // If we couldn't fit all insights, apply progressive compaction
      if (selectedInsights.length < allInsights.length) {
        compactionApplied = true;
        
        // Try to add more insights with increased compaction
        const remainingInsights = allInsights.slice(selectedInsights.length);
        
        for (const insight of remainingInsights) {
          const compactedTokenCount = this.estimateCompactedTokenCount(insight);
          if (totalTokens + compactedTokenCount <= maxTokens) {
            // Apply compaction to older insights
            const compactedInsight = this.applyCompaction(insight, 2);
            selectedInsights.push(compactedInsight);
            totalTokens += compactedTokenCount;
          }
        }
      }

      return {
        insights: selectedInsights,
        totalTokens,
        compactionApplied
      };
    } catch (error) {
      console.error('Error getting insights for context:', error);
      return {
        insights: [],
        totalTokens: 0,
        compactionApplied: false
      };
    }
  }

  // Update an insight (e.g., to apply compaction)
  async updateInsight(id: string, updates: Partial<TicketInsight>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating ticket insight:', error);
      throw new Error('Failed to update ticket insight');
    }
  }

  // Delete old insights beyond a certain age
  async pruneOldInsights(tenantId?: string, daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      let q;
      if (tenantId) {
        q = query(
          collection(db, this.collectionName),
          where('tenantId', '==', tenantId),
          orderBy('closedAt', 'asc')
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy('closedAt', 'asc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deleteCount = 0;

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.closedAt < cutoffTimestamp) {
          batch.delete(doc.ref);
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
      }

      return deleteCount;
    } catch (error) {
      console.error('Error pruning old insights:', error);
      throw new Error('Failed to prune old insights');
    }
  }

  // Format insights for AI context
  formatInsightsForContext(insights: TicketInsight[]): string {
    if (insights.length === 0) return '';

    const sections = insights.map((insight, index) => {
      const ageInDays = Math.floor((Date.now() - insight.closedAt.toMillis()) / (1000 * 60 * 60 * 24));
      const compactionNote = insight.compactionLevel > 0 ? ` [Compacted Level ${insight.compactionLevel}]` : '';
      
      return `### Ticket ${index + 1} (${ageInDays} days ago)${compactionNote}
**Category**: ${insight.category}
**Priority**: ${insight.priority}
**Problem**: ${insight.problem}
**Solution**: ${insight.solution}
**Keywords**: ${insight.keywords.join(', ')}
**Resolution Time**: ${insight.resolutionTime} minutes`;
    });

    return `## Historical Ticket Insights

The following are resolved ticket summaries that may help answer similar questions:

${sections.join('\n\n---\n\n')}

Use these insights to provide more accurate and contextual help based on previously resolved issues.`;
  }

  // Estimate token count for an insight
  estimateTokenCount(insight: Partial<TicketInsight>): number {
    // Rough estimation: 1 token ≈ 4 characters
    const text = `${insight.title || ''} ${insight.problem || ''} ${insight.solution || ''} ${insight.keywords?.join(' ') || ''}`;
    return Math.ceil(text.length / 4);
  }

  // Estimate token count after compaction
  private estimateCompactedTokenCount(insight: TicketInsight): number {
    // Highly compressed insights are about 30% of original size
    return Math.ceil(insight.tokenCount * 0.3);
  }

  // Apply compaction to an insight
  private applyCompaction(insight: TicketInsight, level: number): TicketInsight {
    if (level === 0) return insight;

    let compactedProblem = insight.problem;
    let compactedSolution = insight.solution;

    if (level === 1) {
      // Moderate compaction: Remove examples, keep key points
      compactedProblem = this.extractKeyPoints(insight.problem, 100);
      compactedSolution = this.extractKeyPoints(insight.solution, 150);
    } else if (level >= 2) {
      // High compaction: Only essential information
      compactedProblem = this.extractKeyPoints(insight.problem, 50);
      compactedSolution = this.extractKeyPoints(insight.solution, 75);
    }

    return {
      ...insight,
      problem: compactedProblem,
      solution: compactedSolution,
      compactionLevel: level,
      tokenCount: this.estimateTokenCount({ problem: compactedProblem, solution: compactedSolution })
    };
  }

  // Extract key points from text (simple implementation)
  private extractKeyPoints(text: string, maxWords: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    let result = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      if (wordCount + words.length <= maxWords) {
        result += sentence.trim() + '. ';
        wordCount += words.length;
      } else {
        break;
      }
    }

    return result.trim() || text.substring(0, maxWords * 5) + '...';
  }
}

// Export singleton instance
export const ticketInsightsService = new TicketInsightsService();