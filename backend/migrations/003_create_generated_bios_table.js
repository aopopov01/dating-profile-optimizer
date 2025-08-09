exports.up = function(knex) {
  return knex.schema.createTable('generated_bios', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('bio_text').notNullable();
    table.integer('character_count');
    table.string('personality_style'); // witty, sincere, adventurous, professional
    table.string('target_platform'); // tinder, bumble, hinge, general
    table.integer('personality_match_score'); // How well it matches user personality (1-100)
    table.integer('engagement_prediction'); // Predicted engagement score (1-100)
    table.json('used_interests'); // Which user interests were included
    table.json('conversation_starters'); // Built-in conversation hooks
    table.string('tone'); // funny, serious, romantic, casual
    table.boolean('is_selected').defaultTo(false); // User's chosen bio
    table.integer('user_rating'); // User feedback 1-5
    table.decimal('generation_cost', 10, 4); // OpenAI API cost
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['is_selected']);
    table.index(['personality_style']);
    table.index(['target_platform']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('generated_bios');
};