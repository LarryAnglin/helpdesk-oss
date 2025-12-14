 Twilio Campaign Registry Form - Recommended Responses

  Basic Campaign Information

  - Campaign Name: "Help Desk Support Notifications"
  - Campaign Description: "SMS notifications for IT support ticket updates including status
  changes, assignments, and resolutions for help desk customers"
  - Campaign Type: "Customer Care" or "Customer Service"
  - Message Flow: "Two-Way" (supports START/STOP commands)

  Use Case Category

  - Primary Category: "Customer Care"
  - Sub-category: "Account Notifications" or "Service Updates"

  Message Content & Templates

  - Sample Message 1: "TechCorp Help Desk: Reply START to receive updates for ticket #12345.
  Message and data rates may apply. Reply STOP to opt out anytime."
  - Sample Message 2: "TechCorp Support: Ticket #12345 updated - Status: In Progress. Technician
  assigned. Reply STOP to opt out."
  - Sample Message 3: "TechCorp Support: Ticket #12345 resolved! Check your email for details.
  Reply STOP to unsubscribe."

  Opt-In Process

  - Opt-In Method: "Website/Application" + "SMS Keyword"
  - Opt-In Description: "Users enable SMS in help desk preferences, then confirm consent
  per-ticket when creating support requests. Users reply START to activate notifications."
  - Opt-In Flow: "Double opt-in: 1) User enables SMS in account preferences 2) User opts-in for
  specific ticket 3) System sends confirmation SMS 4) User replies START"

  Opt-Out Process

  - Opt-Out Keywords: "STOP, UNSUBSCRIBE, END, CANCEL, QUIT, OPTOUT"
  - Opt-Out Response: "You've been unsubscribed from TechCorp Help Desk SMS updates. No more
  messages will be sent. Contact mailto:support@company.com for support."

  Help Keywords

  - Help Keywords: "HELP, INFO, SUPPORT"
  - Help Response: "TechCorp Help Desk SMS: Updates for support tickets. Reply START to subscribe,
   STOP to unsubscribe. Contact: mailto:support@company.com"

  Message Frequency

  - Expected Volume: "1-5 messages per ticket (creation, updates, resolution)"
  - Frequency: "Event-driven - only when ticket status changes"
  - Peak Times: "Business hours (8 AM - 6 PM)"

  Content Compliance

  - Brand Name: "Always included in every message"
  - Opt-Out Language: "Reply STOP to opt out" in all messages
  - Contact Information: "Support email included in help/opt-out messages"
  - Message & Data Rates: "Disclosed in opt-in messages"

  Target Audience

  - Audience: "B2B customers who submit IT support tickets"
  - Geographic Region: "United States"
  - Age Range: "18+ (business users)"

  Business Purpose

  - Primary Purpose: "Transactional notifications for customer service tickets"
  - Business Relationship: "Existing customers using help desk services"
  - Value Proposition: "Real-time updates on support ticket progress improving customer service
  experience"

  Technical Implementation

  - Platform: "Custom web application with Firebase backend"
  - Integration: "Twilio SDK"
  - Consent Storage: "Firebase Firestore with timestamp logging"
  - Keyword Processing: "Automated via webhook"

  The key to approval is demonstrating that your system:
  1. ✅ Has clear business purpose (customer service)
  2. ✅ Uses proper double opt-in process
  3. ✅ Includes required compliance language
  4. ✅ Handles all mandatory keywords (START/STOP/HELP)
  5. ✅ Maintains consent records
  6. ✅ Only sends transactional, relevant messages

  Your implementation meets all these requirements and should be approved by the Campaign
  Registry.

  You're right - they need to be able to verify your opt-in process since they can't access your
  actual application. Here's how to address their CTA (Call to Action) verification requirements:

  Documentation Package for Campaign Registry

  1. Screenshot Documentation Needed

  Create these screenshots from your actual application:

  A. User Preferences SMS Setup:
  - Screenshot of the User Preferences dialog with SMS settings
  - Show the two-step opt-in explanation text
  - Highlight the phone number input field
  - Show the compliance notice about message rates

  B. Ticket Creation SMS Opt-in:
  - Screenshot of ticket creation form
  - Show the SMS checkbox that appears only after global SMS is enabled
  - Show the explanatory text about per-ticket consent

  C. SMS Consent Flow:
  - Screenshot of the info alert when SMS is not enabled
  - Show the guidance text directing users to enable SMS in preferences

  2. Detailed CTA Documentation

  Primary CTA Location: User Account Preferences
  Path: User clicks avatar → "User Preferences" → "SMS Notifications" accordion
  CTA Text: "Enable SMS Notifications" toggle switch
  Supporting Text: "Two-Step SMS Opt-in: You must first enable SMS notifications here, then opt-in
   for individual tickets when creating them. This ensures compliance with SMS regulations."

  Secondary CTA Location: Ticket Creation Form
  Path: Create New Ticket page → SMS Updates checkbox (only visible if global SMS enabled)
  CTA Text: "I want to receive SMS updates for this ticket"
  Supporting Text: "Reply START to the SMS you receive to confirm subscription. Message and data
  rates may apply."

  3. Complete Opt-in Flow Documentation

  Step 1: Global SMS Enable
  - User navigates to User Preferences
  - Enables "SMS Notifications" toggle
  - Enters phone number
  - Sees compliance disclosure
  - Saves preferences

  Step 2: Per-Ticket Consent
  - User creates new ticket
  - Checks "SMS updates" checkbox (only visible if Step 1 completed)
  - Submits ticket

  Step 3: SMS Confirmation
  - System sends: "YourCompany Help Desk: Reply START to receive updates for ticket #12345.
  Message and data rates may apply. Reply STOP to opt out anytime."
  - User replies "START"
  - System confirms: "You're now subscribed to SMS updates for YourCompany Help Desk tickets.
  Reply STOP anytime to unsubscribe."

  4. Alternative Documentation Methods

  Since they can't access your live site, provide:

  A. Video Walkthrough:
  - Record screen capture showing complete opt-in process
  - Upload to YouTube as unlisted video
  - Provide link in campaign submission

  B. Static Demo Screenshots:
  - Use your staging/demo environment
  - Create sample user account
  - Document each step with annotated screenshots

  C. Code Documentation:
  - Provide excerpts from your UserPreferences.tsx showing the opt-in UI
  - Include SMS compliance text from your code
  - Show the conditional logic for displaying SMS checkbox

  5. Revised Campaign Submission

  CTA Description Field:
  "Two-step SMS opt-in process:
  1) Users access SMS settings via Account Preferences (avatar menu → User Preferences → SMS
  Notifications)
  2) Users enable global SMS notifications and enter phone number with compliance disclosure
  3) When creating support tickets, users can opt-in for SMS updates (checkbox only visible if
  global SMS enabled)
  4) System sends confirmation SMS requiring START reply to activate
  5) All messages include STOP opt-out and company contact information

  Documentation: [Include links to screenshots/video]"

  Opt-in Method:
  - Select "Website/Application Interface"
  - Add detailed description of the two-location process
  - Include that final confirmation requires SMS keyword response

  6. Supporting Evidence Package

  Create a document with:
  - Page 1: Screenshot of User Preferences SMS section
  - Page 2: Screenshot of ticket creation form with SMS checkbox
  - Page 3: Screenshot of SMS compliance notices
  - Page 4: Mock SMS conversation showing START/STOP flow
  - Page 5: Code snippets showing compliance text

  The key is proving your opt-in process is:
  1. Accessible - Users can find the SMS settings
  2. Clear - Purpose and costs are disclosed
  3. Consensual - Requires deliberate action at two points
  4. Compliant - Includes all required disclosures

  Would you like me to help you create specific screenshots or documentation text for any of these
   elements?
