/**
 * Comprehensive Analytics Tables Migration
 * Creates tables for enhanced analytics, error tracking, and performance monitoring
 */

exports.up = function(knex) {
  return knex.schema
    // Enhanced Error Tracking
    .createTable('error_logs', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('error_type', 100).notNullable();
      table.string('error_code', 50).nullable();
      table.text('message').notNullable();
      table.text('stack_trace').nullable();
      table.string('severity', 20).defaultTo('error'); // error, warning, critical
      table.json('context').nullable(); // Additional error context
      table.string('source', 100).nullable(); // API endpoint, service, etc.
      table.string('user_agent').nullable();
      table.inet('ip_address').nullable();
      table.string('request_id').nullable();
      table.json('request_data').nullable();
      table.boolean('resolved').defaultTo(false);
      table.timestamp('resolved_at').nullable();
      table.text('resolution_notes').nullable();
      table.timestamps(true, true);
      
      // Indexes for efficient querying
      table.index(['error_type', 'created_at']);
      table.index(['severity', 'created_at']);
      table.index(['user_id', 'created_at']);
      table.index(['resolved', 'created_at']);
      table.index('request_id');
    })

    // Performance Metrics
    .createTable('performance_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('metric_type', 50).notNullable(); // response_time, memory_usage, cpu_usage, etc.
      table.string('endpoint', 200).nullable();
      table.string('method', 10).nullable(); // GET, POST, etc.
      table.decimal('value', 12, 4).notNullable();
      table.string('unit', 20).notNullable(); // ms, bytes, percentage, etc.
      table.json('metadata').nullable();
      table.string('instance_id').nullable(); // For distributed systems
      table.timestamp('recorded_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['metric_type', 'recorded_at']);
      table.index(['endpoint', 'recorded_at']);
      table.index(['user_id', 'recorded_at']);
    })

    // Enhanced User Behavior Analytics
    .createTable('user_behavior_events', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.uuid('session_id').notNullable();
      table.string('event_name', 100).notNullable();
      table.string('event_category', 50).notNullable(); // user_action, system_event, etc.
      table.json('properties').nullable();
      table.json('user_properties').nullable();
      table.string('platform', 30).nullable(); // ios, android, web
      table.string('app_version', 20).nullable();
      table.string('device_type', 50).nullable();
      table.string('os_version', 50).nullable();
      table.string('country', 5).nullable();
      table.string('city', 100).nullable();
      table.decimal('lat', 10, 8).nullable();
      table.decimal('lng', 11, 8).nullable();
      table.string('referrer', 500).nullable();
      table.string('utm_source', 100).nullable();
      table.string('utm_medium', 100).nullable();
      table.string('utm_campaign', 100).nullable();
      table.integer('sequence_number').nullable(); // Event order in session
      table.timestamp('client_timestamp').nullable();
      table.timestamp('server_timestamp').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['user_id', 'server_timestamp']);
      table.index(['session_id', 'sequence_number']);
      table.index(['event_name', 'server_timestamp']);
      table.index(['event_category', 'server_timestamp']);
      table.index(['platform', 'server_timestamp']);
    })

    // User Sessions
    .createTable('user_sessions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.uuid('session_id').notNullable().unique();
      table.timestamp('session_start').defaultTo(knex.fn.now());
      table.timestamp('session_end').nullable();
      table.integer('duration_seconds').nullable();
      table.integer('event_count').defaultTo(0);
      table.string('platform', 30).nullable();
      table.string('app_version', 20).nullable();
      table.string('device_id', 100).nullable();
      table.json('device_info').nullable();
      table.string('country', 5).nullable();
      table.string('city', 100).nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['user_id', 'session_start']);
      table.index(['session_start']);
      table.index(['is_active']);
    })

    // A/B Testing Results (Enhanced)
    .createTable('ab_tests', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('test_name', 200).notNullable();
      table.string('test_type', 100).notNullable();
      table.text('description').nullable();
      table.string('status', 20).defaultTo('active'); // active, paused, completed, cancelled
      table.json('variants').notNullable(); // Array of variant configurations
      table.string('target_metric', 100).notNullable();
      table.decimal('confidence_level', 3, 2).defaultTo(0.95);
      table.integer('minimum_sample_size').notNullable();
      table.integer('max_duration_days').nullable();
      table.json('metadata').nullable();
      table.json('analysis_results').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('ended_at').nullable();
      table.timestamp('last_analyzed').nullable();
      table.string('stop_reason').nullable();
      table.json('final_results').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id', 'status']);
      table.index(['status', 'started_at']);
      table.index(['test_type', 'status']);
    })

    // A/B Test Interactions
    .createTable('ab_test_interactions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('test_id').references('id').inTable('ab_tests').onDelete('CASCADE');
      table.string('variant_id', 50).notNullable();
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('interaction_type', 100).notNullable();
      table.decimal('value', 12, 4).defaultTo(1);
      table.json('metadata').nullable();
      table.timestamp('interaction_timestamp').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['test_id', 'variant_id', 'interaction_timestamp']);
      table.index(['user_id', 'interaction_timestamp']);
    })

    // Business Intelligence Metrics
    .createTable('business_metrics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('metric_name', 100).notNullable();
      table.string('metric_category', 50).notNullable(); // revenue, user_acquisition, engagement, etc.
      table.decimal('value', 15, 4).notNullable();
      table.string('unit', 20).notNullable();
      table.date('metric_date').notNullable();
      table.string('granularity', 20).defaultTo('daily'); // hourly, daily, weekly, monthly
      table.json('dimensions').nullable(); // Additional grouping dimensions
      table.json('metadata').nullable();
      table.timestamps(true, true);
      
      table.unique(['metric_name', 'metric_date', 'granularity']);
      table.index(['metric_category', 'metric_date']);
      table.index(['metric_name', 'metric_date']);
    })

    // Feature Usage Analytics
    .createTable('feature_usage', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('feature_name', 100).notNullable();
      table.string('usage_type', 50).notNullable(); // started, completed, failed, abandoned
      table.json('feature_data').nullable();
      table.integer('duration_ms').nullable();
      table.boolean('success').nullable();
      table.string('failure_reason').nullable();
      table.decimal('performance_score', 5, 2).nullable();
      table.json('context').nullable();
      table.timestamps(true, true);
      
      table.index(['feature_name', 'created_at']);
      table.index(['user_id', 'created_at']);
      table.index(['usage_type', 'created_at']);
    })

    // Cohort Analysis
    .createTable('user_cohorts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('cohort_type', 50).notNullable(); // registration_month, first_purchase_month, etc.
      table.string('cohort_identifier', 50).notNullable(); // 2024-01, premium_users, etc.
      table.date('cohort_date').notNullable();
      table.json('cohort_properties').nullable();
      table.timestamps(true, true);
      
      table.unique(['user_id', 'cohort_type']);
      table.index(['cohort_type', 'cohort_identifier']);
      table.index(['cohort_date']);
    })

    // Real-time Alerts
    .createTable('analytics_alerts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('alert_name', 200).notNullable();
      table.string('alert_type', 50).notNullable(); // threshold, anomaly, trend
      table.string('metric_name', 100).notNullable();
      table.text('condition').notNullable(); // Alert condition (JSON or SQL)
      table.string('severity', 20).defaultTo('medium'); // low, medium, high, critical
      table.boolean('is_active').defaultTo(true);
      table.json('notification_channels').nullable(); // email, slack, sms
      table.json('recipients').nullable();
      table.integer('cooldown_minutes').defaultTo(60);
      table.timestamp('last_triggered').nullable();
      table.integer('trigger_count').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['metric_name', 'is_active']);
      table.index(['alert_type', 'is_active']);
    })

    // Alert History
    .createTable('alert_history', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('alert_id').references('id').inTable('analytics_alerts').onDelete('CASCADE');
      table.string('status', 20).notNullable(); // triggered, resolved, suppressed
      table.decimal('trigger_value', 15, 4).nullable();
      table.json('context').nullable();
      table.text('message').nullable();
      table.timestamp('triggered_at').defaultTo(knex.fn.now());
      table.timestamp('resolved_at').nullable();
      table.boolean('notification_sent').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['alert_id', 'triggered_at']);
      table.index(['status', 'triggered_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('alert_history')
    .dropTableIfExists('analytics_alerts')
    .dropTableIfExists('user_cohorts')
    .dropTableIfExists('feature_usage')
    .dropTableIfExists('business_metrics')
    .dropTableIfExists('ab_test_interactions')
    .dropTableIfExists('ab_tests')
    .dropTableIfExists('user_sessions')
    .dropTableIfExists('user_behavior_events')
    .dropTableIfExists('performance_metrics')
    .dropTableIfExists('error_logs');
};