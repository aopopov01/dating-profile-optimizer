exports.up = function(knex) {
  return knex.schema.createTable('success_metrics', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('platform').notNullable(); // tinder, bumble, hinge, match
    table.integer('matches_before'); // Matches before optimization
    table.integer('matches_after'); // Matches after optimization
    table.integer('likes_received_before');
    table.integer('likes_received_after');
    table.integer('messages_received_before');
    table.integer('messages_received_after');
    table.integer('dates_arranged_before');
    table.integer('dates_arranged_after');
    table.integer('tracking_period_days').defaultTo(30);
    table.timestamp('optimization_date'); // When user applied optimization
    table.timestamp('measurement_start_date');
    table.timestamp('measurement_end_date');
    table.decimal('improvement_percentage', 5, 2); // Calculated improvement
    table.boolean('guarantee_eligible').defaultTo(true); // For money-back guarantee
    table.timestamp('reported_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['platform']);
    table.index(['guarantee_eligible']);
    table.index(['optimization_date']);
    table.index(['reported_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('success_metrics');
};