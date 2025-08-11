exports.up = function(knex) {
  return Promise.all([
    // Create refresh tokens table
    knex.schema.createTable('refresh_tokens', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('is_revoked').defaultTo(false);
      table.string('ip_address');
      table.string('user_agent');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token']);
      table.index(['expires_at']);
    }),

    // Create password reset tokens table
    knex.schema.createTable('password_reset_tokens', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.string('ip_address');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token']);
    }),

    // Create email verification tokens table  
    knex.schema.createTable('email_verification_tokens', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('token').notNullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['token']);
    }),

    // Create login attempts table for security
    knex.schema.createTable('login_attempts', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('email').notNullable();
      table.string('ip_address').notNullable();
      table.boolean('successful').notNullable();
      table.string('user_agent');
      table.timestamp('attempted_at').defaultTo(knex.fn.now());
      
      table.index(['email']);
      table.index(['ip_address']);
      table.index(['attempted_at']);
    }),

    // Create user sessions table
    knex.schema.createTable('user_sessions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('session_token').notNullable().unique();
      table.string('ip_address');
      table.string('user_agent');
      table.timestamp('expires_at').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.json('device_info'); // Browser, OS, etc.
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['session_token']);
      table.index(['expires_at']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('user_sessions'),
    knex.schema.dropTableIfExists('login_attempts'),  
    knex.schema.dropTableIfExists('email_verification_tokens'),
    knex.schema.dropTableIfExists('password_reset_tokens'),
    knex.schema.dropTableIfExists('refresh_tokens')
  ]);
};