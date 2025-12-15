<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# 🚀 Quick Workflow Reference

## Daily Commands

### Start Work on New Feature
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Save Your Work
```bash
git add .
git commit -m "Descriptive message here"
git push -u origin feature/your-feature-name
```

### Create Pull Request
1. Push your branch
2. Go to GitHub
3. Click "Compare & pull request"
4. Base: `develop` ← Compare: `your-branch`
5. Fill out template
6. Create PR

### After PR Approval
- Click "Squash and merge"
- Delete your feature branch
- Pull latest develop

## 🔗 Important URLs

### Your Environments
- **Production**: https://your-project-id.web.app
- **Staging**: https://your-project-id--staging.web.app  
- **PR Preview**: Check PR comments (https://your-project-id--pr-NUMBER.web.app)

### GitHub Pages
- **Repository**: https://github.com/LarryAnglin/helpdesk-oss
- **Actions**: https://github.com/LarryAnglin/helpdesk-oss/actions
- **Pull Requests**: https://github.com/LarryAnglin/helpdesk-oss/pulls
- **Settings**: https://github.com/LarryAnglin/helpdesk-oss/settings

## 🌲 Branch Structure
```
main (production)
  └── develop (staging)
       ├── feature/add-user-export
       ├── feature/update-ui
       ├── fix/login-bug
       └── hotfix/critical-fix (from main)
```

## ⚡ Quick Commands

### Update Your Branch with Latest Changes
```bash
git checkout develop
git pull origin develop
git checkout feature/your-feature
git merge develop
```

### See What Changed
```bash
git status           # What files changed
git diff            # What lines changed
git log --oneline   # Recent commits
```

### Undo Changes
```bash
git checkout -- file.txt     # Undo changes to specific file
git reset --hard HEAD       # Undo all changes (careful!)
git revert <commit-hash>    # Undo a specific commit
```

### Clean Up Branches
```bash
# Delete local branch
git branch -d feature/old-feature

# Delete remote branch  
git push origin --delete feature/old-feature

# See all branches
git branch -a
```

## 📋 PR Checklist
- [ ] Code builds locally (`npm run build`)
- [ ] No console errors
- [ ] Tests pass (if applicable)
- [ ] PR has descriptive title
- [ ] PR template filled out
- [ ] Linked to issue (if applicable)
- [ ] Ready for review

## 🚨 Emergency Hotfix
```bash
# Branch from main, not develop!
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-name

# After fix is merged to main, sync develop
git checkout develop
git merge main
git push origin develop
```

## 🎯 Feature Flags

### Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `update/` - Dependencies or refactoring
- `hotfix/` - Emergency production fixes
- `docs/` - Documentation only

### Commit Messages
```bash
# Good examples
"Add user export functionality with CSV support"
"Fix login redirect loop on session timeout"
"Update React to v18.2.0"
"Refactor ticket service for better performance"

# Bad examples
"Fix bug"
"Update files"
"WIP"
"asdf"
```

## 🔥 Common Issues

### Merge Conflicts
```bash
# See conflicting files
git status

# After resolving in VS Code
git add .
git commit -m "Resolve merge conflicts"
git push
```

### Accidental Commit to Wrong Branch
```bash
# If you haven't pushed yet
git reset HEAD~1
git stash
git checkout correct-branch
git stash pop
```

### Need to Change Last Commit Message
```bash
# If you haven't pushed
git commit --amend -m "New message"

# If you already pushed (careful!)
git push --force-with-lease
```

## 💡 Pro Tips

1. **Always pull before starting work**
2. **Branch from develop, not main**
3. **Keep PRs small and focused**
4. **Test on preview URL before merging**
5. **Never force push to develop or main**
6. **Use meaningful branch names**
7. **Write clear commit messages**
8. **Delete branches after merging**

## 📱 Mobile Testing URLs

Test your preview on mobile:
1. Get preview URL from PR
2. Open on phone browser
3. Or use Chrome DevTools device mode

## 🎉 Success Flow

```
Feature → PR → Preview → ✅ Review → Staging → ✅ Test → Production → 🎉
```

---

**Remember**: When in doubt, ask! It's better to double-check than to accidentally deploy to production.