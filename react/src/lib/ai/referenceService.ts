/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  query,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export interface AIReference {
  id?: string;
  title: string;
  type: 'json' | 'pdf' | 'url' | 'markdown';
  content: string;
  metadata?: Record<string, any>;
  originalFileName?: string;
  url?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

class AIReferenceService {
  private readonly COLLECTION_NAME = 'ai_references';

  async getAllReferences(): Promise<AIReference[]> {
    try {
      const referencesRef = collection(db, this.COLLECTION_NAME);
      
      // Try with orderBy first, fallback to simple query if it fails (e.g., empty collection)
      let snapshot;
      try {
        const q = query(referencesRef, orderBy('updatedAt', 'desc'));
        snapshot = await getDocs(q);
      } catch (orderError) {
        console.log('OrderBy query failed, falling back to simple query:', orderError);
        // Fallback to simple query without ordering
        snapshot = await getDocs(referencesRef);
      }

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AIReference));
    } catch (error) {
      console.error('Error fetching AI references:', error);
      throw new Error('Failed to fetch references');
    }
  }

  async addReference(reference: Omit<AIReference, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const referencesRef = collection(db, this.COLLECTION_NAME);
      const docRef = await addDoc(referencesRef, {
        ...reference,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('AI reference added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding AI reference:', error);
      throw new Error('Failed to add reference');
    }
  }

  async updateReference(id: string, updates: Partial<AIReference>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      console.log('AI reference updated:', id);
    } catch (error) {
      console.error('Error updating AI reference:', error);
      throw new Error('Failed to update reference');
    }
  }

  async deleteReference(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);

      console.log('AI reference deleted:', id);
    } catch (error) {
      console.error('Error deleting AI reference:', error);
      throw new Error('Failed to delete reference');
    }
  }

  // Extract text from PDF using PDF.js (client-side)
  async extractTextFromPDF(file: File): Promise<string> {
    try {
      // This would require pdf.js library
      // For now, return a placeholder since we don't want to add another dependency
      console.warn('PDF text extraction not implemented - returning placeholder');
      return `PDF content from ${file.name} (text extraction not yet implemented)`;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract PDF text');
    }
  }

  // Fetch and cache URL content
  async fetchURLContent(url: string): Promise<string> {
    try {
      // This would typically be done on the server side to avoid CORS issues
      // For now, return a placeholder
      console.warn('URL content fetching not implemented - returning placeholder');
      return `Content from ${url} (URL fetching not yet implemented)`;
    } catch (error) {
      console.error('Error fetching URL content:', error);
      throw new Error('Failed to fetch URL content');
    }
  }

  // Parse markdown content for AI consumption
  parseMarkdown(markdownContent: string): string {
    try {
      // Simple markdown-to-text parser that preserves structure for AI
      let parsed = markdownContent;

      // Convert headers to structured text
      parsed = parsed.replace(/^#{1}\s+(.+)$/gm, 'MAIN HEADING: $1\n');
      parsed = parsed.replace(/^#{2}\s+(.+)$/gm, 'SECTION: $1\n');
      parsed = parsed.replace(/^#{3,6}\s+(.+)$/gm, 'SUBSECTION: $1\n');

      // Convert lists to structured format
      parsed = parsed.replace(/^\s*[-*+]\s+(.+)$/gm, '• $1');
      parsed = parsed.replace(/^\s*\d+\.\s+(.+)$/gm, '1. $1');

      // Convert code blocks to readable format
      parsed = parsed.replace(/```(\w+)?\n([\s\S]*?)```/g, 'CODE EXAMPLE:\n$2\n');
      parsed = parsed.replace(/`([^`]+)`/g, 'CODE: $1');

      // Convert links to readable format
      parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 (Link: $2)');

      // Convert emphasis to readable format
      parsed = parsed.replace(/\*\*([^*]+)\*\*/g, 'IMPORTANT: $1');
      parsed = parsed.replace(/\*([^*]+)\*/g, 'EMPHASIS: $1');

      // Clean up excessive whitespace while preserving structure
      parsed = parsed.replace(/\n\s*\n\s*\n/g, '\n\n');
      parsed = parsed.trim();

      return parsed;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      // Return original content if parsing fails
      return markdownContent;
    }
  }

  // Validate JSON content
  validateJSON(content: string): { isValid: boolean; error?: string; parsedData?: any } {
    try {
      const parsedData = JSON.parse(content);
      return { isValid: true, parsedData };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON format'
      };
    }
  }

  // Format reference content for AI context
  formatForAI(references: AIReference[]): string {
    if (references.length === 0) {
      return '';
    }

    let context = '## Reference Information:\n\n';
    
    for (const ref of references) {
      context += `### ${ref.title} (${ref.type.toUpperCase()})\n`;
      
      if (ref.type === 'url' && ref.url) {
        context += `Source: ${ref.url}\n`;
      }
      
      if (ref.type === 'pdf' && ref.originalFileName) {
        context += `Original File: ${ref.originalFileName}\n`;
      }
      
      // Process content based on type
      let processedContent = ref.content;
      if (ref.type === 'markdown') {
        processedContent = this.parseMarkdown(ref.content);
      }
      
      context += `${processedContent}\n\n`;
      
      // Add metadata if available
      if (ref.metadata && Object.keys(ref.metadata).length > 0) {
        context += `Metadata: ${JSON.stringify(ref.metadata, null, 2)}\n\n`;
      }
    }

    return context;
  }
}

export const aiReferenceService = new AIReferenceService();