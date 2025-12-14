/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import chroma from 'chroma-js';

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  onPrimary: string;
  onPrimaryLight: string;
  onPrimaryDark: string;
  surface: string;
  surfaceVariant: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  warning: string;
  onWarning: string;
  success: string;
  onSuccess: string;
}

export interface DynamicTheme {
  light: ColorPalette;
  dark: ColorPalette;
}

/**
 * Check if a color meets WCAG contrast requirements
 */
export function hasGoodContrast(
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const contrast = chroma.contrast(foreground, background);
  return level === 'AA' ? contrast >= 4.5 : contrast >= 7;
}

/**
 * Get the best contrasting text color (black or white) for a background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const bgColor = chroma(backgroundColor);
  const whiteContrast = chroma.contrast('#ffffff', bgColor);
  const blackContrast = chroma.contrast('#000000', bgColor);
  
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

/**
 * Get a text color that meets WCAG AA standards
 */
export function getAccessibleTextColor(
  backgroundColor: string,
  preferredColor?: string
): string {
  const bgColor = chroma(backgroundColor);
  
  // If a preferred color is provided and it has good contrast, use it
  if (preferredColor && hasGoodContrast(preferredColor, backgroundColor)) {
    return preferredColor;
  }
  
  // Otherwise, use high-contrast black or white
  const whiteContrast = chroma.contrast('#ffffff', bgColor);
  const blackContrast = chroma.contrast('#000000', bgColor);
  
  if (whiteContrast >= 4.5) return '#ffffff';
  if (blackContrast >= 4.5) return '#000000';
  
  // Fallback: return the higher contrast option even if it doesn't meet AA
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

/**
 * Generate a light mode color palette from a primary color
 */
export function generateLightPalette(primaryColor: string): ColorPalette {
  const primary = chroma(primaryColor);
  
  // Primary variations
  const primaryLight = primary.brighten(1.5).hex();
  const primaryDark = primary.darken(1.5).hex();
  
  // Text colors on primary
  const onPrimary = getAccessibleTextColor(primaryColor);
  const onPrimaryLight = getAccessibleTextColor(primaryLight);
  const onPrimaryDark = getAccessibleTextColor(primaryDark);
  
  // Surface colors (very light tints)
  const surface = primary.set('hsl.s', 0.1).set('hsl.l', 0.98).hex();
  const surfaceVariant = primary.set('hsl.s', 0.15).set('hsl.l', 0.94).hex();
  
  // Text colors on surfaces
  const onSurface = '#1a1a1a';
  const onSurfaceVariant = '#4a4a4a';
  
  // Outline colors
  const outline = primary.set('hsl.s', 0.3).set('hsl.l', 0.7).hex();
  const outlineVariant = primary.set('hsl.s', 0.2).set('hsl.l', 0.85).hex();
  
  // State colors
  const error = '#d32f2f';
  const onError = getAccessibleTextColor(error);
  const warning = '#f57c00';
  const onWarning = getAccessibleTextColor(warning);
  const success = '#388e3c';
  const onSuccess = getAccessibleTextColor(success);
  
  return {
    primary: primaryColor,
    primaryLight,
    primaryDark,
    onPrimary,
    onPrimaryLight,
    onPrimaryDark,
    surface,
    surfaceVariant,
    onSurface,
    onSurfaceVariant,
    outline,
    outlineVariant,
    error,
    onError,
    warning,
    onWarning,
    success,
    onSuccess,
  };
}

/**
 * Generate a dark mode color palette from a primary color
 */
export function generateDarkPalette(primaryColor: string): ColorPalette {
  const primary = chroma(primaryColor);
  
  // Adjust primary for dark mode (slightly brighter/more saturated)
  const adjustedPrimary = primary.set('hsl.l', Math.max(0.5, primary.get('hsl.l'))).hex();
  
  // Primary variations
  const primaryLight = chroma(adjustedPrimary).brighten(0.8).hex();
  const primaryDark = chroma(adjustedPrimary).darken(0.8).hex();
  
  // Text colors on primary
  const onPrimary = getAccessibleTextColor(adjustedPrimary);
  const onPrimaryLight = getAccessibleTextColor(primaryLight);
  const onPrimaryDark = getAccessibleTextColor(primaryDark);
  
  // Surface colors (dark with slight tint)
  const surface = primary.set('hsl.s', 0.1).set('hsl.l', 0.08).hex();
  const surfaceVariant = primary.set('hsl.s', 0.15).set('hsl.l', 0.12).hex();
  
  // Text colors on surfaces
  const onSurface = '#e0e0e0';
  const onSurfaceVariant = '#b0b0b0';
  
  // Outline colors
  const outline = primary.set('hsl.s', 0.3).set('hsl.l', 0.4).hex();
  const outlineVariant = primary.set('hsl.s', 0.2).set('hsl.l', 0.25).hex();
  
  // State colors (adjusted for dark mode)
  const error = '#f44336';
  const onError = getAccessibleTextColor(error);
  const warning = '#ff9800';
  const onWarning = getAccessibleTextColor(warning);
  const success = '#4caf50';
  const onSuccess = getAccessibleTextColor(success);
  
  return {
    primary: adjustedPrimary,
    primaryLight,
    primaryDark,
    onPrimary,
    onPrimaryLight,
    onPrimaryDark,
    surface,
    surfaceVariant,
    onSurface,
    onSurfaceVariant,
    outline,
    outlineVariant,
    error,
    onError,
    warning,
    onWarning,
    success,
    onSuccess,
  };
}

/**
 * Generate a complete dynamic theme from a primary color
 */
export function generateDynamicTheme(primaryColor: string): DynamicTheme {
  return {
    light: generateLightPalette(primaryColor),
    dark: generateDarkPalette(primaryColor),
  };
}

/**
 * Validate that a color string is valid
 */
export function isValidColor(color: string): boolean {
  try {
    chroma(color);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a readable color name for display
 */
export function getColorName(color: string): string {
  try {
    const c = chroma(color);
    const hsl = c.hsl();
    const hue = Math.round(hsl[0] || 0);
    const saturation = Math.round((hsl[1] || 0) * 100);
    const lightness = Math.round((hsl[2] || 0) * 100);
    
    // Basic hue names
    const hueNames: Record<number, string> = {
      0: 'Red', 30: 'Orange', 60: 'Yellow', 120: 'Green',
      180: 'Cyan', 240: 'Blue', 270: 'Purple', 300: 'Magenta'
    };
    
    // Find closest hue name
    const hueKeys = Object.keys(hueNames).map(Number).sort((a, b) => Math.abs(hue - a) - Math.abs(hue - b));
    const closestHue = hueKeys[0];
    const hueName = hueNames[closestHue];
    
    // Add descriptors based on saturation and lightness
    let descriptor = '';
    if (lightness > 80) descriptor = 'Light ';
    else if (lightness < 30) descriptor = 'Dark ';
    
    if (saturation < 20) descriptor += 'Gray';
    else descriptor += hueName;
    
    return descriptor;
  } catch {
    return 'Unknown';
  }
}

/**
 * Convert hex color to CSS custom property format
 */
export function hexToHsl(hex: string): string {
  try {
    const [h, s, l] = chroma(hex).hsl();
    return `${Math.round(h || 0)} ${Math.round((s || 0) * 100)}% ${Math.round((l || 0) * 100)}%`;
  } catch {
    return '0 0% 50%';
  }
}

/**
 * Popular color presets for quick selection
 */
export const COLOR_PRESETS = [
  { name: 'Blue', color: '#2563eb', description: 'Professional and trustworthy' },
  { name: 'Green', color: '#059669', description: 'Natural and calming' },
  { name: 'Purple', color: '#7c3aed', description: 'Creative and modern' },
  { name: 'Red', color: '#dc2626', description: 'Bold and energetic' },
  { name: 'Orange', color: '#ea580c', description: 'Warm and friendly' },
  { name: 'Teal', color: '#0d9488', description: 'Fresh and professional' },
  { name: 'Indigo', color: '#4338ca', description: 'Deep and sophisticated' },
  { name: 'Pink', color: '#db2777', description: 'Playful and vibrant' },
  { name: 'Gray', color: '#6b7280', description: 'Clean and monochrome' },
] as const;