const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./functions/credentials/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-project-id.firebaseio.com'
});

const db = admin.firestore();

async function fixUserPermissions() {
  try {
    const userId = 'urTxRZ7Z14WRdkRNq1CYrIEie943'; // Larry's user ID
    const tenantId = 'CVnhIgM8Hy1FuuN0JUwr';
    const organizationId = 'NybZTpEnwtfkRQrw3eh4';
    const companyId = 'DEgO9xQopLn4D9jEvboc';
    
    console.log('Fixing user permissions for Larry...');
    
    // 1. Fix Firebase Auth custom claims
    const customClaims = {
      role: 'super_admin',
      tenantId: tenantId,
      organizationId: organizationId,
      companyId: companyId,
      updatedAt: Date.now()
    };
    
    await admin.auth().setCustomUserClaims(userId, customClaims);
    console.log('✅ Custom claims updated');
    
    // 2. Update user document
    await db.collection('users').doc(userId).update({
      role: 'super_admin',
      currentTenantId: tenantId,
      organizationId: organizationId,
      companyId: companyId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ User document updated');
    
    // 3. Fix tenant permissions - find and update tenantUsers documents
    const tenantUsersQuery = await db.collection('tenantUsers')
      .where('userId', '==', userId)
      .where('tenantId', '==', tenantId)
      .get();
    
    console.log(`Found ${tenantUsersQuery.size} tenantUsers documents`);
    
    const batch = db.batch();
    
    tenantUsersQuery.forEach(doc => {
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
      console.log('✅ Tenant permissions updated');
    }
    
    console.log('\n🎉 User permissions fixed successfully!');
    console.log('Changes made:');
    console.log('- Firebase Auth: Added tenantId, organizationId, companyId to custom claims');
    console.log('- User Document: Updated role and IDs');
    console.log('- Tenant Permissions: Set canViewAllTickets: true, role: admin');
    
  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  } finally {
    process.exit(0);
  }
}

fixUserPermissions();