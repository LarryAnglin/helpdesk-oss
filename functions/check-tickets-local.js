const admin = require('firebase-admin');

// Initialize Firebase Admin (using default credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-project-id'
  });
}

const db = admin.firestore();

async function checkTicketAssignments() {
  try {
    console.log('🔍 Checking current ticket assignments...\n');

    // Get all tickets
    const ticketsSnapshot = await db.collection('tickets').get();
    const tickets = [];
    ticketsSnapshot.forEach(doc => {
      tickets.push({ id: doc.id, ...doc.data() });
    });

    // Get all organizations
    const orgsSnapshot = await db.collection('organizations').get();
    const organizations = [];
    orgsSnapshot.forEach(doc => {
      organizations.push({ id: doc.id, ...doc.data() });
    });

    // Get all companies
    const companiesSnapshot = await db.collection('companies').get();
    const companies = [];
    companiesSnapshot.forEach(doc => {
      companies.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 SUMMARY:`);
    console.log(`   • Total Tickets: ${tickets.length}`);
    console.log(`   • Organizations: ${organizations.length}`);
    console.log(`   • Companies: ${companies.length}\n`);

    console.log(`🏢 ORGANIZATIONS:`);
    organizations.forEach(org => {
      console.log(`   • ${org.name} (ID: ${org.id}) - Status: ${org.status || 'N/A'}`);
    });

    console.log(`\n🏪 COMPANIES:`);
    companies.forEach(comp => {
      console.log(`   • ${comp.name} (ID: ${comp.id}) - Org: ${comp.organizationId || 'N/A'}`);
    });

    // Analyze ticket assignments
    let hasOrganizationId = 0;
    let hasCompanyId = 0;
    let hasTenantId = 0;
    let hasNone = 0;

    console.log(`\n🎫 TICKET ASSIGNMENTS:`);
    tickets.forEach(ticket => {
      if (ticket.organizationId) hasOrganizationId++;
      if (ticket.companyId) hasCompanyId++;
      if (ticket.tenantId) hasTenantId++;
      if (!ticket.organizationId && !ticket.companyId && !ticket.tenantId) hasNone++;
    });

    console.log(`   • Has organizationId: ${hasOrganizationId}`);
    console.log(`   • Has companyId: ${hasCompanyId}`);
    console.log(`   • Has tenantId: ${hasTenantId}`);
    console.log(`   • Has no assignment: ${hasNone}`);

    console.log(`\n📋 SAMPLE TICKETS:`);
    tickets.slice(0, 5).forEach(ticket => {
      console.log(`   • "${ticket.title}" (${ticket.id})`);
      console.log(`     - Organization: ${ticket.organizationId || 'None'}`);
      console.log(`     - Company: ${ticket.companyId || 'None'}`);
      console.log(`     - Tenant: ${ticket.tenantId || 'None'}`);
    });

    console.log(`\n✅ RECOMMENDATIONS:`);
    if (hasOrganizationId < tickets.length) {
      console.log(`   ⚠️  ${tickets.length - hasOrganizationId} tickets need organization assignment`);
    }
    if (hasCompanyId < tickets.length) {
      console.log(`   ⚠️  ${tickets.length - hasCompanyId} tickets need company assignment`);
    }
    if (organizations.length === 1 && companies.length === 1) {
      console.log(`   ✨ Perfect! You have exactly 1 organization and 1 company.`);
      console.log(`   💡 We can assign all tickets to:`);
      console.log(`      - Organization: ${organizations[0].name} (${organizations[0].id})`);
      console.log(`      - Company: ${companies[0].name} (${companies[0].id})`);
    }

    // Return data for potential update
    return {
      totalTickets: tickets.length,
      organizations,
      companies,
      needsUpdate: hasOrganizationId < tickets.length || hasCompanyId < tickets.length,
      targetOrganization: organizations.length === 1 ? organizations[0] : null,
      targetCompany: companies.length === 1 ? companies[0] : null
    };

  } catch (error) {
    console.error('❌ Error checking assignments:', error);
    return null;
  }
}

async function updateTicketAssignments(organizationId, companyId, dryRun = true) {
  try {
    console.log(`\n🔄 ${dryRun ? 'PREVIEW' : 'UPDATING'} ticket assignments...`);

    const db = admin.firestore();
    const ticketsSnapshot = await db.collection('tickets').get();
    const updates = [];
    const batch = db.batch();

    ticketsSnapshot.forEach(doc => {
      const ticket = doc.data();
      const updateData = {};
      let needsUpdate = false;

      if (organizationId && !ticket.organizationId) {
        updateData.organizationId = organizationId;
        needsUpdate = true;
      }

      if (companyId && !ticket.companyId) {
        updateData.companyId = companyId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        
        if (!dryRun) {
          batch.update(doc.ref, updateData);
        }
        
        updates.push({
          id: doc.id,
          title: ticket.title,
          updates: updateData
        });
      }
    });

    if (!dryRun && updates.length > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updates.length} tickets!`);
    } else {
      console.log(`📋 ${updates.length} tickets would be updated:`);
      updates.slice(0, 5).forEach(update => {
        console.log(`   • "${update.title}" → ${JSON.stringify(update.updates)}`);
      });
      if (updates.length > 5) {
        console.log(`   ... and ${updates.length - 5} more`);
      }
    }

    return { updatedCount: updates.length, updates };

  } catch (error) {
    console.error('❌ Error updating assignments:', error);
    return null;
  }
}

// Main execution
async function main() {
  const result = await checkTicketAssignments();
  
  if (result && result.needsUpdate && result.targetOrganization && result.targetCompany) {
    console.log(`\n🤔 Would you like to update all tickets? Run with 'update' argument to proceed.`);
    
    if (process.argv.includes('update')) {
      await updateTicketAssignments(
        result.targetOrganization.id,
        result.targetCompany.id,
        false // actual update
      );
    } else if (process.argv.includes('preview')) {
      await updateTicketAssignments(
        result.targetOrganization.id,
        result.targetCompany.id,
        true // dry run
      );
    }
  }
  
  process.exit(0);
}

main();