/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const fs = require('fs');
const path = require('path');

// License header templates
const JS_HEADER = `/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

`;

const CSS_HEADER = `/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

`;

const HTML_HEADER = `<!--
Copyright (c) 2025 anglinAI

This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

You are free to:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- NonCommercial — You may not use the material for commercial purposes.
- ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
-->

`;

const SHELL_HEADER_PREFIX = `#!/bin/bash
#
# Copyright (c) 2025 anglinAI
# 
# This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
# To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
# or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
# 
# You are free to:
# - Share — copy and redistribute the material in any medium or format
# - Adapt — remix, transform, and build upon the material
# 
# Under the following terms:
# - Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
# - NonCommercial — You may not use the material for commercial purposes.
# - ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license.
# 
# No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
#

`;

const YAML_HEADER = `#
# Copyright (c) 2025 anglinAI
# 
# This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
# To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
# or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
# 
# You are free to:
# - Share — copy and redistribute the material in any medium or format
# - Adapt — remix, transform, and build upon the material
# 
# Under the following terms:
# - Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
# - NonCommercial — You may not use the material for commercial purposes.
# - ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license.
# 
# No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
#

`;

const MD_HEADER = `<!--
Copyright (c) 2025 anglinAI

This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.

You are free to:
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- NonCommercial — You may not use the material for commercial purposes.
- ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license.

No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.
-->

`;

// Files that need license headers - comprehensive list
const FILES_TO_LICENSE = [
  // TypeScript files
  '/Users/larryanglin/Projects/HelpDesk/functions/src/ticketInsights.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress/support/commands.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress/support/component.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress/support/e2e.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress/e2e/ticket-creation.cy.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress/e2e/file-attachments.cy.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/vite.config.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/vitest.config.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/cypress.config.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/test/setup.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/test/fixtures/pwa.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/test/fixtures/files.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/test/fixtures/tickets.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/vite-env.d.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/project.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/aiSettings.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/sla.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/customFields.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/knowledgeBase.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/dashboard.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/automation.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/config.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/ticket.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/user.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/task.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/types/survey.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/exportUtils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/autoAssignmentUtils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/dashboardUtils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/customFieldValidation.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/escalationUtils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/utils/slaUtils.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/initializeAlgolia.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/algoliaConfig.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/syncAdminData.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/setup.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/syncDataViaAPI.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/searchService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/algolia/syncData.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/fileUploadService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/ticketInsightsService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/userClientService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/customFieldsService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/projectService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/taskService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/firebaseConfig.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/faqFirestoreService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/__tests__/ticketService.test.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/configService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/knowledgeBaseService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/firebase/ticketService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/ai/faqService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/ai/aiService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/ai/cacheService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/ai/ticketAnalysisService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/pwa/manifestService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/pwa/iconProcessingService.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/pwa/__tests__/iconProcessingService.test.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/pwa/serviceWorkerRegistration.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/apiConfig.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/theme.ts',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/email/emailService.ts',
  
  // TypeScript React files
  '/Users/larryanglin/Projects/HelpDesk/react/src/main.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/context/ThemeContext.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/MarkdownEditor.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/use-toast.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/tabs.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/card.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/label.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/alert.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/dialog.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/badge.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/table.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/button.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/checkbox.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/dropdown-menu.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/select.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/textarea.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/input.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/ui/form.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/settings/CustomFieldsManager.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/settings/SettingsForm.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/settings/__tests__/PWASettingsSection.test.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/settings/PWASettingsSection.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/CustomFieldsDisplay.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketDetails.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketList.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketFormWithCustomFields.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/AddTicketReply.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/SLAIndicator.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/__tests__/FileSelector.test.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketForm.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketRepliesList.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/TicketSummary.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/tickets/FileSelector.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/forms/DynamicFormField.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/auth/ProtectedRoute.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/auth/SignInPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/faq/FAQFormDialog.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/layout/Navbar.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/layout/DynamicThemeProvider.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/layout/Footer.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/layout/AppLayout.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/projects/ProjectList.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/projects/ProjectDetail.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/projects/TaskList.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/projects/ProjectForm.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/projects/TaskForm.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/search/TicketSearch.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/search/UnifiedSearch.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/common/FileUpload.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/knowledge-base/KnowledgeSourceFormDialog.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/users/UserCreateDialog.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/users/UserEditDialog.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/users/UserList.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/pwa/PWAInstallPrompt.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/self-help/SelfHelpChat.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/components/error/ErrorDisplay.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/context/ConfigContext.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/lib/auth/AuthContext.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/Settings.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/EditProjectPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/AllTickets.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/EditTaskPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/Dashboard.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/ProjectsPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/ProjectDetailPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/NewTaskPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/Home.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/UsersPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/NewProjectPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/KnowledgeBaseManagementPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/AlgoliaManualSync.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/AlgoliaSetup.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/SelfHelpPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/FAQManagementPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/EditTicket.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/SurveyPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/NewTicket.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/TicketDetail.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/LayoutTest.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/ExportPage.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/SignIn.tsx',
  '/Users/larryanglin/Projects/HelpDesk/react/src/pages/TicketsPage.tsx',
  
  // JavaScript files
  '/Users/larryanglin/Projects/HelpDesk/scripts/init-algolia.js',
  '/Users/larryanglin/Projects/HelpDesk/scripts/test-mailgun-direct.js',
  '/Users/larryanglin/Projects/HelpDesk/scripts/test-email-notification.js',
  '/Users/larryanglin/Projects/HelpDesk/scripts/merge-coverage.js',
  '/Users/larryanglin/Projects/HelpDesk/scripts/sync-tickets.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/test/index.test.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/test/setup.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/jest.config.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/index.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/send-email.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/export_data.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/server.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/auth.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/survey-service.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/users.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/cors.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/config.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/search-fallback.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/tasks.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/ticket-insights.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/errorHandler.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/projects.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/export-pdf.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/webhooks.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/escalation-service.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/__tests__/escalation-service.test.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/__tests__/api.test.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/__tests__/survey-service.test.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/__tests__/auth.test.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/api.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/search.js',
  '/Users/larryanglin/Projects/HelpDesk/functions/src/mailgun.js',
  '/Users/larryanglin/Projects/HelpDesk/react/tailwind.config.js',
  '/Users/larryanglin/Projects/HelpDesk/react/public/sw.js',
  '/Users/larryanglin/Projects/HelpDesk/react/scripts/exportFirestoreData.js',
  '/Users/larryanglin/Projects/HelpDesk/react/eslint.config.js',
  '/Users/larryanglin/Projects/HelpDesk/react/postcss.config.js',
  
  // CSS files
  '/Users/larryanglin/Projects/HelpDesk/react/src/index.css',
  
  // HTML files
  '/Users/larryanglin/Projects/HelpDesk/react/index.html',
  
  // Shell scripts
  '/Users/larryanglin/Projects/HelpDesk/scripts/setup-develop-branch.sh',
  '/Users/larryanglin/Projects/HelpDesk/scripts/test-health.sh',
  '/Users/larryanglin/Projects/HelpDesk/scripts/deploy-react.sh',
  '/Users/larryanglin/Projects/HelpDesk/functions/setup-database.sh',
  
  // YAML files
  '/Users/larryanglin/Projects/HelpDesk/docker-compose.yml',
  '/Users/larryanglin/Projects/HelpDesk/.github/workflows.disabled/deploy-preview.yml',
  '/Users/larryanglin/Projects/HelpDesk/.github/workflows.disabled/deploy.yml',
  '/Users/larryanglin/Projects/HelpDesk/.github/workflows.disabled/claude.yml',
  '/Users/larryanglin/Projects/HelpDesk/react/.github/workflows/ci.yml',
  '/Users/larryanglin/Projects/HelpDesk/react/.github/workflows/dependabot.yml'
];

function hasLicenseHeader(content, fileType) {
  const firstLines = content.split('\n').slice(0, 5).join('\n');
  return firstLines.includes('Copyright (c) 2025 anglinAI');
}

function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) return 'js';
  if (['.css', '.scss'].includes(ext)) return 'css';
  if (ext === '.html') return 'html';
  if (ext === '.sh') return 'shell';
  if (['.yml', '.yaml'].includes(ext)) return 'yaml';
  if (ext === '.md') return 'md';
  return 'js'; // default to js-style comments
}

function addLicenseToFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has license
    if (hasLicenseHeader(content, getFileType(filePath))) {
      console.log(`Skipping ${filePath} (already has license)`);
      return false;
    }

    const fileType = getFileType(filePath);
    let newContent;

    switch (fileType) {
      case 'js':
        newContent = JS_HEADER + content;
        break;
      case 'css':
        newContent = CSS_HEADER + content;
        break;
      case 'html':
        // For HTML, add after DOCTYPE if present
        if (content.includes('<!DOCTYPE')) {
          const lines = content.split('\n');
          const doctypeIndex = lines.findIndex(line => line.includes('<!DOCTYPE'));
          lines.splice(doctypeIndex + 1, 0, HTML_HEADER.trim());
          newContent = lines.join('\n');
        } else {
          newContent = HTML_HEADER + content;
        }
        break;
      case 'shell':
        // For shell scripts, handle shebang
        if (content.startsWith('#!/')) {
          const lines = content.split('\n');
          lines.splice(1, 0, SHELL_HEADER_PREFIX.replace('#!/bin/bash\n', '').trim());
          newContent = lines.join('\n');
        } else {
          newContent = SHELL_HEADER_PREFIX + content;
        }
        break;
      case 'yaml':
        newContent = YAML_HEADER + content;
        break;
      case 'md':
        newContent = MD_HEADER + content;
        break;
      default:
        newContent = JS_HEADER + content;
    }

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Added license to: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Process all files
let processed = 0;
let skipped = 0;
let errors = 0;

console.log(`Starting license header addition for ${FILES_TO_LICENSE.length} files...`);

FILES_TO_LICENSE.forEach(filePath => {
  const result = addLicenseToFile(filePath);
  if (result === true) {
    processed++;
  } else if (result === false) {
    skipped++;
  } else {
    errors++;
  }
});

console.log(`\nCompleted license header addition:`);
console.log(`- Processed: ${processed} files`);
console.log(`- Skipped: ${skipped} files`);
console.log(`- Errors: ${errors} files`);