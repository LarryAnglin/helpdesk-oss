<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Complete Workflow Guide - Step by Step

## 🎯 Overview of the Workflow

```mermaid
Feature Branch → Pull Request → Preview URL → Code Review → Develop (Staging) → Main (Production)
```

## 📋 Table of Contents
1. [Initial Setup](#initial-setup)
2. [Daily Development Workflow](#daily-development-workflow)
3. [Creating Features](#creating-features)
4. [Testing on Preview URLs](#testing-on-preview-urls)
5. [Deploying to Staging](#deploying-to-staging)
6. [Deploying to Production](#deploying-to-production)
7. [Emergency Hotfixes](#emergency-hotfixes)
8. [Common Scenarios](#common-scenarios)

## 🚀 Initial Setup

### First Time Only - Create Develop Branch

```bash
# Run the setup script
cd /Users/larryanglin/Projects/HelpDesk
./scripts/setup-develop-branch.sh
```

### Configure Branch Protection

1. Go to https://github.com/LarryAnglin/helpdesk-oss/settings/branches
2. Add protection rules for `main` and `develop` branches
3. See `BRANCH_PROTECTION_SETUP.md` for detailed settings

## 💻 Daily Development Workflow

### Starting Your Day

```bash
# Always start by updating your local develop branch
git checkout develop
git pull origin develop
```

### Creating a New Feature

#### Step 1: Create Feature Branch

```bash
# Create a new feature branch from develop
git checkout -b feature/add-user-export

# For bug fixes
git checkout -b fix/ticket-loading-error

# For updates
git checkout -b update/improve-ui-colors
```

#### Step 2: Make Your Changes

```bash
# Work on your feature
cd react
npm run dev

# Make changes to files
# Test locally at http://localhost:5173
```

#### Step 3: Commit Your Changes

```bash
# Check what you've changed
git status

# Add files
git add .

# Or add specific files
git add react/src/components/NewComponent.tsx

# Commit with descriptive message
git commit -m "Add user export functionality to admin panel

- Add export button to user list
- Implement CSV export function
- Add date range filter for exports"
```

#### Step 4: Push to GitHub

```bash
# First push
git push -u origin feature/add-user-export

# Subsequent pushes
git push
```

## 🔗 Creating a Pull Request

### Step 1: Go to GitHub

After pushing, GitHub will show a banner:
- Click **"Compare & pull request"**

Or manually:
1. Go to https://github.com/LarryAnglin/helpdesk-oss
2. Click **"Pull requests"**
3. Click **"New pull request"**

### Step 2: Fill Out PR Template

```markdown
## Description
Added user export functionality to allow admins to download user data as CSV

## Type of Change
- [x] ✨ New feature (non-breaking change which adds functionality)

## Testing
- [x] Tested locally
- [ ] Tested on preview URL (will do after PR creation)
- [ ] Tested on staging

## Screenshots
[Add screenshot of export button]
```

### Step 3: Create the PR

1. **Base branch**: `develop` (NOT main!)
2. **Compare branch**: `feature/add-user-export`
3. Click **"Create pull request"**

### Step 4: Wait for Preview URL

Within 2-3 minutes, a bot will comment:
```
🔥 Preview deployed to: https://your-project-id--pr-42.web.app
```

## 🧪 Testing on Preview URLs

### Finding Your Preview URL

1. Check the PR comments for the preview URL
2. Or go to Actions tab → Click your workflow → Find the URL in logs

### Testing Checklist

```markdown
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser testing
- [ ] Share with stakeholders for feedback
```

### Updating After Feedback

```bash
# Make requested changes
git add .
git commit -m "Address PR feedback - improve error handling"
git push

# Preview URL auto-updates!
```

## 📦 Deploying to Staging

### After PR Approval

1. Click **"Merge pull request"** on GitHub
2. Choose **"Squash and merge"** (recommended)
3. Edit commit message if needed
4. Click **"Confirm merge"**

### Automatic Staging Deployment

- Staging URL: https://your-project-id--staging.web.app
- Deploys automatically when PR merges to develop
- Takes 2-3 minutes

### Testing on Staging

```markdown
Staging Testing Checklist:
- [ ] All features work correctly
- [ ] No integration issues
- [ ] Performance is acceptable
- [ ] Error handling works
- [ ] Data persistence works
```

## 🚀 Deploying to Production

### Creating a Production PR

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create PR from develop to main
# Do this on GitHub:
```

1. Go to https://github.com/LarryAnglin/helpdesk-oss
2. Click **"New pull request"**
3. Base: `main` ← Compare: `develop`
4. Title: "Release: v1.2.0 - User Export Feature"

### Production PR Description

```markdown
## Release v1.2.0

### Features
- Add user export functionality (#42)
- Improve UI responsiveness (#43)

### Bug Fixes
- Fix ticket loading error (#44)

### Tested
- [x] All features tested on staging
- [x] No breaking changes
- [x] Ready for production
```

### Deploying

1. Get approval (required by branch protection)
2. Click **"Merge pull request"**
3. Production deploys automatically
4. Monitor at: https://your-project-id.web.app

## 🚨 Emergency Hotfixes

### For Critical Production Bugs

```bash
# Create hotfix from main (not develop!)
git checkout main
git pull origin main
git checkout -b hotfix/critical-auth-bug

# Make minimal fix
git add .
git commit -m "Fix critical authentication bug"
git push -u origin hotfix/critical-auth-bug
```

### Hotfix PR Process

1. Create PR: `hotfix/critical-auth-bug` → `main`
2. Mark as urgent in PR description
3. Get expedited review
4. Merge to main
5. **Important**: Also merge to develop!

```bash
# After hotfix is in production
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## 📖 Common Scenarios

### Scenario 1: Working on Multiple Features

```bash
# Feature 1
git checkout develop
git checkout -b feature/feature-1
# work and push

# Feature 2 (while feature 1 is in review)
git checkout develop  # Always branch from develop!
git checkout -b feature/feature-2
# work and push
```

### Scenario 2: Updating Your Branch

```bash
# If develop has new changes while you're working
git checkout develop
git pull origin develop
git checkout feature/my-feature
git merge develop

# Resolve conflicts if any
git push
```

### Scenario 3: Abandoning a Feature

```bash
# Delete local branch
git checkout develop
git branch -D feature/abandoned-feature

# Delete remote branch
git push origin --delete feature/abandoned-feature
```

### Scenario 4: Cherry-picking a Single Commit

```bash
# If you need just one commit from a feature
git checkout develop
git cherry-pick <commit-hash>
git push
```

## 🎯 Best Practices

### Commit Messages

```bash
# Good
git commit -m "Add CSV export for user data with date filtering"

# Bad
git commit -m "Update files"
```

### Branch Names

```bash
# Good
feature/add-user-export
fix/login-error-handling
update/react-dependencies

# Bad
feature/stuff
my-branch
test123
```

### PR Sizes

- **Ideal**: 200-400 lines changed
- **Maximum**: 1000 lines
- **If larger**: Split into multiple PRs

### Review Process

1. **Self-review** before requesting others
2. **Respond** to all feedback
3. **Test** the preview URL
4. **Approve** only after testing

## 🔍 Checking Deployment Status

### View All Environments

```bash
# See all Firebase hosting channels
firebase hosting:channel:list
```

### Check Current Deployments

- **Production**: https://your-project-id.web.app
- **Staging**: https://your-project-id--staging.web.app
- **PR Preview**: Check PR comments

### Monitor GitHub Actions

1. Go to https://github.com/LarryAnglin/helpdesk-oss/actions
2. Click on the latest workflow
3. Watch real-time logs

## 🆘 Troubleshooting

### Preview URL Not Working

```bash
# Check if build passed
# Go to Actions tab → Check for errors

# Common fixes:
npm install  # Update dependencies
npm run build  # Test build locally
```

### Merge Conflicts

```bash
# Update your branch
git checkout feature/my-feature
git merge develop

# Resolve conflicts in VS Code
# Then:
git add .
git commit -m "Resolve merge conflicts with develop"
git push
```

### Deployment Failed

1. Check GitHub Actions logs
2. Common issues:
   - Missing environment variables
   - Build errors
   - Firebase quota exceeded

## 📊 Workflow Summary Card

```
┌─────────────────────────────────────────┐
│         QUICK WORKFLOW REFERENCE         │
├─────────────────────────────────────────┤
│ 1. git checkout -b feature/name         │
│ 2. Make changes                         │
│ 3. git add . && git commit -m "msg"    │
│ 4. git push -u origin feature/name      │
│ 5. Create PR → develop                  │
│ 6. Test preview URL                     │
│ 7. Merge to develop (staging)           │
│ 8. Test staging                         │
│ 9. PR develop → main                    │
│ 10. Merge to main (production)          │
└─────────────────────────────────────────┘
```

## 🎉 You're Ready!

This workflow ensures:
- ✅ No accidental production deployments
- ✅ Everything is tested before going live
- ✅ Easy rollbacks if needed
- ✅ Clear history of all changes
- ✅ Collaborative development

Start with your first feature branch and experience the smooth deployment process!