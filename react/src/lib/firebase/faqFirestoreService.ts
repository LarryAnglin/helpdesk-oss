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
  writeBatch,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { FAQ } from '../ai/faqService';

export interface FirestoreFAQ extends Omit<FAQ, 'lastUpdated'> {
  lastUpdated: Timestamp;
  createdAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export class FAQFirestoreService {
  private collectionName = 'faqs';

  // Convert Firestore document to FAQ interface
  private convertToFAQ(doc: any): FAQ {
    const data = doc.data();
    return {
      id: doc.id,
      category: data.category,
      questions: data.questions || [],
      answer: data.answer,
      keywords: data.keywords || [],
      priority: data.priority || 5,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      usage_count: data.usage_count || 0
    };
  }

  // Convert FAQ to Firestore document
  private convertToFirestore(faq: Partial<FAQ>, userId?: string): Partial<FirestoreFAQ> {
    const now = Timestamp.now();
    const result: any = {
      ...faq,
      lastUpdated: now
    };

    if (userId) {
      result.updatedBy = userId;
    }

    // Remove id if present (Firestore handles this)
    delete result.id;

    return result;
  }

  // Get all FAQs
  async getAllFAQs(tenantId?: string): Promise<FAQ[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.collectionName),
          where('tenantId', '==', tenantId),
          orderBy('lastUpdated', 'desc')
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          orderBy('lastUpdated', 'desc')
        );
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertToFAQ(doc));
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      throw new Error('Failed to fetch FAQs');
    }
  }

  // Get FAQs by category
  async getFAQsByCategory(category: string, tenantId?: string): Promise<FAQ[]> {
    try {
      let q;
      if (tenantId) {
        q = query(
          collection(db, this.collectionName),
          where('category', '==', category),
          where('tenantId', '==', tenantId)
        );
      } else {
        q = query(
          collection(db, this.collectionName),
          where('category', '==', category)
        );
      }
      const querySnapshot = await getDocs(q);
      const faqs = querySnapshot.docs.map(doc => this.convertToFAQ(doc));
      // Sort in memory by priority (descending)
      return faqs.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('Error fetching FAQs by category:', error);
      throw new Error(`Failed to fetch FAQs for category: ${category}`);
    }
  }

  // Get single FAQ by ID
  async getFAQById(id: string): Promise<FAQ | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertToFAQ(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error fetching FAQ by ID:', error);
      throw new Error(`Failed to fetch FAQ: ${id}`);
    }
  }

  // Create new FAQ
  async createFAQ(faq: Omit<FAQ, 'id' | 'lastUpdated'>, userId?: string, tenantId?: string): Promise<string> {
    try {
      const firestoreData = {
        ...this.convertToFirestore(faq, userId),
        createdAt: Timestamp.now(),
        createdBy: userId || 'system',
        tenantId,
        usage_count: 0
      };

      const docRef = await addDoc(collection(db, this.collectionName), firestoreData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating FAQ:', error);
      throw new Error('Failed to create FAQ');
    }
  }

  // Update existing FAQ
  async updateFAQ(id: string, updates: Partial<FAQ>, userId?: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const firestoreUpdates = this.convertToFirestore(updates, userId);
      
      await updateDoc(docRef, firestoreUpdates);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      throw new Error(`Failed to update FAQ: ${id}`);
    }
  }

  // Delete FAQ
  async deleteFAQ(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      throw new Error(`Failed to delete FAQ: ${id}`);
    }
  }

  // Batch create multiple FAQs (useful for migration)
  async batchCreateFAQs(faqs: Omit<FAQ, 'id' | 'lastUpdated'>[], userId?: string, tenantId?: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, this.collectionName);

      faqs.forEach(faq => {
        const docRef = doc(collectionRef);
        const firestoreData = {
          ...this.convertToFirestore(faq, userId),
          createdAt: Timestamp.now(),
          createdBy: userId || 'system',
          tenantId,
          usage_count: 0
        };
        batch.set(docRef, firestoreData);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error batch creating FAQs:', error);
      throw new Error('Failed to batch create FAQs');
    }
  }

  // Get all categories
  async getCategories(tenantId?: string): Promise<string[]> {
    try {
      let querySnapshot;
      if (tenantId) {
        const q = query(
          collection(db, this.collectionName),
          where('tenantId', '==', tenantId)
        );
        querySnapshot = await getDocs(q);
      } else {
        querySnapshot = await getDocs(collection(db, this.collectionName));
      }
      const categories = new Set<string>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categories.add(data.category);
        }
      });
      
      return Array.from(categories).sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  // Increment usage count
  async incrementUsageCount(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentCount = docSnap.data().usage_count || 0;
        await updateDoc(docRef, {
          usage_count: currentCount + 1,
          lastUpdated: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Don't throw error for usage count - it's not critical
    }
  }

  // Real-time listener for FAQs
  onFAQsChange(callback: (faqs: FAQ[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName),
      orderBy('priority', 'desc'),
      orderBy('category', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const faqs = querySnapshot.docs.map(doc => this.convertToFAQ(doc));
      callback(faqs);
    }, (error) => {
      console.error('Error in FAQ listener:', error);
    });
  }

  // Search FAQs by text
  async searchFAQs(searchText: string): Promise<FAQ[]> {
    try {
      // Note: Firestore doesn't have full-text search built-in
      // This is a basic implementation - for production, consider using Algolia or similar
      const allFAQs = await this.getAllFAQs();
      const searchLower = searchText.toLowerCase();
      
      return allFAQs.filter(faq => 
        faq.questions.some(q => q.toLowerCase().includes(searchLower)) ||
        faq.answer.toLowerCase().includes(searchLower) ||
        faq.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
        faq.category.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching FAQs:', error);
      throw new Error('Failed to search FAQs');
    }
  }
}

// Export singleton instance
export const faqFirestoreService = new FAQFirestoreService();