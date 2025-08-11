const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');
const { 
  uploadImage, 
  generateImageUrls,
  isConfigured 
} = require('../config/cloudinary');

// Rate limiting for AI operations
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 5,
  message: {
    success: false,
    error: 'Too many AI requests, please try again later',
    code: 'AI_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Generate LinkedIn headshot with AI enhancement
 * POST /api/linkedin-headshot/generate
 */
router.post('/generate', authenticateToken, aiLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      photo_url, 
      style = 'professional', 
      options = {},
      cloudinary_data = {}
    } = req.body;

    if (!photo_url) {
      return res.status(400).json({
        success: false,
        error: 'Photo URL is required',
        code: 'MISSING_PHOTO_URL'
      });
    }

    logger.info('LinkedIn headshot generation started', {
      userId,
      style,
      options,
      cloudinaryConfigured: isConfigured()
    });

    // Simulate processing time for AI enhancement
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI processing result
    const mockResult = {
      id: `headshot_${userId}_${Date.now()}`,
      original_photo: photo_url,
      enhanced_photo: generateMockEnhancedPhoto(style),
      style: style,
      score: Math.floor(Math.random() * 15) + 85, // 85-100 score range
      improvements: {
        background: getBackgroundImprovement(style),
        lighting: 'Enhanced professional lighting with soft shadows and natural contrast',
        composition: 'Optimized framing and positioning for LinkedIn profile standards',
        professionalism_score: Math.floor(Math.random() * 10) + 90,
        suggestions: generateSuggestions(style)
      },
      download_urls: {
        linkedin_optimized: generateMockEnhancedPhoto(style, '400x400'),
        high_resolution: generateMockEnhancedPhoto(style, '1200x1200'),
        profile_square: generateMockEnhancedPhoto(style, '600x600')
      },
      processing_time: '3.2s',
      enhancement_details: {
        background_removed: options.remove_background !== false,
        lighting_enhanced: options.enhance_lighting !== false,
        professional_styling: options.professional_styling !== false,
        high_quality_output: options.high_quality !== false,
        style_applied: style
      },
      metadata: {
        created_at: new Date().toISOString(),
        user_id: userId,
        cloudinary_public_id: cloudinary_data.public_id,
        original_cloudinary_urls: cloudinary_data.urls,
        style_category: getStyleCategory(style)
      }
    };

    logger.info('LinkedIn headshot generated successfully', {
      userId,
      headshotId: mockResult.id,
      style,
      score: mockResult.score,
      processingTime: mockResult.processing_time
    });

    res.json({
      success: true,
      result: mockResult,
      message: 'LinkedIn headshot generated successfully',
      credits_remaining: Math.floor(Math.random() * 10) + 5, // Mock credits
      processing_details: {
        ai_model: 'HeadshotPro-v2.1',
        enhancement_level: 'professional',
        style_applied: style,
        quality_score: mockResult.score
      }
    });

  } catch (error) {
    logger.error('LinkedIn headshot generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      error: 'LinkedIn headshot generation failed',
      code: 'GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get headshot generation history
 * GET /api/linkedin-headshot/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    // Mock history data
    const mockHistory = Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
      id: `headshot_${userId}_${Date.now() - (index * 86400000)}`, // Different days
      created_at: new Date(Date.now() - (index * 86400000)).toISOString(),
      style: ['professional', 'corporate', 'creative', 'minimalist', 'warm'][index % 5],
      score: Math.floor(Math.random() * 15) + 85,
      enhanced_photo: generateMockEnhancedPhoto(['professional', 'corporate', 'creative', 'minimalist', 'warm'][index % 5]),
      download_urls: {
        linkedin_optimized: generateMockEnhancedPhoto(['professional', 'corporate', 'creative', 'minimalist', 'warm'][index % 5], '400x400'),
        high_resolution: generateMockEnhancedPhoto(['professional', 'corporate', 'creative', 'minimalist', 'warm'][index % 5], '1200x1200'),
        profile_square: generateMockEnhancedPhoto(['professional', 'corporate', 'creative', 'minimalist', 'warm'][index % 5], '600x600')
      }
    }));

    res.json({
      success: true,
      history: mockHistory,
      pagination: {
        total: 5,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: false
      }
    });

  } catch (error) {
    logger.error('Failed to fetch headshot history', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      code: 'HISTORY_ERROR'
    });
  }
});

/**
 * Get available styles and pricing
 * GET /api/linkedin-headshot/styles
 */
router.get('/styles', authenticateToken, async (req, res) => {
  try {
    const styles = [
      {
        key: 'professional',
        label: 'Professional',
        description: 'Clean, corporate-friendly background with professional lighting',
        icon: 'business-center',
        premium: false,
        examples: [
          generateMockEnhancedPhoto('professional', '300x300'),
          generateMockEnhancedPhoto('professional', '300x300'),
          generateMockEnhancedPhoto('professional', '300x300')
        ],
        best_for: ['Corporate roles', 'Business networking', 'Executive positions'],
        features: ['Clean background', 'Professional lighting', 'Corporate-friendly styling']
      },
      {
        key: 'corporate',
        label: 'Corporate Executive',
        description: 'Executive-level styling with premium background and sophisticated lighting',
        icon: 'account-tie',
        premium: true,
        examples: [
          generateMockEnhancedPhoto('corporate', '300x300'),
          generateMockEnhancedPhoto('corporate', '300x300'),
          generateMockEnhancedPhoto('corporate', '300x300')
        ],
        best_for: ['C-suite executives', 'Board positions', 'High-level management'],
        features: ['Premium background', 'Executive styling', 'Sophisticated lighting']
      },
      {
        key: 'creative',
        label: 'Creative Professional',
        description: 'Modern, artistic background perfect for creative industries',
        icon: 'palette',
        premium: true,
        examples: [
          generateMockEnhancedPhoto('creative', '300x300'),
          generateMockEnhancedPhoto('creative', '300x300'),
          generateMockEnhancedPhoto('creative', '300x300')
        ],
        best_for: ['Design roles', 'Marketing', 'Creative agencies', 'Startups'],
        features: ['Artistic background', 'Modern styling', 'Creative industry focused']
      },
      {
        key: 'minimalist',
        label: 'Minimalist',
        description: 'Simple, clean background that keeps focus on you',
        icon: 'crop-free',
        premium: false,
        examples: [
          generateMockEnhancedPhoto('minimalist', '300x300'),
          generateMockEnhancedPhoto('minimalist', '300x300'),
          generateMockEnhancedPhoto('minimalist', '300x300')
        ],
        best_for: ['Tech roles', 'Consultants', 'Freelancers'],
        features: ['Clean simplicity', 'Subject-focused', 'Versatile styling']
      },
      {
        key: 'warm',
        label: 'Warm & Approachable',
        description: 'Friendly lighting and warm tones for client-facing professionals',
        icon: 'wb-sunny',
        premium: true,
        examples: [
          generateMockEnhancedPhoto('warm', '300x300'),
          generateMockEnhancedPhoto('warm', '300x300'),
          generateMockEnhancedPhoto('warm', '300x300')
        ],
        best_for: ['Sales roles', 'Customer service', 'Healthcare', 'Education'],
        features: ['Warm tones', 'Approachable styling', 'Client-friendly appearance']
      }
    ];

    res.json({
      success: true,
      styles,
      pricing: {
        free_generations: 2,
        premium_styles_cost: 'Pro subscription required',
        credits_per_generation: 1
      }
    });

  } catch (error) {
    logger.error('Failed to fetch styles', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch styles',
      code: 'STYLES_ERROR'
    });
  }
});

// Helper functions
function generateMockEnhancedPhoto(style, size = '600x600') {
  const styleQueries = {
    professional: 'professional-business-headshot',
    corporate: 'executive-business-portrait',
    creative: 'creative-professional-headshot',
    minimalist: 'clean-minimal-headshot',
    warm: 'friendly-approachable-headshot'
  };

  const query = styleQueries[style] || 'professional-headshot';
  return `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000) + 1500000000000}?w=${size.split('x')[0]}&h=${size.split('x')[1]}&fit=crop&crop=face&q=${query}`;
}

function getBackgroundImprovement(style) {
  const backgrounds = {
    professional: 'Clean gradient background with subtle corporate styling',
    corporate: 'Executive-level premium background with sophisticated elements',
    creative: 'Modern artistic background with creative industry appeal',
    minimalist: 'Simple, distraction-free background focusing on the subject',
    warm: 'Warm-toned background creating an approachable atmosphere'
  };
  
  return backgrounds[style] || backgrounds.professional;
}

function generateSuggestions(style) {
  const baseSuggestions = [
    'Perfect for LinkedIn profile photo',
    'Professional appearance enhanced with AI',
    'Optimized lighting and background contrast',
    'Excellent eye contact and confident expression'
  ];

  const styleSuggestions = {
    professional: ['Ideal for corporate networking', 'Suitable for all business contexts'],
    corporate: ['Executive-level professional appearance', 'Perfect for C-suite positions'],
    creative: ['Great for creative industry professionals', 'Shows personality while maintaining professionalism'],
    minimalist: ['Clean and versatile for any industry', 'Timeless professional appearance'],
    warm: ['Approachable for client-facing roles', 'Builds trust and connection']
  };

  return [
    ...baseSuggestions.slice(0, 2),
    ...(styleSuggestions[style] || styleSuggestions.professional)
  ];
}

function getStyleCategory(style) {
  const categories = {
    professional: 'business',
    corporate: 'executive',
    creative: 'creative',
    minimalist: 'versatile',
    warm: 'approachable'
  };
  
  return categories[style] || 'business';
}

module.exports = router;