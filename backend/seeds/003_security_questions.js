exports.seed = async function(knex) {
  // Clear existing entries
  await knex('security_questions').del();

  // Insert security questions
  await knex('security_questions').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the name of your first pet?',
      is_active: true,
      sort_order: 1,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the name of the street you grew up on?',
      is_active: true,
      sort_order: 2,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was your mother\'s maiden name?',
      is_active: true,
      sort_order: 3,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the make and model of your first car?',
      is_active: true,
      sort_order: 4,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the name of your elementary school?',
      is_active: true,
      sort_order: 5,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What city were you born in?',
      is_active: true,
      sort_order: 6,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was your favorite subject in school?',
      is_active: true,
      sort_order: 7,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the name of your favorite teacher?',
      is_active: true,
      sort_order: 8,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was your childhood nickname?',
      is_active: true,
      sort_order: 9,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the first concert you attended?',
      is_active: true,
      sort_order: 10,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was your favorite food as a child?',
      is_active: true,
      sort_order: 11,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      question: 'What was the name of your best friend in high school?',
      is_active: true,
      sort_order: 12,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};