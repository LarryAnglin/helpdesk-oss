/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { PWASettings } from '../types/config';

export interface WebAppManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  orientation: string;
  scope: string;
  lang: string;
  categories: string[];
  icons: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface ManifestShortcut {
  name: string;
  short_name: string;
  description: string;
  url: string;
  icons: ManifestIcon[];
}

export class ManifestService {
  /**
   * Generate manifest.json content from PWA settings
   */
  generateManifest(settings: PWASettings): WebAppManifest {
    const icons = this.generateIconsArray(settings);
    const shortcuts = this.generateShortcuts(settings);

    return {
      name: settings.appName,
      short_name: settings.shortName,
      description: settings.description,
      start_url: '/',
      display: 'standalone',
      background_color: settings.backgroundColor,
      theme_color: settings.themeColor,
      orientation: 'portrait-primary',
      scope: '/',
      lang: 'en-US',
      categories: ['business', 'productivity', 'utilities'],
      icons,
      shortcuts
    };
  }

  /**
   * Generate icons array for manifest
   */
  private generateIconsArray(settings: PWASettings): ManifestIcon[] {
    const icons: ManifestIcon[] = [];
    
    // Standard icon sizes
    const standardSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    standardSizes.forEach(size => {
      const iconUrl = settings.generatedIcons?.[`${size}x${size}`];
      
      if (iconUrl) {
        icons.push({
          src: iconUrl,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'maskable any'
        });
      } else {
        // Fallback to default icon path
        icons.push({
          src: `/icons/icon-${size}.png`,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'maskable any'
        });
      }
    });

    return icons;
  }

  /**
   * Generate shortcuts for manifest
   */
  private generateShortcuts(settings: PWASettings): ManifestShortcut[] {
    const icon192 = settings.generatedIcons?.['192x192'] || '/icons/icon-192.png';
    
    return [
      {
        name: 'Create Ticket',
        short_name: 'New Ticket',
        description: 'Create a new support ticket',
        url: '/tickets/new',
        icons: [{
          src: icon192,
          sizes: '192x192',
          type: 'image/png'
        }]
      },
      {
        name: 'Self Help',
        short_name: 'AI Help',
        description: 'Get instant AI-powered help',
        url: '/self-help',
        icons: [{
          src: icon192,
          sizes: '192x192',
          type: 'image/png'
        }]
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View support dashboard',
        url: '/dashboard',
        icons: [{
          src: icon192,
          sizes: '192x192',
          type: 'image/png'
        }]
      }
    ];
  }

  /**
   * Update the manifest meta tag in document head
   */
  updateManifestMetaTags(settings: PWASettings): void {
    // Update theme color
    this.updateMetaTag('theme-color', settings.themeColor);
    
    // Update background color
    this.updateMetaTag('background-color', settings.backgroundColor);
    
    // Update app title
    document.title = settings.appName;
    
    // Update description
    this.updateMetaTag('description', settings.description);
    
    // Update Apple meta tags
    this.updateMetaTag('apple-mobile-web-app-title', settings.shortName);
    this.updateMetaTag('application-name', settings.shortName);
    
    // Update Microsoft tile color
    this.updateMetaTag('msapplication-TileColor', settings.themeColor);
    
    // Update Apple touch icons if custom icons are available
    if (settings.generatedIcons) {
      this.updateAppleTouchIcons(settings);
    }
  }

  /**
   * Update a meta tag value
   */
  private updateMetaTag(name: string, content: string): void {
    let metaTag = document.querySelector(`meta[name="${name}"]`) ||
                  document.querySelector(`meta[property="${name}"]`);
    
    if (metaTag) {
      metaTag.setAttribute('content', content);
    } else {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', name);
      metaTag.setAttribute('content', content);
      document.head.appendChild(metaTag);
    }
  }

  /**
   * Update Apple touch icons
   */
  private updateAppleTouchIcons(settings: PWASettings): void {
    // Remove existing apple-touch-icon links
    const existingIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
    existingIcons.forEach(icon => icon.remove());
    
    // Add new icons
    const iconSizes = [152, 180, 192];
    iconSizes.forEach(size => {
      const iconUrl = settings.generatedIcons![`${size}x${size}`] || 
                     settings.generatedIcons!['192x192'] ||
                     '/icons/icon-192.png';
      
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.setAttribute('sizes', `${size}x${size}`);
      link.href = iconUrl;
      document.head.appendChild(link);
    });
  }

  /**
   * Generate and serve dynamic manifest
   * This creates a blob URL for the manifest
   */
  createDynamicManifestUrl(settings: PWASettings): string {
    const manifest = this.generateManifest(settings);
    const manifestJson = JSON.stringify(manifest, null, 2);
    const blob = new Blob([manifestJson], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }

  /**
   * Update the manifest link in document head
   */
  updateManifestLink(settings: PWASettings): void {
    // Remove existing manifest link
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }
    
    // Create new manifest URL
    const manifestUrl = this.createDynamicManifestUrl(settings);
    
    // Add new manifest link
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestUrl;
    document.head.appendChild(link);
  }

  /**
   * Update all PWA metadata when settings change
   */
  updatePWAMetadata(settings: PWASettings): void {
    this.updateManifestMetaTags(settings);
    this.updateManifestLink(settings);
    
    // Notify service worker of manifest update
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MANIFEST_UPDATED',
        manifest: this.generateManifest(settings)
      });
    }
  }

  /**
   * Validate PWA settings
   */
  validateSettings(settings: PWASettings): string[] {
    const errors: string[] = [];
    
    if (!settings.appName || settings.appName.trim().length === 0) {
      errors.push('App name is required');
    }
    
    if (!settings.shortName || settings.shortName.trim().length === 0) {
      errors.push('Short name is required');
    }
    
    if (settings.shortName && settings.shortName.length > 12) {
      errors.push('Short name must be 12 characters or less');
    }
    
    if (!settings.description || settings.description.trim().length === 0) {
      errors.push('Description is required');
    }
    
    // Validate color formats
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (!colorRegex.test(settings.themeColor)) {
      errors.push('Theme color must be a valid hex color (e.g., #1976d2)');
    }
    
    if (!colorRegex.test(settings.backgroundColor)) {
      errors.push('Background color must be a valid hex color (e.g., #ffffff)');
    }
    
    return errors;
  }

  /**
   * Download manifest file
   */
  downloadManifest(settings: PWASettings, filename: string = 'manifest.json'): void {
    const manifest = this.generateManifest(settings);
    const manifestJson = JSON.stringify(manifest, null, 2);
    const blob = new Blob([manifestJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const manifestService = new ManifestService();