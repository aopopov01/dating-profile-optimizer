const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const hibp = require('hibp');
const db = require('../config/database');
const logger = require('../config/logger');
const { validatePassword } = require('../middleware/auth');

class AccountSecurityService {
  constructor() {
    this.lockoutDurations = {
      'login_attempts': 30 * 60 * 1000, // 30 minutes
      'suspicious_activity': 24 * 60 * 60 * 1000, // 24 hours
      '2fa_attempts': 15 * 60 * 1000, // 15 minutes
      'admin': 0 // Indefinite until admin unlocks
    };
    
    this.passwordHistoryCount = 10; // Remember last 10 passwords
    this.securityQuestionCount = 3; // Require 3 security questions
  }

  /**
   * Set up security questions for user
   */
  async setupSecurityQuestions(userId, questionsAndAnswers) {
    try {
      // Validate input
      if (!Array.isArray(questionsAndAnswers) || questionsAndAnswers.length < this.securityQuestionCount) {
        throw new Error(`At least ${this.securityQuestionCount} security questions required`);
      }

      // Clear existing answers
      await db('user_security_answers')
        .where({ user_id: userId })
        .del();

      // Hash and store answers
      const hashedAnswers = await Promise.all(
        questionsAndAnswers.map(async ({ questionId, answer }) => {
          const normalizedAnswer = answer.toLowerCase().trim();
          const answerHash = await bcrypt.hash(normalizedAnswer, 12);
          
          return {
            user_id: userId,
            question_id: questionId,
            answer_hash: answerHash
          };
        })
      );

      await db('user_security_answers').insert(hashedAnswers);

      await this.logSecurityEvent(userId, 'security_questions_setup', 'low', {
        questionCount: questionsAndAnswers.length
      });

      logger.info('Security questions set up', {
        userId,
        questionCount: questionsAndAnswers.length
      });

      return { success: true };

    } catch (error) {
      logger.error('Error setting up security questions', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify security question answers
   */
  async verifySecurityQuestions(userId, answers) {
    try {
      // Get user's security questions
      const userAnswers = await db('user_security_answers')
        .select(
          'user_security_answers.*',
          'security_questions.question'
        )
        .join('security_questions', 'security_questions.id', 'user_security_answers.question_id')
        .where('user_security_answers.user_id', userId);

      if (userAnswers.length === 0) {
        throw new Error('No security questions set up for user');
      }

      // Verify answers
      let correctAnswers = 0;
      const verificationPromises = answers.map(async ({ questionId, answer }) => {
        const userAnswer = userAnswers.find(ua => ua.question_id === questionId);
        if (!userAnswer) return false;

        const normalizedAnswer = answer.toLowerCase().trim();
        const isCorrect = await bcrypt.compare(normalizedAnswer, userAnswer.answer_hash);
        if (isCorrect) correctAnswers++;
        return isCorrect;
      });

      await Promise.all(verificationPromises);

      const success = correctAnswers >= Math.min(answers.length, this.securityQuestionCount);

      await this.logSecurityEvent(userId, 'security_questions_verification', success ? 'low' : 'medium', {
        correctAnswers,
        totalAnswers: answers.length,
        success
      });

      return {
        success,
        correctAnswers,
        totalAnswers: answers.length
      };

    } catch (error) {
      logger.error('Error verifying security questions', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if password has been compromised in data breaches
   */
  async checkPasswordBreach(password) {
    try {
      // Use SHA-1 hash (first 5 chars) with k-anonymity model
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const hashPrefix = sha1Hash.substring(0, 5);
      const hashSuffix = sha1Hash.substring(5);

      const breachedHashes = await hibp.pwnedPassword(password);
      
      return {
        isBreached: breachedHashes > 0,
        breachCount: breachedHashes
      };

    } catch (error) {
      logger.warn('Error checking password breach', { error: error.message });
      // Don't fail the password check if HIBP is unavailable
      return {
        isBreached: false,
        breachCount: 0,
        error: 'Breach check unavailable'
      };
    }
  }

  /**
   * Change user password with security checks
   */
  async changePassword(userId, currentPassword, newPassword, skipCurrentCheck = false) {
    try {
      // Get current user data
      const user = await db('users')
        .where({ id: userId })
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password (unless skipping for reset)
      if (!skipCurrentCheck) {
        const currentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!currentPasswordValid) {
          throw new Error('Current password is incorrect');
        }
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password does not meet requirements: ${passwordValidation.errors.join(', ')}`);
      }

      // Check against password history
      const isReused = await this.checkPasswordHistory(userId, newPassword);
      if (isReused) {
        throw new Error('Cannot reuse a recent password');
      }

      // Check if password is breached
      const breachCheck = await this.checkPasswordBreach(newPassword);
      if (breachCheck.isBreached) {
        logger.warn('User attempting to use breached password', {
          userId,
          breachCount: breachCheck.breachCount
        });
        // Log but allow - user should be warned
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db('users')
        .where({ id: userId })
        .update({ 
          password: hashedPassword,
          password_changed_at: new Date(),
          updated_at: new Date()
        });

      // Store in password history
      await this.storePasswordHistory(userId, hashedPassword);

      // Invalidate all sessions (force re-login)
      await this.invalidateAllSessions(userId, 'password_change');

      await this.logSecurityEvent(userId, 'password_changed', 'low', {
        breached: breachCheck.isBreached,
        breachCount: breachCheck.breachCount,
        strength: passwordValidation.isValid ? 'strong' : 'weak'
      });

      logger.info('Password changed successfully', {
        userId,
        breached: breachCheck.isBreached
      });

      return {
        success: true,
        warning: breachCheck.isBreached ? 
          `This password was found in ${breachCheck.breachCount} data breaches. Consider using a different password.` : null
      };

    } catch (error) {
      logger.error('Error changing password', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(userId, lockoutType, reason, duration = null, lockedBy = null) {
    try {
      const lockDuration = duration || this.lockoutDurations[lockoutType] || 0;
      const expiresAt = lockDuration > 0 ? new Date(Date.now() + lockDuration) : null;

      // Create lockout record
      await db('account_lockouts').insert({
        user_id: userId,
        lockout_type: lockoutType,
        reason,
        expires_at: expiresAt,
        locked_by: lockedBy
      });

      // Mark user as locked
      await db('users')
        .where({ id: userId })
        .update({ 
          is_locked: true,
          locked_at: new Date(),
          updated_at: new Date()
        });

      // Terminate all active sessions
      await this.invalidateAllSessions(userId, 'account_locked');

      await this.logSecurityEvent(userId, 'account_locked', 'high', {
        lockoutType,
        reason,
        duration: lockDuration,
        expiresAt,
        lockedBy
      });

      logger.warn('Account locked', {
        userId,
        lockoutType,
        reason,
        duration: lockDuration
      });

      return {
        success: true,
        expiresAt,
        reason
      };

    } catch (error) {
      logger.error('Error locking account', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unlock user account
   */
  async unlockAccount(userId, unlockedBy = null, reason = 'manual_unlock') {
    try {
      // Deactivate all active lockouts
      await db('account_lockouts')
        .where({
          user_id: userId,
          is_active: true
        })
        .update({
          is_active: false,
          unlocked_by: unlockedBy,
          unlocked_at: new Date(),
          updated_at: new Date()
        });

      // Mark user as unlocked
      await db('users')
        .where({ id: userId })
        .update({ 
          is_locked: false,
          locked_at: null,
          updated_at: new Date()
        });

      await this.logSecurityEvent(userId, 'account_unlocked', 'low', {
        unlockedBy,
        reason
      });

      logger.info('Account unlocked', {
        userId,
        unlockedBy,
        reason
      });

      return { success: true };

    } catch (error) {
      logger.error('Error unlocking account', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId) {
    try {
      const activeLockout = await db('account_lockouts')
        .where({
          user_id: userId,
          is_active: true
        })
        .where(function() {
          this.whereNull('expires_at').orWhere('expires_at', '>', new Date());
        })
        .first();

      return {
        isLocked: !!activeLockout,
        lockout: activeLockout ? {
          type: activeLockout.lockout_type,
          reason: activeLockout.reason,
          lockedAt: activeLockout.locked_at,
          expiresAt: activeLockout.expires_at,
          isExpired: activeLockout.expires_at ? new Date(activeLockout.expires_at) < new Date() : false
        } : null
      };

    } catch (error) {
      logger.error('Error checking account lock status', {
        userId,
        error: error.message
      });
      return { isLocked: false, lockout: null };
    }
  }

  /**
   * Get account security timeline/audit log
   */
  async getSecurityTimeline(userId, limit = 50, offset = 0) {
    try {
      const events = await db('security_events')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return events.map(event => ({
        id: event.id,
        type: event.event_type,
        severity: event.severity,
        description: this.getEventDescription(event.event_type),
        data: event.event_data ? JSON.parse(event.event_data) : {},
        ipAddress: event.ip_address ? this.maskIP(event.ip_address) : null,
        location: event.location_data ? JSON.parse(event.location_data) : null,
        timestamp: event.created_at,
        resolved: event.is_resolved
      }));

    } catch (error) {
      logger.error('Error getting security timeline', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get account security status
   */
  async getSecurityStatus(userId) {
    try {
      const user = await db('users').where({ id: userId }).first();
      const lockStatus = await this.isAccountLocked(userId);
      
      // Get 2FA status
      const twoFA = await db('user_2fa').where({ user_id: userId }).first();
      
      // Get security questions status
      const securityQuestions = await db('user_security_answers')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      // Get recent security events
      const recentEvents = await db('security_events')
        .where({ user_id: userId })
        .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
        .orderBy('created_at', 'desc')
        .limit(5);

      // Calculate security score
      const securityScore = this.calculateSecurityScore({
        has2FA: twoFA?.is_enabled || false,
        hasSecurityQuestions: parseInt(securityQuestions.count) >= this.securityQuestionCount,
        passwordStrong: true, // Assume strong if it passed validation
        recentBreaches: recentEvents.filter(e => e.event_type === 'password_breach_detected').length,
        accountAge: user.created_at
      });

      return {
        isLocked: lockStatus.isLocked,
        lockout: lockStatus.lockout,
        twoFAEnabled: twoFA?.is_enabled || false,
        twoFAMethod: twoFA?.preferred_method || null,
        securityQuestionsCount: parseInt(securityQuestions.count),
        securityQuestionsRequired: this.securityQuestionCount,
        lastPasswordChange: user.password_changed_at,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        securityScore: securityScore,
        recentEvents: recentEvents.length,
        accountCreated: user.created_at
      };

    } catch (error) {
      logger.error('Error getting security status', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  async checkPasswordHistory(userId, newPassword) {
    try {
      const passwordHistory = await db('password_history')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(this.passwordHistoryCount);

      for (const historyEntry of passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, historyEntry.password_hash);
        if (isMatch) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking password history', { error: error.message });
      return false;
    }
  }

  async storePasswordHistory(userId, hashedPassword) {
    try {
      // Add new password to history
      await db('password_history').insert({
        user_id: userId,
        password_hash: hashedPassword,
        created_at: new Date()
      });

      // Clean up old entries (keep only the latest N)
      const oldEntries = await db('password_history')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .offset(this.passwordHistoryCount);

      if (oldEntries.length > 0) {
        const oldIds = oldEntries.map(entry => entry.id);
        await db('password_history')
          .whereIn('id', oldIds)
          .del();
      }

    } catch (error) {
      logger.error('Error storing password history', { error: error.message });
    }
  }

  async invalidateAllSessions(userId, reason) {
    try {
      // Invalidate enhanced sessions
      await db('enhanced_sessions')
        .where({ user_id: userId, is_active: true })
        .update({
          is_active: false,
          termination_reason: reason,
          updated_at: new Date()
        });

      // Revoke refresh tokens
      await db('refresh_tokens')
        .where({ user_id: userId, is_revoked: false })
        .update({
          is_revoked: true,
          revoked_at: new Date()
        });

    } catch (error) {
      logger.error('Error invalidating sessions', { error: error.message });
    }
  }

  calculateSecurityScore(factors) {
    let score = 0;
    
    // Base security factors
    if (factors.has2FA) score += 30;
    if (factors.hasSecurityQuestions) score += 20;
    if (factors.passwordStrong) score += 20;
    
    // Account age bonus
    const accountAgeMonths = (new Date() - new Date(factors.accountAge)) / (1000 * 60 * 60 * 24 * 30);
    if (accountAgeMonths > 6) score += 10;
    if (accountAgeMonths > 12) score += 10;
    
    // Penalty for recent security issues
    score -= factors.recentBreaches * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  getEventDescription(eventType) {
    const descriptions = {
      'password_changed': 'Password was changed',
      'account_locked': 'Account was locked',
      'account_unlocked': 'Account was unlocked',
      'security_questions_setup': 'Security questions were set up',
      'security_questions_verification': 'Security questions were verified',
      '2fa_enabled': 'Two-factor authentication was enabled',
      '2fa_disabled': 'Two-factor authentication was disabled',
      'suspicious_login': 'Suspicious login attempt detected',
      'new_device_detected': 'New device detected',
      'phone_verification_sent': 'Phone verification code sent',
      'phone_verification_success': 'Phone number verified successfully'
    };
    
    return descriptions[eventType] || 'Security event occurred';
  }

  maskIP(ip) {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.**`;
    }
    return ip.substring(0, ip.length - 6) + '***';
  }

  async logSecurityEvent(userId, eventType, severity, data) {
    try {
      await db('security_events').insert({
        user_id: userId,
        event_type: eventType,
        severity,
        event_data: JSON.stringify(data || {}),
        ip_address: data?.ipAddress,
        user_agent: data?.userAgent,
        location_data: data?.location ? JSON.stringify(data.location) : null
      });
    } catch (error) {
      logger.error('Error logging security event', { error: error.message });
    }
  }

  /**
   * Admin methods for security management
   */
  async getSecurityStats(startDate, endDate) {
    try {
      const stats = await db('security_events')
        .select(
          db.raw('DATE(created_at) as date'),
          'event_type',
          'severity',
          db.raw('COUNT(*) as count')
        )
        .whereBetween('created_at', [startDate, endDate])
        .groupBy(db.raw('DATE(created_at)'), 'event_type', 'severity')
        .orderBy('date', 'desc');

      return stats;
    } catch (error) {
      logger.error('Error getting security stats', { error: error.message });
      throw error;
    }
  }

  async getLockedAccounts() {
    try {
      return await db('account_lockouts')
        .select(
          'account_lockouts.*',
          'users.email',
          'users.first_name',
          'users.last_name'
        )
        .join('users', 'users.id', 'account_lockouts.user_id')
        .where('account_lockouts.is_active', true)
        .orderBy('account_lockouts.created_at', 'desc');
    } catch (error) {
      logger.error('Error getting locked accounts', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup expired lockouts
   */
  async cleanupExpiredLockouts() {
    try {
      // Find expired lockouts
      const expiredLockouts = await db('account_lockouts')
        .where('is_active', true)
        .where('expires_at', '<', new Date())
        .whereNotNull('expires_at');

      // Auto-unlock accounts with expired lockouts
      for (const lockout of expiredLockouts) {
        await this.unlockAccount(lockout.user_id, null, 'auto_unlock_expired');
      }

      logger.info(`Auto-unlocked ${expiredLockouts.length} expired account lockouts`);
      return expiredLockouts.length;

    } catch (error) {
      logger.error('Error cleaning up expired lockouts', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AccountSecurityService();