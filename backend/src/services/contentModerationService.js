const db = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const vision = require('@google-cloud/vision');
const AWS = require('aws-sdk');
const Filter = require('bad-words');
const PerspectiveAPI = require('perspective-api-client');
const natural = require('natural');
const compromise = require('compromise');

/**
 * Comprehensive Content Moderation Service
 * Handles automated content scanning, moderation queue management,
 * and policy compliance for Dating Profile Optimizer
 */
class ContentModerationService {
  constructor() {
    this.visionClient = new vision.ImageAnnotatorClient();
    this.rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.profanityFilter = new Filter();
    this.perspective = new PerspectiveAPI({
      apiKey: process.env.PERSPECTIVE_API_KEY
    });
    
    // Content moderation thresholds
    this.thresholds = {
      nsfw: 0.8,
      violence: 0.7,
      toxicity: 0.6,
      identity_attack: 0.7,
      threat: 0.8,
      face_confidence: 0.9,
      age_adult: 0.85
    };

    // Initialize profanity filters with custom words
    this.initializeProfanityFilters();
  }

  /**
   * Initialize profanity filters with dating-specific inappropriate content
   */
  initializeProfanityFilters() {
    const datingSpecificWords = [
      'sugar daddy', 'sugar baby', 'escort', 'hooker', 'prostitute',
      'webcam', 'onlyfans', 'premium snap', 'venmo me', 'cashapp',
      'lonely wives', 'hot singles', 'hookup tonight'
    ];
    
    this.profanityFilter.addWords(...datingSpecificWords);
    
    // Add contact information patterns
    this.contactPatterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
      /snapchat|snap|kik|telegram|whatsapp/gi, // Social platforms
      /instagram\.com|twitter\.com|facebook\.com/gi // Social media URLs
    ];
  }

  /**
   * Moderate image content using multiple AI services
   * @param {string} imageUrl - URL of the image to moderate
   * @param {string} userId - ID of the user uploading
   * @param {string} contentType - Type of content (profile_photo, bio_image, etc.)
   */
  async moderateImage(imageUrl, userId, contentType = 'image') {
    try {
      const moderationResults = {
        approved: false,
        flags: [],
        confidence_scores: {},
        requires_human_review: false,
        violation_details: []
      };

      // 1. Google Vision API - Safe Search Detection
      const [visionResult] = await this.visionClient.safeSearchDetection(imageUrl);
      const safeSearch = visionResult.safeSearchAnnotation;
      
      if (safeSearch) {
        const nsfwScore = this.getLikelihoodScore(safeSearch.adult);
        const violenceScore = this.getLikelihoodScore(safeSearch.violence);
        
        moderationResults.confidence_scores.nsfw = nsfwScore;
        moderationResults.confidence_scores.violence = violenceScore;

        if (nsfwScore >= this.thresholds.nsfw) {
          moderationResults.flags.push('NSFW_CONTENT');
          moderationResults.violation_details.push({
            type: 'nsfw',
            severity: 'high',
            confidence: nsfwScore
          });
        }

        if (violenceScore >= this.thresholds.violence) {
          moderationResults.flags.push('VIOLENT_CONTENT');
          moderationResults.violation_details.push({
            type: 'violence',
            severity: 'high',
            confidence: violenceScore
          });
        }
      }

      // 2. Face Detection and Age Estimation
      const [faceResult] = await this.visionClient.faceDetection(imageUrl);
      const faces = faceResult.faceAnnotations || [];
      
      if (faces.length === 0 && contentType === 'profile_photo') {
        moderationResults.flags.push('NO_FACE_DETECTED');
        moderationResults.requires_human_review = true;
      }

      // 3. AWS Rekognition for additional content analysis
      if (process.env.AWS_ACCESS_KEY_ID) {
        try {
          const rekognitionResult = await this.rekognition.detectModerationLabels({
            Image: { S3Object: { Bucket: process.env.S3_BUCKET, Key: imageUrl } }
          }).promise();

          rekognitionResult.ModerationLabels.forEach(label => {
            if (label.Confidence > 80) {
              moderationResults.flags.push(`AWS_${label.Name.toUpperCase()}`);
              moderationResults.violation_details.push({
                type: label.Name.toLowerCase(),
                severity: this.getSeverityFromConfidence(label.Confidence),
                confidence: label.Confidence / 100
              });
            }
          });
        } catch (awsError) {
          logger.warn('AWS Rekognition analysis failed:', awsError.message);
        }
      }

      // 4. Age verification (for compliance)
      if (faces.length > 0) {
        const youngLikelihood = faces[0].surpriseUnderExposed || 'UNKNOWN';
        if (youngLikelihood === 'VERY_LIKELY' || youngLikelihood === 'LIKELY') {
          moderationResults.flags.push('POSSIBLE_MINOR');
          moderationResults.requires_human_review = true;
          moderationResults.violation_details.push({
            type: 'underage',
            severity: 'critical',
            confidence: 0.8
          });
        }
      }

      // Determine final approval status
      const criticalFlags = moderationResults.violation_details.filter(v => v.severity === 'critical');
      const highSeverityFlags = moderationResults.violation_details.filter(v => v.severity === 'high');

      if (criticalFlags.length > 0) {
        moderationResults.approved = false;
        moderationResults.requires_human_review = true;
      } else if (highSeverityFlags.length > 0) {
        moderationResults.approved = false;
        moderationResults.requires_human_review = true;
      } else if (moderationResults.flags.length === 0) {
        moderationResults.approved = true;
      } else {
        moderationResults.requires_human_review = true;
      }

      // Store in moderation queue
      await this.addToModerationQueue(userId, contentType, imageUrl, null, moderationResults);

      return moderationResults;
    } catch (error) {
      logger.error('Image moderation failed:', error);
      throw new Error('Content moderation service unavailable');
    }
  }

  /**
   * Moderate text content (bios, messages, profiles)
   * @param {string} text - Text content to moderate
   * @param {string} userId - ID of the user
   * @param {string} contentType - Type of content
   */
  async moderateText(text, userId, contentType = 'text') {
    try {
      const moderationResults = {
        approved: false,
        flags: [],
        confidence_scores: {},
        requires_human_review: false,
        violation_details: [],
        cleaned_text: text
      };

      // 1. Basic profanity detection
      if (this.profanityFilter.isProfane(text)) {
        moderationResults.flags.push('PROFANITY_DETECTED');
        moderationResults.cleaned_text = this.profanityFilter.clean(text);
        moderationResults.violation_details.push({
          type: 'inappropriate_language',
          severity: 'medium',
          confidence: 0.9
        });
      }

      // 2. Contact information detection
      this.contactPatterns.forEach((pattern, index) => {
        if (pattern.test(text)) {
          const patternTypes = ['phone', 'email', 'social_platform', 'social_url'];
          moderationResults.flags.push(`CONTACT_INFO_${patternTypes[index] || 'UNKNOWN'}`);
          moderationResults.violation_details.push({
            type: 'personal_information',
            severity: 'high',
            confidence: 0.95
          });
        }
      });

      // 3. Spam detection patterns
      const spamPatterns = [
        /visit my (website|site|profile)/gi,
        /(buy|purchase|order) now/gi,
        /limited time offer/gi,
        /click (here|link)/gi,
        /follow me on/gi,
        /dm me for/gi
      ];

      spamPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          moderationResults.flags.push('SPAM_DETECTED');
          moderationResults.violation_details.push({
            type: 'spam',
            severity: 'medium',
            confidence: 0.8
          });
        }
      });

      // 4. Google Perspective API for toxicity
      if (process.env.PERSPECTIVE_API_KEY) {
        try {
          const perspectiveResult = await this.perspective.analyze(text, {
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              IDENTITY_ATTACK: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {}
            }
          });

          const scores = perspectiveResult.attributeScores;
          
          Object.keys(scores).forEach(attribute => {
            const score = scores[attribute].summaryScore.value;
            moderationResults.confidence_scores[attribute.toLowerCase()] = score;

            if (score >= this.thresholds.toxicity) {
              moderationResults.flags.push(`${attribute}_DETECTED`);
              moderationResults.violation_details.push({
                type: attribute.toLowerCase().replace('_', ' '),
                severity: score >= 0.8 ? 'high' : 'medium',
                confidence: score
              });
            }
          });
        } catch (perspectiveError) {
          logger.warn('Perspective API analysis failed:', perspectiveError.message);
        }
      }

      // 5. Age-related content detection
      const agePatterns = [
        /\b(18|19|twenty|teen|young|barely legal)\b/gi,
        /\b(high school|college freshman|just turned)\b/gi
      ];

      agePatterns.forEach(pattern => {
        if (pattern.test(text)) {
          moderationResults.flags.push('AGE_RELATED_CONTENT');
          moderationResults.requires_human_review = true;
          moderationResults.violation_details.push({
            type: 'age_verification_required',
            severity: 'high',
            confidence: 0.7
          });
        }
      });

      // 6. Discriminatory language detection
      const discriminatoryPatterns = [
        /\b(no (blacks?|whites?|asians?|latinos?|hispanics?))\b/gi,
        /\b(only (whites?|blacks?|asians?|latinos?))\b/gi,
        /\b(prefer (whites?|blacks?|asians?|latinos?))\b/gi
      ];

      discriminatoryPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          moderationResults.flags.push('DISCRIMINATORY_LANGUAGE');
          moderationResults.violation_details.push({
            type: 'discrimination',
            severity: 'high',
            confidence: 0.9
          });
        }
      });

      // Determine approval status
      const criticalViolations = moderationResults.violation_details.filter(v => v.severity === 'critical');
      const highViolations = moderationResults.violation_details.filter(v => v.severity === 'high');

      if (criticalViolations.length > 0 || highViolations.length >= 2) {
        moderationResults.approved = false;
        moderationResults.requires_human_review = true;
      } else if (highViolations.length > 0 || moderationResults.flags.length >= 3) {
        moderationResults.requires_human_review = true;
      } else {
        moderationResults.approved = true;
      }

      // Store in moderation queue
      await this.addToModerationQueue(userId, contentType, null, text, moderationResults);

      return moderationResults;
    } catch (error) {
      logger.error('Text moderation failed:', error);
      throw new Error('Content moderation service unavailable');
    }
  }

  /**
   * Add content to moderation queue
   */
  async addToModerationQueue(userId, contentType, contentUrl, contentText, moderationResults) {
    try {
      const queueEntry = {
        id: uuidv4(),
        user_id: userId,
        content_type: contentType,
        content_url: contentUrl,
        content_text: contentText,
        status: moderationResults.approved ? 'approved' : (moderationResults.requires_human_review ? 'flagged' : 'pending'),
        priority: this.determinePriority(moderationResults.violation_details),
        ai_confidence_score: this.calculateOverallConfidence(moderationResults),
        ai_detection_results: moderationResults,
        moderation_flags: moderationResults.flags,
        submitted_at: new Date()
      };

      await db('content_moderation_queue').insert(queueEntry);

      // Create violation records for flagged content
      if (moderationResults.violation_details.length > 0) {
        await this.createViolationRecords(userId, queueEntry.id, contentType, moderationResults.violation_details);
      }

      return queueEntry.id;
    } catch (error) {
      logger.error('Failed to add to moderation queue:', error);
      throw error;
    }
  }

  /**
   * Create violation records
   */
  async createViolationRecords(userId, contentId, contentType, violations) {
    try {
      const violationRecords = violations.map(violation => ({
        id: uuidv4(),
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        violation_type: this.mapViolationType(violation.type),
        severity: violation.severity,
        description: `Automated detection: ${violation.type}`,
        confidence_score: violation.confidence,
        detection_details: violation
      }));

      await db('content_violations').insert(violationRecords);
    } catch (error) {
      logger.error('Failed to create violation records:', error);
    }
  }

  /**
   * Process user report
   */
  async processUserReport(reporterId, reportedUserId, contentId, reportType, description, evidenceUrls = []) {
    try {
      const reportId = uuidv4();
      const report = {
        id: reportId,
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reported_content_id: contentId,
        report_type: reportType,
        description,
        evidence_urls: evidenceUrls,
        priority: this.getReportPriority(reportType)
      };

      await db('user_reports').insert(report);

      // Auto-escalate critical reports
      if (report.priority === 'critical') {
        await this.escalateReport(reportId);
      }

      // Check for repeat offenders
      await this.checkReportPatterns(reportedUserId);

      return reportId;
    } catch (error) {
      logger.error('Failed to process user report:', error);
      throw error;
    }
  }

  /**
   * Get moderation queue with filters
   */
  async getModerationQueue(filters = {}, page = 1, limit = 50) {
    try {
      const query = db('content_moderation_queue as cmq')
        .leftJoin('users as u', 'cmq.user_id', 'u.id')
        .select(
          'cmq.*',
          'u.email as user_email',
          'u.first_name',
          'u.last_name'
        );

      // Apply filters
      if (filters.status) {
        query.where('cmq.status', filters.status);
      }
      if (filters.content_type) {
        query.where('cmq.content_type', filters.content_type);
      }
      if (filters.priority) {
        query.where('cmq.priority', filters.priority);
      }
      if (filters.assigned_moderator) {
        query.where('cmq.assigned_moderator', filters.assigned_moderator);
      }

      const offset = (page - 1) * limit;
      query.orderBy('cmq.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const results = await query;
      const total = await db('content_moderation_queue').count('* as count').first();

      return {
        items: results,
        total: parseInt(total.count),
        page,
        pages: Math.ceil(total.count / limit)
      };
    } catch (error) {
      logger.error('Failed to get moderation queue:', error);
      throw error;
    }
  }

  /**
   * Moderate content by human moderator
   */
  async moderateContent(contentId, moderatorId, action, reason, notifyUser = true) {
    try {
      const trx = await db.transaction();

      try {
        // Update moderation queue
        await trx('content_moderation_queue')
          .where('id', contentId)
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            assigned_moderator: moderatorId,
            moderator_notes: reason,
            reviewed_at: new Date()
          });

        // Get content details
        const content = await trx('content_moderation_queue')
          .where('id', contentId)
          .first();

        if (!content) {
          throw new Error('Content not found');
        }

        // Create moderation action record
        await trx('moderation_actions').insert({
          id: uuidv4(),
          moderator_id: moderatorId,
          target_user_id: content.user_id,
          content_id: contentId,
          action_type: action,
          reason,
          notify_user: notifyUser
        });

        // Take additional actions based on decision
        if (action === 'reject') {
          await this.handleRejectedContent(trx, content, moderatorId, reason);
        }

        await trx.commit();

        // Send notification to user if required
        if (notifyUser) {
          await this.notifyUserOfModerationDecision(content.user_id, action, reason, content.content_type);
        }

        return true;
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Content moderation failed:', error);
      throw error;
    }
  }

  /**
   * Handle rejected content - may include additional penalties
   */
  async handleRejectedContent(trx, content, moderatorId, reason) {
    // Check user's violation history
    const violationCount = await trx('content_violations')
      .where('user_id', content.user_id)
      .count('* as count')
      .first();

    const totalViolations = parseInt(violationCount.count);

    // Progressive discipline
    if (totalViolations >= 5) {
      // Suspend account
      await this.suspendUser(trx, content.user_id, moderatorId, 'Multiple content violations', 7);
    } else if (totalViolations >= 3) {
      // Warning
      await this.warnUser(trx, content.user_id, moderatorId, 'Content policy violation warning');
    }
  }

  /**
   * Get moderation analytics
   */
  async getModerationAnalytics(startDate, endDate) {
    try {
      const analytics = await db('moderation_analytics')
        .whereBetween('date', [startDate, endDate])
        .orderBy('date');

      const summary = await db('content_moderation_queue')
        .select(
          db.raw('COUNT(*) as total_processed'),
          db.raw('COUNT(CASE WHEN status = "approved" THEN 1 END) as approved'),
          db.raw('COUNT(CASE WHEN status = "rejected" THEN 1 END) as rejected'),
          db.raw('COUNT(CASE WHEN status = "flagged" THEN 1 END) as flagged'),
          db.raw('AVG(CASE WHEN reviewed_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, submitted_at, reviewed_at) * 1000 END) as avg_review_time_ms')
        )
        .whereBetween('submitted_at', [startDate, endDate])
        .first();

      const violationBreakdown = await db('content_violations')
        .select('violation_type', db.raw('COUNT(*) as count'))
        .whereBetween('created_at', [startDate, endDate])
        .groupBy('violation_type');

      return {
        daily_analytics: analytics,
        summary,
        violation_breakdown: violationBreakdown
      };
    } catch (error) {
      logger.error('Failed to get moderation analytics:', error);
      throw error;
    }
  }

  // Helper methods
  getLikelihoodScore(likelihood) {
    const scores = {
      'UNKNOWN': 0,
      'VERY_UNLIKELY': 0.1,
      'UNLIKELY': 0.3,
      'POSSIBLE': 0.5,
      'LIKELY': 0.7,
      'VERY_LIKELY': 0.9
    };
    return scores[likelihood] || 0;
  }

  getSeverityFromConfidence(confidence) {
    if (confidence >= 95) return 'critical';
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    return 'low';
  }

  determinePriority(violations) {
    if (violations.some(v => v.severity === 'critical')) return 'critical';
    if (violations.some(v => v.severity === 'high')) return 'high';
    if (violations.length >= 3) return 'high';
    return 'medium';
  }

  calculateOverallConfidence(results) {
    if (results.violation_details.length === 0) return 0.1;
    const avgConfidence = results.violation_details.reduce((sum, v) => sum + v.confidence, 0) / results.violation_details.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  mapViolationType(type) {
    const mapping = {
      'nsfw': 'nsfw',
      'violence': 'violence',
      'inappropriate_language': 'inappropriate_language',
      'personal_information': 'spam',
      'spam': 'spam',
      'toxicity': 'hate_speech',
      'identity_attack': 'discrimination',
      'threat': 'harassment',
      'age_verification_required': 'underage',
      'discrimination': 'discrimination'
    };
    return mapping[type] || 'other';
  }

  getReportPriority(reportType) {
    const priorities = {
      'underage': 'critical',
      'harassment': 'high',
      'violence': 'high',
      'discrimination': 'high',
      'inappropriate_content': 'medium',
      'spam': 'low',
      'fake_profile': 'medium',
      'other': 'low'
    };
    return priorities[reportType] || 'medium';
  }

  async suspendUser(trx, userId, moderatorId, reason, days = 7) {
    await trx('moderation_actions').insert({
      id: uuidv4(),
      moderator_id: moderatorId,
      target_user_id: userId,
      action_type: 'suspend_user',
      reason,
      expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    // Update user status
    await trx('users')
      .where('id', userId)
      .update({ 
        account_status: 'suspended',
        suspension_expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      });
  }

  async warnUser(trx, userId, moderatorId, reason) {
    await trx('moderation_actions').insert({
      id: uuidv4(),
      moderator_id: moderatorId,
      target_user_id: userId,
      action_type: 'warn_user',
      reason
    });
  }

  async escalateReport(reportId) {
    await db('user_reports')
      .where('id', reportId)
      .update({ priority: 'critical' });
  }

  async checkReportPatterns(userId) {
    const recentReports = await db('user_reports')
      .where('reported_user_id', userId)
      .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .count('* as count')
      .first();

    if (parseInt(recentReports.count) >= 3) {
      // Auto-flag user for review
      await db('content_moderation_queue').insert({
        id: uuidv4(),
        user_id: userId,
        content_type: 'profile',
        status: 'flagged',
        priority: 'high',
        ai_detection_results: { flags: ['MULTIPLE_REPORTS'], approved: false, requires_human_review: true },
        moderation_flags: ['MULTIPLE_REPORTS']
      });
    }
  }

  async notifyUserOfModerationDecision(userId, action, reason, contentType) {
    // Implementation would integrate with existing notification service
    logger.info(`User ${userId} notified of ${action} action on ${contentType}: ${reason}`);
  }
}

module.exports = new ContentModerationService();