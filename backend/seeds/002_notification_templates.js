exports.seed = async function(knex) {
  // Delete existing templates
  await knex('notification_templates').del();

  // Insert default notification templates
  await knex('notification_templates').insert([
    // Onboarding & Welcome
    {
      name: 'welcome_new_user',
      category: 'onboarding_welcome',
      title_template: 'Welcome to Dating Profile Optimizer! 🎉',
      body_template: 'Hi {{firstName}}! Ready to optimize your dating profile and get more matches?',
      data_template: JSON.stringify({ action: 'open_onboarding' }),
      deep_link_template: 'datingoptimizer://onboarding',
      variables: JSON.stringify(['firstName']),
      language: 'en',
      is_active: true
    },
    {
      name: 'onboarding_incomplete',
      category: 'onboarding_welcome',
      title_template: 'Complete Your Profile Setup',
      body_template: '{{firstName}}, you\'re almost ready! Complete your profile setup to start optimizing.',
      data_template: JSON.stringify({ action: 'continue_onboarding' }),
      deep_link_template: 'datingoptimizer://onboarding/continue',
      variables: JSON.stringify(['firstName']),
      language: 'en',
      is_active: true
    },

    // Bio Generation & Results
    {
      name: 'bio_generation_complete',
      category: 'bio_completion',
      title_template: '✨ Your optimized bio is ready!',
      body_template: 'Your personalized dating bio has been generated. View it now and boost your matches!',
      data_template: JSON.stringify({ action: 'view_bio', bioId: '{{bioId}}' }),
      deep_link_template: 'datingoptimizer://bio/{{bioId}}',
      variables: JSON.stringify(['bioId']),
      language: 'en',
      is_active: true
    },
    {
      name: 'photo_analysis_complete',
      category: 'photo_analysis_ready',
      title_template: '📸 Photo analysis complete!',
      body_template: 'Your photo scored {{score}}/10! Get detailed insights and improvement tips now.',
      data_template: JSON.stringify({ action: 'view_analysis', analysisId: '{{analysisId}}', score: '{{score}}' }),
      deep_link_template: 'datingoptimizer://analysis/{{analysisId}}',
      variables: JSON.stringify(['score', 'analysisId']),
      language: 'en',
      is_active: true
    },

    // Subscription & Billing
    {
      name: 'subscription_expiring',
      category: 'subscription_renewal',
      title_template: 'Premium expires in {{daysLeft}} days',
      body_template: 'Don\'t lose access to unlimited bio generation and photo analysis. Renew now!',
      data_template: JSON.stringify({ action: 'renew_subscription', daysLeft: '{{daysLeft}}' }),
      deep_link_template: 'datingoptimizer://subscription/renew',
      action_buttons_template: JSON.stringify([
        { id: 'renew', title: 'Renew Now', action: 'renew_subscription' },
        { id: 'remind', title: 'Remind Later', action: 'remind_later' }
      ]),
      variables: JSON.stringify(['daysLeft']),
      language: 'en',
      is_active: true
    },
    {
      name: 'premium_offer',
      category: 'subscription_offer',
      title_template: '🎁 Special offer: {{discount}}% off Premium!',
      body_template: 'Limited time: Get Premium for just ${{price}}/month. Unlock unlimited features!',
      data_template: JSON.stringify({ action: 'view_offer', discount: '{{discount}}', price: '{{price}}' }),
      deep_link_template: 'datingoptimizer://offer/{{offerId}}',
      variables: JSON.stringify(['discount', 'price', 'offerId']),
      language: 'en',
      is_active: true
    },

    // Performance & Insights
    {
      name: 'weekly_insights',
      category: 'weekly_insights',
      title_template: '📊 Your week in review',
      body_template: 'You got {{newMatches}} new matches this week! See what\'s working best.',
      data_template: JSON.stringify({ action: 'view_insights', matches: '{{newMatches}}' }),
      deep_link_template: 'datingoptimizer://insights/weekly',
      variables: JSON.stringify(['newMatches']),
      language: 'en',
      is_active: true
    },
    {
      name: 'profile_performance',
      category: 'profile_performance',
      title_template: '🚀 Profile performance update',
      body_template: 'Your optimized profile is getting {{viewIncrease}}% more views than before!',
      data_template: JSON.stringify({ action: 'view_performance', increase: '{{viewIncrease}}' }),
      deep_link_template: 'datingoptimizer://performance',
      variables: JSON.stringify(['viewIncrease']),
      language: 'en',
      is_active: true
    },

    // Security Alerts
    {
      name: 'security_login',
      category: 'security_alert',
      title_template: '🔒 New login detected',
      body_template: 'Someone logged into your account from {{location}}. Was this you?',
      data_template: JSON.stringify({ action: 'security_review', location: '{{location}}' }),
      deep_link_template: 'datingoptimizer://security/review',
      action_buttons_template: JSON.stringify([
        { id: 'yes', title: 'Yes, that was me', action: 'confirm_login' },
        { id: 'no', title: 'Secure my account', action: 'secure_account' }
      ]),
      variables: JSON.stringify(['location']),
      language: 'en',
      is_active: true
    },
    {
      name: 'password_changed',
      category: 'security_alert',
      title_template: '🔐 Password changed successfully',
      body_template: 'Your account password was changed. If this wasn\'t you, contact support immediately.',
      data_template: JSON.stringify({ action: 'security_info' }),
      deep_link_template: 'datingoptimizer://security',
      variables: JSON.stringify([]),
      language: 'en',
      is_active: true
    },

    // Feature Updates
    {
      name: 'new_feature',
      category: 'feature_update',
      title_template: '🆕 New feature: {{featureName}}',
      body_template: '{{featureDescription}} Try it now and improve your dating success!',
      data_template: JSON.stringify({ action: 'try_feature', feature: '{{featureName}}' }),
      deep_link_template: 'datingoptimizer://feature/{{featureId}}',
      variables: JSON.stringify(['featureName', 'featureDescription', 'featureId']),
      language: 'en',
      is_active: true
    },

    // Engagement & Re-engagement
    {
      name: 'comeback_offer',
      category: 'engagement_boost',
      title_template: 'We miss you! Come back for free analysis',
      body_template: 'It\'s been a while, {{firstName}}. Get one free photo analysis to boost your profile!',
      data_template: JSON.stringify({ action: 'comeback_offer' }),
      deep_link_template: 'datingoptimizer://comeback',
      variables: JSON.stringify(['firstName']),
      language: 'en',
      is_active: true
    },
    {
      name: 'daily_tip',
      category: 'tips_educational',
      title_template: '💡 Daily dating tip',
      body_template: '{{tipTitle}}: {{tipContent}}',
      data_template: JSON.stringify({ action: 'view_tip', tipId: '{{tipId}}' }),
      deep_link_template: 'datingoptimizer://tips/{{tipId}}',
      variables: JSON.stringify(['tipTitle', 'tipContent', 'tipId']),
      language: 'en',
      is_active: true
    },

    // LinkedIn Headshot Generator specific
    {
      name: 'headshot_ready',
      category: 'photo_analysis_ready',
      title_template: '🎯 Your professional headshot is ready!',
      body_template: 'Your AI-optimized LinkedIn headshot has been generated. Download it now!',
      data_template: JSON.stringify({ action: 'view_headshot', headshotId: '{{headshotId}}' }),
      deep_link_template: 'linkedinheadshot://headshot/{{headshotId}}',
      variables: JSON.stringify(['headshotId']),
      language: 'en',
      is_active: true
    },
    {
      name: 'linkedin_profile_boost',
      category: 'profile_performance',
      title_template: '📈 Boost your LinkedIn presence',
      body_template: 'Your new headshot could increase profile views by up to 40%. Update it today!',
      data_template: JSON.stringify({ action: 'update_linkedin' }),
      deep_link_template: 'linkedinheadshot://update',
      variables: JSON.stringify([]),
      language: 'en',
      is_active: true
    },

    // General notifications
    {
      name: 'general_announcement',
      category: 'general',
      title_template: '📢 {{title}}',
      body_template: '{{message}}',
      data_template: JSON.stringify({ action: 'view_announcement', announcementId: '{{announcementId}}' }),
      deep_link_template: 'datingoptimizer://announcement/{{announcementId}}',
      variables: JSON.stringify(['title', 'message', 'announcementId']),
      language: 'en',
      is_active: true
    },

    // Additional helpful templates
    {
      name: 'payment_successful',
      category: 'subscription_renewal',
      title_template: '✅ Payment successful!',
      body_template: 'Your Premium subscription has been renewed. Enjoy unlimited access!',
      data_template: JSON.stringify({ action: 'view_subscription' }),
      deep_link_template: 'datingoptimizer://subscription',
      variables: JSON.stringify([]),
      language: 'en',
      is_active: true
    },
    {
      name: 'credits_low',
      category: 'subscription_offer',
      title_template: '⚠️ Running low on credits',
      body_template: 'You have {{creditsLeft}} analysis credits left. Upgrade to Premium for unlimited access!',
      data_template: JSON.stringify({ action: 'upgrade_premium', credits: '{{creditsLeft}}' }),
      deep_link_template: 'datingoptimizer://subscription/upgrade',
      variables: JSON.stringify(['creditsLeft']),
      language: 'en',
      is_active: true
    },
    {
      name: 'maintenance_notice',
      category: 'general',
      title_template: '🔧 Scheduled maintenance',
      body_template: 'We\'ll be offline for maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}.',
      data_template: JSON.stringify({ action: 'view_maintenance_info' }),
      deep_link_template: 'datingoptimizer://maintenance',
      variables: JSON.stringify(['maintenanceDate', 'startTime', 'endTime']),
      language: 'en',
      is_active: true
    }
  ]);

  console.log('✅ Notification templates seeded successfully');
};