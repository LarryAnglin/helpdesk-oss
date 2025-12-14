/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { TicketAttachment } from '../types/ticket';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface FileUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

const DEFAULT_OPTIONS: FileUploadOptions = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ]
};

export class FileUploadService {
  private storage = getStorage();

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: FileUploadOptions = {}): string | null {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check file size
    if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
      const maxSizeMB = opts.maxSizeBytes / (1024 * 1024);
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`;
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.scr', '.vbs', '.js', '.jar'];
    const fileName = file.name.toLowerCase();
    if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
      return 'This file type is not allowed for security reasons';
    }

    return null;
  }

  /**
   * Generate optimized filename for storage
   */
  private generateStoragePath(ticketId: string, originalFilename: string, tenantId?: string): string {
    // Remove special characters and spaces
    const sanitizedName = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_');
    
    // Add timestamp to prevent collisions
    const timestamp = Date.now();
    const extension = sanitizedName.split('.').pop();
    const nameWithoutExt = sanitizedName.replace(`.${extension}`, '');
    
    // Include tenant isolation in path
    const basePath = tenantId ? `tenants/${tenantId}/tickets` : 'tickets';
    return `${basePath}/${ticketId}/attachments/${timestamp}_${nameWithoutExt}.${extension}`;
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(
    file: File, 
    ticketId: string, 
    tenantId?: string,
    options: FileUploadOptions = {}
  ): Promise<TicketAttachment> {
    // Validate file
    const validationError = this.validateFile(file, options);
    if (validationError) {
      throw new Error(validationError);
    }

    try {
      // Generate storage path
      const storagePath = this.generateStoragePath(ticketId, file.name, tenantId);
      const storageRef = ref(this.storage, storagePath);

      // Upload file
      const uploadResult = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Create attachment object
      const attachment: TicketAttachment = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename: file.name,
        fileUrl: downloadURL,
        contentType: file.type,
        size: file.size,
        uploadedAt: Date.now()
      };

      return attachment;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[], 
    ticketId: string, 
    tenantId?: string,
    options: FileUploadOptions = {}
  ): Promise<TicketAttachment[]> {
    const attachments: TicketAttachment[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const attachment = await this.uploadFile(file, ticketId, tenantId, options);
        attachments.push(attachment);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${file.name}: ${errorMessage}`);
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    if (errors.length > 0 && attachments.length === 0) {
      throw new Error(`All uploads failed:\n${errors.join('\n')}`);
    }

    if (errors.length > 0) {
      console.warn(`Some uploads failed:\n${errors.join('\n')}`);
    }

    return attachments;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract storage path from URL
      const url = new URL(fileUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (!pathMatch) {
        throw new Error('Invalid file URL format');
      }
      
      const storagePath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(this.storage, storagePath);
      
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Check if file is an image
   */
  isImage(file: File | TicketAttachment): boolean {
    const contentType = 'type' in file ? file.type : file.contentType;
    return contentType.startsWith('image/');
  }

  /**
   * Create image thumbnail URL for display
   */
  createImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isImage(file)) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate thumbnail dimensions (max 200x200)
          const maxSize = 200;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();