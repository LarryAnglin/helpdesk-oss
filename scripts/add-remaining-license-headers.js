/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const fs = require('fs');
const path = require('path');

// License header templates
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

const DOCKERFILE_HEADER = `# Copyright (c) 2025 anglinAI
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

`;

// Files that still need license headers
const REMAINING_FILES = [
  // Markdown files
  '/Users/larryanglin/Projects/HelpDesk/AI_SELF_HELP_SYSTEM.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/WORKFLOW_QUICK_REFERENCE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/FIREBASE_SETUP.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_CORS.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_FIXES.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/WORKFLOW_DIAGRAM.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STAGE_2_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/DEPLOYMENT_STRATEGY.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/NEXT_STEPS.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/FIRESTORE_INDEXES.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/PR.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_DEMO_DATA.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_DEPLOYMENT_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_GUIDE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/AUTH_FIX.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STAGE_4_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/API_MIGRATION.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/FIRESTORE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/FIREBASE_SEPARATION.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_NAVIGATION_FIX.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/ACCESSIBILITY.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STAGE_1_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/AI_SERVICE_ARCHITECTURE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/CUSTOM_DB_DEPLOY.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/ALGOLIA_SEARCH.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_DEPLOYMENT_NOTES.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/README.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/DEPLOY.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/# Help Desk Prompt.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/TEST_EMAIL_NOTIFICATION.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STORAGE_DEBUGGING.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/VIEWING_GITHUB_ACTIONS_LOGS.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STAGE_3_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STORAGE_RULES.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_PARAMS_FIX.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/CICD_SETUP.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/API_MIGRATION_STATUS.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/API_CORS_FIX.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STATIC_EXPORT_BUILD_FIX.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/fix-functions-permissions.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/STAGE_5_COMPLETE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/BRANCH_PROTECTION_SETUP.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/CLAUDE.md',
  '/Users/larryanglin/Projects/HelpDesk/docs/WORKFLOW_GUIDE.md',
  '/Users/larryanglin/Projects/HelpDesk/.github/pull_request_template.md',
  '/Users/larryanglin/Projects/HelpDesk/react/README.md',
  '/Users/larryanglin/Projects/HelpDesk/react/public/icons/README.md',
  '/Users/larryanglin/Projects/HelpDesk/react/README-Testing.md',
  '/Users/larryanglin/Projects/HelpDesk/react/AUTHENTICATION_SETUP.md',
  
  // Docker file
  '/Users/larryanglin/Projects/HelpDesk/Dockerfile'
];

function hasLicenseHeader(content) {
  const firstLines = content.split('\n').slice(0, 5).join('\n');
  return firstLines.includes('Copyright (c) 2025 anglinAI');
}

function addLicenseToFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has license
    if (hasLicenseHeader(content)) {
      console.log(`Skipping ${filePath} (already has license)`);
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    let newContent;

    if (ext === '.md') {
      newContent = MD_HEADER + content;
    } else if (path.basename(filePath) === 'Dockerfile') {
      newContent = DOCKERFILE_HEADER + content;
    } else {
      console.log(`Skipping ${filePath} (unknown file type)`);
      return false;
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

console.log(`Starting license header addition for ${REMAINING_FILES.length} remaining files...`);

REMAINING_FILES.forEach(filePath => {
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