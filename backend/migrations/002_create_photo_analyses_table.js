exports.up = function(knex) {
  return knex.schema.createTable('photo_analyses', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('photo_url').notNullable();
    table.string('cloudinary_id');
    table.integer('overall_score'); // 1-100 overall attractiveness/effectiveness score
    table.integer('quality_score'); // Technical quality: lighting, focus, resolution
    table.integer('attractiveness_score'); // Facial attractiveness analysis
    table.integer('background_score'); // Background appropriateness and quality
    table.integer('outfit_score'); // Clothing style and appropriateness
    table.integer('expression_score'); // Facial expression and approachability
    table.integer('composition_score'); // Photo composition and framing
    table.json('facial_analysis'); // Detailed facial feature analysis
    table.json('background_analysis'); // Background category and quality
    table.json('outfit_analysis'); // Clothing style, colors, appropriateness
    table.json('activity_context'); // What activity/setting is shown
    table.json('improvement_suggestions'); // Specific recommendations
    table.string('recommended_position'); // primary, secondary, tertiary, remove
    table.decimal('processing_cost', 10, 4); // AI processing cost
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['overall_score']);
    table.index(['recommended_position']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('photo_analyses');
};