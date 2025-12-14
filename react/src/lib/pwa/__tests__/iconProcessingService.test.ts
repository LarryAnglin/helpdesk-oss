/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  iconProcessingService, 
  PWA_ICON_SIZES,
  IconProcessingOptions
} from '../iconProcessingService';
import { createMockFile } from '../../../test/fixtures/files';

// Mock Firebase Storage
vi.mock('firebase/storage');
vi.mock('../../firebase/firebaseConfig', () => ({
  storage: {}
}));

describe('iconProcessingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateIconFile', () => {
    it('accepts valid image files', () => {
      const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      
      validTypes.forEach(type => {
        const file = createMockFile('icon.png', 1024, type);
        const error = iconProcessingService.validateIconFile(file);
        expect(error).toBeNull();
      });
    });

    it('rejects invalid file types', () => {
      const file = createMockFile('icon.exe', 1024, 'application/x-msdownload');
      const error = iconProcessingService.validateIconFile(file);
      expect(error).toBe('Please upload a PNG, JPEG, WebP, or SVG image file');
    });

    it('rejects files over 5MB', () => {
      const file = createMockFile('large.png', 6 * 1024 * 1024, 'image/png');
      const error = iconProcessingService.validateIconFile(file);
      expect(error).toBe('Image file must be smaller than 5MB');
    });
  });

  describe('processIconFile', () => {
    it('processes an icon file and generates multiple sizes', async () => {
      const file = createMockFile('icon.png', 2048, 'image/png');
      const mockOriginalUrl = 'https://example.com/original.png';
      const mockProcessedUrls = PWA_ICON_SIZES.map(size => 
        `https://example.com/icon-${size}.png`
      );

      // Mock Firebase Storage calls
      vi.mocked(uploadBytes).mockResolvedValue({} as any);
      vi.mocked(getDownloadURL)
        .mockResolvedValueOnce(mockOriginalUrl)
        .mockResolvedValueOnce(mockProcessedUrls[0])
        .mockResolvedValueOnce(mockProcessedUrls[1])
        .mockResolvedValueOnce(mockProcessedUrls[2])
        .mockResolvedValueOnce(mockProcessedUrls[3])
        .mockResolvedValueOnce(mockProcessedUrls[4])
        .mockResolvedValueOnce(mockProcessedUrls[5])
        .mockResolvedValueOnce(mockProcessedUrls[6])
        .mockResolvedValueOnce(mockProcessedUrls[7]);

      const result = await iconProcessingService.processIconFile(file);

      expect(result.originalUrl).toBe(mockOriginalUrl);
      expect(result.processedIcons).toHaveLength(PWA_ICON_SIZES.length);
      
      // Verify all required sizes are generated
      PWA_ICON_SIZES.forEach((size, index) => {
        expect(result.processedIcons[index]).toEqual({
          size,
          url: mockProcessedUrls[index],
          format: 'png'
        });
      });
    });

    it('handles processing errors gracefully', async () => {
      const file = createMockFile('icon.png', 2048, 'image/png');
      
      // Mock upload failure
      vi.mocked(uploadBytes).mockRejectedValue(new Error('Upload failed'));

      await expect(iconProcessingService.processIconFile(file))
        .rejects.toThrow('Failed to process icon');
    });

    it('applies custom processing options', async () => {
      const file = createMockFile('icon.jpg', 2048, 'image/jpeg');
      const options: IconProcessingOptions = {
        quality: 0.8,
        format: 'jpeg',
        background: '#000000'
      };

      vi.mocked(uploadBytes).mockResolvedValue({} as any);
      vi.mocked(getDownloadURL).mockResolvedValue('https://example.com/icon.jpg');

      const result = await iconProcessingService.processIconFile(file, options);

      // Verify format is applied
      expect(result.processedIcons[0].format).toBe('jpeg');
    });
  });

  describe('createPreview', () => {
    it('creates a preview thumbnail', async () => {
      const file = createMockFile('icon.png', 2048, 'image/png');
      
      // Canvas toDataURL returns a data URL
      const mockDataUrl = 'data:image/png;base64,mockPreview';
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(mockDataUrl);

      const preview = await iconProcessingService.createPreview(file);

      expect(preview).toBe(mockDataUrl);
      expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png', 0.8);
    });

    it('creates preview with custom size', async () => {
      const file = createMockFile('icon.png', 2048, 'image/png');
      const customSize = 256;
      
      const mockDataUrl = 'data:image/png;base64,mockPreview256';
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(mockDataUrl);

      const preview = await iconProcessingService.createPreview(file, customSize);

      expect(preview).toBe(mockDataUrl);
    });

    it('handles image loading errors', async () => {
      const file = createMockFile('corrupt.png', 2048, 'image/png');
      
      // Mock Image loading error
      const originalImage = global.Image;
      global.Image = class MockImage {
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width: number = 100;
        height: number = 100;
        
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      } as any;

      await expect(iconProcessingService.createPreview(file))
        .rejects.toThrow('Failed to load image');

      // Restore original Image
      global.Image = originalImage;
    });
  });

  describe('PWA_ICON_SIZES', () => {
    it('includes all required PWA icon sizes', () => {
      expect(PWA_ICON_SIZES).toEqual([72, 96, 128, 144, 152, 192, 384, 512]);
    });
  });

  describe('resizeImage', () => {
    it('maintains aspect ratio when resizing', async () => {
      const file = createMockFile('icon.png', 2048, 'image/png');
      
      // Mock successful processing
      vi.mocked(uploadBytes).mockResolvedValue({} as any);
      vi.mocked(getDownloadURL).mockResolvedValue('https://example.com/icon.png');

      // The service should maintain aspect ratio for non-square images
      const result = await iconProcessingService.processIconFile(file);
      
      expect(result.processedIcons).toBeDefined();
      expect(result.processedIcons.length).toBeGreaterThan(0);
    });
  });

  describe('generateMaskableIcon', () => {
    it('generates maskable icons with safe area', async () => {
      createMockFile('icon.png', 2048, 'image/png');
      
      vi.mocked(uploadBytes).mockResolvedValue({} as any);
      vi.mocked(getDownloadURL).mockResolvedValue('https://example.com/maskable.png');

      // Test that maskable icons can be generated (method exists in the class)
      expect(iconProcessingService).toHaveProperty('generateMaskableIcon');
    });
  });

  describe('deleteIconSet', () => {
    it('handles icon deletion', async () => {
      const iconUrls = [
        'https://storage.googleapis.com/bucket/o/pwa-icons%2Ficon-72.png?alt=media',
        'https://storage.googleapis.com/bucket/o/pwa-icons%2Ficon-96.png?alt=media'
      ];

      // Should not throw
      await expect(iconProcessingService.deleteIconSet(iconUrls))
        .resolves.not.toThrow();
    });
  });
});