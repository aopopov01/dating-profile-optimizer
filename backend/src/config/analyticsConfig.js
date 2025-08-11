/**
 * Comprehensive Analytics Configuration
 * Central configuration for all analytics services and integrations
 */

const logger = require('./logger');

class AnalyticsConfiguration {
  constructor() {
    this.config = {
      // Service enablement flags
      services: {
        error_tracking: process.env.ENABLE_ERROR_TRACKING === 'true',
        performance_monitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
        user_behavior_analytics: process.env.ENABLE_USER_ANALYTICS === 'true',
        ab_testing: process.env.ENABLE_AB_TESTING === 'true',
        alerting: process.env.ENABLE_ALERTING === 'true',
        dashboard: process.env.ENABLE_ANALYTICS_DASHBOARD === 'true'
      },

      // External service integrations
      integrations: {
        // Sentry for error tracking
        sentry: {
          enabled: !!process.env.SENTRY_DSN,
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          release: process.env.APP_VERSION || '1.0.0',
          traces_sample_rate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
          profiles_sample_rate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1')
        },

        // Mixpanel for user analytics
        mixpanel: {
          enabled: !!process.env.MIXPANEL_TOKEN,
          token: process.env.MIXPANEL_TOKEN,
          api_secret: process.env.MIXPANEL_API_SECRET
        },

        // Google Analytics
        google_analytics: {
          enabled: !!process.env.GOOGLE_ANALYTICS_ID,
          measurement_id: process.env.GOOGLE_ANALYTICS_ID,
          api_secret: process.env.GOOGLE_ANALYTICS_API_SECRET
        },

        // Amplitude (alternative to Mixpanel)
        amplitude: {
          enabled: !!process.env.AMPLITUDE_API_KEY,
          api_key: process.env.AMPLITUDE_API_KEY,
          secret_key: process.env.AMPLITUDE_SECRET_KEY
        },

        // Prometheus metrics
        prometheus: {
          enabled: process.env.ENABLE_PROMETHEUS_METRICS === 'true',
          metrics_path: '/metrics',
          collect_default_metrics: true,
          prefix: 'dating_optimizer_'
        }
      },

      // Data retention policies
      retention: {
        error_logs: {
          days: parseInt(process.env.ERROR_LOGS_RETENTION_DAYS || '90'),
          cleanup_enabled: process.env.ENABLE_LOG_CLEANUP === 'true'
        },
        performance_metrics: {
          days: parseInt(process.env.PERFORMANCE_METRICS_RETENTION_DAYS || '30'),
          cleanup_enabled: process.env.ENABLE_METRICS_CLEANUP === 'true'
        },
        user_events: {
          days: parseInt(process.env.USER_EVENTS_RETENTION_DAYS || '365'),
          cleanup_enabled: process.env.ENABLE_EVENTS_CLEANUP === 'true'
        },
        ab_test_data: {
          days: parseInt(process.env.AB_TEST_DATA_RETENTION_DAYS || '365'),
          cleanup_enabled: process.env.ENABLE_AB_TEST_CLEANUP === 'true'
        }
      },

      // Performance thresholds
      thresholds: {
        response_time: {
          warning: parseInt(process.env.RESPONSE_TIME_WARNING_MS || '1000'),
          critical: parseInt(process.env.RESPONSE_TIME_CRITICAL_MS || '5000')
        },
        error_rate: {
          warning: parseFloat(process.env.ERROR_RATE_WARNING || '0.05'),
          critical: parseFloat(process.env.ERROR_RATE_CRITICAL || '0.1')
        },
        memory_usage: {
          warning: parseFloat(process.env.MEMORY_USAGE_WARNING || '0.8'),
          critical: parseFloat(process.env.MEMORY_USAGE_CRITICAL || '0.9')
        },
        cpu_usage: {
          warning: parseFloat(process.env.CPU_USAGE_WARNING || '0.7'),
          critical: parseFloat(process.env.CPU_USAGE_CRITICAL || '0.9')
        }
      },

      // Sampling and collection rates
      sampling: {
        error_tracking: {
          sample_rate: parseFloat(process.env.ERROR_SAMPLING_RATE || '1.0'),
          local_storage_enabled: process.env.STORE_ERRORS_LOCALLY === 'true'
        },
        performance_metrics: {
          collection_interval: parseInt(process.env.METRICS_COLLECTION_INTERVAL_MS || '30000'),
          http_monitoring_enabled: process.env.HTTP_MONITORING_ENABLED !== 'false',
          database_monitoring_enabled: process.env.DATABASE_MONITORING_ENABLED !== 'false'
        },
        user_behavior: {
          session_timeout: parseInt(process.env.SESSION_TIMEOUT_MS || '1800000'), // 30 minutes
          batch_size: parseInt(process.env.ANALYTICS_BATCH_SIZE || '100'),
          flush_interval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL_MS || '60000')
        }
      },

      // Alert configuration
      alerting: {
        email: {
          enabled: process.env.ENABLE_EMAIL_ALERTS === 'true',
          recipients: process.env.ALERT_RECIPIENTS?.split(',') || ['admin@example.com'],
          smtp_config: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          }
        },
        slack: {
          enabled: process.env.ENABLE_SLACK_ALERTS === 'true',
          webhook_url: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
        },
        webhook: {
          enabled: process.env.ENABLE_WEBHOOK_ALERTS === 'true',
          urls: process.env.ALERT_WEBHOOK_URLS?.split(',') || []
        }
      },

      // Dashboard configuration
      dashboard: {
        refresh_interval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL_MS || '30000'),
        cache_ttl: parseInt(process.env.DASHBOARD_CACHE_TTL_MS || '300000'),
        chart_generation: {
          enabled: process.env.ENABLE_CHART_GENERATION === 'true',
          width: parseInt(process.env.CHART_WIDTH || '800'),
          height: parseInt(process.env.CHART_HEIGHT || '400'),
          background_color: process.env.CHART_BACKGROUND_COLOR || 'white'
        },
        kpi_targets: {
          daily_registrations: parseInt(process.env.TARGET_DAILY_REGISTRATIONS || '50'),
          conversion_rate: parseFloat(process.env.TARGET_CONVERSION_RATE || '0.15'),
          average_session_duration: parseInt(process.env.TARGET_SESSION_DURATION_SECONDS || '300'),
          user_satisfaction_score: parseFloat(process.env.TARGET_SATISFACTION_SCORE || '4.0')
        }
      },

      // A/B testing configuration
      ab_testing: {
        default_confidence_level: parseFloat(process.env.DEFAULT_AB_TEST_CONFIDENCE || '0.95'),
        minimum_sample_size: parseInt(process.env.MIN_AB_TEST_SAMPLE_SIZE || '100'),
        maximum_test_duration_days: parseInt(process.env.MAX_AB_TEST_DURATION_DAYS || '30'),
        auto_stop_enabled: process.env.ENABLE_AB_TEST_AUTO_STOP === 'true',
        significance_threshold: parseFloat(process.env.AB_TEST_SIGNIFICANCE_THRESHOLD || '0.95')
      },

      // Privacy and compliance
      privacy: {
        gdpr_compliance: process.env.ENABLE_GDPR_COMPLIANCE === 'true',
        data_anonymization: process.env.ENABLE_DATA_ANONYMIZATION === 'true',
        user_consent_required: process.env.REQUIRE_ANALYTICS_CONSENT === 'true',
        pii_scrubbing: {
          enabled: process.env.ENABLE_PII_SCRUBBING === 'true',
          fields: process.env.PII_SCRUB_FIELDS?.split(',') || [
            'email', 'phone', 'name', 'address', 'ip_address'
          ]
        }
      },

      // Development and debugging
      debug: {
        log_all_events: process.env.LOG_ALL_ANALYTICS_EVENTS === 'true',
        verbose_logging: process.env.VERBOSE_ANALYTICS_LOGGING === 'true',
        mock_external_services: process.env.MOCK_ANALYTICS_SERVICES === 'true',
        test_mode: process.env.NODE_ENV === 'test'
      }
    };
  }

  /**
   * Get configuration for a specific service
   */
  getServiceConfig(serviceName) {
    const serviceConfigs = {
      error_tracking: {
        enabled: this.config.services.error_tracking,
        sentry: this.config.integrations.sentry,
        retention: this.config.retention.error_logs,
        sampling: this.config.sampling.error_tracking,
        thresholds: this.config.thresholds
      },

      performance_monitoring: {
        enabled: this.config.services.performance_monitoring,
        prometheus: this.config.integrations.prometheus,
        retention: this.config.retention.performance_metrics,
        sampling: this.config.sampling.performance_metrics,
        thresholds: this.config.thresholds
      },

      user_behavior_analytics: {
        enabled: this.config.services.user_behavior_analytics,
        mixpanel: this.config.integrations.mixpanel,
        amplitude: this.config.integrations.amplitude,
        google_analytics: this.config.integrations.google_analytics,
        retention: this.config.retention.user_events,
        sampling: this.config.sampling.user_behavior,
        privacy: this.config.privacy
      },

      ab_testing: {
        enabled: this.config.services.ab_testing,
        default_config: this.config.ab_testing,
        retention: this.config.retention.ab_test_data
      },

      alerting: {
        enabled: this.config.services.alerting,
        channels: this.config.alerting,
        thresholds: this.config.thresholds
      },

      dashboard: {
        enabled: this.config.services.dashboard,
        config: this.config.dashboard,
        kpi_targets: this.config.dashboard.kpi_targets
      }
    };

    return serviceConfigs[serviceName] || {};
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const issues = [];

    // Check required environment variables for enabled services
    if (this.config.services.error_tracking && !this.config.integrations.sentry.dsn) {
      issues.push('SENTRY_DSN required when error tracking is enabled');
    }

    if (this.config.services.user_behavior_analytics) {
      if (!this.config.integrations.mixpanel.token && 
          !this.config.integrations.amplitude.api_key &&
          !this.config.integrations.google_analytics.measurement_id) {
        issues.push('At least one analytics service (Mixpanel, Amplitude, or Google Analytics) token required');
      }
    }

    if (this.config.services.alerting && this.config.alerting.email.enabled) {
      if (!this.config.alerting.email.smtp_config.host) {
        issues.push('SMTP configuration required when email alerts are enabled');
      }
    }

    // Validate threshold values
    Object.entries(this.config.thresholds).forEach(([metric, thresholds]) => {
      if (thresholds.warning >= thresholds.critical) {
        issues.push(`Warning threshold must be less than critical threshold for ${metric}`);
      }
    });

    // Validate retention periods
    Object.entries(this.config.retention).forEach(([type, retention]) => {
      if (retention.days < 1) {
        issues.push(`Invalid retention period for ${type}: must be at least 1 day`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get analytics health status
   */
  getHealthStatus() {
    const enabledServices = Object.entries(this.config.services)
      .filter(([_, enabled]) => enabled)
      .map(([service, _]) => service);

    const availableIntegrations = Object.entries(this.config.integrations)
      .filter(([_, config]) => config.enabled)
      .map(([integration, _]) => integration);

    return {
      enabled_services: enabledServices,
      available_integrations: availableIntegrations,
      configuration_valid: this.validateConfig().valid,
      environment: this.config.integrations.sentry.environment,
      debug_mode: this.config.debug.test_mode || this.config.debug.verbose_logging
    };
  }

  /**
   * Get configuration summary for logging/debugging
   */
  getConfigSummary() {
    return {
      services: Object.entries(this.config.services)
        .reduce((acc, [service, enabled]) => {
          acc[service] = enabled;
          return acc;
        }, {}),
      integrations: Object.entries(this.config.integrations)
        .reduce((acc, [integration, config]) => {
          acc[integration] = config.enabled;
          return acc;
        }, {}),
      retention_periods: Object.entries(this.config.retention)
        .reduce((acc, [type, retention]) => {
          acc[type] = `${retention.days} days`;
          return acc;
        }, {}),
      privacy_compliance: {
        gdpr: this.config.privacy.gdpr_compliance,
        anonymization: this.config.privacy.data_anonymization,
        consent_required: this.config.privacy.user_consent_required
      }
    };
  }
}

// Create singleton instance
const analyticsConfig = new AnalyticsConfiguration();

// Validate configuration on startup
const validation = analyticsConfig.validateConfig();
if (!validation.valid) {
  logger.warn('Analytics configuration issues found:', validation.issues);
} else {
  logger.info('Analytics configuration validated successfully');
}

// Log configuration summary
logger.info('Analytics configuration summary:', analyticsConfig.getConfigSummary());

module.exports = analyticsConfig;