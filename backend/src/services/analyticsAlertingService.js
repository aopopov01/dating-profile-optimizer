/**
 * Analytics Alerting Service
 * Real-time monitoring, alerts, and notification system for analytics metrics
 */

const EventEmitter = require('events');
const logger = require('../config/logger');
const db = require('../config/database');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

class AnalyticsAlertingService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.maxHistorySize = 1000;
    this.evaluationInterval = 60000; // 1 minute
    this.cooldownPeriods = new Map();
    
    // Default alert rules for dating profile optimizer
    this.defaultAlertRules = {
      high_error_rate: {
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds threshold',
        metric_type: 'error_rate',
        condition: {
          operator: 'greater_than',
          threshold: 0.05, // 5%
          window: '5m'
        },
        severity: 'high',
        cooldown_minutes: 15,
        notification_channels: ['email', 'log'],
        enabled: true
      },
      slow_response_time: {
        name: 'Slow Response Time',
        description: 'Alert when average response time is too high',
        metric_type: 'avg_response_time',
        condition: {
          operator: 'greater_than',
          threshold: 2000, // 2 seconds
          window: '10m'
        },
        severity: 'medium',
        cooldown_minutes: 10,
        notification_channels: ['email'],
        enabled: true
      },
      low_user_registrations: {
        name: 'Low User Registrations',
        description: 'Alert when user registrations drop significantly',
        metric_type: 'hourly_registrations',
        condition: {
          operator: 'less_than',
          threshold: 5,
          window: '1h'
        },
        severity: 'medium',
        cooldown_minutes: 60,
        notification_channels: ['email'],
        enabled: true
      },
      high_bio_generation_failures: {
        name: 'High Bio Generation Failures',
        description: 'Alert when bio generation failure rate is high',
        metric_type: 'bio_generation_failure_rate',
        condition: {
          operator: 'greater_than',
          threshold: 0.15, // 15%
          window: '15m'
        },
        severity: 'high',
        cooldown_minutes: 30,
        notification_channels: ['email', 'log'],
        enabled: true
      },
      database_connection_issues: {
        name: 'Database Connection Issues',
        description: 'Alert when database connections are problematic',
        metric_type: 'database_connection_errors',
        condition: {
          operator: 'greater_than',
          threshold: 10,
          window: '5m'
        },
        severity: 'critical',
        cooldown_minutes: 5,
        notification_channels: ['email', 'log'],
        enabled: true
      },
      subscription_conversion_drop: {
        name: 'Subscription Conversion Drop',
        description: 'Alert when subscription conversion rate drops',
        metric_type: 'daily_subscription_rate',
        condition: {
          operator: 'less_than_percent_change',
          threshold: -20, // 20% decrease
          window: '24h',
          comparison_period: '24h'
        },
        severity: 'high',
        cooldown_minutes: 180, // 3 hours
        notification_channels: ['email'],
        enabled: true
      },
      memory_usage_critical: {
        name: 'Critical Memory Usage',
        description: 'Alert when memory usage is critically high',
        metric_type: 'memory_usage_percent',
        condition: {
          operator: 'greater_than',
          threshold: 90, // 90%
          window: '5m'
        },
        severity: 'critical',
        cooldown_minutes: 10,
        notification_channels: ['email', 'log'],
        enabled: true
      }
    };

    this.init();
  }

  async init() {
    try {
      // Load alert rules from database
      await this.loadAlertRules();
      
      // Initialize default rules if none exist
      if (this.alertRules.size === 0) {
        await this.initializeDefaultRules();
      }

      // Start alert evaluation loop
      this.startAlertEvaluation();

      this.initialized = true;
      logger.info('Analytics Alerting Service initialized with', this.alertRules.size, 'alert rules');
    } catch (error) {
      logger.error('Failed to initialize Analytics Alerting Service:', error);
    }
  }

  /**
   * Load alert rules from database
   */
  async loadAlertRules() {
    try {
      const rules = await db('analytics_alerts').where('is_active', true);
      
      for (const rule of rules) {
        this.alertRules.set(rule.id, {
          id: rule.id,
          name: rule.alert_name,
          type: rule.alert_type,
          metric_name: rule.metric_name,
          condition: JSON.parse(rule.condition),
          severity: rule.severity,
          notification_channels: JSON.parse(rule.notification_channels || '[]'),
          recipients: JSON.parse(rule.recipients || '[]'),
          cooldown_minutes: rule.cooldown_minutes,
          last_triggered: rule.last_triggered,
          trigger_count: rule.trigger_count,
          enabled: rule.is_active
        });
      }
    } catch (error) {
      logger.error('Failed to load alert rules:', error);
    }
  }

  /**
   * Initialize default alert rules
   */
  async initializeDefaultRules() {
    try {
      for (const [ruleKey, rule] of Object.entries(this.defaultAlertRules)) {
        const alertId = await this.createAlertRule({
          name: rule.name,
          description: rule.description,
          metric_name: rule.metric_type,
          alert_type: 'threshold',
          condition: rule.condition,
          severity: rule.severity,
          notification_channels: rule.notification_channels,
          cooldown_minutes: rule.cooldown_minutes,
          enabled: rule.enabled
        });

        logger.info(`Initialized default alert rule: ${rule.name} (${alertId})`);
      }
    } catch (error) {
      logger.error('Failed to initialize default alert rules:', error);
    }
  }

  /**
   * Create new alert rule
   */
  async createAlertRule(ruleConfig) {
    try {
      const {
        name,
        description,
        metric_name,
        alert_type = 'threshold',
        condition,
        severity = 'medium',
        notification_channels = ['email'],
        recipients = [],
        cooldown_minutes = 60,
        enabled = true
      } = ruleConfig;

      const alertId = uuidv4();
      
      const alertRule = {
        id: alertId,
        alert_name: name,
        alert_type: alert_type,
        metric_name,
        condition: JSON.stringify(condition),
        severity,
        is_active: enabled,
        notification_channels: JSON.stringify(notification_channels),
        recipients: JSON.stringify(recipients),
        cooldown_minutes,
        last_triggered: null,
        trigger_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      await db('analytics_alerts').insert(alertRule);

      // Add to memory
      this.alertRules.set(alertId, {
        id: alertId,
        name,
        description,
        type: alert_type,
        metric_name,
        condition,
        severity,
        notification_channels,
        recipients,
        cooldown_minutes,
        last_triggered: null,
        trigger_count: 0,
        enabled
      });

      logger.info('Alert rule created:', { alertId, name, metric_name });

      return alertId;
    } catch (error) {
      logger.error('Failed to create alert rule:', error);
      throw error;
    }
  }

  /**
   * Start alert evaluation loop
   */
  startAlertEvaluation() {
    setInterval(async () => {
      try {
        await this.evaluateAllAlerts();
      } catch (error) {
        logger.error('Alert evaluation failed:', error);
      }
    }, this.evaluationInterval);

    logger.info('Alert evaluation started with', this.evaluationInterval, 'ms interval');
  }

  /**
   * Evaluate all active alert rules
   */
  async evaluateAllAlerts() {
    const evaluationPromises = Array.from(this.alertRules.values())
      .filter(rule => rule.enabled)
      .map(rule => this.evaluateAlert(rule));

    await Promise.allSettled(evaluationPromises);
  }

  /**
   * Evaluate individual alert rule
   */
  async evaluateAlert(rule) {
    try {
      // Check cooldown
      if (this.isInCooldown(rule.id)) {
        return;
      }

      // Get metric value
      const metricValue = await this.getMetricValue(rule.metric_name, rule.condition);
      
      if (metricValue === null || metricValue === undefined) {
        return;
      }

      // Evaluate condition
      const shouldTrigger = this.evaluateCondition(metricValue, rule.condition);

      if (shouldTrigger) {
        await this.triggerAlert(rule, metricValue);
      } else {
        // Check if alert should be resolved
        if (this.activeAlerts.has(rule.id)) {
          await this.resolveAlert(rule.id);
        }
      }

    } catch (error) {
      logger.error(`Failed to evaluate alert rule ${rule.name}:`, error);
    }
  }

  /**
   * Get metric value for evaluation
   */
  async getMetricValue(metricName, condition) {
    try {
      const windowMinutes = this.parseTimeWindow(condition.window || '5m');
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

      const metricCalculators = {
        error_rate: async () => {
          const [totalRequests, errorRequests] = await Promise.all([
            db('performance_metrics')
              .where('metric_type', 'http_request_duration')
              .where('recorded_at', '>', windowStart)
              .count('* as count')
              .first(),
            db('error_logs')
              .where('created_at', '>', windowStart)
              .count('* as count')
              .first()
          ]);

          const total = parseInt(totalRequests.count);
          const errors = parseInt(errorRequests.count);
          return total > 0 ? errors / total : 0;
        },

        avg_response_time: async () => {
          const result = await db('performance_metrics')
            .where('metric_type', 'http_request_duration')
            .where('recorded_at', '>', windowStart)
            .avg('value as avg_time')
            .first();
          return parseFloat(result.avg_time || 0);
        },

        hourly_registrations: async () => {
          const result = await db('users')
            .where('created_at', '>', windowStart)
            .count('* as count')
            .first();
          return parseInt(result.count);
        },

        bio_generation_failure_rate: async () => {
          const [total, failures] = await Promise.all([
            db('feature_usage')
              .where('feature_name', 'bio_generation')
              .where('created_at', '>', windowStart)
              .count('* as count')
              .first(),
            db('feature_usage')
              .where('feature_name', 'bio_generation')
              .where('success', false)
              .where('created_at', '>', windowStart)
              .count('* as count')
              .first()
          ]);

          const totalCount = parseInt(total.count);
          const failureCount = parseInt(failures.count);
          return totalCount > 0 ? failureCount / totalCount : 0;
        },

        database_connection_errors: async () => {
          const result = await db('error_logs')
            .where('error_type', 'database_error')
            .where('created_at', '>', windowStart)
            .count('* as count')
            .first();
          return parseInt(result.count);
        },

        daily_subscription_rate: async () => {
          const [users, subscriptions] = await Promise.all([
            db('users')
              .where('created_at', '>', windowStart)
              .count('* as count')
              .first(),
            db('purchases')
              .where('purchase_type', 'subscription')
              .where('created_at', '>', windowStart)
              .count('* as count')
              .first()
          ]);

          const totalUsers = parseInt(users.count);
          const subscriptionCount = parseInt(subscriptions.count);
          return totalUsers > 0 ? subscriptionCount / totalUsers : 0;
        },

        memory_usage_percent: async () => {
          const result = await db('performance_metrics')
            .where('metric_type', 'memory_heap_used')
            .where('recorded_at', '>', windowStart)
            .avg('value as avg_memory')
            .first();

          const memoryUsed = parseFloat(result.avg_memory || 0);
          const totalMemory = process.memoryUsage().heapTotal;
          return totalMemory > 0 ? (memoryUsed / totalMemory) * 100 : 0;
        }
      };

      const calculator = metricCalculators[metricName];
      return calculator ? await calculator() : null;

    } catch (error) {
      logger.error(`Failed to get metric value for ${metricName}:`, error);
      return null;
    }
  }

  /**
   * Evaluate condition against metric value
   */
  evaluateCondition(metricValue, condition) {
    const { operator, threshold } = condition;

    switch (operator) {
      case 'greater_than':
        return metricValue > threshold;
      case 'less_than':
        return metricValue < threshold;
      case 'equal':
        return metricValue === threshold;
      case 'greater_than_or_equal':
        return metricValue >= threshold;
      case 'less_than_or_equal':
        return metricValue <= threshold;
      case 'less_than_percent_change':
        // This would require comparison with previous period
        // Simplified implementation for now
        return metricValue < threshold;
      default:
        logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule, metricValue) {
    try {
      const alertId = uuidv4();
      const triggeredAt = new Date();

      const alert = {
        id: alertId,
        rule_id: rule.id,
        rule_name: rule.name,
        metric_name: rule.metric_name,
        metric_value: metricValue,
        threshold: rule.condition.threshold,
        severity: rule.severity,
        status: 'triggered',
        triggered_at: triggeredAt,
        resolved_at: null,
        context: {
          condition: rule.condition,
          evaluation_time: triggeredAt.toISOString()
        }
      };

      // Store in database
      await db('alert_history').insert({
        id: alertId,
        alert_id: rule.id,
        status: 'triggered',
        trigger_value: metricValue,
        context: JSON.stringify(alert.context),
        message: this.generateAlertMessage(rule, metricValue),
        triggered_at: triggeredAt,
        resolved_at: null,
        notification_sent: false
      });

      // Add to active alerts
      this.activeAlerts.set(rule.id, alert);

      // Set cooldown
      this.setCooldown(rule.id, rule.cooldown_minutes);

      // Update rule trigger count
      await this.updateRuleTriggerCount(rule.id);

      // Send notifications
      await this.sendAlertNotifications(rule, alert);

      // Emit event
      this.emit('alert_triggered', alert);

      logger.warn('Alert triggered:', {
        rule: rule.name,
        metric: rule.metric_name,
        value: metricValue,
        threshold: rule.condition.threshold,
        severity: rule.severity
      });

      // Add to history
      this.addToHistory({
        type: 'alert_triggered',
        alert,
        timestamp: triggeredAt
      });

    } catch (error) {
      logger.error('Failed to trigger alert:', error);
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(ruleId) {
    try {
      const alert = this.activeAlerts.get(ruleId);
      if (!alert) return;

      const resolvedAt = new Date();
      alert.status = 'resolved';
      alert.resolved_at = resolvedAt;

      // Update database
      await db('alert_history')
        .where('alert_id', ruleId)
        .where('status', 'triggered')
        .update({
          status: 'resolved',
          resolved_at: resolvedAt
        });

      // Remove from active alerts
      this.activeAlerts.delete(ruleId);

      // Emit event
      this.emit('alert_resolved', alert);

      logger.info('Alert resolved:', {
        rule: alert.rule_name,
        duration: resolvedAt - alert.triggered_at
      });

      // Add to history
      this.addToHistory({
        type: 'alert_resolved',
        alert,
        timestamp: resolvedAt
      });

    } catch (error) {
      logger.error('Failed to resolve alert:', error);
    }
  }

  /**
   * Send alert notifications
   */
  async sendAlertNotifications(rule, alert) {
    try {
      const message = this.generateAlertMessage(rule, alert.metric_value);

      for (const channel of rule.notification_channels) {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(rule, alert, message);
            break;
          case 'log':
            logger.warn(`[ALERT] ${message}`);
            break;
          // Add more channels as needed (Slack, SMS, etc.)
          default:
            logger.warn(`Unknown notification channel: ${channel}`);
        }
      }

      // Mark notification as sent
      await db('alert_history')
        .where('id', alert.id)
        .update({ notification_sent: true });

    } catch (error) {
      logger.error('Failed to send alert notifications:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(rule, alert, message) {
    try {
      const recipients = rule.recipients.length > 0 ? 
        rule.recipients : 
        [process.env.ALERT_EMAIL || 'admin@example.com'];

      const emailData = {
        to: recipients,
        subject: `[${alert.severity.toUpperCase()}] ${rule.name}`,
        html: `
          <h2>Alert Triggered: ${rule.name}</h2>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Metric:</strong> ${rule.metric_name}</p>
          <p><strong>Current Value:</strong> ${alert.metric_value}</p>
          <p><strong>Threshold:</strong> ${rule.condition.threshold}</p>
          <p><strong>Time:</strong> ${alert.triggered_at}</p>
          <p><strong>Description:</strong> ${message}</p>
          
          <h3>Context</h3>
          <pre>${JSON.stringify(alert.context, null, 2)}</pre>
        `
      };

      await emailService.sendEmail(emailData);
      
      logger.info('Alert email notification sent:', {
        rule: rule.name,
        recipients: recipients.length
      });

    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }
  }

  /**
   * Helper methods
   */
  generateAlertMessage(rule, metricValue) {
    return `${rule.name}: ${rule.metric_name} is ${metricValue} (threshold: ${rule.condition.threshold})`;
  }

  isInCooldown(ruleId) {
    const cooldownEnd = this.cooldownPeriods.get(ruleId);
    return cooldownEnd && Date.now() < cooldownEnd;
  }

  setCooldown(ruleId, minutes) {
    const cooldownEnd = Date.now() + (minutes * 60 * 1000);
    this.cooldownPeriods.set(ruleId, cooldownEnd);
  }

  parseTimeWindow(window) {
    const match = window.match(/^(\d+)([hm])$/);
    if (!match) return 5; // Default to 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === 'h' ? value * 60 : value;
  }

  async updateRuleTriggerCount(ruleId) {
    try {
      await db('analytics_alerts')
        .where('id', ruleId)
        .increment('trigger_count', 1)
        .update('last_triggered', new Date());

      // Update in memory
      const rule = this.alertRules.get(ruleId);
      if (rule) {
        rule.trigger_count = (rule.trigger_count || 0) + 1;
        rule.last_triggered = new Date();
      }

    } catch (error) {
      logger.error('Failed to update rule trigger count:', error);
    }
  }

  addToHistory(entry) {
    this.alertHistory.unshift(entry);
    
    // Keep history size manageable
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeframe = '24h') {
    try {
      const hours = { '1h': 1, '24h': 24, '7d': 168 }[timeframe] || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [
        totalAlerts,
        alertsBySeverity,
        alertsByRule,
        recentAlerts
      ] = await Promise.all([
        db('alert_history').where('triggered_at', '>', since).count('* as count').first(),
        db('alert_history')
          .join('analytics_alerts', 'alert_history.alert_id', 'analytics_alerts.id')
          .where('alert_history.triggered_at', '>', since)
          .groupBy('analytics_alerts.severity')
          .select('analytics_alerts.severity')
          .count('* as count'),
        db('alert_history')
          .join('analytics_alerts', 'alert_history.alert_id', 'analytics_alerts.id')
          .where('alert_history.triggered_at', '>', since)
          .groupBy('analytics_alerts.alert_name')
          .select('analytics_alerts.alert_name')
          .count('* as count')
          .orderBy('count', 'desc')
          .limit(10),
        db('alert_history')
          .join('analytics_alerts', 'alert_history.alert_id', 'analytics_alerts.id')
          .where('alert_history.triggered_at', '>', since)
          .select(
            'alert_history.*',
            'analytics_alerts.alert_name',
            'analytics_alerts.severity'
          )
          .orderBy('alert_history.triggered_at', 'desc')
          .limit(20)
      ]);

      return {
        timeframe,
        period: {
          since: since.toISOString(),
          until: new Date().toISOString()
        },
        total_alerts: parseInt(totalAlerts.count),
        active_alerts: this.activeAlerts.size,
        alerts_by_severity: alertsBySeverity,
        alerts_by_rule: alertsByRule,
        recent_alerts: recentAlerts,
        alert_rules: {
          total: this.alertRules.size,
          enabled: Array.from(this.alertRules.values()).filter(r => r.enabled).length
        }
      };

    } catch (error) {
      logger.error('Failed to get alert statistics:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      alert_rules: this.alertRules.size,
      active_alerts: this.activeAlerts.size,
      evaluation_interval: this.evaluationInterval,
      cooldown_periods: this.cooldownPeriods.size,
      history_size: this.alertHistory.length
    };
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(ruleId, updates) {
    try {
      await db('analytics_alerts')
        .where('id', ruleId)
        .update({
          ...updates,
          updated_at: new Date()
        });

      // Update in memory
      const rule = this.alertRules.get(ruleId);
      if (rule) {
        Object.assign(rule, updates);
      }

      logger.info('Alert rule updated:', { ruleId, updates });

      return { success: true };
    } catch (error) {
      logger.error('Failed to update alert rule:', error);
      throw error;
    }
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(ruleId) {
    try {
      await db('analytics_alerts').where('id', ruleId).del();
      this.alertRules.delete(ruleId);
      this.activeAlerts.delete(ruleId);
      this.cooldownPeriods.delete(ruleId);

      logger.info('Alert rule deleted:', { ruleId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete alert rule:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsAlertingService();