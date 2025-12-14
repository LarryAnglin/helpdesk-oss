<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Help Desk Deployment Guide

This document provides comprehensive instructions for deploying and using the Help Desk ticketing system. Follow these steps to get your application up and running in various environments.

## Prerequisites

Before you begin, ensure you have the following:

- Node.js (v20.x or higher)
- npm (v10.x or higher)
- Git
- Firebase account with a configured project
- Docker and Docker Compose (for containerized deployment)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HelpDesk
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.local.example .env.local
```

Edit the `.env.local` file with your Firebase and application settings:

```
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # JSON string of your service account key

# Authentication
ALLOWED_EMAIL_DOMAIN=your-company.com # Optional: restrict Google sign-ins to specific domain

# Company Configuration
COMPANY_NAME="Your Help Desk"
SUPPORT_EMAIL=support@your-company.com
SUPPORT_PHONE="+1 (123) 456-7890"
```

### 3. Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication with Google sign-in method
3. Create a Firestore database in production mode
4. Set up Firebase Storage
5. Generate a service account key from Project Settings > Service Accounts > Generate new private key
6. Copy the contents of the service account JSON file into the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable

## Deployment Options

### Option 1: Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Option 2: Production Build (Node.js Server)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the production server:
   ```bash
   npm run start
   ```

4. Access the application at [http://localhost:3000](http://localhost:3000)

### Option 3: Docker Deployment

1. Build and run the Docker container using Docker Compose:
   ```bash
   docker-compose up -d
   ```

2. Access the application at [http://localhost:3000](http://localhost:3000)

3. Check container health:
   ```bash
   docker-compose ps
   ```

4. View logs:
   ```bash
   docker-compose logs -f
   ```

5. Stop the container:
   ```bash
   docker-compose down
   ```

### Option 4: Cloud Deployment

#### Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. For production deployment:
   ```bash
   vercel --prod
   ```

#### Firebase Hosting Deployment with Functions

We've set up a special deployment configuration that uses Firebase Hosting with Cloud Functions to serve the Next.js application:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Deploy using our deployment script:
   ```bash
   ./scripts/deploy.sh
   ```

This script will:
- Build the Next.js application with standalone output
- Prepare static assets for deployment
- Install dependencies in the functions directory
- Deploy Firebase Functions, Hosting, Storage rules, and Firestore rules

Your application will be available at your Firebase Hosting URL:
`https://YOUR-PROJECT-ID.web.app`

#### Firebase Hosting with Static Export

For deployments where you want to use Firebase Hosting without Cloud Functions:

1. Generate a static export:
   ```bash
   npm run build:static
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

The static export will be generated in the `out` directory and then deployed to Firebase Hosting.

**Notes for Static Export:**
- API Routes, middleware, and server components will not be available in static exports
- Authentication works, but you may encounter CORS issues when testing locally
- When testing locally (e.g., using `serve -s out`), Firestore operations will be blocked by CORS
- Always test on the actual deployed Firebase Hosting URL where CORS is properly configured

## Initial Configuration

After deployment, follow these steps to set up your Help Desk:

1. **Create Admin User**:
   - Sign in with Google using an email from your allowed domain (the first user to sign in)
   - Access the Firebase Console
   - Navigate to Firestore Database
   - Find the user document in the `users` collection
   - Change the `role` field to `admin`

   Note: User accounts are automatically created on first Google sign-in, with the default role of "user"

2. **Configure Application Settings**:
   - Sign in as an admin user
   - Navigate to the Settings page
   - Configure company information, ticket categories, priorities, and other settings

## User Management

### Adding Users

1. Sign in as an admin user
2. Navigate to the Users page
3. Click "Add User"
4. Fill in the user details and select a role
5. Save the new user

### User Roles

- **User**: Can create and view their own tickets
- **Tech**: Can view and respond to all tickets, but cannot modify settings
- **Admin**: Full access to all features, including settings and user management

## Ticket Management Workflow

1. **Create a Ticket**:
   - User signs in and clicks "New Ticket"
   - User fills out the ticket form with details and attachments
   - User submits the ticket

2. **Process a Ticket** (Tech/Admin):
   - Tech/Admin views the ticket list
   - Tech/Admin selects a ticket to work on
   - Tech/Admin updates the ticket status and adds replies
   - System sends notifications to the user about updates

3. **Resolve a Ticket**:
   - Tech/Admin updates the ticket status to "Resolved"
   - User can reopen the ticket if needed, or it can be closed

## Monitoring and Maintenance

### Health Checks

The application includes a health check endpoint at `/api/health` that returns a 200 OK status when the application is running correctly. You can use this endpoint for monitoring with services like Uptime Robot, New Relic, or Datadog.

### Logs

- **Docker Deployment**: Logs are available in the `logs` directory mounted as a volume
- **Vercel/Firebase**: Use their respective dashboards to view logs

### Backups

1. **Database Backup**:
   - Use Firebase Console to export Firestore data regularly
   - Set up scheduled exports using the Firebase Admin SDK

2. **File Backup**:
   - Firebase Storage files should be backed up using Google Cloud Storage tools

## Troubleshooting

### Common Issues

1. **Authentication Problems**:
   - Verify Firebase Auth configuration
   - Check allowed domains settings

2. **Missing Environment Variables**:
   - Ensure all required environment variables are properly set

3. **Docker Container Crashes**:
   - Check Docker logs: `docker-compose logs`
   - Verify environment variable configuration

4. **Performance Issues**:
   - Check Firebase usage quotas
   - Consider upgrading Firebase plan if necessary

### Getting Help

If you encounter issues not covered in this guide:

1. Check the application logs
2. Review Firebase documentation
3. Submit an issue on the project repository

## Security Considerations

1. **API Key Protection**:
   - All Firebase client keys are inherently public but protected by Firebase Security Rules
   - Service account key must be kept secure

2. **Data Protection**:
   - Firestore Rules are configured to protect data based on user roles
   - File access is restricted based on ticket and user associations

3. **Deploying Security Rules**:
   - The application includes security rules for both Firestore and Storage
   - Deploy Firestore rules:
     ```bash
     firebase deploy --only firestore:rules
     ```
   - Deploy Storage rules:
     ```bash
     firebase deploy --only storage:rules
     ```
   - **Important**: For Storage rules to properly check user roles, you need to set up Firebase Auth Custom Claims. Create a Cloud Function with admin privileges to sync user roles:

     ```javascript
     // Example Cloud Function to set custom claims when user roles change
     exports.syncUserClaims = functions.firestore
       .document('users/{userId}')
       .onWrite(async (change, context) => {
         const userId = context.params.userId;
         const userData = change.after.exists ? change.after.data() : null;
         
         if (!userData) return null; // User was deleted
         
         // Set custom claims with user role
         await admin.auth().setCustomUserClaims(userId, {
           role: userData.role
         });
         
         return null;
       });
     ```

4. **Regular Updates**:
   - Keep dependencies updated: `npm audit` and `npm update`
   - Review and update Firebase Security Rules as needed

## Upgrading

To upgrade to a new version of the Help Desk application:

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Rebuild the application:
   ```bash
   npm run build
   ```

4. Redeploy using your chosen deployment method