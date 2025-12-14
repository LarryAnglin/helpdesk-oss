# SendGrid Email Service Setup

This guide explains how to configure SendGrid as your email provider for the Help Desk system.

## Overview

SendGrid is a cloud-based email delivery platform with excellent deliverability rates and comprehensive analytics. The system supports both outbound emails (notifications) and inbound emails (email replies to tickets).

## Prerequisites

- SendGrid account (free tier available at https://sendgrid.com)
- Firebase project with Functions enabled
- Domain configured for sending emails

## Setup Steps

### 1. Create SendGrid Account and API Key

1. **Sign up** for SendGrid at https://sendgrid.com
2. **Verify your account** via the confirmation email
3. **Create an API Key**:
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name: `helpdesk-api-key`
   - Select "Full Access" or configure specific permissions:
     - Mail Send: Full Access
     - Inbound Parse: Full Access
   - Copy and save the API key securely (you won't be able to see it again)

### 2. Configure Firebase Secrets

Add your SendGrid API key as a Firebase secret:

```bash
# Set the SendGrid API key
firebase functions:secrets:set SENDGRID_API_KEY

# When prompted, paste your SendGrid API key
```

Alternatively, configure via Google Cloud Console:
1. Go to Google Cloud Console > Secret Manager
2. Create secret: `SENDGRID_API_KEY`
3. Paste your SendGrid API key as the value

### 3. Domain Authentication

#### Option A: Using SendGrid Domain (Recommended for Testing)

SendGrid provides a shared domain for immediate sending. No additional configuration needed, but emails will be sent from `@sendgrid.net`.

#### Option B: Using Your Own Domain (Recommended for Production)

1. **In SendGrid Dashboard**:
   - Go to Settings > Sender Authentication
   - Click "Authenticate Your Domain"
   - Enter your domain (e.g., `mail.your-domain.com`)
   - Follow the DNS configuration steps

2. **Add DNS Records** to your domain:
   - Add the provided CNAME records for domain authentication
   - Wait for DNS propagation (can take up to 48 hours)
   - Verify in SendGrid dashboard

3. **Verify Domain**:
   - Return to SendGrid dashboard
   - Click "Verify" on your domain
   - Status should change to "Verified"

### 4. Configure Inbound Parse (Email Replies)

To allow customers to reply to ticket emails:

1. **In SendGrid Dashboard**:
   - Go to Settings > Inbound Parse
   - Click "Add Host & URL"

2. **Configure Parse Settings**:
   - **Subdomain**: `ticket-reply` (or your preferred subdomain)
   - **Domain**: Your verified domain (e.g., `mail.your-domain.com`)
   - **Destination URL**: Your Firebase Function URL
     ```
     https://us-central1-<your-project-id>.cloudfunctions.net/sendgridWebhook
     ```
   - **Check**: "POST the raw, full MIME message"
   - Click "Add"

3. **Add MX Record** to your DNS:
   ```
   Host: ticket-reply.mail.your-domain.com
   Type: MX
   Priority: 10
   Value: mx.sendgrid.net
   ```

### 5. Set Email Provider in Firebase

Use the admin settings UI or run the script:

```bash
node scripts/set-email-provider.js sendgrid
```

Or directly in Firestore:
```javascript
// In Firestore console, create/update:
// Collection: config
// Document ID: email
// Fields:
{
  provider: "sendgrid",
  updatedAt: <timestamp>,
  updatedBy: "admin"
}
```

### 6. Deploy Functions

Deploy the updated Firebase Functions with SendGrid support:

```bash
cd functions
firebase deploy --only functions:sendgridWebhook,functions:api
```

### 7. Test the Setup

#### Test Outbound Email

1. Create a test ticket through the web interface
2. Check that you receive the ticket notification email
3. Verify the email:
   - Comes from your configured sender address
   - Has proper reply-to address (`ticket-<ID>-reply@mail.your-domain.com`)
   - Subject includes `[TICKET-XXXXXX]` format

#### Test Inbound Email (Replies)

1. Reply to a ticket notification email
2. Check Firebase Functions logs:
   ```bash
   firebase functions:log --only sendgridWebhook
   ```
3. Verify the reply appears in the ticket

### 8. Configure Webhook Verification (Optional but Recommended)

For additional security, set up webhook verification:

1. **Generate a verification key**:
   ```bash
   openssl rand -base64 32
   ```

2. **Set as Firebase secret**:
   ```bash
   firebase functions:secrets:set SENDGRID_WEBHOOK_VERIFICATION_KEY
   # Paste the generated key
   ```

3. **Update SendGrid Inbound Parse**:
   - Go to Settings > Inbound Parse
   - Edit your parse configuration
   - Add the verification key

## Configuration Files

### Email Format

Emails sent via SendGrid will include:

- **From**: Your configured sender email
- **Reply-To**: Unique per-ticket address (`ticket-<shortId>-reply@mail.your-domain.com`)
- **Subject**: `[TICKET-<shortId>] <ticket title>`
- **Body**: HTML and plain text versions

### Supported Features

SendGrid integration supports:

- ✅ Outbound ticket notifications
- ✅ Inbound email replies
- ✅ Email attachments (up to 50MB)
- ✅ HTML and plain text emails
- ✅ CC and BCC recipients
- ✅ Custom reply-to addresses
- ✅ Email tracking and analytics (via SendGrid dashboard)

## Monitoring and Analytics

### SendGrid Dashboard

Monitor email deliverability:
- Activity Feed: Real-time email activity
- Stats: Delivery rates, opens, clicks
- Suppressions: Bounces, blocks, spam reports

### Firebase Functions Logs

Monitor webhook processing:

```bash
# View recent logs
firebase functions:log --only sendgridWebhook

# View specific timeframe
firebase functions:log --only sendgridWebhook --since 1h

# Follow logs in real-time
firebase functions:log --only sendgridWebhook --limit 50
```

## Troubleshooting

### Emails Not Sending

1. **Check API Key**:
   ```bash
   # Verify secret exists
   firebase functions:secrets:access SENDGRID_API_KEY
   ```

2. **Check SendGrid Dashboard**:
   - Go to Activity Feed
   - Look for failed sends
   - Check error messages

3. **Verify Domain Authentication**:
   - Ensure domain is verified in SendGrid
   - Check DNS records are correct

### Email Replies Not Working

1. **Verify MX Record**:
   ```bash
   nslookup -type=MX ticket-reply.mail.your-domain.com
   ```
   Should return: `mx.sendgrid.net`

2. **Check Function URL**:
   - Ensure webhook URL is correct in SendGrid
   - Test function is accessible:
     ```bash
     curl -X POST https://us-central1-<project>.cloudfunctions.net/sendgridWebhook
     ```
   - Should return "Method not allowed" or similar (not 404)

3. **Check Function Logs**:
   ```bash
   firebase functions:log --only sendgridWebhook
   ```

### Common Issues

**Issue**: "Could not extract short ID from email"
- **Solution**: Ensure reply-to address format is correct in outbound emails
- Check ticket notification has proper `[TICKET-XXXXXX]` in subject

**Issue**: "Email content is empty after parsing"
- **Solution**: May occur with heavily formatted emails
- Try replying with plain text instead of rich HTML

**Issue**: "User not found for email"
- **Solution**: User must exist in system to reply
- Check user's email matches exactly (case-sensitive)

## Switching Between Providers

To switch back to Mailgun or switch providers:

1. **Via Settings UI**:
   - Go to Settings > Email Configuration
   - Select desired provider
   - Click "Save Changes"

2. **Via Script**:
   ```bash
   # Switch to Mailgun
   node scripts/set-email-provider.js mailgun

   # Switch to SendGrid
   node scripts/set-email-provider.js sendgrid
   ```

3. **Verify Switch**:
   - Send a test email
   - Check Firebase Functions logs to see which provider is being used

## Costs and Limits

### SendGrid Free Tier

- 100 emails/day permanently free
- All essential features included
- No credit card required for signup

### SendGrid Paid Plans

- **Essentials**: $19.95/month (50,000 emails/month)
- **Pro**: $89.95/month (100,000+ emails/month)
- See https://sendgrid.com/pricing for current pricing

## Security Best Practices

1. **Protect API Keys**:
   - Never commit API keys to code
   - Use Firebase Secrets Manager
   - Rotate keys periodically

2. **Enable Webhook Verification**:
   - Set `SENDGRID_WEBHOOK_VERIFICATION_KEY`
   - Validates incoming webhooks are from SendGrid

3. **Monitor Activity**:
   - Check SendGrid Activity Feed regularly
   - Set up alerts for suspicious activity
   - Review bounce and spam reports

4. **Domain Authentication**:
   - Always authenticate your sending domain
   - Improves deliverability
   - Prevents spoofing

## Support

- SendGrid Documentation: https://docs.sendgrid.com
- SendGrid Support: https://support.sendgrid.com
- Help Desk Issues: Create ticket in system

## Migration Notes

If migrating from Mailgun:

1. Both providers can coexist (different Firebase secrets)
2. No data migration needed
3. Old emails sent via Mailgun remain accessible
4. Future emails use selected provider
5. Inbound email routes remain separate (different domains/webhooks)
