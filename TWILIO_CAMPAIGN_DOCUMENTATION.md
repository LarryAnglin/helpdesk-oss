# Twilio Campaign Registry Documentation Package

## Campaign Information
- **Campaign Name**: Help Desk Support Notifications
- **Campaign Type**: Customer Care / Service Updates
- **Business Purpose**: Transactional SMS notifications for IT support ticket updates

## Call to Action (CTA) Verification Documentation

### Primary CTA Location: User Account Preferences

**Navigation Path**: User Avatar → "User Preferences" → "SMS Notifications" Accordion

**CTA Elements**:
```
Toggle Switch: "Enable SMS Notifications"
Input Field: "Mobile Phone Number" with placeholder "(555) 123-4567"
Helper Text: "US phone number for SMS notifications. Required for SMS opt-in."
Compliance Notice: "Two-Step SMS Opt-in: You must first enable SMS notifications here, then opt-in for individual tickets when creating them. This ensures compliance with SMS regulations."
Disclosure Text: "Message and data rates may apply"
```

### Secondary CTA Location: Ticket Creation Form

**Navigation Path**: Create New Ticket Page → SMS Updates Section

**CTA Elements**:
```
Checkbox: "I want to receive SMS updates for this ticket"
Conditional Display: Only visible if user has globally enabled SMS in preferences
Helper Text: "You will receive SMS notifications about ticket status changes"
Fallback Message (if SMS not enabled): "SMS notifications are not enabled. To receive text message updates, click on your avatar in the top-right corner and select 'User Preferences'"
```

## Complete Opt-in Flow Documentation

### Step 1: Global SMS Enablement
1. User clicks on their avatar in top-right corner
2. Selects "User Preferences" from dropdown menu
3. Clicks on "SMS Notifications" accordion section
4. Reads compliance disclosure about two-step opt-in process
5. Toggles "Enable SMS Notifications" switch to ON
6. Enters their US phone number in format (555) 123-4567
7. Sees compliance notice about message rates and opt-out options
8. Clicks "Save Preferences" button

### Step 2: Per-Ticket Consent
1. User navigates to "Create New Ticket" page
2. Fills out ticket details (subject, description, priority)
3. Sees SMS Updates section (only visible because Step 1 was completed)
4. Checks box "I want to receive SMS updates for this ticket"
5. Submits ticket form

### Step 3: SMS Confirmation & Activation
1. System automatically sends opt-in SMS:
   ```
   "YourCompany Help Desk: Reply START to receive updates for ticket #12345. Message and data rates may apply. Reply STOP to opt out anytime."
   ```

2. User replies "START" to confirm subscription

3. System sends confirmation SMS:
   ```
   "You're now subscribed to SMS updates for YourCompany Help Desk tickets. Reply STOP anytime to unsubscribe."
   ```

4. User is now opted-in and will receive ticket update notifications

## SMS Message Templates

### Opt-in Request
```
{CompanyName} Help Desk: Reply START to receive updates for ticket #{ticketId}. Message and data rates may apply. Reply STOP to opt out anytime.
```

### Opt-in Confirmation
```
You're now subscribed to SMS updates for {CompanyName} Help Desk tickets. Reply STOP anytime to unsubscribe.
```

### Ticket Updates
```
{CompanyName} Support: Ticket #{ticketId} updated - Status: {status}. {message} Reply STOP to opt out.
```

### Ticket Resolution
```
{CompanyName} Support: Ticket #{ticketId} resolved! Check your email for details. Reply STOP to unsubscribe.
```

### Opt-out Confirmation
```
You've been unsubscribed from {CompanyName} Help Desk SMS updates. No more messages will be sent. Contact {contactInfo} for support.
```

### Help Response
```
{CompanyName} Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: {contactInfo}
```

## Keyword Support

### Opt-in Keywords
- START, YES, Y, SUBSCRIBE

### Opt-out Keywords  
- STOP, UNSUBSCRIBE, END, CANCEL, QUIT, OPTOUT

### Help Keywords
- HELP, INFO, SUPPORT

## Compliance Features

### Required Disclosures
✅ Brand name in every message
✅ "Reply STOP to opt out" language in all messages
✅ "Message and data rates may apply" in opt-in messages
✅ Contact information in help/opt-out messages
✅ Clear purpose statement (ticket updates)

### Consent Management
✅ Double opt-in process (web + SMS confirmation)
✅ Granular consent (global enable + per-ticket)
✅ Immediate opt-out processing
✅ Consent timestamp logging
✅ Separate admin/customer consent systems

### Data Protection
✅ Phone number normalization to E.164 format
✅ Tenant-based data isolation
✅ Consent status tracking in database
✅ Message delivery logging
✅ Error handling and fallbacks

## Technical Implementation

### Frontend Components
- **UserPreferences.tsx**: Main SMS settings interface
- **TicketForm.tsx**: Per-ticket SMS opt-in checkbox
- **SMS Service**: Phone validation and preference management

### Backend Services
- **sms-service.js**: Campaign Registry compliant message templates
- **sms-webhook.js**: Keyword processing (START/STOP/HELP)
- **ticket-sms-handler.js**: Automated ticket lifecycle notifications

### Database Structure
```javascript
// User SMS Preferences
{
  userId: "user123",
  globalSMSEnabled: true,
  phoneNumber: "+15551234567",
  optInConfirmed: true,
  consentDate: timestamp
}

// SMS Message Log
{
  phoneNumber: "+15551234567",
  direction: "outbound",
  messageType: "opt_in",
  status: "delivered",
  ticketId: "ticket123",
  twilioMessageSid: "SM123..."
}
```

## Business Justification

### Primary Use Case
Transactional customer service notifications for existing help desk customers to improve support experience and reduce email volume.

### Target Audience
- B2B customers with active IT support agreements
- Users who have submitted help desk tickets
- Geographic scope: United States only
- Age requirement: 18+ (business users)

### Message Frequency
- **Volume**: 1-5 messages per ticket lifecycle
- **Timing**: Event-driven (ticket creation, updates, resolution)
- **Peak Hours**: Business hours (8 AM - 6 PM)
- **Annual Volume**: Estimated based on ticket volume

### Business Value
- Faster issue resolution through real-time notifications
- Reduced support phone calls and emails
- Improved customer satisfaction scores
- Better communication transparency

## Verification Methods

To verify this implementation, reviewers can:

1. **Request Demo Account**: Provide temporary access to staging environment
2. **Video Walkthrough**: Screen recording of complete opt-in process
3. **Code Review**: Access to relevant source code sections
4. **Test Phone Number**: Provide number for Campaign Registry to test SMS flow
5. **Documentation Package**: This comprehensive document with screenshots

## Contact Information

**Technical Contact**: [Your technical contact]
**Business Contact**: [Your business contact]  
**Support Email**: [Your support email]
**Company Website**: [Your company website]

---

*This documentation package demonstrates full compliance with Campaign Registry requirements including proper opt-in/opt-out processes, required disclosures, keyword support, and business justification for transactional customer service SMS.*