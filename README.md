# HelpDesk

A modern, multi-tenant help desk and ticketing system built with React, Firebase, and AI-powered features.

## Overview

HelpDesk is a comprehensive support ticketing system designed for organizations that manage multiple clients or departments. Built with privacy and multi-tenancy at its core, it keeps each client's data completely separate while providing a unified management interface.

### Why HelpDesk?

> "Commercial options were either too expensive, wouldn't let me tailor them, or were just plain ugly."

HelpDesk was built by a developer who needed a customizable, self-hosted solution for managing support across multiple clients. It's designed for:

- **MSPs and IT Professionals** - Keep each client's tickets, history, and data separate
- **Agencies** - Manage support for multiple brands from one dashboard
- **Organizations** - Internal help desk with department isolation

## Features

### Core Functionality
- **Multi-tenant Architecture** - Complete data isolation between organizations
- **Ticket Management** - Create, assign, track, and resolve support tickets
- **Role-based Access Control** - Admin, agent, and user roles per organization
- **Email Integration** - Send and receive ticket updates via email
- **Search** - Full-text search powered by Algolia (with fallback)

### AI-Powered Features
- **Self-Help Assistant** - AI-powered answers using Google Gemini
- **Smart Suggestions** - Contextual help based on ticket content
- **Knowledge Base Integration** - AI learns from your documentation

### Notifications
- **Email Notifications** - Mailgun, SendGrid, or Amazon SES
- **SMS Notifications** - Twilio integration
- **Push Notifications** - Web push for real-time updates
- **Webhooks** - Integrate with external systems

### Additional Features
- **Survey System** - Collect feedback on ticket resolution
- **Escalation Engine** - Automatic ticket escalation rules
- **Bulk Operations** - Mass updates and imports
- **Export** - PDF and CSV export capabilities
- **API Access** - RESTful API for integrations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Material UI, Tailwind CSS |
| Backend | Firebase Cloud Functions, Node.js, Express |
| Database | Firestore |
| Search | Algolia |
| Auth | Firebase Authentication (Google SSO supported) |
| Storage | Firebase Cloud Storage |
| AI | Google Gemini API |
| Email | Mailgun / SendGrid / Amazon SES |
| SMS | Twilio |
| Payments | Stripe |
| Hosting | Firebase Hosting, Cloud Run, Docker |

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LarryAnglin/helpdesk-oss.git
   cd helpdesk-oss
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd react && npm install
   cd ../functions && npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   cp react/.env.example react/.env
   cp functions/.env.example functions/.env
   ```

4. **Set up Firebase**
   ```bash
   firebase login
   firebase use --add
   ```

5. **Configure your environment variables** (see [Configuration](#configuration))

6. **Deploy**
   ```bash
   npm run deploy
   ```

## Configuration

### Required Environment Variables

Create `.env` files based on the examples provided:

#### Frontend (`react/.env`)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_key

VITE_GEMINI_API_KEY=your_gemini_api_key
```

#### Backend (`functions/.env`)
```env
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_domain.com

# Or for SendGrid
SENDGRID_API_KEY=your_sendgrid_key

# Or for Amazon SES
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
```

### External Services Setup

1. **Firebase** - Create a project at [Firebase Console](https://console.firebase.google.com)
2. **Algolia** - Sign up at [Algolia](https://www.algolia.com) for search
3. **Email Service** - Choose Mailgun, SendGrid, or Amazon SES
4. **Twilio** (optional) - For SMS notifications
5. **Stripe** (optional) - For payment processing
6. **Google AI** - Get a Gemini API key from [Google AI Studio](https://makersuite.google.com)

## Project Structure

```
HelpDesk/
├── react/              # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities and services
│   │   └── context/    # React context providers
│   └── public/         # Static assets
├── functions/          # Firebase Cloud Functions
│   ├── src/            # Function implementations
│   └── __tests__/      # Unit tests
├── scripts/            # Utility scripts
├── docs/               # Documentation
├── firebase.json       # Firebase configuration
└── firestore.rules     # Firestore security rules
```

## Multi-Tenant Architecture

HelpDesk uses a multi-tenant architecture where:

- Each **Organization** is completely isolated
- Users can belong to multiple organizations with different roles
- Data is filtered at the database level using Firestore security rules
- Roles: `super_admin`, `system_admin`, `agent`, `user`

## Deployment

### Firebase Hosting (Recommended)

```bash
npm run build
firebase deploy
```

### Docker

```bash
docker-compose up -d
```

### Cloud Run

See [docs/DEPLOY.md](docs/DEPLOY.md) for Cloud Run deployment instructions.

## Documentation

Documentation is available in the `/docs` directory:

- [Quick Start Guide](QUICKSTART.md)
- [Firebase Setup](docs/FIREBASE_SETUP.md)
- [Email Configuration](docs/firebase-email-setup.md)
- [Algolia Search Setup](docs/ALGOLIA_SEARCH.md)
- [AI Self-Help System](docs/AI_SELF_HELP_SYSTEM.md)
- [Deployment Guide](docs/DEPLOY.md)
- [Docker Setup](docs/DOCKER.md)

## Services

Need help getting started? Professional services are available:

| Service | Description | Price |
|---------|-------------|-------|
| Setup & Configuration | Firebase setup, branding, initial configuration | $2,000 - $5,000 |
| Migration | Migrate from Zendesk, Freshdesk, or other systems | $5,000 - $20,000 |
| Managed Hosting | We host and manage your instance | $200 - $500/month |

Contact: services@anglinai.com

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `/docs` folder
- **Issues**: Open a GitHub issue
- **Email**: support@anglinai.com

## Acknowledgments

Built by [AnglinAI](https://anglinai.com) - AI-powered tools built to solve real problems.

---

**Note**: This is an open-source release. For the hosted version with additional features and support, visit [anglinai.com](https://anglinai.com).
