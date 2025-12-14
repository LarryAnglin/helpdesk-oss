/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CacheService } from './cacheService';
import { faqService, FAQMatch } from './faqService';
import { ticketInsightsService } from '../firebase/ticketInsightsService';
import { knowledgeBaseService } from '../firebase/knowledgeBaseService';
import { AppConfig } from '../types/config';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface QueryContext {
  question: string;
  dataType: 'software' | 'hardware' | 'network' | 'account' | 'printer' | 'email' | 'phone' | 'security' | 'general' | 'unknown';
  searchTerms: string[];
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  contextTokens: number;
  promptTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  usingCache?: boolean;
  cacheSavings?: number;
}

export interface ProgressStep {
  step: string;
  description: string;
  progress: number;
  isComplete: boolean;
  estimatedTime?: number;
}

type ProgressCallback = (step: ProgressStep) => void;

export class HelpDeskAIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  private cacheService = new CacheService(import.meta.env.VITE_GEMINI_API_KEY || '');
  private knowledgeBase: any[] = []; // IT knowledge base articles
  private systemPrompt: string = '';
  private lastCacheUpdate: Date | null = null;
  private contextCacheName: string | null = null;
  private CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes cache for help desk
  private progressCallback: ProgressCallback | null = null;
  private readonly CACHING_ENABLED = import.meta.env.VITE_ENABLE_TOKEN_CACHE === 'true';
  private readonly AI_ENABLED = import.meta.env.VITE_ENABLE_AI_SELF_HELP === 'true';

  constructor() {
    this.systemPrompt = `You are a helpful IT support assistant for a help desk system. You specialize in:
- Troubleshooting computer and software problems
- Providing step-by-step technical solutions
- Explaining IT concepts in user-friendly terms
- Helping with common office technology issues
- Guiding users through software installations and configurations

Your responses should be:
- Clear and easy to follow
- Include step-by-step instructions when appropriate
- Mention when to contact IT support for complex issues
- Suggest temporary workarounds when possible
- Be encouraging and patient with non-technical users`;
  }

  setProgressCallback(callback: ProgressCallback | null) {
    this.progressCallback = callback;
  }

  private emitProgress(step: string, description: string, progress: number, isComplete: boolean = false, estimatedTime?: number) {
    if (this.progressCallback) {
      this.progressCallback({
        step,
        description,
        progress,
        isComplete,
        estimatedTime
      });
    }
  }

  async loadKnowledgeBase(): Promise<void> {
    try {
      this.emitProgress('loading', 'Loading IT knowledge base...', 20, false, 10);
      
      // Here you would load from your knowledge base sources:
      // 1. Google Docs with IT procedures
      // 2. Company wiki/knowledge base
      // 3. Software documentation
      // 4. Common solutions database
      
      // For now, we'll use a simple knowledge base structure
      this.knowledgeBase = [
        {
          category: 'Password Reset',
          content: 'Standard password reset procedures and requirements',
          keywords: ['password', 'reset', 'login', 'account']
        },
        {
          category: 'Email Issues',
          content: 'Common email troubleshooting steps and solutions',
          keywords: ['email', 'outlook', 'mail', 'send', 'receive']
        },
        {
          category: 'Software Installation',
          content: 'Guidelines for software installation requests and procedures',
          keywords: ['software', 'install', 'application', 'program']
        },
        {
          category: 'Network Connectivity',
          content: 'WiFi, VPN, and network troubleshooting procedures',
          keywords: ['wifi', 'network', 'internet', 'vpn', 'connection']
        },
        {
          category: 'Hardware Issues',
          content: 'Computer performance and hardware troubleshooting',
          keywords: ['computer', 'slow', 'performance', 'hardware', 'crash']
        }
      ];

      this.lastCacheUpdate = new Date();
      this.emitProgress('loaded', 'Knowledge base loaded', 100, true);
      
      console.log('✅ Help desk knowledge base loaded');
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      this.emitProgress('error', 'Failed to load knowledge base', 0, false);
    }
  }

  async ensureFreshCache(): Promise<void> {
    const now = new Date();
    const cacheExpired = !this.lastCacheUpdate || 
      (now.getTime() - this.lastCacheUpdate.getTime()) > this.CACHE_DURATION_MS;
    
    if (cacheExpired || this.knowledgeBase.length === 0) {
      await this.loadKnowledgeBase();
    }
  }

  async analyzeQuestion(question: string): Promise<QueryContext> {
    const prompt = `
      Analyze this IT support question and categorize it:
      Question: "${question}"
      
      Categories:
      - software: Software issues, application problems, installation requests
      - hardware: Computer problems, performance issues, physical device problems
      - network: Internet, WiFi, VPN, connectivity issues
      - account: Password resets, login issues, user account problems
      - printer: Printing problems, printer setup, driver issues
      - email: Email issues, Outlook problems, mail server problems
      - phone: Phone system issues, voicemail, extension problems
      - security: Access permissions, file access, security concerns
      - general: General IT questions, policies, procedures
      - unknown: Cannot determine category
      
      Also extract key search terms from the question.
      
      Respond in JSON format:
      {
        "dataType": "category",
        "searchTerms": ["term1", "term2"]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      
      return {
        question,
        dataType: parsed.dataType || 'unknown',
        searchTerms: parsed.searchTerms || []
      };
    } catch (error) {
      console.error('Error analyzing question:', error);
      return {
        question,
        dataType: 'unknown',
        searchTerms: []
      };
    }
  }

  async fetchRelevantData(context: QueryContext): Promise<any[]> {
    console.log(`Fetching relevant data for: ${context.dataType} with terms: ${context.searchTerms.join(', ')}`);
    
    // Ensure cache is fresh
    await this.ensureFreshCache();
    
    // Filter knowledge base by category and search terms
    const relevantData = this.knowledgeBase.filter(item => {
      // Match by category
      if (item.category.toLowerCase().includes(context.dataType)) {
        return true;
      }
      
      // Match by search terms
      return context.searchTerms.some(term => 
        item.keywords.some((keyword: string) => 
          keyword.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    });
    
    console.log(`Found ${relevantData.length} relevant knowledge base articles`);
    return relevantData;
  }

  async generateAnswer(question: string, relevantData: any[], config?: AppConfig): Promise<{ answer: string; tokenUsage: TokenUsage; knowledgeBaseSources?: string[] }> {
    if (!this.AI_ENABLED) {
      return {
        answer: "AI self-help is currently disabled. Please create a support ticket for assistance.",
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          contextTokens: 0,
          promptTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          model: 'disabled'
        },
        knowledgeBaseSources: []
      };
    }

    // Ensure we have fresh data
    await this.ensureFreshCache();
    
    // Get current date for context
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Get ticket insights if enabled
    let ticketInsightsContext = '';
    let insightTokenCount = 0;
    
    if (config?.aiSettings?.ticketInsightsEnabled) {
      const maxTokens = config.aiSettings.maxInsightTokens || 100000;
      console.log(`📋 Loading ticket insights (max ${maxTokens} tokens)...`);
      
      try {
        const { insights, totalTokens, compactionApplied } = await ticketInsightsService.getInsightsForContext(undefined, maxTokens);
        
        if (insights.length > 0) {
          ticketInsightsContext = ticketInsightsService.formatInsightsForContext(insights);
          insightTokenCount = totalTokens;
          console.log(`✅ Loaded ${insights.length} ticket insights (${totalTokens} tokens, compaction: ${compactionApplied})`);
        } else {
          console.log('ℹ️ No ticket insights available yet');
        }
      } catch (error) {
        console.error('Error loading ticket insights:', error);
      }
    }
    
    // Get knowledge base content if enabled
    let knowledgeBaseContext = '';
    let knowledgeBaseTokenCount = 0;
    let knowledgeBaseSources: string[] = [];
    
    if (config?.aiSettings?.knowledgeBaseSettings?.enabled) {
      const maxTokens = config.aiSettings.knowledgeBaseSettings.maxTokens || 400000;
      console.log(`📚 Loading knowledge base content (max ${maxTokens} tokens)...`);
      
      try {
        const kbResponse = await knowledgeBaseService.queryKnowledgeBase({
          question,
          maxTokens,
          selectedSources: undefined // Use all enabled sources for now
        });
        
        if (kbResponse.relevantContent.length > 0) {
          knowledgeBaseContext = knowledgeBaseService.formatContentForAI(kbResponse.relevantContent);
          knowledgeBaseTokenCount = kbResponse.totalTokensUsed;
          knowledgeBaseSources = kbResponse.sourcesUsed;
          console.log(`✅ Loaded ${kbResponse.relevantContent.length} knowledge base items (${kbResponse.totalTokensUsed} tokens from ${kbResponse.sourcesUsed.length} sources)`);
          
          if (kbResponse.wasFiltered) {
            console.log(`⚠️ Knowledge base content was filtered due to token limits`);
          }
        } else {
          console.log('ℹ️ No relevant knowledge base content found');
        }
      } catch (error) {
        console.error('Error loading knowledge base content:', error);
      }
    }
    
    const prompt = `
      You are a helpful IT support assistant for a help desk system.
      
      CURRENT DATE: ${dateString} (${currentDate.toISOString()})
      
      Question: "${question}"
      
      IT Knowledge Base Context:
      ${JSON.stringify(relevantData, null, 2)}
      
      Additional Context:
      ${JSON.stringify(this.knowledgeBase, null, 2)}
      
      ${ticketInsightsContext ? `
      ${ticketInsightsContext}
      ` : ''}
      
      ${knowledgeBaseContext ? `
      ${knowledgeBaseContext}
      ` : ''}
      
      Instructions:
      - You are an IT support assistant helping users with technical issues
      - Provide clear, step-by-step instructions when appropriate
      - Be friendly and patient, assuming the user may not be technical
      - Suggest when to contact IT support for complex issues ({SUPPORT_PHONE})
      - Include safety warnings for system changes
      - Offer temporary workarounds when possible
      - Use simple language and avoid technical jargon
      - Format responses with clear headings and bullet points
      - If you're unsure, recommend creating a support ticket
      
      For password issues: Direct users to contact IT at {SUPPORT_PHONE}
      For software installation: Mention approval process and security requirements
      For hardware problems: Suggest basic troubleshooting before escalating
      For urgent issues: Emphasize contacting IT support immediately
      
      ${this.systemPrompt ? `Additional Instructions: ${this.systemPrompt}` : ''}
    `;

    try {
      let answer: string;

      // Use cached context if available
      if (this.CACHING_ENABLED && this.contextCacheName) {
        try {
          console.log('Using cached context for help desk AI generation');
          const cacheResult = await this.cacheService.generateWithCache(
            this.contextCacheName,
            `
            Current Date: ${dateString}
            Question: "${question}"
            
            Please provide helpful IT support guidance based on the cached knowledge base context.
            `
          );
          answer = cacheResult.answer || '';
          
          if (!answer || answer.trim().length === 0) {
            throw new Error('Empty cached response');
          }
        } catch (cacheError) {
          console.error('Error using cache, falling back to regular generation:', cacheError);
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          answer = response.text() || '';
        }
      } else {
        // No cache available, use regular generation
        console.log('Using regular generation for help desk AI');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        answer = response.text() || '';
      }
      
      // Calculate token usage
      const promptTokens = this.estimateTokenCount(prompt);
      const outputTokens = this.estimateTokenCount(answer);
      const legacyKBTokens = this.estimateTokenCount(JSON.stringify(this.knowledgeBase));
      const contextTokens = legacyKBTokens + insightTokenCount + knowledgeBaseTokenCount;
      const inputTokens = promptTokens + this.estimateTokenCount(question);
      const totalTokens = inputTokens + outputTokens;
      
      // Gemini 1.5 Flash pricing
      const inputCost = (inputTokens / 1_000_000) * 0.075;
      const outputCost = (outputTokens / 1_000_000) * 0.30;
      const estimatedCost = inputCost + outputCost;

      const tokenUsage: TokenUsage = {
        inputTokens,
        outputTokens,
        contextTokens,
        promptTokens,
        totalTokens,
        estimatedCost,
        model: 'gemini-1.5-flash',
        usingCache: this.CACHING_ENABLED && !!this.contextCacheName,
        cacheSavings: 0
      };
      
      return { answer, tokenUsage, knowledgeBaseSources };
    } catch (error) {
      console.error('Error generating help desk answer:', error);
      
      const errorMessage = 'I apologize, but I encountered an error while processing your question. Please try rephrasing your question or create a support ticket for immediate assistance. You can contact IT support at {SUPPORT_PHONE} for urgent issues.';
      
      const errorTokenUsage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        contextTokens: 0,
        promptTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        model: 'gemini-1.5-flash'
      };
      
      return { 
        answer: errorMessage,
        tokenUsage: errorTokenUsage,
        knowledgeBaseSources: []
      };
    }
  }

  estimateTokenCount(text: string): number {
    // Estimate tokens for Gemini models (similar to GPT)
    return Math.ceil(text.length / 3.5);
  }

  // Replace phone number placeholders with actual support phone
  private replacePhonePlaceholders(text: string, supportPhone: string = 'IT Support'): string {
    return text.replace(/{SUPPORT_PHONE}/g, supportPhone);
  }

  async processQuestion(question: string, config?: AppConfig): Promise<{
    answer: string;
    sources: string[];
    tokenUsage?: TokenUsage;
    faqMatch?: FAQMatch;
  }> {
    const startTime = performance.now();
    
    // STEP 1: Check FAQ first (fastest and cheapest)
    const supportPhone = config?.supportPhone;
    
    console.log('🔍 Checking help desk FAQ database for matches...');
    const faqMatch = await faqService.getBestMatch(question, 0.7, supportPhone); // 70% confidence threshold
    
    if (faqMatch) {
      console.log(`✅ FAQ Match found! Confidence: ${(faqMatch.confidence * 100).toFixed(1)}%`);
      
      // Return FAQ answer with enhanced formatting and phone replacement
      const enhancedAnswer = this.enhanceFAQAnswer(faqMatch.faq.answer, question);
      const finalAnswer = this.replacePhonePlaceholders(enhancedAnswer, supportPhone || 'IT Support');
      
      return {
        answer: finalAnswer,
        sources: [`FAQ: ${faqMatch.faq.category}`],
        faqMatch,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          contextTokens: 0,
          promptTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          model: 'FAQ Cache',
          usingCache: true,
          cacheSavings: 0.002 // Estimate LLM cost savings
        }
      };
    }
    
    console.log('❌ No FAQ match found, proceeding to AI...');
    
    // STEP 2: Proceed with AI if no FAQ match
    const context = await this.analyzeQuestion(question);
    console.log(`Question: "${question}"`);
    console.log(`Classified as: ${context.dataType}`);
    console.log(`Search terms: ${JSON.stringify(context.searchTerms)}`);
    
    // Fetch relevant data based on context
    const relevantData = await this.fetchRelevantData(context);
    console.log(`Found ${relevantData.length} relevant knowledge base articles`);
    
    // Generate answer with token usage
    let { answer, tokenUsage, knowledgeBaseSources } = await this.generateAnswer(question, relevantData, config);
    
    // Replace phone placeholders in AI response
    const finalAnswer = this.replacePhonePlaceholders(answer, supportPhone || 'IT Support');
    
    const totalTime = performance.now() - startTime;
    console.log(`⏱️ Total help desk AI processing time: ${totalTime.toFixed(2)}ms`);
    
    // Combine sources: legacy context + knowledge base sources
    const sources: string[] = [context.dataType];
    if (knowledgeBaseSources && knowledgeBaseSources.length > 0) {
      sources.push(...knowledgeBaseSources.map(sourceId => `Knowledge Base: ${sourceId}`));
    }
    
    return {
      answer: finalAnswer,
      sources,
      tokenUsage
    };
  }

  private enhanceFAQAnswer(answer: string, _originalQuestion: string): string {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Add personalization and current date context
    let enhancedAnswer = answer;
    
    // Add current date if the answer might be time-sensitive
    if (answer.toLowerCase().includes('hour') || answer.toLowerCase().includes('time') || 
        answer.toLowerCase().includes('schedule') || answer.toLowerCase().includes('support')) {
      enhancedAnswer = `${answer}\n\n*Information current as of ${currentDate}. For urgent issues, contact IT support at {SUPPORT_PHONE}.*`;
    }
    
    // Add helpful follow-up suggestions based on the content
    if (answer.toLowerCase().includes('password') || answer.toLowerCase().includes('login')) {
      enhancedAnswer += '\n\n💡 **Still having trouble?** Contact IT support at {SUPPORT_PHONE} for immediate password assistance.';
    } else if (answer.toLowerCase().includes('email') || answer.toLowerCase().includes('outlook')) {
      enhancedAnswer += '\n\n💡 **Email still not working?** Try restarting Outlook or contact IT support at {SUPPORT_PHONE}.';
    } else if (answer.toLowerCase().includes('software') || answer.toLowerCase().includes('install')) {
      enhancedAnswer += '\n\n💡 **Need software installed?** Submit a ticket with business justification and manager approval.';
    } else if (answer.toLowerCase().includes('computer') || answer.toLowerCase().includes('slow')) {
      enhancedAnswer += '\n\n💡 **Computer still running slow?** Consider restarting or contact IT for hardware evaluation.';
    }
    
    // Add FAQ indicator
    enhancedAnswer += '\n\n---\n*This answer was provided from our IT knowledge base for the fastest response.*';
    enhancedAnswer += '\n\n🎫 **Need more help?** Create a support ticket for personalized assistance from our IT team.';
    
    return enhancedAnswer;
  }

  // Method to bypass FAQ and go directly to AI for detailed responses
  async processQuestionWithAI(question: string, config?: AppConfig): Promise<{
    answer: string;
    sources: string[];
    tokenUsage?: TokenUsage;
  }> {
    console.log('🤖 Bypassing FAQ, processing with AI directly...');
    
    const context = await this.analyzeQuestion(question);
    const relevantData = await this.fetchRelevantData(context);
    let { answer, tokenUsage, knowledgeBaseSources } = await this.generateAnswer(question, relevantData, config);
    
    // Combine sources: legacy context + knowledge base sources
    const sources: string[] = [context.dataType];
    if (knowledgeBaseSources && knowledgeBaseSources.length > 0) {
      sources.push(...knowledgeBaseSources.map(sourceId => `Knowledge Base: ${sourceId}`));
    }
    
    return { 
      answer, 
      sources,
      tokenUsage
    };
  }
}

// Export singleton instance
export const helpDeskAI = new HelpDeskAIService();