# Code Samples for Campaign Registry Verification

## Frontend Implementation - User Preferences SMS Section

### UserPreferences.tsx - Primary CTA Implementation

```tsx
// SMS Preferences Accordion Section
<Accordion 
  expanded={expanded === 'sms'} 
  onChange={handleAccordionChange('sms')}
  sx={{ mb: 2 }}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">SMS Notifications</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Two-Step SMS Opt-in:</strong> You must first enable SMS notifications here, 
          then opt-in for individual tickets when creating them. This ensures compliance with SMS regulations.
        </Typography>
      </Alert>
      
      <FormControlLabel
        control={
          <Switch
            checked={smsPreferences.globalSMSEnabled}
            onChange={(e) => handleSMSPreferenceChange('globalSMSEnabled', e.target.checked)}
          />
        }
        label="Enable SMS Notifications"
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Allow SMS text message notifications for ticket updates. Message and data rates may apply.
      </Typography>

      {smsPreferences.globalSMSEnabled && (
        <Box sx={{ ml: 4, mt: 2 }}>
          <TextField
            fullWidth
            label="Mobile Phone Number"
            value={smsPreferences.phoneNumber}
            onChange={(e) => handleSMSPreferenceChange('phoneNumber', e.target.value)}
            placeholder="(555) 123-4567"
            helperText="US phone number for SMS notifications. Required for SMS opt-in."
            sx={{ mb: 2 }}
          />
          
          {smsPreferences.optInConfirmed && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ SMS notifications are active. You can now opt-in to receive SMS updates when creating tickets.
            </Alert>
          )}
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>SMS Compliance Notice:</strong><br/>
              • Message and data rates may apply<br/>
              • You can reply STOP to any message to unsubscribe<br/>
              • Reply START to resubscribe<br/>
              • Reply HELP for assistance<br/>
              • We will only send ticket-related notifications
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  </AccordionDetails>
</Accordion>
```

### TicketForm.tsx - Secondary CTA Implementation

```tsx
// SMS Updates Section - Only shown if user has globally enabled SMS
{!loadingSMSPrefs && userSMSEnabled && (
  <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
    <Typography variant="h6" gutterBottom>
      SMS Updates
    </Typography>
    <FormControlLabel
      control={
        <Checkbox
          checked={formData.smsUpdates || false}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            smsUpdates: e.target.checked,
            smsPhoneNumber: userSMSPhone || ''
          }))}
        />
      }
      label="I want to receive SMS updates for this ticket"
    />
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      You will receive SMS notifications about ticket status changes. 
      Reply START to the SMS you receive to confirm subscription. Message and data rates may apply.
    </Typography>
  </Box>
)}

{!loadingSMSPrefs && !userSMSEnabled && (
  <Alert severity="info" sx={{ mt: 3 }}>
    <Typography variant="body2">
      <strong>SMS notifications are not enabled.</strong> To receive text message updates, 
      click on your avatar in the top-right corner and select "User Preferences" to enable SMS notifications.
    </Typography>
  </Alert>
)}
```

## Backend Implementation - SMS Service Templates

### sms-service.js - Campaign Registry Compliant Templates

```javascript
/**
 * Campaign Registry compliant SMS templates
 */
const SMS_TEMPLATES = {
  opt_in: {
    message: '{companyName} Help Desk: Reply START to receive updates for ticket #{ticketId}. Message and data rates may apply. Reply STOP to opt out anytime.',
    variables: ['companyName', 'ticketId']
  },
  confirmed: {
    message: "You're now subscribed to SMS updates for {companyName} Help Desk tickets. Reply STOP anytime to unsubscribe.",
    variables: ['companyName']
  },
  stopped: {
    message: "You've been unsubscribed from {companyName} Help Desk SMS updates. No more messages will be sent. Contact {contactInfo} for support.",
    variables: ['companyName', 'contactInfo']
  },
  ticket_updated: {
    message: '{companyName} Support: Ticket #{ticketId} updated - Status: {status}. {message} Reply STOP to opt out.',
    variables: ['companyName', 'ticketId', 'status', 'message']
  },
  ticket_resolved: {
    message: '{companyName} Support: Ticket #{ticketId} resolved! {message} Reply STOP to unsubscribe.',
    variables: ['companyName', 'ticketId', 'message']
  },
  help_response: {
    message: '{companyName} Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: {contactInfo}',
    variables: ['companyName', 'contactInfo']
  }
};

/**
 * Send opt-in confirmation SMS (Campaign Registry compliant)
 */
async function sendOptInSMS(phoneNumber, ticketId, tenantId = null) {
  try {
    const companyInfo = await getCompanyInfo(tenantId);
    const message = renderSMSTemplate('opt_in', {
      companyName: companyInfo.companyName,
      ticketId: ticketId
    });
    
    return await sendSMS(phoneNumber, message, 'opt_in', ticketId);
  } catch (error) {
    console.error('Error sending opt-in SMS:', error);
    return { success: false, error: error.message };
  }
}
```

### sms-webhook.js - Keyword Processing

```javascript
/**
 * Process SMS commands (START, STOP, etc.) - Campaign Registry compliant
 */
async function processSMSCommand(phoneNumber, message) {
  try {
    const command = message.toUpperCase().trim();
    const preference = await getSMSPreference(phoneNumber);
    const tenantId = preference?.tenantId || null;

    console.log(`Processing SMS command "${command}" from ${phoneNumber}`);

    // Enhanced keyword support for Campaign Registry compliance
    switch (command) {
      case 'START':
      case 'YES':
      case 'Y':
      case 'SUBSCRIBE':
        await handleOptIn(phoneNumber, preference, tenantId);
        break;

      case 'STOP':
      case 'UNSUBSCRIBE':
      case 'END':
      case 'CANCEL':
      case 'QUIT':
      case 'OPTOUT':
        await handleOptOut(phoneNumber, preference, tenantId);
        break;

      case 'HELP':
      case 'INFO':
      case 'SUPPORT':
        await handleHelp(phoneNumber, tenantId);
        break;

      default:
        // For unknown commands, send a helpful response
        console.log(`Unknown command "${command}" from ${phoneNumber}`);
        await handleInvalidCommand(phoneNumber, tenantId);
        break;
    }
  } catch (error) {
    console.error('Error processing SMS command:', error);
    await sendHelpSMS(phoneNumber);
  }
}
```

## Database Schema - Consent Management

### SMS Preferences Collection

```javascript
// firestore collection: 'userSMSPreferences'
{
  userId: "user_12345",
  globalSMSEnabled: true,
  phoneNumber: "+15551234567",
  consentDate: 1704906123000,
  optInConfirmed: true,
  updatedAt: "2024-01-10T15:22:03.000Z"
}

// firestore collection: 'smsPreferences' (per-ticket)
{
  tenantId: "tenant_123",
  phoneNumber: "+15551234567",
  status: "confirmed", // "pending", "confirmed", "stopped"
  userId: "user_12345",
  userName: "John Doe",
  userEmail: "john@company.com",
  ticketIds: ["ticket_123", "ticket_456"],
  messageCount: 5,
  optInDate: 1704906123000,
  createdAt: 1704906100000,
  updatedAt: 1704906123000
}
```

### SMS Message Logging

```javascript
// firestore collection: 'smsMessages'
{
  phoneNumber: "+15551234567",
  direction: "outbound", // "inbound", "outbound"
  messageType: "opt_in", // "opt_in", "confirmation", "ticket_update", etc.
  message: "TechCorp Help Desk: Reply START to receive updates...",
  status: "delivered", // "sent", "delivered", "failed"
  twilioMessageSid: "SM1234567890abcdef",
  ticketId: "ticket_123",
  tenantId: "tenant_123",
  createdAt: 1704906123000
}
```

## Phone Number Validation

```javascript
/**
 * Validate US phone number format
 */
const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic US phone number validation
  const phoneRegex = /^(\+1\s?)?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}$/;
  return phoneRegex.test(phoneNumber.trim());
};

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
}
```

## Compliance Features Implementation

### Two-Step Opt-in Process

```javascript
// Step 1: Global SMS Enable (in UserPreferences)
const handleSMSPreferenceChange = (field: keyof UserSMSPreferences, value: boolean | string) => {
  setSmsPreferences(prev => ({
    ...prev,
    [field]: value
  }));
};

// Step 2: Per-ticket consent (in TicketForm)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (formData.smsUpdates && userSMSEnabled) {
    // User has opted-in for SMS updates on this ticket
    // Backend will send opt-in SMS requiring START confirmation
    formData.smsPhoneNumber = userSMSPhone;
  }
  
  await createTicket(formData);
};
```

### Required Disclosures

```typescript
// Compliance text constants
export const SMS_COMPLIANCE_MESSAGES = {
  OPT_IN_INSTRUCTIONS: "Reply START to receive updates for this ticket. Message and data rates may apply. Reply STOP to opt out anytime.",
  CONFIRMATION: "You're now subscribed to SMS updates for this ticket. Reply STOP anytime to unsubscribe.",
  OPT_OUT_CONFIRMATION: "You've been unsubscribed from SMS updates. Reply START to resubscribe.",
  HELP_MESSAGE: "Help Desk SMS: Reply START to subscribe, STOP to unsubscribe. Message and data rates may apply. Contact support for help.",
  TWO_STEP_NOTICE: "Two-Step SMS Opt-in: You must first enable SMS notifications here, then opt-in for individual tickets when creating them. This ensures compliance with SMS regulations."
};
```

This code demonstrates that your SMS implementation includes all required Campaign Registry compliance features:

1. ✅ **Proper CTA placement** in user preferences and ticket forms
2. ✅ **Required disclosures** about message rates and opt-out options  
3. ✅ **Two-step opt-in** process with explicit user consent
4. ✅ **Keyword support** for START/STOP/HELP commands
5. ✅ **Consent logging** with timestamps and user tracking
6. ✅ **Campaign Registry compliant** message templates with brand name and opt-out language

Include these code samples with your campaign submission to prove implementation authenticity.