<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Authentication Setup Complete

## ✅ What's Been Implemented

1. **Firebase Authentication**
   - Google Sign-In Only (no local accounts)
   - Domain restriction (only @your-domain.com and @your-domain.com emails)
   - Session management with cookies

2. **Auth Context (AuthContext.tsx)**
   - User state management
   - Role-based access control (user, tech, admin)
   - Token refresh functionality
   - Auto sign-out on session expiry

3. **Protected Routes**
   - All app routes require authentication
   - Role-based route protection
   - Automatic redirect to sign-in page

4. **Sign-In Page**
   - Google authentication only
   - Clean, simple interface
   - Error handling and user feedback
   - Domain validation

5. **Navbar Integration**
   - User profile display
   - Sign-out functionality
   - Role-based menu items (admin users see Users menu)

## 📝 Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Firebase configuration values to `.env`:
   ```
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
   VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net
   ```

## 🔐 Authentication Flow

1. User visits app → Redirected to `/signin` if not authenticated
2. User clicks "Sign in with Google" button
3. Google OAuth popup appears
4. Domain validation checks for @your-domain.com or @your-domain.com
5. User data fetched/created in Firestore
6. Auth token and role stored in cookies
7. User redirected to home page
8. Protected routes check authentication status

## 🎭 Role-Based Access

- **user**: Basic access to tickets and settings
- **tech**: Additional access to technical features
- **admin**: Full access including user management

## 🚪 Sign Out

Users can sign out by:
- Clicking the logout button in the user menu (top right)
- Session automatically expires after 1 hour
- Cookies are cleared on sign out

## 🔥 Firebase Integration

The app uses:
- Firebase Authentication for user management
- Firestore for user data storage
- Cloud Functions for user creation API

## 📱 Next Steps

To continue the migration, implement:
1. Connect ticket list to real Firestore data
2. Implement ticket create/edit forms
3. Add project management features
4. Implement user management (admin only)
5. Add search functionality with Algolia