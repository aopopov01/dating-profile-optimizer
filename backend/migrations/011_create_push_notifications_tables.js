exports.up = function(knex) {
  return Promise.all([
    // Device tokens table
    knex.schema.createTable('device_tokens', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token', 255).notNullable();
      table.enum('platform', ['ios', 'android', 'web']).notNullable();
      table.string('app_version');
      table.string('device_id');
      table.string('device_model');
      table.string('os_version');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_used_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.unique(['user_id', 'token']);
      table.index(['user_id']);
      table.index(['platform']);
      table.index(['is_active']);
    }),

    // Push notifications table
    knex.schema.createTable('push_notifications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('title', 255).notNullable();
      table.text('body').notNullable();
      table.json('data'); // Additional data payload
      table.string('image_url');
      table.string('deep_link_url');
      table.enum('category', [
        'onboarding_welcome',
        'bio_completion',
        'photo_analysis_ready',
        'subscription_renewal',
        'subscription_offer',
        'profile_performance',
        'weekly_insights',
        'security_alert',
        'feature_update',
        'engagement_boost',
        'tips_educational',
        'general'
      ]).notNullable();
      table.enum('priority', ['low', 'normal', 'high', 'critical']).defaultTo('normal');
      table.boolean('is_silent').defaultTo(false);
      table.integer('badge_count');
      table.string('sound');
      table.json('action_buttons'); // Interactive notification buttons
      table.enum('status', ['draft', 'scheduled', 'sending', 'sent', 'failed']).defaultTo('draft');
      table.timestamp('scheduled_at');
      table.timestamp('sent_at');
      table.uuid('created_by'); // Admin user who created the notification
      table.timestamps(true, true);
      
      table.index(['category']);
      table.index(['status']);
      table.index(['scheduled_at']);
      table.index(['created_at']);
    }),

    // Notification recipients table (for targeted notifications)
    knex.schema.createTable('notification_recipients', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('notification_id').notNullable();
      table.foreign('notification_id').references('id').inTable('push_notifications').onDelete('CASCADE');
      table.uuid('user_id').notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('delivery_status', ['pending', 'sent', 'delivered', 'failed', 'clicked']).defaultTo('pending');
      table.string('fcm_message_id');
      table.string('error_message');
      table.timestamp('sent_at');
      table.timestamp('delivered_at');
      table.timestamp('clicked_at');
      table.timestamps(true, true);
      
      table.unique(['notification_id', 'user_id']);
      table.index(['user_id']);
      table.index(['delivery_status']);
      table.index(['sent_at']);
    }),

    // User notification preferences
    knex.schema.createTable('notification_preferences', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().unique();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Global settings
      table.boolean('enabled').defaultTo(true);
      table.time('quiet_hours_start'); // e.g., '22:00:00'
      table.time('quiet_hours_end');   // e.g., '08:00:00'
      table.string('timezone', 50);
      
      // Category preferences
      table.boolean('onboarding_welcome').defaultTo(true);
      table.boolean('bio_completion').defaultTo(true);
      table.boolean('photo_analysis_ready').defaultTo(true);
      table.boolean('subscription_renewal').defaultTo(true);
      table.boolean('subscription_offer').defaultTo(true);
      table.boolean('profile_performance').defaultTo(true);
      table.boolean('weekly_insights').defaultTo(true);
      table.boolean('security_alert').defaultTo(true);
      table.boolean('feature_update').defaultTo(true);
      table.boolean('engagement_boost').defaultTo(true);
      table.boolean('tips_educational').defaultTo(true);
      table.boolean('general').defaultTo(true);
      
      // Delivery preferences
      table.enum('frequency', ['immediate', 'daily', 'weekly', 'never']).defaultTo('immediate');
      table.integer('max_daily_notifications').defaultTo(5);
      
      table.timestamps(true, true);
    }),

    // Notification templates
    knex.schema.createTable('notification_templates', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable().unique();
      table.string('category', 50).notNullable();
      table.string('title_template', 255).notNullable();
      table.text('body_template').notNullable();
      table.json('data_template');
      table.string('image_url_template');
      table.string('deep_link_template');
      table.json('action_buttons_template');
      table.json('variables'); // Available template variables
      table.boolean('is_active').defaultTo(true);
      table.string('language', 5).defaultTo('en');
      table.timestamps(true, true);
      
      table.index(['category']);
      table.index(['language']);
      table.index(['is_active']);
    }),

    // A/B testing for notifications
    knex.schema.createTable('notification_ab_tests', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 100).notNullable();
      table.text('description');
      table.uuid('template_a_id').notNullable();
      table.uuid('template_b_id').notNullable();
      table.foreign('template_a_id').references('id').inTable('notification_templates');
      table.foreign('template_b_id').references('id').inTable('notification_templates');
      table.integer('traffic_split_percentage').defaultTo(50); // Percentage for variant A
      table.enum('status', ['draft', 'active', 'paused', 'completed']).defaultTo('draft');
      table.timestamp('start_date');
      table.timestamp('end_date');
      table.json('targeting_criteria'); // User segments, etc.
      table.timestamps(true, true);
      
      table.index(['status']);
      table.index(['start_date']);
    }),

    // Notification analytics
    knex.schema.createTable('notification_analytics', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('notification_id').notNullable();
      table.foreign('notification_id').references('id').inTable('push_notifications').onDelete('CASCADE');
      table.date('date').notNullable();
      table.integer('sent_count').defaultTo(0);
      table.integer('delivered_count').defaultTo(0);
      table.integer('opened_count').defaultTo(0);
      table.integer('clicked_count').defaultTo(0);
      table.integer('converted_count').defaultTo(0); // Based on deep link action
      table.decimal('open_rate', 5, 2);
      table.decimal('click_rate', 5, 2);
      table.decimal('conversion_rate', 5, 2);
      table.timestamps(true, true);
      
      table.unique(['notification_id', 'date']);
      table.index(['date']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('notification_analytics'),
    knex.schema.dropTableIfExists('notification_ab_tests'),
    knex.schema.dropTableIfExists('notification_templates'),
    knex.schema.dropTableIfExists('notification_preferences'),
    knex.schema.dropTableIfExists('notification_recipients'),
    knex.schema.dropTableIfExists('push_notifications'),
    knex.schema.dropTableIfExists('device_tokens')
  ]);
};