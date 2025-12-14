// Cleanup script for duplicate tenants
// Run this in the browser console on your site when logged in as admin

async function cleanupDuplicateTenants() {
  try {
    console.log('Starting duplicate tenant cleanup...');
    
    // Import the tenant migration module
    const { tenantMigration } = await import('./lib/migration/tenantMigration.js');
    
    // Run the cleanup
    await tenantMigration.cleanupDuplicateTenants();
    
    console.log('✅ Duplicate tenant cleanup completed successfully!');
    console.log('Please refresh the page to see the changes.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.log('Please make sure you are logged in as an admin user.');
  }
}

// Run the cleanup
cleanupDuplicateTenants();