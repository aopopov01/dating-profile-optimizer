const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');
const db = require('../config/database');
const { analytics, ANALYTICS_EVENTS } = require('../config/analytics');
const {
  authRateLimit,
  generateToken,
  generateRefreshToken,
  validatePassword,
  hashPassword,
  comparePassword,
  authenticateRefreshToken,
  revokeRefreshToken
} = require('../middleware/auth');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Validation middleware
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        throw new Error('You must be at least 18 years old to register');
      }
      if (age > 100) {
        throw new Error('Please provide a valid date of birth');
      }
      return true;
    }),
  
  body('gender')
    .isIn(['male', 'female', 'non-binary', 'other'])
    .withMessage('Please select a valid gender'),
  
  
  body('agreeToTerms')
    .equals('true')
    .withMessage('You must agree to the terms and conditions'),
  
  body('agreeToPrivacy')
    .equals('true')
    .withMessage('You must agree to the privacy policy')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Register new user
router.post('/register', authRateLimit, registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Registration validation failed', {
        errors: errors.array(),
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
      location
    } = req.body;

    // Additional password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await db('users')
      .where({ email })
      .first();

    if (existingUser) {
      logger.warn('Registration attempt with existing email', {
        email,
        ip: req.ip
      });
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Calculate age from date of birth
    const birthDate = new Date(dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();

    // Create user
    const [userResult] = await db('users').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      password_hash: hashedPassword,
      age,
      gender,
      location: location || null,
      subscription_status: 'free'
    }).returning('id');
    
    const userId = userResult.id;

    // Generate tokens
    const accessToken = generateToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    // Store refresh token
    await db('refresh_tokens').insert({
      user_id: userId,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Save verification token
    await db('email_verification_tokens').insert({
      user_id: userId,
      token: verificationToken,
      expires_at: new Date(Date.now() + 86400000), // 24 hours
      created_at: new Date()
    });
    
    // Send verification email (non-blocking)
    emailService.sendVerificationEmail(email, verificationToken, firstName)
      .catch(error => {
        logger.warn('Registration verification email failed', {
          userId,
          email,
          error: error.message
        });
      });

    logger.info('New user registered successfully', {
      userId,
      email,
      ip: req.ip
    });

    // Track user registration
    analytics.trackEvent(userId, ANALYTICS_EVENTS.USER_REGISTERED, {
      email,
      first_name: firstName,
      last_name: lastName,
      gender,
      location,
      registration_method: 'email',
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    // Identify user for analytics
    analytics.identifyUser(userId, {
      email,
      first_name: firstName,
      last_name: lastName,
      subscription_plan: 'free',
      gender,
      location
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: userId,
          firstName,
          lastName,
          email,
          subscription: 'free'
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Registration error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', authRateLimit, loginValidation, async (req, res) => {
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

    const { email, password } = req.body;

    // Find user
    const user = await db('users')
      .where({ email, is_active: true })
      .first();

    if (!user) {
      logger.warn('Login attempt with non-existent email', {
        email,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', {
        userId: user.id,
        email,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token
    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    });

    // Update last active time
    await db('users')
      .where({ id: user.id })
      .update({ 
        last_active: new Date()
      });

    logger.info('User logged in successfully', {
      userId: user.id,
      email,
      ip: req.ip
    });

    // Track user login
    analytics.trackEvent(user.id, ANALYTICS_EVENTS.USER_LOGIN, {
      email,
      login_method: 'email_password',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      subscription_plan: user.subscription_status
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          subscription: user.subscription_status
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', authenticateRefreshToken, async (req, res) => {
  try {
    const { user, refreshToken: oldRefreshToken } = req;

    // Revoke old refresh token
    await revokeRefreshToken(user.id, oldRefreshToken);

    // Generate new tokens
    const accessToken = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store new refresh token
    await db('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    });

    logger.info('Tokens refreshed successfully', {
      userId: user.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Token refresh error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
});

// Logout (revoke refresh token)
router.post('/logout', authenticateRefreshToken, async (req, res) => {
  try {
    const { user, refreshToken } = req;

    // Revoke the refresh token
    await revokeRefreshToken(user.id, refreshToken);

    logger.info('User logged out successfully', {
      userId: user.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateRefreshToken, async (req, res) => {
  try {
    const { user } = req;

    // Revoke all refresh tokens for user
    await revokeRefreshToken(user.id);

    logger.info('User logged out from all devices', {
      userId: user.id,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    logger.error('Logout all devices error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    
    res.status(500).json({
      success: false,
      error: 'Logout from all devices failed',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

module.exports = router;