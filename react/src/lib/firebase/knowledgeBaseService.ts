/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  limit,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import { 
  KnowledgeSource, 
  ProcessedContent, 
  CreateKnowledgeSourceRequest,
  UpdateKnowledgeSourceRequest,
  KnowledgeSourceType,
  KnowledgeBaseQuery,
  KnowledgeBaseResponse
} from '../types/knowledgeBase';

export class KnowledgeBaseService {
  private sourcesCollection = 'knowledgeSources';
  private contentCollection = 'knowledgeContent';
  private storageBasePath = 'knowledge-base';

  // Source Management
  async createSource(request: CreateKnowledgeSourceRequest, userId: string, tenantId: string): Promise<string> {
    try {
      const source: Omit<KnowledgeSource, 'id'> = {
        name: request.name,
        type: request.type,
        enabled: request.enabled ?? true,
        config: request.config as any, // Type assertion needed due to union type
        processingStatus: 'idle',
        tokenCount: 0,
        contentCount: 0,
        tenantId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId
      };

      const docRef = await addDoc(collection(db, this.sourcesCollection), source);
      return docRef.id;
    } catch (error) {
      console.error('Error creating knowledge source:', error);
      throw new Error('Failed to create knowledge source');
    }
  }

  async updateSource(request: UpdateKnowledgeSourceRequest, _userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.sourcesCollection, request.id);
      const updates: any = {
        updatedAt: Timestamp.now()
      };

      if (request.name !== undefined) updates.name = request.name;
      if (request.config !== undefined) updates.config = request.config;
      if (request.enabled !== undefined) updates.enabled = request.enabled;

      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating knowledge source:', error);
      throw new Error('Failed to update knowledge source');
    }
  }

  async deleteSource(sourceId: string): Promise<void> {
    try {
      // Delete all associated content first
      await this.deleteContentBySource(sourceId);
      
      // Delete the source
      await deleteDoc(doc(db, this.sourcesCollection, sourceId));
    } catch (error) {
      console.error('Error deleting knowledge source:', error);
      throw new Error('Failed to delete knowledge source');
    }
  }

  async getSource(sourceId: string): Promise<KnowledgeSource | null> {
    try {
      const docSnap = await getDoc(doc(db, this.sourcesCollection, sourceId));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as KnowledgeSource;
      }
      return null;
    } catch (error) {
      console.error('Error fetching knowledge source:', error);
      throw new Error('Failed to fetch knowledge source');
    }
  }

  async getAllSources(tenantId?: string): Promise<KnowledgeSource[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.sourcesCollection),
          where('tenantId', '==', tenantId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, this.sourcesCollection),
          orderBy('createdAt', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as KnowledgeSource));
    } catch (error) {
      console.error('Error fetching knowledge sources:', error);
      throw new Error('Failed to fetch knowledge sources');
    }
  }

  async getEnabledSources(tenantId?: string): Promise<KnowledgeSource[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.sourcesCollection),
          where('tenantId', '==', tenantId),
          where('enabled', '==', true),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, this.sourcesCollection),
          where('enabled', '==', true),
          orderBy('createdAt', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as KnowledgeSource));
    } catch (error) {
      console.error('Error fetching enabled knowledge sources:', error);
      throw new Error('Failed to fetch enabled knowledge sources');
    }
  }

  async updateSourceStatus(sourceId: string, status: KnowledgeSource['processingStatus'], error?: string): Promise<void> {
    try {
      const updates: any = {
        processingStatus: status,
        updatedAt: Timestamp.now()
      };

      if (status === 'completed') {
        updates.lastProcessed = Timestamp.now();
        updates.lastError = null;
      } else if (status === 'error' && error) {
        updates.lastError = error;
      }

      await updateDoc(doc(db, this.sourcesCollection, sourceId), updates);
    } catch (error) {
      console.error('Error updating source status:', error);
    }
  }

  // Content Management
  async saveProcessedContent(content: Omit<ProcessedContent, 'id' | 'processedAt'>, tenantId: string): Promise<string> {
    try {
      const processedContent: Omit<ProcessedContent, 'id'> = {
        ...content,
        tenantId,
        processedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.contentCollection), processedContent);
      
      // Update source stats
      await this.updateSourceStats(content.sourceId);
      
      return docRef.id;
    } catch (error) {
      console.error('Error saving processed content:', error);
      throw new Error('Failed to save processed content');
    }
  }

  async getContentBySource(sourceId: string, tenantId?: string, limitCount?: number): Promise<ProcessedContent[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.contentCollection),
          where('sourceId', '==', sourceId),
          where('tenantId', '==', tenantId),
          orderBy('processedAt', 'desc')
        );
      } else {
        q = query(
          collection(db, this.contentCollection),
          where('sourceId', '==', sourceId),
          orderBy('processedAt', 'desc')
        );
      }

      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProcessedContent));
    } catch (error) {
      console.error('Error fetching content by source:', error);
      throw new Error('Failed to fetch content by source');
    }
  }

  async deleteContentBySource(sourceId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.contentCollection),
        where('sourceId', '==', sourceId)
      );
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Also delete any storage files
      await this.deleteStorageBySource(sourceId);
    } catch (error) {
      console.error('Error deleting content by source:', error);
      throw new Error('Failed to delete content by source');
    }
  }

  private async updateSourceStats(sourceId: string): Promise<void> {
    try {
      const content = await this.getContentBySource(sourceId);
      const totalTokens = content.reduce((sum, item) => sum + item.tokenCount, 0);
      
      await updateDoc(doc(db, this.sourcesCollection, sourceId), {
        tokenCount: totalTokens,
        contentCount: content.length,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating source stats:', error);
    }
  }

  // Storage Management
  async uploadFile(file: File, sourceId: string, fileName?: string): Promise<string> {
    try {
      const finalFileName = fileName || file.name;
      const storageRef = ref(storage, `${this.storageBasePath}/${sourceId}/${finalFileName}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteStorageBySource(sourceId: string): Promise<void> {
    try {
      // Note: Firebase Storage doesn't have a direct way to delete folders
      // This would need to be implemented with Cloud Functions or by tracking files
      console.log(`Storage cleanup for source ${sourceId} should be handled by Cloud Functions`);
    } catch (error) {
      console.error('Error deleting storage by source:', error);
    }
  }

  // Knowledge Base Querying
  async queryKnowledgeBase(query: KnowledgeBaseQuery): Promise<KnowledgeBaseResponse> {
    try {
      let sources: KnowledgeSource[];
      
      if (query.selectedSources && query.selectedSources.length > 0) {
        // Get specific sources
        sources = await Promise.all(
          query.selectedSources.map(id => this.getSource(id))
        ).then(results => results.filter(source => source !== null) as KnowledgeSource[]);
      } else {
        // Get all enabled sources
        sources = await this.getEnabledSources();
      }

      if (sources.length === 0) {
        return {
          relevantContent: [],
          totalTokensUsed: 0,
          sourcesUsed: [],
          wasFiltered: false
        };
      }

      // Get content from all sources
      const allContent: ProcessedContent[] = [];
      for (const source of sources) {
        const content = await this.getContentBySource(source.id);
        allContent.push(...content);
      }

      // Apply token budget limits
      const maxTokens = query.maxTokens || 400000; // Default 400K
      let totalTokens = 0;
      const selectedContent: ProcessedContent[] = [];
      const usedSources = new Set<string>();

      // Sort content by relevance (this is a simple implementation)
      // In a more sophisticated version, you'd use semantic similarity
      const sortedContent = this.rankContentByRelevance(allContent, query.question);

      for (const content of sortedContent) {
        if (totalTokens + content.tokenCount <= maxTokens) {
          selectedContent.push(content);
          totalTokens += content.tokenCount;
          usedSources.add(content.sourceId);
        }
      }

      const wasFiltered = selectedContent.length < allContent.length;
      const availableSources = sources
        .filter(source => !usedSources.has(source.id))
        .map(source => source.id);

      return {
        relevantContent: selectedContent,
        totalTokensUsed: totalTokens,
        sourcesUsed: Array.from(usedSources),
        wasFiltered,
        suggestions: wasFiltered ? {
          tryWithMoreSources: true,
          availableSources
        } : undefined
      };
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      throw new Error('Failed to query knowledge base');
    }
  }

  private rankContentByRelevance(content: ProcessedContent[], question: string): ProcessedContent[] {
    const questionLower = question.toLowerCase();
    
    return content.sort((a, b) => {
      // Simple keyword-based ranking
      const aRelevance = this.calculateRelevanceScore(a, questionLower);
      const bRelevance = this.calculateRelevanceScore(b, questionLower);
      
      return bRelevance - aRelevance;
    });
  }

  private calculateRelevanceScore(content: ProcessedContent, questionLower: string): number {
    let score = 0;
    const contentLower = content.content.toLowerCase();
    const titleLower = content.title.toLowerCase();
    
    // Title matches are more important
    if (titleLower.includes(questionLower)) score += 10;
    
    // Content matches
    const questionWords = questionLower.split(/\s+/);
    for (const word of questionWords) {
      if (word.length > 2) { // Skip very short words
        if (titleLower.includes(word)) score += 3;
        if (contentLower.includes(word)) score += 1;
      }
    }
    
    return score;
  }

  // Processing methods
  async processSource(sourceId: string, userToken: string): Promise<{ success: boolean; message: string; contentCount?: number; tokenCount?: number }> {
    try {
      // Update status to processing first
      await this.updateSourceStatus(sourceId, 'processing');

      // Call the Cloud Function
      const response = await fetch(`${import.meta.env.VITE_FIREBASE_FUNCTIONS_URL}/processKnowledgeSource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ sourceId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        await this.updateSourceStatus(sourceId, 'error', errorData.message || 'Processing failed');
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        await this.updateSourceStatus(sourceId, 'completed');
        return {
          success: true,
          message: result.message,
          contentCount: result.contentCount,
          tokenCount: result.tokenCount
        };
      } else {
        await this.updateSourceStatus(sourceId, 'error', result.message);
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing source:', error);
      await this.updateSourceStatus(sourceId, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Utility methods
  estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async getSourcesByType(type: KnowledgeSourceType): Promise<KnowledgeSource[]> {
    try {
      const q = query(
        collection(db, this.sourcesCollection),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as KnowledgeSource));
    } catch (error) {
      console.error('Error fetching sources by type:', error);
      throw new Error('Failed to fetch sources by type');
    }
  }

  formatContentForAI(content: ProcessedContent[]): string {
    if (content.length === 0) return '';

    const sections = content.map((item, index) => {
      const sourceInfo = item.url ? ` (${item.url})` : '';
      const metadata = item.metadata ? ` [${item.metadata.type}]` : '';
      
      return `### Knowledge Base Item ${index + 1}: ${item.title}${sourceInfo}${metadata}

${item.summary || item.content}`;
    });

    return `## Knowledge Base Context

The following information from your knowledge base may be relevant to this question:

${sections.join('\n\n---\n\n')}

Use this information along with your general knowledge to provide accurate and helpful responses.`;
  }
}

// Export singleton instance
export const knowledgeBaseService = new KnowledgeBaseService();