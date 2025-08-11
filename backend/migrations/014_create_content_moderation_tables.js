/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Content Moderation Settings table
    .createTable('content_moderation_settings', function(table) {
      table.increments('id').primary();
      table.enum('content_type', ['image', 'text', 'bio', 'chat', 'profile']).notNullable();
      table.enum('severity_level', ['low', 'medium', 'high', 'critical']).notNullable();
      table.enum('action_type', ['approve', 'flag', 'block', 'review_required']).notNullable();
      table.decimal('confidence_threshold', 3, 2).defaultTo(0.8);
      table.json('detection_rules').notNullable();
      table.boolean('enabled').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['content_type', 'severity_level']);
    })

    // Content Moderation Queue table
    .createTable('content_moderation_queue', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('content_type', ['image', 'text', 'bio', 'chat', 'profile']).notNullable();
      table.text('content_url'); // For images, files
      table.text('content_text'); // For text content
      table.json('content_metadata'); // Additional content info
      table.enum('status', ['pending', 'approved', 'rejected', 'flagged', 'escalated']).defaultTo('pending');
      table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.uuid('assigned_moderator').references('id').inTable('users');
      table.decimal('ai_confidence_score', 3, 2);
      table.json('ai_detection_results');
      table.json('moderation_flags');
      table.text('moderator_notes');
      table.timestamp('submitted_at').defaultTo(knex.fn.now());
      table.timestamp('reviewed_at');
      table.timestamps(true, true);
      
      table.index(['status', 'priority']);
      table.index(['user_id', 'content_type']);
      table.index(['assigned_moderator']);
    })

    // User Reports table
    .createTable('user_reports', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('reported_user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('reported_content_id'); // References various content tables
      table.enum('report_type', ['inappropriate_content', 'harassment', 'spam', 'fake_profile', 'underage', 'violence', 'discrimination', 'other']).notNullable();
      table.text('description');
      table.json('evidence_urls'); // Screenshots, etc.
      table.enum('status', ['pending', 'investigating', 'resolved', 'dismissed']).defaultTo('pending');
      table.uuid('assigned_moderator').references('id').inTable('users');
      table.text('resolution_notes');
      table.enum('priority', ['low', 'medium', 'high', 'critical']).defaultTo('medium');
      table.timestamp('resolved_at');
      table.timestamps(true, true);
      
      table.index(['reporter_id']);
      table.index(['reported_user_id']);
      table.index(['status', 'priority']);
    })

    // Content Violations table
    .createTable('content_violations', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('content_id'); // Could reference various content tables
      table.enum('content_type', ['image', 'text', 'bio', 'chat', 'profile']).notNullable();
      table.enum('violation_type', ['nsfw', 'violence', 'hate_speech', 'spam', 'fake_profile', 'underage', 'harassment', 'discrimination', 'inappropriate_language', 'other']).notNullable();
      table.enum('severity', ['low', 'medium', 'high', 'critical']).notNullable();
      table.text('description').notNullable();
      table.json('detection_details'); // AI/ML detection details
      table.decimal('confidence_score', 3, 2);
      table.enum('action_taken', ['warning', 'content_removed', 'account_suspended', 'account_banned', 'none']).defaultTo('none');
      table.boolean('user_notified').defaultTo(false);
      table.uuid('moderator_id').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['user_id', 'violation_type']);
      table.index(['severity', 'action_taken']);
    })

    // Moderation Actions table
    .createTable('moderation_actions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('moderator_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('target_user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('content_id'); // References content being moderated
      table.enum('action_type', ['approve', 'reject', 'flag', 'remove_content', 'warn_user', 'suspend_user', 'ban_user', 'escalate']).notNullable();
      table.text('reason').notNullable();
      table.json('action_details');
      table.timestamp('expires_at'); // For temporary actions
      table.boolean('notify_user').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['moderator_id']);
      table.index(['target_user_id', 'action_type']);
    })

    // User Safety Settings table
    .createTable('user_safety_settings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.boolean('auto_block_inappropriate').defaultTo(true);
      table.boolean('require_photo_verification').defaultTo(false);
      table.json('blocked_users').defaultTo('[]');
      table.json('blocked_keywords').defaultTo('[]');
      table.enum('content_filter_level', ['strict', 'moderate', 'minimal']).defaultTo('moderate');
      table.boolean('report_notifications').defaultTo(true);
      table.timestamps(true, true);
    })

    // AI Detection Models table
    .createTable('ai_detection_models', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('version').notNullable();
      table.enum('model_type', ['nsfw', 'violence', 'text_toxicity', 'face_detection', 'age_estimation', 'fake_detection']).notNullable();
      table.text('description');
      table.string('endpoint_url');
      table.json('configuration');
      table.decimal('accuracy_rate', 5, 4);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      table.unique(['name', 'version']);
    })

    // Content Appeals table
    .createTable('content_appeals', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('violation_id').references('id').inTable('content_violations').onDelete('CASCADE');
      table.text('appeal_reason').notNullable();
      table.json('supporting_evidence');
      table.enum('status', ['pending', 'under_review', 'approved', 'denied']).defaultTo('pending');
      table.uuid('reviewed_by').references('id').inTable('users');
      table.text('review_notes');
      table.timestamp('reviewed_at');
      table.timestamps(true, true);
      
      table.index(['user_id', 'status']);
      table.index(['violation_id']);
    })

    // Moderation Analytics table
    .createTable('moderation_analytics', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.date('date').notNullable();
      table.enum('content_type', ['image', 'text', 'bio', 'chat', 'profile']).notNullable();
      table.integer('total_processed').defaultTo(0);
      table.integer('auto_approved').defaultTo(0);
      table.integer('auto_rejected').defaultTo(0);
      table.integer('flagged_for_review').defaultTo(0);
      table.integer('manual_reviews').defaultTo(0);
      table.integer('false_positives').defaultTo(0);
      table.integer('false_negatives').defaultTo(0);
      table.decimal('avg_processing_time_ms', 8, 2);
      table.json('violation_breakdown');
      table.timestamps(true, true);
      
      table.unique(['date', 'content_type']);
      table.index(['date']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('moderation_analytics')
    .dropTableIfExists('content_appeals')
    .dropTableIfExists('ai_detection_models')
    .dropTableIfExists('user_safety_settings')
    .dropTableIfExists('moderation_actions')
    .dropTableIfExists('content_violations')
    .dropTableIfExists('user_reports')
    .dropTableIfExists('content_moderation_queue')
    .dropTableIfExists('content_moderation_settings');
};