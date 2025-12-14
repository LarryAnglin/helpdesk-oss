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
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebaseConfig';
import { CommonSolution, CreateCommonSolutionRequest, UpdateCommonSolutionRequest } from '../types/commonSolutions';

const COLLECTION_NAME = 'commonSolutions';

/**
 * Get all active common solutions ordered by order field
 */
export const getActiveCommonSolutions = async (): Promise<CommonSolution[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const solutions: CommonSolution[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      solutions.push({
        id: doc.id,
        title: data.title,
        link: data.link || '',
        inlineText: data.inlineText,
        isActive: data.isActive,
        order: data.order,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    return solutions;
  } catch (error) {
    console.error('Error fetching active common solutions:', error);
    throw error;
  }
};

/**
 * Get all common solutions (for admin interface)
 */
export const getAllCommonSolutions = async (): Promise<CommonSolution[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('order', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const solutions: CommonSolution[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      solutions.push({
        id: doc.id,
        title: data.title,
        link: data.link || '',
        inlineText: data.inlineText,
        isActive: data.isActive,
        order: data.order,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      });
    });

    return solutions;
  } catch (error) {
    console.error('Error fetching all common solutions:', error);
    throw error;
  }
};

/**
 * Create a new common solution
 */
export const createCommonSolution = async (request: CreateCommonSolutionRequest): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be authenticated to create common solutions');
  }
  
  try {
    const docData: any = {
      title: request.title,
      link: request.link || '',
      isActive: request.isActive ?? true,
      order: request.order ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.uid
    };

    if (request.inlineText) {
      docData.inlineText = request.inlineText;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);

    return docRef.id;
  } catch (error) {
    console.error('Error creating common solution:', error);
    throw error;
  }
};

/**
 * Update a common solution
 */
export const updateCommonSolution = async (request: UpdateCommonSolutionRequest): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be authenticated to update common solutions');
  }
  
  try {
    const docRef = doc(db, COLLECTION_NAME, request.id);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (request.title !== undefined) updateData.title = request.title;
    if (request.link !== undefined) updateData.link = request.link;
    if (request.inlineText !== undefined) updateData.inlineText = request.inlineText;
    if (request.isActive !== undefined) updateData.isActive = request.isActive;
    if (request.order !== undefined) updateData.order = request.order;
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating common solution:', error);
    throw error;
  }
};

/**
 * Delete a common solution
 */
export const deleteCommonSolution = async (id: string): Promise<void> => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be authenticated to delete common solutions');
  }
  
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting common solution:', error);
    throw error;
  }
};

/**
 * Get a single common solution by ID
 */
export const getCommonSolution = async (id: string): Promise<CommonSolution | null> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        link: data.link || '',
        inlineText: data.inlineText,
        isActive: data.isActive,
        order: data.order,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching common solution:', error);
    throw error;
  }
};