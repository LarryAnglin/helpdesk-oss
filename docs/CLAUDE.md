<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
```bash
# Start React development server
cd react && npm run dev

# Start Firebase Functions locally
cd functions && npm run serve
```

### Testing
```bash
# Run all tests (if configured in React app)
cd react && npm test
```

### Building and Deployment
```bash
# Build React app
cd react && npm run build

# Deploy React app to Firebase Hosting
cd react && firebase deploy --only hosting

# Deploy Firebase Functions
cd functions && npm run deploy
```

### Code Quality
```bash
# Run linting
cd react && npm run lint
```

## Architecture Overview

This is a Help Desk ticketing system with two main components:

### 1. React Application (`/react`)
- SPA frontend using React Router and Vite
- Material UI and shadcn/ui components with Tailwind CSS
- Direct Firebase SDK integration
- Authentication via Firebase Auth with Google SSO
- File structure:
  - `src/components/` - Reusable React components
  - `src/pages/` - Route page components
  - `src/lib/firebase/` - Firebase service layers
  - `src/lib/auth/` - Authentication utilities and context

### 2. Firebase Cloud Functions (`/functions`)
- Express.js API endpoints with CORS support
- Handles email notifications via Mailgun/Nodemailer
- Algolia search indexing
- Webhook processing
- Key endpoints:
  - `/api/tickets` - Ticket CRUD operations
  - `/api/users` - User management
  - `/api/projects` - Project management
  - `/api/send-email` - Email notifications

## Key Integration Points

### Firebase Services
- **Firestore**: Document database for tickets, users, projects, tasks
- **Authentication**: Google SSO with domain restrictions
- **Storage**: File attachments for tickets
- **Functions**: Serverless backend API

### Search Integration
- Algolia search with automatic indexing
- Fallback search using Firestore queries
- Search service abstraction in `lib/algolia/`

### Email Notifications
- Triggered on ticket creation, updates, and replies
- Template-based emails in `lib/utils/emailTemplates.ts`
- Configurable SMTP or Mailgun transport

### State Management
- React Context for authentication (`AuthContext`)
- Theme context for dark/light mode
- Notification context for user feedback
- Config context for company settings

## Environment Configuration

Required environment variables are documented in `.env.local.example`. Key configurations:
- Firebase credentials (public and admin)
- SMTP/Mailgun settings for email
- Algolia search credentials
- Company customization settings

## Testing Strategy

- Jest with React Testing Library
- 70% coverage threshold requirement
- Test utilities in `lib/utils/testUtils.ts`
- Component tests alongside implementation files

## Deployment Modes

1. **Production Build**: Build React app for Firebase Hosting, use Cloud Functions for API
2. **Docker**: Containerized deployment with health checks

## Important Notes

- Always check existing patterns in similar files before implementing new features
- Firebase security rules are defined in `firestore.rules` and `storage.rules`
- CORS is pre-configured for cross-origin API access
- Email templates support both HTML and plain text formats
- Algolia indexing happens automatically via Cloud Functions triggers