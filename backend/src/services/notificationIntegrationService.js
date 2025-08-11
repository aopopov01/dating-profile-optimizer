const pushNotificationService = require('./pushNotificationService');
const notificationTemplateService = require('./notificationTemplateService');
const notificationSchedulerService = require('./notificationSchedulerService');
const logger = require('../config/logger');

/**
 * High-level notification integration service that provides convenient methods
 * for sending notifications based on business events
 */
class NotificationIntegrationService {
  // Bio Generation Complete
  async notifyBioGenerationComplete(userId, bioData) {
    try {
      const template = await notificationTemplateService.getTemplate('bio_generation_complete');
      const variables = {
        bioId: bioData.id
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Bio completion notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send bio completion notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Photo Analysis Complete
  async notifyPhotoAnalysisComplete(userId, analysisData) {
    try {
      const template = await notificationTemplateService.getTemplate('photo_analysis_complete');
      const variables = {
        score: Math.round(analysisData.overall_score || analysisData.score || 0),
        analysisId: analysisData.id
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Photo analysis completion notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send photo analysis completion notification:', error);
      return { success: false, error: error.message };
    }
  }

  // LinkedIn Headshot Ready
  async notifyLinkedInHeadshotReady(userId, headshotData) {
    try {
      const template = await notificationTemplateService.getTemplate('headshot_ready');
      const variables = {
        headshotId: headshotData.id
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`LinkedIn headshot ready notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send LinkedIn headshot ready notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Welcome New User
  async notifyWelcomeNewUser(userId, userData) {
    try {
      const template = await notificationTemplateService.getTemplate('welcome_new_user');
      const variables = {
        firstName: userData.first_name || userData.firstName || 'there'
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      // Delay welcome notification by 1 minute to ensure user is set up
      await pushNotificationService.sendNotificationToUser(userId, notification, { delay: 60000 });
      
      logger.info(`Welcome notification queued for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send welcome notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Security Alert - New Login
  async notifySecurityLogin(userId, loginData) {
    try {
      const template = await notificationTemplateService.getTemplate('security_login');
      const variables = {
        location: loginData.location || loginData.city || 'Unknown location'
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      // Security notifications should be sent immediately
      await pushNotificationService.sendNotificationToUser(userId, notification, { immediate: true });
      
      logger.info(`Security login notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send security login notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Security Alert - Password Changed
  async notifyPasswordChanged(userId) {
    try {
      const template = await notificationTemplateService.getTemplate('password_changed');
      const variables = {};

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      // Security notifications should be sent immediately
      await pushNotificationService.sendNotificationToUser(userId, notification, { immediate: true });
      
      logger.info(`Password changed notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send password changed notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscription Expiring
  async notifySubscriptionExpiring(userId, subscriptionData) {
    try {
      const expiresAt = new Date(subscriptionData.expires_at || subscriptionData.subscription_expires_at);
      const now = new Date();
      const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

      if (daysLeft <= 0) {
        return { success: false, error: 'Subscription already expired' };
      }

      const template = await notificationTemplateService.getTemplate('subscription_expiring');
      const variables = {
        daysLeft: daysLeft.toString()
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Subscription expiring notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send subscription expiring notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Premium Offer
  async notifyPremiumOffer(userId, offerData) {
    try {
      const template = await notificationTemplateService.getTemplate('premium_offer');
      const variables = {
        discount: offerData.discount || '50',
        price: offerData.price || '9.99',
        offerId: offerData.id || 'special'
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Premium offer notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send premium offer notification:', error);
      return { success: false, error: error.message };
    }
  }

  // New Feature Announcement
  async notifyNewFeature(userIds, featureData) {
    try {
      const template = await notificationTemplateService.getTemplate('new_feature');
      const variables = {
        featureName: featureData.name,
        featureDescription: featureData.description,
        featureId: featureData.id
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      // Send as bulk notification
      await pushNotificationService.sendBulkNotification(userIds, notification);
      
      logger.info(`New feature notification sent to ${userIds.length} users`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send new feature notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Weekly Performance Report
  async notifyWeeklyPerformance(userId, performanceData) {
    try {
      const template = await notificationTemplateService.getTemplate('profile_performance');
      const variables = {
        viewIncrease: performanceData.viewIncrease || '25'
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Weekly performance notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send weekly performance notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule Future Notifications
  async scheduleOnboardingReminder(userId, userData, reminderDate) {
    try {
      const template = await notificationTemplateService.getTemplate('onboarding_incomplete');
      const variables = {
        firstName: userData.first_name || userData.firstName || 'there'
      };

      await notificationSchedulerService.scheduleCustomNotification(
        'onboarding_incomplete',
        [userId],
        variables,
        reminderDate
      );

      logger.info(`Onboarding reminder scheduled for user ${userId} at ${reminderDate}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to schedule onboarding reminder:', error);
      return { success: false, error: error.message };
    }
  }

  // Re-engagement Notification
  async notifyReEngagement(userId, userData, daysInactive) {
    try {
      const template = await notificationTemplateService.getTemplate('comeback_offer');
      const variables = {
        firstName: userData.first_name || userData.firstName || 'there',
        daysInactive: daysInactive.toString()
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Re-engagement notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send re-engagement notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk Operations
  async notifyBulkSecurityAlert(userIds, alertData) {
    try {
      // For security alerts, we need to send individual notifications
      // rather than bulk to ensure proper tracking
      const results = [];
      
      for (const userId of userIds) {
        try {
          const result = await this.notifySecurityLogin(userId, alertData);
          results.push({ userId, success: result.success });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successCount = results.filter(r => r.success).length;
      logger.info(`Security alert sent to ${successCount}/${userIds.length} users`);
      
      return { 
        success: true, 
        results,
        successCount,
        totalCount: userIds.length 
      };
    } catch (error) {
      logger.error('Failed to send bulk security alert:', error);
      return { success: false, error: error.message };
    }
  }

  // Analytics Integration
  async notifyWeeklyInsights(userId, insightsData) {
    try {
      const template = await notificationTemplateService.getTemplate('weekly_insights');
      const variables = {
        newMatches: insightsData.newMatches || '0',
        profileViews: insightsData.profileViews || '0',
        weekNumber: insightsData.weekNumber || new Date().getWeek()
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Weekly insights notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send weekly insights notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscription Management
  async notifyPaymentFailed(userId, paymentData) {
    try {
      // Check if we have a payment failed template
      let template;
      try {
        template = await notificationTemplateService.getTemplate('payment_failed');
      } catch (error) {
        // Fallback to subscription renewal template
        template = await notificationTemplateService.getTemplate('subscription_renewal');
      }

      const variables = {
        amount: paymentData.amount || '9.99',
        currency: paymentData.currency || 'USD',
        retryDate: paymentData.retryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

      const notification = notificationTemplateService.renderTemplate(template, variables);
      
      // Payment failed notifications should be sent with high priority
      notification.priority = 'high';
      
      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Payment failed notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send payment failed notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Campaign Notifications
  async sendCampaignNotification(campaignData) {
    try {
      const { 
        name, 
        templateName, 
        variables, 
        targetUsers, 
        scheduledAt,
        batchSize = 100 
      } = campaignData;

      if (scheduledAt && new Date(scheduledAt) > new Date()) {
        // Schedule the campaign
        const result = await notificationSchedulerService.scheduleCustomNotification(
          templateName,
          targetUsers,
          variables,
          scheduledAt,
          { createdBy: 'system', campaign: name }
        );

        logger.info(`Campaign '${name}' scheduled for ${targetUsers.length} users`);
        return result;
      } else {
        // Send immediately
        const template = await notificationTemplateService.getTemplate(templateName);
        const notification = notificationTemplateService.renderTemplate(template, variables);

        const result = await pushNotificationService.sendBulkNotification(
          targetUsers, 
          notification,
          { batchSize }
        );

        logger.info(`Campaign '${name}' sent to ${targetUsers.length} users`);
        return result;
      }
    } catch (error) {
      logger.error('Failed to send campaign notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Testing and Development
  async sendTestNotification(userId, message = 'Test notification from Dating Profile Optimizer') {
    if (process.env.NODE_ENV !== 'development') {
      return { success: false, error: 'Test notifications only available in development' };
    }

    try {
      const notification = {
        title: '🧪 Test Notification',
        body: message,
        category: 'general',
        priority: 'normal',
        data: { 
          test: true,
          timestamp: new Date().toISOString()
        }
      };

      await pushNotificationService.sendNotificationToUser(userId, notification);
      
      logger.info(`Test notification sent to user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Methods
  async getNotificationStats(startDate, endDate) {
    try {
      return await pushNotificationService.getNotificationStats(startDate, endDate);
    } catch (error) {
      logger.error('Failed to get notification stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserNotificationHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20, category, startDate, endDate } = options;
      
      // This would typically be implemented in the push notification service
      // For now, we'll return a placeholder
      return {
        success: true,
        message: 'Use the push-notifications/history endpoint for user notification history'
      };
    } catch (error) {
      logger.error('Failed to get user notification history:', error);
      return { success: false, error: error.message };
    }
  }
}

// Add week number to Date prototype for insights
Date.prototype.getWeek = function() {
  const onejan = new Date(this.getFullYear(), 0, 1);
  const today = new Date(this.getFullYear(), this.getMonth(), this.getDate());
  const dayOfYear = ((today - onejan + 86400000) / 86400000);
  return Math.ceil(dayOfYear / 7);
};

module.exports = new NotificationIntegrationService();