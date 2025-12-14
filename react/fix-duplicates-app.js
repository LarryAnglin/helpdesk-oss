// Manual duplicate tenant cleanup - Run in browser console
// This uses your app's existing Firebase setup

async function fixDuplicateTenants() {
  console.log('🔍 Checking for duplicate tenants...');
  
  try {
    // Access Firebase through the app's existing modules
    // Get the Firebase config and services from the window object
    const { collection, getDocs, writeBatch, doc, query, where, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    
    // Try to get the db instance from the app's Firebase setup
    let db;
    try {
      // Try different ways to access the app's Firebase instance
      if (window.firebase && window.firebase.firestore) {
        db = window.firebase.firestore();
      } else if (window.__FIREBASE_APPS__ && window.__FIREBASE_APPS__.length > 0) {
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        db = getFirestore(window.__FIREBASE_APPS__[0]);
      } else {
        throw new Error('Cannot access Firebase instance');
      }
    } catch (e) {
      console.error('❌ Cannot access Firebase. Please run this script differently.');
      console.log('Try running: window.tenantCleanup() instead');
      return;
    }
    
    // Get all tenants using the app's tenant service
    console.log('📊 Fetching all tenants...');
    const tenantsCollection = collection(db, 'tenants');
    const tenantsSnapshot = await getDocs(tenantsCollection);
    
    console.log(`Found ${tenantsSnapshot.docs.length} total tenants`);
    
    // Group by name to find duplicates
    const tenantsByName = {};
    tenantsSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      if (!tenantsByName[data.name]) {
        tenantsByName[data.name] = [];
      }
      tenantsByName[data.name].push({
        id: docSnapshot.id,
        ref: docSnapshot.ref,
        ...data
      });
    });
    
    // Find duplicates
    const duplicates = Object.entries(tenantsByName).filter(([name, tenants]) => tenants.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate tenants found!');
      return;
    }
    
    console.log(`⚠️ Found ${duplicates.length} duplicate tenant name(s):`);
    duplicates.forEach(([name, tenants]) => {
      console.log(`  - "${name}": ${tenants.length} tenants`);
      tenants.forEach((tenant, i) => {
        console.log(`    ${i+1}. ID: ${tenant.id}, Status: ${tenant.status}`);
      });
    });
    
    // Focus on Default Organization
    const defaultOrgTenants = tenantsByName['Default Organization'];
    if (defaultOrgTenants && defaultOrgTenants.length > 1) {
      console.log('\n🔧 Fixing "Default Organization" duplicates...');
      
      // Sort by creation date, keep the oldest
      const sorted = defaultOrgTenants.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return aTime - bTime;
      });
      
      const keepTenant = sorted[0];
      const deleteTenants = sorted.slice(1);
      
      console.log(`✅ Keeping tenant: ${keepTenant.id} (oldest)`);
      console.log(`❌ Will delete: ${deleteTenants.map(t => t.id).join(', ')}`);
      
      // Migrate user memberships first
      for (const deleteTenant of deleteTenants) {
        console.log(`🔄 Migrating users from ${deleteTenant.id} to ${keepTenant.id}...`);
        
        // Get users for the tenant to be deleted
        const tenantUsersQuery = query(
          collection(db, 'tenantUsers'),
          where('tenantId', '==', deleteTenant.id)
        );
        const tenantUsersSnapshot = await getDocs(tenantUsersQuery);
        
        console.log(`  Found ${tenantUsersSnapshot.docs.length} user memberships to migrate`);
        
        if (tenantUsersSnapshot.docs.length > 0) {
          // Migrate each user membership
          const batch = writeBatch(db);
          for (const userDoc of tenantUsersSnapshot.docs) {
            const userData = userDoc.data();
            const newDocId = `${userData.userId}_${keepTenant.id}`;
            
            // Create new membership in target tenant
            const newUserRef = doc(db, 'tenantUsers', newDocId);
            batch.set(newUserRef, {
              ...userData,
              tenantId: keepTenant.id
            });
            
            // Delete old membership
            batch.delete(userDoc.ref);
          }
          
          await batch.commit();
          console.log(`  ✅ Migrated ${tenantUsersSnapshot.docs.length} user memberships`);
        }
        
        // Soft delete the duplicate tenant
        await updateDoc(doc(db, 'tenants', deleteTenant.id), {
          status: 'expired',
          deletedAt: serverTimestamp(),
          deletedReason: 'Duplicate cleanup'
        });
        
        console.log(`  ✅ Deleted duplicate tenant: ${deleteTenant.id}`);
      }
      
      console.log('\n🎉 Cleanup completed! Please refresh the page to see changes.');
    } else {
      console.log('ℹ️ No "Default Organization" duplicates found to fix.');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.log('💡 Try refreshing the page and running the script again.');
  }
}

// Make it available globally
window.fixDuplicateTenants = fixDuplicateTenants;

// Run the fix
fixDuplicateTenants();