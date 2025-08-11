const express = require('express');
const router = express.Router();
const knex = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current subscription
    const subscription = await knex('user_subscriptions')
      .join('subscription_plans', 'user_subscriptions.plan_id', 'subscription_plans.id')
      .where('user_subscriptions.user_id', userId)
      .where('user_subscriptions.status', 'active')
      .first([
        'subscription_plans.name as plan_name',
        'subscription_plans.display_name as plan_display_name',
        'subscription_plans.limits'
      ]);

    // Default to free plan if no subscription found
    const planName = subscription?.plan_name || 'free';
    const planDisplayName = subscription?.plan_display_name || 'Free Plan';
    const limits = subscription?.limits ? JSON.parse(subscription.limits) : {
      bio_generations_per_month: 1,
      photo_analyses_per_month: 1
    };

    // Get current month usage
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    // Get bio generation usage for current month
    const bioUsage = await knex('user_ai_usage')
      .where('user_id', userId)
      .where('service_type', 'bio_generation')
      .where('date', '>=', firstDayOfMonth.toISOString().split('T')[0])
      .sum('usage_count as total')
      .first();

    // Get photo analysis usage for current month
    const photoUsage = await knex('user_ai_usage')
      .where('user_id', userId)
      .where('service_type', 'photo_analysis')
      .where('date', '>=', firstDayOfMonth.toISOString().split('T')[0])
      .sum('usage_count as total')
      .first();

    const stats = {
      bio_generations_used: parseInt(bioUsage?.total || 0),
      bio_generations_limit: limits.bio_generations_per_month,
      photo_analyses_used: parseInt(photoUsage?.total || 0),
      photo_analyses_limit: limits.photo_analyses_per_month,
      plan_name: planName,
      plan_display_name: planDisplayName
    };

    res.json({
      message: 'User stats retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user stats',
      error: error.message
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await knex('users')
      .where('id', userId)
      .first([
        'id',
        'email',
        'first_name',
        'last_name',
        'date_of_birth',
        'interested_in',
        'email_verified',
        'created_at',
        'updated_at'
      ]);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message: 'User profile retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { first_name, last_name, date_of_birth, interested_in } = req.body;

    // Validate input
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name.trim();
    if (last_name !== undefined) updates.last_name = last_name.trim();
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
    if (interested_in !== undefined) updates.interested_in = interested_in;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No valid fields provided for update'
      });
    }

    updates.updated_at = new Date();

    const [updated] = await knex('users')
      .where('id', userId)
      .update(updates);

    if (!updated) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get updated user data
    const user = await knex('users')
      .where('id', userId)
      .first([
        'id',
        'email',
        'first_name',
        'last_name',
        'date_of_birth',
        'interested_in',
        'email_verified',
        'created_at',
        'updated_at'
      ]);

    res.json({
      message: 'Profile updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = router;