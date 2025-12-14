// Browser Console Script to Check User Role
// Make sure you're logged in as admin on helpdesk.anglinai.com
// Then open Developer Tools > Console and paste this code

async function checkUserRole(email = 'larry@your-domain.com') {
  console.log(`🔍 Checking role for: ${email}`);
  
  try {
    // Get Firestore instance (using global firebase object)
    const db = firebase.firestore();
    
    console.log('📡 Querying users collection...');
    
    // Method 1: Query by email
    const usersQuery = db.collection('users').where('email', '==', email);
    const usersSnapshot = await usersQuery.get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('✅ User found:');
      console.log(`   Document ID: ${userDoc.id}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Display Name: ${userData.displayName || 'N/A'}`);
      console.log(`   Role: ${userData.role || 'NO ROLE FIELD'}`);
      console.log(`   Created At: ${userData.createdAt?.toDate?.() || userData.createdAt || 'N/A'}`);
      console.log(`   Organization ID: ${userData.organizationId || 'N/A'}`);
      console.log(`   Company ID: ${userData.companyId || 'N/A'}`);
      console.log(`   Current Tenant ID: ${userData.currentTenantId || 'N/A'}`);
      
      if (userData.tenantMemberships && userData.tenantMemberships.length > 0) {
        console.log('   Tenant Memberships:');
        userData.tenantMemberships.forEach((membership, index) => {
          console.log(`     ${index + 1}. Tenant: ${membership.tenantId}, Role: ${membership.role}, Access: ${membership.accessLevel}`);
        });
      }
      
      console.log('\n📋 Full user document:');
      console.log(userData);
      
      // Check if role matches what storage rules expect
      if (userData.role === 'super_admin') {
        console.log('\n✅ Role matches storage rules expectation for super_admin');
      } else {
        console.log(`\n⚠️  Role '${userData.role}' does NOT match 'super_admin' expected by storage rules`);
        console.log('💡 This explains the storage permission errors!');
      }
      
      return userData;
    } else {
      console.log('❌ No user found with that email');
      
      // Show all users for debugging
      console.log('\n🔍 Showing all users in collection for debugging...');
      const allUsersSnapshot = await db.collection('users').get();
      
      console.log(`Found ${allUsersSnapshot.size} total users:`);
      allUsersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ID: ${doc.id}, Email: ${data.email || 'N/A'}, Role: ${data.role || 'NO ROLE'}`);
      });
      
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error checking user role:', error);
    return null;
  }
}

// Also check current logged-in user's info
async function checkCurrentUser() {
  console.log('\n🔍 Checking current logged-in user...');
  
  try {
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      console.log('✅ Current user authenticated:');
      console.log(`   UID: ${currentUser.uid}`);
      console.log(`   Email: ${currentUser.email}`);
      console.log(`   Display Name: ${currentUser.displayName}`);
      
      // Get the user's custom claims
      const idTokenResult = await currentUser.getIdTokenResult(true);
      console.log('   Custom Claims:');
      console.log(idTokenResult.claims);
      
      // Get the user's Firestore document
      const db = firebase.firestore();
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('   Firestore Document:');
        console.log(`     Role: ${userData.role || 'NO ROLE'}`);
        console.log(`     Organization ID: ${userData.organizationId || 'N/A'}`);
        console.log(`     Company ID: ${userData.companyId || 'N/A'}`);
        console.log(userData);
      } else {
        console.log('   ❌ No Firestore document found');
      }
      
    } else {
      console.log('❌ No user currently logged in');
    }
  } catch (error) {
    console.error('❌ Error checking current user:', error);
  }
}

// Run both checks
console.log('🚀 Starting user role investigation...\n');
checkCurrentUser().then(() => {
  return checkUserRole('larry@your-domain.com');
}).then(() => {
  console.log('\n✅ Investigation complete!');
  console.log('\n💡 If the role is not "super_admin", that explains the storage permission errors.');
  console.log('💡 The storage rules expect getUserRole() to return "super_admin" for logo uploads.');
});