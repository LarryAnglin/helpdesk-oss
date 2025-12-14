<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Help Desk Ticketing System

A modern help desk ticketing system built with React (Vite), Firebase, and Material UI.

## Features

- User authentication with Google Single Sign-On (Firebase Auth)
- Automatic user account creation on first sign-in
- Ticket creation and management
- File attachments (images, videos, documents)
- Email notifications for ticket updates
- User management with role-based permissions
- Company settings and configuration

## Technology Stack

- **Frontend**:
  - React 19 with Vite
  - TypeScript
  - Material UI & shadcn/ui
  - TailwindCSS
  - React Router

- **Backend & Services**:
  - Firebase Authentication
  - Firestore Database
  - Firebase Storage
  - Firebase Functions
  - Google Pub/Sub for notifications

## Installation

1. Clone the repository
2. Navigate to the React app directory:
   ```bash
   cd react
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and fill in your Firebase configuration (use `VITE_` prefix for all variables)

## Development

Run the development server:

```bash
cd react
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

### Firestore Indexes

This application requires specific Firestore indexes to function properly. See [FIRESTORE_INDEXES.md](./FIRESTORE_INDEXES.md) for details on the required indexes.

To deploy the indexes to Firestore:

```bash
firebase deploy --only firestore:indexes
```

## Deployment

### Firebase Hosting with Cloud Functions

The application can be deployed to Firebase Hosting with Cloud Functions:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy using our script
./scripts/deploy.sh
```

Your application will be available at your Firebase Hosting URL:
`https://YOUR-PROJECT-ID.web.app`

### Production Build

Build the React application for production:

```bash
cd react
npm run build
```

The build output will be in the `react/dist` directory.

### Firebase Deployment

```bash
# Deploy the React app to Firebase Hosting
cd react
firebase deploy --only hosting

# Deploy Firebase Cloud Functions for API endpoints
cd ../functions
npm install
firebase deploy --only functions
```

See the [DEPLOY.md](DEPLOY.md) file for detailed deployment instructions and all available deployment options.

### Docker Deployment (Alternative)

The application can also be deployed using Docker:

```bash
docker-compose up -d
```

The Docker configuration includes:
- Multi-stage build for optimized image size
- Health check endpoint at `/api/health`
- Automatic container restarts
- Volume mapping for persistent data

## Project Structure

```
react/
├── src/
│   ├── components/       # React components
│   ├── pages/            # Route pages
│   ├── lib/              # Utility functions and libraries
│   │   ├── auth/         # Authentication utilities
│   │   ├── firebase/     # Firebase configuration
│   │   └── algolia/      # Search integration
│   └── App.tsx           # Main application component
├── public/               # Static assets
functions/
├── src/                  # Firebase Cloud Functions
│   ├── api.js            # Main API endpoints
│   ├── auth.js           # Authentication functions
│   └── ...               # Other function modules
```

## Environment Variables

The following environment variables are required:

```
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY=

# Authentication
ALLOWED_EMAIL_DOMAIN=

# Google Pub/Sub
GCP_PROJECT_ID=
PUBSUB_TOPIC_NAME=

# Email Configuration
SUPPORT_EMAIL=
SUPPORT_PHONE=

# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@example.com
SMTP_PASSWORD=your-smtp-password

# Application URL (used for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Company Configuration
COMPANY_NAME="Help Desk"
```

## Email Configuration

The system uses Nodemailer to send email notifications for ticket events:

1. When a new ticket is created
2. When a reply is added to a ticket
3. When a ticket status changes

To configure email sending:

1. Set the SMTP environment variables in your `.env.local` file:
   ```
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=false  # Use 'true' for SSL connections
   SMTP_USER=your-email@example.com
   SMTP_PASSWORD=your-password
   ```

2. Set the application URL for proper links in emails:
   ```
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. In development mode, if SMTP is not configured, emails will be simulated (logged to console but not sent).

## License

MIT