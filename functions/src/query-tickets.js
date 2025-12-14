/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 * Query tickets to understand database structure
 */

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const cors = require('cors');

const corsHandler = cors({ origin: true });

/**
 * Query tickets to understand the current database structure
 * This script will:
 * 1. Fetch a sample of tickets
 * 2. Analyze their structure
 * 3. Look for organization/company/tenant assignments
 * 4. Return findings about the schema
 */
exports.queryTickets = onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      console.log('Starting ticket analysis...');
      
      // Get a sample of tickets to analyze
      const ticketsSnapshot = await admin.firestore()
        .collection('tickets')
        .limit(50)
        .get();

      if (ticketsSnapshot.empty) {
        return res.status(200).json({
          message: 'No tickets found in database',
          ticketCount: 0,
          findings: []
        });
      }

      const tickets = [];
      const fieldAnalysis = new Map();
      const companyOrgAnalysis = {
        hasCompanyId: 0,
        hasOrganizationId: 0,
        hasTenantId: 0,
        uniqueCompanyIds: new Set(),
        uniqueOrganizationIds: new Set(),
        uniqueTenantIds: new Set()
      };

      // Analyze each ticket
      ticketsSnapshot.docs.forEach(doc => {
        const ticket = { id: doc.id, ...doc.data() };
        tickets.push(ticket);

        // Track all fields present in tickets
        Object.keys(ticket).forEach(field => {
          if (!fieldAnalysis.has(field)) {
            fieldAnalysis.set(field, {
              count: 0,
              sampleValues: new Set(),
              types: new Set()
            });
          }
          
          const analysis = fieldAnalysis.get(field);
          analysis.count++;
          
          const value = ticket[field];
          const type = typeof value;
          analysis.types.add(type);
          
          // Store sample values (limit to 5 unique samples)
          if (analysis.sampleValues.size < 5 && value !== null && value !== undefined) {
            if (type === 'object' && value.toDate) {
              analysis.sampleValues.add('[Firestore Timestamp]');
            } else if (type === 'object') {
              analysis.sampleValues.add(`[Object: ${Object.keys(value).slice(0, 3).join(', ')}]`);
            } else {
              analysis.sampleValues.add(String(value).slice(0, 50));
            }
          }
        });

        // Analyze company/organization/tenant assignments
        if (ticket.companyId) {
          companyOrgAnalysis.hasCompanyId++;
          companyOrgAnalysis.uniqueCompanyIds.add(ticket.companyId);
        }
        if (ticket.organizationId) {
          companyOrgAnalysis.hasOrganizationId++;
          companyOrgAnalysis.uniqueOrganizationIds.add(ticket.organizationId);
        }
        if (ticket.tenantId) {
          companyOrgAnalysis.hasTenantId++;
          companyOrgAnalysis.uniqueTenantIds.add(ticket.tenantId);
        }
      });

      // Convert field analysis to readable format
      const fieldSummary = Array.from(fieldAnalysis.entries()).map(([field, data]) => ({
        field,
        presentInTickets: data.count,
        percentage: Math.round((data.count / tickets.length) * 100),
        types: Array.from(data.types),
        sampleValues: Array.from(data.sampleValues)
      })).sort((a, b) => b.presentInTickets - a.presentInTickets);

      // Check for users, organizations, companies collections
      const collectionsInfo = {};
      
      try {
        const usersSnapshot = await admin.firestore().collection('users').limit(5).get();
        collectionsInfo.users = {
          exists: true,
          count: usersSnapshot.size,
          sampleFields: usersSnapshot.empty ? [] : Object.keys(usersSnapshot.docs[0].data())
        };
      } catch (error) {
        collectionsInfo.users = { exists: false, error: error.message };
      }

      try {
        const orgsSnapshot = await admin.firestore().collection('organizations').limit(5).get();
        collectionsInfo.organizations = {
          exists: true,
          count: orgsSnapshot.size,
          sampleFields: orgsSnapshot.empty ? [] : Object.keys(orgsSnapshot.docs[0].data())
        };
      } catch (error) {
        collectionsInfo.organizations = { exists: false, error: error.message };
      }

      try {
        const companiesSnapshot = await admin.firestore().collection('companies').limit(5).get();
        collectionsInfo.companies = {
          exists: true,
          count: companiesSnapshot.size,
          sampleFields: companiesSnapshot.empty ? [] : Object.keys(companiesSnapshot.docs[0].data())
        };
      } catch (error) {
        collectionsInfo.companies = { exists: false, error: error.message };
      }

      try {
        const tenantsSnapshot = await admin.firestore().collection('tenants').limit(5).get();
        collectionsInfo.tenants = {
          exists: true,
          count: tenantsSnapshot.size,
          sampleFields: tenantsSnapshot.empty ? [] : Object.keys(tenantsSnapshot.docs[0].data())
        };
      } catch (error) {
        collectionsInfo.tenants = { exists: false, error: error.message };
      }

      // Create findings summary
      const findings = {
        totalTicketsAnalyzed: tickets.length,
        ticketFields: fieldSummary,
        companyOrgAssignments: {
          ...companyOrgAnalysis,
          uniqueCompanyIds: Array.from(companyOrgAnalysis.uniqueCompanyIds),
          uniqueOrganizationIds: Array.from(companyOrgAnalysis.uniqueOrganizationIds),
          uniqueTenantIds: Array.from(companyOrgAnalysis.uniqueTenantIds)
        },
        collectionsInfo,
        recommendations: []
      };

      // Add recommendations based on findings
      if (companyOrgAnalysis.hasCompanyId === 0 && companyOrgAnalysis.hasOrganizationId === 0 && companyOrgAnalysis.hasTenantId === 0) {
        findings.recommendations.push('No tickets have company, organization, or tenant assignments. Consider adding these fields for multi-tenant support.');
      }

      if (companyOrgAnalysis.hasTenantId > 0 && companyOrgAnalysis.hasOrganizationId === 0) {
        findings.recommendations.push('Tickets use tenantId but not organizationId. Consider migrating to organizationId for clearer structure.');
      }

      if (fieldAnalysis.has('submitterId')) {
        const submitterAnalysis = fieldAnalysis.get('submitterId');
        findings.recommendations.push(`${submitterAnalysis.count} tickets have submitterId assignments (${Math.round((submitterAnalysis.count / tickets.length) * 100)}%)`);
      }

      return res.status(200).json(findings);

    } catch (error) {
      console.error('Error analyzing tickets:', error);
      return res.status(500).json({ 
        error: 'Failed to analyze tickets',
        details: error.message 
      });
    }
  });
});