# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in HelpDesk, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email: **security@anglinai.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt within 48 hours
2. **Investigation**: We'll investigate and keep you updated
3. **Resolution**: We'll work on a fix and coordinate disclosure
4. **Credit**: We'll credit you in the security advisory (unless you prefer anonymity)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Security Best Practices

When deploying HelpDesk:

### Environment Variables

- Never commit `.env` files with real values
- Use secret management services in production
- Rotate API keys regularly
- Use different keys for development and production

### Firebase Security

- Review and customize `firestore.rules` for your needs
- Enable Firebase App Check
- Use Firebase Authentication properly
- Restrict API key usage in Google Cloud Console

### Authentication

- Enable multi-factor authentication for admin accounts
- Use strong password policies
- Implement session timeouts
- Monitor for suspicious login activity

### Data Protection

- Enable Firestore backups
- Use encryption at rest (Firebase default)
- Implement proper access controls
- Regular security audits

### Network Security

- Use HTTPS everywhere
- Configure CORS properly
- Implement rate limiting
- Monitor for DDoS attacks

## Known Security Considerations

### Multi-Tenant Data Isolation

HelpDesk uses Firestore security rules to isolate tenant data. Review `firestore.rules` to understand and verify the isolation model meets your requirements.

### Third-Party Services

HelpDesk integrates with external services. Review each service's security practices:

- Firebase/Google Cloud
- Algolia
- Email providers (Mailgun/SendGrid/SES)
- Twilio
- Stripe

### AI Features

The AI self-help feature sends data to Google's Gemini API. Consider this when handling sensitive information.

## Security Updates

Security updates will be:
- Released as patches as quickly as possible
- Announced via GitHub security advisories
- Documented in release notes

Subscribe to GitHub notifications to stay informed.
