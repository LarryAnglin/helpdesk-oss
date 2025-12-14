<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# PWA Icons Required

This directory should contain the following icon files for the PWA to work properly:

## Required Icon Sizes
- `icon-72.png` (72x72) - Android launcher icon
- `icon-96.png` (96x96) - Android launcher icon
- `icon-128.png` (128x128) - Chrome Web Store
- `icon-144.png` (144x144) - Windows tile
- `icon-152.png` (152x152) - iPad touch icon
- `icon-192.png` (192x192) - Android Chrome icon
- `icon-384.png` (384x384) - Splash screen
- `icon-512.png` (512x512) - High-res icon

## Shortcut Icons
- `ticket-192.png` (192x192) - Create ticket shortcut
- `ai-192.png` (192x192) - AI help shortcut  
- `dashboard-192.png` (192x192) - Dashboard shortcut

## Design Guidelines
- Use a simple, recognizable design
- Ensure good contrast and visibility at small sizes
- Consider using the help desk/support theme (e.g., headset, ticket, chat bubble)
- Make sure icons work well on both light and dark backgrounds
- Use PNG format with transparency if needed

## Maskable Icons
All icons should be designed to work as "maskable" icons, meaning they can be cropped to different shapes (circle, square, rounded square) while maintaining their visual integrity.

## Tool Recommendations
- Use tools like https://realfavicongenerator.net/ to generate all required sizes
- Or create a single high-res (1024x1024) icon and use online tools to resize
- Ensure consistent branding across all icon sizes

## Current Status
⚠️ **Placeholder icons needed** - The manifest.json references these icons but they don't exist yet. The PWA will still work but won't have proper icons until these are created.