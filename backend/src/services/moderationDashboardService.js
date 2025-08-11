const db = require('../config/database');
const logger = require('../config/logger');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

/**
 * Moderation Dashboard Service
 * Provides analytics, metrics, and dashboard functionality for content moderators
 */
class ModerationDashboardService {
  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white'
    });
  }

  /**
   * Get comprehensive moderation dashboard data
   */
  async getDashboardOverview(timeRange = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const [
        queueStats,
        reportsStats,
        violationStats,
        processingStats,
        moderatorPerformance,
        trendingViolations,
        contentTypeBreakdown
      ] = await Promise.all([
        this.getQueueStatistics(startDate, endDate),
        this.getReportsStatistics(startDate, endDate),
        this.getViolationStatistics(startDate, endDate),
        this.getProcessingStatistics(startDate, endDate),
        this.getModeratorPerformance(startDate, endDate),
        this.getTrendingViolations(startDate, endDate),
        this.getContentTypeBreakdown(startDate, endDate)
      ]);

      return {
        overview: {
          queue_stats: queueStats,
          reports_stats: reportsStats,
          violation_stats: violationStats,
          processing_stats: processingStats
        },
        performance: {
          moderator_performance: moderatorPerformance,
          trending_violations: trendingViolations,
          content_breakdown: contentTypeBreakdown
        },
        time_range: timeRange,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get moderation queue statistics
   */
  async getQueueStatistics(startDate, endDate) {
    try {
      const stats = await db('content_moderation_queue')
        .select(
          db.raw('COUNT(*) as total_items'),
          db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending'),
          db.raw('COUNT(CASE WHEN status = "flagged" THEN 1 END) as flagged'),
          db.raw('COUNT(CASE WHEN status = "approved" THEN 1 END) as approved'),
          db.raw('COUNT(CASE WHEN status = "rejected" THEN 1 END) as rejected'),
          db.raw('COUNT(CASE WHEN priority = "critical" THEN 1 END) as critical_priority'),
          db.raw('COUNT(CASE WHEN priority = "high" THEN 1 END) as high_priority'),
          db.raw('AVG(CASE WHEN reviewed_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, submitted_at, reviewed_at) END) as avg_review_time_seconds')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .first();

      // Get oldest pending item
      const oldestPending = await db('content_moderation_queue')
        .select('submitted_at')
        .where('status', 'pending')
        .orderBy('submitted_at', 'asc')
        .first();

      return {
        ...stats,
        pending_percentage: stats.total_items > 0 ? (stats.pending / stats.total_items * 100).toFixed(2) : 0,
        oldest_pending_hours: oldestPending ? 
          Math.floor((new Date() - new Date(oldestPending.submitted_at)) / (1000 * 60 * 60)) : 0,
        avg_review_time_minutes: stats.avg_review_time_seconds ? 
          Math.round(stats.avg_review_time_seconds / 60) : 0
      };

    } catch (error) {
      logger.error('Failed to get queue statistics:', error);
      throw error;
    }
  }

  /**
   * Get user reports statistics
   */
  async getReportsStatistics(startDate, endDate) {
    try {
      const stats = await db('user_reports')
        .select(
          db.raw('COUNT(*) as total_reports'),
          db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending'),
          db.raw('COUNT(CASE WHEN status = "investigating" THEN 1 END) as investigating'),
          db.raw('COUNT(CASE WHEN status = "resolved" THEN 1 END) as resolved'),
          db.raw('COUNT(CASE WHEN status = "dismissed" THEN 1 END) as dismissed'),
          db.raw('COUNT(CASE WHEN priority = "critical" THEN 1 END) as critical_reports')
        )
        .whereBetween('created_at', [startDate, endDate])
        .first();

      // Get report type breakdown
      const reportTypeBreakdown = await db('user_reports')
        .select('report_type', db.raw('COUNT(*) as count'))
        .whereBetween('created_at', [startDate, endDate])
        .groupBy('report_type')
        .orderBy('count', 'desc');

      // Get top reported users
      const topReported = await db('user_reports')
        .select(
          'reported_user_id',
          db.raw('COUNT(*) as report_count'),
          'users.email',
          'users.first_name'
        )
        .leftJoin('users', 'user_reports.reported_user_id', 'users.id')
        .whereBetween('user_reports.created_at', [startDate, endDate])
        .groupBy('reported_user_id', 'users.email', 'users.first_name')
        .orderBy('report_count', 'desc')
        .limit(10);

      return {
        ...stats,
        resolution_rate: stats.total_reports > 0 ? 
          ((stats.resolved + stats.dismissed) / stats.total_reports * 100).toFixed(2) : 0,
        report_type_breakdown: reportTypeBreakdown,
        top_reported_users: topReported
      };

    } catch (error) {
      logger.error('Failed to get reports statistics:', error);
      throw error;
    }
  }

  /**
   * Get violation statistics
   */
  async getViolationStatistics(startDate, endDate) {
    try {
      const stats = await db('content_violations')
        .select(
          db.raw('COUNT(*) as total_violations'),
          db.raw('COUNT(CASE WHEN severity = "critical" THEN 1 END) as critical'),
          db.raw('COUNT(CASE WHEN severity = "high" THEN 1 END) as high'),
          db.raw('COUNT(CASE WHEN severity = "medium" THEN 1 END) as medium'),
          db.raw('COUNT(CASE WHEN severity = "low" THEN 1 END) as low'),
          db.raw('COUNT(CASE WHEN action_taken != "none" THEN 1 END) as actions_taken')
        )
        .whereBetween('created_at', [startDate, endDate])
        .first();

      // Get violation type breakdown
      const violationTypeBreakdown = await db('content_violations')
        .select('violation_type', db.raw('COUNT(*) as count'))
        .whereBetween('created_at', [startDate, endDate])
        .groupBy('violation_type')
        .orderBy('count', 'desc');

      // Get action breakdown
      const actionBreakdown = await db('content_violations')
        .select('action_taken', db.raw('COUNT(*) as count'))
        .whereBetween('created_at', [startDate, endDate])
        .where('action_taken', '!=', 'none')
        .groupBy('action_taken')
        .orderBy('count', 'desc');

      // Get repeat offenders
      const repeatOffenders = await db('content_violations')
        .select(
          'user_id',
          db.raw('COUNT(*) as violation_count'),
          'users.email',
          'users.first_name'
        )
        .leftJoin('users', 'content_violations.user_id', 'users.id')
        .whereBetween('content_violations.created_at', [startDate, endDate])
        .groupBy('user_id', 'users.email', 'users.first_name')
        .having('violation_count', '>=', 2)
        .orderBy('violation_count', 'desc')
        .limit(10);

      return {
        ...stats,
        action_rate: stats.total_violations > 0 ? 
          (stats.actions_taken / stats.total_violations * 100).toFixed(2) : 0,
        violation_type_breakdown: violationTypeBreakdown,
        action_breakdown: actionBreakdown,
        repeat_offenders: repeatOffenders
      };

    } catch (error) {
      logger.error('Failed to get violation statistics:', error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStatistics(startDate, endDate) {
    try {
      const stats = await db('content_moderation_queue')
        .select(
          db.raw('COUNT(*) as total_processed'),
          db.raw('AVG(ai_confidence_score) as avg_ai_confidence'),
          db.raw('COUNT(CASE WHEN ai_confidence_score >= 0.9 THEN 1 END) as high_confidence_ai'),
          db.raw('COUNT(CASE WHEN status = "approved" AND assigned_moderator IS NULL THEN 1 END) as auto_approved'),
          db.raw('COUNT(CASE WHEN status = "rejected" AND assigned_moderator IS NULL THEN 1 END) as auto_rejected'),
          db.raw('COUNT(CASE WHEN assigned_moderator IS NOT NULL THEN 1 END) as human_reviewed')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .first();

      // Calculate automation rate
      const automationRate = stats.total_processed > 0 ? 
        ((stats.auto_approved + stats.auto_rejected) / stats.total_processed * 100).toFixed(2) : 0;

      // Get hourly processing volume
      const hourlyVolume = await db('content_moderation_queue')
        .select(
          db.raw('HOUR(submitted_at) as hour'),
          db.raw('COUNT(*) as count')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .groupBy(db.raw('HOUR(submitted_at)'))
        .orderBy('hour');

      return {
        ...stats,
        automation_rate: automationRate,
        human_review_rate: stats.total_processed > 0 ? 
          (stats.human_reviewed / stats.total_processed * 100).toFixed(2) : 0,
        hourly_volume: hourlyVolume
      };

    } catch (error) {
      logger.error('Failed to get processing statistics:', error);
      throw error;
    }
  }

  /**
   * Get moderator performance metrics
   */
  async getModeratorPerformance(startDate, endDate) {
    try {
      const performance = await db('moderation_actions as ma')
        .select(
          'ma.moderator_id',
          'users.email',
          'users.first_name',
          db.raw('COUNT(*) as total_actions'),
          db.raw('COUNT(CASE WHEN action_type = "approve" THEN 1 END) as approvals'),
          db.raw('COUNT(CASE WHEN action_type = "reject" THEN 1 END) as rejections'),
          db.raw('AVG(TIMESTAMPDIFF(SECOND, cmq.submitted_at, ma.created_at)) as avg_response_time_seconds')
        )
        .leftJoin('users', 'ma.moderator_id', 'users.id')
        .leftJoin('content_moderation_queue as cmq', 'ma.content_id', 'cmq.id')
        .whereBetween('ma.created_at', [startDate, endDate])
        .groupBy('ma.moderator_id', 'users.email', 'users.first_name')
        .orderBy('total_actions', 'desc');

      // Calculate performance metrics
      const performanceWithMetrics = performance.map(moderator => ({
        ...moderator,
        approval_rate: moderator.total_actions > 0 ? 
          (moderator.approvals / moderator.total_actions * 100).toFixed(2) : 0,
        avg_response_time_minutes: moderator.avg_response_time_seconds ? 
          Math.round(moderator.avg_response_time_seconds / 60) : 0
      }));

      return performanceWithMetrics;

    } catch (error) {
      logger.error('Failed to get moderator performance:', error);
      throw error;
    }
  }

  /**
   * Get trending violations
   */
  async getTrendingViolations(startDate, endDate) {
    try {
      const currentPeriod = await db('content_violations')
        .select('violation_type', db.raw('COUNT(*) as current_count'))
        .whereBetween('created_at', [startDate, endDate])
        .groupBy('violation_type');

      // Get previous period for comparison
      const periodLength = endDate - startDate;
      const previousStartDate = new Date(startDate.getTime() - periodLength);
      const previousEndDate = new Date(startDate);

      const previousPeriod = await db('content_violations')
        .select('violation_type', db.raw('COUNT(*) as previous_count'))
        .whereBetween('created_at', [previousStartDate, previousEndDate])
        .groupBy('violation_type');

      // Calculate trends
      const trendMap = new Map();
      previousPeriod.forEach(prev => {
        trendMap.set(prev.violation_type, prev.previous_count);
      });

      const trending = currentPeriod.map(current => {
        const previousCount = trendMap.get(current.violation_type) || 0;
        const changePercent = previousCount > 0 ? 
          ((current.current_count - previousCount) / previousCount * 100).toFixed(1) : 
          current.current_count > 0 ? '100.0' : '0.0';

        return {
          violation_type: current.violation_type,
          current_count: current.current_count,
          previous_count: previousCount,
          change_percent: parseFloat(changePercent),
          trend: parseFloat(changePercent) > 10 ? 'rising' : 
                 parseFloat(changePercent) < -10 ? 'falling' : 'stable'
        };
      });

      return trending.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));

    } catch (error) {
      logger.error('Failed to get trending violations:', error);
      throw error;
    }
  }

  /**
   * Get content type breakdown
   */
  async getContentTypeBreakdown(startDate, endDate) {
    try {
      const breakdown = await db('content_moderation_queue')
        .select(
          'content_type',
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN status = "approved" THEN 1 END) as approved'),
          db.raw('COUNT(CASE WHEN status = "rejected" THEN 1 END) as rejected'),
          db.raw('COUNT(CASE WHEN status = "flagged" THEN 1 END) as flagged'),
          db.raw('AVG(ai_confidence_score) as avg_confidence')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .groupBy('content_type')
        .orderBy('total', 'desc');

      const breakdownWithRates = breakdown.map(item => ({
        ...item,
        approval_rate: item.total > 0 ? (item.approved / item.total * 100).toFixed(2) : 0,
        rejection_rate: item.total > 0 ? (item.rejected / item.total * 100).toFixed(2) : 0,
        flag_rate: item.total > 0 ? (item.flagged / item.total * 100).toFixed(2) : 0
      }));

      return breakdownWithRates;

    } catch (error) {
      logger.error('Failed to get content type breakdown:', error);
      throw error;
    }
  }

  /**
   * Generate moderation queue priority chart
   */
  async generateQueuePriorityChart(timeRange = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange.replace('d', '')));

      const data = await db('content_moderation_queue')
        .select(
          'priority',
          'status',
          db.raw('COUNT(*) as count')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .groupBy('priority', 'status')
        .orderBy('priority');

      // Prepare chart data
      const priorities = ['low', 'medium', 'high', 'critical'];
      const statuses = ['pending', 'approved', 'rejected', 'flagged'];
      const colors = {
        pending: '#fbbf24',
        approved: '#10b981',
        rejected: '#ef4444',
        flagged: '#f97316'
      };

      const datasets = statuses.map(status => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        data: priorities.map(priority => {
          const item = data.find(d => d.priority === priority && d.status === status);
          return item ? item.count : 0;
        }),
        backgroundColor: colors[status],
        borderColor: colors[status],
        borderWidth: 1
      }));

      const chartConfig = {
        type: 'bar',
        data: {
          labels: priorities.map(p => p.charAt(0).toUpperCase() + p.slice(1)),
          datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Moderation Queue by Priority and Status'
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            x: {
              stacked: true,
              title: {
                display: true,
                text: 'Priority Level'
              }
            },
            y: {
              stacked: true,
              title: {
                display: true,
                text: 'Number of Items'
              }
            }
          }
        }
      };

      const chartBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      return chartBuffer;

    } catch (error) {
      logger.error('Failed to generate priority chart:', error);
      throw error;
    }
  }

  /**
   * Generate violation trends chart
   */
  async generateViolationTrendsChart(timeRange = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange.replace('d', '')));

      const data = await db('content_violations')
        .select(
          db.raw('DATE(created_at) as date'),
          'violation_type',
          db.raw('COUNT(*) as count')
        )
        .whereBetween('created_at', [startDate, endDate])
        .groupBy(db.raw('DATE(created_at)'), 'violation_type')
        .orderBy('date');

      // Get unique violation types and dates
      const violationTypes = [...new Set(data.map(d => d.violation_type))];
      const dates = [...new Set(data.map(d => d.date))].sort();

      const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
      ];

      const datasets = violationTypes.map((type, index) => ({
        label: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
        data: dates.map(date => {
          const item = data.find(d => d.date === date && d.violation_type === type);
          return item ? item.count : 0;
        }),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1
      }));

      const chartConfig = {
        type: 'line',
        data: {
          labels: dates,
          datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Violation Trends Over Time'
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Number of Violations'
              }
            }
          }
        }
      };

      const chartBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      return chartBuffer;

    } catch (error) {
      logger.error('Failed to generate violation trends chart:', error);
      throw error;
    }
  }

  /**
   * Get AI model performance metrics
   */
  async getAIModelPerformance() {
    try {
      const models = await db('ai_detection_models')
        .select('*')
        .where('active', true);

      // Get recent predictions vs manual reviews for accuracy
      const recentAccuracy = await db('content_moderation_queue as cmq')
        .select(
          db.raw('AVG(CASE WHEN (ai_confidence_score > 0.8 AND status = "approved") OR (ai_confidence_score <= 0.2 AND status = "rejected") THEN 1 ELSE 0 END) as ai_accuracy_rate'),
          db.raw('COUNT(CASE WHEN assigned_moderator IS NOT NULL THEN 1 END) as human_reviewed'),
          db.raw('COUNT(CASE WHEN assigned_moderator IS NULL THEN 1 END) as ai_only')
        )
        .where('cmq.created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .first();

      return {
        models,
        performance: {
          ai_accuracy_rate: (recentAccuracy.ai_accuracy_rate * 100).toFixed(2),
          human_reviewed: recentAccuracy.human_reviewed,
          ai_only: recentAccuracy.ai_only,
          automation_rate: recentAccuracy.ai_only + recentAccuracy.human_reviewed > 0 ? 
            (recentAccuracy.ai_only / (recentAccuracy.ai_only + recentAccuracy.human_reviewed) * 100).toFixed(2) : 0
        }
      };

    } catch (error) {
      logger.error('Failed to get AI model performance:', error);
      throw error;
    }
  }

  /**
   * Get real-time queue statistics
   */
  async getRealTimeQueueStats() {
    try {
      const stats = await db('content_moderation_queue')
        .select(
          db.raw('COUNT(CASE WHEN status = "pending" THEN 1 END) as pending_count'),
          db.raw('COUNT(CASE WHEN status = "flagged" AND priority = "critical" THEN 1 END) as critical_flagged'),
          db.raw('COUNT(CASE WHEN status = "pending" AND created_at < DATE_SUB(NOW(), INTERVAL 4 HOUR) THEN 1 END) as overdue_items'),
          db.raw('AVG(CASE WHEN status = "pending" THEN TIMESTAMPDIFF(MINUTE, created_at, NOW()) END) as avg_wait_time_minutes')
        )
        .first();

      const activeModerrators = await db('users')
        .select(db.raw('COUNT(*) as count'))
        .where('role', 'moderator')
        .where('last_login', '>', new Date(Date.now() - 60 * 60 * 1000)) // Active in last hour
        .first();

      return {
        ...stats,
        active_moderators: activeModerrators.count,
        queue_health: stats.overdue_items === 0 && stats.critical_flagged < 5 ? 'good' : 
                     stats.overdue_items < 10 && stats.critical_flagged < 10 ? 'warning' : 'critical'
      };

    } catch (error) {
      logger.error('Failed to get real-time queue stats:', error);
      throw error;
    }
  }
}

module.exports = new ModerationDashboardService();