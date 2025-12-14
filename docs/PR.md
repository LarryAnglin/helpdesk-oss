<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

Creating a Pull Request - Step by Step

  Method 1: Right After Pushing (Easiest)

  When you push a new branch, GitHub shows a yellow banner:

  # After you run:
  git push -u origin feature/your-feature-name

  1. Go to your repository: https://github.com/LarryAnglin/HelpDesk
  2. Look for the yellow banner at the top that says:
  feature/your-feature-name had recent pushes less than a minute ago
  [Compare & pull request]
  3. Click the green "Compare & pull request" button

  Method 2: From the Pull Requests Tab

  1. Go to your repository: https://github.com/LarryAnglin/HelpDesk
  2. Click the "Pull requests" tab (near the top, next to "Code")
  3. Click the green "New pull request" button
  4. Select your branches:
    - Base: develop (where you want to merge TO)
    - Compare: feature/your-feature-name (your branch)
  5. Click "Create pull request"

  Method 3: From Your Branch Page

  1. Go to: https://github.com/LarryAnglin/HelpDesk
  2. Click the branch dropdown (shows "main" by default)
  3. Select your branch feature/your-feature-name
  4. Click "Contribute" → "Open pull request"

  📝 Filling Out the PR Form

  Once you click to create a PR, you'll see a form:

  1. PR Title

  Add user export functionality
  - Be descriptive but concise
  - Use present tense
  - No period at the end

  2. PR Description

  The template will auto-fill. Here's how to complete it:

  ## Description
  Added CSV export feature to allow admins to download user data with date filtering

  ## Type of Change
  - [ ] 🐛 Bug fix
  - [x] ✨ New feature    ← Check the appropriate box
  - [ ] 💥 Breaking change
  - [ ] 📝 Documentation update

  ## Testing
  - [x] Tested locally
  - [ ] Tested on preview URL    ← Will test after PR creates
  - [ ] Tested on staging

  ## Screenshots
  ![Export Button](image-url-here)    ← Drag & drop images here

  3. Right Sidebar Options

  - Reviewers: Leave empty (CODEOWNERS auto-assigns)
  - Assignees: Assign to yourself
  - Labels: Add if you want (feature, bug, etc.)
  - Projects: Skip
  - Milestone: Skip

  4. Target Branch (IMPORTANT!)

  Make sure:
  - Base: develop (NOT main!)
  - Compare: feature/your-feature-name

  🎯 Visual Guide

  Here's what the PR creation page looks like:

  ┌─────────────────────────────────────────────────────────┐
  │ Comparing changes                                       │
  ├─────────────────────────────────────────────────────────┤
  │ base: develop ← compare: feature/add-user-export       │
  │                                                         │
  │ ✓ Able to merge (no conflicts)                        │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │ Add user export functionality          [PR Title]      │
  ├─────────────────────────────────────────────────────────┤
  │ ## Description                                          │
  │ Added CSV export feature to allow admins...            │
  │                                                         │
  │ ## Type of Change                                       │
  │ - [x] ✨ New feature                                   │
  │                                                         │
  │ [Your PR description here...]                          │
  │                                                         │
  └─────────────────────────────────────────────────────────┘

  [Create pull request] ← Click this green button

  🚀 After Creating the PR

  1. Wait 2-3 minutes for the preview URL
  2. Check the PR page for a comment like:
  🔥 Preview deployed to: https://your-project-id--pr-42.web.app
  3. Test your feature on the preview URL
  4. Share the preview URL with others for feedback

  💡 Pro Tips

  Adding Screenshots

  - Drag and drop images directly into the description
  - Or paste from clipboard (Cmd+V on Mac)
  - Use screenshots to show UI changes

  Linking Issues

  Fixes #42    ← Automatically closes issue 42 when PR merges
  Related to #43    ← Just links without closing

  Draft PRs

  - Click dropdown arrow next to "Create pull request"
  - Select "Create draft pull request"
  - Good for work-in-progress

  Quick PR from Command Line

  # Using GitHub CLI (if installed)
  gh pr create --base develop --title "Add user export"

  🎬 Complete Example

  # 1. Push your branch
  git push -u origin feature/add-export

  # 2. Terminal shows:
  remote: Create a pull request for 'feature/add-export' on GitHub by visiting:
  remote: https://github.com/LarryAnglin/HelpDesk/pull/new/feature/add-export

  # 3. Click that link OR go to GitHub and click the yellow banner

  # 4. Fill out:
  Title: Add user export functionality for admin panel
  Base: develop
  Compare: feature/add-export
  Description: [Fill template]

  # 5. Click "Create pull request"

  # 6. Wait for preview URL in comments
  # 7. Test and share!

  That's it! The key is making sure you select develop as the base branch, not main. This ensures your code goes to staging first before production.

