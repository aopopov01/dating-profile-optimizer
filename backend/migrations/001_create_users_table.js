exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.integer('age');
    table.string('gender'); // male, female, non-binary, other
    table.string('location');
    table.json('interests'); // Array of interests/hobbies
    table.string('profession');
    table.string('personality_type'); // extroverted, introverted, balanced
    table.json('target_platforms'); // Array: tinder, bumble, hinge, match
    table.string('subscription_status').defaultTo('free'); // free, premium
    table.integer('credits_remaining').defaultTo(1); // Free analysis
    table.timestamp('last_active').defaultTo(knex.fn.now());
    table.timestamp('subscription_expires_at');
    table.string('stripe_customer_id');
    table.boolean('is_active').defaultTo(true);
    table.json('preferences'); // User preferences and settings
    table.timestamps(true, true);
    
    // Indexes
    table.index(['email']);
    table.index(['subscription_status']);
    table.index(['is_active']);
    table.index(['gender']);
    table.index(['age']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};