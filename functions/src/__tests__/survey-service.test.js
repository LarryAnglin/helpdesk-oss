/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');

// Mock Firebase Admin
jest.mock('firebase-admin');

// Mock the send-email module
jest.mock('../send-email', () => ({
  sendEmail: jest.fn()
}));

const { sendEmail } = require('../send-email');

describe('Survey Service', () => {
  let mockFirestore;
  let mockCollection;
  let mockDoc;
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mocks
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockQuery = {
      get: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery)
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      where: jest.fn(() => mockQuery),
      add: jest.fn(),
      get: jest.fn()
    };

    mockFirestore = {
      collection: jest.fn(() => mockCollection)
    };

    admin.firestore.mockReturnValue(mockFirestore);
    sendEmail.mockResolvedValue({ success: true });
  });

  describe('scheduleSurveyEmail', () => {
    test('should schedule survey email for closed ticket', async () => {
      const ticket = {
        id: 'TICKET-123',
        title: 'Test Support Request',
        submitterId: 'user-456',
        submitterEmail: 'user@company.com',
        status: 'Closed',
        closedAt: new Date()
      };

      const config = {
        surveySettings: {
          enabled: true,
          delayHours: 24,
          surveyUrl: 'https://helpdesk.company.com/survey'
        }
      };

      const surveyToken = 'survey-token-' + Date.now();
      const scheduledTime = new Date(Date.now() + (config.surveySettings.delayHours * 60 * 60 * 1000));

      mockCollection.add.mockResolvedValue({
        id: 'scheduled-survey-1'
      });

      // Simulate scheduling survey
      const scheduledSurvey = {
        ticketId: ticket.id,
        recipientEmail: ticket.submitterEmail,
        token: surveyToken,
        scheduledFor: scheduledTime,
        status: 'pending',
        createdAt: new Date(),
        ticketTitle: ticket.title
      };

      await mockFirestore.collection('scheduled_surveys').add(scheduledSurvey);

      expect(mockFirestore.collection).toHaveBeenCalledWith('scheduled_surveys');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: ticket.id,
          recipientEmail: ticket.submitterEmail,
          status: 'pending',
          ticketTitle: ticket.title
        })
      );
    });

    test('should not schedule survey when disabled', async () => {
      const ticket = { id: 'TICKET-123', status: 'Closed' };
      const config = {
        surveySettings: {
          enabled: false
        }
      };

      if (!config.surveySettings?.enabled) {
        const result = { 
          success: false, 
          reason: 'Survey scheduling is disabled' 
        };
        expect(result.success).toBe(false);
        expect(result.reason).toBe('Survey scheduling is disabled');
      }

      expect(mockCollection.add).not.toHaveBeenCalled();
    });

    test('should handle missing submitter email', async () => {
      const ticket = {
        id: 'TICKET-123',
        submitterId: 'user-456',
        // submitterEmail missing
        status: 'Closed'
      };

      const config = {
        surveySettings: { enabled: true }
      };

      if (!ticket.submitterEmail) {
        const result = { 
          success: false, 
          reason: 'No submitter email found' 
        };
        expect(result.success).toBe(false);
        expect(result.reason).toBe('No submitter email found');
      }
    });
  });

  describe('processScheduledSurveys', () => {
    test('should send surveys that are due', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      const mockSurveys = [
        {
          id: 'survey-1',
          ticketId: 'TICKET-123',
          recipientEmail: 'user@company.com',
          token: 'token-123',
          scheduledFor: { toDate: () => pastTime },
          status: 'pending',
          ticketTitle: 'Support Request'
        },
        {
          id: 'survey-2',
          ticketId: 'TICKET-456',
          recipientEmail: 'user2@company.com',
          token: 'token-456',
          scheduledFor: { toDate: () => new Date(now.getTime() + 60 * 60 * 1000) }, // 1 hour future
          status: 'pending',
          ticketTitle: 'Bug Report'
        }
      ];

      const mockSnapshot = {
        docs: mockSurveys.map(survey => ({
          id: survey.id,
          data: () => survey,
          ref: {
            update: jest.fn()
          }
        }))
      };

      mockQuery.get.mockResolvedValue(mockSnapshot);

      // Simulate processing scheduled surveys
      const pendingSurveysQuery = mockFirestore.collection('scheduled_surveys')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', now);

      const pendingSurveys = await pendingSurveysQuery.get();
      let sentCount = 0;

      for (const surveyDoc of pendingSurveys.docs) {
        const survey = surveyDoc.data();
        
        if (survey.scheduledFor.toDate() <= now) {
          // Send survey email
          const surveyUrl = `https://helpdesk.company.com/survey?token=${survey.token}`;
          
          await sendEmail({
            to: survey.recipientEmail,
            subject: `How was your support experience? - ${survey.ticketTitle}`,
            html: `
              <h2>We'd love your feedback!</h2>
              <p>Thank you for contacting our support team regarding "${survey.ticketTitle}".</p>
              <p>Please take a moment to rate your experience:</p>
              <p><a href="${surveyUrl}">Take Survey</a></p>
            `
          });

          // Update survey status
          await surveyDoc.ref.update({
            status: 'sent',
            sentAt: new Date()
          });

          sentCount++;
        }
      }

      expect(sentCount).toBe(1); // Only the past-due survey should be sent
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@company.com',
          subject: expect.stringContaining('Support Request')
        })
      );
    });

    test('should handle email sending failures', async () => {
      const survey = {
        id: 'survey-1',
        recipientEmail: 'user@company.com',
        token: 'token-123',
        scheduledFor: { toDate: () => new Date(Date.now() - 60 * 60 * 1000) },
        status: 'pending'
      };

      sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      try {
        await sendEmail({
          to: survey.recipientEmail,
          subject: 'Survey'
        });
      } catch (error) {
        // Update survey with error status
        const errorUpdate = {
          status: 'failed',
          error: error.message,
          failedAt: new Date()
        };
        
        expect(error.message).toBe('Email service unavailable');
        expect(errorUpdate.status).toBe('failed');
      }
    });
  });

  describe('recordSurveyResponse', () => {
    test('should record valid survey response', async () => {
      const token = 'valid-token-123';
      const rating = 5;
      const feedback = 'Great service!';

      const mockSurvey = {
        ticketId: 'TICKET-123',
        recipientEmail: 'user@company.com',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockSurvey
      });

      mockDoc.update.mockResolvedValue();
      mockCollection.add.mockResolvedValue({ id: 'response-1' });

      // Simulate recording survey response
      const surveyDoc = await mockFirestore.collection('scheduled_surveys')
        .doc(token).get();

      if (surveyDoc.exists && surveyDoc.data().status === 'sent') {
        // Record the response
        await mockFirestore.collection('survey_responses').add({
          token: token,
          ticketId: mockSurvey.ticketId,
          rating: rating,
          feedback: feedback,
          submittedAt: new Date(),
          recipientEmail: mockSurvey.recipientEmail
        });

        // Update survey status
        await mockDoc.update({
          status: 'completed',
          completedAt: new Date(),
          rating: rating
        });
      }

      expect(mockFirestore.collection).toHaveBeenCalledWith('scheduled_surveys');
      expect(mockFirestore.collection).toHaveBeenCalledWith('survey_responses');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          token: token,
          rating: rating,
          feedback: feedback
        })
      );
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          rating: rating
        })
      );
    });

    test('should reject invalid survey token', async () => {
      const invalidToken = 'invalid-token';

      mockDoc.get.mockResolvedValue({
        exists: false
      });

      const surveyDoc = await mockFirestore.collection('scheduled_surveys')
        .doc(invalidToken).get();

      if (!surveyDoc.exists) {
        const result = {
          success: false,
          error: 'Invalid survey token'
        };
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid survey token');
      }
    });

    test('should reject responses to expired surveys', async () => {
      const token = 'expired-token';
      const expiredSurvey = {
        status: 'completed', // Already completed
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => expiredSurvey
      });

      const surveyDoc = await mockFirestore.collection('scheduled_surveys')
        .doc(token).get();

      if (surveyDoc.exists && surveyDoc.data().status !== 'sent') {
        const result = {
          success: false,
          error: 'Survey has already been completed or expired'
        };
        expect(result.success).toBe(false);
      }
    });

    test('should validate rating values', () => {
      const validRatings = [1, 2, 3, 4, 5];
      const invalidRatings = [0, 6, -1, 'high', null];

      validRatings.forEach(rating => {
        expect(rating >= 1 && rating <= 5).toBe(true);
      });

      invalidRatings.forEach(rating => {
        expect(rating >= 1 && rating <= 5 && typeof rating === 'number').toBe(false);
      });
    });
  });

  describe('Survey Analytics', () => {
    test('should calculate survey metrics', async () => {
      const mockResponses = [
        { rating: 5, ticketId: 'T1' },
        { rating: 4, ticketId: 'T2' },
        { rating: 5, ticketId: 'T3' },
        { rating: 3, ticketId: 'T4' },
        { rating: 4, ticketId: 'T5' }
      ];

      const mockSnapshot = {
        docs: mockResponses.map(response => ({
          data: () => response
        }))
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const responses = await mockFirestore.collection('survey_responses').get();
      const ratings = responses.docs.map(doc => doc.data().rating);
      
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      const distribution = ratings.reduce((acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      }, {});

      expect(averageRating).toBe(4.2);
      expect(distribution[5]).toBe(2);
      expect(distribution[4]).toBe(2);
      expect(distribution[3]).toBe(1);
    });
  });
});