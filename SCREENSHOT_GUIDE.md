# Screenshot Guide for Twilio Campaign Registry

## Required Screenshots to Capture

### 1. User Preferences - SMS Settings (Primary CTA)

**Screenshot 1A: User Avatar Menu**
- Show user clicking on avatar in top-right corner
- Highlight "User Preferences" option in dropdown
- Caption: "Step 1: Access User Preferences from avatar menu"

**Screenshot 1B: SMS Notifications Accordion**
- Show User Preferences dialog open
- Highlight "SMS Notifications" accordion section
- Show compliance notice text about two-step opt-in
- Caption: "Step 2: SMS Notifications section with compliance disclosure"

**Screenshot 1C: SMS Settings Form**
- Show expanded SMS settings with:
  - "Enable SMS Notifications" toggle switch
  - Phone number input field
  - Compliance warnings and disclosures
  - Save button
- Caption: "Step 3: SMS configuration with required disclosures"

**Screenshot 1D: SMS Enabled State**
- Show SMS enabled with green checkmark
- Show confirmation text "SMS notifications are active"
- Caption: "Step 4: Confirmation of global SMS enablement"

### 2. Ticket Creation - Per-Ticket Consent (Secondary CTA)

**Screenshot 2A: Ticket Form - SMS Disabled State**
- Show ticket creation form
- Show info alert: "SMS notifications are not enabled"
- Show guidance to enable SMS in preferences
- Caption: "Ticket form when SMS is not enabled - user guidance provided"

**Screenshot 2B: Ticket Form - SMS Enabled State**
- Show same ticket form but with SMS checkbox visible
- Highlight "I want to receive SMS updates for this ticket" checkbox
- Show helper text about SMS notifications
- Caption: "Ticket form with SMS opt-in checkbox (only visible when globally enabled)"

**Screenshot 2C: Ticket Form - SMS Checked**
- Show checkbox checked with confirmation text
- Show form ready to submit
- Caption: "Per-ticket SMS consent selected"

### 3. Admin SMS Settings (Bonus - Shows Advanced Features)

**Screenshot 3A: Admin SMS Section**
- Show "Admin SMS Notifications" accordion (only visible to admin/tech)
- Show separate settings for system-wide notifications
- Caption: "Admin SMS settings for system-wide notifications (admin users only)"

### 4. Mobile Responsive Views

**Screenshot 4A: Mobile User Preferences**
- Same SMS settings but on mobile device
- Show responsive design
- Caption: "Mobile view of SMS preferences"

**Screenshot 4B: Mobile Ticket Creation**
- Mobile view of ticket form with SMS checkbox
- Caption: "Mobile view of ticket creation with SMS opt-in"

## Screenshot Capture Instructions

### Setup Steps:
1. Start development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Create test user account or use existing admin account
4. Clear browser cache for clean screenshots

### Capture Settings:
- **Browser**: Use Chrome for consistency
- **Window Size**: 1920x1080 for desktop, iPhone 12 Pro for mobile
- **Zoom Level**: 100%
- **Format**: PNG for best quality
- **Annotations**: Add red arrows and text boxes using image editor

### File Naming Convention:
```
01_avatar_menu_access.png
02_user_preferences_dialog.png
03_sms_accordion_expanded.png
04_sms_settings_form.png
05_sms_enabled_confirmation.png
06_ticket_form_sms_disabled.png
07_ticket_form_sms_enabled.png
08_ticket_form_sms_selected.png
09_admin_sms_settings.png
10_mobile_sms_preferences.png
11_mobile_ticket_creation.png
```

## Annotation Guidelines

### Required Annotations:
- **Red arrows** pointing to key UI elements
- **Red text boxes** explaining each step
- **Highlights** around important compliance text
- **Step numbers** (1, 2, 3, etc.) for flow sequence

### Text Overlays:
- Keep text brief and clear
- Use consistent font (Arial, 14pt, red color)
- Position text boxes to not obscure important UI elements
- Include compliance-focused callouts like:
  - "Required phone number input"
  - "Compliance disclosure shown"
  - "Two-step opt-in explained"
  - "Message rates disclosure"

## Mock SMS Conversation Screenshots

Create screenshots of a simulated SMS conversation showing:

**SMS Screenshot 1: Opt-in Message**
```
From: +1234567890 (Your Twilio Number)
To: +1555123456 (Test Number)

TechCorp Help Desk: Reply START to receive updates for ticket #12345. Message and data rates may apply. Reply STOP to opt out anytime.

Time: 2:15 PM ✓
```

**SMS Screenshot 2: User START Reply**
```
From: +1555123456 (Test Number)
To: +1234567890 (Your Twilio Number)

START

Time: 2:16 PM ✓
```

**SMS Screenshot 3: Confirmation Response**
```
From: +1234567890 (Your Twilio Number)
To: +1555123456 (Test Number)

You're now subscribed to SMS updates for TechCorp Help Desk tickets. Reply STOP anytime to unsubscribe.

Time: 2:16 PM ✓
```

**SMS Screenshot 4: Ticket Update**
```
From: +1234567890 (Your Twilio Number)
To: +1555123456 (Test Number)

TechCorp Support: Ticket #12345 updated - Status: In Progress. Technician assigned. Reply STOP to opt out.

Time: 3:45 PM ✓
```

**SMS Screenshot 5: STOP Command**
```
From: +1555123456 (Test Number)
To: +1234567890 (Your Twilio Number)

STOP

Time: 4:30 PM ✓
```

**SMS Screenshot 6: Opt-out Confirmation**
```
From: +1234567890 (Your Twilio Number)
To: +1555123456 (Test Number)

You've been unsubscribed from TechCorp Help Desk SMS updates. No more messages will be sent. Contact support@techcorp.com for support.

Time: 4:30 PM ✓
```

## Tools for Creating Mock SMS Screenshots

1. **iPhone/Android Simulators**: Use Xcode or Android Studio
2. **SMS Mockup Tools**: Use online SMS conversation generators
3. **Image Editing**: Photoshop, GIMP, or Canva for text overlay
4. **Real Device**: Use actual phone with test numbers (recommended)

## Final Documentation Package Structure

```
📁 Twilio_Campaign_Documentation/
├── 📄 TWILIO_CAMPAIGN_DOCUMENTATION.md
├── 📄 SCREENSHOT_GUIDE.md
├── 📁 Screenshots_Desktop/
│   ├── 01_avatar_menu_access.png
│   ├── 02_user_preferences_dialog.png
│   ├── 03_sms_accordion_expanded.png
│   ├── 04_sms_settings_form.png
│   ├── 05_sms_enabled_confirmation.png
│   ├── 06_ticket_form_sms_disabled.png
│   ├── 07_ticket_form_sms_enabled.png
│   └── 08_ticket_form_sms_selected.png
├── 📁 Screenshots_Mobile/
│   ├── 09_mobile_sms_preferences.png
│   └── 10_mobile_ticket_creation.png
├── 📁 SMS_Conversation/
│   ├── 11_opt_in_message.png
│   ├── 12_start_reply.png
│   ├── 13_confirmation.png
│   ├── 14_ticket_update.png
│   ├── 15_stop_command.png
│   └── 16_opt_out_confirmation.png
└── 📁 Code_Samples/
    ├── UserPreferences_SMS_Section.tsx
    ├── TicketForm_SMS_Checkbox.tsx
    └── SMS_Templates.js
```

This comprehensive documentation package will demonstrate to Twilio that your opt-in process is legitimate, accessible, and compliant with Campaign Registry requirements.