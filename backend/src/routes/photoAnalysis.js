const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const mockAI = require('../services/mockAI');

// Rate limiting for photo analysis (more restrictive than bio)
const photoAnalysisRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.PHOTO_ANALYSIS_RATE_LIMIT) || 5, // 5 requests per hour
  message: {
    success: false,
    error: 'Photo analysis rate limit exceeded. Please try again later.',
    code: 'PHOTO_ANALYSIS_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `photo_analysis_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    logger.warn('Photo analysis rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many photo analysis requests. Please try again later.',
      code: 'PHOTO_ANALYSIS_RATE_LIMIT',
      retryAfter: 3600
    });
  }
});

// Configure multer for temporary photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/temp');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `temp-analysis-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024, // 10MB
    files: parseInt(process.env.MAX_PHOTOS_PER_ANALYSIS) || 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_UPLOAD_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Validation for photo analysis
const analysisValidation = [
  body('options.includeEmotionAnalysis')
    .optional()
    .isBoolean()
    .withMessage('includeEmotionAnalysis must be a boolean'),
  
  body('options.includeStyleAnalysis')
    .optional()
    .isBoolean()
    .withMessage('includeStyleAnalysis must be a boolean'),
  
  body('options.includeCompositionAnalysis')
    .optional()
    .isBoolean()
    .withMessage('includeCompositionAnalysis must be a boolean'),
  
  body('options.generateRecommendations')
    .optional()
    .isBoolean()
    .withMessage('generateRecommendations must be a boolean'),
  
  body('options.compareWithPreviousAnalysis')
    .optional()
    .isBoolean()
    .withMessage('compareWithPreviousAnalysis must be a boolean')
];

// Analyze existing profile photos
router.post('/profile', authenticateToken, photoAnalysisRateLimit, analysisValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const options = req.body.options || {};

    // Get user's profile photos
    const photos = await db('user_photos')
      .select('id', 'photo_url', 'is_primary', 'display_order')
      .where({ user_id: userId })
      .orderBy('display_order');

    if (photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos found to analyze',
        code: 'NO_PHOTOS'
      });
    }

    // Get user profile for context
    const userProfile = await db('users')
      .select(
        'id', 'first_name', 'last_name', 'age', 'gender', 'interested_in',
        'location', 'occupation', 'subscription_status'
      )
      .where({ id: userId })
      .first();

    const isPremium = userProfile.subscription_status === 'premium' || userProfile.subscription_status === 'pro';

    // Limit analysis for free users
    const photosToAnalyze = isPremium ? photos : photos.slice(0, 3);

    // Perform AI analysis
    const analysisResult = await mockAI.analyzePhotos(photosToAnalyze, userProfile);

    // Save analysis to database
    const analysisId = await db('photo_analyses').insert({
      user_id: userId,
      photo_ids: JSON.stringify(photosToAnalyze.map(p => p.id)),
      analysis_options: JSON.stringify(options),
      results: JSON.stringify(analysisResult),
      overall_score: analysisResult.overallScore,
      created_at: new Date()
    }).returning('id');

    // Track usage
    await db('user_ai_usage').insert({
      user_id: userId,
      service_type: 'photo_analysis',
      tokens_used: photosToAnalyze.length * 100, // Estimate tokens per photo
      cost_estimate: photosToAnalyze.length * (isPremium ? 0.05 : 0.03),
      created_at: new Date()
    }).onConflict(['user_id', 'service_type', 'date'])
    .merge({
      usage_count: db.raw('usage_count + 1'),
      tokens_used: db.raw('tokens_used + ?', [photosToAnalyze.length * 100]),
      cost_estimate: db.raw('cost_estimate + ?', [photosToAnalyze.length * (isPremium ? 0.05 : 0.03)])
    });

    logger.info('Profile photo analysis completed', {
      userId,
      analysisId: analysisId[0],
      photosAnalyzed: photosToAnalyze.length,
      overallScore: analysisResult.overallScore,
      isPremium
    });

    // Add upgrade message for free users
    if (!isPremium && photos.length > 3) {
      analysisResult.upgradeMessage = `Upgrade to Premium to analyze all ${photos.length} photos! Free users can analyze up to 3 photos.`;
    }

    // Add service information
    analysisResult.serviceInfo = {
      isUsingRealAI: mockAI.isUsingRealAI(),
      photosAnalyzed: photosToAnalyze.length,
      totalPhotos: photos.length,
      ...(mockAI.isUsingRealAI() ? {} : { upgradeInstructions: mockAI.getUpgradeInstructions() })
    };

    res.json({
      success: true,
      message: 'Photo analysis completed successfully',
      data: {
        analysisId: analysisId[0],
        ...analysisResult,
        usage: {
          remainingAnalyses: isPremium ? 'unlimited' : Math.max(0, 5 - await getUserDailyUsage(userId, 'photo_analysis')),
          resetTime: isPremium ? null : getNextResetTime()
        }
      }
    });

  } catch (error) {
    logger.error('Photo analysis error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      options: req.body.options
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze photos',
      code: 'PHOTO_ANALYSIS_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Analyze uploaded photos (temporary analysis without saving)
router.post('/upload', authenticateToken, photoAnalysisRateLimit, upload.array('photos', 10), analysisValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded files
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(() => {});
        }
      }
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos uploaded for analysis',
        code: 'NO_PHOTOS'
      });
    }

    const userId = req.user.id;
    const options = req.body.options || {};

    // Get user profile for context
    const userProfile = await db('users')
      .select(
        'id', 'first_name', 'last_name', 'age', 'gender', 'interested_in',
        'location', 'occupation', 'subscription_status'
      )
      .where({ id: userId })
      .first();

    const isPremium = userProfile.subscription_status === 'premium' || userProfile.subscription_status === 'pro';

    // Create photo objects for analysis
    const photos = req.files.map((file, index) => ({
      id: `temp_${index}`,
      url: file.path,
      photo_url: file.path,
      is_primary: index === 0,
      isPrimary: index === 0,
      display_order: index + 1,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    // Limit analysis for free users
    const photosToAnalyze = isPremium ? photos : photos.slice(0, 3);

    try {
      // Perform AI analysis
      const analysisResult = await mockAI.analyzePhotos(photosToAnalyze, userProfile);

      // Save temporary analysis to database (for history/comparison)
      const analysisId = await db('photo_analyses').insert({
        user_id: userId,
        photo_ids: JSON.stringify(['temp_analysis']),
        analysis_options: JSON.stringify(options),
        results: JSON.stringify(analysisResult),
        overall_score: analysisResult.overallScore,
        is_temporary: true,
        created_at: new Date()
      }).returning('id');

      // Track usage
      await db('user_ai_usage').insert({
        user_id: userId,
        service_type: 'photo_analysis',
        tokens_used: photosToAnalyze.length * 100,
        cost_estimate: photosToAnalyze.length * (isPremium ? 0.05 : 0.03),
        created_at: new Date()
      }).onConflict(['user_id', 'service_type', 'date'])
      .merge({
        usage_count: db.raw('usage_count + 1'),
        tokens_used: db.raw('tokens_used + ?', [photosToAnalyze.length * 100]),
        cost_estimate: db.raw('cost_estimate + ?', [photosToAnalyze.length * (isPremium ? 0.05 : 0.03)])
      });

      logger.info('Temporary photo analysis completed', {
        userId,
        analysisId: analysisId[0],
        photosAnalyzed: photosToAnalyze.length,
        overallScore: analysisResult.overallScore,
        isPremium
      });

      // Add upgrade message for free users
      if (!isPremium && req.files.length > 3) {
        analysisResult.upgradeMessage = `Upgrade to Premium to analyze all ${req.files.length} photos! Free users can analyze up to 3 photos.`;
      }

      // Add service information
      analysisResult.serviceInfo = {
        isUsingRealAI: mockAI.isUsingRealAI(),
        photosAnalyzed: photosToAnalyze.length,
        totalPhotos: req.files.length,
        isTemporaryAnalysis: true,
        ...(mockAI.isUsingRealAI() ? {} : { upgradeInstructions: mockAI.getUpgradeInstructions() })
      };

      res.json({
        success: true,
        message: 'Photo analysis completed successfully',
        data: {
          analysisId: analysisId[0],
          ...analysisResult,
          usage: {
            remainingAnalyses: isPremium ? 'unlimited' : Math.max(0, 5 - await getUserDailyUsage(userId, 'photo_analysis')),
            resetTime: isPremium ? null : getNextResetTime()
          }
        }
      });

    } finally {
      // Always clean up uploaded files
      for (const file of req.files) {
        await fs.unlink(file.path).catch((err) => {
          logger.warn('Failed to delete temp file', { filePath: file.path, error: err.message });
        });
      }
    }

  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    logger.error('Upload photo analysis error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      fileCount: req.files?.length || 0
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze uploaded photos',
      code: 'PHOTO_ANALYSIS_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get photo analysis history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;
    const includeTemporary = req.query.includeTemporary === 'true';

    // Build query
    let query = db('photo_analyses')
      .select(
        'id', 'photo_ids', 'analysis_options', 'results', 
        'overall_score', 'is_temporary', 'created_at'
      )
      .where({ user_id: userId });

    if (!includeTemporary) {
      query = query.where({ is_temporary: false });
    }

    const analyses = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalQuery = db('photo_analyses')
      .where({ user_id: userId })
      .count('* as count');
    
    if (!includeTemporary) {
      totalQuery.where({ is_temporary: false });
    }

    const totalCount = await totalQuery.first();
    const totalPages = Math.ceil(totalCount.count / limit);

    logger.info('Photo analysis history retrieved', {
      userId,
      page,
      limit,
      totalResults: totalCount.count,
      includeTemporary
    });

    res.json({
      success: true,
      data: {
        analyses: analyses.map(analysis => ({
          ...analysis,
          photo_ids: JSON.parse(analysis.photo_ids || '[]'),
          analysis_options: JSON.parse(analysis.analysis_options || '{}'),
          results: JSON.parse(analysis.results || '{}')
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalResults: parseInt(totalCount.count),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Photo analysis history error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis history',
      code: 'HISTORY_FETCH_ERROR'
    });
  }
});

// Get specific analysis details
router.get('/:analysisId', authenticateToken, [
  param('analysisId').isInt().withMessage('Invalid analysis ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const analysisId = parseInt(req.params.analysisId);

    // Get analysis
    const analysis = await db('photo_analyses')
      .select('*')
      .where({ id: analysisId, user_id: userId })
      .first();

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found',
        code: 'ANALYSIS_NOT_FOUND'
      });
    }

    // Parse JSON fields
    const analysisData = {
      ...analysis,
      photo_ids: JSON.parse(analysis.photo_ids || '[]'),
      analysis_options: JSON.parse(analysis.analysis_options || '{}'),
      results: JSON.parse(analysis.results || '{}')
    };

    logger.info('Analysis details retrieved', {
      userId,
      analysisId,
      overallScore: analysis.overall_score
    });

    res.json({
      success: true,
      data: analysisData
    });

  } catch (error) {
    logger.error('Analysis details error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      analysisId: req.params.analysisId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis details',
      code: 'ANALYSIS_FETCH_ERROR'
    });
  }
});

// Get photo analysis analytics
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get analysis statistics
    const stats = await db('photo_analyses')
      .select(
        db.raw('COUNT(*) as total_analyses'),
        db.raw('COUNT(*) FILTER (WHERE is_temporary = false) as profile_analyses'),
        db.raw('COUNT(*) FILTER (WHERE is_temporary = true) as temporary_analyses'),
        db.raw('AVG(overall_score) as avg_score'),
        db.raw('MAX(overall_score) as best_score'),
        db.raw('MIN(overall_score) as worst_score'),
        db.raw('MAX(created_at) as last_analysis')
      )
      .where({ user_id: userId })
      .first();

    // Get score trends (last 5 analyses)
    const recentAnalyses = await db('photo_analyses')
      .select('overall_score', 'created_at', 'is_temporary')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(5);

    // Get AI usage stats
    const usageStats = await db('user_ai_usage')
      .select(
        db.raw('SUM(usage_count) as total_usage'),
        db.raw('SUM(tokens_used) as total_tokens'),
        db.raw('SUM(cost_estimate) as estimated_cost')
      )
      .where({ user_id: userId, service_type: 'photo_analysis' })
      .first();

    // Generate insights
    const insights = generatePhotoInsights(stats, recentAnalyses);

    logger.info('Photo analysis analytics retrieved', {
      userId,
      totalAnalyses: stats.total_analyses
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalAnalyses: parseInt(stats.total_analyses) || 0,
          profileAnalyses: parseInt(stats.profile_analyses) || 0,
          temporaryAnalyses: parseInt(stats.temporary_analyses) || 0,
          averageScore: Math.round(parseFloat(stats.avg_score) || 0),
          bestScore: parseInt(stats.best_score) || 0,
          worstScore: parseInt(stats.worst_score) || 0,
          lastAnalysis: stats.last_analysis
        },
        trends: recentAnalyses.reverse(), // Chronological order
        usage: {
          totalUsage: parseInt(usageStats.total_usage) || 0,
          totalTokens: parseInt(usageStats.total_tokens) || 0,
          estimatedCost: parseFloat(usageStats.estimated_cost) || 0
        },
        insights,
        recommendations: [
          "Update photos regularly and track score improvements",
          "Focus on photos with good lighting and clear composition",
          "Include a variety of photos showing different aspects of your personality",
          "Consider professional photos for best results",
          "Use the temporary analysis feature to test photos before adding to profile"
        ]
      }
    });

  } catch (error) {
    logger.error('Photo analytics error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve photo analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Helper functions
async function getUserDailyUsage(userId, serviceType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const usage = await db('user_ai_usage')
    .select(db.raw('SUM(usage_count) as total'))
    .where({
      user_id: userId,
      service_type: serviceType
    })
    .where('created_at', '>=', today)
    .first();
  
  return parseInt(usage.total) || 0;
}

function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function generatePhotoInsights(stats, recentAnalyses) {
  const insights = [];
  
  const totalAnalyses = parseInt(stats.total_analyses) || 0;
  const avgScore = parseFloat(stats.avg_score) || 0;
  
  if (totalAnalyses > 0) {
    if (avgScore >= 85) {
      insights.push("Excellent photo quality! Your photos consistently score well");
    } else if (avgScore >= 70) {
      insights.push("Good photo quality with room for improvement");
    } else {
      insights.push("Consider updating your photos - there's significant room for improvement");
    }
  }
  
  if (recentAnalyses.length >= 2) {
    const latest = recentAnalyses[recentAnalyses.length - 1]?.overall_score || 0;
    const previous = recentAnalyses[recentAnalyses.length - 2]?.overall_score || 0;
    
    if (latest > previous + 5) {
      insights.push("Great improvement! Your latest photos are scoring higher");
    } else if (latest < previous - 5) {
      insights.push("Your recent photos are scoring lower - consider reverting to previous style");
    }
  }
  
  const tempAnalyses = parseInt(stats.temporary_analyses) || 0;
  const profileAnalyses = parseInt(stats.profile_analyses) || 0;
  
  if (tempAnalyses > profileAnalyses * 2) {
    insights.push("You're testing many photos - great strategy! Consider applying the best ones to your profile");
  }
  
  return insights;
}

module.exports = router;