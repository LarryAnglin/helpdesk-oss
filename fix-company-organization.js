const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

async function fixCompanyOrganization() {
  try {
    const organizationId = 'NybZTpEnwtfkRQrw3eh4';
    const companyId = 'DEgO9xQopLn4D9jEvboc';
    
    console.log('=== Fixing Company Organization Assignment ===');
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Company ID: ${companyId}\n`);
    
    // First, check the current company document
    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      console.log('❌ Company document does not exist!');
      return;
    }
    
    const companyData = companyDoc.data();
    console.log('Current company data:');
    console.log('  name:', companyData.name);
    console.log('  organizationId:', companyData.organizationId || 'MISSING');
    console.log('  organization_id:', companyData.organization_id || 'MISSING');
    console.log('  All fields:', Object.keys(companyData));
    
    // Update the company to have the correct organizationId
    const updates = {
      organizationId: organizationId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`\nUpdating company ${companyId} with organizationId: ${organizationId}`);
    await db.collection('companies').doc(companyId).update(updates);
    console.log('✅ Company updated successfully!');
    
    // Verify the update worked
    const updatedDoc = await db.collection('companies').doc(companyId).get();
    const updatedData = updatedDoc.data();
    console.log('\nVerification - Updated company data:');
    console.log('  name:', updatedData.name);
    console.log('  organizationId:', updatedData.organizationId);
    
    // Test the query that the UI uses
    console.log(`\nTesting query: companies where organizationId == '${organizationId}'`);
    const querySnapshot = await db.collection('companies')
      .where('organizationId', '==', organizationId)
      .get();
    
    console.log(`Query result: Found ${querySnapshot.size} companies`);
    
    if (querySnapshot.size > 0) {
      console.log('✅ Query now works! The UI should show 1 company.');
    } else {
      console.log('❌ Query still returns 0 companies. There might be another issue.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing company organization:', error);
  } finally {
    process.exit(0);
  }
}

fixCompanyOrganization();