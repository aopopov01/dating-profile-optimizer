const db = require('../config/database');
const logger = require('../config/logger');

class NotificationTemplateService {
  constructor() {
    this.defaultTemplates = this.getDefaultTemplates();
  }

  // Create or update a notification template
  async createTemplate(templateData) {
    try {
      const {
        name,
        category,
        titleTemplate,
        bodyTemplate,
        dataTemplate,
        imageUrlTemplate,
        deepLinkTemplate,
        actionButtonsTemplate,
        variables,
        language = 'en'
      } = templateData;

      const [template] = await db('notification_templates')
        .insert({
          name,
          category,
          title_template: titleTemplate,
          body_template: bodyTemplate,
          data_template: dataTemplate,
          image_url_template: imageUrlTemplate,
          deep_link_template: deepLinkTemplate,
          action_buttons_template: actionButtonsTemplate,
          variables,
          language,
          is_active: true
        })
        .returning('*');

      logger.info(`Notification template created: ${name}`);
      return template;
    } catch (error) {
      logger.error('Failed to create notification template:', error);
      throw error;
    }
  }

  // Get template by name
  async getTemplate(name, language = 'en') {
    try {
      const template = await db('notification_templates')
        .where({ name, language, is_active: true })
        .first();

      if (!template) {
        // Fallback to English if requested language not found
        if (language !== 'en') {
          return await this.getTemplate(name, 'en');
        }
        throw new Error(`Template not found: ${name}`);
      }

      return template;
    } catch (error) {
      logger.error('Failed to get notification template:', error);
      throw error;
    }
  }

  // Get templates by category
  async getTemplatesByCategory(category, language = 'en') {
    try {
      const templates = await db('notification_templates')
        .where({ category, language, is_active: true })
        .orderBy('name');

      return templates;
    } catch (error) {
      logger.error('Failed to get templates by category:', error);
      throw error;
    }
  }

  // Render template with variables
  renderTemplate(template, variables = {}) {
    try {
      const result = {
        title: this.replaceVariables(template.title_template, variables),
        body: this.replaceVariables(template.body_template, variables),
        category: template.category,
        data: template.data_template ? this.replaceVariablesInObject(template.data_template, variables) : {},
        imageUrl: template.image_url_template ? this.replaceVariables(template.image_url_template, variables) : null,
        deepLinkUrl: template.deep_link_template ? this.replaceVariables(template.deep_link_template, variables) : null,
        actionButtons: template.action_buttons_template ? this.replaceVariablesInObject(template.action_buttons_template, variables) : null
      };

      return result;
    } catch (error) {
      logger.error('Failed to render template:', error);
      throw error;
    }
  }

  // Replace variables in a string template
  replaceVariables(template, variables) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  // Replace variables in an object recursively
  replaceVariablesInObject(obj, variables) {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, variables));
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, variables);
      }
      return result;
    }
    return obj;
  }

  // Initialize default templates
  async initializeDefaultTemplates() {
    try {
      for (const template of this.defaultTemplates) {
        const existing = await db('notification_templates')
          .where({ name: template.name, language: template.language })
          .first();

        if (!existing) {
          await this.createTemplate(template);
        }
      }

      logger.info('Default notification templates initialized');
    } catch (error) {
      logger.error('Failed to initialize default templates:', error);
      throw error;
    }
  }

  // Get default templates configuration
  getDefaultTemplates() {
    return [
      // Onboarding & Welcome
      {
        name: 'welcome_new_user',
        category: 'onboarding_welcome',
        titleTemplate: 'Welcome to Dating Profile Optimizer! 🎉',
        bodyTemplate: 'Hi {{firstName}}! Ready to optimize your dating profile and get more matches?',
        dataTemplate: { action: 'open_onboarding' },
        deepLinkTemplate: 'datingoptimizer://onboarding',
        variables: ['firstName'],
        language: 'en'
      },
      {
        name: 'onboarding_incomplete',
        category: 'onboarding_welcome',
        titleTemplate: 'Complete Your Profile Setup',
        bodyTemplate: '{{firstName}}, you\'re almost ready! Complete your profile setup to start optimizing.',
        dataTemplate: { action: 'continue_onboarding' },
        deepLinkTemplate: 'datingoptimizer://onboarding/continue',
        variables: ['firstName'],
        language: 'en'
      },

      // Bio Generation & Results
      {
        name: 'bio_generation_complete',
        category: 'bio_completion',
        titleTemplate: '✨ Your optimized bio is ready!',
        bodyTemplate: 'Your personalized dating bio has been generated. View it now and boost your matches!',
        dataTemplate: { action: 'view_bio', bioId: '{{bioId}}' },
        deepLinkTemplate: 'datingoptimizer://bio/{{bioId}}',
        variables: ['bioId'],
        language: 'en'
      },
      {
        name: 'photo_analysis_complete',
        category: 'photo_analysis_ready',
        titleTemplate: '📸 Photo analysis complete!',
        bodyTemplate: 'Your photo scored {{score}}/10! Get detailed insights and improvement tips now.',
        dataTemplate: { action: 'view_analysis', analysisId: '{{analysisId}}', score: '{{score}}' },
        deepLinkTemplate: 'datingoptimizer://analysis/{{analysisId}}',
        variables: ['score', 'analysisId'],
        language: 'en'
      },

      // Subscription & Billing
      {
        name: 'subscription_expiring',
        category: 'subscription_renewal',
        titleTemplate: 'Premium expires in {{daysLeft}} days',
        bodyTemplate: 'Don\'t lose access to unlimited bio generation and photo analysis. Renew now!',
        dataTemplate: { action: 'renew_subscription', daysLeft: '{{daysLeft}}' },
        deepLinkTemplate: 'datingoptimizer://subscription/renew',
        actionButtonsTemplate: [
          { id: 'renew', title: 'Renew Now', action: 'renew_subscription' },
          { id: 'remind', title: 'Remind Later', action: 'remind_later' }
        ],
        variables: ['daysLeft'],
        language: 'en'
      },
      {
        name: 'premium_offer',
        category: 'subscription_offer',
        titleTemplate: '🎁 Special offer: {{discount}}% off Premium!',
        bodyTemplate: 'Limited time: Get Premium for just ${{price}}/month. Unlock unlimited features!',
        dataTemplate: { action: 'view_offer', discount: '{{discount}}', price: '{{price}}' },
        deepLinkTemplate: 'datingoptimizer://offer/{{offerId}}',
        variables: ['discount', 'price', 'offerId'],
        language: 'en'
      },

      // Performance & Insights
      {
        name: 'weekly_insights',
        category: 'weekly_insights',
        titleTemplate: '📊 Your week in review',
        bodyTemplate: 'You got {{newMatches}} new matches this week! See what\'s working best.',
        dataTemplate: { action: 'view_insights', matches: '{{newMatches}}' },
        deepLinkTemplate: 'datingoptimizer://insights/weekly',
        variables: ['newMatches'],
        language: 'en'
      },
      {
        name: 'profile_performance',
        category: 'profile_performance',
        titleTemplate: '🚀 Profile performance update',
        bodyTemplate: 'Your optimized profile is getting {{viewIncrease}}% more views than before!',
        dataTemplate: { action: 'view_performance', increase: '{{viewIncrease}}' },
        deepLinkTemplate: 'datingoptimizer://performance',
        variables: ['viewIncrease'],
        language: 'en'
      },

      // Security Alerts
      {
        name: 'security_login',
        category: 'security_alert',
        titleTemplate: '🔒 New login detected',
        bodyTemplate: 'Someone logged into your account from {{location}}. Was this you?',
        dataTemplate: { action: 'security_review', location: '{{location}}' },
        deepLinkTemplate: 'datingoptimizer://security/review',
        actionButtonsTemplate: [
          { id: 'yes', title: 'Yes, that was me', action: 'confirm_login' },
          { id: 'no', title: 'Secure my account', action: 'secure_account' }
        ],
        variables: ['location'],
        language: 'en'
      },
      {
        name: 'password_changed',
        category: 'security_alert',
        titleTemplate: '🔐 Password changed successfully',
        bodyTemplate: 'Your account password was changed. If this wasn\'t you, contact support immediately.',
        dataTemplate: { action: 'security_info' },
        deepLinkTemplate: 'datingoptimizer://security',
        variables: [],
        language: 'en'
      },

      // Feature Updates
      {
        name: 'new_feature',
        category: 'feature_update',
        titleTemplate: '🆕 New feature: {{featureName}}',
        bodyTemplate: '{{featureDescription}} Try it now and improve your dating success!',
        dataTemplate: { action: 'try_feature', feature: '{{featureName}}' },
        deepLinkTemplate: 'datingoptimizer://feature/{{featureId}}',
        variables: ['featureName', 'featureDescription', 'featureId'],
        language: 'en'
      },

      // Engagement & Re-engagement
      {
        name: 'comeback_offer',
        category: 'engagement_boost',
        titleTemplate: 'We miss you! Come back for free analysis',
        bodyTemplate: 'It\'s been a while, {{firstName}}. Get one free photo analysis to boost your profile!',
        dataTemplate: { action: 'comeback_offer' },
        deepLinkTemplate: 'datingoptimizer://comeback',
        variables: ['firstName'],
        language: 'en'
      },
      {
        name: 'daily_tip',
        category: 'tips_educational',
        titleTemplate: '💡 Daily dating tip',
        bodyTemplate: '{{tipTitle}}: {{tipContent}}',
        dataTemplate: { action: 'view_tip', tipId: '{{tipId}}' },
        deepLinkTemplate: 'datingoptimizer://tips/{{tipId}}',
        variables: ['tipTitle', 'tipContent', 'tipId'],
        language: 'en'
      },

      // LinkedIn Headshot Generator specific
      {
        name: 'headshot_ready',
        category: 'photo_analysis_ready',
        titleTemplate: '🎯 Your professional headshot is ready!',
        bodyTemplate: 'Your AI-optimized LinkedIn headshot has been generated. Download it now!',
        dataTemplate: { action: 'view_headshot', headshotId: '{{headshotId}}' },
        deepLinkTemplate: 'linkedinheadshot://headshot/{{headshotId}}',
        variables: ['headshotId'],
        language: 'en'
      },
      {
        name: 'linkedin_profile_boost',
        category: 'profile_performance',
        titleTemplate: '📈 Boost your LinkedIn presence',
        bodyTemplate: 'Your new headshot could increase profile views by up to 40%. Update it today!',
        dataTemplate: { action: 'update_linkedin' },
        deepLinkTemplate: 'linkedinheadshot://update',
        variables: [],
        language: 'en'
      }
    ];
  }

  // A/B test templates
  async createABTest(testData) {
    try {
      const {
        name,
        description,
        templateAId,
        templateBId,
        trafficSplitPercentage = 50,
        startDate,
        endDate,
        targetingCriteria
      } = testData;

      const [test] = await db('notification_ab_tests')
        .insert({
          name,
          description,
          template_a_id: templateAId,
          template_b_id: templateBId,
          traffic_split_percentage: trafficSplitPercentage,
          start_date: startDate,
          end_date: endDate,
          targeting_criteria,
          status: 'draft'
        })
        .returning('*');

      logger.info(`A/B test created: ${name}`);
      return test;
    } catch (error) {
      logger.error('Failed to create A/B test:', error);
      throw error;
    }
  }

  // Get template for A/B test
  async getABTestTemplate(testId, userId) {
    try {
      const test = await db('notification_ab_tests')
        .where({ id: testId, status: 'active' })
        .first();

      if (!test) {
        throw new Error(`A/B test not found or not active: ${testId}`);
      }

      // Determine which variant to use based on user ID hash
      const userHash = this.hashUserId(userId);
      const useVariantA = userHash % 100 < test.traffic_split_percentage;

      const templateId = useVariantA ? test.template_a_id : test.template_b_id;
      const template = await db('notification_templates')
        .where({ id: templateId })
        .first();

      if (!template) {
        throw new Error(`Template not found for A/B test: ${templateId}`);
      }

      return {
        template,
        variant: useVariantA ? 'A' : 'B',
        testId
      };
    } catch (error) {
      logger.error('Failed to get A/B test template:', error);
      throw error;
    }
  }

  // Hash user ID for consistent A/B test assignment
  hashUserId(userId) {
    let hash = 0;
    const str = userId.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get template analytics
  async getTemplateAnalytics(templateId, startDate, endDate) {
    try {
      const analytics = await db('notification_analytics')
        .join('push_notifications', 'notification_analytics.notification_id', 'push_notifications.id')
        .join('notification_templates', 'push_notifications.template_id', 'notification_templates.id')
        .where('notification_templates.id', templateId)
        .whereBetween('notification_analytics.date', [startDate, endDate])
        .select(
          db.raw('SUM(notification_analytics.sent_count) as total_sent'),
          db.raw('SUM(notification_analytics.delivered_count) as total_delivered'),
          db.raw('SUM(notification_analytics.opened_count) as total_opened'),
          db.raw('SUM(notification_analytics.clicked_count) as total_clicked'),
          db.raw('SUM(notification_analytics.converted_count) as total_converted')
        )
        .first();

      // Calculate rates
      const totalSent = parseInt(analytics.total_sent) || 0;
      const totalDelivered = parseInt(analytics.total_delivered) || 0;
      const totalOpened = parseInt(analytics.total_opened) || 0;
      const totalClicked = parseInt(analytics.total_clicked) || 0;
      const totalConverted = parseInt(analytics.total_converted) || 0;

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalConverted,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent * 100).toFixed(2) : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered * 100).toFixed(2) : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened * 100).toFixed(2) : 0,
        conversionRate: totalClicked > 0 ? (totalConverted / totalClicked * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Failed to get template analytics:', error);
      throw error;
    }
  }

  // Update template status
  async updateTemplateStatus(templateId, isActive) {
    try {
      await db('notification_templates')
        .where({ id: templateId })
        .update({ 
          is_active: isActive,
          updated_at: db.fn.now()
        });

      logger.info(`Template ${templateId} status updated to ${isActive ? 'active' : 'inactive'}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update template status:', error);
      throw error;
    }
  }

  // Delete template
  async deleteTemplate(templateId) {
    try {
      await db('notification_templates')
        .where({ id: templateId })
        .del();

      logger.info(`Template ${templateId} deleted`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete template:', error);
      throw error;
    }
  }
}

module.exports = new NotificationTemplateService();