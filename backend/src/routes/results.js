const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

// Get user's profile optimization results
router.get('/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For demo purposes, return mock results
    // In production, this would fetch from database
    const mockResults = [
      {
        id: `result_${userId}_1`,
        created_at: new Date().toISOString(),
        bio: {
          text: "Adventure seeker and coffee enthusiast ☕ Love exploring new places, trying authentic cuisine, and meaningful conversations under starry skies. Looking for someone who shares my passion for life and isn't afraid of spontaneous road trips! 🚗✨",
          style: 'adventurous',
          score: 87,
        },
        photos: [
          {
            id: 'photo1',
            url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
            score: 92,
            feedback: 'Great natural lighting and genuine smile',
            platform_recommendations: ['Perfect for main profile photo', 'High swipe rate potential']
          },
          {
            id: 'photo2',
            url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
            score: 78,
            feedback: 'Shows personality and interests well',
            platform_recommendations: ['Great for secondary photos', 'Shows active lifestyle']
          }
        ],
        overall_score: 85,
        improvements: {
          expected_matches_increase: 150,
          improvement_percentage: 75,
          strong_points: [
            'Authentic and engaging bio',
            'High-quality photos with great lighting',
            'Shows variety in interests',
            'Optimized for your target age group'
          ],
          weak_points: [
            'Consider adding one more group photo',
            'Bio could mention specific hobbies',
            'Add a photo showing your profession'
          ],
          platform_tips: {
            'Tinder': ['Use photo #1 as main', 'Keep bio concise', 'Show personality'],
            'Bumble': ['Highlight career achievements', 'Show social activities', 'Be specific about interests'],
            'Hinge': ['Answer prompts authentically', 'Use varied photo types', 'Show conversation starters']
          }
        },
        success_predictions: {
          tinder: 82,
          bumble: 88,
          hinge: 85,
          overall: 85
        }
      }
    ];

    logger.info('Profile results fetched', {
      userId,
      resultCount: mockResults.length
    });

    res.json({
      success: true,
      results: mockResults,
      count: mockResults.length
    });

  } catch (error) {
    logger.error('Error fetching profile results', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile results',
      code: 'RESULTS_FETCH_ERROR'
    });
  }
});

// Create a new profile optimization result
router.post('/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, photos, overall_score, improvements, success_predictions } = req.body;

    // Validate required fields
    if (!bio || !photos || !overall_score || !improvements) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      });
    }

    // For demo purposes, return mock created result
    const newResult = {
      id: `result_${userId}_${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
      bio,
      photos,
      overall_score,
      improvements,
      success_predictions: success_predictions || {
        tinder: overall_score - 5,
        bumble: overall_score + 2,
        hinge: overall_score,
        overall: overall_score
      }
    };

    logger.info('Profile result created', {
      userId,
      resultId: newResult.id,
      overallScore: overall_score
    });

    res.status(201).json({
      success: true,
      result: newResult,
      message: 'Profile optimization result saved successfully'
    });

  } catch (error) {
    logger.error('Error creating profile result', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create profile result',
      code: 'RESULT_CREATION_ERROR'
    });
  }
});

// Get specific result by ID
router.get('/results/:resultId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { resultId } = req.params;

    // For demo purposes, return mock result
    const mockResult = {
      id: resultId,
      user_id: userId,
      created_at: new Date().toISOString(),
      bio: {
        text: "Adventure seeker and coffee enthusiast ☕ Love exploring new places, trying authentic cuisine, and meaningful conversations under starry skies. Looking for someone who shares my passion for life and isn't afraid of spontaneous road trips! 🚗✨",
        style: 'adventurous',
        score: 87,
      },
      photos: [
        {
          id: 'photo1',
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          score: 92,
          feedback: 'Great natural lighting and genuine smile',
          platform_recommendations: ['Perfect for main profile photo', 'High swipe rate potential']
        }
      ],
      overall_score: 85,
      improvements: {
        expected_matches_increase: 150,
        improvement_percentage: 75,
        strong_points: [
          'Authentic and engaging bio',
          'High-quality photos with great lighting'
        ],
        weak_points: [
          'Consider adding one more group photo',
          'Bio could mention specific hobbies'
        ],
        platform_tips: {
          'Tinder': ['Use photo #1 as main', 'Keep bio concise'],
          'Bumble': ['Highlight career achievements', 'Show social activities'],
          'Hinge': ['Answer prompts authentically', 'Use varied photo types']
        }
      },
      success_predictions: {
        tinder: 82,
        bumble: 88,
        hinge: 85,
        overall: 85
      }
    };

    logger.info('Specific result fetched', {
      userId,
      resultId
    });

    res.json({
      success: true,
      result: mockResult
    });

  } catch (error) {
    logger.error('Error fetching specific result', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      resultId: req.params.resultId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch result',
      code: 'RESULT_FETCH_ERROR'
    });
  }
});

// Delete a result
router.delete('/results/:resultId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { resultId } = req.params;

    // For demo purposes, just return success
    logger.info('Result deleted', {
      userId,
      resultId
    });

    res.json({
      success: true,
      message: 'Result deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting result', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      resultId: req.params.resultId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete result',
      code: 'RESULT_DELETION_ERROR'
    });
  }
});

module.exports = router;