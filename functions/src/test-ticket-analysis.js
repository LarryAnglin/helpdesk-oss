/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 * Test script to analyze ticket structure and organization assignments
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure this script is run in an environment where Firebase is already initialized
// or initialize it here with your service account

async function analyzeTicketStructure() {
  try {
    console.log('Starting ticket structure analysis...\n');

    // Get a sample of tickets
    const ticketsSnapshot = await admin.firestore()
      .collection('tickets')
      .limit(10)
      .get();

    if (ticketsSnapshot.empty) {
      console.log('❌ No tickets found in database');
      return;
    }

    console.log(`📊 Found ${ticketsSnapshot.size} tickets to analyze\n`);

    // Analyze ticket structure
    const fieldCounts = new Map();
    const orgAnalysis = {
      withCompanyId: 0,
      withOrganizationId: 0,
      withTenantId: 0,
      withSubmitterId: 0,
      sampleTickets: []
    };

    ticketsSnapshot.docs.forEach((doc, index) => {
      const ticket = { id: doc.id, ...doc.data() };
      
      // Store first 3 tickets as samples
      if (index < 3) {
        orgAnalysis.sampleTickets.push({
          id: ticket.id,
          title: ticket.title,
          submitterId: ticket.submitterId,
          companyId: ticket.companyId,
          organizationId: ticket.organizationId,
          tenantId: ticket.tenantId,
          status: ticket.status
        });
      }

      // Count fields
      Object.keys(ticket).forEach(field => {
        fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
      });

      // Count organization assignments
      if (ticket.companyId) orgAnalysis.withCompanyId++;
      if (ticket.organizationId) orgAnalysis.withOrganizationId++;
      if (ticket.tenantId) orgAnalysis.withTenantId++;
      if (ticket.submitterId) orgAnalysis.withSubmitterId++;
    });

    // Display results
    console.log('🏗️  TICKET FIELD ANALYSIS');
    console.log('=' .repeat(50));
    
    const sortedFields = Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Show top 15 fields

    sortedFields.forEach(([field, count]) => {
      const percentage = Math.round((count / ticketsSnapshot.size) * 100);
      console.log(`${field.padEnd(20)} | ${count}/${ticketsSnapshot.size} (${percentage}%)`);
    });

    console.log('\n🏢 ORGANIZATION ASSIGNMENT ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`Tickets with companyId:      ${orgAnalysis.withCompanyId}/${ticketsSnapshot.size}`);
    console.log(`Tickets with organizationId: ${orgAnalysis.withOrganizationId}/${ticketsSnapshot.size}`);
    console.log(`Tickets with tenantId:       ${orgAnalysis.withTenantId}/${ticketsSnapshot.size}`);
    console.log(`Tickets with submitterId:    ${orgAnalysis.withSubmitterId}/${ticketsSnapshot.size}`);

    console.log('\n📝 SAMPLE TICKETS');
    console.log('=' .repeat(50));
    orgAnalysis.sampleTickets.forEach((ticket, index) => {
      console.log(`${index + 1}. ID: ${ticket.id}`);
      console.log(`   Title: ${ticket.title || 'N/A'}`);
      console.log(`   SubmitterID: ${ticket.submitterId || 'N/A'}`);
      console.log(`   CompanyID: ${ticket.companyId || 'N/A'}`);
      console.log(`   OrganizationID: ${ticket.organizationId || 'N/A'}`);
      console.log(`   TenantID: ${ticket.tenantId || 'N/A'}`);
      console.log(`   Status: ${ticket.status || 'N/A'}`);
      console.log('');
    });

    // Check related collections
    console.log('📁 RELATED COLLECTIONS');
    console.log('=' .repeat(50));
    
    const collections = ['users', 'organizations', 'companies', 'tenants'];
    for (const collection of collections) {
      try {
        const snapshot = await admin.firestore().collection(collection).limit(1).get();
        if (snapshot.empty) {
          console.log(`${collection.padEnd(15)} | ❌ Empty or doesn't exist`);
        } else {
          const totalSnapshot = await admin.firestore().collection(collection).select().get();
          console.log(`${collection.padEnd(15)} | ✅ ${totalSnapshot.size} documents`);
          
          // Show sample fields
          const sampleDoc = snapshot.docs[0].data();
          const fields = Object.keys(sampleDoc).slice(0, 5).join(', ');
          console.log(`${' '.repeat(17)}   Sample fields: ${fields}`);
        }
      } catch (error) {
        console.log(`${collection.padEnd(15)} | ❌ Error: ${error.message}`);
      }
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('=' .repeat(50));

    if (orgAnalysis.withOrganizationId === 0 && orgAnalysis.withCompanyId === 0 && orgAnalysis.withTenantId === 0) {
      console.log('⚠️  No tickets have organization/company assignments');
      console.log('   Consider adding organizationId or companyId fields for multi-tenant support');
    }

    if (orgAnalysis.withTenantId > 0 && orgAnalysis.withOrganizationId === 0) {
      console.log('🔄 Migration opportunity: tenantId → organizationId');
      console.log('   Consider migrating from tenantId to organizationId for clearer structure');
    }

    if (orgAnalysis.withSubmitterId > 0) {
      console.log('👥 User-based assignment possible');
      console.log('   Could assign tickets to organizations based on submitter user data');
    }

    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error analyzing tickets:', error);
  }
}

// Check if running directly (not imported)
if (require.main === module) {
  console.log('🎯 Ticket Database Analysis Tool');
  console.log('=' .repeat(50));
  console.log('This script will analyze your ticket database structure');
  console.log('and provide insights about organization assignments.\n');
  
  analyzeTicketStructure()
    .then(() => {
      console.log('\nDone! Use the analysis results to plan your organization assignments.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeTicketStructure };