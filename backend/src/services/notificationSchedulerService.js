const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');
const pushNotificationService = require('./pushNotificationService');
const notificationTemplateService = require('./notificationTemplateService');

class NotificationSchedulerService {
  constructor() {
    this.scheduledJobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the scheduler
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up recurring notification jobs
      this.setupRecurringJobs();
      
      // Resume any pending scheduled notifications
      await this.resumeScheduledNotifications();
      
      this.isInitialized = true;
      logger.info('Notification scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize notification scheduler:', error);
      throw error;
    }
  }

  // Set up recurring notification jobs
  setupRecurringJobs() {
    // Daily jobs at 9 AM UTC
    cron.schedule('0 9 * * *', async () => {
      logger.info('Running daily notification jobs');
      await this.sendDailyTips();
      await this.checkSubscriptionRenewals();
      await this.sendWeeklyInsights();
      await this.sendReEngagementNotifications();
    });

    // Weekly jobs on Monday at 10 AM UTC
    cron.schedule('0 10 * * 1', async () => {
      logger.info('Running weekly notification jobs');
      await this.sendWeeklyPerformanceReports();
    });

    // Cleanup job daily at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      logger.info('Running notification cleanup job');
      await this.cleanupExpiredNotifications();
      await pushNotificationService.cleanupExpiredTokens();
    });

    // Analytics aggregation job daily at 3 AM UTC
    cron.schedule('0 3 * * *', async () => {
      logger.info('Running analytics aggregation job');
      await this.aggregateDailyAnalytics();
    });

    logger.info('Recurring notification jobs scheduled');
  }

  // Resume scheduled notifications after server restart
  async resumeScheduledNotifications() {
    try {
      const pendingNotifications = await db('push_notifications')
        .where('status', 'scheduled')
        .where('scheduled_at', '>', new Date())
        .orderBy('scheduled_at', 'asc');

      for (const notification of pendingNotifications) {
        await this.scheduleNotification(notification);
      }

      logger.info(`Resumed ${pendingNotifications.length} scheduled notifications`);
    } catch (error) {
      logger.error('Failed to resume scheduled notifications:', error);
    }
  }

  // Schedule a one-time notification
  async scheduleNotification(notification) {
    try {
      const scheduledTime = new Date(notification.scheduled_at);
      const now = new Date();
      
      if (scheduledTime <= now) {
        // If scheduled time has passed, send immediately
        await this.executeScheduledNotification(notification.id);
        return;
      }

      const delay = scheduledTime.getTime() - now.getTime();
      
      const timeoutId = setTimeout(async () => {
        try {
          await this.executeScheduledNotification(notification.id);
          this.scheduledJobs.delete(notification.id);
        } catch (error) {
          logger.error(`Failed to execute scheduled notification ${notification.id}:`, error);
        }
      }, delay);

      this.scheduledJobs.set(notification.id, {
        timeoutId,
        scheduledTime,
        notificationId: notification.id
      });

      logger.info(`Notification ${notification.id} scheduled for ${scheduledTime.toISOString()}`);
    } catch (error) {
      logger.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  // Execute a scheduled notification
  async executeScheduledNotification(notificationId) {
    try {
      const notification = await db('push_notifications')
        .where({ id: notificationId })
        .first();

      if (!notification) {
        logger.warn(`Scheduled notification ${notificationId} not found`);
        return;
      }

      if (notification.status !== 'scheduled') {
        logger.warn(`Notification ${notificationId} is not in scheduled status`);
        return;
      }

      // Update status to sending
      await db('push_notifications')
        .where({ id: notificationId })
        .update({ 
          status: 'sending',
          sent_at: db.fn.now()
        });

      // Get recipients
      const recipients = await db('notification_recipients')
        .where({ notification_id: notificationId })
        .select('user_id');

      if (recipients.length === 0) {
        logger.warn(`No recipients found for notification ${notificationId}`);
        await db('push_notifications')
          .where({ id: notificationId })
          .update({ status: 'sent' });
        return;
      }

      // Send to recipients
      const userIds = recipients.map(r => r.user_id);
      await pushNotificationService.sendBulkNotification(userIds, notification);

      // Update status to sent
      await db('push_notifications')
        .where({ id: notificationId })
        .update({ status: 'sent' });

      logger.info(`Scheduled notification ${notificationId} executed successfully`);
    } catch (error) {
      logger.error(`Failed to execute scheduled notification ${notificationId}:`, error);
      
      // Update status to failed
      await db('push_notifications')
        .where({ id: notificationId })
        .update({ status: 'failed' });
      
      throw error;
    }
  }

  // Cancel a scheduled notification
  async cancelScheduledNotification(notificationId) {
    try {
      const job = this.scheduledJobs.get(notificationId);
      if (job) {
        clearTimeout(job.timeoutId);
        this.scheduledJobs.delete(notificationId);
      }

      await db('push_notifications')
        .where({ id: notificationId, status: 'scheduled' })
        .update({ status: 'cancelled' });

      logger.info(`Scheduled notification ${notificationId} cancelled`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel scheduled notification:', error);
      throw error;
    }
  }

  // Send daily tips to users
  async sendDailyTips() {
    try {
      // Get users who have daily tips enabled and haven't received one today
      const users = await db('users')
        .join('notification_preferences', 'users.id', 'notification_preferences.user_id')
        .leftJoin('notification_recipients', function() {
          this.on('notification_recipients.user_id', 'users.id')
            .andOn('notification_recipients.created_at', '>=', db.raw('CURRENT_DATE'));
        })
        .join('push_notifications', function() {
          this.on('push_notifications.id', 'notification_recipients.notification_id')
            .andOn('push_notifications.category', '=', db.raw("'tips_educational'"));
        })
        .where('notification_preferences.tips_educational', true)
        .where('notification_preferences.enabled', true)
        .whereNull('notification_recipients.id') // Haven't received tip today
        .select('users.id', 'users.first_name')
        .distinct();

      if (users.length === 0) {
        logger.info('No users eligible for daily tips');
        return;
      }

      // Get random tip template
      const tipTemplates = await notificationTemplateService.getTemplatesByCategory('tips_educational');
      if (tipTemplates.length === 0) {
        logger.warn('No tip templates available');
        return;
      }

      const randomTemplate = tipTemplates[Math.floor(Math.random() * tipTemplates.length)];
      
      // Sample tips content
      const tips = [
        { title: 'Smile genuinely', content: 'A genuine smile in your photos increases matches by 14%' },
        { title: 'Show your interests', content: 'Include photos that showcase your hobbies and passions' },
        { title: 'Quality over quantity', content: 'Use 3-4 high-quality photos rather than many mediocre ones' },
        { title: 'Be authentic', content: 'Write about your real interests, not what you think others want to hear' },
        { title: 'Update regularly', content: 'Fresh photos and bio updates can boost your profile visibility' }
      ];

      const randomTip = tips[Math.floor(Math.random() * tips.length)];

      // Send to users in batches
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        for (const user of batch) {
          const variables = {
            firstName: user.first_name,
            tipTitle: randomTip.title,
            tipContent: randomTip.content,
            tipId: 'tip_' + Date.now()
          };

          const renderedNotification = notificationTemplateService.renderTemplate(randomTemplate, variables);
          
          await pushNotificationService.sendNotificationToUser(user.id, renderedNotification);
        }

        // Small delay between batches
        await this.delay(1000);
      }

      logger.info(`Daily tips sent to ${users.length} users`);
    } catch (error) {
      logger.error('Failed to send daily tips:', error);
    }
  }

  // Check subscription renewals and send reminders
  async checkSubscriptionRenewals() {
    try {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Users with subscriptions expiring in 3 days
      const expiringUsers = await db('users')
        .join('notification_preferences', 'users.id', 'notification_preferences.user_id')
        .where('users.subscription_status', 'premium')
        .where('users.subscription_expires_at', '<=', threeDaysFromNow)
        .where('users.subscription_expires_at', '>', new Date())
        .where('notification_preferences.subscription_renewal', true)
        .where('notification_preferences.enabled', true)
        .select('users.id', 'users.first_name', 'users.subscription_expires_at');

      for (const user of expiringUsers) {
        const expiresAt = new Date(user.subscription_expires_at);
        const daysLeft = Math.ceil((expiresAt - new Date()) / (24 * 60 * 60 * 1000));

        const template = await notificationTemplateService.getTemplate('subscription_expiring');
        const variables = {
          firstName: user.first_name,
          daysLeft: daysLeft.toString()
        };

        const renderedNotification = notificationTemplateService.renderTemplate(template, variables);
        await pushNotificationService.sendNotificationToUser(user.id, renderedNotification);
      }

      logger.info(`Subscription renewal reminders sent to ${expiringUsers.length} users`);
    } catch (error) {
      logger.error('Failed to check subscription renewals:', error);
    }
  }

  // Send weekly insights
  async sendWeeklyInsights() {
    try {
      // Only send on Sundays
      const now = new Date();
      if (now.getDay() !== 0) {
        return;
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get users who have weekly insights enabled
      const users = await db('users')
        .join('notification_preferences', 'users.id', 'notification_preferences.user_id')
        .where('notification_preferences.weekly_insights', true)
        .where('notification_preferences.enabled', true)
        .where('users.last_active', '>', weekAgo) // Active in the last week
        .select('users.id', 'users.first_name');

      for (const user of users) {
        // Calculate weekly stats (mock data for now)
        const newMatches = Math.floor(Math.random() * 10) + 1;

        const template = await notificationTemplateService.getTemplate('weekly_insights');
        const variables = {
          firstName: user.first_name,
          newMatches: newMatches.toString()
        };

        const renderedNotification = notificationTemplateService.renderTemplate(template, variables);
        await pushNotificationService.sendNotificationToUser(user.id, renderedNotification);
      }

      logger.info(`Weekly insights sent to ${users.length} users`);
    } catch (error) {
      logger.error('Failed to send weekly insights:', error);
    }
  }

  // Send re-engagement notifications to inactive users
  async sendReEngagementNotifications() {
    try {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get inactive users
      const inactiveUsers = await db('users')
        .join('notification_preferences', 'users.id', 'notification_preferences.user_id')
        .where('users.last_active', '<', twoWeeksAgo)
        .where('users.last_active', '>', oneMonthAgo) // Not too old
        .where('notification_preferences.engagement_boost', true)
        .where('notification_preferences.enabled', true)
        .select('users.id', 'users.first_name');

      for (const user of inactiveUsers) {
        const template = await notificationTemplateService.getTemplate('comeback_offer');
        const variables = {
          firstName: user.first_name
        };

        const renderedNotification = notificationTemplateService.renderTemplate(template, variables);
        await pushNotificationService.sendNotificationToUser(user.id, renderedNotification);
      }

      logger.info(`Re-engagement notifications sent to ${inactiveUsers.length} users`);
    } catch (error) {
      logger.error('Failed to send re-engagement notifications:', error);
    }
  }

  // Send weekly performance reports
  async sendWeeklyPerformanceReports() {
    try {
      const users = await db('users')
        .join('notification_preferences', 'users.id', 'notification_preferences.user_id')
        .where('notification_preferences.profile_performance', true)
        .where('notification_preferences.enabled', true)
        .where('users.subscription_status', 'premium') // Only for premium users
        .select('users.id', 'users.first_name');

      for (const user of users) {
        // Calculate performance improvement (mock data)
        const viewIncrease = Math.floor(Math.random() * 50) + 10;

        const template = await notificationTemplateService.getTemplate('profile_performance');
        const variables = {
          firstName: user.first_name,
          viewIncrease: viewIncrease.toString()
        };

        const renderedNotification = notificationTemplateService.renderTemplate(template, variables);
        await pushNotificationService.sendNotificationToUser(user.id, renderedNotification);
      }

      logger.info(`Weekly performance reports sent to ${users.length} users`);
    } catch (error) {
      logger.error('Failed to send weekly performance reports:', error);
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete old notification records
      const deletedNotifications = await db('push_notifications')
        .where('created_at', '<', thirtyDaysAgo)
        .whereIn('status', ['sent', 'failed', 'cancelled'])
        .del();

      // Delete old analytics records (keep 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deletedAnalytics = await db('notification_analytics')
        .where('date', '<', ninetyDaysAgo)
        .del();

      logger.info(`Cleanup completed: ${deletedNotifications} notifications, ${deletedAnalytics} analytics records deleted`);
    } catch (error) {
      logger.error('Failed to cleanup expired notifications:', error);
    }
  }

  // Aggregate daily analytics
  async aggregateDailyAnalytics() {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Get all notifications that had activity yesterday
      const notifications = await db('notification_recipients')
        .join('push_notifications', 'notification_recipients.notification_id', 'push_notifications.id')
        .whereRaw('DATE(notification_recipients.created_at) = ?', [yesterdayStr])
        .select('push_notifications.id as notification_id')
        .groupBy('push_notifications.id');

      for (const { notification_id } of notifications) {
        // Calculate daily metrics
        const metrics = await db('notification_recipients')
          .where('notification_id', notification_id)
          .whereRaw('DATE(created_at) = ?', [yesterdayStr])
          .select(
            db.raw('COUNT(*) as sent_count'),
            db.raw('COUNT(CASE WHEN delivery_status = \'delivered\' THEN 1 END) as delivered_count'),
            db.raw('COUNT(CASE WHEN delivery_status = \'clicked\' THEN 1 END) as opened_count'),
            db.raw('COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked_count')
          )
          .first();

        const sentCount = parseInt(metrics.sent_count) || 0;
        const deliveredCount = parseInt(metrics.delivered_count) || 0;
        const openedCount = parseInt(metrics.opened_count) || 0;
        const clickedCount = parseInt(metrics.clicked_count) || 0;

        // Calculate rates
        const openRate = deliveredCount > 0 ? (openedCount / deliveredCount * 100) : 0;
        const clickRate = openedCount > 0 ? (clickedCount / openedCount * 100) : 0;

        // Insert or update analytics
        await db('notification_analytics')
          .insert({
            notification_id,
            date: yesterdayStr,
            sent_count: sentCount,
            delivered_count: deliveredCount,
            opened_count: openedCount,
            clicked_count: clickedCount,
            open_rate: openRate,
            click_rate: clickRate
          })
          .onConflict(['notification_id', 'date'])
          .merge();
      }

      logger.info(`Daily analytics aggregated for ${notifications.length} notifications`);
    } catch (error) {
      logger.error('Failed to aggregate daily analytics:', error);
    }
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get scheduler status
  getStatus() {
    return {
      initialized: this.isInitialized,
      scheduledJobs: this.scheduledJobs.size,
      jobs: Array.from(this.scheduledJobs.values()).map(job => ({
        notificationId: job.notificationId,
        scheduledTime: job.scheduledTime
      }))
    };
  }

  // Schedule a custom notification
  async scheduleCustomNotification(templateName, userIds, variables, scheduledAt, options = {}) {
    try {
      const template = await notificationTemplateService.getTemplate(templateName);
      const renderedNotification = notificationTemplateService.renderTemplate(template, variables);

      // Create notification record
      const [notification] = await db('push_notifications')
        .insert({
          ...renderedNotification,
          status: 'scheduled',
          scheduled_at: scheduledAt,
          created_by: options.createdBy
        })
        .returning('*');

      // Create recipient records
      const recipients = userIds.map(userId => ({
        notification_id: notification.id,
        user_id: userId,
        delivery_status: 'pending'
      }));

      await db('notification_recipients').insert(recipients);

      // Schedule the notification
      await this.scheduleNotification(notification);

      logger.info(`Custom notification scheduled for ${userIds.length} users at ${scheduledAt}`);
      return { 
        success: true, 
        notificationId: notification.id,
        scheduledAt,
        userCount: userIds.length
      };
    } catch (error) {
      logger.error('Failed to schedule custom notification:', error);
      throw error;
    }
  }

  // Shutdown scheduler gracefully
  shutdown() {
    try {
      // Clear all scheduled timeouts
      for (const [notificationId, job] of this.scheduledJobs) {
        clearTimeout(job.timeoutId);
      }
      
      this.scheduledJobs.clear();
      this.isInitialized = false;
      
      logger.info('Notification scheduler shutdown completed');
    } catch (error) {
      logger.error('Error during scheduler shutdown:', error);
    }
  }
}

module.exports = new NotificationSchedulerService();