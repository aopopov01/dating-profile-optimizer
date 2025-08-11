exports.up = function(knex) {
  return Promise.all([
    // Two-Factor Authentication table
    knex.schema.createTable('user_2fa', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.boolean('is_enabled').defaultTo(false);
      table.string('secret_key').nullable(); // TOTP secret
      table.text('backup_codes').nullable(); // JSON array of backup codes
      table.string('phone_number').nullable(); // For SMS 2FA
      table.boolean('phone_verified').defaultTo(false);
      table.string('preferred_method').defaultTo('sms'); // 'sms', 'totp', 'both'
      table.timestamp('last_used_at').nullable();
      table.integer('failed_attempts').defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['phone_number']);
    }),

    // 2FA verification attempts table
    knex.schema.createTable('2fa_attempts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('method'); // 'sms', 'totp', 'backup'
      table.string('code_sent').nullable(); // Hashed code for SMS
      table.boolean('successful').defaultTo(false);
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('expires_at').nullable();
      table.timestamp('attempted_at').defaultTo(knex.fn.now());
      
      table.index(['user_id']);
      table.index(['attempted_at']);
      table.index(['expires_at']);
    }),

    // Phone verification table
    knex.schema.createTable('phone_verifications', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable();
      table.string('phone_number').notNullable();
      table.string('verification_code').notNullable();
      table.string('purpose').notNullable(); // 'registration', '2fa_setup', 'phone_change'
      table.integer('attempts').defaultTo(0);
      table.boolean('verified').defaultTo(false);
      table.string('ip_address').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('verified_at').nullable();
      table.timestamps(true, true);
      
      table.index(['phone_number']);
      table.index(['user_id']);
      table.index(['expires_at']);
    }),

    // Device fingerprints and tracking
    knex.schema.createTable('user_devices', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('device_id').notNullable(); // Generated device fingerprint
      table.string('device_name').nullable(); // User-friendly name
      table.json('fingerprint_data'); // Browser/device fingerprint details
      table.string('device_type'); // 'mobile', 'desktop', 'tablet'
      table.string('os_name').nullable();
      table.string('os_version').nullable();
      table.string('browser_name').nullable();
      table.string('browser_version').nullable();
      table.boolean('is_trusted').defaultTo(false);
      table.integer('trust_score').defaultTo(0); // 0-100 trust score
      table.timestamp('first_seen_at').defaultTo(knex.fn.now());
      table.timestamp('last_seen_at').defaultTo(knex.fn.now());
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['device_id']);
      table.unique(['user_id', 'device_id']);
    }),

    // Enhanced session management
    knex.schema.createTable('enhanced_sessions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('device_id').references('id').inTable('user_devices').onDelete('CASCADE');
      table.string('session_token').notNullable().unique();
      table.string('ip_address').notNullable();
      table.json('location_data').nullable(); // GeoIP location
      table.boolean('is_active').defaultTo(true);
      table.boolean('requires_2fa').defaultTo(false);
      table.boolean('2fa_verified').defaultTo(false);
      table.timestamp('last_activity').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.string('termination_reason').nullable(); // 'logout', 'timeout', 'security', 'admin'
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['device_id']);
      table.index(['session_token']);
      table.index(['expires_at']);
      table.index(['last_activity']);
    }),

    // Security events and suspicious activity
    knex.schema.createTable('security_events', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable();
      table.string('event_type').notNullable(); // 'suspicious_login', 'brute_force', 'device_change', etc.
      table.string('severity').notNullable(); // 'low', 'medium', 'high', 'critical'
      table.json('event_data'); // Detailed event information
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      table.json('location_data').nullable();
      table.boolean('is_resolved').defaultTo(false);
      table.string('resolution_action').nullable(); // 'ignored', 'account_locked', 'password_reset', etc.
      table.uuid('resolved_by').references('id').inTable('users').nullable();
      table.timestamp('resolved_at').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['event_type']);
      table.index(['severity']);
      table.index(['created_at']);
      table.index(['is_resolved']);
    }),

    // Security questions
    knex.schema.createTable('security_questions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('question').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
    }),

    // User security question answers
    knex.schema.createTable('user_security_answers', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('question_id').references('id').inTable('security_questions').onDelete('CASCADE');
      table.text('answer_hash').notNullable(); // Hashed answer
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.unique(['user_id', 'question_id']);
    }),

    // Account lockouts and security policies
    knex.schema.createTable('account_lockouts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('lockout_type').notNullable(); // 'login_attempts', 'suspicious_activity', 'admin', '2fa_attempts'
      table.string('reason').notNullable();
      table.json('lockout_data').nullable(); // Additional context
      table.timestamp('locked_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.boolean('is_active').defaultTo(true);
      table.uuid('locked_by').references('id').inTable('users').nullable(); // Admin who locked account
      table.uuid('unlocked_by').references('id').inTable('users').nullable();
      table.timestamp('unlocked_at').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['lockout_type']);
      table.index(['is_active']);
      table.index(['expires_at']);
    }),

    // Biometric authentication data
    knex.schema.createTable('biometric_auth', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('device_id').references('id').inTable('user_devices').onDelete('CASCADE');
      table.string('biometric_type').notNullable(); // 'face_id', 'touch_id', 'fingerprint', 'voice'
      table.text('biometric_hash').nullable(); // Hashed biometric template (if applicable)
      table.boolean('is_enabled').defaultTo(false);
      table.json('settings').nullable(); // Biometric-specific settings
      table.timestamp('last_used_at').nullable();
      table.integer('success_count').defaultTo(0);
      table.integer('failure_count').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['device_id']);
      table.unique(['user_id', 'device_id', 'biometric_type']);
    }),

    // Password history (prevent reuse)
    knex.schema.createTable('password_history', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('password_hash').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['user_id']);
      table.index(['created_at']);
    }),

    // Encryption keys management
    knex.schema.createTable('encryption_keys', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('key_type').notNullable(); // 'data_encryption', 'message_encryption'
      table.text('encrypted_key').notNullable(); // Key encrypted with master key
      table.string('key_version').defaultTo('1');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('expires_at').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['key_type']);
      table.index(['is_active']);
    }),

    // Privacy settings and data handling
    knex.schema.createTable('privacy_settings', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').unique();
      table.boolean('data_analytics_consent').defaultTo(false);
      table.boolean('marketing_consent').defaultTo(false);
      table.boolean('location_tracking_consent').defaultTo(false);
      table.boolean('biometric_consent').defaultTo(false);
      table.json('data_retention_preferences').nullable();
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['user_id']);
    }),

    // Biometric challenges for client-side verification
    knex.schema.createTable('biometric_challenges', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('device_id').references('id').inTable('user_devices').onDelete('CASCADE');
      table.string('challenge').notNullable();
      table.bigInteger('timestamp').notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
      
      table.index(['user_id', 'device_id']);
      table.index(['expires_at']);
      table.unique(['user_id', 'device_id']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('biometric_challenges'),
    knex.schema.dropTableIfExists('privacy_settings'),
    knex.schema.dropTableIfExists('encryption_keys'),
    knex.schema.dropTableIfExists('password_history'),
    knex.schema.dropTableIfExists('biometric_auth'),
    knex.schema.dropTableIfExists('account_lockouts'),
    knex.schema.dropTableIfExists('user_security_answers'),
    knex.schema.dropTableIfExists('security_questions'),
    knex.schema.dropTableIfExists('security_events'),
    knex.schema.dropTableIfExists('enhanced_sessions'),
    knex.schema.dropTableIfExists('user_devices'),
    knex.schema.dropTableIfExists('phone_verifications'),
    knex.schema.dropTableIfExists('2fa_attempts'),
    knex.schema.dropTableIfExists('user_2fa')
  ]);
};