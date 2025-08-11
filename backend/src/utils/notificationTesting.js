const notificationIntegrationService = require('../services/notificationIntegrationService');
const pushNotificationService = require('../services/pushNotificationService');
const notificationTemplateService = require('../services/notificationTemplateService');
const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Testing utilities for push notifications system
 * Only available in development/testing environments
 */
class NotificationTestingUtils {
  constructor() {
    this.isEnabled = process.env.NODE_ENV !== 'production';
  }

  // Test all notification templates
  async testAllTemplates(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    try {
      const templates = await notificationTemplateService.getTemplatesByCategory();
      const results = [];

      for (const template of templates) {
        try {
          const testVariables = this.getTestVariables(template.name);
          const result = await this.testTemplate(userId, template.name, testVariables);
          results.push({
            template: template.name,
            success: result.success,
            error: result.error
          });

          // Small delay between tests
          await this.delay(500);
        } catch (error) {
          results.push({
            template: template.name,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`Tested ${results.length} notification templates for user ${userId}`);
      return { success: true, results };
    } catch (error) {
      logger.error('Failed to test all templates:', error);
      return { success: false, error: error.message };
    }
  }

  // Test specific template
  async testTemplate(userId, templateName, variables = {}) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    try {
      const template = await notificationTemplateService.getTemplate(templateName);
      const testVariables = { ...this.getTestVariables(templateName), ...variables };
      
      const notification = notificationTemplateService.renderTemplate(template, testVariables);
      
      // Add test prefix to title
      notification.title = `[TEST] ${notification.title}`;
      
      const result = await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Test notification sent for template ${templateName} to user ${userId}`);
      return { success: true, result };
    } catch (error) {
      logger.error(`Failed to test template ${templateName}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get test variables for different templates
  getTestVariables(templateName) {
    const testData = {
      // User data
      firstName: 'Alex',
      lastName: 'Johnson',
      
      // Bio data
      bioId: 'test-bio-123',
      
      // Photo analysis data
      score: '8',
      analysisId: 'test-analysis-456',
      
      // Subscription data
      daysLeft: '3',
      discount: '50',
      price: '9.99',
      offerId: 'test-offer-789',
      
      // Performance data
      newMatches: '12',
      profileViews: '156',
      viewIncrease: '35',
      weekNumber: '42',
      
      // Security data
      location: 'San Francisco, CA',
      
      // Feature data
      featureName: 'AI Photo Enhancement',
      featureDescription: 'Automatically enhance your photos for better match rates',
      featureId: 'feature-photo-enhance',
      
      // LinkedIn data
      headshotId: 'test-headshot-321',
      
      // Tips data
      tipTitle: 'Profile Photo Tips',
      tipContent: 'Use natural lighting for better photos',
      tipId: 'tip-photo-lighting',
      
      // General data
      timestamp: new Date().toISOString(),
      testMode: true
    };

    // Template-specific variables
    const templateVariables = {
      'welcome_new_user': { firstName: testData.firstName },
      'onboarding_incomplete': { firstName: testData.firstName },
      'bio_generation_complete': { bioId: testData.bioId },
      'photo_analysis_complete': { score: testData.score, analysisId: testData.analysisId },
      'headshot_ready': { headshotId: testData.headshotId },
      'subscription_expiring': { daysLeft: testData.daysLeft },
      'premium_offer': { 
        discount: testData.discount, 
        price: testData.price, 
        offerId: testData.offerId 
      },
      'weekly_insights': { newMatches: testData.newMatches },
      'profile_performance': { viewIncrease: testData.viewIncrease },
      'security_login': { location: testData.location },
      'new_feature': { 
        featureName: testData.featureName,
        featureDescription: testData.featureDescription,
        featureId: testData.featureId
      },
      'comeback_offer': { firstName: testData.firstName },
      'daily_tip': { 
        tipTitle: testData.tipTitle,
        tipContent: testData.tipContent,
        tipId: testData.tipId
      }
    };

    return templateVariables[templateName] || testData;
  }

  // Test notification categories
  async testNotificationCategories(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    const categories = [
      'onboarding_welcome',
      'bio_completion',
      'photo_analysis_ready',
      'subscription_renewal',
      'subscription_offer',
      'profile_performance',
      'weekly_insights',
      'security_alert',
      'feature_update',
      'engagement_boost',
      'tips_educational',
      'general'
    ];

    const results = [];

    for (const category of categories) {
      try {
        const notification = {
          title: `[TEST] ${category.replace(/_/g, ' ').toUpperCase()}`,
          body: `Test notification for ${category} category`,
          category,
          priority: 'normal',
          data: {
            test: true,
            category,
            timestamp: new Date().toISOString()
          }
        };

        const result = await pushNotificationService.sendNotificationToUser(userId, notification);
        results.push({
          category,
          success: result.success,
          notificationId: result.notificationId
        });

        // Small delay between tests
        await this.delay(1000);
      } catch (error) {
        results.push({
          category,
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Tested ${results.length} notification categories for user ${userId}`);
    return { success: true, results };
  }

  // Test notification priorities
  async testNotificationPriorities(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    const priorities = ['low', 'normal', 'high', 'critical'];
    const results = [];

    for (const priority of priorities) {
      try {
        const notification = {
          title: `[TEST] ${priority.toUpperCase()} Priority`,
          body: `Test notification with ${priority} priority level`,
          category: 'general',
          priority,
          data: {
            test: true,
            priority,
            timestamp: new Date().toISOString()
          }
        };

        const result = await pushNotificationService.sendNotificationToUser(userId, notification);
        results.push({
          priority,
          success: result.success,
          notificationId: result.notificationId
        });

        // Small delay between tests
        await this.delay(1000);
      } catch (error) {
        results.push({
          priority,
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Tested ${results.length} notification priorities for user ${userId}`);
    return { success: true, results };
  }

  // Test deep linking
  async testDeepLinking(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    const deepLinks = [
      {
        name: 'Home Screen',
        url: 'datingoptimizer://home',
        title: 'Navigate to Home'
      },
      {
        name: 'Profile Screen',
        url: 'datingoptimizer://profile',
        title: 'Open Your Profile'
      },
      {
        name: 'Bio Generator',
        url: 'datingoptimizer://bio/generate',
        title: 'Generate New Bio'
      },
      {
        name: 'Photo Analysis',
        url: 'datingoptimizer://analysis',
        title: 'Analyze Your Photos'
      },
      {
        name: 'Subscription',
        url: 'datingoptimizer://subscription',
        title: 'Manage Subscription'
      },
      {
        name: 'LinkedIn Headshot',
        url: 'linkedinheadshot://generate',
        title: 'Generate LinkedIn Headshot'
      }
    ];

    const results = [];

    for (const link of deepLinks) {
      try {
        const notification = {
          title: `[TEST] ${link.title}`,
          body: `Tap to test deep link: ${link.name}`,
          category: 'general',
          priority: 'normal',
          deepLinkUrl: link.url,
          data: {
            test: true,
            deepLink: link.url,
            linkName: link.name,
            timestamp: new Date().toISOString()
          }
        };

        const result = await pushNotificationService.sendNotificationToUser(userId, notification);
        results.push({
          linkName: link.name,
          url: link.url,
          success: result.success,
          notificationId: result.notificationId
        });

        // Small delay between tests
        await this.delay(1500);
      } catch (error) {
        results.push({
          linkName: link.name,
          url: link.url,
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Tested ${results.length} deep links for user ${userId}`);
    return { success: true, results };
  }

  // Test notification with images
  async testRichNotifications(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    const richNotifications = [
      {
        title: '[TEST] Rich Notification with Image',
        body: 'This notification includes an image',
        imageUrl: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Test+Image',
        category: 'general'
      },
      {
        title: '[TEST] Notification with Action Buttons',
        body: 'This notification has action buttons',
        category: 'subscription_renewal',
        actionButtons: [
          { id: 'yes', title: 'Accept', action: 'accept' },
          { id: 'no', title: 'Decline', action: 'decline' }
        ]
      },
      {
        title: '[TEST] Silent Notification',
        body: 'This is a silent notification (no sound/vibration)',
        category: 'general',
        silent: true
      }
    ];

    const results = [];

    for (const notification of richNotifications) {
      try {
        notification.priority = 'normal';
        notification.data = {
          test: true,
          type: 'rich_notification',
          timestamp: new Date().toISOString()
        };

        const result = await pushNotificationService.sendNotificationToUser(userId, notification);
        results.push({
          type: notification.title.includes('Image') ? 'image' : 
                notification.title.includes('Action') ? 'action_buttons' : 'silent',
          success: result.success,
          notificationId: result.notificationId
        });

        // Longer delay for rich notifications
        await this.delay(2000);
      } catch (error) {
        results.push({
          type: 'error',
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Tested ${results.length} rich notifications for user ${userId}`);
    return { success: true, results };
  }

  // Test scheduled notifications
  async testScheduledNotifications(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    const scheduledTests = [
      {
        name: 'Immediate (1 minute delay)',
        delay: 1 * 60 * 1000, // 1 minute
        title: '[TEST] Scheduled Notification - 1 Minute',
        body: 'This notification was scheduled for 1 minute after creation'
      },
      {
        name: 'Short delay (5 minutes)',
        delay: 5 * 60 * 1000, // 5 minutes
        title: '[TEST] Scheduled Notification - 5 Minutes',
        body: 'This notification was scheduled for 5 minutes after creation'
      }
    ];

    const results = [];

    for (const test of scheduledTests) {
      try {
        const scheduledAt = new Date(Date.now() + test.delay);
        
        const notification = {
          title: test.title,
          body: test.body,
          category: 'general',
          priority: 'normal',
          data: {
            test: true,
            scheduledTest: true,
            originalScheduleTime: scheduledAt.toISOString(),
            timestamp: new Date().toISOString()
          }
        };

        // For testing, we'll use the notification integration service
        // to schedule a custom notification
        const template = await notificationTemplateService.getTemplate('general') || {
          title_template: test.title,
          body_template: test.body,
          category: 'general'
        };

        const result = await notificationIntegrationService.scheduleCustomNotification(
          'general',
          [userId],
          {},
          scheduledAt
        );

        results.push({
          testName: test.name,
          scheduledAt: scheduledAt.toISOString(),
          success: result.success,
          notificationId: result.notificationId
        });
      } catch (error) {
        results.push({
          testName: test.name,
          success: false,
          error: error.message
        });
      }
    }

    logger.info(`Scheduled ${results.length} test notifications for user ${userId}`);
    return { success: true, results };
  }

  // Get comprehensive test report
  async runComprehensiveTest(userId) {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    logger.info(`Starting comprehensive notification test for user ${userId}`);
    const startTime = new Date();
    const report = {
      userId,
      startTime: startTime.toISOString(),
      tests: {}
    };

    try {
      // Test basic templates
      logger.info('Testing notification templates...');
      report.tests.templates = await this.testAllTemplates(userId);
      await this.delay(2000);

      // Test categories
      logger.info('Testing notification categories...');
      report.tests.categories = await this.testNotificationCategories(userId);
      await this.delay(2000);

      // Test priorities
      logger.info('Testing notification priorities...');
      report.tests.priorities = await this.testNotificationPriorities(userId);
      await this.delay(2000);

      // Test deep linking
      logger.info('Testing deep linking...');
      report.tests.deepLinks = await this.testDeepLinking(userId);
      await this.delay(2000);

      // Test rich notifications
      logger.info('Testing rich notifications...');
      report.tests.richNotifications = await this.testRichNotifications(userId);
      await this.delay(2000);

      // Test scheduled notifications
      logger.info('Testing scheduled notifications...');
      report.tests.scheduledNotifications = await this.testScheduledNotifications(userId);

      const endTime = new Date();
      report.endTime = endTime.toISOString();
      report.duration = endTime - startTime;
      report.success = true;

      // Calculate summary
      report.summary = this.calculateTestSummary(report.tests);

      logger.info(`Comprehensive notification test completed for user ${userId} in ${report.duration}ms`);
      return report;
    } catch (error) {
      const endTime = new Date();
      report.endTime = endTime.toISOString();
      report.duration = endTime - startTime;
      report.success = false;
      report.error = error.message;

      logger.error(`Comprehensive notification test failed for user ${userId}:`, error);
      return report;
    }
  }

  // Calculate test summary
  calculateTestSummary(tests) {
    let totalTests = 0;
    let successfulTests = 0;
    let failedTests = 0;

    Object.values(tests).forEach(testResult => {
      if (testResult.results && Array.isArray(testResult.results)) {
        totalTests += testResult.results.length;
        successfulTests += testResult.results.filter(r => r.success).length;
        failedTests += testResult.results.filter(r => !r.success).length;
      }
    });

    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate: totalTests > 0 ? ((successfulTests / totalTests) * 100).toFixed(2) + '%' : '0%'
    };
  }

  // Clean up test notifications
  async cleanupTestNotifications() {
    if (!this.isEnabled) {
      throw new Error('Notification testing only available in non-production environments');
    }

    try {
      // Delete test notifications (notifications with [TEST] in title)
      const deletedCount = await db('push_notifications')
        .where('title', 'like', '[TEST]%')
        .del();

      logger.info(`Cleaned up ${deletedCount} test notifications`);
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup test notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new NotificationTestingUtils();