exports.up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.date('date_of_birth');
    table.string('interested_in'); // who they're interested in
    table.boolean('email_verified').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('date_of_birth');
    table.dropColumn('interested_in');
    table.dropColumn('email_verified');
  });
};