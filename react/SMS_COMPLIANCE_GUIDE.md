# SMS Compliance Guide for Help Desk System

## Overview

This guide outlines the SMS compliance requirements and Campaign Registry approval process for implementing SMS notifications in our help desk system. The system implements a two-step opt-in process to ensure TCPA and Campaign Registry compliance.

## Campaign Registry Requirements

### Brand Registration (Already Certified)
- Brand is already certified with The Campaign Registry
- $4 verification fee already paid
- Entity information validated

### Campaign Registration Required
- **One-time fee**: $15 per campaign for approval
- **Monthly fee**: $2-10 depending on use case (Customer Care typically $2-5/month)
- **Approval timeline**: 2-3 weeks for manual vetting

## Two-Step SMS Opt-In System

### Step 1: Global SMS Preferences
Users must first enable SMS notifications in their User Preferences:
1. Click avatar → "User Preferences"
2. Expand "SMS Notifications" section
3. Enable "SMS Notifications" toggle
4. Enter valid US phone number
5. Save preferences

### Step 2: Ticket-Level Opt-In
When creating tickets, users can opt-in for SMS updates:
1. SMS checkbox only appears if global SMS is enabled
2. User checks "Send me updates via SMS for this ticket"
3. Confirmation message explains consent
4. System sends opt-in confirmation SMS

## Twilio A2P 10DLC Campaign Registration Form

### Campaign Information

**Campaign Use Case**: Customer Care

**Campaign Description**:
```
[Your Company Name] Help Desk Support provides IT support ticket updates to customers who have opened support requests. Recipients are customers who have requested technical assistance and specifically opted-in to receive SMS notifications for their support tickets. Messages include ticket status updates, resolution notifications, and support communications to keep customers informed about their IT support requests.
```

**Message Flow/Opt-in Methods**:
```
Two-step opt-in process:
1. Users enable SMS globally in User Preferences with explicit consent and phone number
2. Users opt-in per ticket when creating support requests via checkbox with consent language
3. System sends opt-in confirmation SMS requiring START reply
4. Hosted web form at [your-domain]/user-preferences shows opt-in interface
```

### Sample Messages

**Message 1 - Opt-in Confirmation**:
```
[Your Company] Help Desk: Reply START to receive updates for ticket #12345. Message and data rates may apply. Reply STOP to opt out anytime.
```

**Message 2 - Ticket Created**:
```
[Your Company] Support: Ticket #12345 created - Network connectivity issue. We'll keep you updated on progress. Reply STOP to unsubscribe. Help: [phone/email]
```

**Message 3 - Status Update**:
```
[Your Company] Support: Ticket #12345 updated - Status: In Progress. Technician assigned. For help reply HELP or call [phone]. Reply STOP to opt out.
```

**Message 4 - Resolution**:
```
[Your Company] Support: Ticket #12345 resolved! Check your email for details. Rate your experience at [link]. Reply STOP to unsubscribe.
```

### Keywords and Responses

**Opt-in Keywords**: START, YES, SUBSCRIBE

**Opt-in Confirmation Message**:
```
You're now subscribed to SMS updates for [Your Company] Help Desk tickets. Reply STOP anytime to unsubscribe.
```

**Opt-out Keywords**: STOP, QUIT, END, UNSUBSCRIBE, CANCEL

**Opt-out Response**:
```
You've been unsubscribed from [Your Company] Help Desk SMS updates. No more messages will be sent. Contact [email/phone] for support.
```

**Help Keywords**: HELP, INFO, SUPPORT

**Help Response**:
```
[Your Company] Help Desk SMS: Updates for your support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: [phone] or [email]
```

## Technical Implementation

### SMS Templates with Compliance

```typescript
export const SMS_COMPLIANCE_TEMPLATES = {
  OPT_IN_CONFIRMATION: {
    message: "{{companyName}} Help Desk: Reply START to receive updates for ticket #{{ticketId}}. Message and data rates may apply. Reply STOP to opt out anytime.",
    variables: ['companyName', 'ticketId']
  },
  
  SUBSCRIPTION_CONFIRMED: {
    message: "You're now subscribed to SMS updates for {{companyName}} Help Desk tickets. Reply STOP anytime to unsubscribe.",
    variables: ['companyName']
  },
  
  TICKET_CREATED: {
    message: "{{companyName}} Support: Ticket #{{ticketId}} created - {{title}}. We'll keep you updated. Reply STOP to unsubscribe. Help: {{contactInfo}}",
    variables: ['companyName', 'ticketId', 'title', 'contactInfo']
  },
  
  TICKET_UPDATED: {
    message: "{{companyName}} Support: Ticket #{{ticketId}} updated - Status: {{status}}. {{message}} Reply STOP to opt out.",
    variables: ['companyName', 'ticketId', 'status', 'message']
  },
  
  TICKET_RESOLVED: {
    message: "{{companyName}} Support: Ticket #{{ticketId}} resolved! {{message}} Reply STOP to unsubscribe.",
    variables: ['companyName', 'ticketId', 'message']
  },
  
  OPT_OUT_CONFIRMATION: {
    message: "You've been unsubscribed from {{companyName}} Help Desk SMS updates. No more messages will be sent. Contact {{contactInfo}} for support.",
    variables: ['companyName', 'contactInfo']
  },
  
  HELP_RESPONSE: {
    message: "{{companyName}} Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: {{contactInfo}}",
    variables: ['companyName', 'contactInfo']
  }
};
```

### Privacy Policy Requirements

Add to privacy policy:
```
SMS Communications: With your consent, we may send you text messages related to your support tickets. We do not share your mobile information with third parties for marketing purposes. You may opt out at any time by replying STOP to any message.
```

### Consent Record Keeping

- Store consent timestamp
- Record opt-in method (web form)
- Maintain 4-year retention for TCPA compliance
- Log all opt-out requests
- Track message delivery status

## Compliance Checklist

### Pre-Launch
- [ ] Brand registered with Campaign Registry
- [ ] Campaign submitted and approved
- [ ] Privacy policy updated
- [ ] Opt-in/opt-out systems tested
- [ ] Message templates comply with guidelines
- [ ] Record keeping system implemented

### Ongoing Compliance
- [ ] Monitor opt-out requests
- [ ] Maintain consent records
- [ ] Regular compliance audits
- [ ] Update templates if guidelines change
- [ ] Track message frequency limits

## Best Practices

1. **Clear Consent**: Always use explicit, clear language for opt-in
2. **Easy Opt-out**: Honor STOP requests immediately
3. **Relevant Content**: Only send ticket-related messages
4. **Timing**: Respect business hours when possible
5. **Frequency**: Limit messages to necessary updates only
6. **Brand Identity**: Always include company name in messages

## Risk Mitigation

1. **Double Opt-in**: Two-step process reduces compliance risk
2. **Record Keeping**: Comprehensive logging for legal protection
3. **Regular Audits**: Monthly compliance reviews
4. **Training**: Staff education on SMS regulations
5. **Legal Review**: Annual legal compliance assessment

## Contact Information for Campaign Registration

Replace placeholders with actual information:
- **Company Name**: [Your Company Name]
- **Contact Phone**: [Your Support Phone Number]
- **Contact Email**: [Your Support Email]
- **Website**: [Your Company Website]
- **Privacy Policy URL**: [Your Privacy Policy URL]

## Important Dates

- **February 1, 2025**: Full enforcement of campaign codes begins
- **April 11, 2025**: New TCPA amendments take effect
- **June 17, 2025**: Additional carrier restrictions may apply

Register campaign well before these dates to ensure compliance.