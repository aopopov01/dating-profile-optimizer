/**
 * Analytics Dashboard Service
 * Comprehensive dashboard for business intelligence, KPIs, and real-time monitoring
 */

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');
const logger = require('../config/logger');
const db = require('../config/database');
const { analytics } = require('../config/analytics');
const errorTrackingService = require('./errorTrackingService');

class AnalyticsDashboardService {
  constructor() {
    this.initialized = false;
    this.chartRenderer = null;
    this.kpiCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Dashboard configuration
    this.dashboardConfig = {
      refreshInterval: 30000, // 30 seconds
      chartWidth: 800,
      chartHeight: 400,
      colors: {
        primary: '#007bff',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        info: '#17a2b8'
      }
    };

    // KPI definitions for dating profile optimization
    this.kpiDefinitions = {
      user_acquisition: {
        name: 'User Acquisition',
        metrics: ['daily_registrations', 'weekly_registrations', 'monthly_registrations'],
        targets: { daily: 50, weekly: 350, monthly: 1500 }
      },
      user_engagement: {
        name: 'User Engagement',
        metrics: ['daily_active_users', 'session_duration', 'feature_usage_rate'],
        targets: { dau: 200, session_duration: 300, feature_usage: 0.7 }
      },
      conversion_funnel: {
        name: 'Conversion Funnel',
        metrics: ['registration_to_profile', 'profile_to_bio', 'bio_to_photo', 'photo_to_subscription'],
        targets: { reg_profile: 0.8, profile_bio: 0.6, bio_photo: 0.4, photo_sub: 0.1 }
      },
      revenue_metrics: {
        name: 'Revenue Metrics',
        metrics: ['daily_revenue', 'monthly_recurring_revenue', 'customer_lifetime_value'],
        targets: { daily_revenue: 500, mrr: 15000, clv: 50 }
      },
      content_quality: {
        name: 'Content Quality',
        metrics: ['bio_satisfaction_score', 'photo_analysis_accuracy', 'ai_success_rate'],
        targets: { bio_satisfaction: 0.85, photo_accuracy: 0.9, ai_success: 0.95 }
      },
      system_performance: {
        name: 'System Performance',
        metrics: ['response_time', 'error_rate', 'uptime_percentage'],
        targets: { response_time: 1000, error_rate: 0.01, uptime: 0.999 }
      }
    };

    this.init();
  }

  async init() {
    try {
      // Initialize chart renderer
      this.chartRenderer = new ChartJSNodeCanvas({
        width: this.dashboardConfig.chartWidth,
        height: this.dashboardConfig.chartHeight,
        backgroundColour: 'white'
      });

      this.initialized = true;
      logger.info('Analytics Dashboard Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Analytics Dashboard Service:', error);
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(timeframe = '7d', userId = null) {
    try {
      const cacheKey = `dashboard_${timeframe}_${userId || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const timeframeDays = this.parseTimeframe(timeframe);
      const startDate = subDays(new Date(), timeframeDays);
      const endDate = new Date();

      const dashboardData = await Promise.all([
        this.getKPIMetrics(startDate, endDate, userId),
        this.getUserAnalytics(startDate, endDate, userId),
        this.getFeatureUsageAnalytics(startDate, endDate, userId),
        this.getRevenueAnalytics(startDate, endDate, userId),
        this.getPerformanceMetrics(startDate, endDate),
        this.getConversionFunnelData(startDate, endDate, userId),
        this.getRealtimeMetrics(),
        this.getAlerts()
      ]);

      const result = {
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        kpis: dashboardData[0],
        user_analytics: dashboardData[1],
        feature_usage: dashboardData[2],
        revenue: dashboardData[3],
        performance: dashboardData[4],
        conversion_funnel: dashboardData[5],
        realtime: dashboardData[6],
        alerts: dashboardData[7],
        summary: await this.generateSummary(dashboardData)
      };

      this.setCachedData(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get KPI metrics with targets and trends
   */
  async getKPIMetrics(startDate, endDate, userId = null) {
    try {
      const kpis = {};

      for (const [categoryKey, category] of Object.entries(this.kpiDefinitions)) {
        kpis[categoryKey] = {
          name: category.name,
          metrics: {},
          overall_score: 0
        };

        for (const metricKey of category.metrics) {
          const metricData = await this.calculateKPIMetric(metricKey, startDate, endDate, userId);
          const target = this.getTargetForMetric(categoryKey, metricKey);
          
          kpis[categoryKey].metrics[metricKey] = {
            ...metricData,
            target,
            performance_score: this.calculatePerformanceScore(metricData.current_value, target),
            status: this.getKPIStatus(metricData.current_value, target, metricData.trend)
          };
        }

        // Calculate overall category score
        const scores = Object.values(kpis[categoryKey].metrics).map(m => m.performance_score);
        kpis[categoryKey].overall_score = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }

      return kpis;
    } catch (error) {
      logger.error('Failed to get KPI metrics:', error);
      return {};
    }
  }

  /**
   * Calculate individual KPI metric
   */
  async calculateKPIMetric(metricKey, startDate, endDate, userId) {
    const metricCalculators = {
      daily_registrations: () => this.getDailyRegistrations(startDate, endDate),
      weekly_registrations: () => this.getWeeklyRegistrations(startDate, endDate),
      monthly_registrations: () => this.getMonthlyRegistrations(startDate, endDate),
      daily_active_users: () => this.getDailyActiveUsers(startDate, endDate),
      session_duration: () => this.getAverageSessionDuration(startDate, endDate, userId),
      feature_usage_rate: () => this.getFeatureUsageRate(startDate, endDate, userId),
      registration_to_profile: () => this.getConversionRate('registration', 'profile_completion', startDate, endDate),
      profile_to_bio: () => this.getConversionRate('profile_completion', 'bio_generation', startDate, endDate),
      bio_to_photo: () => this.getConversionRate('bio_generation', 'photo_analysis', startDate, endDate),
      photo_to_subscription: () => this.getConversionRate('photo_analysis', 'subscription', startDate, endDate),
      daily_revenue: () => this.getDailyRevenue(startDate, endDate),
      monthly_recurring_revenue: () => this.getMRR(startDate, endDate),
      customer_lifetime_value: () => this.getCLV(startDate, endDate),
      bio_satisfaction_score: () => this.getBioSatisfactionScore(startDate, endDate, userId),
      photo_analysis_accuracy: () => this.getPhotoAnalysisAccuracy(startDate, endDate),
      ai_success_rate: () => this.getAISuccessRate(startDate, endDate),
      response_time: () => this.getAverageResponseTime(startDate, endDate),
      error_rate: () => this.getErrorRate(startDate, endDate),
      uptime_percentage: () => this.getUptimePercentage(startDate, endDate)
    };

    const calculator = metricCalculators[metricKey];
    if (!calculator) {
      return { current_value: 0, previous_value: 0, trend: 'neutral', change_percent: 0 };
    }

    const currentValue = await calculator();
    const previousPeriodStart = subDays(startDate, endDate.getDate() - startDate.getDate());
    const previousPeriodEnd = startDate;
    const previousValue = await calculator(previousPeriodStart, previousPeriodEnd);

    const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'neutral';

    return {
      current_value: currentValue,
      previous_value: previousValue,
      change_percent: parseFloat(changePercent.toFixed(2)),
      trend,
      time_series: await this.getMetricTimeSeries(metricKey, startDate, endDate)
    };
  }

  /**
   * Get user analytics data
   */
  async getUserAnalytics(startDate, endDate, userId = null) {
    try {
      let query = db('user_behavior_events').whereBetween('server_timestamp', [startDate, endDate]);
      if (userId) query = query.where('user_id', userId);

      const [
        totalEvents,
        uniqueUsers,
        topEvents,
        userJourney,
        deviceBreakdown,
        geographicData
      ] = await Promise.all([
        query.clone().count('* as count').first(),
        query.clone().countDistinct('user_id as count').first(),
        query.clone().groupBy('event_name').select('event_name').count('* as count').orderBy('count', 'desc').limit(10),
        this.getUserJourneyAnalysis(startDate, endDate, userId),
        query.clone().groupBy('platform').select('platform').count('* as count'),
        query.clone().groupBy('country').select('country').count('* as count').orderBy('count', 'desc').limit(20)
      ]);

      return {
        total_events: parseInt(totalEvents.count),
        unique_users: parseInt(uniqueUsers.count),
        top_events: topEvents,
        user_journey: userJourney,
        device_breakdown: deviceBreakdown,
        geographic_data: geographicData,
        engagement_score: await this.calculateEngagementScore(startDate, endDate, userId)
      };
    } catch (error) {
      logger.error('Failed to get user analytics:', error);
      return {};
    }
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsageAnalytics(startDate, endDate, userId = null) {
    try {
      let query = db('feature_usage').whereBetween('created_at', [startDate, endDate]);
      if (userId) query = query.where('user_id', userId);

      const [
        bioGenerationStats,
        photoAnalysisStats,
        linkedinHeadshotStats,
        subscriptionStats
      ] = await Promise.all([
        this.getFeatureStats('bio_generation', startDate, endDate, userId),
        this.getFeatureStats('photo_analysis', startDate, endDate, userId),
        this.getFeatureStats('linkedin_headshot', startDate, endDate, userId),
        this.getFeatureStats('subscription_management', startDate, endDate, userId)
      ]);

      return {
        bio_generation: bioGenerationStats,
        photo_analysis: photoAnalysisStats,
        linkedin_headshot: linkedinHeadshotStats,
        subscription: subscriptionStats,
        feature_adoption: await this.getFeatureAdoptionRates(startDate, endDate, userId),
        usage_trends: await this.getFeatureUsageTrends(startDate, endDate, userId)
      };
    } catch (error) {
      logger.error('Failed to get feature usage analytics:', error);
      return {};
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(startDate, endDate, userId = null) {
    try {
      let query = db('purchases').whereBetween('created_at', [startDate, endDate]);
      if (userId) query = query.where('user_id', userId);

      const [
        totalRevenue,
        subscriptionRevenue,
        oneTimeRevenue,
        averageOrderValue,
        revenueByPlan,
        churnRate,
        ltv
      ] = await Promise.all([
        query.clone().sum('amount as total').first(),
        query.clone().where('purchase_type', 'subscription').sum('amount as total').first(),
        query.clone().where('purchase_type', 'one_time').sum('amount as total').first(),
        query.clone().avg('amount as avg').first(),
        query.clone().groupBy('product_name').select('product_name').sum('amount as revenue').count('* as count'),
        this.calculateChurnRate(startDate, endDate),
        this.calculateLTV(startDate, endDate)
      ]);

      return {
        total_revenue: parseFloat(totalRevenue?.total || 0),
        subscription_revenue: parseFloat(subscriptionRevenue?.total || 0),
        one_time_revenue: parseFloat(oneTimeRevenue?.total || 0),
        average_order_value: parseFloat(averageOrderValue?.avg || 0),
        revenue_by_plan: revenueByPlan,
        churn_rate: churnRate,
        customer_lifetime_value: ltv,
        revenue_trend: await this.getRevenueTrend(startDate, endDate, userId),
        mrr_growth: await this.getMRRGrowth(startDate, endDate)
      };
    } catch (error) {
      logger.error('Failed to get revenue analytics:', error);
      return {};
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate, endDate) {
    try {
      const [
        responseTimeStats,
        errorStats,
        systemStats,
        databaseStats
      ] = await Promise.all([
        this.getResponseTimeStats(startDate, endDate),
        this.getErrorStats(startDate, endDate),
        this.getSystemStats(startDate, endDate),
        this.getDatabaseStats(startDate, endDate)
      ]);

      return {
        response_time: responseTimeStats,
        errors: errorStats,
        system: systemStats,
        database: databaseStats,
        uptime: await this.calculateUptime(startDate, endDate),
        performance_score: await this.calculatePerformanceScore(startDate, endDate)
      };
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      return {};
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnelData(startDate, endDate, userId = null) {
    try {
      const funnelSteps = [
        { name: 'Visitor', event: 'page_view' },
        { name: 'Registration', event: 'user_registered' },
        { name: 'Profile Setup', event: 'profile_completed' },
        { name: 'First Bio', event: 'bio_generated' },
        { name: 'Photo Analysis', event: 'photo_analyzed' },
        { name: 'Subscription', event: 'subscription_upgraded' }
      ];

      const funnelData = [];
      let previousCount = null;

      for (const step of funnelSteps) {
        let query = db('user_behavior_events')
          .where('event_name', step.event)
          .whereBetween('server_timestamp', [startDate, endDate]);

        if (userId) query = query.where('user_id', userId);

        const result = await query.countDistinct('user_id as count').first();
        const count = parseInt(result.count);

        const conversionRate = previousCount ? (count / previousCount) * 100 : 100;
        const dropoffRate = previousCount ? ((previousCount - count) / previousCount) * 100 : 0;

        funnelData.push({
          step: step.name,
          event: step.event,
          users: count,
          conversion_rate: parseFloat(conversionRate.toFixed(2)),
          dropoff_rate: parseFloat(dropoffRate.toFixed(2))
        });

        previousCount = count;
      }

      return {
        steps: funnelData,
        overall_conversion_rate: funnelData.length > 1 ? 
          ((funnelData[funnelData.length - 1].users / funnelData[0].users) * 100).toFixed(2) : 0,
        biggest_dropoff: this.findBiggestDropoff(funnelData),
        optimization_opportunities: this.identifyOptimizationOpportunities(funnelData)
      };
    } catch (error) {
      logger.error('Failed to get conversion funnel data:', error);
      return {};
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealtimeMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeUsers,
        recentEvents,
        currentResponseTime,
        errorRate,
        systemLoad
      ] = await Promise.all([
        db('user_sessions').where('is_active', true).count('* as count').first(),
        db('user_behavior_events').where('server_timestamp', '>', oneHourAgo).count('* as count').first(),
        this.getCurrentResponseTime(),
        this.getCurrentErrorRate(),
        this.getCurrentSystemLoad()
      ]);

      return {
        active_users: parseInt(activeUsers.count),
        events_last_hour: parseInt(recentEvents.count),
        current_response_time: currentResponseTime,
        current_error_rate: errorRate,
        system_load: systemLoad,
        status: this.determineSystemStatus(currentResponseTime, errorRate, systemLoad),
        last_updated: now.toISOString()
      };
    } catch (error) {
      logger.error('Failed to get realtime metrics:', error);
      return {};
    }
  }

  /**
   * Get current alerts
   */
  async getAlerts() {
    try {
      const [
        performanceAlerts,
        errorAlerts,
        businessAlerts
      ] = await Promise.all([
        this.getPerformanceAlerts(),
        this.getErrorAlerts(),
        this.getBusinessAlerts()
      ]);

      return {
        performance: performanceAlerts,
        errors: errorAlerts,
        business: businessAlerts,
        total_count: performanceAlerts.length + errorAlerts.length + businessAlerts.length
      };
    } catch (error) {
      logger.error('Failed to get alerts:', error);
      return {};
    }
  }

  /**
   * Generate dashboard summary
   */
  async generateSummary(dashboardData) {
    try {
      const [kpis, userAnalytics, featureUsage, revenue, performance, funnel, realtime, alerts] = dashboardData;

      const summary = {
        overall_health_score: this.calculateOverallHealthScore(kpis, performance, alerts),
        key_insights: [],
        recommendations: [],
        trending_up: [],
        trending_down: [],
        urgent_actions: []
      };

      // Generate insights based on data
      if (userAnalytics.unique_users > 0) {
        summary.key_insights.push(`${userAnalytics.unique_users} unique users generated ${userAnalytics.total_events} events`);
      }

      if (revenue.total_revenue > 0) {
        summary.key_insights.push(`Total revenue: $${revenue.total_revenue.toFixed(2)} with AOV of $${revenue.average_order_value.toFixed(2)}`);
      }

      // Find trending metrics
      for (const [category, categoryData] of Object.entries(kpis)) {
        for (const [metric, metricData] of Object.entries(categoryData.metrics)) {
          if (metricData.trend === 'up' && metricData.change_percent > 10) {
            summary.trending_up.push(`${metric}: +${metricData.change_percent}%`);
          } else if (metricData.trend === 'down' && metricData.change_percent < -10) {
            summary.trending_down.push(`${metric}: ${metricData.change_percent}%`);
          }
        }
      }

      // Generate recommendations
      if (funnel.steps.length > 0) {
        const biggestDropoff = funnel.biggest_dropoff;
        if (biggestDropoff && biggestDropoff.dropoff_rate > 50) {
          summary.recommendations.push(`High dropout at ${biggestDropoff.step} (${biggestDropoff.dropoff_rate}% dropoff)`);
          summary.urgent_actions.push(`Optimize ${biggestDropoff.step} user experience`);
        }
      }

      if (alerts.total_count > 0) {
        summary.urgent_actions.push(`Resolve ${alerts.total_count} active alerts`);
      }

      return summary;
    } catch (error) {
      logger.error('Failed to generate summary:', error);
      return {};
    }
  }

  /**
   * Generate chart image for a metric
   */
  async generateChart(chartType, data, options = {}) {
    try {
      if (!this.chartRenderer) {
        throw new Error('Chart renderer not initialized');
      }

      const chartConfig = this.buildChartConfig(chartType, data, options);
      const imageBuffer = await this.chartRenderer.renderToBuffer(chartConfig);
      
      return {
        success: true,
        image: imageBuffer,
        format: 'png'
      };
    } catch (error) {
      logger.error('Failed to generate chart:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper methods
   */
  parseTimeframe(timeframe) {
    const map = {
      '1h': 0.04,
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    return map[timeframe] || 7;
  }

  getCachedData(key) {
    const cached = this.kpiCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.kpiCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getTargetForMetric(category, metric) {
    return this.kpiDefinitions[category]?.targets?.[metric.replace(/_/g, '_')] || 0;
  }

  calculatePerformanceScore(currentValue, target) {
    if (target === 0) return 100;
    return Math.min(100, Math.max(0, (currentValue / target) * 100));
  }

  getKPIStatus(currentValue, target, trend) {
    const score = this.calculatePerformanceScore(currentValue, target);
    if (score >= 90 && trend === 'up') return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'needs_attention';
  }

  calculateOverallHealthScore(kpis, performance, alerts) {
    // Simplified health score calculation
    const kpiScores = Object.values(kpis).map(category => category.overall_score);
    const avgKpiScore = kpiScores.reduce((sum, score) => sum + score, 0) / kpiScores.length;
    
    const performanceScore = performance.performance_score || 75;
    const alertsPenalty = Math.min(20, alerts.total_count * 2);
    
    return Math.max(0, Math.min(100, (avgKpiScore + performanceScore) / 2 - alertsPenalty));
  }

  findBiggestDropoff(funnelData) {
    return funnelData.reduce((biggest, current) => 
      current.dropoff_rate > (biggest?.dropoff_rate || 0) ? current : biggest, null);
  }

  identifyOptimizationOpportunities(funnelData) {
    return funnelData
      .filter(step => step.dropoff_rate > 30)
      .map(step => ({
        step: step.step,
        opportunity: `High dropoff rate of ${step.dropoff_rate}%`,
        priority: step.dropoff_rate > 50 ? 'high' : 'medium'
      }));
  }

  buildChartConfig(chartType, data, options) {
    // Basic chart configuration - can be expanded based on needs
    return {
      type: chartType,
      data,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: options.title || 'Analytics Chart'
          }
        },
        ...options
      }
    };
  }

  determineSystemStatus(responseTime, errorRate, systemLoad) {
    if (errorRate > 5 || responseTime > 2000 || systemLoad > 90) return 'critical';
    if (errorRate > 2 || responseTime > 1000 || systemLoad > 70) return 'warning';
    return 'healthy';
  }

  /**
   * Placeholder methods for specific metric calculations
   * These should be implemented based on your specific database schema and business logic
   */
  async getDailyRegistrations(startDate, endDate) {
    const result = await db('users').whereBetween('created_at', [startDate, endDate]).count('* as count').first();
    return parseInt(result.count);
  }

  async getWeeklyRegistrations(startDate, endDate) {
    // Implementation depends on specific requirements
    return 0;
  }

  async getMonthlyRegistrations(startDate, endDate) {
    // Implementation depends on specific requirements
    return 0;
  }

  async getDailyActiveUsers(startDate, endDate) {
    const result = await db('user_sessions')
      .whereBetween('session_start', [startDate, endDate])
      .countDistinct('user_id as count')
      .first();
    return parseInt(result.count);
  }

  async getAverageSessionDuration(startDate, endDate, userId = null) {
    let query = db('user_sessions').whereBetween('session_start', [startDate, endDate]);
    if (userId) query = query.where('user_id', userId);
    
    const result = await query.avg('duration_seconds as avg_duration').first();
    return parseFloat(result.avg_duration || 0);
  }

  async getFeatureUsageRate(startDate, endDate, userId = null) {
    // Calculate based on feature usage vs total sessions
    return 0.75; // Placeholder
  }

  async getConversionRate(fromEvent, toEvent, startDate, endDate) {
    const fromCount = await db('user_behavior_events')
      .where('event_name', fromEvent)
      .whereBetween('server_timestamp', [startDate, endDate])
      .countDistinct('user_id as count')
      .first();

    const toCount = await db('user_behavior_events')
      .where('event_name', toEvent)
      .whereBetween('server_timestamp', [startDate, endDate])
      .countDistinct('user_id as count')
      .first();

    const from = parseInt(fromCount.count);
    const to = parseInt(toCount.count);
    
    return from > 0 ? to / from : 0;
  }

  async getDailyRevenue(startDate, endDate) {
    const result = await db('purchases')
      .whereBetween('created_at', [startDate, endDate])
      .sum('amount as total')
      .first();
    return parseFloat(result.total || 0);
  }

  async getMRR(startDate, endDate) {
    // Calculate Monthly Recurring Revenue
    return 0; // Placeholder
  }

  async getCLV(startDate, endDate) {
    // Calculate Customer Lifetime Value
    return 0; // Placeholder
  }

  // Add more metric calculation methods as needed...

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      cache_size: this.kpiCache.size,
      chart_renderer_available: !!this.chartRenderer,
      kpi_categories: Object.keys(this.kpiDefinitions).length
    };
  }
}

module.exports = new AnalyticsDashboardService();