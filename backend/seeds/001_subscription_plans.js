exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('subscription_plans').del();
  
  // Inserts seed entries
  await knex('subscription_plans').insert([
    {
      name: 'free',
      display_name: 'Free Plan',
      description: 'Perfect for getting started with profile optimization',
      price_monthly: 0.00,
      price_yearly: 0.00,
      currency: 'USD',
      features: JSON.stringify([
        '1 Bio Generation per month',
        '1 Photo Analysis per month',
        'Basic Profile Tips',
        'Email Support'
      ]),
      limits: JSON.stringify({
        bio_generations_per_month: 1,
        photo_analyses_per_month: 1,
        profile_updates_per_month: 5,
        support_level: 'email'
      }),
      is_active: true,
      sort_order: 1
    },
    {
      name: 'premium',
      display_name: 'Premium Plan',
      description: 'Unlimited access to all AI-powered optimization features',
      price_monthly: 19.99,
      price_yearly: 179.99,
      currency: 'USD',
      stripe_price_id_monthly: 'price_premium_monthly_mock',
      stripe_price_id_yearly: 'price_premium_yearly_mock',
      features: JSON.stringify([
        'Unlimited Bio Generations',
        'Unlimited Photo Analysis', 
        'Advanced Profile Optimization',
        'A/B Testing for Profiles',
        'Priority Support',
        '7-day Free Trial',
        'Platform-Specific Optimization',
        'Success Analytics Dashboard'
      ]),
      limits: JSON.stringify({
        bio_generations_per_month: -1, // unlimited
        photo_analyses_per_month: -1, // unlimited
        profile_updates_per_month: -1, // unlimited
        support_level: 'priority',
        trial_days: 7
      }),
      is_active: true,
      sort_order: 2
    },
    {
      name: 'enterprise',
      display_name: 'Enterprise Plan', 
      description: 'Advanced features for dating coaches and agencies',
      price_monthly: 99.99,
      price_yearly: 999.99,
      currency: 'USD',
      stripe_price_id_monthly: 'price_enterprise_monthly_mock',
      stripe_price_id_yearly: 'price_enterprise_yearly_mock',
      features: JSON.stringify([
        'Everything in Premium',
        'Multiple Client Management',
        'White-Label Solutions',
        'API Access',
        'Custom Branding',
        'Dedicated Account Manager',
        'Advanced Analytics',
        '24/7 Phone Support',
        'Custom Integrations'
      ]),
      limits: JSON.stringify({
        bio_generations_per_month: -1, // unlimited
        photo_analyses_per_month: -1, // unlimited
        profile_updates_per_month: -1, // unlimited
        client_accounts: 50,
        api_calls_per_month: 10000,
        support_level: 'dedicated',
        white_label: true
      }),
      is_active: true,
      sort_order: 3
    }
  ]);
};