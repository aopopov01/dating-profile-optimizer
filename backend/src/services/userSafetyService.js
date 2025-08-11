const db = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * User Safety Service
 * Handles user-facing safety features, blocking, reporting, and protective measures
 */
class UserSafetyService {
  constructor() {
    this.emergencyContacts = {
      'crisis_hotline': {
        US: '988', // Suicide & Crisis Lifeline
        UK: '116 123', // Samaritans
        CA: '1-833-456-4566', // Talk Suicide Canada
        AU: '13 11 14' // Lifeline Australia
      },
      'dating_safety': {
        general: 'https://www.safety.com/online-dating-safety-tips/',
        reporting: 'https://www.ic3.gov/Home/ComplaintChoice/default.aspx'
      }
    };

    this.safetyTips = {
      first_date: [
        'Meet in a public place with lots of people around',
        'Tell a trusted friend about your plans and location',
        'Drive yourself or use your own transportation',
        'Keep your phone charged and easily accessible',
        'Trust your instincts - if something feels wrong, leave'
      ],
      online_safety: [
        'Never share personal information like your address or workplace',
        'Use the app\'s messaging system instead of giving out your phone number',
        'Be cautious of users asking for money or financial information',
        'Report suspicious behavior immediately',
        'Video chat before meeting in person'
      ],
      red_flags: [
        'Pressuring you to meet immediately or move off the platform',
        'Asking for money, gifts, or financial information',
        'Refusing to video chat or talk on the phone',
        'Getting angry when you set boundaries',
        'Photos that seem too professional or model-like'
      ]
    };
  }

  /**
   * Block a user
   */
  async blockUser(blockerId, blockedId, reason = null) {
    try {
      if (blockerId === blockedId) {
        throw new Error('Cannot block yourself');
      }

      // Check if already blocked
      const existingBlock = await db('user_safety_settings')
        .select('blocked_users')
        .where('user_id', blockerId)
        .first();

      let blockedUsers = [];
      if (existingBlock && existingBlock.blocked_users) {
        blockedUsers = JSON.parse(existingBlock.blocked_users);
      }

      if (blockedUsers.some(b => b.user_id === blockedId)) {
        return { success: true, message: 'User is already blocked' };
      }

      // Add to blocked list
      blockedUsers.push({
        user_id: blockedId,
        blocked_at: new Date().toISOString(),
        reason: reason
      });

      // Update or create safety settings
      await db('user_safety_settings')
        .insert({
          id: uuidv4(),
          user_id: blockerId,
          blocked_users: JSON.stringify(blockedUsers)
        })
        .onConflict('user_id')
        .merge({
          blocked_users: JSON.stringify(blockedUsers),
          updated_at: new Date()
        });

      // Log the action
      await db('moderation_actions').insert({
        id: uuidv4(),
        moderator_id: blockerId, // User is moderating their own experience
        target_user_id: blockedId,
        action_type: 'user_block',
        reason: reason || 'User initiated block'
      });

      return { success: true, message: 'User blocked successfully' };

    } catch (error) {
      logger.error('Failed to block user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId, blockedId) {
    try {
      const safetySettings = await db('user_safety_settings')
        .select('blocked_users')
        .where('user_id', blockerId)
        .first();

      if (!safetySettings || !safetySettings.blocked_users) {
        return { success: false, message: 'User is not in your blocked list' };
      }

      let blockedUsers = JSON.parse(safetySettings.blocked_users);
      const originalLength = blockedUsers.length;
      
      blockedUsers = blockedUsers.filter(b => b.user_id !== blockedId);

      if (blockedUsers.length === originalLength) {
        return { success: false, message: 'User is not in your blocked list' };
      }

      await db('user_safety_settings')
        .where('user_id', blockerId)
        .update({
          blocked_users: JSON.stringify(blockedUsers),
          updated_at: new Date()
        });

      return { success: true, message: 'User unblocked successfully' };

    } catch (error) {
      logger.error('Failed to unblock user:', error);
      throw error;
    }
  }

  /**
   * Get user's blocked list
   */
  async getBlockedUsers(userId) {
    try {
      const safetySettings = await db('user_safety_settings')
        .select('blocked_users')
        .where('user_id', userId)
        .first();

      if (!safetySettings || !safetySettings.blocked_users) {
        return [];
      }

      const blockedUsers = JSON.parse(safetySettings.blocked_users);
      
      // Get user details for blocked users
      const userIds = blockedUsers.map(b => b.user_id);
      const userDetails = await db('users')
        .select('id', 'first_name', 'last_name', 'email')
        .whereIn('id', userIds);

      const userMap = new Map();
      userDetails.forEach(user => {
        userMap.set(user.id, user);
      });

      return blockedUsers.map(blocked => ({
        ...blocked,
        user_details: userMap.get(blocked.user_id) || null
      }));

    } catch (error) {
      logger.error('Failed to get blocked users:', error);
      throw error;
    }
  }

  /**
   * Check if user is blocked by another user
   */
  async isUserBlocked(viewerId, targetUserId) {
    try {
      const safetySettings = await db('user_safety_settings')
        .select('blocked_users')
        .where('user_id', viewerId)
        .first();

      if (!safetySettings || !safetySettings.blocked_users) {
        return false;
      }

      const blockedUsers = JSON.parse(safetySettings.blocked_users);
      return blockedUsers.some(b => b.user_id === targetUserId);

    } catch (error) {
      logger.error('Failed to check if user is blocked:', error);
      return false;
    }
  }

  /**
   * Add keyword to user's blocked keywords list
   */
  async addBlockedKeyword(userId, keyword) {
    try {
      const safetySettings = await db('user_safety_settings')
        .select('blocked_keywords')
        .where('user_id', userId)
        .first();

      let blockedKeywords = [];
      if (safetySettings && safetySettings.blocked_keywords) {
        blockedKeywords = JSON.parse(safetySettings.blocked_keywords);
      }

      const lowerKeyword = keyword.toLowerCase().trim();
      
      if (blockedKeywords.includes(lowerKeyword)) {
        return { success: true, message: 'Keyword is already in your blocked list' };
      }

      if (blockedKeywords.length >= 50) {
        return { success: false, message: 'Maximum 50 blocked keywords allowed' };
      }

      blockedKeywords.push(lowerKeyword);

      await db('user_safety_settings')
        .insert({
          id: uuidv4(),
          user_id: userId,
          blocked_keywords: JSON.stringify(blockedKeywords)
        })
        .onConflict('user_id')
        .merge({
          blocked_keywords: JSON.stringify(blockedKeywords),
          updated_at: new Date()
        });

      return { success: true, message: 'Keyword added to blocked list' };

    } catch (error) {
      logger.error('Failed to add blocked keyword:', error);
      throw error;
    }
  }

  /**
   * Remove keyword from blocked list
   */
  async removeBlockedKeyword(userId, keyword) {
    try {
      const safetySettings = await db('user_safety_settings')
        .select('blocked_keywords')
        .where('user_id', userId)
        .first();

      if (!safetySettings || !safetySettings.blocked_keywords) {
        return { success: false, message: 'Keyword not found in blocked list' };
      }

      let blockedKeywords = JSON.parse(safetySettings.blocked_keywords);
      const lowerKeyword = keyword.toLowerCase().trim();
      
      const originalLength = blockedKeywords.length;
      blockedKeywords = blockedKeywords.filter(k => k !== lowerKeyword);

      if (blockedKeywords.length === originalLength) {
        return { success: false, message: 'Keyword not found in blocked list' };
      }

      await db('user_safety_settings')
        .where('user_id', userId)
        .update({
          blocked_keywords: JSON.stringify(blockedKeywords),
          updated_at: new Date()
        });

      return { success: true, message: 'Keyword removed from blocked list' };

    } catch (error) {
      logger.error('Failed to remove blocked keyword:', error);
      throw error;
    }
  }

  /**
   * Filter content based on user's safety settings
   */
  async filterContent(userId, content, contentType = 'text') {
    try {
      const safetySettings = await db('user_safety_settings')
        .where('user_id', userId)
        .first();

      if (!safetySettings) {
        return { filtered: false, content };
      }

      const blockedKeywords = safetySettings.blocked_keywords ? 
        JSON.parse(safetySettings.blocked_keywords) : [];

      if (blockedKeywords.length === 0) {
        return { filtered: false, content };
      }

      // Check for blocked keywords
      const contentLower = content.toLowerCase();
      const foundKeywords = blockedKeywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );

      if (foundKeywords.length > 0) {
        return {
          filtered: true,
          content: '[Content filtered based on your safety settings]',
          blocked_keywords: foundKeywords,
          filter_reason: 'Contains blocked keywords'
        };
      }

      return { filtered: false, content };

    } catch (error) {
      logger.error('Failed to filter content:', error);
      return { filtered: false, content };
    }
  }

  /**
   * Get safety tips based on context
   */
  getSafetyTips(category = 'general') {
    const tips = {
      ...this.safetyTips[category] || [],
      emergency_contacts: this.emergencyContacts
    };

    return tips;
  }

  /**
   * Create safety check-in for dates
   */
  async createSafetyCheckIn(userId, dateDetails) {
    try {
      const checkInId = uuidv4();
      
      const checkIn = {
        id: checkInId,
        user_id: userId,
        date_location: dateDetails.location,
        date_time: dateDetails.dateTime,
        emergency_contact: dateDetails.emergencyContact,
        check_in_scheduled: new Date(new Date(dateDetails.dateTime).getTime() + 2 * 60 * 60 * 1000), // 2 hours after date
        status: 'scheduled',
        created_at: new Date()
      };

      await db('safety_check_ins').insert(checkIn);

      // Schedule reminder notification (would integrate with notification service)
      await this.scheduleSafetyReminder(checkInId);

      return {
        success: true,
        check_in_id: checkInId,
        message: 'Safety check-in scheduled successfully'
      };

    } catch (error) {
      logger.error('Failed to create safety check-in:', error);
      throw error;
    }
  }

  /**
   * Complete safety check-in
   */
  async completeSafetyCheckIn(checkInId, userId, status = 'safe') {
    try {
      const updated = await db('safety_check_ins')
        .where('id', checkInId)
        .where('user_id', userId)
        .update({
          status,
          completed_at: new Date()
        });

      if (updated === 0) {
        throw new Error('Check-in not found or access denied');
      }

      return {
        success: true,
        message: 'Safety check-in completed'
      };

    } catch (error) {
      logger.error('Failed to complete safety check-in:', error);
      throw error;
    }
  }

  /**
   * Handle emergency alert
   */
  async triggerEmergencyAlert(userId, location, message = null) {
    try {
      const alertId = uuidv4();
      
      // Get user's emergency contact
      const user = await db('users')
        .select('emergency_contact', 'first_name', 'last_name', 'phone')
        .where('id', userId)
        .first();

      const alert = {
        id: alertId,
        user_id: userId,
        alert_type: 'emergency',
        location: location,
        message: message,
        status: 'active',
        created_at: new Date()
      };

      await db('emergency_alerts').insert(alert);

      // Would integrate with emergency services or emergency contacts
      if (user && user.emergency_contact) {
        await this.notifyEmergencyContact(user, location, message);
      }

      // Alert local authorities if configured
      await this.alertAuthorities(userId, location);

      return {
        success: true,
        alert_id: alertId,
        message: 'Emergency alert activated'
      };

    } catch (error) {
      logger.error('Failed to trigger emergency alert:', error);
      throw error;
    }
  }

  /**
   * Get user safety score based on profile completeness and verification
   */
  async getUserSafetyScore(userId) {
    try {
      const user = await db('users')
        .select('*')
        .where('id', userId)
        .first();

      if (!user) {
        return { score: 0, factors: [] };
      }

      let score = 0;
      const factors = [];

      // Email verified (20 points)
      if (user.email_verified) {
        score += 20;
        factors.push({ factor: 'Email verified', points: 20, status: 'positive' });
      } else {
        factors.push({ factor: 'Email not verified', points: -10, status: 'negative' });
        score -= 10;
      }

      // Phone verified (20 points)
      if (user.phone_verified) {
        score += 20;
        factors.push({ factor: 'Phone verified', points: 20, status: 'positive' });
      }

      // Profile photo (15 points)
      if (user.profile_image_url) {
        score += 15;
        factors.push({ factor: 'Profile photo uploaded', points: 15, status: 'positive' });
      }

      // Bio completed (10 points)
      if (user.bio && user.bio.length >= 50) {
        score += 10;
        factors.push({ factor: 'Complete bio', points: 10, status: 'positive' });
      }

      // Account age (up to 15 points)
      const accountAgeMonths = Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24 * 30));
      const agePoints = Math.min(accountAgeMonths * 2, 15);
      if (agePoints > 0) {
        score += agePoints;
        factors.push({ factor: `Account age: ${accountAgeMonths} months`, points: agePoints, status: 'positive' });
      }

      // Check for violations (negative points)
      const violations = await db('content_violations')
        .where('user_id', userId)
        .where('created_at', '>', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();

      const violationPenalty = violations.count * 5;
      if (violationPenalty > 0) {
        score -= violationPenalty;
        factors.push({ factor: `${violations.count} recent violations`, points: -violationPenalty, status: 'negative' });
      }

      // Check for reports against user
      const reports = await db('user_reports')
        .where('reported_user_id', userId)
        .where('created_at', '>', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();

      const reportPenalty = reports.count * 3;
      if (reportPenalty > 0) {
        score -= reportPenalty;
        factors.push({ factor: `${reports.count} recent reports`, points: -reportPenalty, status: 'negative' });
      }

      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));

      let safetyLevel = 'Low';
      if (score >= 80) safetyLevel = 'Very High';
      else if (score >= 60) safetyLevel = 'High';
      else if (score >= 40) safetyLevel = 'Medium';
      else if (score >= 20) safetyLevel = 'Low';

      return {
        score,
        safety_level: safetyLevel,
        factors,
        recommendations: this.getSafetyRecommendations(factors, score)
      };

    } catch (error) {
      logger.error('Failed to calculate user safety score:', error);
      return { score: 0, factors: [], error: 'Unable to calculate safety score' };
    }
  }

  /**
   * Get safety recommendations based on profile analysis
   */
  getSafetyRecommendations(factors, score) {
    const recommendations = [];

    if (!factors.some(f => f.factor === 'Email verified')) {
      recommendations.push({
        type: 'verification',
        priority: 'high',
        message: 'Verify your email address to increase trust with other users',
        action: 'verify_email'
      });
    }

    if (!factors.some(f => f.factor === 'Phone verified')) {
      recommendations.push({
        type: 'verification',
        priority: 'high',
        message: 'Verify your phone number for enhanced security',
        action: 'verify_phone'
      });
    }

    if (!factors.some(f => f.factor.includes('Profile photo'))) {
      recommendations.push({
        type: 'profile',
        priority: 'medium',
        message: 'Add a clear profile photo to help others identify you',
        action: 'upload_photo'
      });
    }

    if (!factors.some(f => f.factor === 'Complete bio')) {
      recommendations.push({
        type: 'profile',
        priority: 'medium',
        message: 'Write a detailed bio to help others understand your interests',
        action: 'complete_bio'
      });
    }

    if (score < 40) {
      recommendations.push({
        type: 'safety',
        priority: 'high',
        message: 'Consider reviewing dating safety tips before meeting anyone',
        action: 'review_safety_tips'
      });
    }

    if (factors.some(f => f.status === 'negative')) {
      recommendations.push({
        type: 'behavior',
        priority: 'high',
        message: 'Follow community guidelines to maintain a positive reputation',
        action: 'review_guidelines'
      });
    }

    return recommendations;
  }

  // Helper methods for emergency features
  async scheduleSafetyReminder(checkInId) {
    // This would integrate with the notification scheduling service
    logger.info(`Safety reminder scheduled for check-in: ${checkInId}`);
  }

  async notifyEmergencyContact(user, location, message) {
    // This would integrate with SMS/email service to notify emergency contact
    logger.info(`Emergency contact notified for user: ${user.id}`);
  }

  async alertAuthorities(userId, location) {
    // This would integrate with emergency services API if available
    logger.info(`Emergency alert logged for user: ${userId} at location: ${location}`);
  }
}

module.exports = new UserSafetyService();