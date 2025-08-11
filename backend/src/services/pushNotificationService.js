const firebaseConfig = require('../config/firebase');
const db = require('../config/database');
const logger = require('../config/logger');
const Bull = require('bull');
const redis = require('ioredis');

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.notificationQueue = null;
    this.redis = new redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 1 // Use db 1 for notifications
    });
    this.initializeQueue();
  }

  initializeQueue() {
    try {
      this.notificationQueue = new Bull('push notifications', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.notificationQueue.process('send-notification', this.processNotification.bind(this));
      this.notificationQueue.process('send-bulk-notification', this.processBulkNotification.bind(this));

      logger.info('Push notification queue initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize push notification queue:', error);
      throw error;
    }
  }

  getMessaging() {
    if (!this.messaging) {
      this.messaging = firebaseConfig.getMessaging();
    }
    return this.messaging;
  }

  // Register a device token for a user
  async registerDeviceToken(userId, tokenData) {
    try {
      const { token, platform, appVersion, deviceId, deviceModel, osVersion } = tokenData;

      if (!firebaseConfig.isValidFCMToken(token)) {
        throw new Error('Invalid FCM token format');
      }

      // Deactivate existing tokens for this device if they exist
      await db('device_tokens')
        .where({ user_id: userId, device_id: deviceId })
        .update({ is_active: false, updated_at: db.fn.now() });

      // Insert or update the new token
      const existingToken = await db('device_tokens')
        .where({ user_id: userId, token })
        .first();

      if (existingToken) {
        await db('device_tokens')
          .where({ id: existingToken.id })
          .update({
            platform,
            app_version: appVersion,
            device_model: deviceModel,
            os_version: osVersion,
            is_active: true,
            last_used_at: db.fn.now(),
            updated_at: db.fn.now()
          });
      } else {
        await db('device_tokens').insert({
          user_id: userId,
          token,
          platform,
          app_version: appVersion,
          device_id: deviceId,
          device_model: deviceModel,
          os_version: osVersion,
          is_active: true,
          last_used_at: db.fn.now()
        });
      }

      logger.info(`Device token registered for user ${userId}`);
      return { success: true, message: 'Device token registered successfully' };
    } catch (error) {
      logger.error('Failed to register device token:', error);
      throw error;
    }
  }

  // Remove a device token
  async unregisterDeviceToken(userId, token) {
    try {
      await db('device_tokens')
        .where({ user_id: userId, token })
        .update({ is_active: false, updated_at: db.fn.now() });

      logger.info(`Device token unregistered for user ${userId}`);
      return { success: true, message: 'Device token unregistered successfully' };
    } catch (error) {
      logger.error('Failed to unregister device token:', error);
      throw error;
    }
  }

  // Get active device tokens for a user
  async getUserDeviceTokens(userId) {
    try {
      const tokens = await db('device_tokens')
        .where({ user_id: userId, is_active: true })
        .select('token', 'platform', 'device_id', 'last_used_at');

      return tokens;
    } catch (error) {
      logger.error('Failed to get user device tokens:', error);
      throw error;
    }
  }

  // Send immediate notification to a specific user
  async sendNotificationToUser(userId, notificationData, options = {}) {
    try {
      const { 
        title, 
        body, 
        category, 
        imageUrl, 
        deepLinkUrl, 
        data = {}, 
        priority = 'normal',
        silent = false,
        badgeCount,
        sound,
        actionButtons
      } = notificationData;

      // Check user's notification preferences
      const canSend = await this.checkUserNotificationPreferences(userId, category);
      if (!canSend) {
        logger.info(`Notification blocked by user preferences for user ${userId}, category ${category}`);
        return { success: false, reason: 'blocked_by_preferences' };
      }

      // Create notification record
      const [notification] = await db('push_notifications')
        .insert({
          title,
          body,
          data,
          image_url: imageUrl,
          deep_link_url: deepLinkUrl,
          category,
          priority,
          is_silent: silent,
          badge_count: badgeCount,
          sound,
          action_buttons: actionButtons,
          status: 'sending'
        })
        .returning('*');

      // Queue the notification for processing
      const job = await this.notificationQueue.add('send-notification', {
        notificationId: notification.id,
        userId,
        immediate: options.immediate || false
      }, {
        delay: options.delay || 0,
        priority: this.getPriorityValue(priority)
      });

      logger.info(`Notification queued for user ${userId}, job ID: ${job.id}`);
      return { 
        success: true, 
        notificationId: notification.id, 
        jobId: job.id 
      };
    } catch (error) {
      logger.error('Failed to send notification to user:', error);
      throw error;
    }
  }

  // Send bulk notification to multiple users
  async sendBulkNotification(userIds, notificationData, options = {}) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('userIds must be a non-empty array');
      }

      // Create notification record
      const [notification] = await db('push_notifications')
        .insert({
          ...notificationData,
          status: 'sending'
        })
        .returning('*');

      // Queue bulk notification job
      const job = await this.notificationQueue.add('send-bulk-notification', {
        notificationId: notification.id,
        userIds,
        batchSize: options.batchSize || 100
      }, {
        priority: this.getPriorityValue(notificationData.priority || 'normal')
      });

      logger.info(`Bulk notification queued for ${userIds.length} users, job ID: ${job.id}`);
      return { 
        success: true, 
        notificationId: notification.id, 
        jobId: job.id,
        userCount: userIds.length 
      };
    } catch (error) {
      logger.error('Failed to send bulk notification:', error);
      throw error;
    }
  }

  // Process individual notification job
  async processNotification(job) {
    const { notificationId, userId } = job.data;

    try {
      // Get notification details
      const notification = await db('push_notifications')
        .where({ id: notificationId })
        .first();

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // Get user's active device tokens
      const deviceTokens = await this.getUserDeviceTokens(userId);

      if (deviceTokens.length === 0) {
        logger.warn(`No active device tokens found for user ${userId}`);
        await this.recordNotificationRecipient(notificationId, userId, 'failed', null, 'No active device tokens');
        return;
      }

      // Send to each device token
      const results = await Promise.allSettled(
        deviceTokens.map(device => this.sendToDevice(notification, device, userId))
      );

      // Process results
      let successCount = 0;
      let errorMessages = [];

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          errorMessages.push(result.reason || result.value.error);
        }
      }

      // Record recipient status
      const status = successCount > 0 ? 'sent' : 'failed';
      const errorMessage = errorMessages.length > 0 ? errorMessages.join('; ') : null;

      await this.recordNotificationRecipient(notificationId, userId, status, null, errorMessage);

      logger.info(`Notification ${notificationId} processed for user ${userId}: ${successCount}/${deviceTokens.length} devices successful`);
    } catch (error) {
      logger.error(`Failed to process notification job ${job.id}:`, error);
      await this.recordNotificationRecipient(notificationId, userId, 'failed', null, error.message);
      throw error;
    }
  }

  // Process bulk notification job
  async processBulkNotification(job) {
    const { notificationId, userIds, batchSize } = job.data;

    try {
      // Get notification details
      const notification = await db('push_notifications')
        .where({ id: notificationId })
        .first();

      if (!notification) {
        throw new Error(`Notification ${notificationId} not found`);
      }

      // Process users in batches
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        // Create individual jobs for each user in the batch
        const batchJobs = batch.map(userId => ({
          name: 'send-notification',
          data: { notificationId, userId },
          opts: { delay: Math.floor(Math.random() * 1000) } // Small random delay to avoid thundering herd
        }));

        await this.notificationQueue.addBulk(batchJobs);
        
        // Small delay between batches
        await this.delay(100);
      }

      logger.info(`Bulk notification ${notificationId} processed: ${userIds.length} individual jobs created`);
    } catch (error) {
      logger.error(`Failed to process bulk notification job ${job.id}:`, error);
      throw error;
    }
  }

  // Send notification to a specific device
  async sendToDevice(notification, device, userId) {
    try {
      const messaging = this.getMessaging();

      // Build FCM message
      const message = this.buildFCMMessage(notification, device.token, device.platform);

      // Send message
      const response = await messaging.send(message);

      logger.info(`Notification sent to device ${device.device_id} for user ${userId}: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error(`Failed to send notification to device ${device.device_id}:`, error);
      
      // Handle invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await this.deactivateDeviceToken(device.token);
      }

      return { success: false, error: error.message };
    }
  }

  // Build FCM message based on platform
  buildFCMMessage(notification, token, platform) {
    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        notificationId: notification.id,
        category: notification.category,
        deepLinkUrl: notification.deep_link_url || '',
        ...notification.data
      }
    };

    // Add image if provided
    if (notification.image_url) {
      message.notification.image = notification.image_url;
    }

    // Platform-specific configurations
    if (platform === 'ios') {
      message.apns = {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            badge: notification.badge_count || 0,
            sound: notification.sound || 'default',
            'content-available': notification.is_silent ? 1 : 0
          }
        }
      };

      // Add action buttons for iOS
      if (notification.action_buttons && notification.action_buttons.length > 0) {
        message.apns.payload.aps.category = `${notification.category}_ACTIONS`;
      }
    } else if (platform === 'android') {
      message.android = {
        priority: this.getAndroidPriority(notification.priority),
        notification: {
          title: notification.title,
          body: notification.body,
          icon: 'ic_notification',
          color: '#FF6B6B',
          sound: notification.sound || 'default',
          channel_id: this.getNotificationChannel(notification.category)
        }
      };

      // Add action buttons for Android
      if (notification.action_buttons && notification.action_buttons.length > 0) {
        message.android.notification.click_action = 'NOTIFICATION_ACTION';
      }
    }

    return message;
  }

  // Check user notification preferences
  async checkUserNotificationPreferences(userId, category) {
    try {
      const preferences = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (!preferences) {
        // Create default preferences if they don't exist
        await this.createDefaultNotificationPreferences(userId);
        return true; // Allow notification with default settings
      }

      // Check if notifications are globally disabled
      if (!preferences.enabled) {
        return false;
      }

      // Check category-specific preference
      const categoryPreference = preferences[category.toLowerCase()];
      if (categoryPreference === false) {
        return false;
      }

      // Check quiet hours
      if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
        
        if (this.isInQuietHours(currentTime, preferences.quiet_hours_start, preferences.quiet_hours_end)) {
          // Allow critical notifications during quiet hours
          return category === 'security_alert';
        }
      }

      // Check daily notification limit
      if (preferences.max_daily_notifications) {
        const todayCount = await this.getTodayNotificationCount(userId);
        if (todayCount >= preferences.max_daily_notifications) {
          // Allow critical notifications even when limit is reached
          return category === 'security_alert';
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check user notification preferences:', error);
      return true; // Allow notification if preference check fails
    }
  }

  // Create default notification preferences for a user
  async createDefaultNotificationPreferences(userId) {
    try {
      await db('notification_preferences').insert({
        user_id: userId,
        enabled: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        timezone: 'UTC',
        frequency: 'immediate',
        max_daily_notifications: 5
      });

      logger.info(`Default notification preferences created for user ${userId}`);
    } catch (error) {
      logger.error('Failed to create default notification preferences:', error);
      throw error;
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const existingPrefs = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (existingPrefs) {
        await db('notification_preferences')
          .where({ user_id: userId })
          .update({
            ...preferences,
            updated_at: db.fn.now()
          });
      } else {
        await db('notification_preferences').insert({
          user_id: userId,
          ...preferences
        });
      }

      logger.info(`Notification preferences updated for user ${userId}`);
      return { success: true, message: 'Preferences updated successfully' };
    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  // Get user notification preferences
  async getNotificationPreferences(userId) {
    try {
      let preferences = await db('notification_preferences')
        .where({ user_id: userId })
        .first();

      if (!preferences) {
        await this.createDefaultNotificationPreferences(userId);
        preferences = await db('notification_preferences')
          .where({ user_id: userId })
          .first();
      }

      return preferences;
    } catch (error) {
      logger.error('Failed to get notification preferences:', error);
      throw error;
    }
  }

  // Record notification recipient status
  async recordNotificationRecipient(notificationId, userId, status, messageId = null, errorMessage = null) {
    try {
      const recipientData = {
        notification_id: notificationId,
        user_id: userId,
        delivery_status: status,
        fcm_message_id: messageId,
        error_message: errorMessage
      };

      if (status === 'sent') {
        recipientData.sent_at = db.fn.now();
      }

      await db('notification_recipients')
        .insert(recipientData)
        .onConflict(['notification_id', 'user_id'])
        .merge();

    } catch (error) {
      logger.error('Failed to record notification recipient:', error);
    }
  }

  // Track notification analytics
  async trackNotificationEvent(notificationId, userId, event) {
    try {
      // Update recipient status
      const updateData = {};
      updateData[`${event}_at`] = db.fn.now();
      updateData.delivery_status = event;

      await db('notification_recipients')
        .where({ notification_id: notificationId, user_id: userId })
        .update(updateData);

      // Update daily analytics
      await this.updateNotificationAnalytics(notificationId, event);

      logger.info(`Notification event tracked: ${event} for notification ${notificationId}, user ${userId}`);
    } catch (error) {
      logger.error('Failed to track notification event:', error);
      throw error;
    }
  }

  // Helper methods
  getPriorityValue(priority) {
    const priorityMap = {
      'critical': 1,
      'high': 2,
      'normal': 3,
      'low': 4
    };
    return priorityMap[priority] || 3;
  }

  getAndroidPriority(priority) {
    const priorityMap = {
      'critical': 'high',
      'high': 'high',
      'normal': 'normal',
      'low': 'normal'
    };
    return priorityMap[priority] || 'normal';
  }

  getNotificationChannel(category) {
    const channelMap = {
      'onboarding_welcome': 'onboarding',
      'bio_completion': 'results',
      'photo_analysis_ready': 'results',
      'subscription_renewal': 'billing',
      'subscription_offer': 'promotions',
      'profile_performance': 'insights',
      'weekly_insights': 'insights',
      'security_alert': 'security',
      'feature_update': 'general',
      'engagement_boost': 'engagement',
      'tips_educational': 'tips',
      'general': 'general'
    };
    return channelMap[category] || 'general';
  }

  isInQuietHours(currentTime, startTime, endTime) {
    // Handle case where quiet hours span midnight
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  async getTodayNotificationCount(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const count = await db('notification_recipients')
        .join('push_notifications', 'notification_recipients.notification_id', 'push_notifications.id')
        .where('notification_recipients.user_id', userId)
        .where('notification_recipients.delivery_status', 'sent')
        .whereRaw('DATE(notification_recipients.sent_at) = ?', [today])
        .count('* as count')
        .first();

      return parseInt(count.count) || 0;
    } catch (error) {
      logger.error('Failed to get today notification count:', error);
      return 0;
    }
  }

  async deactivateDeviceToken(token) {
    try {
      await db('device_tokens')
        .where({ token })
        .update({ is_active: false, updated_at: db.fn.now() });
    } catch (error) {
      logger.error('Failed to deactivate device token:', error);
    }
  }

  async updateNotificationAnalytics(notificationId, event) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const eventColumn = `${event}_count`;

      await db('notification_analytics')
        .insert({
          notification_id: notificationId,
          date: today,
          [eventColumn]: 1
        })
        .onConflict(['notification_id', 'date'])
        .merge({
          [eventColumn]: db.raw(`notification_analytics.${eventColumn} + 1`)
        });
    } catch (error) {
      logger.error('Failed to update notification analytics:', error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up expired device tokens
  async cleanupExpiredTokens() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedCount = await db('device_tokens')
        .where('last_used_at', '<', thirtyDaysAgo)
        .orWhere('is_active', false)
        .del();

      logger.info(`Cleaned up ${deletedCount} expired device tokens`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(startDate, endDate) {
    try {
      const stats = await db('notification_analytics')
        .whereBetween('date', [startDate, endDate])
        .select(
          db.raw('SUM(sent_count) as total_sent'),
          db.raw('SUM(delivered_count) as total_delivered'),
          db.raw('SUM(opened_count) as total_opened'),
          db.raw('SUM(clicked_count) as total_clicked'),
          db.raw('SUM(converted_count) as total_converted'),
          db.raw('AVG(open_rate) as avg_open_rate'),
          db.raw('AVG(click_rate) as avg_click_rate'),
          db.raw('AVG(conversion_rate) as avg_conversion_rate')
        )
        .first();

      return stats;
    } catch (error) {
      logger.error('Failed to get notification statistics:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();