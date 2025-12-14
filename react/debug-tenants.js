// Debug script to check tenant data
// Run this in the browser console on the site

// Function to check tenants in Firestore
async function debugTenants() {
  try {
    // Get all tenants
    const tenants = await window.firebase.firestore().collection('tenants').get();
    
    console.log(`Found ${tenants.docs.length} tenant documents:`);
    
    tenants.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Tenant ID: ${doc.id}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Plan: ${data.plan}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
      console.log(`   Owner: ${data.ownerId || 'none'}`);
      console.log(`   ---`);
    });
    
    // Check for duplicates by name
    const nameMap = {};
    tenants.docs.forEach(doc => {
      const name = doc.data().name;
      if (!nameMap[name]) {
        nameMap[name] = [];
      }
      nameMap[name].push(doc.id);
    });
    
    console.log('\nTenants grouped by name:');
    Object.entries(nameMap).forEach(([name, ids]) => {
      console.log(`"${name}": ${ids.length} tenant(s) - ${ids.join(', ')}`);
      if (ids.length > 1) {
        console.warn(`⚠️ DUPLICATE NAME DETECTED: "${name}" has ${ids.length} tenants!`);
      }
    });
    
  } catch (error) {
    console.error('Error checking tenants:', error);
  }
}

// Call the function
debugTenants();