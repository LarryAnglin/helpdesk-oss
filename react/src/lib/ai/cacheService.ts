/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

// import { GoogleGenerativeAI } from '@google/generative-ai';

interface CacheInfo {
  name: string;
  ttlSeconds: number;
  createTime?: string;
  updateTime?: string;
  expireTime?: string;
}

export class CacheService {
  // private genAI: GoogleGenerativeAI;
  private cacheInfo: CacheInfo | null = null;
  private static readonly CACHE_NAME = 'helpdesk-context-cache';
  private static readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  constructor(_apiKey: string) {
    // this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async createOrUpdateCache(contextData: string): Promise<string | null> {
    try {
      console.log('Creating/updating help desk context cache...');
      
      // Try to delete existing cache first
      await this.deleteCache();

      // Create new cache with help desk specific system instruction
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': import.meta.env.VITE_GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          model: 'models/gemini-1.5-flash-001',
          contents: [{
            role: 'user',
            parts: [{
              text: contextData
            }]
          }],
          systemInstruction: {
            parts: [{
              text: `You are a helpful IT support assistant for a help desk system. You have access to:
- Knowledge base articles and IT documentation
- Common software troubleshooting guides
- Hardware setup and configuration procedures
- Company IT policies and procedures
- Past ticket resolutions and solutions
- Software installation guides

Your goal is to help users resolve their IT issues quickly and efficiently by providing step-by-step solutions, troubleshooting tips, and relevant information from the knowledge base.`
            }]
          },
          ttl: `${CacheService.CACHE_TTL}s`,
          displayName: CacheService.CACHE_NAME
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create help desk cache:', error);
        return null;
      }

      const result = await response.json();
      this.cacheInfo = {
        name: result.name,
        ttlSeconds: CacheService.CACHE_TTL,
        createTime: result.createTime,
        updateTime: result.updateTime,
        expireTime: result.expireTime
      };

      console.log('Help desk cache created successfully:', result.name);
      console.log('Cache will expire at:', result.expireTime);
      
      return result.name;
    } catch (error) {
      console.error('Error creating help desk cache:', error);
      return null;
    }
  }

  async deleteCache(): Promise<void> {
    try {
      if (!this.cacheInfo?.name) return;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${this.cacheInfo.name}`, {
        method: 'DELETE',
        headers: {
          'X-Goog-Api-Key': import.meta.env.VITE_GEMINI_API_KEY || ''
        }
      });

      if (response.ok) {
        console.log('Help desk cache deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting help desk cache:', error);
    }
  }

  async listCaches(): Promise<any[]> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents`, {
        headers: {
          'X-Goog-Api-Key': import.meta.env.VITE_GEMINI_API_KEY || ''
        }
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.cachedContents || [];
    } catch (error) {
      console.error('Error listing help desk caches:', error);
      return [];
    }
  }

  getCacheInfo(): CacheInfo | null {
    return this.cacheInfo;
  }

  setCacheInfo(cacheInfo: CacheInfo): void {
    this.cacheInfo = cacheInfo;
  }

  isCacheExpired(): boolean {
    if (!this.cacheInfo?.expireTime) return true;
    
    const expireTime = new Date(this.cacheInfo.expireTime);
    const now = new Date();
    
    return now >= expireTime;
  }

  async generateWithCache(
    cacheName: string, 
    userPrompt: string
  ): Promise<{ answer: string; fromCache: boolean }> {
    try {
      // Use REST API to generate with cached content
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': import.meta.env.VITE_GEMINI_API_KEY || ''
        },
        body: JSON.stringify({
          cachedContent: cacheName,
          contents: [{
            role: 'user',
            parts: [{
              text: userPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Help desk cache generation failed:', error);
        throw new Error(`Cache generation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Help desk cache generation result:', {
        fullResult: result,
        candidates: result.candidates,
        firstCandidate: result.candidates?.[0],
        content: result.candidates?.[0]?.content,
        parts: result.candidates?.[0]?.content?.parts,
        text: result.candidates?.[0]?.content?.parts?.[0]?.text
      });
      
      const answer = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!answer || answer.trim().length === 0) {
        console.error('🚨 Help desk cache generation returned empty response!');
        console.error('Full API response:', result);
        throw new Error('Cache generation returned empty response');
      }
      
      return {
        answer,
        fromCache: true
      };
    } catch (error) {
      console.error('Error generating with help desk cache:', error);
      throw error;
    }
  }
}