# Twilio A2P 10DLC Campaign Registration Form - Help Desk System

## Campaign Information

### Campaign Use Case
**Select**: `Customer Care`

### Campaign Description
```
[Your Company Name] Help Desk Support provides IT support ticket updates to customers who have opened support requests. Recipients are customers who have requested technical assistance and specifically opted-in to receive SMS notifications for their support tickets. Messages include ticket status updates, resolution notifications, and support communications to keep customers informed about their IT support requests. All recipients have completed a two-step opt-in process confirming their consent to receive SMS updates.
```

### Message Flow/Opt-in Methods
```
Two-step opt-in process:
1. Global opt-in: Users enable SMS notifications in their User Preferences by checking a consent checkbox and providing their phone number
2. Ticket-level opt-in: Users opt-in per ticket when creating support requests via checkbox with explicit consent language
3. Confirmation SMS: System sends opt-in confirmation SMS requiring START reply to activate
4. Web-based consent: All opt-ins occur through authenticated web forms at [your-domain.com]/user-preferences
5. Documentation: All consent actions are logged with timestamps for compliance records
```

## Sample Messages

### Message 1 - Opt-in Confirmation
```
[Your Company] Help Desk: Reply START to receive updates for ticket #12345. Message and data rates may apply. Reply STOP to opt out anytime.
```

### Message 2 - Ticket Created
```
[Your Company] Support: Ticket #12345 created - Network connectivity issue. We'll keep you updated. Reply STOP to unsubscribe. Help: support@yourcompany.com
```

### Message 3 - Status Update
```
[Your Company] Support: Ticket #12345 updated - Status: In Progress. Technician assigned. Reply STOP to opt out.
```

### Message 4 - Resolution
```
[Your Company] Support: Ticket #12345 resolved! Check your email for details. Reply STOP to unsubscribe.
```

### Message 5 - Help Response
```
[Your Company] Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: support@yourcompany.com
```

## Keywords

### Opt-in Keywords
```
START, YES, SUBSCRIBE
```

### Opt-in Confirmation Message
```
You're now subscribed to SMS updates for [Your Company] Help Desk tickets. Reply STOP anytime to unsubscribe.
```

### Opt-out Keywords
```
STOP, QUIT, END, UNSUBSCRIBE, CANCEL
```

### Opt-out Response Message
```
You've been unsubscribed from [Your Company] Help Desk SMS updates. No more messages will be sent. Contact support@yourcompany.com for assistance.
```

### Help Keywords
```
HELP, INFO, SUPPORT
```

### Help Response Message
```
[Your Company] Help Desk SMS: Updates for support tickets. Reply START to subscribe, STOP to unsubscribe. Contact: support@yourcompany.com or [phone number]
```

## Additional Form Fields

### Website URL
```
https://yourcompany.com
```

### Privacy Policy URL
```
https://yourcompany.com/privacy-policy
```

### Terms of Service URL
```
https://yourcompany.com/terms-of-service
```

### Company Contact Information
- **Phone**: [Your main business phone number]
- **Email**: support@yourcompany.com
- **Address**: [Your business address]

### Message Frequency
```
Variable - Messages sent only when ticket status changes or updates occur. Typically 1-5 messages per ticket lifecycle. No promotional or marketing messages.
```

### Target Audience
```
Business customers and end users who have opened IT support tickets and explicitly opted-in to receive SMS notifications about their specific support requests.
```

### Compliance Statement
```
All SMS communications comply with TCPA regulations and company privacy policy. Recipients must provide explicit consent through our two-step opt-in process. We do not share mobile information with third parties for marketing purposes. All messages are transactional and related to customer support services.
```

## Important Notes for Form Completion

1. **Brand Name Consistency**: Ensure your brand name matches exactly with your registered brand in The Campaign Registry

2. **Sample Message Requirements**:
   - At least one message must include your business name
   - At least one message must include opt-out language
   - Messages should reflect actual content to be sent
   - Use bracket notation for variable fields: [TicketID], [Status], etc.

3. **Opt-in Evidence**:
   - Be prepared to provide screenshots of your user preferences page
   - Document the exact opt-in flow users experience
   - Show where consent language appears in your interface

4. **Contact Information**:
   - Use business phone number and email that customers can actually reach
   - Ensure these match your brand registration details

5. **Prohibited Content**:
   - Do not include any promotional or marketing messages
   - Avoid any potentially sensitive content
   - Focus strictly on operational support communications

6. **Documentation Requirements**:
   - Save copies of all form submissions
   - Keep screenshots of opt-in interfaces
   - Document your SMS sending procedures

## Pre-Submission Checklist

- [ ] Brand registration is approved and active
- [ ] All sample messages include business name
- [ ] Opt-out language is present in at least one sample
- [ ] Keywords are comprehensive (include common variations)
- [ ] Contact information is accurate and reachable
- [ ] Privacy policy mentions SMS communications
- [ ] Opt-in process is clearly documented
- [ ] Message frequency is realistic and documented
- [ ] No prohibited content in any samples
- [ ] All URLs are valid and accessible

## Expected Timeline

- **Initial Review**: 1-2 business days
- **Manual Vetting**: 2-3 weeks (due to high volume)
- **Revisions**: Additional 1-2 weeks if changes required
- **Total**: 3-5 weeks for complete approval

## Tips for Approval

1. **Be Specific**: Provide detailed, accurate descriptions
2. **Show Compliance**: Demonstrate clear understanding of regulations
3. **Professional Tone**: Use business-appropriate language throughout
4. **Complete Information**: Fill all fields thoroughly
5. **Consistency**: Ensure all information aligns across form sections
6. **Documentation**: Have supporting materials ready if requested

## Common Rejection Reasons to Avoid

- Vague or incomplete campaign descriptions
- Missing business name in sample messages
- Unclear opt-in processes
- Inconsistent brand information
- Sample messages that don't match the use case
- Missing or inadequate opt-out language
- Unrealistic message frequency estimates

## Contact for Questions

If you need clarification on any form fields:
- **Twilio Support**: Available through your Twilio Console
- **Campaign Registry**: https://www.campaignregistry.com/
- **Documentation**: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc

Remember: It's better to be overly detailed and compliant than risk rejection and delays in the approval process.