const logger = require('./logger');

// Analytics configuration with free tier support
class AnalyticsService {
  constructor() {
    this.enabled = process.env.ENABLE_ANALYTICS === 'true';
    this.mixpanelToken = process.env.MIXPANEL_TOKEN;
    this.googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID;
    
    // Initialize analytics services
    this.initializeServices();
  }

  initializeServices() {
    // Mixpanel initialization (Free: 1k users/month, $25/month after)
    if (this.mixpanelToken && this.mixpanelToken !== 'your-mixpanel-token') {
      try {
        this.mixpanel = require('mixpanel').init(this.mixpanelToken, {
          protocol: 'https',
          keepAlive: false
        });
        logger.info('Mixpanel analytics initialized');
      } catch (error) {
        logger.warn('Failed to initialize Mixpanel', { error: error.message });
        this.mixpanel = null;
      }
    } else {
      logger.info('Mixpanel not configured - using mock analytics');
      this.mixpanel = null;
    }

    // Google Analytics 4 (Free: 10M events/month)
    if (this.googleAnalyticsId && this.googleAnalyticsId !== 'your-ga-id') {
      try {
        // Note: For server-side GA4, you'd typically use @google-analytics/data
        // For now, we'll set up the configuration
        this.ga4 = {
          measurementId: this.googleAnalyticsId,
          configured: true
        };
        logger.info('Google Analytics 4 configured');
      } catch (error) {
        logger.warn('Failed to configure Google Analytics', { error: error.message });
        this.ga4 = null;
      }
    } else {
      logger.info('Google Analytics not configured - using mock analytics');
      this.ga4 = null;
    }
  }

  // Track user events
  trackEvent(userId, eventName, properties = {}) {
    if (!this.enabled) {
      logger.debug('Analytics disabled - event not tracked', { eventName, userId });
      return;
    }

    const eventData = {
      timestamp: new Date().toISOString(),
      user_id: userId,
      event: eventName,
      properties: {
        ...properties,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Track with Mixpanel
    if (this.mixpanel) {
      try {
        this.mixpanel.track(eventName, {
          distinct_id: userId,
          ...properties
        });
      } catch (error) {
        logger.error('Mixpanel tracking error', { error: error.message, eventName });
      }
    }

    // Log event for development/debugging
    logger.info('Analytics event tracked', eventData);

    // Store in local analytics (fallback)
    this.storeLocalAnalytics(eventData);
  }

  // Track user properties
  identifyUser(userId, properties = {}) {
    if (!this.enabled) return;

    const userData = {
      user_id: userId,
      properties: {
        ...properties,
        last_seen: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Identify with Mixpanel
    if (this.mixpanel) {
      try {
        this.mixpanel.people.set(userId, userData.properties);
      } catch (error) {
        logger.error('Mixpanel identify error', { error: error.message, userId });
      }
    }

    logger.info('User identified', userData);
  }

  // Track revenue events (for subscription tracking)
  trackRevenue(userId, amount, currency = 'USD', properties = {}) {
    if (!this.enabled) return;

    const revenueData = {
      user_id: userId,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      ...properties
    };

    // Track revenue with Mixpanel
    if (this.mixpanel) {
      try {
        this.mixpanel.people.track_charge(userId, amount, {
          currency,
          ...properties
        });
      } catch (error) {
        logger.error('Mixpanel revenue tracking error', { error: error.message });
      }
    }

    logger.info('Revenue tracked', revenueData);
    this.storeLocalAnalytics({ event: 'revenue', ...revenueData });
  }

  // Store analytics locally as fallback/backup
  storeLocalAnalytics(eventData) {
    // In a real implementation, you might store this in database
    // For now, we'll just log structured data that could be parsed later
    const analyticsEntry = {
      timestamp: eventData.timestamp || new Date().toISOString(),
      type: 'analytics_event',
      ...eventData
    };

    logger.info('Local analytics stored', analyticsEntry);
  }

  // Generate analytics report (basic)
  async generateReport(startDate, endDate, userId = null) {
    // This would typically query your database for stored events
    // For demo purposes, returning mock data structure
    
    const mockReport = {
      period: {
        start: startDate,
        end: endDate
      },
      user_filter: userId,
      metrics: {
        total_events: Math.floor(Math.random() * 1000) + 500,
        unique_users: Math.floor(Math.random() * 100) + 50,
        popular_events: [
          { event: 'bio_generated', count: Math.floor(Math.random() * 200) + 100 },
          { event: 'photo_analyzed', count: Math.floor(Math.random() * 150) + 75 },
          { event: 'linkedin_headshot_generated', count: Math.floor(Math.random() * 50) + 25 },
          { event: 'subscription_upgraded', count: Math.floor(Math.random() * 20) + 5 }
        ],
        revenue: {
          total: (Math.random() * 5000).toFixed(2),
          currency: 'USD',
          transactions: Math.floor(Math.random() * 50) + 10
        }
      },
      user_engagement: {
        daily_active_users: Math.floor(Math.random() * 30) + 15,
        session_duration_avg: Math.floor(Math.random() * 600) + 300, // seconds
        retention_rate: (Math.random() * 0.3 + 0.6).toFixed(2) // 60-90%
      },
      features_usage: {
        photo_analysis: {
          usage_rate: (Math.random() * 0.4 + 0.6).toFixed(2),
          avg_photos_per_session: (Math.random() * 3 + 2).toFixed(1)
        },
        bio_generation: {
          usage_rate: (Math.random() * 0.3 + 0.5).toFixed(2),
          avg_variations_per_user: (Math.random() * 2 + 2).toFixed(1)
        },
        linkedin_headshot: {
          usage_rate: (Math.random() * 0.2 + 0.3).toFixed(2),
          conversion_rate: (Math.random() * 0.15 + 0.1).toFixed(2)
        }
      }
    };

    return mockReport;
  }

  // Health check for analytics services
  getHealthStatus() {
    return {
      enabled: this.enabled,
      services: {
        mixpanel: {
          configured: !!this.mixpanel,
          status: this.mixpanel ? 'active' : 'not_configured'
        },
        google_analytics: {
          configured: !!this.ga4,
          status: this.ga4 ? 'configured' : 'not_configured'
        }
      },
      free_tier_limits: {
        mixpanel: '1,000 users/month free',
        google_analytics: '10M events/month free'
      }
    };
  }
}

// Event constants for consistency
const ANALYTICS_EVENTS = {
  // User lifecycle
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // Core features
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_ANALYZED: 'photo_analyzed',
  BIO_GENERATED: 'bio_generated',
  BIO_COPIED: 'bio_copied',
  LINKEDIN_HEADSHOT_GENERATED: 'linkedin_headshot_generated',
  HEADSHOT_DOWNLOADED: 'headshot_downloaded',
  
  // Subscription
  SUBSCRIPTION_VIEWED: 'subscription_viewed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Engagement
  SCREEN_VIEWED: 'screen_viewed',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
  
  // Business metrics
  REVENUE_GENERATED: 'revenue_generated',
  SUPPORT_CONTACTED: 'support_contacted'
};

// Create singleton instance
const analytics = new AnalyticsService();

module.exports = {
  analytics,
  ANALYTICS_EVENTS,
  AnalyticsService
};