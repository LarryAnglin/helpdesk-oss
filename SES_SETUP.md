# Amazon SES Setup Guide

This guide walks you through setting up Amazon Simple Email Service (SES) for sending and receiving emails with the Help Desk application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [Verify Your Domain](#verify-your-domain)
4. [Create IAM User for SES](#create-iam-user-for-ses)
5. [Configure Firebase Secrets](#configure-firebase-secrets)
6. [Set Up Email Receiving (Inbound)](#set-up-email-receiving-inbound)
7. [Deploy Firebase Functions](#deploy-firebase-functions)
8. [Testing](#testing)
9. [Moving Out of Sandbox](#moving-out-of-sandbox)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- An AWS account
- Access to your domain's DNS settings
- Firebase CLI installed and configured
- Your Help Desk Firebase project deployed

---

## AWS Account Setup

1. Go to [AWS Console](https://aws.amazon.com/console/) and sign in (or create an account)
2. Navigate to **Amazon SES** (search for "SES" in the services search bar)
3. Note which **region** you're in (e.g., `us-east-1`, `us-west-2`)
   - SES is region-specific, so remember which region you choose

---

## Verify Your Domain

Before you can send emails from your domain, you need to verify ownership.

### Step 1: Add Your Domain

1. In the SES Console, go to **Configuration** → **Verified identities**
2. Click **Create identity**
3. Select **Domain**
4. Enter your domain (e.g., `mail.your-domain.com`)
5. Check **Use a custom MAIL FROM domain** (optional but recommended)
6. Click **Create identity**

### Step 2: Add DNS Records

After creating the identity, AWS will provide DNS records you need to add:

1. **DKIM Records** (3 CNAME records) - For email authentication
   ```
   Type: CNAME
   Name: [unique-key]._domainkey.yourdomain.com
   Value: [unique-key].dkim.amazonses.com
   ```

2. **Verification TXT Record**
   ```
   Type: TXT
   Name: _amazonses.yourdomain.com
   Value: [verification-string-provided-by-aws]
   ```

3. **SPF Record** (if using custom MAIL FROM)
   ```
   Type: TXT
   Name: mail.yourdomain.com
   Value: "v=spf1 include:amazonses.com ~all"
   ```

4. **MX Record** (if using custom MAIL FROM)
   ```
   Type: MX
   Name: mail.yourdomain.com
   Value: 10 feedback-smtp.us-east-1.amazonses.com
   ```
   (Replace `us-east-1` with your SES region)

### Step 3: Wait for Verification

- DNS propagation can take up to 72 hours
- SES will automatically check and verify once records are detected
- You'll see "Verified" status in the console when complete

---

## Create IAM User for SES

You need AWS credentials to send emails from your application.

### Step 1: Create IAM User

1. Go to **IAM Console** → **Users** → **Add users**
2. Enter a username (e.g., `helpdesk-ses-sender`)
3. Click **Next**
4. Select **Attach policies directly**
5. Search for and select **AmazonSESFullAccess**
   - Or create a custom policy with minimal permissions (see below)
6. Click **Next** → **Create user**

### Step 2: Create Access Keys

1. Click on the user you just created
2. Go to **Security credentials** tab
3. Under **Access keys**, click **Create access key**
4. Select **Application running outside AWS**
5. Click **Create access key**
6. **IMPORTANT**: Copy both the **Access key ID** and **Secret access key**
   - You won't be able to see the secret key again!

### Minimal IAM Policy (Optional)

For better security, create a custom policy with only needed permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## Configure Firebase Secrets

Store your AWS credentials as Firebase secrets:

```bash
# Set AWS Access Key ID
firebase functions:secrets:set AWS_ACCESS_KEY_ID

# Set AWS Secret Access Key
firebase functions:secrets:set AWS_SECRET_ACCESS_KEY

# Set AWS SES Region (e.g., us-east-1)
firebase functions:secrets:set AWS_SES_REGION
```

When prompted, enter the values you obtained from AWS.

---

## Set Up Email Receiving (Inbound)

To receive email replies to tickets, you need to configure SES to receive emails and forward them to your webhook.

### Step 1: Verify Receiving Domain

1. In SES Console, go to **Email receiving**
2. Note: Email receiving is only available in certain regions:
   - US East (N. Virginia) - us-east-1
   - US West (Oregon) - us-west-2
   - Europe (Ireland) - eu-west-1

### Step 2: Add MX Record for Receiving

Add an MX record to your domain's DNS:

```
Type: MX
Name: mail.yourdomain.com (or your subdomain)
Priority: 10
Value: inbound-smtp.us-east-1.amazonaws.com
```

(Replace `us-east-1` with your SES receiving region)

### Step 3: Create Receipt Rule Set

1. Go to **Email receiving** → **Rule sets**
2. Click **Create rule set**
3. Name it (e.g., `helpdesk-rules`)
4. Click **Create rule set**
5. Click **Set as active**

### Step 4: Create Receipt Rule

1. In your rule set, click **Create rule**
2. **Rule name**: `helpdesk-inbound`
3. **Recipients**: Add the email patterns to match:
   - `ticket-*-reply@mail.yourdomain.com`
   - Or your entire subdomain: `mail.yourdomain.com`
4. Click **Next**

### Step 5: Add Actions

For the rule actions, you have two options:

#### Option A: SNS Notification (Recommended)

1. Click **Add action** → **Publish to Amazon SNS topic**
2. Create a new SNS topic or select existing
3. **Encoding**: Choose **UTF-8**
4. Click **Next** → **Create rule**

Then configure SNS:
1. Go to **Amazon SNS** Console
2. Find your topic
3. Click **Create subscription**
4. **Protocol**: HTTPS
5. **Endpoint**: Your Firebase function URL:
   ```
   https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/sesWebhook
   ```
6. Click **Create subscription**
7. The subscription will be auto-confirmed by the webhook

#### Option B: S3 + Lambda (For large emails)

For emails with large attachments:

1. **Add action** → **Deliver to S3 bucket**
2. Create/select an S3 bucket
3. Set up a Lambda function to process stored emails
4. (This requires additional setup beyond this guide)

---

## Deploy Firebase Functions

After configuration, deploy your functions:

```bash
cd functions
npm install
firebase deploy --only functions
```

This will deploy the `sesWebhook` function that handles inbound emails.

---

## Testing

### Test Outbound Email

1. In your Help Desk app, go to **Settings** → **Email Configuration**
2. Select **Amazon SES** and save
3. Create a test ticket - you should receive email notifications

### Test Inbound Email (Reply)

1. Reply to a ticket notification email
2. The reply should appear in the ticket within a few seconds
3. Check Firebase Functions logs for any errors:
   ```bash
   firebase functions:log --only sesWebhook
   ```

### Verify SNS Subscription

1. Go to SNS Console → Subscriptions
2. Ensure status is "Confirmed"
3. If "Pending confirmation", check function logs for subscription confirmation request

---

## Moving Out of Sandbox

By default, new SES accounts are in "sandbox" mode with limitations:
- Can only send to verified email addresses
- Limited to 200 emails per day

### Request Production Access

1. Go to SES Console → **Account dashboard**
2. Click **Request production access**
3. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: Your help desk URL
   - **Use case description**: Explain you're sending ticket notifications
   - **Additional contacts**: Your contact email
4. Submit and wait for approval (usually 24-48 hours)

---

## Troubleshooting

### Emails Not Sending

1. **Check secrets are set**:
   ```bash
   firebase functions:secrets:access AWS_ACCESS_KEY_ID
   firebase functions:secrets:access AWS_SES_REGION
   ```

2. **Check IAM permissions**: Ensure user has `ses:SendEmail` permission

3. **Check domain verification**: Must show "Verified" in SES console

4. **Check sandbox status**: In sandbox, you can only send to verified addresses

### Inbound Emails Not Working

1. **Check MX records**: Use `dig MX mail.yourdomain.com` to verify

2. **Check SNS subscription**: Must be "Confirmed" status

3. **Check function logs**:
   ```bash
   firebase functions:log --only sesWebhook
   ```

4. **Check receipt rule**: Ensure rule is active and patterns match

### SNS Subscription Stuck on "Pending"

1. Check function logs for subscription confirmation request
2. Manually visit the SubscribeURL if logged
3. Ensure function is deployed and accessible

### Common Errors

| Error | Solution |
|-------|----------|
| `AccessDenied` | Check IAM permissions |
| `MessageRejected` | Domain not verified or sandbox restrictions |
| `InvalidParameterValue` | Check email format/encoding |
| `Throttling` | You've hit rate limits, wait and retry |

---

## Cost Estimate

Amazon SES pricing (as of 2024):
- **Outbound email**: $0.10 per 1,000 emails
- **Inbound email**: $0.10 per 1,000 emails + $0.09 per 1,000 data chunks (256KB each)
- **Attachments**: Included in data chunk pricing

For a typical help desk with 1,000 tickets/month:
- Estimated cost: ~$0.20 - $0.50/month

---

## Additional Resources

- [Amazon SES Documentation](https://docs.aws.amazon.com/ses/)
- [SES Sending Limits](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [SES Email Receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html)
- [Firebase Functions Secrets](https://firebase.google.com/docs/functions/config-env)
