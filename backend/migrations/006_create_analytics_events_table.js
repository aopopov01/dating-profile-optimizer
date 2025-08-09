exports.up = function(knex) {
  return knex.schema.createTable('analytics_events', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('event_name').notNullable(); // photos_uploaded, analysis_completed, bio_generated, etc.
    table.json('event_properties'); // Additional event data
    table.string('session_id');
    table.string('device_id');
    table.string('platform'); // ios, android, web
    table.string('app_version');
    table.string('device_model');
    table.string('os_version');
    table.string('user_agent');
    table.string('ip_address');
    table.string('country');
    table.string('city');
    table.timestamp('event_timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['event_name']);
    table.index(['platform']);
    table.index(['event_timestamp']);
    table.index(['session_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('analytics_events');
};