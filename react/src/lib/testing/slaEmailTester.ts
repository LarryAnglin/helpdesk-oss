/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { collection, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Ticket } from '../types/ticket';
import { SLASettings, DEFAULT_SLA_SETTINGS } from '../types/sla';
import { generateSLAExpectationText } from '../utils/slaCalculator';

// Test email address - replace with your test email
const TEST_EMAIL = 'test@example.com';

// Test scenarios with different priorities and submission times
interface TestScenario {
  name: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  submissionDate: Date;
  description: string;
}

/**
 * Generate test scenarios for SLA email testing
 */
function generateTestScenarios(): TestScenario[] {
  const now = new Date();
  
  // Get current date components
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // Friday at 6 PM (after business hours)
  const fridayEvening = new Date(today);
  fridayEvening.setDate(today.getDate() + (5 - today.getDay() + 7) % 7); // Next Friday
  fridayEvening.setHours(18, 0, 0, 0);
  
  // Monday at 9 AM (start of business hours)
  const mondayMorning = new Date(today);
  mondayMorning.setDate(today.getDate() + (1 - today.getDay() + 7) % 7); // Next Monday
  mondayMorning.setHours(9, 0, 0, 0);
  
  // Wednesday at 2 PM (middle of business hours)
  const wednesdayAfternoon = new Date(today);
  wednesdayAfternoon.setDate(today.getDate() + (3 - today.getDay() + 7) % 7); // Next Wednesday
  wednesdayAfternoon.setHours(14, 0, 0, 0);
  
  // Saturday at 10 AM (weekend)
  const saturdayMorning = new Date(today);
  saturdayMorning.setDate(today.getDate() + (6 - today.getDay() + 7) % 7); // Next Saturday
  saturdayMorning.setHours(10, 0, 0, 0);
  
  // Tuesday at 11 PM (after business hours, but weekday)
  const tuesdayNight = new Date(today);
  tuesdayNight.setDate(today.getDate() + (2 - today.getDay() + 7) % 7); // Next Tuesday
  tuesdayNight.setHours(23, 0, 0, 0);

  return [
    {
      name: 'Urgent - Friday Evening',
      priority: 'Urgent',
      submissionDate: fridayEvening,
      description: 'Critical system outage - all users affected. Testing urgent priority during weekend.'
    },
    {
      name: 'High - Monday Morning',
      priority: 'High',
      submissionDate: mondayMorning,
      description: 'Database performance issues affecting multiple users. Testing high priority at start of business week.'
    },
    {
      name: 'Medium - Wednesday Afternoon',
      priority: 'Medium',
      submissionDate: wednesdayAfternoon,
      description: 'Application feature not working as expected. Testing medium priority during business hours.'
    },
    {
      name: 'Medium - Friday Evening',
      priority: 'Medium',
      submissionDate: fridayEvening,
      description: 'Medium priority ticket submitted after business hours on Friday. Should expect response on Monday.'
    },
    {
      name: 'Low - Saturday Morning',
      priority: 'Low',
      submissionDate: saturdayMorning,
      description: 'Feature request for minor enhancement. Testing low priority on weekend.'
    },
    {
      name: 'High - Tuesday Night',
      priority: 'High',
      submissionDate: tuesdayNight,
      description: 'Important but not critical issue submitted after business hours. Testing boundary conditions.'
    },
    {
      name: 'Urgent - Right Now',
      priority: 'Urgent',
      submissionDate: now,
      description: 'Testing urgent priority with current timestamp to see immediate SLA expectations.'
    }
  ];
}

/**
 * Create a test ticket with specified parameters
 */
function createTestTicket(scenario: TestScenario): Partial<Ticket> {
  const ticketId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: ticketId,
    title: `SLA Test: ${scenario.name}`,
    description: scenario.description,
    priority: scenario.priority,
    status: 'Open',
    email: TEST_EMAIL,
    name: 'SLA Test User',
    computer: 'TEST-COMPUTER',
    location: 'Other',
    contactMethod: 'Email',
    isOnVpn: false,
    createdAt: scenario.submissionDate.getTime(),
    updatedAt: scenario.submissionDate.getTime(),
    submitterId: 'test-user-id',
    participants: [],
    attachments: [],
    replies: []
  };
}

/**
 * Generate SLA expectation text for a test scenario
 */
function generateTestSLAText(scenario: TestScenario, slaSettings: SLASettings): string {
  const expectation = generateSLAExpectationText(scenario.priority, scenario.submissionDate, slaSettings);
  return expectation.plainText;
}

/**
 * Create email document in Firestore mail collection
 */
async function createTestEmailDocument(ticket: Partial<Ticket>, slaSettings: SLASettings): Promise<string> {
  const submissionDate = new Date(ticket.createdAt!);
  const slaExpectation = generateSLAExpectationText(ticket.priority!, submissionDate, slaSettings);
  
  const emailDoc = {
    to: [ticket.email!],
    cc: [],
    replyTo: `ticket-test-reply@mail.anglinai.com`,
    message: {
      subject: `[TEST] SLA Email Test: ${ticket.title}`,
      text: `This is a test email for SLA expectations.

Ticket: ${ticket.title}
Priority: ${ticket.priority}
Submitted: ${submissionDate.toLocaleString()}

${slaExpectation.plainText}

This is a test email and will be automatically deleted.`,
      html: `
        <h2>SLA Email Test</h2>
        <p><strong>Ticket:</strong> ${ticket.title}</p>
        <p><strong>Priority:</strong> ${ticket.priority}</p>
        <p><strong>Submitted:</strong> ${submissionDate.toLocaleString()}</p>
        
        ${slaExpectation.htmlText}
        
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>⚠️ Test Email Notice:</strong></p>
          <p>This is a test email for SLA functionality. This email document will be automatically deleted from the queue.</p>
        </div>
      `,
      from: 'Help Desk <helpdesk@mail.anglinai.com>'
    },
    // Add metadata to identify test emails
    testEmail: true,
    testScenario: ticket.title,
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, 'mail'), emailDoc);
  return docRef.id;
}

/**
 * Clean up test email documents from Firestore
 */
async function cleanupTestEmails(documentIds: string[]): Promise<void> {
  console.log('🧹 Cleaning up test email documents...');
  
  for (const docId of documentIds) {
    try {
      await deleteDoc(doc(db, 'mail', docId));
      console.log(`✅ Deleted test email document: ${docId}`);
    } catch (error) {
      console.error(`❌ Failed to delete document ${docId}:`, error);
    }
  }
}

/**
 * Clean up any existing test emails (in case previous tests didn't clean up properly)
 */
async function cleanupExistingTestEmails(): Promise<void> {
  try {
    const q = query(collection(db, 'mail'), where('testEmail', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log(`🧹 Found ${querySnapshot.size} existing test emails to clean up`);
      const cleanupPromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(cleanupPromises);
      console.log('✅ Cleaned up existing test emails');
    }
  } catch (error) {
    console.log('ℹ️ No existing test emails to clean up (or cleanup failed):', error);
  }
}

/**
 * Main test function - sends SLA acknowledgment emails for various scenarios
 */
export async function testSLAEmails(testEmail?: string, customSlaSettings?: SLASettings): Promise<void> {
  console.log('🚀 Starting SLA Email Test...');
  console.log('📧 Test emails will be sent to:', testEmail || TEST_EMAIL);
  
  // Use provided email or default
  const emailAddress = testEmail || TEST_EMAIL;
  
  // Use provided SLA settings or defaults
  const slaSettings = customSlaSettings || DEFAULT_SLA_SETTINGS;
  
  // Update TEST_EMAIL if provided
  if (testEmail) {
    console.log(`📧 Using custom test email: ${testEmail}`);
  }
  
  const scenarios = generateTestScenarios();
  const createdDocuments: string[] = [];
  
  try {
    // Clean up any existing test emails first
    await cleanupExistingTestEmails();
    
    console.log('📋 Test Scenarios:');
    scenarios.forEach((scenario, index) => {
      const slaText = generateTestSLAText(scenario, slaSettings);
      console.log(`\n${index + 1}. ${scenario.name}`);
      console.log(`   Priority: ${scenario.priority}`);
      console.log(`   Submission: ${scenario.submissionDate.toLocaleString()}`);
      console.log(`   SLA Expectation: ${slaText.trim()}`);
    });
    
    console.log('\n📤 Creating test email documents...');
    
    // Create test tickets and email documents
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      const testTicket = createTestTicket(scenario);
      
      // Override email address
      testTicket.email = emailAddress;
      
      console.log(`\n📧 Creating email for: ${scenario.name}`);
      
      try {
        const docId = await createTestEmailDocument(testTicket, slaSettings);
        createdDocuments.push(docId);
        console.log(`✅ Created email document: ${docId}`);
        
        // Small delay between email creations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Failed to create email for ${scenario.name}:`, error);
      }
    }
    
    console.log(`\n📬 Created ${createdDocuments.length} test email documents`);
    console.log('⏳ Waiting 10 seconds for emails to be processed...');
    
    // Wait for emails to be processed
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Error during test execution:', error);
  } finally {
    // Clean up test documents
    if (createdDocuments.length > 0) {
      await cleanupTestEmails(createdDocuments);
      console.log(`\n✅ Test completed! Cleaned up ${createdDocuments.length} test email documents`);
    } else {
      console.log('\n⚠️ No test documents were created to clean up');
    }
  }
  
  console.log('\n🎉 SLA Email Test Complete!');
  console.log('📧 Check your email inbox for the test messages');
  console.log('💡 Each email should show different SLA expectations based on priority and submission time');
}

/**
 * Quick test function for a single scenario
 */
export async function testSingleSLAEmail(
  priority: 'Urgent' | 'High' | 'Medium' | 'Low',
  submissionDate: Date,
  testEmail?: string,
  customSlaSettings?: SLASettings
): Promise<void> {
  const emailAddress = testEmail || TEST_EMAIL;
  const slaSettings = customSlaSettings || DEFAULT_SLA_SETTINGS;
  
  console.log('🚀 Testing single SLA email...');
  console.log(`📧 Email: ${emailAddress}`);
  console.log(`🎯 Priority: ${priority}`);
  console.log(`📅 Submission: ${submissionDate.toLocaleString()}`);
  
  const scenario: TestScenario = {
    name: `Single Test - ${priority}`,
    priority,
    submissionDate,
    description: `Single test email for ${priority} priority submitted at ${submissionDate.toLocaleString()}`
  };
  
  const testTicket = createTestTicket(scenario);
  testTicket.email = emailAddress;
  
  try {
    await cleanupExistingTestEmails();
    
    const docId = await createTestEmailDocument(testTicket, slaSettings);
    console.log(`✅ Created test email document: ${docId}`);
    
    console.log('⏳ Waiting 5 seconds for email to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await deleteDoc(doc(db, 'mail', docId));
    console.log(`✅ Cleaned up test document: ${docId}`);
    
    console.log('\n🎉 Single SLA email test complete!');
    
  } catch (error) {
    console.error('❌ Error during single email test:', error);
  }
}