exports.up = function(knex) {
  return Promise.all([
    // Create subscription plans table
    knex.schema.createTable('subscription_plans', table => {
      table.increments('id').primary();
      table.string('name').notNullable(); // free, premium, enterprise
      table.string('display_name').notNullable();
      table.text('description');
      table.decimal('price_monthly', 10, 2).notNullable();
      table.decimal('price_yearly', 10, 2).notNullable();
      table.string('currency').defaultTo('USD');
      table.string('stripe_price_id_monthly');
      table.string('stripe_price_id_yearly');
      table.json('features').notNullable(); // List of features
      table.json('limits').notNullable(); // Usage limits
      table.boolean('is_active').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['is_active']);
      table.index(['sort_order']);
    }),

    // Create user subscriptions table  
    knex.schema.createTable('user_subscriptions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('plan_id').references('id').inTable('subscription_plans');
      table.string('status').notNullable(); // active, cancelled, expired, trialing
      table.string('billing_period').notNullable(); // monthly, yearly
      table.timestamp('starts_at').notNullable();
      table.timestamp('current_period_start').notNullable();
      table.timestamp('current_period_end').notNullable();
      table.timestamp('trial_start');
      table.timestamp('trial_end');
      table.timestamp('cancelled_at');
      table.string('stripe_subscription_id');
      table.string('stripe_customer_id');
      table.json('usage_data'); // Track usage within subscription
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['status']);
      table.index(['current_period_end']);
    }),

    // Create payment transactions table
    knex.schema.createTable('payment_transactions', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('subscription_id').references('id').inTable('user_subscriptions').onDelete('SET NULL');
      table.string('transaction_type').notNullable(); // subscription, one-time, refund
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency').defaultTo('USD');
      table.text('description');
      table.string('status').notNullable(); // pending, completed, failed, refunded
      table.string('payment_method'); // stripe, paypal, etc
      table.string('stripe_payment_intent_id');
      table.string('external_transaction_id'); // ID from payment processor
      table.json('metadata'); // Additional transaction data
      table.timestamp('processed_at');
      table.timestamps(true, true);
      
      table.index(['user_id']);
      table.index(['status']);
      table.index(['transaction_type']);
    }),

    // Create promo codes table
    knex.schema.createTable('promo_codes', table => {
      table.increments('id').primary();
      table.string('code').unique().notNullable();
      table.text('description');
      table.string('discount_type').notNullable(); // percent, fixed
      table.decimal('discount_value', 10, 2).notNullable();
      table.decimal('max_discount_amount', 10, 2); // Max discount for percent codes
      table.integer('usage_limit'); // Max times it can be used
      table.integer('usage_count').defaultTo(0);
      table.json('applicable_plans'); // Array of plan IDs this applies to
      table.timestamp('valid_from').defaultTo(knex.fn.now());
      table.timestamp('valid_until');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['code']);
      table.index(['is_active']);
      table.index(['valid_from', 'valid_until']);
    }),

    // Create promo code usage table
    knex.schema.createTable('promo_code_usage', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('promo_code_id').references('id').inTable('promo_codes').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('transaction_id').references('id').inTable('payment_transactions').onDelete('CASCADE');
      table.decimal('discount_amount', 10, 2).notNullable();
      table.timestamps(true, true);
      
      table.unique(['promo_code_id', 'user_id']); // User can only use code once
      table.index(['promo_code_id']);
      table.index(['user_id']);
    }),

    // Create user AI usage tracking table
    knex.schema.createTable('user_ai_usage', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('service_type').notNullable(); // bio_generation, photo_analysis
      table.integer('usage_count').defaultTo(1);
      table.date('date').notNullable();
      table.json('metadata'); // Service-specific data
      table.timestamps(true, true);
      
      table.index(['user_id', 'service_type', 'date']);
      table.index(['date']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('user_ai_usage'),
    knex.schema.dropTableIfExists('promo_code_usage'),
    knex.schema.dropTableIfExists('promo_codes'),
    knex.schema.dropTableIfExists('payment_transactions'),
    knex.schema.dropTableIfExists('user_subscriptions'),
    knex.schema.dropTableIfExists('subscription_plans')
  ]);
};