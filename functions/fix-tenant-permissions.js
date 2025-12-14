const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

async function fixTenantPermissions() {
  try {
    const userId = 'urTxRZ7Z14WRdkRNq1CYrIEie943'; // Larry's user ID
    const tenantId = 'CVnhIgM8Hy1FuuN0JUwr';
    const organizationId = 'NybZTpEnwtfkRQrw3eh4';
    const companyId = 'DEgO9xQopLn4D9jEvboc';
    
    console.log('Fixing tenant permissions for Larry...');
    
    // 1. Update user document with correct IDs
    try {
      await db.collection('users').doc(userId).update({
        currentTenantId: tenantId,
        organizationId: organizationId,
        companyId: companyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ User document updated');
    } catch (error) {
      console.log('❌ Error updating user document:', error.message);
    }
    
    // 2. Fix tenant permissions - find and update tenantUsers documents
    const tenantUsersQuery = await db.collection('tenantUsers')
      .where('userId', '==', userId)
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`Found ${tenantUsersQuery.size} tenantUsers documents`);
    
    const batch = db.batch();
    
    tenantUsersQuery.forEach(doc => {
      const currentData = doc.data();
      console.log('Current tenantUser data:', JSON.stringify(currentData, null, 2));
      
      const ref = db.collection('tenantUsers').doc(doc.id);
      batch.update(ref, {
        role: 'admin', // Upgrade from member to admin
        permissions: {
          canCreateTickets: true,
          canViewAllTickets: true,     // ← This was the key issue!
          canManageUsers: true,
          canManageSettings: true
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    if (tenantUsersQuery.size > 0) {
      await batch.commit();
      console.log('✅ Tenant permissions updated - canViewAllTickets set to true');
    } else {
      console.log('❌ No tenantUsers documents found');
    }
    
    console.log('\n🎉 Tenant permissions fixed successfully!');
    console.log('The key change: Set canViewAllTickets: true in tenant permissions');
    console.log('This should resolve the "All Tickets" view showing empty results.');
    
  } catch (error) {
    console.error('❌ Error fixing tenant permissions:', error);
  } finally {
    process.exit(0);
  }
}

fixTenantPermissions();