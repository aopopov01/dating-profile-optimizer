const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const mockAI = require('../services/mockAI');

// Rate limiting for bio generation (more restrictive)
const bioRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 20, // 20 requests per hour
  message: {
    success: false,
    error: 'Bio generation rate limit exceeded. Please try again later.',
    code: 'BIO_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `bio_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    logger.warn('Bio generation rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      error: 'Too many bio generation requests. Please try again later.',
      code: 'BIO_RATE_LIMIT',
      retryAfter: 3600 // 1 hour in seconds
    });
  }
});

// Validation for bio generation
const bioGenerationValidation = [
  body('preferences.tone')
    .optional()
    .isIn(['casual', 'professional', 'humorous', 'romantic', 'adventurous', 'friendly'])
    .withMessage('Invalid tone preference'),
  
  body('preferences.length')
    .optional()
    .isIn(['short', 'medium', 'long'])
    .withMessage('Invalid length preference'),
  
  body('preferences.focus')
    .optional()
    .isIn(['career', 'hobbies', 'travel', 'relationships', 'lifestyle', 'auto'])
    .withMessage('Invalid focus preference'),
  
  body('preferences.includeCallToAction')
    .optional()
    .isBoolean()
    .withMessage('includeCallToAction must be a boolean'),
  
  body('variations')
    .optional()
    .isInt({ min: 1, max: parseInt(process.env.MAX_BIO_VARIATIONS) || 5 })
    .withMessage(`Variations must be between 1 and ${process.env.MAX_BIO_VARIATIONS || 5}`)
];

// Generate bio suggestions
router.post('/generate', authenticateToken, bioRateLimit, bioGenerationValidation, async (req, res) => {
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
    const { preferences = {} } = req.body;

    // Get user profile data
    const userProfile = await db('users')
      .select(
        'id', 'first_name', 'last_name', 'age', 'gender', 
        'location', 'interests', 'profession', 'personality_type'
      )
      .where({ id: userId })
      .first();

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Check if user has subscription for advanced features
    const user = await db('users').select('subscription_status').where({ id: userId }).first();
    const isPremium = user.subscription_status === 'premium' || user.subscription_status === 'pro';

    // Limit variations for free users
    const maxVariations = isPremium ? 5 : 3;
    const requestedVariations = Math.min(preferences.variations || 3, maxVariations);

    // Generate bio using AI service (mock or real)
    const bioResult = await mockAI.generateBio(userProfile, {
      ...preferences,
      variations: requestedVariations
    });

    // Save generation request to database for analytics
    const generationId = await db('generated_bios').insert({
      user_id: userId,
      bio_text: bioResult.bio,
      character_count: bioResult.bio.length,
      personality_style: preferences.tone || 'casual',
      target_platform: preferences.platform || 'general',
      tone: preferences.tone || 'casual',
      used_interests: JSON.stringify(bioResult.interests || []),
      conversation_starters: JSON.stringify(bioResult.conversation_starters || []),
      generation_cost: 0.0001 // Mock cost
    }).returning('id');

    // Track usage for rate limiting and analytics (simple insert for now)
    try {
      await db('user_ai_usage').insert({
        user_id: userId,
        service_type: 'bio_generation',
        usage_count: 1,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        metadata: JSON.stringify({
          tokens_used: bioResult.bio.length,
          cost_estimate: isPremium ? 0.02 : 0.01,
          preferences: preferences
        })
      });
    } catch (error) {
      // If record already exists for today, just continue - usage tracking is not critical
      if (!error.message.includes('duplicate key')) {
        throw error; // Re-throw if it's not a duplicate key error
      }
    }

    logger.info('Bio generated successfully', {
      userId,
      generationId: generationId[0],
      bioLength: bioResult.bio.length,
      variations: requestedVariations,
      isPremium,
      preferences
    });

    // Add upgrade message for free users
    if (!isPremium) {
      bioResult.upgradeMessage = "Upgrade to Premium for unlimited bio variations, advanced customization options, and priority AI processing!";
    }

    // Add service information
    bioResult.serviceInfo = {
      isUsingRealAI: mockAI.isUsingRealAI(),
      ...(mockAI.isUsingRealAI() ? {} : { upgradeInstructions: mockAI.getUpgradeInstructions() })
    };

    res.json({
      success: true,
      message: 'Bio generated successfully',
      data: {
        generationId: generationId[0],
        ...bioResult,
        usage: {
          remainingGenerations: isPremium ? 'unlimited' : Math.max(0, 20 - await getUserDailyUsage(userId, 'bio_generation')),
          resetTime: isPremium ? null : getNextResetTime()
        }
      }
    });

  } catch (error) {
    logger.error('Bio generation error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      preferences: req.body.preferences
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate bio',
      code: 'BIO_GENERATION_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get bio generation history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    // Get bio generations with pagination
    const generations = await db('generated_bios')
      .select(
        'id', 'generated_bio', 'preferences', 'analysis',
        'is_used', 'created_at'
      )
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db('generated_bios')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    const totalPages = Math.ceil(totalCount.count / limit);

    logger.info('Bio history retrieved', {
      userId,
      page,
      limit,
      totalResults: totalCount.count
    });

    res.json({
      success: true,
      data: {
        generations: generations.map(gen => ({
          ...gen,
          preferences: JSON.parse(gen.preferences || '{}'),
          analysis: JSON.parse(gen.analysis || '{}')
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
    logger.error('Bio history retrieval error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bio history',
      code: 'HISTORY_FETCH_ERROR'
    });
  }
});

// Apply generated bio to profile
router.post('/apply/:generationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const generationId = parseInt(req.params.generationId);
    const { variationIndex } = req.body;

    // Get the generation
    const generation = await db('generated_bios')
      .where({ id: generationId, user_id: userId })
      .first();

    if (!generation) {
      return res.status(404).json({
        success: false,
        error: 'Bio generation not found',
        code: 'GENERATION_NOT_FOUND'
      });
    }

    let bioToApply = generation.generated_bio;

    // If variation requested, use that instead
    if (variationIndex !== undefined) {
      const variations = JSON.parse(generation.variations || '[]');
      if (variationIndex >= 0 && variationIndex < variations.length) {
        bioToApply = variations[variationIndex].bio;
      }
    }

    // Update user's bio
    await db('users')
      .where({ id: userId })
      .update({
        bio: bioToApply,
        updated_at: new Date()
      });

    // Mark generation as used
    await db('generated_bios')
      .where({ id: generationId })
      .update({
        is_used: true,
        used_at: new Date()
      });

    // Update profile completion score
    const profile = await db('users').where({ id: userId }).first();
    // This would call the profile completion calculation function

    logger.info('Bio applied to profile', {
      userId,
      generationId,
      variationIndex,
      bioLength: bioToApply.length
    });

    res.json({
      success: true,
      message: 'Bio applied to profile successfully',
      data: {
        bio: bioToApply,
        appliedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Bio application error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      generationId: req.params.generationId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to apply bio',
      code: 'BIO_APPLICATION_ERROR'
    });
  }
});

// Get bio analytics and suggestions
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get generation statistics
    const stats = await db('generated_bios')
      .select(
        db.raw('COUNT(*) as total_generations'),
        db.raw('COUNT(*) FILTER (WHERE is_used = true) as used_generations'),
        db.raw('AVG(LENGTH(generated_bio)) as avg_bio_length'),
        db.raw('MAX(created_at) as last_generation')
      )
      .where({ user_id: userId })
      .first();

    // Get most used preferences
    const preferenceStats = await db('generated_bios')
      .select('preferences')
      .where({ user_id: userId, is_used: true });

    // Get AI usage stats
    const usageStats = await db('user_ai_usage')
      .select(
        db.raw('SUM(usage_count) as total_usage'),
        db.raw('SUM(tokens_used) as total_tokens'),
        db.raw('SUM(cost_estimate) as estimated_cost'),
        db.raw('MAX(created_at) as last_usage')
      )
      .where({ user_id: userId, service_type: 'bio_generation' })
      .first();

    // Analyze preferences
    let preferenceAnalysis = { tone: {}, length: {}, focus: {} };
    preferenceStats.forEach(stat => {
      try {
        const prefs = JSON.parse(stat.preferences || '{}');
        if (prefs.tone) preferenceAnalysis.tone[prefs.tone] = (preferenceAnalysis.tone[prefs.tone] || 0) + 1;
        if (prefs.length) preferenceAnalysis.length[prefs.length] = (preferenceAnalysis.length[prefs.length] || 0) + 1;
        if (prefs.focus) preferenceAnalysis.focus[prefs.focus] = (preferenceAnalysis.focus[prefs.focus] || 0) + 1;
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // Generate insights
    const insights = generateBioInsights(stats, preferenceAnalysis);

    logger.info('Bio analytics retrieved', {
      userId,
      totalGenerations: stats.total_generations
    });

    res.json({
      success: true,
      data: {
        statistics: {
          totalGenerations: parseInt(stats.total_generations) || 0,
          usedGenerations: parseInt(stats.used_generations) || 0,
          averageBioLength: Math.round(parseFloat(stats.avg_bio_length) || 0),
          lastGeneration: stats.last_generation
        },
        usage: {
          totalUsage: parseInt(usageStats.total_usage) || 0,
          totalTokens: parseInt(usageStats.total_tokens) || 0,
          estimatedCost: parseFloat(usageStats.estimated_cost) || 0,
          lastUsage: usageStats.last_usage
        },
        preferences: preferenceAnalysis,
        insights,
        recommendations: [
          "Experiment with different tones to see what resonates best",
          "Keep your bio between 150-250 characters for optimal engagement",
          "Update your bio regularly to keep your profile fresh",
          "Use specific details and interests to spark conversations"
        ]
      }
    });

  } catch (error) {
    logger.error('Bio analytics error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Helper function to get user daily usage
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

// Helper function to get next reset time
function getNextResetTime() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

// Helper function to generate insights
function generateBioInsights(stats, preferences) {
  const insights = [];
  
  const totalGens = parseInt(stats.total_generations) || 0;
  const usedGens = parseInt(stats.used_generations) || 0;
  
  if (totalGens > 0) {
    const usageRate = (usedGens / totalGens) * 100;
    
    if (usageRate < 30) {
      insights.push("Consider trying different styles - you might find one that resonates better");
    } else if (usageRate > 70) {
      insights.push("Great job finding bios that work for you! Keep experimenting with new styles");
    }
  }
  
  const avgLength = Math.round(parseFloat(stats.avg_bio_length) || 0);
  if (avgLength > 300) {
    insights.push("Your bios tend to be longer - consider shorter versions for better engagement");
  } else if (avgLength < 100) {
    insights.push("Your bios are quite brief - adding more personality details could help");
  }
  
  // Most used tone insight
  const topTone = Object.keys(preferences.tone).reduce((a, b) => 
    preferences.tone[a] > preferences.tone[b] ? a : b, null);
  
  if (topTone) {
    insights.push(`Your preferred tone is ${topTone} - try experimenting with other tones for variety`);
  }
  
  return insights;
}

module.exports = router;