# Quick Start Guide

Get HelpDesk running in 10 minutes.

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Google account

## Step 1: Clone & Install

```bash
git clone https://github.com/LarryAnglin/helpdesk-oss.git
cd helpdesk-oss

# Install all dependencies
npm install
cd react && npm install && cd ..
cd functions && npm install && cd ..
```

## Step 2: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add Project** and follow the wizard
3. Enable **Firestore Database** (start in test mode for now)
4. Enable **Authentication** → Sign-in method → **Google**
5. Enable **Storage** (start in test mode)

## Step 3: Get Firebase Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, click the web icon `</>`
3. Register an app (any nickname)
4. Copy the config values

## Step 4: Configure Environment

```bash
# Copy example files
cp react/.env.example react/.env
```

Edit `react/.env` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Step 5: Connect Firebase CLI

```bash
firebase login
firebase use your-project-id
```

## Step 6: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage
```

## Step 7: Run Locally

```bash
cd react
npm run dev
```

Open http://localhost:5173 - you should see the login page.

## Step 8: First Login

1. Click **Sign in with Google**
2. You'll be the first user and automatically an admin
3. Complete the setup wizard

## What's Next?

- **Add Email**: See [docs/firebase-email-setup.md](docs/firebase-email-setup.md)
- **Add Search**: See [docs/ALGOLIA_SEARCH.md](docs/ALGOLIA_SEARCH.md)
- **Deploy**: See [docs/DEPLOY.md](docs/DEPLOY.md)
- **Add AI**: Get a [Gemini API key](https://makersuite.google.com) and add `VITE_GEMINI_API_KEY` to your .env

## Troubleshooting

### "Permission denied" errors
- Make sure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check you're signed in with the correct Google account

### "Module not found" errors
- Run `npm install` in both `react/` and `functions/` directories

### Can't sign in
- Verify Google sign-in is enabled in Firebase Console → Authentication
- Check your `VITE_FIREBASE_AUTH_DOMAIN` matches your project

## Need Help?

- Check the [docs/](docs/) folder for detailed guides
- Open an issue on GitHub
- Email: support@anglinai.com
