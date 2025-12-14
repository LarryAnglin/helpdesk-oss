/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import Fuse from 'fuse.js';
import { faqFirestoreService } from '../firebase/faqFirestoreService';

export interface FAQ {
  id: string;
  category: string;
  questions: string[]; // Multiple ways to ask the same thing
  answer: string;
  keywords: string[]; // Additional keywords for matching
  priority: number; // Higher numbers = higher priority in results
  lastUpdated: Date;
  usage_count?: number; // Track how often this FAQ is matched
}

export interface FAQMatch {
  faq: FAQ;
  confidence: number; // 0-1 score
  matchedQuestion: string;
  matchType: 'exact' | 'fuzzy' | 'keyword';
}

// Legacy hardcoded FAQs for migration - will be moved to Firestore
export const LEGACY_HELPDESK_FAQS: FAQ[] = [
  // Password & Account Issues
  {
    id: 'password-reset',
    category: 'Account & Password',
    questions: [
      'How do I reset my password?',
      'I forgot my password',
      'Password reset',
      'Can\'t log in',
      'Password not working',
      'How to change password?'
    ],
    answer: `To reset your password:

1. **For Windows/Domain accounts**: Press Ctrl+Alt+Del and click "Change password", or contact IT at {SUPPORT_PHONE}
2. **For company applications**: Use the "Forgot Password" link on the login page
3. **For email**: Contact IT support for assistance

**Password Requirements:**
- At least 8 characters
- Include uppercase, lowercase, number, and special character
- Cannot reuse last 5 passwords

If you're still having trouble, create a ticket or call IT support at {SUPPORT_PHONE}.`,
    keywords: ['password', 'reset', 'login', 'account', 'forgot', 'change'],
    priority: 10,
    lastUpdated: new Date()
  },

  {
    id: 'account-locked',
    category: 'Account & Password',
    questions: [
      'My account is locked',
      'Account locked out',
      'Can\'t access my account',
      'Account disabled',
      'Locked out of system',
      'Account suspended'
    ],
    answer: `If your account is locked:

1. **Wait 15 minutes** - Accounts auto-unlock after failed login attempts
2. **Clear browser cache** - Sometimes cached credentials cause issues
3. **Try a different device** - Test if the issue is device-specific
4. **Contact IT immediately** if urgent: {SUPPORT_PHONE}

**Common causes:**
- Too many failed login attempts
- Password expired
- Account needs reactivation
- Security policy violations

We'll unlock your account and help identify the root cause.`,
    keywords: ['locked', 'lockout', 'disabled', 'suspended', 'account', 'access'],
    priority: 9,
    lastUpdated: new Date()
  },

  // Email Issues
  {
    id: 'email-not-working',
    category: 'Email & Communication',
    questions: [
      'Email not working',
      'Can\'t send emails',
      'Email not receiving',
      'Outlook problems',
      'Email issues',
      'Mail server error'
    ],
    answer: `For email issues, try these steps:

**Quick Fixes:**
1. **Check internet connection** - Try browsing to a website
2. **Restart Outlook** - Close completely and reopen
3. **Check if others have email issues** - Ask colleagues
4. **Try webmail** - Access email through your web browser

**Common Solutions:**
- **Large mailbox**: Delete old emails, empty deleted items
- **Corrupted profile**: We may need to recreate your email profile
- **Server maintenance**: Check for company-wide outages

**Still not working?** Create a ticket with:
- Error messages (screenshot helpful)
- When it started
- What you were doing when it failed

Contact IT: {SUPPORT_PHONE} for urgent email issues.`,
    keywords: ['email', 'outlook', 'mail', 'send', 'receive', 'server', 'exchange'],
    priority: 9,
    lastUpdated: new Date()
  },

  {
    id: 'email-setup-phone',
    category: 'Email & Communication',
    questions: [
      'Setup email on phone',
      'Email on mobile',
      'iPhone email setup',
      'Android email setup',
      'Mobile email configuration',
      'Phone email not working'
    ],
    answer: `To set up company email on your mobile device:

**iPhone/iPad:**
1. Settings > Mail > Accounts > Add Account
2. Choose "Microsoft Exchange"
3. Enter your full email address
4. Enter your regular domain password
5. Follow prompts to complete setup

**Android:**
1. Email app > Add Account > Exchange
2. Enter email address and password
3. Follow setup prompts

**Settings needed:**
- Server: mail.company.com
- Use SSL/TLS encryption
- Port 993 (IMAP) or 995 (POP3)

**Need help?** Create a ticket and include:
- Device type (iPhone, Android, etc.)
- Any error messages
- Your email address

We can also provide remote assistance for setup.`,
    keywords: ['mobile', 'phone', 'iphone', 'android', 'email setup', 'configuration'],
    priority: 7,
    lastUpdated: new Date()
  },

  // Software Issues
  {
    id: 'software-not-working',
    category: 'Software & Applications',
    questions: [
      'Software not working',
      'Application crashed',
      'Program won\'t start',
      'Software error',
      'Application freezing',
      'Software installation'
    ],
    answer: `For software problems, try these troubleshooting steps:

**Basic Troubleshooting:**
1. **Restart the application** - Close completely and reopen
2. **Restart your computer** - This fixes many issues
3. **Check for updates** - Software may need updating
4. **Try as administrator** - Right-click > "Run as administrator"

**Common Issues:**
- **Won't start**: Check if antivirus is blocking it
- **Crashes**: Check available disk space and memory
- **Slow performance**: Close other applications
- **Missing features**: User may need different license

**For ticket, include:**
- Software name and version
- Error messages (screenshots helpful)
- What you were trying to do
- When it last worked

**Software installation requests**: Submit ticket with business justification and manager approval.`,
    keywords: ['software', 'application', 'program', 'install', 'crash', 'error', 'freeze'],
    priority: 8,
    lastUpdated: new Date()
  },

  {
    id: 'microsoft-office-issues',
    category: 'Software & Applications',
    questions: [
      'Word not working',
      'Excel problems',
      'PowerPoint issues',
      'Office 365 problems',
      'Microsoft Office errors',
      'Office activation'
    ],
    answer: `For Microsoft Office issues:

**Quick Fixes:**
1. **Save your work** first, then restart the Office app
2. **Check for Office updates** - File > Account > Update Options
3. **Repair Office** - Control Panel > Programs > Microsoft Office > Change > Quick Repair

**Common Problems:**
- **Activation errors**: Sign out and back into your Office account
- **Slow performance**: Disable add-ins temporarily
- **File won't open**: Try opening in Safe Mode (hold Ctrl while starting)
- **Crashes**: Check available memory and disk space

**Office 365 Online:**
- Try using the web version at office.com
- Works when desktop version has issues

**Specific Error Codes:**
Include error numbers in your ticket (e.g., Error 0x80070005)

**Document Recovery:**
Office usually saves auto-recovery files. We can help locate them.`,
    keywords: ['office', 'word', 'excel', 'powerpoint', 'microsoft', '365', 'activation'],
    priority: 8,
    lastUpdated: new Date()
  },

  // Internet & Network
  {
    id: 'internet-slow',
    category: 'Network & Internet',
    questions: [
      'Internet is slow',
      'WiFi problems',
      'Network slow',
      'Connection issues',
      'Can\'t connect to internet',
      'Network down'
    ],
    answer: `For internet/network problems:

**Quick Diagnostics:**
1. **Test speed**: Visit speedtest.net to check your connection
2. **Try different websites** - Is it all sites or just one?
3. **Check WiFi signal** - Weak signal causes slow speeds
4. **Test on different device** - Phone, tablet, etc.

**WiFi Issues:**
- **Restart WiFi**: Turn off/on WiFi in settings
- **Reconnect**: Forget network and reconnect with password
- **Move closer**: WiFi range may be limited
- **Check password**: Ensure correct WiFi credentials

**Wired Connection:**
- Check cable connections
- Try different Ethernet port
- Restart network adapter

**Company Network:**
- Check for network maintenance announcements
- Contact IT if widespread outage: {SUPPORT_PHONE}

**Include in ticket:**
- Speed test results
- Specific error messages
- Location where problem occurs`,
    keywords: ['internet', 'wifi', 'network', 'slow', 'connection', 'ethernet'],
    priority: 9,
    lastUpdated: new Date()
  },

  {
    id: 'vpn-issues',
    category: 'Network & Internet',
    questions: [
      'VPN not working',
      'Can\'t connect to VPN',
      'VPN slow',
      'Remote access problems',
      'VPN disconnects',
      'VPN setup'
    ],
    answer: `For VPN issues:

**Before troubleshooting:**
- Ensure you have good internet connection first
- Check if VPN is required for what you're accessing

**Common Fixes:**
1. **Restart VPN software** completely
2. **Try different server** - Choose closest geographic location
3. **Check credentials** - Ensure username/password correct
4. **Restart network adapter** - Network settings > Change adapter options

**Speed Issues:**
- VPN will always be slower than direct connection
- Try different VPN servers
- Close bandwidth-heavy applications

**Can't Connect:**
- Firewall may be blocking VPN
- Antivirus interference
- Need updated VPN client

**Work from Home Setup:**
We provide VPN setup guides and can schedule remote assistance.

**Include in ticket:**
- VPN software being used
- Error messages
- When it last worked
- Working from home or office?`,
    keywords: ['vpn', 'remote', 'connection', 'work from home', 'tunnel'],
    priority: 7,
    lastUpdated: new Date()
  },

  // Hardware Issues
  {
    id: 'computer-slow',
    category: 'Hardware & Performance',
    questions: [
      'Computer is slow',
      'PC running slow',
      'Computer performance',
      'Laptop slow',
      'System freezing',
      'Computer hanging'
    ],
    answer: `For slow computer performance:

**Quick Fixes:**
1. **Restart your computer** - Clears memory and temporary files
2. **Close unnecessary programs** - Check Task Manager (Ctrl+Shift+Esc)
3. **Check available storage** - Need at least 15% free disk space
4. **Run Windows updates** - Keep system current

**Common Causes:**
- **Too many startup programs** - We can disable unnecessary ones
- **Full hard drive** - Delete temp files, old downloads
- **Malware** - Run antivirus scan
- **Outdated hardware** - May need RAM or SSD upgrade

**Warning Signs:**
- Blue screen errors
- Unusual noises from computer
- Frequent freezing
- Very long boot times

**Temporary Workaround:**
Save your work frequently and restart when it gets too slow.

**Hardware Upgrade:**
If computer is old, we can evaluate for hardware upgrades or replacement.

**Include in ticket:**
- Age of computer
- When slowness started
- What programs you typically use`,
    keywords: ['slow', 'performance', 'freezing', 'hanging', 'speed', 'computer'],
    priority: 8,
    lastUpdated: new Date()
  },

  {
    id: 'printer-problems',
    category: 'Hardware & Peripherals',
    questions: [
      'Printer not working',
      'Can\'t print',
      'Printer offline',
      'Print job stuck',
      'Printer driver',
      'Paper jam'
    ],
    answer: `For printer issues:

**Basic Troubleshooting:**
1. **Check power and connections** - Ensure printer is on and connected
2. **Check paper and ink/toner** - Refill if low
3. **Clear print queue** - Cancel stuck print jobs
4. **Restart printer** - Turn off, wait 30 seconds, turn on

**Common Problems:**
- **"Printer Offline"**: Right-click printer > "Use Printer Online"
- **Paper jams**: Follow printer display instructions to clear
- **Poor print quality**: Check ink/toner levels, clean print heads
- **Driver issues**: We may need to reinstall printer drivers

**Network Printers:**
- Verify you're connected to correct network
- Try printing from different computer
- Check if printer has IP address conflicts

**Print from Phone:**
Most office printers support AirPrint (iPhone) or Google Print (Android)

**Include in ticket:**
- Printer model and location
- Error messages on printer display
- What you're trying to print
- When it last worked

**Urgent printing needs:** Ask colleagues to print for you temporarily.`,
    keywords: ['printer', 'print', 'offline', 'paper jam', 'toner', 'driver'],
    priority: 7,
    lastUpdated: new Date()
  },

  // Phone & Communication
  {
    id: 'phone-not-working',
    category: 'Phone & Communication',
    questions: [
      'Phone not working',
      'Can\'t make calls',
      'Phone line dead',
      'Voicemail issues',
      'Phone system problems',
      'Extension not working'
    ],
    answer: `For phone system issues:

**Basic Checks:**
1. **Check cable connections** - Ensure phone cord properly connected
2. **Check for dial tone** - Lift handset and listen
3. **Try different extension** - Test if it's phone-specific or system-wide
4. **Check power** - Some phones need power adapters

**Common Issues:**
- **No dial tone**: Check network cable connections
- **Can't dial out**: May need to dial 9 for outside line
- **Poor audio quality**: Check headset connections
- **Voicemail not working**: Password may need reset

**VoIP Phones:**
- Restart phone by unplugging power for 30 seconds
- Check network connectivity
- Look for error messages on phone display

**Mobile/Softphone:**
- Check internet connection for app-based phones
- Update phone application if available
- Restart phone app

**Include in ticket:**
- Phone model and extension number
- Specific error messages
- When it last worked
- Physical location of phone

**Emergency:** Use your cell phone or ask to use colleague's phone for urgent calls.`,
    keywords: ['phone', 'voicemail', 'extension', 'calls', 'dial tone', 'voip'],
    priority: 7,
    lastUpdated: new Date()
  },

  // Security & Access
  {
    id: 'file-access-denied',
    category: 'Security & Access',
    questions: [
      'Access denied',
      'Can\'t access file',
      'Permission denied',
      'Folder access',
      'File permissions',
      'Shared drive access'
    ],
    answer: `For file access issues:

**Quick Checks:**
1. **Try different file** - Is it one file or multiple files?
2. **Check if file is open** - Someone else may be using it
3. **Verify file location** - Ensure you're accessing correct path
4. **Try copying file** - Sometimes read-only access works

**Common Causes:**
- **Insufficient permissions** - Need access granted by manager/IT
- **File in use** - Wait for other user to close file
- **Corrupted file** - May need restoration from backup
- **Network drive disconnected** - Reconnect to shared folders

**Shared Drive Access:**
- Ensure you're on company network or VPN
- Check if drive letter is mapped correctly
- Try accessing via UNC path (\\\\server\\share)

**Request Access:**
- Contact file owner or your manager
- Include business justification
- Specify what level of access needed (read, write, modify)

**Include in ticket:**
- Full file path and name
- Error message (screenshot helpful)
- What you're trying to do with the file
- When you last had access

**Urgent:** Ask colleague with access to help temporarily.`,
    keywords: ['access', 'denied', 'permission', 'file', 'folder', 'shared drive'],
    priority: 8,
    lastUpdated: new Date()
  },

  // General IT Support
  {
    id: 'new-software-request',
    category: 'Requests & Installations',
    questions: [
      'Need new software',
      'Software installation request',
      'Install new program',
      'Software licensing',
      'Application request',
      'Software approval'
    ],
    answer: `To request new software:

**Required Information:**
1. **Software name and version** - Be specific
2. **Business justification** - Why do you need it?
3. **Manager approval** - Get written approval first
4. **Budget information** - Who's paying for license?
5. **Alternative solutions** - What you're currently using

**Process:**
1. **Submit ticket** with above information
2. **Security review** - IT evaluates security implications
3. **Procurement** - Purchase license if approved
4. **Installation** - Schedule installation appointment
5. **Training** - We can provide basic usage guidance

**Common Free Alternatives:**
- **Office Suite**: LibreOffice, Google Workspace
- **PDF Editor**: PDFill, PDF-XChange
- **Image Editor**: GIMP, Paint.NET
- **Video Player**: VLC Media Player

**Timeline:**
- Free software: 1-2 business days
- Paid software: 1-2 weeks (procurement time)
- Specialized software: 2-4 weeks

**Security Note:**
Installing unauthorized software violates company policy and creates security risks.`,
    keywords: ['software', 'install', 'request', 'license', 'approval', 'new program'],
    priority: 5,
    lastUpdated: new Date()
  },

  {
    id: 'computer-replacement',
    category: 'Requests & Installations',
    questions: [
      'Need new computer',
      'Computer replacement',
      'Hardware upgrade',
      'Laptop request',
      'Desktop replacement',
      'Computer too old'
    ],
    answer: `For computer replacement requests:

**Evaluation Criteria:**
- **Age**: Computers older than 4-5 years eligible
- **Performance**: Cannot meet job requirements
- **Repair costs**: Exceeds 50% of replacement cost
- **Business need**: New software requirements

**Process:**
1. **Submit ticket** with business justification
2. **Manager approval** required
3. **IT assessment** - We evaluate current hardware
4. **Budget approval** - Finance must approve expense
5. **Procurement** - Order new equipment
6. **Data migration** - Transfer files and settings
7. **Setup appointment** - Install and configure

**Information Needed:**
- Current computer age and model
- Performance issues experienced
- Software requirements
- Mobile/portable needs
- Budget constraints

**Timeline:**
- Standard business computer: 1-2 weeks
- Specialized requirements: 2-4 weeks
- Custom configurations: 3-6 weeks

**Temporary Solutions:**
- Memory upgrade (RAM)
- SSD hard drive upgrade
- External monitors
- Docking stations for laptops`,
    keywords: ['computer', 'replacement', 'new', 'hardware', 'laptop', 'desktop', 'upgrade'],
    priority: 4,
    lastUpdated: new Date()
  }
];

export class FAQService {
  private fuse: Fuse<FAQ>;
  private exactMatchCache: Map<string, FAQ> = new Map();
  private fuseOptions: any;
  private faqs: FAQ[] = [];
  private isInitialized: boolean = false;
  
  constructor() {
    // Configure Fuse.js for fuzzy searching
    this.fuseOptions = {
      keys: [
        { name: 'questions', weight: 0.7 },
        { name: 'keywords', weight: 0.2 },
        { name: 'answer', weight: 0.1 }
      ],
      threshold: 0.4, // Lower = more strict matching
      distance: 100,
      minMatchCharLength: 3,
      includeScore: true,
      includeMatches: true
    };
    
    // Initialize empty - will load from Firestore
    this.faqs = [];
    this.fuse = new Fuse(this.faqs, this.fuseOptions);
    this.loadFAQsFromFirestore();
  }

  // Load FAQs from Firestore
  private async loadFAQsFromFirestore(): Promise<void> {
    try {
      this.faqs = await faqFirestoreService.getAllFAQs();
      this.rebuildSearchIndices();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load FAQs from Firestore, using legacy FAQs:', error);
      // Fallback to legacy FAQs if Firestore fails
      this.faqs = [...LEGACY_HELPDESK_FAQS];
      this.rebuildSearchIndices();
      this.isInitialized = true;
    }
  }

  // Ensure FAQs are loaded before operations
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.loadFAQsFromFirestore();
    }
  }

  // Force reload from Firestore (useful after updates)
  public async reloadFAQs(): Promise<void> {
    this.isInitialized = false;
    await this.loadFAQsFromFirestore();
  }

  private buildExactMatchCache(): void {
    this.exactMatchCache.clear();
    this.faqs.forEach(faq => {
      faq.questions.forEach(question => {
        const normalized = this.normalizeQuestion(question);
        this.exactMatchCache.set(normalized, faq);
      });
      
      // Also add keywords to exact match cache
      faq.keywords.forEach(keyword => {
        const normalized = this.normalizeQuestion(keyword);
        this.exactMatchCache.set(normalized, faq);
      });
    });
  }

  private rebuildSearchIndices(): void {
    this.fuse = new Fuse(this.faqs, this.fuseOptions);
    this.buildExactMatchCache();
  }

  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  // Main method to find FAQ matches
  public async findMatches(question: string, maxResults: number = 3, minConfidence: number = 0.6): Promise<FAQMatch[]> {
    await this.ensureInitialized();
    const matches: FAQMatch[] = [];
    const normalizedQuestion = this.normalizeQuestion(question);

    // 1. Try exact matching first (highest confidence)
    const exactMatch = this.exactMatchCache.get(normalizedQuestion);
    if (exactMatch) {
      matches.push({
        faq: exactMatch,
        confidence: 1.0,
        matchedQuestion: question,
        matchType: 'exact'
      });
      
      // Increment usage count in Firestore
      faqFirestoreService.incrementUsageCount(exactMatch.id);
      return matches;
    }

    // 2. Try keyword matching
    const keywordMatches = this.findKeywordMatches(question, maxResults);
    matches.push(...keywordMatches);

    // 3. Try fuzzy matching with Fuse.js
    const fuzzyMatches = this.findFuzzyMatches(question, maxResults);
    matches.push(...fuzzyMatches);

    // 4. Sort by confidence and priority, remove duplicates
    const uniqueMatches = this.deduplicateMatches(matches);
    const sortedMatches = uniqueMatches
      .filter(match => match.confidence >= minConfidence)
      .sort((a, b) => {
        // Sort by confidence first, then by FAQ priority
        if (Math.abs(a.confidence - b.confidence) < 0.1) {
          return b.faq.priority - a.faq.priority;
        }
        return b.confidence - a.confidence;
      })
      .slice(0, maxResults);

    // Increment usage counts in Firestore
    sortedMatches.forEach(match => {
      faqFirestoreService.incrementUsageCount(match.faq.id);
    });

    return sortedMatches;
  }

  private findKeywordMatches(question: string, maxResults: number): FAQMatch[] {
    const matches: FAQMatch[] = [];
    const questionWords = this.normalizeQuestion(question).split(' ');
    
    this.faqs.forEach(faq => {
      let matchCount = 0;
      let totalKeywords = faq.keywords.length;
      
      faq.keywords.forEach(keyword => {
        const keywordWords = this.normalizeQuestion(keyword).split(' ');
        if (keywordWords.some(kw => questionWords.some(qw => qw.includes(kw) || kw.includes(qw)))) {
          matchCount++;
        }
      });
      
      if (matchCount > 0) {
        const confidence = Math.min(0.95, (matchCount / totalKeywords) * 0.8 + 0.3);
        matches.push({
          faq,
          confidence,
          matchedQuestion: question,
          matchType: 'keyword'
        });
      }
    });
    
    return matches.slice(0, maxResults);
  }

  private findFuzzyMatches(question: string, maxResults: number): FAQMatch[] {
    const results = this.fuse.search(question, { limit: maxResults });
    
    return results.map(result => ({
      faq: result.item,
      confidence: 1 - (result.score || 1), // Invert score to get confidence
      matchedQuestion: question,
      matchType: 'fuzzy' as const
    }));
  }

  private deduplicateMatches(matches: FAQMatch[]): FAQMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      if (seen.has(match.faq.id)) {
        return false;
      }
      seen.add(match.faq.id);
      return true;
    });
  }

  // Replace phone placeholders with actual support phone
  private replacePhonePlaceholders(text: string, supportPhone: string = 'IT Support'): string {
    return text.replace(/{SUPPORT_PHONE}/g, supportPhone);
  }

  // Get best single match
  public async getBestMatch(question: string, minConfidence: number = 0.7, supportPhone?: string): Promise<FAQMatch | null> {
    const matches = await this.findMatches(question, 1, minConfidence);
    if (matches.length > 0) {
      const match = matches[0];
      // Replace phone placeholders in the FAQ answer
      match.faq.answer = this.replacePhonePlaceholders(match.faq.answer, supportPhone || 'IT Support');
      return match;
    }
    return null;
  }

  // Get all FAQs by category
  public async getFAQsByCategory(): Promise<Record<string, FAQ[]>> {
    await this.ensureInitialized();
    const categories: Record<string, FAQ[]> = {};
    
    this.faqs.forEach(faq => {
      if (!categories[faq.category]) {
        categories[faq.category] = [];
      }
      categories[faq.category].push(faq);
    });
    
    // Sort by priority within each category
    Object.keys(categories).forEach(category => {
      categories[category].sort((a, b) => b.priority - a.priority);
    });
    
    return categories;
  }

  // Get FAQ usage statistics
  public async getUsageStats(): Promise<{ totalQueries: number; faqHits: number; categories: Record<string, number> }> {
    await this.ensureInitialized();
    const totalQueries = this.faqs.reduce((sum, faq) => sum + (faq.usage_count || 0), 0);
    const categories: Record<string, number> = {};
    
    this.faqs.forEach(faq => {
      const count = faq.usage_count || 0;
      categories[faq.category] = (categories[faq.category] || 0) + count;
    });
    
    return {
      totalQueries,
      faqHits: totalQueries,
      categories
    };
  }

  // Get all FAQs
  public async getAllFAQs(): Promise<FAQ[]> {
    await this.ensureInitialized();
    return [...this.faqs];
  }
}

// Export singleton instance
export const faqService = new FAQService();