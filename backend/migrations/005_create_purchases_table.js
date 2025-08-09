exports.up = function(knex) {
  return knex.schema.createTable('purchases', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('product_id').notNullable(); // basic_optimization, premium_package, complete_makeover
    table.decimal('amount_usd', 10, 2).notNullable();
    table.string('currency').defaultTo('USD');
    table.string('payment_provider').notNullable(); // stripe
    table.string('provider_transaction_id').notNullable();
    table.string('provider_customer_id');
    table.string('payment_method'); // card, apple_pay, google_pay
    table.string('purchase_platform').notNullable(); // ios, android, web
    table.string('status').defaultTo('pending'); // pending, completed, failed, refunded
    table.integer('credits_purchased').notNullable(); // Number of analysis credits
    table.boolean('includes_bio_generation').defaultTo(true);
    table.boolean('includes_messaging_tips').defaultTo(false);
    table.boolean('includes_support').defaultTo(false);
    table.json('provider_metadata'); // Full Stripe response
    table.timestamp('purchase_date').defaultTo(knex.fn.now());
    table.timestamp('refunded_at');
    table.text('refund_reason');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['user_id']);
    table.index(['status']);
    table.index(['purchase_platform']);
    table.index(['purchase_date']);
    table.index(['provider_transaction_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('purchases');
};