<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# AI-Powered Self-Help System

# add this email as a viewer to shared docs
your-service-account@your-project-id.iam.gserviceaccount.com

## Overview
The help desk includes an intelligent self-help system that provides instant IT support using Google Gemini AI with a comprehensive FAQ database. Users can get immediate answers to common IT issues without creating tickets.

## How It Works

### 1. **FAQ-First Approach (Fastest)**
- **Purpose**: Instant responses for common questions
- **Database**: 50+ IT-specific FAQs covering passwords, email, software, hardware, network issues
- **Matching**: Uses fuzzy search (Fuse.js) with 70% confidence threshold
- **Speed**: Millisecond response time
- **Cost**: Free (no AI tokens used)

### 2. **AI Fallback (When Needed)**
- **Trigger**: When no FAQ matches user's question
- **Model**: Google Gemini 1.5 Flash
- **Context**: Uses company knowledge base + IT procedures
- **Processing**: 
  - Categorizes question (software/hardware/network/etc.)
  - Fetches relevant knowledge base articles
  - Generates personalized step-by-step solutions
- **Cost**: ~$0.002-0.004 per query

### 3. **Smart Features**

#### **Dynamic Content Replacement**
- Replaces `{SUPPORT_PHONE}` placeholders with actual support number from settings
- Ensures consistent contact information across all responses

#### **Context Preservation**
- Tracks conversation history
- Maintains context between questions
- Enables follow-up questions

#### **Seamless Escalation**
- "Still Need Help?" button creates tickets with full conversation context
- Pre-fills ticket with original question + AI suggestions
- No lost information during escalation

## User Experience

### **Self-Help Page (`/self-help`)**
1. **AI Chat Interface**: Interactive conversation with IT assistant
2. **Quick Actions**: Direct ticket creation and phone support
3. **Common Issues**: Categorized IT problems with chips for quick access
4. **Emergency Alerts**: Clear escalation path for urgent issues

### **Response Types**
- **FAQ Answers**: Formatted with current date and follow-up suggestions
- **AI Solutions**: Step-by-step instructions with safety warnings
- **Error Handling**: Graceful fallbacks with support contact information

## Technical Architecture

### **Core Components**
- **`aiService.ts`**: Main AI orchestration and Gemini integration
- **`faqService.ts`**: FAQ database with intelligent matching
- **`cacheService.ts`**: Token optimization for cost management
- **`SelfHelpChat.tsx`**: Interactive UI component
- **`SelfHelpPage.tsx`**: Full page layout with sidebar

### **Integration Points**
- **Config System**: Uses support phone, company settings
- **Theme System**: Respects user's accent color preferences
- **Auth System**: Authenticated users only
- **Ticket System**: Seamless escalation to traditional support

### **Cost Optimization**
- **FAQ First**: Eliminates 70-80% of AI calls
- **Context Caching**: Reduces token usage for repeat questions
- **Efficient Model**: Uses Gemini 1.5 Flash (lowest cost tier)
- **Smart Categorization**: Targeted responses reduce token waste

## Configuration

### **Environment Variables**
```env
VITE_GEMINI_API_KEY=your_api_key
VITE_ENABLE_AI_SELF_HELP=true
VITE_ENABLE_TOKEN_CACHE=false
```

### **Settings Integration**
- Support phone number automatically used throughout system
- Company branding and contact info included in responses
- Configurable via standard settings interface

## Benefits

### **For Users**
- **Instant Help**: No waiting for ticket responses
- **24/7 Availability**: AI works outside business hours
- **Consistent Answers**: Standardized solutions from knowledge base
- **Easy Escalation**: Smooth transition to human support when needed

### **For IT Team**
- **Reduced Ticket Volume**: Common issues resolved automatically
- **Better Context**: Escalated tickets include what user already tried
- **Knowledge Preservation**: FAQ database captures institutional knowledge
- **Analytics**: Track common issues and gaps in documentation

### **For Organization**
- **Cost Effective**: AI queries cost pennies vs. human support time
- **Scalable**: Handles unlimited concurrent users
- **Consistent Service**: Same quality help regardless of time or staff availability
- **Knowledge Building**: System learns from interactions to improve over time

## Future Enhancements

- **Integration with Google Docs**: Dynamic knowledge base from company documentation
- **Usage Analytics**: Track FAQ hits, AI query patterns, escalation rates
- **Learning System**: Automatic FAQ generation from successful AI responses
- **Multi-language Support**: Localized responses for global organizations