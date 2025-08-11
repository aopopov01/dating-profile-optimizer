/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Safety Check-ins table
    .createTable('safety_check_ins', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('date_location').notNullable();
      table.timestamp('date_time').notNullable();
      table.string('emergency_contact');
      table.timestamp('check_in_scheduled');
      table.enum('status', ['scheduled', 'completed', 'missed', 'emergency']).defaultTo('scheduled');
      table.timestamp('completed_at');
      table.text('notes');
      table.timestamps(true, true);
      
      table.index(['user_id', 'status']);
      table.index(['check_in_scheduled']);
    })

    // Emergency Alerts table
    .createTable('emergency_alerts', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('alert_type', ['emergency', 'safety_concern', 'check_in_missed']).notNullable();
      table.json('location'); // GPS coordinates, address
      table.text('message');
      table.enum('status', ['active', 'resolved', 'false_alarm']).defaultTo('active');
      table.uuid('responded_by').references('id').inTable('users');
      table.timestamp('resolved_at');
      table.text('resolution_notes');
      table.timestamps(true, true);
      
      table.index(['user_id', 'status']);
      table.index(['alert_type', 'status']);
    })

    // User Verification table
    .createTable('user_verification', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.enum('photo_verification_status', ['not_started', 'pending', 'verified', 'rejected']).defaultTo('not_started');
      table.string('photo_verification_url');
      table.timestamp('photo_verified_at');
      table.enum('identity_verification_status', ['not_started', 'pending', 'verified', 'rejected']).defaultTo('not_started');
      table.json('identity_verification_data');
      table.timestamp('identity_verified_at');
      table.enum('background_check_status', ['not_started', 'pending', 'cleared', 'flagged']).defaultTo('not_started');
      table.json('background_check_results');
      table.timestamp('background_check_at');
      table.integer('verification_score').defaultTo(0);
      table.text('verification_notes');
      table.uuid('verified_by').references('id').inTable('users');
      table.timestamps(true, true);
      
      table.index(['photo_verification_status']);
      table.index(['identity_verification_status']);
      table.index(['verification_score']);
    })

    // Safety Education table
    .createTable('safety_education', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.enum('category', ['dating_safety', 'online_safety', 'emergency_procedures', 'red_flags', 'consent']).notNullable();
      table.enum('format', ['article', 'video', 'interactive', 'checklist']).notNullable();
      table.string('media_url');
      table.integer('estimated_read_time'); // in minutes
      table.boolean('mandatory').defaultTo(false);
      table.boolean('active').defaultTo(true);
      table.integer('display_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['category', 'active']);
    })

    // User Safety Education Progress table
    .createTable('user_safety_education_progress', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('education_id').references('id').inTable('safety_education').onDelete('CASCADE');
      table.enum('status', ['not_started', 'in_progress', 'completed']).defaultTo('not_started');
      table.integer('progress_percentage').defaultTo(0);
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.integer('time_spent_minutes').defaultTo(0);
      table.timestamps(true, true);
      
      table.unique(['user_id', 'education_id']);
      table.index(['user_id', 'status']);
    })

    // Fake Profile Detection table
    .createTable('fake_profile_detection', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.decimal('fake_probability_score', 3, 2).notNullable(); // 0.00 to 1.00
      table.json('detection_factors'); // What factors contributed to the score
      table.enum('status', ['pending_review', 'verified_real', 'confirmed_fake', 'suspicious']).defaultTo('pending_review');
      table.text('analysis_notes');
      table.uuid('reviewed_by').references('id').inTable('users');
      table.timestamp('reviewed_at');
      table.timestamps(true, true);
      
      table.index(['fake_probability_score']);
      table.index(['status']);
      table.index(['user_id']);
    })

    // Dating Safety Tips table
    .createTable('dating_safety_tips', function(table) {
      table.increments('id').primary();
      table.string('tip_category').notNullable();
      table.text('tip_content').notNullable();
      table.enum('importance_level', ['low', 'medium', 'high', 'critical']).notNullable();
      table.json('applicable_situations'); // When this tip applies
      table.boolean('show_to_new_users').defaultTo(false);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['tip_category', 'importance_level']);
    })

    // User Consent Tracking table
    .createTable('user_consent_tracking', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('consent_type', [
        'terms_of_service',
        'privacy_policy',
        'data_processing',
        'marketing_communications',
        'photo_sharing',
        'location_sharing',
        'safety_features',
        'background_check'
      ]).notNullable();
      table.boolean('consent_given').notNullable();
      table.string('consent_version').notNullable(); // Version of the consent document
      table.timestamp('consent_timestamp').defaultTo(knex.fn.now());
      table.string('consent_method'); // how consent was obtained (checkbox, signature, etc.)
      table.json('consent_context'); // Additional context about when/how consent was given
      table.timestamp('consent_withdrawn_at');
      table.timestamps(true, true);
      
      table.index(['user_id', 'consent_type']);
      table.index(['consent_given']);
    })

    // Age Verification table
    .createTable('age_verification', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.date('date_of_birth'); // User provided DOB
      table.enum('verification_method', [
        'government_id',
        'credit_card',
        'face_analysis',
        'phone_verification',
        'manual_review'
      ]);
      table.enum('verification_status', ['not_verified', 'pending', 'verified', 'rejected']).defaultTo('not_verified');
      table.integer('estimated_age'); // AI estimated age from photos
      table.decimal('age_confidence_score', 3, 2); // Confidence in age estimate
      table.json('verification_evidence'); // Encrypted storage references
      table.uuid('verified_by').references('id').inTable('users');
      table.timestamp('verified_at');
      table.text('rejection_reason');
      table.timestamps(true, true);
      
      table.index(['verification_status']);
      table.index(['estimated_age']);
    })

    // Content Filter Presets table
    .createTable('content_filter_presets', function(table) {
      table.increments('id').primary();
      table.string('preset_name').notNullable();
      table.enum('filter_level', ['minimal', 'moderate', 'strict']).notNullable();
      table.text('description');
      table.json('filter_rules'); // Rules for what content to filter
      table.json('blocked_categories'); // Categories of content to block
      table.decimal('toxicity_threshold', 3, 2); // AI toxicity threshold
      table.boolean('block_contact_sharing').defaultTo(true);
      table.boolean('block_external_links').defaultTo(true);
      table.boolean('require_photo_verification').defaultTo(false);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    })

    // Machine Learning Model Performance table
    .createTable('ml_model_performance', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('model_name').notNullable();
      table.string('model_version').notNullable();
      table.enum('model_type', ['image_classification', 'text_analysis', 'fake_detection', 'age_estimation']).notNullable();
      table.date('evaluation_date').notNullable();
      table.decimal('accuracy', 5, 4); // e.g., 0.9485 = 94.85%
      table.decimal('precision', 5, 4);
      table.decimal('recall', 5, 4);
      table.decimal('f1_score', 5, 4);
      table.integer('true_positives').defaultTo(0);
      table.integer('true_negatives').defaultTo(0);
      table.integer('false_positives').defaultTo(0);
      table.integer('false_negatives').defaultTo(0);
      table.json('confusion_matrix');
      table.text('evaluation_notes');
      table.timestamps(true, true);
      
      table.index(['model_name', 'model_version']);
      table.index(['evaluation_date']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('ml_model_performance')
    .dropTableIfExists('content_filter_presets')
    .dropTableIfExists('age_verification')
    .dropTableIfExists('user_consent_tracking')
    .dropTableIfExists('dating_safety_tips')
    .dropTableIfExists('fake_profile_detection')
    .dropTableIfExists('user_safety_education_progress')
    .dropTableIfExists('safety_education')
    .dropTableIfExists('user_verification')
    .dropTableIfExists('emergency_alerts')
    .dropTableIfExists('safety_check_ins');
};