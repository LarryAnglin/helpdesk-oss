# Help Desk Setup Guide

This guide will help you set up your own instance of the Help Desk application.

## Quick Start

### Option 1: Guided Setup (Recommended)

1. **Deploy the application**:
   ```bash
   git clone https://github.com/your-org/helpdesk.git
   cd helpdesk
   ```

2. **Configure Firebase**:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable the following services:
     - Authentication (with Google provider)
     - Firestore Database
     - Cloud Storage
     - Cloud Functions
     - Hosting

3. **Initial deployment**:
   ```bash
   # Install dependencies
   npm install
   cd react && npm install && cd ..
   cd functions && npm install && cd ..
   
   # Login to Firebase
   firebase login
   
   # Set your project
   firebase use your-project-id
   
   # Deploy
   npm run deploy
   ```

4. **Complete setup**:
   - Open your deployed application
   - Sign in with a Google account from your allowed domain
   - The Setup Wizard will automatically appear
   - Follow the guided setup process

### Option 2: Manual Configuration

1. **Environment Configuration**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your Firebase configuration
   nano .env
   ```

2. **Use the setup script** (cross-platform support):
   The guided setup wizard generates scripts for both Linux/Mac and Windows.
   
   **Linux/Mac (Bash):**
   ```bash
   # Make script executable and run
   chmod +x setup.sh
   ./setup.sh
   ```
   
   **Windows (Batch):**
   ```cmd
   # Run directly in Command Prompt
   setup.bat
   ```
   
   **Or configure manually:**
   ```bash
   # Install email extension
   firebase ext:install firebase/firestore-send-email --auto-approve
   
   # VAPID key (required for push notifications)
   firebase functions:config:set vapid.key="your-vapid-public-key"
   
   # Optional: Default email sender
   firebase functions:config:set email.sender="Help Desk <noreply@yourapp.com>"
   
   # Optional: Algolia search
   firebase functions:config:set \
     algolia.app_id="your-app-id" \
     algolia.admin_key="your-admin-key" \
     algolia.search_key="your-search-key"
   
   # Optional: Google Gemini AI
   firebase functions:config:set gemini.api_key="your-gemini-api-key"
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## Required Services

### Firebase Services
- **Firestore Database**: User data, tickets, configuration
- **Authentication**: Google OAuth sign-in
- **Cloud Storage**: File attachments
- **Cloud Functions**: Backend API and automation
- **Hosting**: Web application hosting

### External Services
- **Firebase Extensions**: Email notifications via Trigger Email extension (required)
- **VAPID Keys**: Push notifications (required)
- **Algolia**: Search functionality (optional)
- **Google Gemini**: AI assistant features (optional)

## Configuration Details

### Firebase Configuration
Get from Firebase Console → Project Settings → Your apps:
```javascript
{
  "apiKey": "...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}
```

### Email Setup (Firebase Extensions)
1. The setup script automatically installs the Trigger Email extension
2. Go to Firebase Console → Extensions → Trigger Email
3. Configure your preferred email provider:
   - **SendGrid** (recommended): Sign up at https://sendgrid.com
   - **Mailgun**: Use existing account at https://mailgun.com
   - **SMTP**: Use any SMTP provider (Gmail, Outlook, etc.)
4. Test email functionality from your app

### VAPID Keys
1. Generate at https://web-push-codelab.glitch.me/
2. Use the **public key** in your .env file
3. Use the **private key** in Firebase Functions config

### Optional Services

#### Algolia Search
1. Create account at https://www.algolia.com
2. Get your App ID and API keys
3. Configure in Firebase Functions

#### Google Gemini AI
1. Get API key from https://aistudio.google.com/app/apikey
2. Configure in both .env and Functions config

## Docker Deployment

For a containerized deployment:

1. **Copy Docker template**:
   ```bash
   cp docker-compose.yml.example docker-compose.yml
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d
   ```

## Firestore Security Rules

The application includes pre-configured security rules. Key points:

- Users can only access their own tickets
- Admins have full access
- Tech users can access assigned tickets
- Configuration is admin-only

## Troubleshooting

### Setup Wizard Not Appearing
- Check browser console for errors
- Verify Firebase configuration
- Ensure you're signed in as an admin user

### Email Notifications Not Working
- Check Firebase Extensions configuration in Firebase Console
- Verify email provider settings (SendGrid, Mailgun, SMTP)
- Check Functions logs: `firebase functions:log`
- Ensure email extension is properly installed

### Push Notifications Not Working
- Verify VAPID keys are configured
- Check browser permissions
- Ensure service worker is registered

### Search Not Working
- Verify Algolia configuration
- Check that indices are created
- Ensure search API key has correct permissions

## System Health

Once deployed, you can monitor system health:

1. Go to Settings → System Health (admin only)
2. Check service status
3. Run tests for each component
4. View detailed error messages

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Functions logs
3. Check browser console for client-side errors
4. Create an issue on GitHub

## Security Notes

- Never commit .env files or API keys to version control
- Use Firebase Functions config for all sensitive data
- Regularly rotate API keys
- Monitor Firebase usage and billing
- Keep dependencies updated

## Development Mode

For local development:
```bash
# Start Firebase emulators
firebase emulators:start

# Start development server
cd react
npm run dev
```

The setup wizard includes development-only features like reset options when running locally.

dd1e12