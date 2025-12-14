<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->

# How to View GitHub Actions Logs

## Accessing the Actions Tab

1. **Go to your GitHub repository**: https://github.com/LarryAnglin/HelpDesk
2. **Click on the "Actions" tab** in the top navigation bar

## Viewing Workflow Runs

### Current Runs
- You'll see a list of all workflow runs
- Running workflows show a yellow circle ⚪
- Successful runs show a green checkmark ✅
- Failed runs show a red X ❌

### Viewing Specific Run Logs

1. **Click on the workflow run** you want to inspect
2. You'll see all jobs in that workflow
3. **Click on a specific job** (e.g., "build-and-deploy")
4. You'll see step-by-step logs

### Understanding the Log Structure

Each step shows:
- Step name
- Duration
- Success/failure status
- Expandable logs (click the arrow to expand)

### Finding Errors

If a workflow fails:
1. Look for the red X ❌ next to the failed step
2. Click to expand that step
3. Scroll through the logs to find error messages
4. Error messages are usually at the bottom of the failed step

### Real-time Logs

While a workflow is running:
- Logs update in real-time
- You can watch the progress live
- Each step shows its current status

### Downloading Logs

1. Click the gear icon ⚙️ in the top right of the logs
2. Select "Download log archive"
3. You'll get a ZIP file with all logs

### Re-running Failed Workflows

If a workflow fails:
1. Click "Re-run all jobs" button
2. Or "Re-run failed jobs" to only retry failed ones

### Filtering Workflows

Use the filters at the top:
- Filter by workflow name
- Filter by branch
- Filter by status (success/failure)
- Filter by actor (who triggered it)

### Common Log Sections to Check

1. **Build Step**: Check for compilation errors
2. **Test Step**: Check for test failures
3. **Deploy Step**: Check for deployment issues
4. **Environment Setup**: Check for missing secrets or dependencies

### Mobile Access

You can also view logs on mobile:
- Use the GitHub mobile app
- Or access github.com in your mobile browser

## Tips

- 🔍 Use Ctrl+F (or Cmd+F on Mac) to search within logs
- 📋 Copy specific error messages for troubleshooting
- 🔗 Share direct links to specific workflow runs with others
- 📊 Check the "Summary" page for a quick overview