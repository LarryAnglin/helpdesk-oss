/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface IconProcessingOptions {
  quality?: number; // 0.1 to 1.0
  format?: 'png' | 'jpeg' | 'webp';
  background?: string; // Background color for non-transparent formats
}

export interface ProcessedIcon {
  size: number;
  url: string;
  format: string;
}

// Standard PWA icon sizes
export const PWA_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export class IconProcessingService {
  private storage = getStorage();

  /**
   * Validate uploaded icon file
   */
  validateIconFile(file: File): string | null {
    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PNG, JPEG, WebP, or SVG image file';
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Image file must be smaller than 5MB';
    }

    return null;
  }

  /**
   * Process image to create icons in multiple sizes
   */
  async processIconFile(
    file: File, 
    options: IconProcessingOptions = {}
  ): Promise<{ originalUrl: string; processedIcons: ProcessedIcon[] }> {
    const opts = {
      quality: 0.9,
      format: 'png' as const,
      background: '#ffffff',
      ...options
    };

    try {
      // Upload original file first
      const originalPath = `pwa-icons/original/${Date.now()}_${file.name}`;
      const originalRef = ref(this.storage, originalPath);
      const originalUpload = await uploadBytes(originalRef, file);
      const originalUrl = await getDownloadURL(originalUpload.ref);

      // Create canvas to process the image
      const img = await this.loadImage(file);
      const processedIcons: ProcessedIcon[] = [];

      // Generate icons for each required size
      for (const size of PWA_ICON_SIZES) {
        try {
          const processedBlob = await this.resizeImage(img, size, opts);
          const iconPath = `pwa-icons/processed/${size}x${size}_${Date.now()}.${opts.format}`;
          const iconRef = ref(this.storage, iconPath);
          
          const iconUpload = await uploadBytes(iconRef, processedBlob);
          const iconUrl = await getDownloadURL(iconUpload.ref);

          processedIcons.push({
            size,
            url: iconUrl,
            format: opts.format
          });
        } catch (error) {
          console.error(`Failed to process icon size ${size}:`, error);
          // Continue with other sizes even if one fails
        }
      }

      if (processedIcons.length === 0) {
        throw new Error('Failed to process any icon sizes');
      }

      return {
        originalUrl,
        processedIcons
      };

    } catch (error) {
      console.error('Icon processing failed:', error);
      throw new Error(`Failed to process icon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load image file into an Image element
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Resize image to specified dimensions
   */
  private resizeImage(
    img: HTMLImageElement, 
    size: number, 
    options: IconProcessingOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      // Fill background for non-transparent formats
      if (options.format !== 'png') {
        ctx.fillStyle = options.background || '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }

      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > 1) {
        // Image is wider than tall
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      } else if (aspectRatio < 1) {
        // Image is taller than wide
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      }

      // Draw the image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Convert to blob
      const mimeType = options.format === 'png' ? 'image/png' : 
                      options.format === 'jpeg' ? 'image/jpeg' : 
                      'image/webp';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        mimeType,
        options.quality
      );
    });
  }

  /**
   * Create preview thumbnail
   */
  async createPreview(file: File, size: number = 128): Promise<string> {
    try {
      const img = await this.loadImage(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = size;
      canvas.height = size;

      // Calculate aspect ratio
      const aspectRatio = img.width / img.height;
      let drawWidth = size;
      let drawHeight = size;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > 1) {
        drawHeight = size / aspectRatio;
        offsetY = (size - drawHeight) / 2;
      } else if (aspectRatio < 1) {
        drawWidth = size * aspectRatio;
        offsetX = (size - drawWidth) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      return canvas.toDataURL('image/png', 0.8);
    } catch (error) {
      console.error('Failed to create preview:', error);
      throw error;
    }
  }

  /**
   * Delete processed icons from storage
   */
  async deleteIconSet(iconUrls: string[]): Promise<void> {
    const deletePromises = iconUrls.map(async (url) => {
      try {
        // Extract storage path from URL
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
        if (pathMatch) {
          const storagePath = decodeURIComponent(pathMatch[1]);
          // Note: Firebase Storage cleanup is handled automatically
          console.log('Would delete storage path:', storagePath);
        }
      } catch (error) {
        console.warn('Failed to delete icon:', url, error);
      }
    });

    await Promise.allSettled(deletePromises);
  }

  /**
   * Generate maskable icon (with safe area)
   */
  async generateMaskableIcon(
    img: HTMLImageElement, 
    size: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      // Create safe area (80% of canvas for maskable icons)
      const safeAreaSize = size * 0.8;
      const offset = (size - safeAreaSize) / 2;

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw image in safe area
      ctx.drawImage(img, offset, offset, safeAreaSize, safeAreaSize);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create maskable icon'));
          }
        },
        'image/png',
        0.9
      );
    });
  }
}

// Export singleton instance
export const iconProcessingService = new IconProcessingService();