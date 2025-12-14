/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Merges coverage reports from React and Functions into a single report
 */
function mergeCoverage() {
  const reactCoveragePath = path.join(__dirname, '../react/coverage/coverage-final.json');
  const functionsCoveragePath = path.join(__dirname, '../functions/coverage/coverage-final.json');
  const outputPath = path.join(__dirname, '../coverage-merged.json');

  let mergedCoverage = {};

  // Load React coverage
  if (fs.existsSync(reactCoveragePath)) {
    try {
      const reactCoverage = JSON.parse(fs.readFileSync(reactCoveragePath, 'utf8'));
      console.log('✅ Loaded React coverage data');
      
      // Add react/ prefix to file paths
      Object.keys(reactCoverage).forEach(filePath => {
        const prefixedPath = filePath.startsWith('/') ? 
          `react${filePath}` : 
          `react/${filePath}`;
        mergedCoverage[prefixedPath] = reactCoverage[filePath];
      });
    } catch (error) {
      console.error('❌ Error loading React coverage:', error.message);
    }
  } else {
    console.log('⚠️ React coverage file not found');
  }

  // Load Functions coverage
  if (fs.existsSync(functionsCoveragePath)) {
    try {
      const functionsCoverage = JSON.parse(fs.readFileSync(functionsCoveragePath, 'utf8'));
      console.log('✅ Loaded Functions coverage data');
      
      // Add functions/ prefix to file paths
      Object.keys(functionsCoverage).forEach(filePath => {
        const prefixedPath = filePath.startsWith('/') ? 
          `functions${filePath}` : 
          `functions/${filePath}`;
        mergedCoverage[prefixedPath] = functionsCoverage[filePath];
      });
    } catch (error) {
      console.error('❌ Error loading Functions coverage:', error.message);
    }
  } else {
    console.log('⚠️ Functions coverage file not found');
  }

  // Write merged coverage
  if (Object.keys(mergedCoverage).length > 0) {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(mergedCoverage, null, 2));
      console.log(`✅ Merged coverage written to ${outputPath}`);
      
      // Calculate summary statistics
      const stats = calculateCoverageStats(mergedCoverage);
      console.log('\n📊 Combined Coverage Summary:');
      console.log(`   Lines: ${stats.lines.pct}% (${stats.lines.covered}/${stats.lines.total})`);
      console.log(`   Functions: ${stats.functions.pct}% (${stats.functions.covered}/${stats.functions.total})`);
      console.log(`   Branches: ${stats.branches.pct}% (${stats.branches.covered}/${stats.branches.total})`);
      console.log(`   Statements: ${stats.statements.pct}% (${stats.statements.covered}/${stats.statements.total})`);
      
    } catch (error) {
      console.error('❌ Error writing merged coverage:', error.message);
      process.exit(1);
    }
  } else {
    console.log('⚠️ No coverage data found to merge');
    process.exit(1);
  }
}

/**
 * Calculate overall coverage statistics
 */
function calculateCoverageStats(coverage) {
  const totals = {
    lines: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
    statements: { total: 0, covered: 0, pct: 0 }
  };

  Object.values(coverage).forEach(fileCoverage => {
    // Lines
    if (fileCoverage.l) {
      totals.lines.total += Object.keys(fileCoverage.l).length;
      totals.lines.covered += Object.values(fileCoverage.l).filter(count => count > 0).length;
    }
    
    // Functions
    if (fileCoverage.f) {
      totals.functions.total += Object.keys(fileCoverage.f).length;
      totals.functions.covered += Object.values(fileCoverage.f).filter(count => count > 0).length;
    }
    
    // Branches
    if (fileCoverage.b) {
      Object.values(fileCoverage.b).forEach(branch => {
        if (Array.isArray(branch)) {
          totals.branches.total += branch.length;
          totals.branches.covered += branch.filter(count => count > 0).length;
        }
      });
    }
    
    // Statements
    if (fileCoverage.s) {
      totals.statements.total += Object.keys(fileCoverage.s).length;
      totals.statements.covered += Object.values(fileCoverage.s).filter(count => count > 0).length;
    }
  });

  // Calculate percentages
  Object.keys(totals).forEach(key => {
    if (totals[key].total > 0) {
      totals[key].pct = Math.round((totals[key].covered / totals[key].total) * 100);
    }
  });

  return totals;
}

// Run the merge
if (require.main === module) {
  console.log('🔄 Merging coverage reports...');
  mergeCoverage();
}

module.exports = { mergeCoverage, calculateCoverageStats };