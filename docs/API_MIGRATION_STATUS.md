<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# API Migration Status

## Migrated API Endpoints

We have successfully migrated the following API endpoints from Next.js API routes to Firebase Cloud Functions:

| Status | Next.js API Route | Firebase Function Endpoint |
|--------|-------------------|----------------------------|
| ✅ | `/api/auth-status` | `/api/auth-status` |
| ✅ | `/api/send-email` | `/api/send-email` |
| ✅ | `/api/export-data` | `/api/export-data` |
| ✅ | `/api/health` | `/api/health` |
| ✅ | `/api/verify-token` | `/api/verify-token` |
| ✅ | `/api/auth/refresh-token` | `/api/auth/refresh-token` |
| ✅ | `/api/users` | `/api/users` |
| ✅ | `/api/users/reset-password` | `/api/users/reset-password` |

## Updated Client Components

We have updated the following client components to use the new API endpoints:

| Status | Component/Service | Notes |
|--------|------------------|-------|
| ✅ | `src/lib/notifications/emailService.ts` | Updated to use the new API configuration |
| ✅ | `src/components/export/DataExport.tsx` | Updated to use the new API with authentication |
| ✅ | `src/lib/firebase/userClientService.ts` | Updated all user management functions to use new API endpoints |
| ✅ | `src/lib/auth/AuthContext.tsx` | Updated token refresh functionality |
| ❌ | Convert server components to client components | Remaining components still need to be updated |

## Next Steps

1. **Deploy Firebase Functions**:
   ```bash
   firebase deploy --only functions
   ```

2. **Update Next.js Configuration**:
   - To enable static export mode, update `next.config.js`:
   ```javascript
   output: 'export',
   images: {
     unoptimized: true,
   }
   ```

3. **Update Dynamic Routes**:
   - Either implement `generateStaticParams()` for dynamic routes like `/tickets/[id]`
   - Or convert them to use client-side data fetching

4. **Build and Deploy Static Site**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Remaining Work

1. Convert server components to client components
2. Handle dynamic routes
3. Configure and test static export
4. Handle client-side authentication flow
5. Update middleware.ts for static site compatibility
6. Test API functionality and authentication