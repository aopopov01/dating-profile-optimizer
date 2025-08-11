/**
 * Analytics Alert Templates Seed
 * Pre-configured alert rules for the Dating Profile Optimizer application
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  // Clear existing data
  await knex('analytics_alerts').del();
  await knex('alert_history').del();

  // Insert default alert templates
  const alertTemplates = [
    {
      id: uuidv4(),
      alert_name: 'High Error Rate',
      alert_type: 'threshold',
      metric_name: 'error_rate',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 0.05, // 5%
        window: '5m'
      }),
      severity: 'high',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 15,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Slow Response Time',
      alert_type: 'threshold',
      metric_name: 'avg_response_time',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 2000, // 2 seconds
        window: '10m'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 10,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Low User Registrations',
      alert_type: 'threshold',
      metric_name: 'hourly_registrations',
      condition: JSON.stringify({
        operator: 'less_than',
        threshold: 5,
        window: '1h'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 60,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'High Bio Generation Failures',
      alert_type: 'threshold',
      metric_name: 'bio_generation_failure_rate',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 0.15, // 15%
        window: '15m'
      }),
      severity: 'high',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 30,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Database Connection Issues',
      alert_type: 'threshold',
      metric_name: 'database_connection_errors',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 10,
        window: '5m'
      }),
      severity: 'critical',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 5,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Subscription Conversion Drop',
      alert_type: 'threshold',
      metric_name: 'daily_subscription_rate',
      condition: JSON.stringify({
        operator: 'less_than_percent_change',
        threshold: -20, // 20% decrease
        window: '24h',
        comparison_period: '24h'
      }),
      severity: 'high',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 180, // 3 hours
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Critical Memory Usage',
      alert_type: 'threshold',
      metric_name: 'memory_usage_percent',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 90, // 90%
        window: '5m'
      }),
      severity: 'critical',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 10,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'High CPU Usage',
      alert_type: 'threshold',
      metric_name: 'cpu_usage_percent',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 85, // 85%
        window: '10m'
      }),
      severity: 'high',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 15,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Photo Analysis Failures',
      alert_type: 'threshold',
      metric_name: 'photo_analysis_failure_rate',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 0.1, // 10%
        window: '15m'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 30,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Low Daily Active Users',
      alert_type: 'threshold',
      metric_name: 'daily_active_users',
      condition: JSON.stringify({
        operator: 'less_than',
        threshold: 100,
        window: '24h'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 240, // 4 hours
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'High Session Abandonment Rate',
      alert_type: 'threshold',
      metric_name: 'session_abandonment_rate',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 0.7, // 70%
        window: '2h'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 120,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Payment Processing Failures',
      alert_type: 'threshold',
      metric_name: 'payment_failure_rate',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 0.05, // 5%
        window: '30m'
      }),
      severity: 'critical',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 15,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'AI Service Downtime',
      alert_type: 'threshold',
      metric_name: 'ai_service_availability',
      condition: JSON.stringify({
        operator: 'less_than',
        threshold: 0.95, // 95% availability
        window: '10m'
      }),
      severity: 'high',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 10,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Unusual Traffic Spike',
      alert_type: 'anomaly',
      metric_name: 'requests_per_minute',
      condition: JSON.stringify({
        operator: 'anomaly_detection',
        threshold: 3.0, // 3 standard deviations
        window: '5m',
        baseline_period: '1h'
      }),
      severity: 'medium',
      is_active: true,
      notification_channels: JSON.stringify(['email']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 30,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    },

    {
      id: uuidv4(),
      alert_name: 'Security Threat Detection',
      alert_type: 'threshold',
      metric_name: 'security_violations_per_hour',
      condition: JSON.stringify({
        operator: 'greater_than',
        threshold: 20,
        window: '1h'
      }),
      severity: 'critical',
      is_active: true,
      notification_channels: JSON.stringify(['email', 'log']),
      recipients: JSON.stringify([]),
      cooldown_minutes: 5,
      last_triggered: null,
      trigger_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert alert templates
  await knex('analytics_alerts').insert(alertTemplates);

  console.log(`Inserted ${alertTemplates.length} analytics alert templates`);
};