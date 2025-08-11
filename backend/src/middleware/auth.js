const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const db = require('../config/database');

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate refresh token
const generateRefreshToken = (userId, email) => {
  return jwt.sign(
    { 
      userId, 
      email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      logger.warn('Invalid token type used for authentication', {
        userId: decoded.userId,
        tokenType: decoded.type,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if user still exists and is active
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      logger.warn('Token valid but user not found or inactive', {
        userId: decoded.userId,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      subscription: user.subscription_status,
      createdAt: user.created_at
    };

    // Update last activity
    await db('users')
      .where({ id: user.id })
      .update({ last_active: new Date() });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.info('Expired token used', {
        expiredAt: error.expiredAt,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token format', {
        error: error.message,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    logger.error('Authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Refresh token middleware
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Check if refresh token exists in database and is valid
    const storedToken = await db('refresh_tokens')
      .where({ 
        user_id: decoded.userId, 
        token: refreshToken,
        is_revoked: false 
      })
      .where('expires_at', '>', new Date())
      .first();

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found or expired',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Get user info
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

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    };

    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    logger.error('Refresh token authentication error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        subscription: user.subscription_status
      };
    }
  } catch (error) {
    // Ignore auth errors in optional auth
    logger.debug('Optional auth failed', { error: error.message });
  }

  next();
};

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for auth endpoint', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// Password strength validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Revoke refresh token
const revokeRefreshToken = async (userId, token = null) => {
  const query = db('refresh_tokens')
    .where({ user_id: userId })
    .update({ is_revoked: true, revoked_at: new Date() });

  if (token) {
    query.where({ token });
  }

  return await query;
};

// Clean up expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const result = await db('refresh_tokens')
      .where('expires_at', '<', new Date())
      .orWhere('is_revoked', true)
      .del();
    
    logger.info(`Cleaned up ${result} expired refresh tokens`);
    return result;
  } catch (error) {
    logger.error('Error cleaning up expired tokens', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  authenticateToken,
  authenticateRefreshToken,
  optionalAuth,
  authRateLimit,
  generateToken,
  generateRefreshToken,
  validatePassword,
  hashPassword,
  comparePassword,
  revokeRefreshToken,
  cleanupExpiredTokens
};