const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const moderationDashboardService = require('../services/moderationDashboardService');
const contentModerationService = require('../services/contentModerationService');
const fakeProfileDetectionService = require('../services/fakeProfileDetectionService');
const ageVerificationService = require('../services/ageVerificationService');
const userSafetyService = require('../services/userSafetyService');
const logger = require('../config/logger');

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many admin requests from this IP'
});

/**
 * @swagger
 * tags:
 *   name: Moderation Dashboard
 *   description: Admin dashboard for content moderation and user safety
 */

/**
 * @swagger
 * /api/moderation-dashboard/overview:
 *   get:
 *     summary: Get moderation dashboard overview
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *           default: 7d
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *       403:
 *         description: Admin access required
 */
router.get('/overview',
  adminLimiter,
  authMiddleware,
  [
    query('time_range').optional().isIn(['24h', '7d', '30d', '90d'])
  ],
  async (req, res) => {
    try {
      // Check admin access
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const timeRange = req.query.time_range || '7d';
      const overview = await moderationDashboardService.getDashboardOverview(timeRange);

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      logger.error('Dashboard overview failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard overview'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/real-time-stats:
 *   get:
 *     summary: Get real-time moderation queue statistics
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time statistics
 */
router.get('/real-time-stats',
  adminLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const stats = await moderationDashboardService.getRealTimeQueueStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Real-time stats failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load real-time statistics'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/charts/queue-priority:
 *   get:
 *     summary: Generate queue priority chart
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           default: 7d
 *     responses:
 *       200:
 *         description: Chart image (PNG)
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/charts/queue-priority',
  adminLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const timeRange = req.query.time_range || '7d';
      const chartBuffer = await moderationDashboardService.generateQueuePriorityChart(timeRange);

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': chartBuffer.length,
        'Cache-Control': 'public, max-age=300' // 5 minutes cache
      });

      res.send(chartBuffer);

    } catch (error) {
      logger.error('Queue priority chart failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate chart'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/charts/violation-trends:
 *   get:
 *     summary: Generate violation trends chart
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           default: 30d
 *     responses:
 *       200:
 *         description: Chart image (PNG)
 */
router.get('/charts/violation-trends',
  adminLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const timeRange = req.query.time_range || '30d';
      const chartBuffer = await moderationDashboardService.generateViolationTrendsChart(timeRange);

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': chartBuffer.length,
        'Cache-Control': 'public, max-age=300'
      });

      res.send(chartBuffer);

    } catch (error) {
      logger.error('Violation trends chart failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate chart'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/ai-performance:
 *   get:
 *     summary: Get AI model performance metrics
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI performance data
 */
router.get('/ai-performance',
  adminLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const performance = await moderationDashboardService.getAIModelPerformance();

      res.json({
        success: true,
        data: performance
      });

    } catch (error) {
      logger.error('AI performance data failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load AI performance data'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/fake-profile-stats:
 *   get:
 *     summary: Get fake profile detection statistics
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 7d
 *     responses:
 *       200:
 *         description: Fake profile detection statistics
 */
router.get('/fake-profile-stats',
  adminLimiter,
  authMiddleware,
  [
    query('time_range').optional().isIn(['24h', '7d', '30d'])
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const timeRange = req.query.time_range || '7d';
      const stats = await fakeProfileDetectionService.getFakeDetectionStats(timeRange);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Fake profile stats failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load fake profile statistics'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/age-verification-stats:
 *   get:
 *     summary: Get age verification statistics
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: time_range
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Age verification statistics
 */
router.get('/age-verification-stats',
  adminLimiter,
  authMiddleware,
  [
    query('time_range').optional().isIn(['24h', '7d', '30d'])
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const timeRange = req.query.time_range || '30d';
      const stats = await ageVerificationService.getVerificationStats(timeRange);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Age verification stats failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load age verification statistics'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/pending-age-verifications:
 *   get:
 *     summary: Get pending age verifications for manual review
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Pending age verifications
 */
router.get('/pending-age-verifications',
  adminLimiter,
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const page = req.query.page || 1;
      const limit = req.query.limit || 50;

      const verifications = await ageVerificationService.getPendingVerifications(page, limit);

      res.json({
        success: true,
        data: verifications
      });

    } catch (error) {
      logger.error('Pending age verifications failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load pending verifications'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/user-safety-scores:
 *   get:
 *     summary: Get user safety scores distribution
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User safety scores statistics
 */
router.get('/user-safety-scores',
  adminLimiter,
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      // This would ideally be cached or pre-computed
      const db = require('../config/database');
      
      const stats = await db('users')
        .select(
          db.raw('COUNT(*) as total_users'),
          db.raw('COUNT(CASE WHEN email_verified = true THEN 1 END) as email_verified'),
          db.raw('COUNT(CASE WHEN phone_verified = true THEN 1 END) as phone_verified'),
          db.raw('COUNT(CASE WHEN age_verified = true THEN 1 END) as age_verified'),
          db.raw('COUNT(CASE WHEN profile_image_url IS NOT NULL THEN 1 END) as has_profile_photo'),
          db.raw('AVG(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as mature_accounts')
        )
        .first();

      // Get violation distribution
      const violationStats = await db('content_violations')
        .select(
          'severity',
          db.raw('COUNT(*) as count')
        )
        .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .groupBy('severity');

      res.json({
        success: true,
        data: {
          user_stats: stats,
          violation_distribution: violationStats
        }
      });

    } catch (error) {
      logger.error('User safety scores failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load user safety statistics'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/compliance-report:
 *   get:
 *     summary: Generate compliance report for app stores
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: report_type
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, quarterly]
 *           default: monthly
 *     responses:
 *       200:
 *         description: Compliance report data
 */
router.get('/compliance-report',
  adminLimiter,
  authMiddleware,
  [
    query('report_type').optional().isIn(['weekly', 'monthly', 'quarterly'])
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const reportType = req.query.report_type || 'monthly';
      
      // Calculate date range based on report type
      const endDate = new Date();
      const startDate = new Date();
      
      switch (reportType) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'quarterly':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default: // monthly
          startDate.setDate(startDate.getDate() - 30);
      }

      const [
        moderationStats,
        ageVerificationStats,
        fakeProfileStats,
        violationStats
      ] = await Promise.all([
        contentModerationService.getModerationAnalytics(startDate, endDate),
        ageVerificationService.getVerificationStats(reportType === 'weekly' ? '7d' : '30d'),
        fakeProfileDetectionService.getFakeDetectionStats(reportType === 'weekly' ? '7d' : '30d'),
        moderationDashboardService.getDashboardOverview(reportType === 'weekly' ? '7d' : '30d')
      ]);

      const complianceReport = {
        report_period: {
          type: reportType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        content_moderation: {
          total_content_processed: moderationStats.summary.total_processed,
          automated_decisions: moderationStats.summary.auto_approved + moderationStats.summary.auto_rejected,
          human_reviews: moderationStats.summary.human_reviewed,
          avg_review_time_hours: moderationStats.summary.avg_review_time_ms ? 
            (moderationStats.summary.avg_review_time_ms / (1000 * 60 * 60)).toFixed(2) : 0,
          violation_breakdown: moderationStats.violation_breakdown
        },
        age_verification: {
          total_verifications: ageVerificationStats.total_verifications,
          verification_rate: ageVerificationStats.verification_rate,
          rejection_rate: ageVerificationStats.rejection_rate,
          pending_reviews: ageVerificationStats.pending
        },
        fake_profile_detection: {
          profiles_analyzed: fakeProfileStats.total_analyzed,
          fake_detection_rate: fakeProfileStats.fake_detection_rate,
          high_risk_profiles: fakeProfileStats.high_risk,
          confirmed_fake: fakeProfileStats.confirmed_fake
        },
        policy_compliance: {
          coppa_compliance: {
            underage_accounts_rejected: ageVerificationStats.rejected,
            age_verification_required: true,
            parental_consent_process: 'N/A - 18+ platform'
          },
          app_store_guidelines: {
            adult_content_blocked: moderationStats.violation_breakdown.filter(v => v.violation_type === 'nsfw').length || 0,
            harassment_addressed: moderationStats.violation_breakdown.filter(v => v.violation_type === 'harassment').length || 0,
            spam_removed: moderationStats.violation_breakdown.filter(v => v.violation_type === 'spam').length || 0
          },
          user_safety: {
            safety_features_enabled: true,
            reporting_system_active: true,
            emergency_procedures: true,
            safety_education_provided: true
          }
        },
        generated_at: new Date().toISOString(),
        generated_by: req.user.email
      };

      res.json({
        success: true,
        data: complianceReport
      });

    } catch (error) {
      logger.error('Compliance report generation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report'
      });
    }
  }
);

/**
 * @swagger
 * /api/moderation-dashboard/export-data:
 *   get:
 *     summary: Export moderation data for analysis
 *     tags: [Moderation Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_type
 *         schema:
 *           type: string
 *           enum: [violations, reports, queue, analytics]
 *           default: analytics
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Exported data
 */
router.get('/export-data',
  adminLimiter,
  authMiddleware,
  [
    query('data_type').optional().isIn(['violations', 'reports', 'queue', 'analytics']),
    query('format').optional().isIn(['json', 'csv']),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const dataType = req.query.data_type || 'analytics';
      const format = req.query.format || 'json';
      const dateFrom = req.query.date_from ? new Date(req.query.date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dateTo = req.query.date_to ? new Date(req.query.date_to) : new Date();

      let data;
      const db = require('../config/database');

      switch (dataType) {
        case 'violations':
          data = await db('content_violations')
            .select('*')
            .whereBetween('created_at', [dateFrom, dateTo])
            .orderBy('created_at', 'desc');
          break;
        case 'reports':
          data = await db('user_reports')
            .select('*')
            .whereBetween('created_at', [dateFrom, dateTo])
            .orderBy('created_at', 'desc');
          break;
        case 'queue':
          data = await db('content_moderation_queue')
            .select('*')
            .whereBetween('created_at', [dateFrom, dateTo])
            .orderBy('created_at', 'desc');
          break;
        default:
          data = await moderationDashboardService.getDashboardOverview('30d');
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(data);
        res.set({
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="moderation_${dataType}_${Date.now()}.csv"`
        });
        res.send(csv);
      } else {
        res.json({
          success: true,
          data,
          metadata: {
            data_type: dataType,
            date_range: { from: dateFrom, to: dateTo },
            record_count: Array.isArray(data) ? data.length : 1,
            exported_at: new Date().toISOString(),
            exported_by: req.user.email
          }
        });
      }

    } catch (error) {
      logger.error('Data export failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }
);

// Helper function to convert JSON to CSV
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

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

module.exports = router;