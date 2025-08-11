/**
 * User Behavior Analytics Service
 * Advanced user journey tracking, segmentation, and behavioral insights
 */

const logger = require('../config/logger');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { startOfDay, endOfDay, subDays, format } = require('date-fns');

class UserBehaviorAnalyticsService {
  constructor() {
    this.initialized = false;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.activeSessions = new Map();
    
    // User segmentation criteria
    this.segmentationRules = {
      engagement_level: {
        highly_engaged: {
          criteria: { session_count: { min: 10 }, avg_session_duration: { min: 300 } },
          description: 'Users with high session frequency and duration'
        },
        moderately_engaged: {
          criteria: { session_count: { min: 3, max: 9 }, avg_session_duration: { min: 120 } },
          description: 'Users with moderate engagement patterns'
        },
        low_engaged: {
          criteria: { session_count: { max: 2 }, avg_session_duration: { max: 119 } },
          description: 'Users with minimal engagement'
        }
      },
      user_lifecycle: {
        new_user: {
          criteria: { days_since_registration: { max: 7 } },
          description: 'Users registered within the last 7 days'
        },
        active_user: {
          criteria: { days_since_last_session: { max: 7 }, session_count: { min: 3 } },
          description: 'Users who have been active in the last 7 days'
        },
        at_risk: {
          criteria: { days_since_last_session: { min: 7, max: 30 } },
          description: 'Users who haven\'t been active in 7-30 days'
        },
        churned: {
          criteria: { days_since_last_session: { min: 30 } },
          description: 'Users who haven\'t been active in over 30 days'
        }
      },
      feature_usage: {
        bio_power_user: {
          criteria: { bio_generations: { min: 5 } },
          description: 'Users who frequently generate bios'
        },
        photo_optimizer: {
          criteria: { photo_analyses: { min: 3 } },
          description: 'Users who frequently analyze photos'
        },
        subscription_candidate: {
          criteria: { feature_usage_diversity: { min: 3 }, subscription_status: 'free' },
          description: 'Free users with diverse feature usage'
        }
      }
    };

    // Journey analysis patterns
    this.journeyPatterns = {
      onboarding: [
        'user_registered',
        'profile_viewed',
        'profile_completed',
        'first_photo_uploaded',
        'bio_generated'
      ],
      engagement: [
        'bio_generated',
        'photo_analyzed',
        'linkedin_headshot_generated',
        'results_shared'
      ],
      conversion: [
        'subscription_viewed',
        'pricing_compared',
        'payment_initiated',
        'subscription_upgraded'
      ],
      retention: [
        'return_visit',
        'feature_reused',
        'content_shared',
        'feedback_provided'
      ]
    };

    this.init();
  }

  async init() {
    try {
      // Start session cleanup interval
      setInterval(() => {
        this.cleanupExpiredSessions();
      }, 60000); // Every minute

      this.initialized = true;
      logger.info('User Behavior Analytics Service initialized');
    } catch (error) {
      logger.error('Failed to initialize User Behavior Analytics Service:', error);
    }
  }

  /**
   * Track user behavior event
   */
  async trackBehaviorEvent(eventData) {
    try {
      const {
        user_id,
        session_id,
        event_name,
        event_category = 'user_action',
        properties = {},
        user_properties = {},
        platform,
        app_version,
        device_info = {},
        location = {},
        referrer = null,
        utm_data = {}
      } = eventData;

      // Get or create session
      const session = await this.getOrCreateSession(user_id, session_id, {
        platform,
        app_version,
        device_info,
        location
      });

      // Calculate sequence number
      const sequenceNumber = await this.getNextSequenceNumber(session.session_id);

      // Store behavior event
      const behaviorEvent = {
        id: uuidv4(),
        user_id,
        session_id: session.session_id,
        event_name,
        event_category,
        properties: JSON.stringify(properties),
        user_properties: JSON.stringify(user_properties),
        platform: platform || device_info.platform,
        app_version,
        device_type: device_info.type,
        os_version: device_info.os_version,
        country: location.country,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
        referrer,
        utm_source: utm_data.source,
        utm_medium: utm_data.medium,
        utm_campaign: utm_data.campaign,
        sequence_number: sequenceNumber,
        client_timestamp: properties.client_timestamp ? new Date(properties.client_timestamp) : null,
        server_timestamp: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('user_behavior_events').insert(behaviorEvent);

      // Update session
      await this.updateSessionActivity(session.session_id);

      // Update user properties if provided
      if (Object.keys(user_properties).length > 0) {
        await this.updateUserProperties(user_id, user_properties);
      }

      // Analyze journey progression
      await this.analyzeJourneyProgression(user_id, event_name, properties);

      logger.debug('User behavior event tracked:', {
        user_id,
        event_name,
        session_id: session.session_id,
        sequence_number: sequenceNumber
      });

      return {
        success: true,
        event_id: behaviorEvent.id,
        session_id: session.session_id,
        sequence_number: sequenceNumber
      };

    } catch (error) {
      logger.error('Failed to track behavior event:', error);
      throw error;
    }
  }

  /**
   * Get or create user session
   */
  async getOrCreateSession(userId, sessionId, sessionData = {}) {
    try {
      // Check if session exists
      let session = await db('user_sessions').where('session_id', sessionId).first();

      if (!session) {
        // Create new session
        session = {
          id: uuidv4(),
          user_id: userId,
          session_id: sessionId,
          session_start: new Date(),
          session_end: null,
          duration_seconds: null,
          event_count: 0,
          platform: sessionData.platform,
          app_version: sessionData.app_version,
          device_id: sessionData.device_info?.device_id,
          device_info: JSON.stringify(sessionData.device_info || {}),
          country: sessionData.location?.country,
          city: sessionData.location?.city,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };

        await db('user_sessions').insert(session);
        
        // Track session in memory
        this.activeSessions.set(sessionId, {
          ...session,
          last_activity: Date.now()
        });

        logger.debug('New user session created:', { userId, sessionId });
      } else {
        // Update memory tracking
        this.activeSessions.set(sessionId, {
          ...session,
          last_activity: Date.now()
        });
      }

      return session;
    } catch (error) {
      logger.error('Failed to get or create session:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    try {
      await db('user_sessions')
        .where('session_id', sessionId)
        .increment('event_count', 1)
        .update('updated_at', new Date());

      // Update in-memory session
      const memorySession = this.activeSessions.get(sessionId);
      if (memorySession) {
        memorySession.last_activity = Date.now();
        memorySession.event_count = (memorySession.event_count || 0) + 1;
      }

    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * End user session
   */
  async endSession(sessionId) {
    try {
      const session = await db('user_sessions').where('session_id', sessionId).first();
      if (!session) return;

      const sessionEnd = new Date();
      const durationSeconds = Math.floor((sessionEnd - new Date(session.session_start)) / 1000);

      await db('user_sessions')
        .where('session_id', sessionId)
        .update({
          session_end: sessionEnd,
          duration_seconds: durationSeconds,
          is_active: false,
          updated_at: sessionEnd
        });

      // Remove from memory
      this.activeSessions.delete(sessionId);

      logger.debug('User session ended:', { sessionId, duration: durationSeconds });

      return {
        success: true,
        session_id: sessionId,
        duration_seconds: durationSeconds
      };

    } catch (error) {
      logger.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Analyze user journey progression
   */
  async analyzeJourneyProgression(userId, eventName, properties) {
    try {
      // Check which journey patterns this event belongs to
      const relevantJourneys = Object.entries(this.journeyPatterns)
        .filter(([_, pattern]) => pattern.includes(eventName));

      for (const [journeyType, pattern] of relevantJourneys) {
        const currentStep = pattern.indexOf(eventName);
        const totalSteps = pattern.length;
        const progress = ((currentStep + 1) / totalSteps) * 100;

        // Store journey progress
        await this.updateJourneyProgress(userId, journeyType, currentStep, progress, {
          event_name: eventName,
          properties
        });

        // Check if journey is completed
        if (currentStep === totalSteps - 1) {
          await this.markJourneyCompleted(userId, journeyType);
        }
      }
    } catch (error) {
      logger.error('Failed to analyze journey progression:', error);
    }
  }

  /**
   * Update user journey progress
   */
  async updateJourneyProgress(userId, journeyType, currentStep, progress, eventData) {
    try {
      const existingProgress = await db('user_journey_progress')
        .where({ user_id: userId, journey_type: journeyType })
        .first();

      if (existingProgress) {
        // Update existing progress if this step is further than current
        if (currentStep > existingProgress.current_step) {
          await db('user_journey_progress')
            .where({ user_id: userId, journey_type: journeyType })
            .update({
              current_step: currentStep,
              progress_percentage: progress,
              last_event_data: JSON.stringify(eventData),
              updated_at: new Date()
            });
        }
      } else {
        // Create new journey progress
        await db('user_journey_progress').insert({
          id: uuidv4(),
          user_id: userId,
          journey_type: journeyType,
          current_step: currentStep,
          progress_percentage: progress,
          last_event_data: JSON.stringify(eventData),
          completed: false,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    } catch (error) {
      // Handle case where table doesn't exist yet
      logger.debug('Journey progress tracking skipped - table may not exist yet');
    }
  }

  /**
   * Mark journey as completed
   */
  async markJourneyCompleted(userId, journeyType) {
    try {
      await db('user_journey_progress')
        .where({ user_id: userId, journey_type: journeyType })
        .update({
          completed: true,
          completed_at: new Date(),
          updated_at: new Date()
        });

      logger.info('User journey completed:', { userId, journeyType });
    } catch (error) {
      logger.debug('Journey completion tracking skipped - table may not exist yet');
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(userId, timeframe = '30d') {
    try {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const startDate = subDays(new Date(), days);

      const [
        behaviorSummary,
        eventHistory,
        sessionAnalytics,
        journeyProgress,
        segmentClassification,
        engagementMetrics
      ] = await Promise.all([
        this.getUserBehaviorSummary(userId, startDate),
        this.getUserEventHistory(userId, startDate),
        this.getUserSessionAnalytics(userId, startDate),
        this.getUserJourneyProgress(userId),
        this.classifyUserSegments(userId),
        this.getUserEngagementMetrics(userId, startDate)
      ]);

      return {
        user_id: userId,
        timeframe,
        analysis_period: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        },
        behavior_summary: behaviorSummary,
        event_history: eventHistory,
        session_analytics: sessionAnalytics,
        journey_progress: journeyProgress,
        segments: segmentClassification,
        engagement_metrics: engagementMetrics,
        insights: this.generateUserInsights(behaviorSummary, segmentClassification, journeyProgress)
      };

    } catch (error) {
      logger.error('Failed to get user behavior analytics:', error);
      throw error;
    }
  }

  /**
   * Get user behavior summary
   */
  async getUserBehaviorSummary(userId, startDate) {
    try {
      const [
        eventStats,
        sessionStats,
        featureUsage,
        timeDistribution
      ] = await Promise.all([
        // Event statistics
        db('user_behavior_events')
          .where('user_id', userId)
          .where('server_timestamp', '>', startDate)
          .select(
            db.raw('COUNT(*) as total_events'),
            db.raw('COUNT(DISTINCT event_name) as unique_events'),
            db.raw('COUNT(DISTINCT session_id) as sessions')
          )
          .first(),

        // Session statistics
        db('user_sessions')
          .where('user_id', userId)
          .where('session_start', '>', startDate)
          .select(
            db.raw('AVG(duration_seconds) as avg_session_duration'),
            db.raw('SUM(duration_seconds) as total_time_spent'),
            db.raw('AVG(event_count) as avg_events_per_session')
          )
          .first(),

        // Feature usage
        db('user_behavior_events')
          .where('user_id', userId)
          .where('server_timestamp', '>', startDate)
          .groupBy('event_category')
          .select('event_category')
          .count('* as count'),

        // Time distribution
        db('user_behavior_events')
          .where('user_id', userId)
          .where('server_timestamp', '>', startDate)
          .select(db.raw("EXTRACT(hour from server_timestamp) as hour"))
          .count('* as events')
          .groupBy(db.raw("EXTRACT(hour from server_timestamp)"))
          .orderBy('hour')
      ]);

      return {
        total_events: parseInt(eventStats.total_events || 0),
        unique_events: parseInt(eventStats.unique_events || 0),
        session_count: parseInt(eventStats.sessions || 0),
        avg_session_duration: parseFloat(sessionStats.avg_session_duration || 0),
        total_time_spent: parseInt(sessionStats.total_time_spent || 0),
        avg_events_per_session: parseFloat(sessionStats.avg_events_per_session || 0),
        feature_usage: featureUsage,
        time_distribution: timeDistribution
      };

    } catch (error) {
      logger.error('Failed to get user behavior summary:', error);
      return {};
    }
  }

  /**
   * Segment users based on behavior patterns
   */
  async segmentUsers(criteria = {}) {
    try {
      const {
        min_sessions = 0,
        max_sessions = null,
        min_events = 0,
        max_events = null,
        engagement_level = null,
        lifecycle_stage = null,
        timeframe = '30d'
      } = criteria;

      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const startDate = subDays(new Date(), days);

      let query = db('users as u')
        .leftJoin('user_sessions as s', 'u.id', 's.user_id')
        .leftJoin('user_behavior_events as e', 'u.id', 'e.user_id')
        .where('s.session_start', '>', startDate)
        .where('e.server_timestamp', '>', startDate)
        .groupBy('u.id')
        .select(
          'u.id',
          'u.email',
          'u.created_at',
          db.raw('COUNT(DISTINCT s.session_id) as session_count'),
          db.raw('COUNT(e.id) as event_count'),
          db.raw('AVG(s.duration_seconds) as avg_session_duration')
        );

      // Apply filters
      if (min_sessions > 0) {
        query = query.having('session_count', '>=', min_sessions);
      }
      if (max_sessions) {
        query = query.having('session_count', '<=', max_sessions);
      }
      if (min_events > 0) {
        query = query.having('event_count', '>=', min_events);
      }
      if (max_events) {
        query = query.having('event_count', '<=', max_events);
      }

      const users = await query;

      // Classify users into segments
      const segmentedUsers = users.map(user => {
        const segments = this.classifyUserIntoSegments(user);
        return {
          ...user,
          segments,
          primary_segment: segments[0] || 'unclassified'
        };
      });

      // Group by segments
      const segmentGroups = segmentedUsers.reduce((groups, user) => {
        const segment = user.primary_segment;
        if (!groups[segment]) {
          groups[segment] = [];
        }
        groups[segment].push(user);
        return groups;
      }, {});

      return {
        total_users: users.length,
        segments: Object.entries(segmentGroups).map(([segment, users]) => ({
          name: segment,
          user_count: users.length,
          percentage: ((users.length / segmentedUsers.length) * 100).toFixed(2),
          users: users
        })),
        criteria_applied: criteria
      };

    } catch (error) {
      logger.error('Failed to segment users:', error);
      throw error;
    }
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(cohortType = 'registration_month', timeframe = '12m') {
    try {
      const months = { '6m': 6, '12m': 12, '24m': 24 }[timeframe] || 12;
      const startDate = subDays(new Date(), months * 30);

      // Get cohort data
      const cohorts = await db('user_cohorts')
        .where('cohort_type', cohortType)
        .where('cohort_date', '>', startDate)
        .groupBy('cohort_identifier', 'cohort_date')
        .select(
          'cohort_identifier',
          'cohort_date',
          db.raw('COUNT(*) as cohort_size')
        )
        .orderBy('cohort_date');

      // Calculate retention rates for each cohort
      const cohortAnalysis = await Promise.all(
        cohorts.map(async (cohort) => {
          const retentionRates = await this.calculateCohortRetention(
            cohort.cohort_identifier,
            cohort.cohort_date
          );

          return {
            ...cohort,
            retention_rates: retentionRates
          };
        })
      );

      return {
        cohort_type: cohortType,
        timeframe,
        analysis_period: {
          start: startDate.toISOString(),
          end: new Date().toISOString()
        },
        cohorts: cohortAnalysis,
        summary: this.summarizeCohortAnalysis(cohortAnalysis)
      };

    } catch (error) {
      logger.error('Failed to get cohort analysis:', error);
      throw error;
    }
  }

  /**
   * Get user flow analysis
   */
  async getUserFlowAnalysis(startEvent, targetEvent, timeframe = '30d') {
    try {
      const days = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const startDate = subDays(new Date(), days);

      // Get all paths from start event to target event
      const flows = await db('user_behavior_events as e1')
        .join('user_behavior_events as e2', function() {
          this.on('e1.user_id', 'e2.user_id')
              .on('e1.session_id', 'e2.session_id')
              .on('e2.sequence_number', '>', 'e1.sequence_number');
        })
        .where('e1.event_name', startEvent)
        .where('e2.event_name', targetEvent)
        .where('e1.server_timestamp', '>', startDate)
        .where('e2.server_timestamp', '>', startDate)
        .select(
          'e1.user_id',
          'e1.session_id',
          'e1.sequence_number as start_sequence',
          'e2.sequence_number as end_sequence',
          db.raw('e2.server_timestamp - e1.server_timestamp as time_to_conversion')
        );

      // Get intermediate events
      const intermediateEvents = await Promise.all(
        flows.map(async (flow) => {
          const events = await db('user_behavior_events')
            .where('user_id', flow.user_id)
            .where('session_id', flow.session_id)
            .where('sequence_number', '>', flow.start_sequence)
            .where('sequence_number', '<', flow.end_sequence)
            .orderBy('sequence_number')
            .select('event_name', 'sequence_number');

          return {
            ...flow,
            intermediate_events: events.map(e => e.event_name)
          };
        })
      );

      // Analyze common paths
      const pathFrequency = intermediateEvents.reduce((paths, flow) => {
        const path = flow.intermediate_events.join(' -> ');
        paths[path] = (paths[path] || 0) + 1;
        return paths;
      }, {});

      return {
        start_event: startEvent,
        target_event: targetEvent,
        timeframe,
        total_conversions: flows.length,
        average_time_to_conversion: flows.length > 0 ? 
          flows.reduce((sum, f) => sum + f.time_to_conversion, 0) / flows.length : 0,
        common_paths: Object.entries(pathFrequency)
          .map(([path, count]) => ({
            path,
            count,
            percentage: ((count / flows.length) * 100).toFixed(2)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };

    } catch (error) {
      logger.error('Failed to get user flow analysis:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  async getNextSequenceNumber(sessionId) {
    const result = await db('user_behavior_events')
      .where('session_id', sessionId)
      .max('sequence_number as max_sequence')
      .first();

    return (result.max_sequence || 0) + 1;
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.last_activity > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.endSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.debug(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  classifyUserIntoSegments(user) {
    const segments = [];

    // Engagement level classification
    if (user.session_count >= 10 && user.avg_session_duration >= 300) {
      segments.push('highly_engaged');
    } else if (user.session_count >= 3 && user.avg_session_duration >= 120) {
      segments.push('moderately_engaged');
    } else {
      segments.push('low_engaged');
    }

    // Lifecycle classification
    const daysSinceRegistration = Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
    if (daysSinceRegistration <= 7) {
      segments.push('new_user');
    } else if (user.session_count >= 3) {
      segments.push('active_user');
    } else {
      segments.push('at_risk');
    }

    return segments;
  }

  generateUserInsights(behaviorSummary, segments, journeyProgress) {
    const insights = [];

    if (behaviorSummary.avg_session_duration > 300) {
      insights.push('High engagement user - spends significant time in app');
    }

    if (segments.includes('new_user') && behaviorSummary.session_count > 5) {
      insights.push('Power user potential - high activity for new user');
    }

    if (journeyProgress.some(j => j.progress_percentage > 80)) {
      insights.push('Good onboarding completion - likely to convert');
    }

    return insights;
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      active_sessions: this.activeSessions.size,
      segmentation_rules: Object.keys(this.segmentationRules).length,
      journey_patterns: Object.keys(this.journeyPatterns).length,
      session_timeout: this.sessionTimeout
    };
  }
}

module.exports = new UserBehaviorAnalyticsService();