exports.up = function(knex) {
  return knex.schema
    // Add email_verified column to users table if it doesn't exist
    .hasColumn('users', 'email_verified').then(exists => {
      if (!exists) {
        return knex.schema.alterTable('users', table => {
          table.boolean('email_verified').defaultTo(false);
        });
      }
    })
    .then(() => {
      // Create email_verification_tokens table if it doesn't exist
      return knex.schema.hasTable('email_verification_tokens').then(exists => {
        if (!exists) {
          return knex.schema.createTable('email_verification_tokens', table => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('token').notNullable().unique();
            table.boolean('used').defaultTo(false);
            table.timestamp('used_at');
            table.timestamp('expires_at').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            table.index(['token']);
            table.index(['user_id']);
            table.index(['expires_at']);
          });
        }
      });
    })
    .then(() => {
      // Create password_reset_tokens table if it doesn't exist
      return knex.schema.hasTable('password_reset_tokens').then(exists => {
        if (!exists) {
          return knex.schema.createTable('password_reset_tokens', table => {
            table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('token').notNullable();
            table.boolean('used').defaultTo(false);
            table.timestamp('used_at');
            table.timestamp('expires_at').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            table.index(['token']);
            table.index(['user_id']);
            table.index(['expires_at']);
          });
        }
      });
    })
    .then(() => {
      // Add login_count column to users table if it doesn't exist
      return knex.schema.hasColumn('users', 'login_count').then(exists => {
        if (!exists) {
          return knex.schema.alterTable('users', table => {
            table.integer('login_count').defaultTo(0);
          });
        }
      });
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('password_reset_tokens')
    .dropTableIfExists('email_verification_tokens')
    .then(() => {
      return knex.schema.hasColumn('users', 'email_verified').then(exists => {
        if (exists) {
          return knex.schema.alterTable('users', table => {
            table.dropColumn('email_verified');
          });
        }
      });
    })
    .then(() => {
      return knex.schema.hasColumn('users', 'login_count').then(exists => {
        if (exists) {
          return knex.schema.alterTable('users', table => {
            table.dropColumn('login_count');
          });
        }
      });
    });
};