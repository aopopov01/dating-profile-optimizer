const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/**
 * Email Service for sending verification and password reset emails
 * Supports multiple email providers and templates
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }
  
  /**
   * Initialize email transporter with SMTP configuration
   */
  initializeTransporter() {
    try {
      // Skip initialization if no SMTP configuration
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        logger.info('SMTP not configured - email service in mock mode');
        return;
      }
      
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      };
      
      this.transporter = nodemailer.createTransport(smtpConfig);
      this.isConfigured = true;
      
      logger.info('Email service initialized successfully', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: smtpConfig.secure
      });
      
    } catch (error) {
      logger.error('Failed to initialize email service', {
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.transporter) {
      return false;
    }
    
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
      return true;
    } catch (error) {
      logger.error('SMTP connection verification failed', {
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Send email verification message
   */
  async sendVerificationEmail(userEmail, verificationToken, userName = '') {
    const subject = 'Verify Your Dating Profile Optimizer Account';
    const verificationLink = `${process.env.API_BASE_URL || 'http://localhost:3002'}/api/email/verify/${verificationToken}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Account</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .logo { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">💕 Dating Profile Optimizer</div>
        <h1>Verify Your Account</h1>
    </div>
    
    <div class="content">
        <h2>Welcome${userName ? `, ${userName}` : ''}!</h2>
        
        <p>Thank you for signing up for Dating Profile Optimizer. To get started with AI-powered profile optimization, please verify your email address.</p>
        
        <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="background: #e9e9e9; padding: 10px; word-break: break-all; font-family: monospace;">
            ${verificationLink}
        </p>
        
        <p><strong>This link expires in 24 hours.</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <h3>🚀 What's next?</h3>
        <ul>
            <li>Upload photos for AI analysis and optimization</li>
            <li>Generate compelling dating bios with AI</li>
            <li>Track your profile performance</li>
            <li>Get personalized improvement recommendations</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>© 2024 Xciterr Ltd. All rights reserved.</p>
        <p>If you didn't create an account, please ignore this email.</p>
    </div>
</body>
</html>`;
    
    const textContent = `
Welcome to Dating Profile Optimizer!

Thank you for signing up${userName ? `, ${userName}` : ''}. To complete your account setup, please verify your email address by clicking the link below:

${verificationLink}

This link expires in 24 hours.

Once verified, you can:
- Upload photos for AI analysis and optimization
- Generate compelling dating bios with AI
- Track your profile performance
- Get personalized improvement recommendations

© 2024 Xciterr Ltd. All rights reserved.
If you didn't create an account, please ignore this email.
`;
    
    return this.sendEmail(userEmail, subject, textContent, htmlContent);
  }
  
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail, resetToken, userName = '') {
    const subject = 'Reset Your Dating Profile Optimizer Password';
    const resetLink = `${process.env.API_BASE_URL || 'http://localhost:3002'}/reset-password/${resetToken}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff7b7b 0%, #d63031 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #d63031; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .logo { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">💕 Dating Profile Optimizer</div>
        <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
        <h2>Reset Your Password</h2>
        
        <p>Hello${userName ? `, ${userName}` : ''},</p>
        
        <p>We received a request to reset your password for your Dating Profile Optimizer account. Click the button below to create a new password:</p>
        
        <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="background: #e9e9e9; padding: 10px; word-break: break-all; font-family: monospace;">
            ${resetLink}
        </p>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0 0 0;">
                <li>This link expires in 1 hour</li>
                <li>Only use this link if you requested the password reset</li>
                <li>Never share this link with anyone</li>
            </ul>
        </div>
        
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
    </div>
    
    <div class="footer">
        <p>© 2024 Xciterr Ltd. All rights reserved.</p>
        <p>For security questions, contact: support@datingoptimizer.com</p>
    </div>
</body>
</html>`;
    
    const textContent = `
Password Reset - Dating Profile Optimizer

Hello${userName ? `, ${userName}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

SECURITY NOTICE:
- This link expires in 1 hour
- Only use this link if you requested the password reset
- Never share this link with anyone

If you didn't request this password reset, please ignore this email.

© 2024 Xciterr Ltd. All rights reserved.
For security questions, contact: support@datingoptimizer.com
`;
    
    return this.sendEmail(userEmail, subject, textContent, htmlContent);
  }
  
  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(userEmail, userName = '') {
    const subject = 'Welcome to Dating Profile Optimizer! 🎉';
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Dating Profile Optimizer</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #00b894; }
        .button { background: #00b894; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .logo { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">💕 Dating Profile Optimizer</div>
        <h1>Welcome Aboard${userName ? `, ${userName}` : ''}! 🎉</h1>
    </div>
    
    <div class="content">
        <p><strong>Congratulations!</strong> Your account is now verified and ready to help you create the perfect dating profile.</p>
        
        <h3>🚀 Here's what you can do now:</h3>
        
        <div class="feature">
            <h4>📸 AI Photo Analysis</h4>
            <p>Upload your photos and get instant AI feedback on attractiveness, quality, and optimization tips for different dating platforms.</p>
        </div>
        
        <div class="feature">
            <h4>✍️ AI Bio Generation</h4>
            <p>Create compelling, platform-optimized bios that showcase your personality and attract the right matches.</p>
        </div>
        
        <div class="feature">
            <h4>📊 Performance Tracking</h4>
            <p>Monitor your dating success with detailed analytics and get personalized recommendations for improvement.</p>
        </div>
        
        <div class="feature">
            <h4>💼 LinkedIn Headshots</h4>
            <p>Transform your casual photos into professional headshots perfect for LinkedIn and professional networking.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.API_BASE_URL || 'http://localhost:3002'}" class="button">Start Optimizing Your Profile</a>
        </div>
        
        <h3>💡 Pro Tips for Success:</h3>
        <ul>
            <li><strong>Upload 3-5 photos</strong> for the most comprehensive analysis</li>
            <li><strong>Be authentic</strong> in your bio - our AI will help you shine</li>
            <li><strong>Try different variations</strong> and A/B test your profiles</li>
            <li><strong>Track your progress</strong> to see what works best</li>
        </ul>
        
        <p>Questions? Our support team is here to help at <strong>support@datingoptimizer.com</strong></p>
    </div>
    
    <div class="footer">
        <p>© 2024 Xciterr Ltd. All rights reserved.</p>
        <p>Ready to find your perfect match? Let's get started! 💕</p>
    </div>
</body>
</html>`;
    
    const textContent = `
Welcome to Dating Profile Optimizer!

Congratulations${userName ? `, ${userName}` : ''}! Your account is verified and ready.

Here's what you can do now:

📸 AI PHOTO ANALYSIS
Upload photos and get instant AI feedback on attractiveness, quality, and optimization tips.

✍️ AI BIO GENERATION  
Create compelling, platform-optimized bios that showcase your personality.

📊 PERFORMANCE TRACKING
Monitor your dating success with detailed analytics and personalized recommendations.

💼 LINKEDIN HEADSHOTS
Transform casual photos into professional headshots for LinkedIn.

PRO TIPS FOR SUCCESS:
• Upload 3-5 photos for comprehensive analysis
• Be authentic in your bio - our AI will help you shine
• Try different variations and A/B test your profiles
• Track your progress to see what works best

Questions? Contact support@datingoptimizer.com

Ready to find your perfect match? Let's get started! 💕

© 2024 Xciterr Ltd. All rights reserved.
`;
    
    return this.sendEmail(userEmail, subject, textContent, htmlContent);
  }
  
  /**
   * Send generic email
   */
  async sendEmail(to, subject, textContent, htmlContent = null) {
    try {
      // Mock mode - just log the email
      if (!this.isConfigured) {
        logger.info('Email sent (mock mode)', {
          to,
          subject,
          textPreview: textContent.substring(0, 100) + '...'
        });
        return { success: true, messageId: 'mock-' + Date.now() };
      }
      
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Dating Profile Optimizer',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to,
        subject,
        text: textContent,
        ...(htmlContent && { html: htmlContent }),
        headers: {
          'X-Mailer': 'Dating Profile Optimizer API v1.0',
          'X-Priority': '3'
        }
      };
      
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });
      
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
        stack: error.stack
      });
      
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get email service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      provider: process.env.SMTP_HOST || 'none',
      mockMode: !this.isConfigured
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;