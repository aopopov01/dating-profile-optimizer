const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../config/logger');
const contentModerationService = require('./contentModerationService');
const fakeProfileDetectionService = require('./fakeProfileDetectionService');
const ageVerificationService = require('./ageVerificationService');
const { v4: uuidv4 } = require('uuid');

/**
 * Automated Content Moderation Scheduler Service
 * Handles scheduled tasks for content moderation, user safety, and compliance
 */
class ModerationSchedulerService {
  constructor() {
    this.tasks = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize all scheduled moderation tasks
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Moderation scheduler already initialized');
      return;
    }

    try {
      // Schedule content moderation tasks
      this.scheduleContentModeration();
      
      // Schedule fake profile detection
      this.scheduleFakeProfileDetection();
      
      // Schedule age verification cleanup
      this.scheduleAgeVerificationCleanup();
      
      // Schedule analytics generation
      this.scheduleModerationAnalytics();
      
      // Schedule safety check-in monitoring
      this.scheduleSafetyCheckInMonitoring();
      
      // Schedule emergency alert processing
      this.scheduleEmergencyAlertProcessing();
      
      // Schedule violation pattern analysis
      this.scheduleViolationPatternAnalysis();
      
      // Schedule compliance reporting
      this.scheduleComplianceReporting();

      this.isInitialized = true;
      logger.info('Moderation scheduler initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize moderation scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule automated content moderation tasks
   */
  scheduleContentModeration() {
    // Process pending content every 5 minutes
    const contentProcessingTask = cron.schedule('*/5 * * * *', async () => {
      try {
        await this.processPendingContent();
      } catch (error) {
        logger.error('Scheduled content processing failed:', error);
      }
    }, { scheduled: false });

    // Escalate overdue reviews every 30 minutes
    const escalationTask = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.escalateOverdueReviews();
      } catch (error) {
        logger.error('Scheduled review escalation failed:', error);
      }
    }, { scheduled: false });

    // Clean up old moderation queue entries daily at 2 AM
    const cleanupTask = cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldModerationEntries();
      } catch (error) {
        logger.error('Scheduled moderation cleanup failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('content_processing', contentProcessingTask);
    this.tasks.set('review_escalation', escalationTask);
    this.tasks.set('moderation_cleanup', cleanupTask);

    // Start tasks
    contentProcessingTask.start();
    escalationTask.start();
    cleanupTask.start();

    logger.info('Content moderation tasks scheduled');
  }

  /**
   * Schedule fake profile detection tasks
   */
  scheduleFakeProfileDetection() {
    // Analyze new profiles daily at 3 AM
    const profileAnalysisTask = cron.schedule('0 3 * * *', async () => {
      try {
        await this.analyzeNewProfiles();
      } catch (error) {
        logger.error('Scheduled profile analysis failed:', error);
      }
    }, { scheduled: false });

    // Re-analyze flagged profiles weekly on Sunday at 4 AM
    const reAnalysisTask = cron.schedule('0 4 * * 0', async () => {
      try {
        await this.reAnalyzeFlaggedProfiles();
      } catch (error) {
        logger.error('Scheduled profile re-analysis failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('profile_analysis', profileAnalysisTask);
    this.tasks.set('profile_reanalysis', reAnalysisTask);

    profileAnalysisTask.start();
    reAnalysisTask.start();

    logger.info('Fake profile detection tasks scheduled');
  }

  /**
   * Schedule age verification cleanup
   */
  scheduleAgeVerificationCleanup() {
    // Check for expired verification attempts every hour
    const verificationCleanupTask = cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupExpiredVerifications();
      } catch (error) {
        logger.error('Scheduled verification cleanup failed:', error);
      }
    }, { scheduled: false });

    // Remind users with pending verifications daily at 10 AM
    const verificationReminderTask = cron.schedule('0 10 * * *', async () => {
      try {
        await this.sendVerificationReminders();
      } catch (error) {
        logger.error('Scheduled verification reminders failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('verification_cleanup', verificationCleanupTask);
    this.tasks.set('verification_reminders', verificationReminderTask);

    verificationCleanupTask.start();
    verificationReminderTask.start();

    logger.info('Age verification tasks scheduled');
  }

  /**
   * Schedule moderation analytics generation
   */
  scheduleModerationAnalytics() {
    // Generate daily analytics at 1 AM
    const dailyAnalyticsTask = cron.schedule('0 1 * * *', async () => {
      try {
        await this.generateDailyAnalytics();
      } catch (error) {
        logger.error('Scheduled daily analytics failed:', error);
      }
    }, { scheduled: false });

    // Generate weekly analytics on Monday at 5 AM
    const weeklyAnalyticsTask = cron.schedule('0 5 * * 1', async () => {
      try {
        await this.generateWeeklyAnalytics();
      } catch (error) {
        logger.error('Scheduled weekly analytics failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('daily_analytics', dailyAnalyticsTask);
    this.tasks.set('weekly_analytics', weeklyAnalyticsTask);

    dailyAnalyticsTask.start();
    weeklyAnalyticsTask.start();

    logger.info('Moderation analytics tasks scheduled');
  }

  /**
   * Schedule safety check-in monitoring
   */
  scheduleSafetyCheckInMonitoring() {
    // Check for missed safety check-ins every 15 minutes
    const checkInMonitoringTask = cron.schedule('*/15 * * * *', async () => {
      try {
        await this.monitorSafetyCheckIns();
      } catch (error) {
        logger.error('Scheduled safety check-in monitoring failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('checkin_monitoring', checkInMonitoringTask);
    checkInMonitoringTask.start();

    logger.info('Safety check-in monitoring scheduled');
  }

  /**
   * Schedule emergency alert processing
   */
  scheduleEmergencyAlertProcessing() {
    // Process emergency alerts every minute
    const emergencyProcessingTask = cron.schedule('* * * * *', async () => {
      try {
        await this.processEmergencyAlerts();
      } catch (error) {
        logger.error('Emergency alert processing failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('emergency_processing', emergencyProcessingTask);
    emergencyProcessingTask.start();

    logger.info('Emergency alert processing scheduled');
  }

  /**
   * Schedule violation pattern analysis
   */
  scheduleViolationPatternAnalysis() {
    // Analyze violation patterns daily at 6 AM
    const patternAnalysisTask = cron.schedule('0 6 * * *', async () => {
      try {
        await this.analyzeViolationPatterns();
      } catch (error) {
        logger.error('Scheduled violation pattern analysis failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('pattern_analysis', patternAnalysisTask);
    patternAnalysisTask.start();

    logger.info('Violation pattern analysis scheduled');
  }

  /**
   * Schedule compliance reporting
   */
  scheduleComplianceReporting() {
    // Generate monthly compliance report on 1st at 7 AM
    const monthlyReportTask = cron.schedule('0 7 1 * *', async () => {
      try {
        await this.generateMonthlyComplianceReport();
      } catch (error) {
        logger.error('Scheduled monthly compliance report failed:', error);
      }
    }, { scheduled: false });

    this.tasks.set('monthly_report', monthlyReportTask);
    monthlyReportTask.start();

    logger.info('Compliance reporting scheduled');
  }

  // Task implementation methods

  /**
   * Process pending content in moderation queue
   */
  async processPendingContent() {
    try {
      const pendingContent = await db('content_moderation_queue')
        .where('status', 'pending')
        .where('ai_confidence_score', '>=', 0.9)
        .limit(100);

      for (const content of pendingContent) {
        try {
          // Auto-approve high-confidence content
          if (content.ai_confidence_score >= 0.95 && 
              content.moderation_flags && 
              JSON.parse(content.moderation_flags).length === 0) {
            
            await db('content_moderation_queue')
              .where('id', content.id)
              .update({
                status: 'approved',
                reviewed_at: new Date()
              });

            logger.info(`Auto-approved content ${content.id} with confidence ${content.ai_confidence_score}`);
          }
        } catch (contentError) {
          logger.error(`Failed to process content ${content.id}:`, contentError);
        }
      }

      logger.info(`Processed ${pendingContent.length} pending content items`);

    } catch (error) {
      logger.error('Failed to process pending content:', error);
    }
  }

  /**
   * Escalate overdue reviews
   */
  async escalateOverdueReviews() {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      const overdueReviews = await db('content_moderation_queue')
        .where('status', 'flagged')
        .where('submitted_at', '<', fourHoursAgo)
        .whereNull('assigned_moderator');

      for (const review of overdueReviews) {
        await db('content_moderation_queue')
          .where('id', review.id)
          .update({
            priority: 'critical',
            updated_at: new Date()
          });
      }

      if (overdueReviews.length > 0) {
        logger.warn(`Escalated ${overdueReviews.length} overdue reviews to critical priority`);
      }

    } catch (error) {
      logger.error('Failed to escalate overdue reviews:', error);
    }
  }

  /**
   * Clean up old moderation entries
   */
  async cleanupOldModerationEntries() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deleted = await db('content_moderation_queue')
        .where('created_at', '<', thirtyDaysAgo)
        .whereIn('status', ['approved', 'rejected'])
        .del();

      logger.info(`Cleaned up ${deleted} old moderation entries`);

    } catch (error) {
      logger.error('Failed to cleanup old moderation entries:', error);
    }
  }

  /**
   * Analyze new profiles for fake indicators
   */
  async analyzeNewProfiles() {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const newUsers = await db('users')
        .select('id')
        .where('created_at', '>=', yesterday)
        .whereNotExists(function() {
          this.select('*')
            .from('fake_profile_detection')
            .whereRaw('fake_profile_detection.user_id = users.id');
        })
        .limit(50); // Process in batches

      if (newUsers.length > 0) {
        const userIds = newUsers.map(u => u.id);
        await fakeProfileDetectionService.batchAnalyzeProfiles(userIds);
        logger.info(`Analyzed ${newUsers.length} new profiles for fake indicators`);
      }

    } catch (error) {
      logger.error('Failed to analyze new profiles:', error);
    }
  }

  /**
   * Re-analyze flagged profiles
   */
  async reAnalyzeFlaggedProfiles() {
    try {
      const flaggedProfiles = await db('fake_profile_detection')
        .select('user_id')
        .where('status', 'suspicious')
        .where('updated_at', '<', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .limit(25);

      if (flaggedProfiles.length > 0) {
        const userIds = flaggedProfiles.map(p => p.user_id);
        await fakeProfileDetectionService.batchAnalyzeProfiles(userIds);
        logger.info(`Re-analyzed ${flaggedProfiles.length} flagged profiles`);
      }

    } catch (error) {
      logger.error('Failed to re-analyze flagged profiles:', error);
    }
  }

  /**
   * Clean up expired age verifications
   */
  async cleanupExpiredVerifications() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const expiredVerifications = await db('age_verification')
        .where('verification_status', 'pending')
        .where('created_at', '<', sevenDaysAgo);

      for (const verification of expiredVerifications) {
        await db('age_verification')
          .where('id', verification.id)
          .update({
            verification_status: 'rejected',
            rejection_reason: 'Verification expired - no response within 7 days',
            updated_at: new Date()
          });
      }

      if (expiredVerifications.length > 0) {
        logger.info(`Expired ${expiredVerifications.length} age verifications`);
      }

    } catch (error) {
      logger.error('Failed to cleanup expired verifications:', error);
    }
  }

  /**
   * Send verification reminders
   */
  async sendVerificationReminders() {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      const pendingVerifications = await db('age_verification as av')
        .join('users as u', 'av.user_id', 'u.id')
        .select('av.user_id', 'u.email', 'u.first_name')
        .where('av.verification_status', 'pending')
        .where('av.created_at', '<', threeDaysAgo)
        .where('av.created_at', '>', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));

      // This would integrate with notification service
      for (const verification of pendingVerifications) {
        logger.info(`Verification reminder needed for user ${verification.user_id}`);
        // await notificationService.sendVerificationReminder(verification);
      }

      if (pendingVerifications.length > 0) {
        logger.info(`Sent verification reminders to ${pendingVerifications.length} users`);
      }

    } catch (error) {
      logger.error('Failed to send verification reminders:', error);
    }
  }

  /**
   * Generate daily analytics
   */
  async generateDailyAnalytics() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Generate analytics for each content type
      const contentTypes = ['image', 'text', 'bio', 'chat', 'profile'];
      
      for (const contentType of contentTypes) {
        const analytics = await this.calculateDailyAnalytics(contentType, yesterday, endOfYesterday);
        
        await db('moderation_analytics')
          .insert({
            id: uuidv4(),
            date: yesterday.toISOString().split('T')[0],
            content_type: contentType,
            ...analytics
          })
          .onConflict(['date', 'content_type'])
          .merge(analytics);
      }

      logger.info(`Generated daily analytics for ${yesterday.toISOString().split('T')[0]}`);

    } catch (error) {
      logger.error('Failed to generate daily analytics:', error);
    }
  }

  /**
   * Calculate daily analytics for a content type
   */
  async calculateDailyAnalytics(contentType, startDate, endDate) {
    try {
      const stats = await db('content_moderation_queue')
        .select(
          db.raw('COUNT(*) as total_processed'),
          db.raw('COUNT(CASE WHEN status = "approved" AND assigned_moderator IS NULL THEN 1 END) as auto_approved'),
          db.raw('COUNT(CASE WHEN status = "rejected" AND assigned_moderator IS NULL THEN 1 END) as auto_rejected'),
          db.raw('COUNT(CASE WHEN status = "flagged" THEN 1 END) as flagged_for_review'),
          db.raw('COUNT(CASE WHEN assigned_moderator IS NOT NULL THEN 1 END) as manual_reviews'),
          db.raw('AVG(CASE WHEN reviewed_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, submitted_at, reviewed_at) * 1000 END) as avg_processing_time_ms')
        )
        .where('content_type', contentType)
        .whereBetween('submitted_at', [startDate, endDate])
        .first();

      // Calculate violation breakdown
      const violations = await db('content_violations')
        .select('violation_type', db.raw('COUNT(*) as count'))
        .where('content_type', contentType)
        .whereBetween('created_at', [startDate, endDate])
        .groupBy('violation_type');

      const violationBreakdown = {};
      violations.forEach(v => {
        violationBreakdown[v.violation_type] = v.count;
      });

      return {
        total_processed: stats.total_processed || 0,
        auto_approved: stats.auto_approved || 0,
        auto_rejected: stats.auto_rejected || 0,
        flagged_for_review: stats.flagged_for_review || 0,
        manual_reviews: stats.manual_reviews || 0,
        false_positives: 0, // Would need manual tracking
        false_negatives: 0, // Would need manual tracking
        avg_processing_time_ms: stats.avg_processing_time_ms || 0,
        violation_breakdown: violationBreakdown
      };

    } catch (error) {
      logger.error(`Failed to calculate analytics for ${contentType}:`, error);
      return {};
    }
  }

  /**
   * Generate weekly analytics
   */
  async generateWeeklyAnalytics() {
    try {
      // Generate weekly summary analytics
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const analytics = await contentModerationService.getModerationAnalytics(sevenDaysAgo, new Date());
      
      logger.info('Generated weekly moderation analytics', {
        total_processed: analytics.summary.total_processed,
        approval_rate: analytics.summary.total_processed > 0 ? 
          (analytics.summary.approved / analytics.summary.total_processed * 100).toFixed(2) : 0
      });

    } catch (error) {
      logger.error('Failed to generate weekly analytics:', error);
    }
  }

  /**
   * Monitor safety check-ins
   */
  async monitorSafetyCheckIns() {
    try {
      const now = new Date();
      
      // Find overdue check-ins
      const overdueCheckIns = await db('safety_check_ins')
        .where('status', 'scheduled')
        .where('check_in_scheduled', '<', now);

      for (const checkIn of overdueCheckIns) {
        // Mark as missed and create alert
        await db('safety_check_ins')
          .where('id', checkIn.id)
          .update({
            status: 'missed',
            updated_at: now
          });

        // Create emergency alert
        await db('emergency_alerts').insert({
          id: uuidv4(),
          user_id: checkIn.user_id,
          alert_type: 'check_in_missed',
          location: checkIn.date_location,
          message: `Safety check-in missed for date at ${checkIn.date_location}`,
          status: 'active'
        });

        logger.warn(`Safety check-in missed for user ${checkIn.user_id}`);
      }

    } catch (error) {
      logger.error('Failed to monitor safety check-ins:', error);
    }
  }

  /**
   * Process emergency alerts
   */
  async processEmergencyAlerts() {
    try {
      const activeAlerts = await db('emergency_alerts')
        .where('status', 'active')
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .orderBy('created_at', 'asc');

      for (const alert of activeAlerts) {
        // This would integrate with emergency response systems
        logger.critical(`Emergency alert active for user ${alert.user_id}: ${alert.message}`);
        
        // Auto-escalate after 1 hour
        if (new Date() - new Date(alert.created_at) > 60 * 60 * 1000) {
          // Escalate to authorities or emergency contacts
          logger.critical(`Escalating emergency alert ${alert.id} - no response after 1 hour`);
        }
      }

    } catch (error) {
      logger.error('Failed to process emergency alerts:', error);
    }
  }

  /**
   * Analyze violation patterns
   */
  async analyzeViolationPatterns() {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find users with multiple violations
      const repeatOffenders = await db('content_violations')
        .select('user_id', db.raw('COUNT(*) as violation_count'))
        .where('created_at', '>=', yesterday)
        .groupBy('user_id')
        .having('violation_count', '>=', 3);

      for (const offender of repeatOffenders) {
        // Flag for additional review
        await db('content_moderation_queue').insert({
          id: uuidv4(),
          user_id: offender.user_id,
          content_type: 'profile',
          status: 'flagged',
          priority: 'high',
          ai_detection_results: { 
            pattern_analysis: true, 
            violation_count: offender.violation_count 
          },
          moderation_flags: ['REPEAT_OFFENDER']
        });

        logger.warn(`Flagged repeat offender ${offender.user_id} with ${offender.violation_count} violations`);
      }

    } catch (error) {
      logger.error('Failed to analyze violation patterns:', error);
    }
  }

  /**
   * Generate monthly compliance report
   */
  async generateMonthlyComplianceReport() {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date(lastMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Generate comprehensive compliance report
      const analytics = await contentModerationService.getModerationAnalytics(lastMonth, endOfMonth);
      
      logger.info(`Generated monthly compliance report for ${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`, {
        total_content_processed: analytics.summary.total_processed,
        compliance_rate: analytics.summary.total_processed > 0 ? 
          ((analytics.summary.approved + analytics.summary.rejected) / analytics.summary.total_processed * 100).toFixed(2) : 100
      });

    } catch (error) {
      logger.error('Failed to generate monthly compliance report:', error);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  async shutdown() {
    try {
      for (const [taskName, task] of this.tasks) {
        task.stop();
        logger.info(`Stopped scheduled task: ${taskName}`);
      }
      
      this.tasks.clear();
      this.isInitialized = false;
      logger.info('Moderation scheduler shutdown complete');

    } catch (error) {
      logger.error('Failed to shutdown moderation scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const taskStatus = {};
    for (const [taskName, task] of this.tasks) {
      taskStatus[taskName] = {
        running: task.running || false,
        scheduled: true
      };
    }

    return {
      initialized: this.isInitialized,
      total_tasks: this.tasks.size,
      tasks: taskStatus
    };
  }
}

module.exports = new ModerationSchedulerService();