 Option A: SendGrid (Recommended)

  1. SMTP connection URI: smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
  2. Leave SMTP password empty (included in URI)
  3. Default FROM address: Help Desk <noreply@yourdomain.com>

  Option B: Mailgun

  1. SMTP connection URI: smtps://YOUR_MAILGUN_USERNAME:YOUR_MAILGUN_PASSWORD@smtp.mailgun.org:465
  2. Leave SMTP password empty (included in URI)
  3. Default FROM address: Help Desk <noreply@yourdomain.com>

  Option C: Gmail/Google Workspace

  1. SMTP connection URI: smtps://your-email@gmail.com:YOUR_APP_PASSWORD@smtp.gmail.com:465
  2. Leave SMTP password empty (included in URI)
  3. Default FROM address: your-email@gmail.com
  4. ⚠️ Note: You must enable 2FA and create an App Password in your Google account

  Option D: Office 365/Outlook

  1. SMTP connection URI: smtps://your-email@outlook.com:YOUR_PASSWORD@smtp.office365.com:587
  2. Leave SMTP password empty (included in URI)
  3. Default FROM address: your-email@outlook.com

  Collection Settings:

  5. Email documents collection
  - Set to: mail (this is what the Help Desk app uses)

  6. Default FROM address
  - Enter your help desk email: Help Desk <noreply@yourdomain.com>
  - Replace yourdomain.com with your actual domain

  7. Default REPLY-TO address (Optional)
  - Enter: support@yourdomain.com (where users should reply)

  Optional Settings (Leave as Default):

  8. Users collection: Leave empty9. Templates collection: Leave empty10. Firestore TTL type: Never11. Firestore TTL value: Leave empty12. TLS Options:
  Leave empty

  Getting Your SMTP Credentials:

  For SendGrid:

  1. Sign up at https://sendgrid.com
  2. Go to Settings → API Keys
  3. Create API key with "Mail Send" permissions
  4. Use this API key in the SMTP URI

  For Mailgun:

  1. Sign up at https://mailgun.com
  2. Go to Sending → Domain settings
  3. Find your SMTP credentials under "SMTP"
  4. Use these credentials in the SMTP URI

  For Gmail:

  1. Enable 2-Factor Authentication
  2. Go to Google Account → Security → App passwords
  3. Generate app password for "Mail"
  4. Use this app password (not your regular password)

  Testing Your Configuration:

  After installation:
  1. Go to your Help Desk application
  2. Create a test ticket
  3. Check if you receive email notifications
  4. If emails don't work, check Firebase Console → Extensions → Trigger Email for error logs

  Common Issues:

  - "Authentication failed" → Check your SMTP credentials
  - "Connection refused" → Verify SMTP host and port
  - "Sender not authorized" → Verify your email domain with your provider