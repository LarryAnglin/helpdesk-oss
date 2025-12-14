<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Deployment Strategy Guide

## 🎯 Overview

This project uses a multi-environment deployment strategy with Firebase Hosting Channels:

```
main branch → Production (live)
develop branch → Staging 
feature/* branches → Temporary preview URLs
Pull Requests → PR preview URLs (7-day expiration)
```

## 🌐 Environment URLs

### Production
- **URL**: https://your-project-id.web.app
- **Branch**: `main`
- **Deployment**: Automatic on push
- **Includes**: Functions, Rules, Full deployment

### Staging
- **URL**: https://your-project-id--staging.web.app
- **Branch**: `develop`
- **Deployment**: Automatic on push
- **Purpose**: Test features before production

### PR Previews
- **URL**: https://your-project-id--pr-{number}.web.app
- **Trigger**: Pull request opened/updated
- **Expires**: 7 days
- **Purpose**: Review changes before merging

## 🔄 Recommended Git Workflow

### 1. Feature Development
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Make changes and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

### 2. Create Pull Request
- Target: `develop` branch
- Preview URL will be automatically created
- Share preview URL for review

### 3. Merge to Staging
```bash
# After PR approval
git checkout develop
git merge feature/new-feature
git push origin develop
```
- Staging site updates automatically

### 4. Deploy to Production
```bash
# After testing on staging
git checkout main
git pull origin main
git merge develop
git push origin main
```
- Production deploys automatically

## 🚀 Quick Commands

### View All Preview Channels
```bash
firebase hosting:channel:list
```

### Create Manual Preview
```bash
firebase hosting:channel:deploy preview-name --expires 7d
```

### Delete Preview Channel
```bash
firebase hosting:channel:delete preview-name
```

## 📋 Benefits of This Approach

1. **Safety**: Never deploy untested code to production
2. **Collaboration**: Share preview URLs for feedback
3. **Testing**: Test in staging before production
4. **Rollback**: Easy to revert if issues arise
5. **Parallel Development**: Multiple features can have their own previews

## 🛡️ Protection Rules

Consider adding these GitHub branch protection rules:

### For `main` branch:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators

### For `develop` branch:
- Require pull request reviews
- Require status checks to pass

## 🔍 Monitoring Deployments

### Check Deployment Status
```bash
# View all hosting sites
firebase hosting:sites:list

# View specific channel
firebase hosting:channel:list
```

### Access Different Environments
- Production: https://your-project-id.web.app
- Staging: https://your-project-id--staging.web.app
- PR Preview: Check PR comments for URL

## 💡 Best Practices

1. **Always test in staging** before merging to main
2. **Use PR previews** for code reviews
3. **Keep staging in sync** with production data
4. **Tag releases** in Git for tracking
5. **Document breaking changes** in PR descriptions

## 🚨 Emergency Rollback

If something goes wrong in production:

```bash
# Quick rollback to previous commit
git checkout main
git reset --hard HEAD~1
git push --force-with-lease origin main

# Or revert specific commit
git revert <commit-hash>
git push origin main
```

## 📊 Cost Considerations

- **Preview Channels**: Free, but count against hosting quota
- **Multiple Sites**: No additional cost
- **Build Minutes**: Each deployment uses GitHub Actions minutes
- **Storage**: Preview channels use Firebase Hosting storage

## 🔧 Configuration

The deployment strategy is configured in:
- `.github/workflows/deploy-preview.yml` - Main deployment workflow
- `firebase.json` - Firebase configuration
- Branch protection rules in GitHub settings