const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const contentModerationService = require('../services/contentModerationService');
const authMiddleware = require('../middleware/auth');
const logger = require('../config/logger');
const db = require('../config/database');

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Rate limiting for different endpoints
const moderationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many moderation requests from this IP'
});

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 reports per hour
  message: 'Too many reports from this IP'
});

const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 uploads per 5 minutes
  message: 'Too many upload requests from this IP'
});

/**
 * @swagger
 * tags:
 *   name: Content Moderation
 *   description: Content moderation and safety endpoints
 */

/**
 * @swagger
 * /api/content-moderation/image:
 *   post:
 *     summary: Submit image for content moderation
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - content_type
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               content_type:
 *                 type: string
 *                 enum: [profile_photo, bio_image, chat_image]
 *     responses:
 *       200:
 *         description: Image moderation completed
 *       400:
 *         description: Invalid request
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/image',
  uploadLimiter,
  authMiddleware,
  upload.single('image'),
  [
    body('content_type')
      .isIn(['profile_photo', 'bio_image', 'chat_image'])
      .withMessage('Invalid content type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      // Upload image to cloud storage (Cloudinary)
      const cloudinary = require('../config/cloudinary');
      const uploadResult = await cloudinary.uploader.upload(req.file.buffer, {
        folder: 'content-moderation',
        resource_type: 'image'
      });

      // Moderate the image
      const moderationResult = await contentModerationService.moderateImage(
        uploadResult.secure_url,
        req.user.id,
        req.body.content_type
      );

      res.json({
        success: true,
        data: {
          image_url: uploadResult.secure_url,
          moderation: moderationResult,
          approved: moderationResult.approved,
          requires_review: moderationResult.requires_human_review
        }
      });

    } catch (error) {
      logger.error('Image moderation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Image moderation failed'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/text:
 *   post:
 *     summary: Submit text for content moderation
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - content_type
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *               content_type:
 *                 type: string
 *                 enum: [bio, chat_message, profile_text]
 *     responses:
 *       200:
 *         description: Text moderation completed
 */
router.post('/text',
  moderationLimiter,
  authMiddleware,
  [
    body('text')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Text must be between 1 and 5000 characters'),
    body('content_type')
      .isIn(['bio', 'chat_message', 'profile_text'])
      .withMessage('Invalid content type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { text, content_type } = req.body;

      const moderationResult = await contentModerationService.moderateText(
        text,
        req.user.id,
        content_type
      );

      res.json({
        success: true,
        data: {
          original_text: text,
          cleaned_text: moderationResult.cleaned_text,
          moderation: moderationResult,
          approved: moderationResult.approved,
          requires_review: moderationResult.requires_human_review
        }
      });

    } catch (error) {
      logger.error('Text moderation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Text moderation failed'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/report:
 *   post:
 *     summary: Report inappropriate content or user
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reported_user_id
 *               - report_type
 *             properties:
 *               reported_user_id:
 *                 type: string
 *                 format: uuid
 *               reported_content_id:
 *                 type: string
 *                 format: uuid
 *               report_type:
 *                 type: string
 *                 enum: [inappropriate_content, harassment, spam, fake_profile, underage, violence, discrimination, other]
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               evidence_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Report submitted successfully
 */
router.post('/report',
  reportLimiter,
  authMiddleware,
  [
    body('reported_user_id')
      .isUUID()
      .withMessage('Invalid user ID format'),
    body('reported_content_id')
      .optional()
      .isUUID()
      .withMessage('Invalid content ID format'),
    body('report_type')
      .isIn(['inappropriate_content', 'harassment', 'spam', 'fake_profile', 'underage', 'violence', 'discrimination', 'other'])
      .withMessage('Invalid report type'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('evidence_urls')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 evidence URLs allowed')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { reported_user_id, reported_content_id, report_type, description, evidence_urls } = req.body;

      // Check if user is trying to report themselves
      if (reported_user_id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot report yourself'
        });
      }

      // Check if user exists
      const reportedUser = await db('users').where('id', reported_user_id).first();
      if (!reportedUser) {
        return res.status(404).json({
          success: false,
          error: 'Reported user not found'
        });
      }

      // Check for duplicate reports (same reporter, same user, within 24 hours)
      const existingReport = await db('user_reports')
        .where('reporter_id', req.user.id)
        .where('reported_user_id', reported_user_id)
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .first();

      if (existingReport) {
        return res.status(409).json({
          success: false,
          error: 'You have already reported this user recently'
        });
      }

      const reportId = await contentModerationService.processUserReport(
        req.user.id,
        reported_user_id,
        reported_content_id,
        report_type,
        description,
        evidence_urls || []
      );

      res.status(201).json({
        success: true,
        data: {
          report_id: reportId,
          message: 'Report submitted successfully'
        }
      });

    } catch (error) {
      logger.error('Report submission failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit report'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/queue:
 *   get:
 *     summary: Get moderation queue (Admin only)
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, flagged, escalated]
 *       - in: query
 *         name: content_type
 *         schema:
 *           type: string
 *           enum: [image, text, bio, chat, profile]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
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
 *         description: Moderation queue retrieved successfully
 *       403:
 *         description: Admin access required
 */
router.get('/queue',
  moderationLimiter,
  authMiddleware,
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'flagged', 'escalated']),
    query('content_type').optional().isIn(['image', 'text', 'bio', 'chat', 'profile']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res) => {
    try {
      // Check if user is admin/moderator
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const filters = {
        status: req.query.status,
        content_type: req.query.content_type,
        priority: req.query.priority,
        assigned_moderator: req.query.assigned_to_me === 'true' ? req.user.id : undefined
      };

      const page = req.query.page || 1;
      const limit = req.query.limit || 50;

      const result = await contentModerationService.getModerationQueue(filters, page, limit);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to get moderation queue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve moderation queue'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/moderate/{contentId}:
 *   post:
 *     summary: Moderate content (Admin/Moderator only)
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - reason
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject, escalate]
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *               notify_user:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Content moderated successfully
 *       403:
 *         description: Admin or moderator access required
 */
router.post('/moderate/:contentId',
  moderationLimiter,
  authMiddleware,
  [
    param('contentId').isUUID().withMessage('Invalid content ID format'),
    body('action').isIn(['approve', 'reject', 'escalate']).withMessage('Invalid action'),
    body('reason').isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters'),
    body('notify_user').optional().isBoolean().withMessage('notify_user must be boolean')
  ],
  async (req, res) => {
    try {
      // Check if user is admin/moderator
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { contentId } = req.params;
      const { action, reason, notify_user = true } = req.body;

      await contentModerationService.moderateContent(
        contentId,
        req.user.id,
        action,
        reason,
        notify_user
      );

      res.json({
        success: true,
        message: `Content ${action}d successfully`
      });

    } catch (error) {
      logger.error('Content moderation action failed:', error);
      res.status(500).json({
        success: false,
        error: 'Content moderation action failed'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/reports:
 *   get:
 *     summary: Get user reports (Admin/Moderator only)
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, investigating, resolved, dismissed]
 *       - in: query
 *         name: report_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
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
 *         description: Reports retrieved successfully
 */
router.get('/reports',
  moderationLimiter,
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req, res) => {
    try {
      // Check if user is admin/moderator
      if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          error: 'Admin or moderator access required'
        });
      }

      const page = req.query.page || 1;
      const limit = req.query.limit || 50;
      const offset = (page - 1) * limit;

      const query = db('user_reports as ur')
        .leftJoin('users as reporter', 'ur.reporter_id', 'reporter.id')
        .leftJoin('users as reported', 'ur.reported_user_id', 'reported.id')
        .select(
          'ur.*',
          'reporter.email as reporter_email',
          'reporter.first_name as reporter_first_name',
          'reported.email as reported_email',
          'reported.first_name as reported_first_name'
        );

      // Apply filters
      if (req.query.status) {
        query.where('ur.status', req.query.status);
      }
      if (req.query.report_type) {
        query.where('ur.report_type', req.query.report_type);
      }
      if (req.query.priority) {
        query.where('ur.priority', req.query.priority);
      }

      const reports = await query
        .orderBy('ur.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const total = await db('user_reports').count('* as count').first();

      res.json({
        success: true,
        data: {
          reports,
          total: parseInt(total.count),
          page,
          pages: Math.ceil(total.count / limit)
        }
      });

    } catch (error) {
      logger.error('Failed to get reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reports'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/analytics:
 *   get:
 *     summary: Get moderation analytics (Admin only)
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/analytics',
  moderationLimiter,
  authMiddleware,
  [
    query('start_date').isISO8601().withMessage('Invalid start date format'),
    query('end_date').isISO8601().withMessage('Invalid end date format')
  ],
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { start_date, end_date } = req.query;

      const analytics = await contentModerationService.getModerationAnalytics(start_date, end_date);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to get moderation analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/user/safety-settings:
 *   get:
 *     summary: Get user safety settings
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Safety settings retrieved successfully
 */
router.get('/user/safety-settings',
  authMiddleware,
  async (req, res) => {
    try {
      let settings = await db('user_safety_settings')
        .where('user_id', req.user.id)
        .first();

      if (!settings) {
        // Create default settings
        settings = {
          user_id: req.user.id,
          auto_block_inappropriate: true,
          require_photo_verification: false,
          blocked_users: [],
          blocked_keywords: [],
          content_filter_level: 'moderate',
          report_notifications: true
        };

        await db('user_safety_settings').insert(settings);
      }

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error('Failed to get safety settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve safety settings'
      });
    }
  }
);

/**
 * @swagger
 * /api/content-moderation/user/safety-settings:
 *   put:
 *     summary: Update user safety settings
 *     tags: [Content Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               auto_block_inappropriate:
 *                 type: boolean
 *               require_photo_verification:
 *                 type: boolean
 *               blocked_keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               content_filter_level:
 *                 type: string
 *                 enum: [strict, moderate, minimal]
 *               report_notifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Safety settings updated successfully
 */
router.put('/user/safety-settings',
  authMiddleware,
  [
    body('auto_block_inappropriate').optional().isBoolean(),
    body('require_photo_verification').optional().isBoolean(),
    body('blocked_keywords').optional().isArray({ max: 50 }),
    body('content_filter_level').optional().isIn(['strict', 'moderate', 'minimal']),
    body('report_notifications').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const updateData = {};
      const allowedFields = ['auto_block_inappropriate', 'require_photo_verification', 'blocked_keywords', 'content_filter_level', 'report_notifications'];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      updateData.updated_at = new Date();

      await db('user_safety_settings')
        .where('user_id', req.user.id)
        .update(updateData);

      res.json({
        success: true,
        message: 'Safety settings updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update safety settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update safety settings'
      });
    }
  }
);

module.exports = router;