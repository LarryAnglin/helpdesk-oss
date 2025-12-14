# Step-by-Step Screenshot Instructions

## 🎯 How to Capture the Required Screenshots

### **Method 1: Use Your Live Application (Recommended)**

#### **Setup Steps:**
1. **Start your development server:**
   ```bash
   cd /Users/larryanglin/Projects/HelpDesk/react
   npm run dev
   ```

2. **Open browser and navigate to:** `http://localhost:5173`

3. **Login with admin account** (to see all features)

4. **Browser settings for consistent screenshots:**
   - Use Chrome browser
   - Set window size to 1920x1080
   - Zoom level: 100%
   - Clear any browser cache/cookies for clean state

#### **Screenshot 1: Avatar Menu Access**
1. Navigate to main dashboard
2. Click on user avatar in top-right corner
3. Highlight the dropdown menu showing "User Preferences" option
4. **Screenshot filename:** `01_avatar_menu_access.png`
5. **Add annotation:** Red arrow pointing to "User Preferences" option

#### **Screenshot 2: User Preferences Dialog**
1. Click "User Preferences" from avatar menu
2. Wait for dialog to fully load
3. Show the complete User Preferences dialog
4. **Screenshot filename:** `02_user_preferences_dialog.png`
5. **Add annotation:** Red box around dialog title

#### **Screenshot 3: SMS Accordion Expanded**
1. In User Preferences dialog, click "SMS Notifications" accordion
2. Show the expanded SMS section with compliance notice
3. **Screenshot filename:** `03_sms_accordion_expanded.png`
4. **Add annotations:** 
   - Red arrow pointing to compliance disclosure text
   - Red box around "Two-Step SMS Opt-in" text

#### **Screenshot 4: SMS Settings Form**
1. Toggle "Enable SMS Notifications" to ON
2. Enter phone number: "(555) 123-4567"
3. Show all compliance warnings and disclosures
4. **Screenshot filename:** `04_sms_settings_form.png`
5. **Add annotations:**
   - Red arrow pointing to phone number field
   - Red box around compliance warning text

#### **Screenshot 5: SMS Enabled Confirmation**
1. Save the SMS preferences
2. Show the success confirmation state
3. **Screenshot filename:** `05_sms_enabled_confirmation.png`
4. **Add annotation:** Red arrow pointing to success message

#### **Screenshot 6: Ticket Form - SMS Disabled**
1. **First, disable SMS in preferences** (toggle OFF and save)
2. Navigate to "Create New Ticket" page
3. Fill out basic ticket information
4. Show the info alert about SMS not being enabled
5. **Screenshot filename:** `06_ticket_form_sms_disabled.png`
6. **Add annotations:**
   - Red box around the info alert
   - Red arrow pointing to guidance text

#### **Screenshot 7: Ticket Form - SMS Enabled**
1. **Re-enable SMS in preferences** (toggle ON and save)
2. Navigate to "Create New Ticket" page
3. Fill out basic ticket information
4. Show the SMS checkbox now visible
5. **Screenshot filename:** `07_ticket_form_sms_enabled.png`
6. **Add annotations:**
   - Red arrow pointing to SMS checkbox
   - Red box around helper text

#### **Screenshot 8: Ticket Form - SMS Selected**
1. Check the SMS updates checkbox
2. Show the form ready to submit with SMS enabled
3. **Screenshot filename:** `08_ticket_form_sms_selected.png`
4. **Add annotation:** Red arrow pointing to checked SMS checkbox

### **Method 2: Use HTML Mockups (Backup)**

If you have issues with the live application, I've created HTML mockups:

1. **Open the mockup files in your browser:**
   - `mockup_sms_preferences.html` - Shows SMS preferences dialog
   - `mockup_ticket_form.html` - Shows ticket form with SMS enabled
   - `mockup_sms_disabled.html` - Shows ticket form with SMS disabled

2. **Take screenshots of each mockup**

3. **These show the exact UI elements Campaign Registry needs to see**

### **Method 3: Mobile Screenshots**

#### **Setup for Mobile:**
1. Open Chrome DevTools (F12)
2. Click device toolbar icon (mobile phone icon)
3. Select "iPhone 12 Pro" or similar device
4. Capture the same screenshots in mobile view

#### **Required Mobile Screenshots:**
- **09_mobile_sms_preferences.png** - Mobile view of SMS settings
- **10_mobile_ticket_creation.png** - Mobile view of ticket form

### **Method 4: SMS Conversation Screenshots**

#### **Option A: Use Real Phone Numbers**
1. Use your Twilio test number and personal phone
2. Create actual SMS conversation following the flow
3. Screenshot each SMS message

#### **Option B: Use iPhone/Android Simulator**
1. Open Xcode (iOS) or Android Studio simulator
2. Use Messages app to create mock conversation
3. Create realistic SMS screenshots

#### **Option C: Use Online SMS Mockup Tools**
1. Visit: `https://www.iemoji.com/emoji-cheat-sheet/messaging/sms-mockup`
2. Create SMS conversation screenshots
3. Download and annotate

#### **Required SMS Screenshots:**
- **11_opt_in_message.png** - System sending opt-in SMS
- **12_start_reply.png** - User replying "START"
- **13_confirmation.png** - System confirmation message
- **14_ticket_update.png** - Example ticket update notification
- **15_stop_command.png** - User replying "STOP"
- **16_opt_out_confirmation.png** - System opt-out confirmation

### **Screenshot Editing & Annotation**

#### **Tools You Can Use:**
- **macOS:** Preview.app, Skitch, or Screenshot markup
- **Windows:** Paint, Snipping Tool, or PowerPoint
- **Online:** Canva, GIMP, or Photoshop
- **Mobile:** Built-in markup tools

#### **Annotation Requirements:**
1. **Red arrows** pointing to key elements
2. **Red text boxes** with explanations
3. **Red rectangles** highlighting compliance text
4. **Step numbers** (1, 2, 3) for flow sequence

#### **Example Annotation Text:**
- "Primary CTA: SMS Settings Access"
- "Required compliance disclosure"
- "Phone number input required"
- "Secondary CTA: Per-ticket consent"
- "SMS checkbox only visible when globally enabled"
- "Clear guidance when SMS disabled"

### **Quality Checklist:**

Before submitting screenshots, verify:
- [ ] **High resolution** (at least 1920x1080 for desktop)
- [ ] **Clear, readable text** at 100% zoom
- [ ] **All UI elements visible** and unobstructed
- [ ] **Consistent styling** across all screenshots
- [ ] **Red annotations** clearly pointing to key elements
- [ ] **Proper filenames** matching the naming convention
- [ ] **No sensitive data** visible (use test data only)

### **Backup Plan:**

If you encounter any technical issues:
1. **Use the HTML mockups** I created - they show exactly what Campaign Registry needs to see
2. **Take screenshots of the mockups** with the same annotation requirements
3. **Include a note** that these are accurate representations of your live application UI

The mockups contain all the compliance elements and CTA verification points that Campaign Registry requires.