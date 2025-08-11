const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const geoip = require('geoip-lite');
const logger = require('../config/logger');
const db = require('../config/database');
const deviceFingerprintService = require('../services/deviceFingerprintService');
const suspiciousActivityService = require('../services/suspiciousActivityService');
const twoFactorAuthService = require('../services/twoFactorAuthService');
const accountSecurityService = require('../services/accountSecurityService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

/**
 * Enhanced authentication middleware with security monitoring
 */
const enhancedAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if user exists and is active
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if account is locked
    const lockStatus = await accountSecurityService.isAccountLocked(decoded.userId);
    if (lockStatus.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account is locked',
        code: 'ACCOUNT_LOCKED',
        data: {
          reason: lockStatus.lockout.reason,
          expiresAt: lockStatus.lockout.expiresAt
        }
      });
    }

    // Validate session if using enhanced sessions
    const sessionToken = token; // In practice, you might use a separate session token
    const session = await deviceFingerprintService.validateSession(sessionToken, req.ip);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
    }

    // Check if 2FA is required but not verified for this session
    if (session.requires_2fa && !session['2fa_verified']) {
      return res.status(401).json({
        success: false,
        error: 'Two-factor authentication required',
        code: 'REQUIRE_2FA',
        data: {
          sessionId: session.id,
          methods: await get2FAMethods(decoded.userId)
        }
      });
    }

    // Analyze login attempt for suspicious activity
    const activityAnalysis = await suspiciousActivityService.analyzeLoginAttempt(
      decoded.userId,
      req.ip,
      req.get('User-Agent'),
      true, // successful login
      {
        sessionId: session.id,
        deviceId: session.device_id
      }
    );

    // Handle high-risk activities
    if (activityAnalysis.riskLevel === 'critical' || activityAnalysis.riskLevel === 'high') {
      if (activityAnalysis.requiresAdditionalVerification) {
        return res.status(401).json({
          success: false,
          error: 'Additional verification required',
          code: 'REQUIRE_ADDITIONAL_VERIFICATION',
          data: {
            riskLevel: activityAnalysis.riskLevel,
            risks: activityAnalysis.risks,
            verificationMethods: ['2fa', 'security_questions']
          }
        });
      }
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      subscription: user.subscription_status,
      createdAt: user.created_at,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified
    };

    // Add session info to request
    req.session = {
      id: session.id,
      deviceId: session.device_id,
      ipAddress: session.ip_address,
      lastActivity: session.last_activity,
      requires2FA: session.requires_2fa,
      twoFAVerified: session['2fa_verified']
    };

    // Add security context
    req.securityContext = {
      riskLevel: activityAnalysis.riskLevel,
      risks: activityAnalysis.risks,
      location: geoip.lookup(req.ip),
      deviceTrusted: await isDeviceTrusted(session.device_id),
      sessionAge: Date.now() - new Date(session.created_at).getTime()
    };

    // Update last activity
    await db('users')
      .where({ id: user.id })
      .update({ last_active: new Date() });

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    logger.error('Enhanced authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

/**
 * Require 2FA verification middleware
 */
const require2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(userId);

    if (is2FAEnabled && !req.session?.twoFAVerified) {
      return res.status(401).json({
        success: false,
        error: 'Two-factor authentication required',
        code: 'REQUIRE_2FA',
        data: {
          methods: await get2FAMethods(userId)
        }
      });
    }

    next();
  } catch (error) {
    logger.error('2FA requirement check error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Security verification error'
    });
  }
};

/**
 * Require high security verification for sensitive operations
 */
const requireHighSecurity = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.id;
    const riskLevel = req.securityContext?.riskLevel || 'low';
    const sessionAge = req.securityContext?.sessionAge || 0;
    const deviceTrusted = req.securityContext?.deviceTrusted || false;

    // Require additional verification for high-risk situations
    const requiresAdditionalVerification = (
      riskLevel === 'high' || riskLevel === 'critical' ||
      sessionAge > (4 * 60 * 60 * 1000) || // Session older than 4 hours
      !deviceTrusted
    );

    if (requiresAdditionalVerification) {
      const lastPasswordConfirmation = req.session?.lastPasswordConfirmation;
      const passwordConfirmationAge = lastPasswordConfirmation ? 
        Date.now() - new Date(lastPasswordConfirmation).getTime() : Infinity;

      // Require password confirmation within last 30 minutes for sensitive operations
      if (passwordConfirmationAge > (30 * 60 * 1000)) {
        return res.status(401).json({
          success: false,
          error: 'Password confirmation required for sensitive operation',
          code: 'REQUIRE_PASSWORD_CONFIRMATION',
          data: {
            reason: 'high_security_operation',
            riskLevel,
            sessionAge,
            deviceTrusted
          }
        });
      }
    }

    next();
  } catch (error) {
    logger.error('High security check error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Security verification error'
    });
  }
};

/**
 * Adaptive rate limiting based on risk level
 */
const createAdaptiveRateLimit = (baseOptions = {}) => {
  return async (req, res, next) => {
    try {
      const riskLevel = req.securityContext?.riskLevel || 'low';
      const deviceTrusted = req.securityContext?.deviceTrusted || false;

      // Adjust rate limits based on risk
      let maxRequests = baseOptions.max || 100;
      let windowMs = baseOptions.windowMs || 15 * 60 * 1000;

      switch (riskLevel) {
        case 'critical':
          maxRequests = Math.floor(maxRequests * 0.1); // 10% of normal
          break;
        case 'high':
          maxRequests = Math.floor(maxRequests * 0.2); // 20% of normal
          break;
        case 'medium':
          maxRequests = Math.floor(maxRequests * 0.5); // 50% of normal
          break;
        case 'low':
        default:
          if (!deviceTrusted) {
            maxRequests = Math.floor(maxRequests * 0.7); // 70% for untrusted devices
          }
          break;
      }

      // Create dynamic rate limiter
      const dynamicRateLimit = rateLimit({
        windowMs,
        max: maxRequests,
        message: {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          data: {
            riskLevel,
            deviceTrusted,
            resetTime: Date.now() + windowMs
          }
        },
        standardHeaders: true,
        legacyHeaders: false
      });

      dynamicRateLimit(req, res, next);

    } catch (error) {
      logger.error('Adaptive rate limiting error', { error: error.message });
      next(); // Allow request to proceed if rate limiting fails
    }
  };
};

/**
 * Log security events middleware
 */
const logSecurityEvent = (eventType, severity = 'low') => {
  return async (req, res, next) => {
    try {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log the security event
        setImmediate(async () => {
          try {
            await db('security_events').insert({
              user_id: req.user?.id,
              event_type: eventType,
              severity,
              event_data: JSON.stringify({
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                statusCode: res.statusCode,
                riskLevel: req.securityContext?.riskLevel,
                timestamp: new Date()
              }),
              ip_address: req.ip,
              user_agent: req.get('User-Agent')
            });
          } catch (error) {
            logger.error('Error logging security event', { error: error.message });
          }
        });

        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Security logging middleware error', { error: error.message });
      next();
    }
  };
};

/**
 * Helper functions
 */
async function get2FAMethods(userId) {
  try {
    const twoFAStatus = await twoFactorAuthService.get2FAStatus(userId);
    return {
      enabled: twoFAStatus.enabled,
      methods: twoFAStatus.enabled ? [twoFAStatus.method] : [],
      phoneVerified: twoFAStatus.phoneVerified
    };
  } catch (error) {
    logger.error('Error getting 2FA methods', { userId, error: error.message });
    return { enabled: false, methods: [] };
  }
}

async function isDeviceTrusted(deviceId) {
  try {
    const device = await db('user_devices')
      .where({ id: deviceId })
      .first();
    
    return device ? device.is_trusted : false;
  } catch (error) {
    logger.error('Error checking device trust', { deviceId, error: error.message });
    return false;
  }
}

/**
 * Password confirmation middleware
 */
const confirmPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation required',
        code: 'PASSWORD_REQUIRED'
      });
    }

    const userId = req.user.id;
    const user = await db('users').where({ id: userId }).first();
    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        code: 'INVALID_PASSWORD'
      });
    }

    // Update session with password confirmation timestamp
    if (req.session) {
      req.session.lastPasswordConfirmation = new Date();
    }

    next();
  } catch (error) {
    logger.error('Password confirmation error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Password verification error'
    });
  }
};

module.exports = {
  enhancedAuthenticate,
  require2FA,
  requireHighSecurity,
  createAdaptiveRateLimit,
  logSecurityEvent,
  confirmPassword
};