<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Test Email Notification System

This test script verifies that the Help Desk email notification system is working correctly.

## Prerequisites

1. Ensure you have the required dependencies:
   ```bash
   cd scripts
   npm install node-fetch
   ```

2. Make sure your Firebase Functions are running locally:
   ```bash
   cd functions
   npm run serve
   ```

## Running the Test

### Option 1: Test Against Local Functions (Recommended for Testing)

```bash
cd scripts
node test-email-notification.js
```

### Option 2: Test Against Production Functions

```bash
cd scripts
FUNCTIONS_URL=https://us-central1-your-project-id.cloudfunctions.net node test-email-notification.js
```

## What the Test Does

1. **Creates a test ticket** in Firestore with:
   - A test submitter email
   - larry@your-domain.com as the person having the problem
   - larry@your-domain.com also CC'd on the ticket

2. **Sends a test notification email** to larry@your-domain.com via the `/api/send-email` endpoint

3. **Cleans up** by deleting the test ticket

## Expected Result

You should receive an email at larry@your-domain.com with:
- Subject: "Re: Ticket #[ID] - Test Ticket for Email Notification"
- A formatted HTML email showing the test reply
- A link to view the ticket (though the ticket will be deleted by the time you click it)

## Troubleshooting

If the email doesn't arrive:

1. **Check Functions logs** for any errors:
   ```bash
   firebase functions:log
   ```

2. **Verify Mailgun configuration** in your Functions environment:
   - MAILGUN_API_KEY is set
   - MAILGUN_DOMAIN is correct
   - MAILGUN_FROM_EMAIL is valid

3. **Check spam folder** - test emails sometimes get filtered

4. **Verify service account** has proper permissions for Firestore

## Alternative: Direct Mailgun Test

If you want to test Mailgun directly without going through the full system:

```bash
curl -s --user 'api:YOUR_MAILGUN_API_KEY' \
  https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
  -F from='RCL Help Desk <helpdesk@mail.yourdomain.com>' \
  -F to='larry@your-domain.com' \
  -F subject='Direct Mailgun Test' \
  -F text='This is a direct test of Mailgun email delivery.'
```