/**
 * Enhanced Analytics Routes
 * Comprehensive analytics endpoints with dashboard, monitoring, and business intelligence
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');
const { analytics, ANALYTICS_EVENTS } = require('../config/analytics');
const errorTrackingService = require('../services/errorTrackingService');
const performanceMonitoringService = require('../services/performanceMonitoringService');
const analyticsDashboardService = require('../services/analyticsDashboardService');
const abTestingService = require('../services/abTestingService');
const db = require('../config/database');

/**
 * Get comprehensive analytics dashboard
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const {
      timeframe = '7d',
      user_filter = null,
      include_charts = false
    } = req.query;

    // Only allow users to see their own data unless they're admin
    const userId = req.user.role === 'admin' ? user_filter : req.user.id;

    const dashboardData = await analyticsDashboardService.getDashboardData(timeframe, userId);

    // Generate charts if requested
    if (include_charts === 'true') {
      const charts = await Promise.all([
        analyticsDashboardService.generateChart('line', {
          labels: dashboardData.user_analytics.engagement_score?.time_series?.map(d => d.date) || [],
          datasets: [{
            label: 'User Engagement',
            data: dashboardData.user_analytics.engagement_score?.time_series?.map(d => d.value) || [],
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)'
          }]
        }, { title: 'User Engagement Trend' }),

        analyticsDashboardService.generateChart('bar', {
          labels: Object.keys(dashboardData.feature_usage),
          datasets: [{
            label: 'Feature Usage',
            data: Object.values(dashboardData.feature_usage).map(f => f.usage_count || 0),
            backgroundColor: ['#28a745', '#17a2b8', '#ffc107', '#dc3545']
          }]
        }, { title: 'Feature Usage Distribution' }),

        analyticsDashboardService.generateChart('doughnut', {
          labels: dashboardData.conversion_funnel.steps.map(s => s.step),
          datasets: [{
            data: dashboardData.conversion_funnel.steps.map(s => s.users),
            backgroundColor: ['#007bff', '#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1']
          }]
        }, { title: 'Conversion Funnel' })
      ]);

      dashboardData.charts = charts.map(chart => ({
        success: chart.success,
        image_base64: chart.success ? chart.image.toString('base64') : null,
        error: chart.error || null
      }));
    }

    res.json({
      success: true,
      dashboard: dashboardData,
      meta: {
        generated_at: new Date().toISOString(),
        user_role: req.user.role,
        data_scope: userId ? 'user_specific' : 'all_users'
      }
    });

  } catch (error) {
    logger.error('Dashboard data retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 * Get real-time analytics stream
 * GET /api/analytics/realtime
 */
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendRealtimeData = async () => {
      try {
        const realtimeData = await analyticsDashboardService.getRealtimeMetrics();
        const performanceAlerts = performanceMonitoringService.getRecentAlerts(5);
        
        const data = {
          ...realtimeData,
          performance_alerts: performanceAlerts,
          timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        logger.error('Realtime data streaming error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
      }
    };

    // Send initial data
    await sendRealtimeData();

    // Send updates every 10 seconds
    const interval = setInterval(sendRealtimeData, 10000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

  } catch (error) {
    logger.error('Realtime analytics setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup realtime analytics',
      code: 'REALTIME_ERROR'
    });
  }
});

/**
 * Get error tracking dashboard
 * GET /api/analytics/errors
 */
router.get('/errors', authenticateToken, async (req, res) => {
  try {
    const {
      timeframe = '24h',
      severity = null,
      error_type = null,
      resolved = null
    } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (error_type) filters.error_type = error_type;
    if (resolved !== null) filters.resolved = resolved === 'true';

    const errorStats = await errorTrackingService.getErrorStatistics(timeframe, filters);

    res.json({
      success: true,
      error_analytics: errorStats,
      meta: {
        timeframe,
        filters_applied: Object.keys(filters).length,
        health_status: errorTrackingService.getHealthStatus()
      }
    });

  } catch (error) {
    logger.error('Error analytics retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve error analytics',
      code: 'ERROR_ANALYTICS_ERROR'
    });
  }
});

/**
 * Get performance monitoring dashboard
 * GET /api/analytics/performance
 */
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    const performanceStats = await performanceMonitoringService.getPerformanceStats(timeframe);
    const recentAlerts = performanceMonitoringService.getRecentAlerts(20);
    const healthStatus = performanceMonitoringService.getHealthStatus();

    res.json({
      success: true,
      performance_analytics: {
        ...performanceStats,
        recent_alerts: recentAlerts,
        health_status: healthStatus
      },
      meta: {
        timeframe,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Performance analytics retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance analytics',
      code: 'PERFORMANCE_ANALYTICS_ERROR'
    });
  }
});

/**
 * Get Prometheus metrics endpoint
 * GET /api/analytics/metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await performanceMonitoringService.getPrometheusMetrics();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);

  } catch (error) {
    logger.error('Prometheus metrics retrieval failed:', error);
    res.status(500).send('# Error retrieving metrics\n');
  }
});

/**
 * Create A/B test
 * POST /api/analytics/ab-test
 */
router.post('/ab-test', authenticateToken, async (req, res) => {
  try {
    const {
      test_name,
      test_type,
      description,
      variants,
      target_metric,
      confidence_level,
      duration_days
    } = req.body;

    if (!test_name || !test_type || !variants || variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Test name, type, and at least 2 variants are required',
        code: 'INVALID_AB_TEST_CONFIG'
      });
    }

    const testConfig = {
      user_id: req.user.id,
      test_name,
      test_type,
      description,
      variants,
      target_metric,
      confidence_level,
      duration_days
    };

    const result = await abTestingService.createTest(testConfig);

    res.json({
      success: true,
      ab_test: result,
      message: 'A/B test created successfully'
    });

  } catch (error) {
    logger.error('A/B test creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create A/B test',
      code: 'AB_TEST_CREATION_ERROR'
    });
  }
});

/**
 * Get A/B test results
 * GET /api/analytics/ab-test/:testId/results
 */
router.get('/ab-test/:testId/results', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;

    const analysis = await abTestingService.analyzeTest(testId);

    res.json({
      success: true,
      ab_test_results: analysis,
      meta: {
        analyzed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('A/B test analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze A/B test',
      code: 'AB_TEST_ANALYSIS_ERROR'
    });
  }
});

/**
 * Get user's A/B tests dashboard
 * GET /api/analytics/ab-tests
 */
router.get('/ab-tests', authenticateToken, async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const userId = req.user.role === 'admin' ? null : req.user.id;

    const dashboard = await abTestingService.getTestDashboard(userId || req.user.id);

    res.json({
      success: true,
      ab_tests_dashboard: dashboard,
      meta: {
        user_id: userId || req.user.id,
        status_filter: status
      }
    });

  } catch (error) {
    logger.error('A/B test dashboard retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve A/B test dashboard',
      code: 'AB_TEST_DASHBOARD_ERROR'
    });
  }
});

/**
 * Record A/B test interaction
 * POST /api/analytics/ab-test/:testId/interaction
 */
router.post('/ab-test/:testId/interaction', authenticateToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const {
      variant_id,
      interaction_type,
      value = 1,
      metadata = {}
    } = req.body;

    if (!variant_id || !interaction_type) {
      return res.status(400).json({
        success: false,
        error: 'Variant ID and interaction type are required',
        code: 'MISSING_INTERACTION_DATA'
      });
    }

    const interaction = {
      user_id: req.user.id,
      interaction_type,
      value,
      metadata
    };

    await abTestingService.recordInteraction(testId, variant_id, interaction);

    res.json({
      success: true,
      message: 'A/B test interaction recorded',
      interaction: {
        test_id: testId,
        variant_id,
        interaction_type,
        recorded_at: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('A/B test interaction recording failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record A/B test interaction',
      code: 'AB_TEST_INTERACTION_ERROR'
    });
  }
});

/**
 * Get business intelligence report
 * GET /api/analytics/business-intelligence
 */
router.get('/business-intelligence', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for business intelligence reports',
        code: 'ACCESS_DENIED'
      });
    }

    const {
      start_date,
      end_date,
      metrics = 'all',
      format = 'json'
    } = req.query;

    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    // Generate comprehensive BI report
    const report = await Promise.all([
      analyticsDashboardService.getDashboardData('30d'),
      performanceMonitoringService.getPerformanceStats('30d'),
      errorTrackingService.getErrorStatistics('30d'),
      abTestingService.getTestDashboard(),
      // Add cohort analysis
      db('user_cohorts')
        .whereBetween('cohort_date', [startDate, endDate])
        .groupBy('cohort_type', 'cohort_identifier')
        .select('cohort_type', 'cohort_identifier')
        .count('* as users'),
      // Revenue analysis
      db('purchases')
        .whereBetween('created_at', [startDate, endDate])
        .select(
          db.raw("DATE_TRUNC('week', created_at) as week"),
          db.raw('SUM(amount) as revenue'),
          db.raw('COUNT(*) as transactions'),
          db.raw('AVG(amount) as avg_order_value')
        )
        .groupBy(db.raw("DATE_TRUNC('week', created_at)"))
        .orderBy('week')
    ]);

    const businessReport = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      dashboard_overview: report[0],
      performance_metrics: report[1],
      error_analysis: report[2],
      ab_testing_summary: report[3],
      cohort_analysis: report[4],
      revenue_analysis: report[5],
      generated_at: new Date().toISOString(),
      report_id: `BI_${Date.now()}`
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=business-intelligence-report.csv');
      res.send(this.convertToCSV(businessReport));
    } else {
      res.json({
        success: true,
        business_intelligence: businessReport
      });
    }

  } catch (error) {
    logger.error('Business intelligence report generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate business intelligence report',
      code: 'BI_REPORT_ERROR'
    });
  }
});

/**
 * Export analytics data
 * GET /api/analytics/export
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const {
      type = 'all',
      format = 'json',
      timeframe = '30d',
      include_pii = false
    } = req.query;

    // Check permissions for PII data
    if (include_pii === 'true' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for PII data export',
        code: 'PII_ACCESS_DENIED'
      });
    }

    const exportData = {};

    // Export different types of data based on request
    if (type === 'all' || type === 'events') {
      const timeframeDays = { '7d': 7, '30d': 30, '90d': 90 }[timeframe] || 30;
      const since = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);

      let eventsQuery = db('user_behavior_events').where('server_timestamp', '>', since);
      
      if (include_pii !== 'true') {
        eventsQuery = eventsQuery.select([
          'event_name', 'event_category', 'platform', 'server_timestamp',
          'properties', 'sequence_number'
        ]);
      }

      exportData.user_events = await eventsQuery.limit(10000);
    }

    if (type === 'all' || type === 'performance') {
      exportData.performance_metrics = await performanceMonitoringService.getPerformanceStats(timeframe);
    }

    if (type === 'all' || type === 'errors') {
      exportData.error_analytics = await errorTrackingService.getErrorStatistics(timeframe);
    }

    const exportMetadata = {
      exported_at: new Date().toISOString(),
      export_type: type,
      timeframe,
      format,
      includes_pii: include_pii === 'true',
      exported_by: req.user.id,
      record_count: Object.values(exportData).reduce((sum, data) => 
        sum + (Array.isArray(data) ? data.length : 1), 0)
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${Date.now()}.csv`);
      res.send(this.convertToCSV({ ...exportData, metadata: exportMetadata }));
    } else {
      res.json({
        success: true,
        export: exportData,
        metadata: exportMetadata
      });
    }

  } catch (error) {
    logger.error('Analytics data export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      code: 'EXPORT_ERROR'
    });
  }
});

/**
 * Get analytics health status
 * GET /api/analytics/health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const healthStatus = {
      analytics_service: analytics.getHealthStatus(),
      error_tracking: errorTrackingService.getHealthStatus(),
      performance_monitoring: performanceMonitoringService.getHealthStatus(),
      dashboard_service: analyticsDashboardService.getHealthStatus(),
      database_connection: await db.raw('SELECT 1 as connected').then(() => true).catch(() => false),
      overall_status: 'healthy',
      checked_at: new Date().toISOString()
    };

    // Determine overall status
    const services = [
      healthStatus.analytics_service.enabled,
      healthStatus.error_tracking.initialized,
      healthStatus.performance_monitoring.initialized,
      healthStatus.dashboard_service.initialized,
      healthStatus.database_connection
    ];

    const healthyServices = services.filter(status => status).length;
    const totalServices = services.length;

    if (healthyServices === totalServices) {
      healthStatus.overall_status = 'healthy';
    } else if (healthyServices >= totalServices * 0.8) {
      healthStatus.overall_status = 'degraded';
    } else {
      healthStatus.overall_status = 'unhealthy';
    }

    healthStatus.service_health_percentage = Math.round((healthyServices / totalServices) * 100);

    res.json({
      success: true,
      health: healthStatus
    });

  } catch (error) {
    logger.error('Analytics health check failed:', error);
    res.status(500).json({
      success: false,
      health: {
        overall_status: 'unhealthy',
        error: error.message
      }
    });
  }
});

/**
 * Helper method to convert data to CSV
 */
function convertToCSV(data) {
  // Simplified CSV conversion - would need more robust implementation
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
  
  return JSON.stringify(data, null, 2);
}

module.exports = router;