#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// New copyright notice
const newCopyright = {
  js: `/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */`,
  html: `<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->`,
  md: `<!--
Copyright (c) 2025 anglinAI All Rights Reserved
-->`
};

// Regex patterns to match existing copyright blocks
const patterns = {
  js: /\/\*\s*\*?\s*Copyright \(c\) 2025 anglinAI[\s\S]*?\*\//g,
  html: /<!--\s*Copyright \(c\) 2025 anglinAI[\s\S]*?-->/g,
  md: /<!--\s*Copyright \(c\) 2025 anglinAI[\s\S]*?-->/g
};

// Files to update
const files = [
  // Configuration files
  'react/cypress.config.cjs',
  'react/eslint.config.js',
  'react/postcss.config.js',
  'react/tailwind.config.js',
  'react/vite.config.ts',
  'react/vitest.config.ts',
  
  // HTML files
  'react/index.html',
  
  // Main app files
  'react/src/App.tsx',
  'react/src/main.tsx',
  'react/src/index.css',
  'react/src/vite-env.d.ts',
  
  // Pages
  'react/src/pages/AllTickets.tsx',
  'react/src/pages/AlgoliaManualSync.tsx',
  'react/src/pages/AlgoliaSetup.tsx',
  'react/src/pages/AlgoliaSetupPage.tsx',
  'react/src/pages/Dashboard.tsx',
  'react/src/pages/EditProjectPage.tsx',
  'react/src/pages/EditTaskPage.tsx',
  'react/src/pages/EditTicket.tsx',
  'react/src/pages/ExportPage.tsx',
  'react/src/pages/FAQManagementPage.tsx',
  'react/src/pages/Home.tsx',
  'react/src/pages/ImportPage.tsx',
  'react/src/pages/KnowledgeBaseManagementPage.tsx',
  'react/src/pages/LayoutTest.tsx',
  'react/src/pages/NewProjectPage.tsx',
  'react/src/pages/NewTaskPage.tsx',
  'react/src/pages/NewTicket.tsx',
  'react/src/pages/ProjectDetailPage.tsx',
  'react/src/pages/ProjectsPage.tsx',
  'react/src/pages/SelfHelpPage.tsx',
  'react/src/pages/Settings.tsx',
  'react/src/pages/SignIn.tsx',
  'react/src/pages/SurveyPage.tsx',
  'react/src/pages/TenantManagementPage.tsx',
  'react/src/pages/TicketDetail.tsx',
  'react/src/pages/TicketsPage.tsx',
  'react/src/pages/UsersPage.tsx',
  'react/src/pages/WebhooksPage.tsx',
  
  // Components
  'react/src/components/DashboardMetrics.tsx',
  'react/src/components/LoadingState.tsx',
  'react/src/components/Navbar.tsx',
  'react/src/components/auth/PrivateRoute.tsx',
  'react/src/components/auth/ProtectedRoute.tsx',
  'react/src/components/auth/RoleGuard.tsx',
  'react/src/components/charts/MetricsChart.tsx',
  'react/src/components/charts/TicketMetricsChart.tsx',
  'react/src/components/charts/TicketTrendChart.tsx',
  'react/src/components/common/ConfirmDialog.tsx',
  'react/src/components/common/CopyButton.tsx',
  'react/src/components/common/ErrorBoundary.tsx',
  'react/src/components/common/LoadingSpinner.tsx',
  'react/src/components/common/SearchDialog.tsx',
  'react/src/components/common/StatusChip.tsx',
  'react/src/components/forms/CustomFieldEditor.tsx',
  'react/src/components/forms/DefaultFieldsManager.tsx',
  'react/src/components/forms/FormBuilder.tsx',
  'react/src/components/forms/FormRenderer.tsx',
  'react/src/components/forms/StatusSelect.tsx',
  'react/src/components/projects/ProjectCard.tsx',
  'react/src/components/projects/ProjectForm.tsx',
  'react/src/components/projects/ProjectList.tsx',
  'react/src/components/projects/TaskCard.tsx',
  'react/src/components/projects/TaskForm.tsx',
  'react/src/components/projects/TaskList.tsx',
  'react/src/components/reports/MetricsPanel.tsx',
  'react/src/components/reports/ReportFilters.tsx',
  'react/src/components/reports/TicketsByPriorityChart.tsx',
  'react/src/components/reports/TicketsByStatusChart.tsx',
  'react/src/components/reports/TicketTrendsChart.tsx',
  'react/src/components/settings/AutomationSettings.tsx',
  'react/src/components/settings/SettingsPage.tsx',
  'react/src/components/settings/SLASettings.tsx',
  'react/src/components/settings/SystemSettings.tsx',
  'react/src/components/settings/WebhookSettings.tsx',
  'react/src/components/tickets/CcParticipantManager.tsx',
  'react/src/components/tickets/FileSelector.tsx',
  'react/src/components/tickets/PrioritySelect.tsx',
  'react/src/components/tickets/ReplyForm.tsx',
  'react/src/components/tickets/TicketCard.tsx',
  'react/src/components/tickets/TicketFilters.tsx',
  'react/src/components/tickets/TicketForm.tsx',
  'react/src/components/tickets/TicketList.tsx',
  'react/src/components/tickets/TicketParticipants.tsx',
  'react/src/components/tickets/TicketRelationshipManager.tsx',
  'react/src/components/tickets/TicketReplies.tsx',
  'react/src/components/tickets/TicketSearch.tsx',
  'react/src/components/tickets/TicketStatus.tsx',
  'react/src/components/tickets/TimeTracking.tsx',
  'react/src/components/tickets/TimeTrackingEntryForm.tsx',
  'react/src/components/ui/BasicFilterModal.tsx',
  'react/src/components/ui/BulkTicketActions.tsx',
  'react/src/components/ui/ColumnSelector.tsx',
  'react/src/components/ui/DataTable.tsx',
  'react/src/components/ui/DateFilter.tsx',
  'react/src/components/ui/EmojiPicker.tsx',
  'react/src/components/ui/EnhancedTicketTable.tsx',
  'react/src/components/ui/ExportDialog.tsx',
  'react/src/components/ui/FilterChips.tsx',
  'react/src/components/ui/ImportDialog.tsx',
  'react/src/components/ui/Layout.tsx',
  'react/src/components/ui/QuickFilters.tsx',
  'react/src/components/ui/SLAIndicator.tsx',
  'react/src/components/ui/SortableTable.tsx',
  'react/src/components/ui/TablePagination.tsx',
  'react/src/components/ui/TicketTable.tsx',
  'react/src/components/users/RoleSelect.tsx',
  'react/src/components/users/UserForm.tsx',
  'react/src/components/users/UserList.tsx',
  'react/src/components/users/UserManagement.tsx',
  'react/src/components/users/UserTable.tsx',
  
  // Context
  'react/src/context/ThemeContext.tsx',
  
  // Lib files (many - adding key ones)
  'react/src/lib/auth/AuthContext.tsx',
  'react/src/lib/types/ticket.ts',
  'react/src/lib/firebase/firebaseConfig.ts',
  'react/src/lib/firebase/ticketService.ts',
  'react/src/lib/firebase/userClientService.ts',
  'react/src/lib/firebase/configService.ts',
  'react/src/lib/firebase/tenantService.ts',
  
  // Public files
  'react/public/sw.js',
  
  // Test files
  'react/cypress/support/commands.ts',
  'react/cypress/support/e2e.ts',
  'react/cypress/e2e/auth.cy.ts',
  'react/cypress/e2e/tickets.cy.ts',
  'react/cypress/e2e/navigation.cy.ts',
  'react/src/test/setup.ts',
  
  // Documentation
  'react/AUTHENTICATION_SETUP.md',
  'react/README.md',
  'react/README-Testing.md',
  'react/public/icons/README.md',
  
  // Scripts
  'react/scripts/exportFirestoreData.js'
];

function getFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.js', '.ts', '.tsx', '.css', '.cjs'].includes(ext)) return 'js';
  if (['.html'].includes(ext)) return 'html';
  if (['.md'].includes(ext)) return 'md';
  return 'js'; // default
}

function updateCopyright(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const fileType = getFileType(filePath);
  const pattern = patterns[fileType];
  const replacement = newCopyright[fileType];
  
  if (!pattern.test(content)) {
    console.log(`Skipping ${filePath} - no copyright found`);
    return false;
  }
  
  const updatedContent = content.replace(pattern, replacement);
  
  if (updatedContent !== content) {
    fs.writeFileSync(fullPath, updatedContent, 'utf8');
    console.log(`Updated ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('Starting copyright update...');
let updatedCount = 0;

files.forEach(file => {
  if (updateCopyright(file)) {
    updatedCount++;
  }
});

console.log(`\nCompleted! Updated ${updatedCount} files.`);