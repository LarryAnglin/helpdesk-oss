<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# Branch Protection Rules Setup Guide

## 🔒 Setting Up Branch Protection

Follow these steps to configure branch protection rules for safe deployments.

### Step 1: Navigate to Branch Protection Settings

1. Go to your repository: https://github.com/LarryAnglin/HelpDesk
2. Click **Settings** tab
3. Click **Branches** in the left sidebar
4. Click **Add rule** button

### Step 2: Protect the `main` Branch (Production)

Create a new rule with these settings:

**Branch name pattern:** `main`

✅ **Require a pull request before merging**
- ✅ Require approvals: `1`
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from CODEOWNERS (if you have a CODEOWNERS file)

✅ **Require status checks to pass before merging**
- ✅ Require branches to be up to date before merging
- **Required status checks:**
  - `build-and-deploy` (from your GitHub Actions)

✅ **Require conversation resolution before merging**

✅ **Include administrators**
- This ensures even you follow the rules

⚠️ **Do not allow bypassing the above settings**

Click **Create** to save.

### Step 3: Protect the `develop` Branch (Staging)

Click **Add rule** again and create a rule for develop:

**Branch name pattern:** `develop`

✅ **Require a pull request before merging**
- ✅ Require approvals: `1` (or `0` for faster development)
- ✅ Dismiss stale pull request approvals when new commits are pushed

✅ **Require status checks to pass before merging**
- **Required status checks:**
  - `build-and-deploy`

✅ **Require conversation resolution before merging**

❌ **Include administrators** (optional - allows you to push directly for hotfixes)

Click **Create** to save.

### Step 4: Create the `develop` Branch

Run these commands locally:

```bash
# Create and push develop branch
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### Step 5: Set Default Branch (Optional)

To make PRs target `develop` by default:

1. Go to **Settings** → **General**
2. Under "Default branch", click the switch icon
3. Select `develop`
4. Click **Update**

## 📋 Recommended Workflow After Setup

### For New Features:

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# 2. Make changes and push
git add .
git commit -m "Add my new feature"
git push -u origin feature/my-new-feature

# 3. Create PR targeting develop
# GitHub will show a preview URL in the PR
```

### For Releases to Production:

```bash
# 1. Create PR from develop to main
# This requires approval due to protection rules

# 2. After approval and merge, production auto-deploys
```

## 🚨 Emergency Procedures

### If You Need to Push Directly to Production:

1. Go to **Settings** → **Branches**
2. Click edit on the `main` rule
3. Temporarily uncheck "Include administrators"
4. Make your emergency fix
5. **IMPORTANT:** Re-enable the protection immediately

### Alternative: Hotfix Branch

```bash
# Better approach for emergencies
git checkout -b hotfix/urgent-fix origin/main
git commit -m "Fix critical bug"
git push -u origin hotfix/urgent-fix

# Create PR directly to main
# This still requires approval but is tracked
```

## 🎯 Benefits of This Setup

1. **No Accidental Production Deployments**
   - Can't push directly to main
   - All changes require PR and approval

2. **Automatic Testing**
   - GitHub Actions must pass before merge
   - Build errors caught before production

3. **Code Review**
   - At least one person reviews changes
   - Catches bugs and improves code quality

4. **Preview URLs**
   - Every PR gets a preview link
   - Stakeholders can test before approval

5. **Staging Environment**
   - Test in develop before production
   - Catch integration issues early

## 📊 Status Checks Explained

The "build-and-deploy" status check ensures:
- ✅ React app builds successfully
- ✅ No TypeScript errors
- ✅ Dependencies install correctly
- ✅ Deployment configuration is valid

## 🔧 Additional Recommended Settings

### 1. Add CODEOWNERS File

Create `.github/CODEOWNERS`:

```
# Global owners
* @LarryAnglin

# Frontend specific
/react/ @LarryAnglin

# Backend specific
/functions/ @LarryAnglin
```

### 2. PR Templates

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Tested on preview URL
- [ ] Tested on staging

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
```

## 🚀 Next Steps

1. Set up the branch protection rules above
2. Create the develop branch
3. Try creating a test PR to see the workflow
4. Adjust settings based on your team's needs

## 💡 Tips

- Start with strict rules and relax them if needed
- Use GitHub's "Suggest changes" in PR reviews
- Set up notifications for PR reviews
- Use draft PRs for work-in-progress

Remember: These rules are for safety. They can always be adjusted as your needs change!