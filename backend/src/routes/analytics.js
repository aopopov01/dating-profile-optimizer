const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');
const { analytics, ANALYTICS_EVENTS } = require('../config/analytics');

/**
 * Track analytics event
 * POST /api/analytics/track
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { event, properties = {} } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event name is required',
        code: 'MISSING_EVENT'
      });
    }

    // Add user context to properties
    const enrichedProperties = {
      ...properties,
      user_id: userId,
      user_plan: req.user.subscription_plan || 'free',
      timestamp: new Date().toISOString(),
      user_agent: req.get('User-Agent'),
      ip_address: req.ip
    };

    // Track the event
    analytics.trackEvent(userId, event, enrichedProperties);

    logger.info('Analytics event tracked', {
      userId,
      event,
      properties: enrichedProperties
    });

    res.json({
      success: true,
      message: 'Event tracked successfully',
      event,
      timestamp: enrichedProperties.timestamp
    });

  } catch (error) {
    logger.error('Analytics tracking failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to track event',
      code: 'TRACKING_ERROR'
    });
  }
});

/**
 * Track multiple events in batch
 * POST /api/analytics/batch
 */
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required',
        code: 'MISSING_EVENTS'
      });
    }

    if (events.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 events per batch',
        code: 'BATCH_TOO_LARGE'
      });
    }

    const processedEvents = [];

    for (const eventData of events) {
      if (!eventData.event) {
        continue; // Skip events without names
      }

      const enrichedProperties = {
        ...eventData.properties,
        user_id: userId,
        user_plan: req.user.subscription_plan || 'free',
        timestamp: eventData.timestamp || new Date().toISOString(),
        user_agent: req.get('User-Agent'),
        ip_address: req.ip
      };

      analytics.trackEvent(userId, eventData.event, enrichedProperties);
      processedEvents.push({
        event: eventData.event,
        timestamp: enrichedProperties.timestamp
      });
    }

    logger.info('Batch analytics events tracked', {
      userId,
      eventCount: processedEvents.length,
      events: processedEvents
    });

    res.json({
      success: true,
      message: `${processedEvents.length} events tracked successfully`,
      events: processedEvents
    });

  } catch (error) {
    logger.error('Batch analytics tracking failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to track batch events',
      code: 'BATCH_TRACKING_ERROR'
    });
  }
});

/**
 * Update user properties
 * POST /api/analytics/identify
 */
router.post('/identify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { properties = {} } = req.body;

    const userProperties = {
      ...properties,
      email: req.user.email,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      subscription_plan: req.user.subscription_plan || 'free',
      created_at: req.user.created_at,
      last_login: new Date().toISOString()
    };

    analytics.identifyUser(userId, userProperties);

    logger.info('User identified for analytics', {
      userId,
      properties: Object.keys(userProperties)
    });

    res.json({
      success: true,
      message: 'User identified successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('User identification failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to identify user',
      code: 'IDENTIFICATION_ERROR'
    });
  }
});

/**
 * Get analytics report (admin only or user's own data)
 * GET /api/analytics/report
 */
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), 
      end_date = new Date().toISOString(),
      user_filter = null
    } = req.query;

    // Only allow users to see their own data unless they're admin
    const filterUserId = req.user.role === 'admin' ? user_filter : userId;

    const report = await analytics.generateReport(start_date, end_date, filterUserId);

    res.json({
      success: true,
      report,
      period: {
        start: start_date,
        end: end_date
      },
      user_filter: filterUserId
    });

  } catch (error) {
    logger.error('Analytics report generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      code: 'REPORT_ERROR'
    });
  }
});

/**
 * Get analytics health status
 * GET /api/analytics/health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const healthStatus = analytics.getHealthStatus();

    res.json({
      success: true,
      analytics: healthStatus,
      recommendations: {
        mixpanel: !healthStatus.services.mixpanel.configured ? 
          'Set MIXPANEL_TOKEN environment variable for user behavior tracking' : 
          'Mixpanel configured and ready',
        google_analytics: !healthStatus.services.google_analytics.configured ? 
          'Set GOOGLE_ANALYTICS_ID for web analytics tracking' : 
          'Google Analytics configured',
        general: 'Both services offer generous free tiers for small to medium applications'
      }
    });

  } catch (error) {
    logger.error('Analytics health check failed', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

/**
 * Get available event types
 * GET /api/analytics/events
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const eventTypes = {
      user_lifecycle: [
        ANALYTICS_EVENTS.USER_REGISTERED,
        ANALYTICS_EVENTS.USER_LOGIN,
        ANALYTICS_EVENTS.USER_LOGOUT
      ],
      core_features: [
        ANALYTICS_EVENTS.PHOTO_UPLOADED,
        ANALYTICS_EVENTS.PHOTO_ANALYZED,
        ANALYTICS_EVENTS.BIO_GENERATED,
        ANALYTICS_EVENTS.BIO_COPIED,
        ANALYTICS_EVENTS.LINKEDIN_HEADSHOT_GENERATED,
        ANALYTICS_EVENTS.HEADSHOT_DOWNLOADED
      ],
      subscription: [
        ANALYTICS_EVENTS.SUBSCRIPTION_VIEWED,
        ANALYTICS_EVENTS.SUBSCRIPTION_UPGRADED,
        ANALYTICS_EVENTS.SUBSCRIPTION_CANCELLED
      ],
      engagement: [
        ANALYTICS_EVENTS.SCREEN_VIEWED,
        ANALYTICS_EVENTS.FEATURE_USED,
        ANALYTICS_EVENTS.ERROR_OCCURRED
      ],
      business: [
        ANALYTICS_EVENTS.REVENUE_GENERATED,
        ANALYTICS_EVENTS.SUPPORT_CONTACTED
      ]
    };

    res.json({
      success: true,
      event_types: eventTypes,
      total_events: Object.values(eventTypes).reduce((acc, arr) => acc + arr.length, 0),
      usage_examples: [
        {
          event: ANALYTICS_EVENTS.BIO_GENERATED,
          properties: {
            bio_length: 150,
            interests_count: 5,
            platform: 'tinder',
            generation_time_ms: 2500
          }
        },
        {
          event: ANALYTICS_EVENTS.PHOTO_ANALYZED,
          properties: {
            photo_count: 3,
            average_score: 85,
            analysis_time_ms: 3200,
            platform_optimized: ['tinder', 'bumble']
          }
        }
      ]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event types',
      code: 'EVENTS_ERROR'
    });
  }
});

module.exports = router;