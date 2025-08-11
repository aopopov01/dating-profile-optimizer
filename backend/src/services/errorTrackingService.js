/**
 * Comprehensive Error Tracking Service
 * Integrates with Sentry and provides local error logging and analysis
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('../config/logger');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ErrorTrackingService {
  constructor() {
    this.initialized = false;
    this.sentryEnabled = false;
    
    // Error classification
    this.errorTypes = {
      VALIDATION_ERROR: 'validation_error',
      AUTHENTICATION_ERROR: 'authentication_error',
      AUTHORIZATION_ERROR: 'authorization_error',
      DATABASE_ERROR: 'database_error',
      EXTERNAL_API_ERROR: 'external_api_error',
      PROCESSING_ERROR: 'processing_error',
      SYSTEM_ERROR: 'system_error',
      USER_ERROR: 'user_error',
      PERFORMANCE_ERROR: 'performance_error',
      SECURITY_ERROR: 'security_error'
    };

    // Error severity levels
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };

    // Error patterns for automatic classification
    this.errorPatterns = {
      database: [
        /connection.*refused/i,
        /timeout.*database/i,
        /duplicate.*key/i,
        /constraint.*violation/i,
        /invalid.*sql/i
      ],
      authentication: [
        /invalid.*token/i,
        /expired.*token/i,
        /unauthorized/i,
        /authentication.*failed/i
      ],
      validation: [
        /validation.*error/i,
        /invalid.*input/i,
        /required.*field/i,
        /schema.*validation/i
      ],
      external_api: [
        /api.*error/i,
        /http.*error/i,
        /request.*failed/i,
        /service.*unavailable/i
      ],
      security: [
        /security.*violation/i,
        /suspicious.*activity/i,
        /rate.*limit/i,
        /access.*denied/i
      ]
    };

    this.init();
  }

  async init() {
    try {
      // Initialize Sentry if configuration is available
      if (process.env.SENTRY_DSN && process.env.SENTRY_DSN !== 'your-sentry-dsn') {
        this.initializeSentry();
      }

      this.initialized = true;
      logger.info('Error Tracking Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Error Tracking Service:', error);
    }
  }

  initializeSentry() {
    try {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || '1.0.0',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: null }) // Will be set by app
        ],

        // Error filtering
        beforeSend(event, hint) {
          // Filter out low-severity errors in production
          if (process.env.NODE_ENV === 'production') {
            const error = hint.originalException;
            if (error && error.severity === 'low') {
              return null;
            }
          }
          return event;
        },

        // Custom tags
        initialScope: {
          tags: {
            component: 'dating-profile-optimizer-backend',
            service: 'analytics'
          }
        }
      });

      this.sentryEnabled = true;
      logger.info('Sentry error tracking initialized');
    } catch (error) {
      logger.warn('Failed to initialize Sentry:', error.message);
    }
  }

  /**
   * Track an error with comprehensive context
   */
  async trackError(error, context = {}) {
    try {
      const errorId = uuidv4();
      const timestamp = new Date();

      // Extract error information
      const errorInfo = this.extractErrorInfo(error);
      
      // Classify the error
      const classification = this.classifyError(error, context);
      
      // Enrich context
      const enrichedContext = {
        ...context,
        error_id: errorId,
        timestamp: timestamp.toISOString(),
        environment: process.env.NODE_ENV,
        app_version: process.env.APP_VERSION || '1.0.0',
        ...this.extractSystemContext()
      };

      // Store in database
      await this.storeErrorInDatabase({
        id: errorId,
        ...errorInfo,
        ...classification,
        context: enrichedContext,
        timestamp
      });

      // Send to Sentry
      if (this.sentryEnabled) {
        this.sendToSentry(error, enrichedContext, classification);
      }

      // Check for alert conditions
      await this.checkErrorAlerts(classification, errorInfo);

      // Log for immediate visibility
      logger.error('Error tracked', {
        errorId,
        type: classification.error_type,
        severity: classification.severity,
        message: errorInfo.message,
        context: enrichedContext
      });

      return {
        success: true,
        error_id: errorId,
        tracking_info: {
          type: classification.error_type,
          severity: classification.severity,
          sentry_enabled: this.sentryEnabled
        }
      };

    } catch (trackingError) {
      logger.error('Failed to track error:', trackingError);
      return {
        success: false,
        error: trackingError.message
      };
    }
  }

  /**
   * Extract error information from error object
   */
  extractErrorInfo(error) {
    const info = {
      message: error.message || 'Unknown error',
      stack_trace: error.stack || null,
      error_code: error.code || null,
      name: error.name || 'Error'
    };

    // Extract additional properties
    if (error.statusCode) info.status_code = error.statusCode;
    if (error.errno) info.errno = error.errno;
    if (error.sqlState) info.sql_state = error.sqlState;
    if (error.detail) info.detail = error.detail;

    return info;
  }

  /**
   * Classify error type and severity
   */
  classifyError(error, context = {}) {
    let errorType = this.errorTypes.SYSTEM_ERROR;
    let severity = this.severityLevels.MEDIUM;

    // Automatic classification based on patterns
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const searchText = `${message} ${stack}`;

    for (const [type, patterns] of Object.entries(this.errorPatterns)) {
      if (patterns.some(pattern => pattern.test(searchText))) {
        errorType = this.errorTypes[type.toUpperCase() + '_ERROR'] || errorType;
        break;
      }
    }

    // Context-based classification
    if (context.source) {
      if (context.source.includes('auth')) {
        errorType = this.errorTypes.AUTHENTICATION_ERROR;
      } else if (context.source.includes('payment')) {
        errorType = this.errorTypes.EXTERNAL_API_ERROR;
        severity = this.severityLevels.HIGH;
      } else if (context.source.includes('ai') || context.source.includes('openai')) {
        errorType = this.errorTypes.EXTERNAL_API_ERROR;
      }
    }

    // Severity classification
    if (error.name === 'ValidationError') {
      severity = this.severityLevels.LOW;
    } else if (error.statusCode >= 500) {
      severity = this.severityLevels.HIGH;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      severity = this.severityLevels.HIGH;
    } else if (context.user_id && errorType === this.errorTypes.SECURITY_ERROR) {
      severity = this.severityLevels.CRITICAL;
    }

    return {
      error_type: errorType,
      severity
    };
  }

  /**
   * Extract system context information
   */
  extractSystemContext() {
    return {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      load_average: process.platform === 'linux' ? require('os').loadavg() : null
    };
  }

  /**
   * Store error in database
   */
  async storeErrorInDatabase(errorData) {
    try {
      await db('error_logs').insert({
        id: errorData.id,
        user_id: errorData.context.user_id || null,
        error_type: errorData.error_type,
        error_code: errorData.error_code,
        message: errorData.message,
        stack_trace: errorData.stack_trace,
        severity: errorData.severity,
        context: JSON.stringify(errorData.context),
        source: errorData.context.source || null,
        user_agent: errorData.context.user_agent || null,
        ip_address: errorData.context.ip_address || null,
        request_id: errorData.context.request_id || null,
        request_data: errorData.context.request_data ? JSON.stringify(errorData.context.request_data) : null,
        created_at: errorData.timestamp,
        updated_at: errorData.timestamp
      });
    } catch (dbError) {
      logger.error('Failed to store error in database:', dbError);
    }
  }

  /**
   * Send error to Sentry
   */
  sendToSentry(error, context, classification) {
    try {
      Sentry.withScope((scope) => {
        // Set tags
        scope.setTags({
          error_type: classification.error_type,
          severity: classification.severity,
          source: context.source || 'unknown'
        });

        // Set context
        scope.setContext('error_context', context);
        
        // Set user context if available
        if (context.user_id) {
          scope.setUser({
            id: context.user_id,
            ip_address: context.ip_address
          });
        }

        // Set level based on severity
        const level = this.getSentryLevel(classification.severity);
        scope.setLevel(level);

        // Capture the error
        Sentry.captureException(error);
      });
    } catch (sentryError) {
      logger.error('Failed to send error to Sentry:', sentryError);
    }
  }

  /**
   * Convert severity to Sentry level
   */
  getSentryLevel(severity) {
    switch (severity) {
      case this.severityLevels.LOW: return 'info';
      case this.severityLevels.MEDIUM: return 'warning';
      case this.severityLevels.HIGH: return 'error';
      case this.severityLevels.CRITICAL: return 'fatal';
      default: return 'error';
    }
  }

  /**
   * Check for error alert conditions
   */
  async checkErrorAlerts(classification, errorInfo) {
    try {
      // High-frequency error detection
      const recentErrors = await db('error_logs')
        .where('error_type', classification.error_type)
        .where('created_at', '>', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .count('* as count')
        .first();

      if (recentErrors.count > 10) {
        await this.triggerAlert({
          type: 'high_frequency_errors',
          message: `High frequency of ${classification.error_type} errors detected`,
          count: recentErrors.count,
          severity: 'high'
        });
      }

      // Critical error immediate alert
      if (classification.severity === this.severityLevels.CRITICAL) {
        await this.triggerAlert({
          type: 'critical_error',
          message: `Critical error: ${errorInfo.message}`,
          error_type: classification.error_type,
          severity: 'critical'
        });
      }

    } catch (alertError) {
      logger.error('Failed to check error alerts:', alertError);
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(alertData) {
    try {
      // Store alert
      await db('alert_history').insert({
        id: uuidv4(),
        alert_id: null, // Will be linked to analytics_alerts table
        status: 'triggered',
        trigger_value: alertData.count || 1,
        context: JSON.stringify(alertData),
        message: alertData.message,
        triggered_at: new Date()
      });

      // Immediate notification (implement based on requirements)
      logger.warn('Alert triggered:', alertData);

      // In production, integrate with notification services
      // await this.sendNotification(alertData);

    } catch (alertError) {
      logger.error('Failed to trigger alert:', alertError);
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(timeframe = '24h', filters = {}) {
    try {
      const timeframeMap = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };

      const hours = timeframeMap[timeframe] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      let query = db('error_logs').where('created_at', '>', since);

      // Apply filters
      if (filters.error_type) query = query.where('error_type', filters.error_type);
      if (filters.severity) query = query.where('severity', filters.severity);
      if (filters.user_id) query = query.where('user_id', filters.user_id);

      const stats = await Promise.all([
        // Total errors
        query.clone().count('* as total').first(),
        
        // Errors by type
        query.clone().groupBy('error_type').select('error_type').count('* as count'),
        
        // Errors by severity
        query.clone().groupBy('severity').select('severity').count('* as count'),
        
        // Error trends (hourly)
        query.clone()
          .select(db.raw("DATE_TRUNC('hour', created_at) as hour"))
          .count('* as count')
          .groupBy(db.raw("DATE_TRUNC('hour', created_at)"))
          .orderBy('hour'),

        // Top error messages
        query.clone()
          .select('message', 'error_type')
          .count('* as count')
          .groupBy('message', 'error_type')
          .orderBy('count', 'desc')
          .limit(10),

        // Resolution status
        query.clone().groupBy('resolved').select('resolved').count('* as count')
      ]);

      return {
        timeframe,
        period: {
          since: since.toISOString(),
          until: new Date().toISOString()
        },
        total_errors: parseInt(stats[0].total),
        by_type: stats[1],
        by_severity: stats[2],
        hourly_trend: stats[3],
        top_messages: stats[4],
        resolution_status: stats[5]
      };

    } catch (error) {
      logger.error('Failed to get error statistics:', error);
      throw error;
    }
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId, resolutionNotes = '') {
    try {
      await db('error_logs')
        .where('id', errorId)
        .update({
          resolved: true,
          resolved_at: new Date(),
          resolution_notes: resolutionNotes
        });

      logger.info('Error marked as resolved:', { errorId, resolutionNotes });
      
      return { success: true };
    } catch (error) {
      logger.error('Failed to resolve error:', error);
      throw error;
    }
  }

  /**
   * Get error details by ID
   */
  async getErrorDetails(errorId) {
    try {
      const error = await db('error_logs')
        .where('id', errorId)
        .first();

      if (!error) {
        throw new Error('Error not found');
      }

      // Parse JSON fields
      if (error.context) error.context = JSON.parse(error.context);
      if (error.request_data) error.request_data = JSON.parse(error.request_data);

      return error;
    } catch (error) {
      logger.error('Failed to get error details:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      sentry_enabled: this.sentryEnabled,
      error_types: Object.keys(this.errorTypes).length,
      severity_levels: Object.keys(this.severityLevels).length,
      classification_patterns: Object.keys(this.errorPatterns).length
    };
  }

  /**
   * Express middleware for automatic error tracking
   */
  getMiddleware() {
    return (error, req, res, next) => {
      // Extract request context
      const context = {
        source: `${req.method} ${req.path}`,
        user_id: req.user?.id,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip,
        request_id: req.id || req.headers['x-request-id'],
        request_data: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
          query: req.query,
          params: req.params
        }
      };

      // Track the error
      this.trackError(error, context).catch(trackingError => {
        logger.error('Error tracking failed in middleware:', trackingError);
      });

      // Continue with normal error handling
      next(error);
    };
  }

  /**
   * Manual error reporting for specific scenarios
   */
  async reportCustomError(eventName, details, context = {}) {
    const customError = new Error(`Custom Event: ${eventName}`);
    customError.name = 'CustomError';
    customError.details = details;

    return this.trackError(customError, {
      ...context,
      source: 'custom_event',
      event_name: eventName,
      custom_details: details
    });
  }
}

module.exports = new ErrorTrackingService();