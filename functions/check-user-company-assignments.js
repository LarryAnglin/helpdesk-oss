const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

async function checkUserCompanyAssignments() {
  try {
    const tenantId = 'CVnhIgM8Hy1FuuN0JUwr';
    const organizationId = 'NybZTpEnwtfkRQrw3eh4';
    const companyId = 'DEgO9xQopLn4D9jEvboc';
    
    console.log('Checking user company assignments...');
    console.log(`Tenant: ${tenantId}`);
    console.log(`Organization: ${organizationId}`);
    console.log(`Company: ${companyId}\n`);
    
    // 1. Check all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Total users in database: ${usersSnapshot.size}`);
    
    let usersWithoutCompany = 0;
    let usersWithoutOrg = 0;
    let usersWithCorrectAssignment = 0;
    
    const batch = db.batch();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      console.log(`\nUser: ${userData.email || userData.displayName || userId}`);
      console.log(`  organizationId: ${userData.organizationId || 'MISSING'}`);
      console.log(`  companyId: ${userData.companyId || 'MISSING'}`);
      console.log(`  currentTenantId: ${userData.currentTenantId || 'MISSING'}`);
      
      let needsUpdate = false;
      const updates = {};
      
      if (userData.organizationId !== organizationId) {
        updates.organizationId = organizationId;
        needsUpdate = true;
        usersWithoutOrg++;
      }
      
      if (userData.companyId !== companyId) {
        updates.companyId = companyId;
        needsUpdate = true;
        usersWithoutCompany++;
      }
      
      if (userData.currentTenantId !== tenantId) {
        updates.currentTenantId = tenantId;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        batch.update(db.collection('users').doc(userId), updates);
        console.log(`  → Will update with: ${JSON.stringify(updates)}`);
      } else {
        usersWithCorrectAssignment++;
        console.log(`  ✅ Already correctly assigned`);
      }
    });
    
    console.log('\n📊 Summary:');
    console.log(`Users with correct assignment: ${usersWithCorrectAssignment}`);
    console.log(`Users missing organization: ${usersWithoutOrg}`);
    console.log(`Users missing company: ${usersWithoutCompany}`);
    
    if (usersWithoutCompany > 0 || usersWithoutOrg > 0) {
      console.log('\n🔧 Applying fixes...');
      await batch.commit();
      console.log('✅ User assignments updated!');
    } else {
      console.log('\n✅ All users already correctly assigned!');
    }
    
    // 2. Check company document to see user count
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      console.log(`\n🏢 Company "${companyData.name}" details:`);
      console.log(`  userCount: ${companyData.userCount || 0}`);
      console.log(`  memberCount: ${companyData.memberCount || 0}`);
      
      // Update company user count
      await db.collection('companies').doc(companyId).update({
        userCount: usersSnapshot.size,
        memberCount: usersSnapshot.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Updated company user count to ${usersSnapshot.size}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking user assignments:', error);
  } finally {
    process.exit(0);
  }
}

checkUserCompanyAssignments();