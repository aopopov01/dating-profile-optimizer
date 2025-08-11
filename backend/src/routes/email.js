const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const db = require('../config/database');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Email verification route
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find the verification token
    const verificationRecord = await db('email_verification_tokens')
      .where({ token, used: false })
      .where('expires_at', '>', new Date())
      .first();
    
    if (!verificationRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Mark email as verified
    await db('users')
      .where({ id: verificationRecord.user_id })
      .update({ email_verified: true });
    
    // Mark token as used
    await db('email_verification_tokens')
      .where({ token })
      .update({ used: true, used_at: new Date() });
    
    logger.info('Email verified successfully', {
      userId: verificationRecord.user_id
    });
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    logger.error('Email verification error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Email verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await db('users')
      .where({ email })
      .first();
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Save reset token
    await db('password_reset_tokens').insert({
      user_id: user.id,
      token: hashedToken,
      expires_at: new Date(Date.now() + 3600000), // 1 hour
      created_at: new Date()
    });
    
    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.first_name
    );
    
    if (!emailResult.success) {
      logger.warn('Password reset email failed to send', {
        userId: user.id,
        email: user.email,
        error: emailResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
      // In development only - remove in production
      devResetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
    
  } catch (error) {
    logger.error('Password reset request error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
      code: 'RESET_REQUEST_ERROR'
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Hash the token to match stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find valid reset token
    const resetRecord = await db('password_reset_tokens')
      .where({ token: hashedToken, used: false })
      .where('expires_at', '>', new Date())
      .first();
    
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Hash new password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update user password
    await db('users')
      .where({ id: resetRecord.user_id })
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date()
      });
    
    // Mark token as used
    await db('password_reset_tokens')
      .where({ id: resetRecord.id })
      .update({ 
        used: true, 
        used_at: new Date() 
      });
    
    logger.info('Password reset successfully', {
      userId: resetRecord.user_id
    });
    
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
    
  } catch (error) {
    logger.error('Password reset error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
      code: 'RESET_ERROR'
    });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if already verified
    const user = await db('users')
      .where({ id: userId })
      .first();
    
    if (user.email_verified) {
      return res.json({
        success: true,
        message: 'Email already verified'
      });
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Save verification token
    await db('email_verification_tokens').insert({
      user_id: userId,
      token: verificationToken,
      expires_at: new Date(Date.now() + 86400000), // 24 hours
      created_at: new Date()
    });
    
    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.first_name
    );
    
    if (!emailResult.success) {
      logger.warn('Verification email failed to send', {
        userId,
        email: user.email,
        error: emailResult.error
      });
    }
    
    res.json({
      success: true,
      message: 'Verification email sent',
      // In development only
      devVerificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
    });
    
  } catch (error) {
    logger.error('Resend verification error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
      code: 'RESEND_ERROR'
    });
  }
});

// Get email service status
router.get('/status', (req, res) => {
  try {
    const status = emailService.getStatus();
    
    res.json({
      success: true,
      data: {
        emailService: status,
        environment: process.env.NODE_ENV || 'development'
      }
    });
    
  } catch (error) {
    logger.error('Email status check error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check email service status',
      code: 'EMAIL_STATUS_ERROR'
    });
  }
});

module.exports = router;