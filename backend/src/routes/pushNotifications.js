const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const pushNotificationService = require('../services/pushNotificationService');
const notificationTemplateService = require('../services/notificationTemplateService');
const notificationSchedulerService = require('../services/notificationSchedulerService');
const logger = require('../config/logger');

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: errors.array()
    });
  }
  next();
};

// Register device token
router.post('/register-token',
  authMiddleware,
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('platform').isIn(['ios', 'android', 'web']).withMessage('Invalid platform'),
    body('appVersion').optional().isString(),
    body('deviceId').optional().isString(),
    body('deviceModel').optional().isString(),
    body('osVersion').optional().isString()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { token, platform, appVersion, deviceId, deviceModel, osVersion } = req.body;
      const userId = req.user.id;

      const result = await pushNotificationService.registerDeviceToken(userId, {
        token,
        platform,
        appVersion,
        deviceId,
        deviceModel,
        osVersion
      });

      res.json({
        success: true,
        message: 'Device token registered successfully',
        data: result
      });
    } catch (error) {
      logger.error('Register token error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register device token',
        message: error.message
      });
    }
  }
);

// Unregister device token
router.post('/unregister-token',
  authMiddleware,
  [
    body('token').notEmpty().withMessage('Token is required')
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const result = await pushNotificationService.unregisterDeviceToken(userId, token);

      res.json({
        success: true,
        message: 'Device token unregistered successfully',
        data: result
      });
    } catch (error) {
      logger.error('Unregister token error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unregister device token',
        message: error.message
      });
    }
  }
);

// Get user's device tokens
router.get('/device-tokens',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const tokens = await pushNotificationService.getUserDeviceTokens(userId);

      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      logger.error('Get device tokens error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get device tokens',
        message: error.message
      });
    }
  }
);

// Send immediate notification to user
router.post('/send',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('body').notEmpty().withMessage('Body is required'),
    body('category').isIn([
      'onboarding_welcome', 'bio_completion', 'photo_analysis_ready',
      'subscription_renewal', 'subscription_offer', 'profile_performance',
      'weekly_insights', 'security_alert', 'feature_update',
      'engagement_boost', 'tips_educational', 'general'
    ]).withMessage('Invalid category'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'critical']),
    body('imageUrl').optional().isURL(),
    body('deepLinkUrl').optional().isString(),
    body('data').optional().isObject(),
    body('silent').optional().isBoolean(),
    body('badgeCount').optional().isInt(),
    body('sound').optional().isString()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const notificationData = req.body;
      const userId = req.user.id;

      const result = await pushNotificationService.sendNotificationToUser(userId, notificationData);

      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: error.message
      });
    }
  }
);

// Send bulk notification (admin only)
router.post('/send-bulk',
  authMiddleware,
  // Add admin check middleware here if you have one
  [
    body('userIds').isArray().notEmpty().withMessage('User IDs array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('body').notEmpty().withMessage('Body is required'),
    body('category').isIn([
      'onboarding_welcome', 'bio_completion', 'photo_analysis_ready',
      'subscription_renewal', 'subscription_offer', 'profile_performance',
      'weekly_insights', 'security_alert', 'feature_update',
      'engagement_boost', 'tips_educational', 'general'
    ]).withMessage('Invalid category'),
    body('batchSize').optional().isInt({ min: 1, max: 1000 })
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { userIds, batchSize, ...notificationData } = req.body;

      const result = await pushNotificationService.sendBulkNotification(
        userIds, 
        notificationData,
        { batchSize }
      );

      res.json({
        success: true,
        message: 'Bulk notification queued successfully',
        data: result
      });
    } catch (error) {
      logger.error('Send bulk notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send bulk notification',
        message: error.message
      });
    }
  }
);

// Send notification using template
router.post('/send-template',
  authMiddleware,
  [
    body('templateName').notEmpty().withMessage('Template name is required'),
    body('variables').optional().isObject(),
    body('userIds').optional().isArray(),
    body('scheduledAt').optional().isISO8601()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { templateName, variables = {}, userIds, scheduledAt } = req.body;
      const currentUserId = req.user.id;

      // If no userIds provided, send to current user
      const targetUserIds = userIds || [currentUserId];

      let result;
      if (scheduledAt) {
        // Schedule the notification
        result = await notificationSchedulerService.scheduleCustomNotification(
          templateName,
          targetUserIds,
          variables,
          scheduledAt,
          { createdBy: currentUserId }
        );
      } else {
        // Send immediately
        const template = await notificationTemplateService.getTemplate(templateName);
        const renderedNotification = notificationTemplateService.renderTemplate(template, variables);

        if (targetUserIds.length === 1) {
          result = await pushNotificationService.sendNotificationToUser(targetUserIds[0], renderedNotification);
        } else {
          result = await pushNotificationService.sendBulkNotification(targetUserIds, renderedNotification);
        }
      }

      res.json({
        success: true,
        message: scheduledAt ? 'Notification scheduled successfully' : 'Notification sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Send template notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send template notification',
        message: error.message
      });
    }
  }
);

// Track notification event (opened, clicked, etc.)
router.post('/track/:notificationId/:event',
  authMiddleware,
  [
    param('notificationId').isUUID().withMessage('Invalid notification ID'),
    param('event').isIn(['delivered', 'clicked', 'converted']).withMessage('Invalid event')
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { notificationId, event } = req.params;
      const userId = req.user.id;

      await pushNotificationService.trackNotificationEvent(notificationId, userId, event);

      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      logger.error('Track notification event error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track notification event',
        message: error.message
      });
    }
  }
);

// Get user's notification preferences
router.get('/preferences',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = await pushNotificationService.getNotificationPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Get notification preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification preferences',
        message: error.message
      });
    }
  }
);

// Update user's notification preferences
router.put('/preferences',
  authMiddleware,
  [
    body('enabled').optional().isBoolean(),
    body('quietHoursStart').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('quietHoursEnd').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    body('timezone').optional().isString(),
    body('frequency').optional().isIn(['immediate', 'daily', 'weekly', 'never']),
    body('maxDailyNotifications').optional().isInt({ min: 0, max: 50 }),
    // Category preferences
    body('onboardingWelcome').optional().isBoolean(),
    body('bioCompletion').optional().isBoolean(),
    body('photoAnalysisReady').optional().isBoolean(),
    body('subscriptionRenewal').optional().isBoolean(),
    body('subscriptionOffer').optional().isBoolean(),
    body('profilePerformance').optional().isBoolean(),
    body('weeklyInsights').optional().isBoolean(),
    body('securityAlert').optional().isBoolean(),
    body('featureUpdate').optional().isBoolean(),
    body('engagementBoost').optional().isBoolean(),
    body('tipsEducational').optional().isBoolean(),
    body('general').optional().isBoolean()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;

      // Convert camelCase to snake_case for database
      const dbPreferences = {};
      Object.keys(preferences).forEach(key => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        dbPreferences[snakeKey] = preferences[key];
      });

      const result = await pushNotificationService.updateNotificationPreferences(userId, dbPreferences);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Update notification preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
        message: error.message
      });
    }
  }
);

// Get notification history for user
router.get('/history',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, category, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      let query = db('notification_recipients')
        .join('push_notifications', 'notification_recipients.notification_id', 'push_notifications.id')
        .where('notification_recipients.user_id', userId)
        .select(
          'push_notifications.id',
          'push_notifications.title',
          'push_notifications.body',
          'push_notifications.category',
          'push_notifications.image_url',
          'notification_recipients.delivery_status',
          'notification_recipients.sent_at',
          'notification_recipients.clicked_at'
        )
        .orderBy('notification_recipients.sent_at', 'desc')
        .limit(limit)
        .offset(offset);

      if (category) {
        query = query.where('push_notifications.category', category);
      }

      if (startDate && endDate) {
        query = query.whereBetween('notification_recipients.sent_at', [startDate, endDate]);
      }

      const notifications = await query;

      // Get total count for pagination
      let countQuery = db('notification_recipients')
        .join('push_notifications', 'notification_recipients.notification_id', 'push_notifications.id')
        .where('notification_recipients.user_id', userId)
        .count('* as count');

      if (category) {
        countQuery = countQuery.where('push_notifications.category', category);
      }

      if (startDate && endDate) {
        countQuery = countQuery.whereBetween('notification_recipients.sent_at', [startDate, endDate]);
      }

      const [{ count }] = await countQuery;
      const totalCount = parseInt(count);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get notification history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification history',
        message: error.message
      });
    }
  }
);

// Get notification statistics (admin)
router.get('/stats',
  authMiddleware,
  // Add admin check middleware here
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('category').optional().isString()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { startDate, endDate, category } = req.query;
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const today = new Date();
      
      const start = startDate ? new Date(startDate) : thirtyDaysAgo;
      const end = endDate ? new Date(endDate) : today;

      const stats = await pushNotificationService.getNotificationStats(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      res.json({
        success: true,
        data: {
          ...stats,
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notification statistics',
        message: error.message
      });
    }
  }
);

// Get templates
router.get('/templates',
  authMiddleware,
  [
    query('category').optional().isString(),
    query('language').optional().isString()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { category, language = 'en' } = req.query;

      let templates;
      if (category) {
        templates = await notificationTemplateService.getTemplatesByCategory(category, language);
      } else {
        templates = await db('notification_templates')
          .where({ language, is_active: true })
          .orderBy('category')
          .orderBy('name');
      }

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Get templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates',
        message: error.message
      });
    }
  }
);

// Get scheduler status (admin)
router.get('/scheduler/status',
  authMiddleware,
  // Add admin check middleware here
  async (req, res) => {
    try {
      const status = notificationSchedulerService.getStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Get scheduler status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scheduler status',
        message: error.message
      });
    }
  }
);

// Test notification (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test',
    authMiddleware,
    [
      body('message').optional().isString()
    ],
    async (req, res) => {
      try {
        const userId = req.user.id;
        const message = req.body.message || 'Test notification from Dating Profile Optimizer';

        const testNotification = {
          title: '🧪 Test Notification',
          body: message,
          category: 'general',
          priority: 'normal',
          data: { test: true }
        };

        const result = await pushNotificationService.sendNotificationToUser(userId, testNotification);

        res.json({
          success: true,
          message: 'Test notification sent',
          data: result
        });
      } catch (error) {
        logger.error('Send test notification error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to send test notification',
          message: error.message
        });
      }
    }
  );
}

module.exports = router;