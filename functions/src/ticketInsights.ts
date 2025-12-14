/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Firestore
const db = admin.firestore();

// Initialize Gemini AI
// Note: functions.config() is deprecated in v2. Use environment variables directly.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface TicketInsight {
  ticketId: string;
  title: string;
  problem: string;
  solution: string;
  category: string;
  keywords: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  resolutionTime: number;
  createdAt: admin.firestore.Timestamp;
  closedAt: admin.firestore.Timestamp;
  tokenCount: number;
  compactionLevel: number;
}

// Cloud Function to analyze tickets when they're closed
export const analyzeClosedTicket = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if ticket was just closed/resolved
    const wasClosedOrResolved = (
      (before.status !== 'Closed' && after.status === 'Closed') ||
      (before.status !== 'Resolved' && after.status === 'Resolved')
    );
    
    if (!wasClosedOrResolved) {
      return null;
    }
    
    // Check if AI insights are enabled
    const settingsDoc = await db.collection('settings').doc('config').get();
    const settings = settingsDoc.data();
    
    if (!settings?.aiSettings?.enabled || !settings?.aiSettings?.ticketInsightsEnabled || !settings?.aiSettings?.autoAnalyzeClosedTickets) {
      console.log('AI ticket insights are disabled');
      return null;
    }
    
    console.log(`Analyzing closed ticket: ${context.params.ticketId}`);
    
    try {
      // Build conversation history
      const conversationHistory = buildConversationHistory(after);
      
      // Create prompt for analysis
      const prompt = `Analyze this resolved help desk ticket and extract key information that would be helpful for answering similar questions in the future.

Ticket Information:
- Title: ${after.title}
- Category: ${after.category || 'General'}
- Priority: ${after.priority}
- Description: ${after.description}

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

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the JSON response
      const analysis = parseAnalysisResponse(text);
      if (!analysis) {
        console.error('Failed to parse analysis response');
        return null;
      }

      // Calculate resolution time
      const resolutionTime = Math.floor(
        (after.resolvedAt - after.createdAt) / (1000 * 60)
      ); // in minutes

      // Create the insight
      const insight: TicketInsight = {
        ticketId: context.params.ticketId,
        title: after.title,
        problem: analysis.problem,
        solution: analysis.solution + (analysis.insights ? '\n\nAdditional insights: ' + analysis.insights : ''),
        category: after.category || 'General',
        keywords: analysis.keywords,
        priority: after.priority,
        resolutionTime,
        createdAt: admin.firestore.Timestamp.fromMillis(after.createdAt),
        closedAt: admin.firestore.Timestamp.fromMillis(after.resolvedAt || Date.now()),
        tokenCount: estimateTokenCount({
          problem: analysis.problem,
          solution: analysis.solution
        }),
        compactionLevel: 0
      };

      // Save to Firestore
      await db.collection('ticketInsights').add(insight);
      
      console.log(`Successfully analyzed and saved insights for ticket ${context.params.ticketId}`);
      
      // Optional: Trigger pruning of old insights
      await pruneOldInsights(settings.aiSettings.insightRetentionDays || 90);
      
      return { success: true, ticketId: context.params.ticketId };
    } catch (error) {
      console.error('Error analyzing ticket:', error);
      return null;
    }
  });

// Helper function to build conversation history
function buildConversationHistory(ticket: any): string {
  if (!ticket.replies || ticket.replies.length === 0) {
    return 'No conversation history available.';
  }

  const history = ticket.replies
    .sort((a: any, b: any) => a.createdAt - b.createdAt)
    .map((reply: any) => {
      const date = new Date(reply.createdAt).toLocaleString();
      const role = reply.isSupport ? 'Support' : 'User';
      return `[${date}] ${role}: ${reply.content}`;
    })
    .join('\n');

  return history;
}

// Helper function to parse AI response
function parseAnalysisResponse(text: string): {
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
      problem: parsed.problem.substring(0, 500),
      solution: parsed.solution.substring(0, 1000),
      keywords: parsed.keywords.slice(0, 10),
      insights: parsed.insights?.substring(0, 500)
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    return null;
  }
}

// Helper function to estimate token count
function estimateTokenCount(data: { problem: string; solution: string }): number {
  const text = `${data.problem} ${data.solution}`;
  return Math.ceil(text.length / 4);
}

// Helper function to prune old insights
async function pruneOldInsights(daysToKeep: number): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

    const oldInsights = await db.collection('ticketInsights')
      .where('closedAt', '<', cutoffTimestamp)
      .get();

    if (oldInsights.empty) {
      return;
    }

    const batch = db.batch();
    oldInsights.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Pruned ${oldInsights.size} old ticket insights`);
  } catch (error) {
    console.error('Error pruning old insights:', error);
  }
}

// Scheduled function to compact older insights (runs daily)
export const compactOldInsights = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    try {
      const settingsDoc = await db.collection('settings').doc('config').get();
      const settings = settingsDoc.data();
      
      if (!settings?.aiSettings?.enabled || !settings?.aiSettings?.ticketInsightsEnabled) {
        console.log('AI ticket insights are disabled');
        return null;
      }

      const maxTokens = settings.aiSettings.maxInsightTokens || 100000;
      
      // Get all insights ordered by date
      const insights = await db.collection('ticketInsights')
        .orderBy('closedAt', 'desc')
        .get();

      let totalTokens = 0;
      const batch = db.batch();
      let updateCount = 0;

      insights.forEach(doc => {
        const data = doc.data();
        totalTokens += data.tokenCount;

        // If we're over 80% of token limit, start compacting older insights
        if (totalTokens > maxTokens * 0.8) {
          const ageInDays = Math.floor((Date.now() - data.closedAt.toMillis()) / (1000 * 60 * 60 * 24));
          
          // Apply progressive compaction based on age
          let newCompactionLevel = data.compactionLevel || 0;
          if (ageInDays > 60 && newCompactionLevel < 2) {
            newCompactionLevel = 2;
          } else if (ageInDays > 30 && newCompactionLevel < 1) {
            newCompactionLevel = 1;
          }

          if (newCompactionLevel > (data.compactionLevel || 0)) {
            // Apply compaction
            const compactedData = applyCompaction(data, newCompactionLevel);
            batch.update(doc.ref, {
              problem: compactedData.problem,
              solution: compactedData.solution,
              compactionLevel: newCompactionLevel,
              tokenCount: estimateTokenCount({
                problem: compactedData.problem,
                solution: compactedData.solution
              })
            });
            updateCount++;
          }
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Compacted ${updateCount} ticket insights`);
      }

      return { success: true, compacted: updateCount };
    } catch (error) {
      console.error('Error compacting insights:', error);
      return null;
    }
  });

// Helper function to apply compaction
function applyCompaction(insight: any, level: number): { problem: string; solution: string } {
  if (level === 0) {
    return { problem: insight.problem, solution: insight.solution };
  }

  let compactedProblem = insight.problem;
  let compactedSolution = insight.solution;

  if (level === 1) {
    // Moderate compaction
    compactedProblem = extractKeyPoints(insight.problem, 100);
    compactedSolution = extractKeyPoints(insight.solution, 150);
  } else if (level >= 2) {
    // High compaction
    compactedProblem = extractKeyPoints(insight.problem, 50);
    compactedSolution = extractKeyPoints(insight.solution, 75);
  }

  return { problem: compactedProblem, solution: compactedSolution };
}

// Helper function to extract key points
function extractKeyPoints(text: string, maxWords: number): string {
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