<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

 For the Help Desk application to function properly with the default Firestore database, you need to create the following
  collections:

  1. users Collection
    - Contains user documents with user information
    - Each document ID is the Firebase Auth UID
    - Created automatically when a user signs in for the first time
    - Fields include:
        - uid: String - User's Firebase Auth UID
      - email: String - User's email address
      - displayName: String - User's display name
      - photoURL: String (optional) - URL to user's profile picture
      - role: String - User's role (one of: "user", "tech", "admin")
      - createdAt: Number - Timestamp of when the user was created
  2. tickets Collection
    - Contains ticket documents for the help desk
    - Each document has a generated ID
    - Fields include:
        - title: String - Title of the ticket
      - description: String - Detailed description of the issue
      - priority: String - Priority level (one of: "Low", "Medium", "High", "Urgent")
      - status: String - Current status (one of: "Open", "In Progress", "Waiting for Info", "Resolved", "Closed")
      - location: String - Where the issue is happening
      - isOnVpn: Boolean - Whether the user is on VPN
      - computer: String - User's computer/device information
      - attachments: Array - List of file attachments
      - participants: Array - List of users participating in the ticket
      - submitterId: String - UID of the user who created the ticket
      - replies: Array - List of replies/comments on the ticket
      - createdAt: Number - Timestamp of when the ticket was created
      - updatedAt: Number - Timestamp of when the ticket was last updated
      - resolvedAt: Number (optional) - Timestamp of when the ticket was resolved
  3. settings Collection
    - Contains application-wide configuration settings
    - Should have a document with ID "appConfig"
    - Fields include:
        - companyName: String - Name of the company
      - companyLogo: String (optional) - URL to company logo
      - supportEmail: String - Support email address
      - supportPhone: String - Support phone number
      - priorityOptions: Array of Strings - Available priority options
      - locationOptions: Array of Strings - Available location options
      - statusOptions: Array of Strings - Available status options

  You don't need to manually create these collections in advance - the application is designed to create them as needed:

  1. The users collection is created when the first user signs in
  2. The tickets collection is created when the first ticket is submitted
  3. The settings collection's "appConfig" document is created with default values if it doesn't exist

  However, you should manually create the "appConfig" document in the settings collection with your specific company
  information:

  // Example document for settings/appConfig
  {
    "companyName": "RCL Help Desk",
    "supportEmail": "your-email@example.com",
    "supportPhone": "512 222 8925",
    "priorityOptions": ["Low", "Medium", "High", "Urgent"],
    "locationOptions": ["RCL", "RCL-EH", "My Home", "Other"],
    "statusOptions": ["Open", "In Progress", "Waiting for Info", "Resolved", "Closed"]
  }

  If you want to create an admin user, you'll need to:
  1. Sign in with Google using your admin email
  2. Find your user document in the users collection
  3. Change the role field from "user" to "admin"

  This will give you access to the admin features of the application, such as user management and configuration settings.

╭────────────────────────────────────────────────────────────────