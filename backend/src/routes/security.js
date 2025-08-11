const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken, authRateLimit } = require('../middleware/auth');
const twoFactorAuthService = require('../services/twoFactorAuthService');
const phoneVerificationService = require('../services/phoneVerificationService');
const deviceFingerprintService = require('../services/deviceFingerprintService');
const suspiciousActivityService = require('../services/suspiciousActivityService');
const accountSecurityService = require('../services/accountSecurityService');
const biometricAuthService = require('../services/biometricAuthService');
const securityMonitoringService = require('../services/securityMonitoringService');
const dataProtectionService = require('../services/dataProtectionService');
const logger = require('../config/logger');
const db = require('../config/database');

const router = express.Router();

// Rate limiting for security endpoints
const securityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { success: false, error: 'Too many security requests' }
});

const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { success: false, error: 'Rate limit exceeded for sensitive operations' }
});

// =============================================================================
// TWO-FACTOR AUTHENTICATION ENDPOINTS
// =============================================================================

/**
 * Setup TOTP 2FA
 */
router.post('/2fa/setup/totp', 
  authenticateToken,
  securityRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;

      const setupData = await twoFactorAuthService.generateTOTPSecret(userId, userEmail);

      res.json({
        success: true,
        data: {
          qrCode: setupData.qrCode,
          manualEntryKey: setupData.manualEntryKey,
          backupCodes: setupData.backupCodes
        }
      });

    } catch (error) {
      logger.error('Error setting up TOTP 2FA', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to setup 2FA'
      });
    }
  }
);

/**
 * Setup SMS 2FA
 */
router.post('/2fa/setup/sms',
  authenticateToken,
  securityRateLimit,
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required')
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

      const { phoneNumber } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;

      // Send verification code
      const result = await phoneVerificationService.sendVerificationCode(
        phoneNumber,
        '2fa_setup',
        userId,
        ipAddress
      );

      res.json({
        success: true,
        message: 'Verification code sent to your phone',
        data: {
          maskedPhone: result.maskedPhone,
          expiresAt: result.expiresAt
        }
      });

    } catch (error) {
      logger.error('Error setting up SMS 2FA', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Verify and enable 2FA
 */
router.post('/2fa/verify-setup',
  authenticateToken,
  securityRateLimit,
  [
    body('method').isIn(['totp', 'sms']).withMessage('Invalid 2FA method'),
    body('code').notEmpty().withMessage('Verification code is required')
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

      const { method, code, phoneNumber } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;

      let verified = false;

      if (method === 'totp') {
        verified = await twoFactorAuthService.verifyTOTP(userId, code);
      } else if (method === 'sms') {
        if (!phoneNumber) {
          return res.status(400).json({
            success: false,
            error: 'Phone number required for SMS verification'
          });
        }
        const result = await phoneVerificationService.verifyPhoneNumber(
          phoneNumber,
          code,
          '2fa_setup',
          ipAddress
        );
        verified = result.success;
      }

      if (verified) {
        await twoFactorAuthService.enable2FA(userId, method, phoneNumber);
        
        res.json({
          success: true,
          message: 'Two-factor authentication enabled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code'
        });
      }

    } catch (error) {
      logger.error('Error verifying 2FA setup', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Disable 2FA
 */
router.post('/2fa/disable',
  authenticateToken,
  strictRateLimit,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('reason').optional().isString()
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

      const { currentPassword, reason } = req.body;
      const userId = req.user.id;

      // Verify current password
      const user = await db('users').where({ id: userId }).first();
      const bcrypt = require('bcryptjs');
      const passwordValid = await bcrypt.compare(currentPassword, user.password);

      if (!passwordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid current password'
        });
      }

      await twoFactorAuthService.disable2FA(userId);

      // Log security event
      await db('security_events').insert({
        user_id: userId,
        event_type: '2fa_disabled',
        severity: 'medium',
        event_data: JSON.stringify({ reason, ip: req.ip })
      });

      res.json({
        success: true,
        message: 'Two-factor authentication disabled'
      });

    } catch (error) {
      logger.error('Error disabling 2FA', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to disable 2FA'
      });
    }
  }
);

/**
 * Get 2FA status
 */
router.get('/2fa/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const status = await twoFactorAuthService.get2FAStatus(userId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Error getting 2FA status', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get 2FA status'
      });
    }
  }
);

// =============================================================================
// DEVICE MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * Register device fingerprint
 */
router.post('/devices/register',
  authenticateToken,
  [
    body('fingerprint').isObject().withMessage('Device fingerprint required'),
    body('deviceName').optional().isString()
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

      const { fingerprint, deviceName } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;

      // Generate device fingerprint
      const deviceFingerprint = await deviceFingerprintService.generateFingerprint(
        req,
        fingerprint
      );

      // Register device
      const device = await deviceFingerprintService.registerDevice(
        userId,
        deviceFingerprint,
        ipAddress
      );

      // Set device name if provided
      if (deviceName) {
        await db('user_devices')
          .where({ id: device.id })
          .update({ device_name: deviceName });
      }

      res.json({
        success: true,
        message: 'Device registered successfully',
        data: {
          deviceId: device.device_id,
          trustScore: device.trust_score
        }
      });

    } catch (error) {
      logger.error('Error registering device', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to register device'
      });
    }
  }
);

/**
 * Get user devices
 */
router.get('/devices',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const sessions = await deviceFingerprintService.getUserSessions(userId);

      res.json({
        success: true,
        data: sessions
      });

    } catch (error) {
      logger.error('Error getting user devices', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get devices'
      });
    }
  }
);

/**
 * Trust/untrust device
 */
router.post('/devices/:deviceId/trust',
  authenticateToken,
  strictRateLimit,
  [
    body('trusted').isBoolean().withMessage('Trusted status must be boolean')
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

      const { deviceId } = req.params;
      const { trusted } = req.body;
      const userId = req.user.id;

      await deviceFingerprintService.setDeviceTrust(userId, deviceId, trusted);

      res.json({
        success: true,
        message: `Device ${trusted ? 'trusted' : 'untrusted'} successfully`
      });

    } catch (error) {
      logger.error('Error setting device trust', {
        userId: req.user?.id,
        deviceId: req.params.deviceId,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update device trust'
      });
    }
  }
);

// =============================================================================
// BIOMETRIC AUTHENTICATION ENDPOINTS
// =============================================================================

/**
 * Register biometric authentication
 */
router.post('/biometric/register',
  authenticateToken,
  [
    body('deviceId').notEmpty().withMessage('Device ID is required'),
    body('biometricType').isIn(['face_id', 'touch_id', 'fingerprint', 'voice'])
      .withMessage('Invalid biometric type'),
    body('biometricData').optional().isObject()
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

      const { deviceId, biometricType, biometricData, settings } = req.body;
      const userId = req.user.id;

      const result = await biometricAuthService.registerBiometric(
        userId,
        deviceId,
        biometricType,
        biometricData,
        settings || {}
      );

      res.json({
        success: true,
        message: 'Biometric authentication registered',
        data: result.biometric
      });

    } catch (error) {
      logger.error('Error registering biometric', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Generate biometric challenge
 */
router.post('/biometric/challenge',
  authenticateToken,
  [
    body('deviceId').notEmpty().withMessage('Device ID is required')
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

      const { deviceId } = req.body;
      const userId = req.user.id;

      const challenge = await biometricAuthService.generateBiometricChallenge(
        userId,
        deviceId
      );

      res.json({
        success: true,
        data: challenge
      });

    } catch (error) {
      logger.error('Error generating biometric challenge', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate challenge'
      });
    }
  }
);

/**
 * Verify biometric authentication
 */
router.post('/biometric/verify',
  authenticateToken,
  [
    body('deviceId').notEmpty().withMessage('Device ID is required'),
    body('biometricType').notEmpty().withMessage('Biometric type is required'),
    body('challenge').optional().isString(),
    body('biometricData').optional().isObject()
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

      const { deviceId, biometricType, challenge, biometricData } = req.body;
      const userId = req.user.id;

      const result = await biometricAuthService.authenticateBiometric(
        userId,
        deviceId,
        biometricType,
        biometricData,
        challenge
      );

      res.json({
        success: result.success,
        message: result.success ? 'Biometric verified' : result.error,
        data: result.success ? {
          verificationMethod: result.verificationMethod
        } : {
          remainingAttempts: result.remainingAttempts
        }
      });

    } catch (error) {
      logger.error('Error verifying biometric', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Biometric verification failed'
      });
    }
  }
);

/**
 * Get biometric settings
 */
router.get('/biometric/settings',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { deviceId } = req.query;

      const settings = await biometricAuthService.getBiometricSettings(
        userId,
        deviceId || null
      );

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logger.error('Error getting biometric settings', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get biometric settings'
      });
    }
  }
);

// =============================================================================
// SECURITY QUESTIONS ENDPOINTS
// =============================================================================

/**
 * Get available security questions
 */
router.get('/security-questions',
  authenticateToken,
  async (req, res) => {
    try {
      const questions = await db('security_questions')
        .where({ is_active: true })
        .orderBy('sort_order');

      res.json({
        success: true,
        data: questions
      });

    } catch (error) {
      logger.error('Error getting security questions', {
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get security questions'
      });
    }
  }
);

/**
 * Setup security questions
 */
router.post('/security-questions/setup',
  authenticateToken,
  strictRateLimit,
  [
    body('questionsAndAnswers').isArray({ min: 3 })
      .withMessage('At least 3 security questions required'),
    body('questionsAndAnswers.*.questionId').notEmpty(),
    body('questionsAndAnswers.*.answer').notEmpty()
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

      const { questionsAndAnswers } = req.body;
      const userId = req.user.id;

      await accountSecurityService.setupSecurityQuestions(userId, questionsAndAnswers);

      res.json({
        success: true,
        message: 'Security questions setup successfully'
      });

    } catch (error) {
      logger.error('Error setting up security questions', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Verify security questions
 */
router.post('/security-questions/verify',
  authenticateToken,
  strictRateLimit,
  [
    body('answers').isArray({ min: 3 }).withMessage('At least 3 answers required'),
    body('answers.*.questionId').notEmpty(),
    body('answers.*.answer').notEmpty()
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

      const { answers } = req.body;
      const userId = req.user.id;

      const result = await accountSecurityService.verifySecurityQuestions(userId, answers);

      res.json({
        success: result.success,
        message: result.success ? 'Security questions verified' : 'Verification failed',
        data: {
          correctAnswers: result.correctAnswers,
          totalAnswers: result.totalAnswers
        }
      });

    } catch (error) {
      logger.error('Error verifying security questions', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =============================================================================
// ACCOUNT SECURITY ENDPOINTS
// =============================================================================

/**
 * Get security status
 */
router.get('/status',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const status = await accountSecurityService.getSecurityStatus(userId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Error getting security status', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get security status'
      });
    }
  }
);

/**
 * Get security timeline
 */
router.get('/timeline',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      const timeline = await accountSecurityService.getSecurityTimeline(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: timeline
      });

    } catch (error) {
      logger.error('Error getting security timeline', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get security timeline'
      });
    }
  }
);

/**
 * Change password with security checks
 */
router.post('/password/change',
  authenticateToken,
  strictRateLimit,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
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

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const result = await accountSecurityService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
        warning: result.warning
      });

    } catch (error) {
      logger.error('Error changing password', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =============================================================================
// DATA PROTECTION ENDPOINTS
// =============================================================================

/**
 * Export user data (GDPR)
 */
router.post('/data/export',
  authenticateToken,
  strictRateLimit,
  [
    body('format').optional().isIn(['json', 'csv']).withMessage('Invalid format')
  ],
  async (req, res) => {
    try {
      const { format = 'json' } = req.body;
      const userId = req.user.id;

      const exportData = await dataProtectionService.exportUserData(userId, format);

      res.json({
        success: true,
        message: 'Data export completed',
        data: {
          format: exportData.format,
          exportedAt: exportData.exportedAt,
          // Data would typically be sent via secure download link
          dataSize: exportData.data.length
        }
      });

    } catch (error) {
      logger.error('Error exporting user data', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to export data'
      });
    }
  }
);

/**
 * Request account deletion
 */
router.post('/data/delete-request',
  authenticateToken,
  strictRateLimit,
  [
    body('reason').optional().isString(),
    body('confirmPassword').notEmpty().withMessage('Password confirmation required')
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

      const { reason, confirmPassword } = req.body;
      const userId = req.user.id;

      // Verify password
      const user = await db('users').where({ id: userId }).first();
      const bcrypt = require('bcryptjs');
      const passwordValid = await bcrypt.compare(confirmPassword, user.password);

      if (!passwordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid password'
        });
      }

      // Schedule account deletion (typically with a grace period)
      await db('security_events').insert({
        user_id: userId,
        event_type: 'account_deletion_requested',
        severity: 'high',
        event_data: JSON.stringify({
          reason: reason || 'User requested',
          ip: req.ip,
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      });

      res.json({
        success: true,
        message: 'Account deletion scheduled. You have 7 days to cancel this request.'
      });

    } catch (error) {
      logger.error('Error requesting account deletion', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to process deletion request'
      });
    }
  }
);

// =============================================================================
// SECURITY MONITORING ENDPOINTS
// =============================================================================

/**
 * Get security dashboard data
 */
router.get('/dashboard',
  authenticateToken,
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      const dashboardData = await securityMonitoringService.getDashboardData(timeframe);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error getting security dashboard', {
        userId: req.user?.id,
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }
);

module.exports = router;