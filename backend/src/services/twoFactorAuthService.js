const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');
const twilio = require('twilio');
const db = require('../config/database');
const logger = require('../config/logger');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

class TwoFactorAuthService {
  constructor() {
    this.appName = process.env.APP_NAME || 'Dating Profile Optimizer';
    this.issuer = process.env.APP_ISSUER || 'DatingOptimizer';
  }

  /**
   * Generate TOTP secret and QR code for user
   */
  async generateTOTPSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${userEmail} (${this.appName})`,
        issuer: this.issuer,
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Store secret in database (encrypted)
      const encryptedSecret = this.encryptSecret(secret.base32);
      
      await db('user_2fa')
        .insert({
          user_id: userId,
          secret_key: encryptedSecret,
          is_enabled: false,
          preferred_method: 'totp'
        })
        .onConflict('user_id')
        .merge({
          secret_key: encryptedSecret,
          updated_at: new Date()
        });

      logger.info('TOTP secret generated for user', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes: await this.generateBackupCodes(userId)
      };
    } catch (error) {
      logger.error('Error generating TOTP secret', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  async verifyTOTP(userId, token, window = 2) {
    try {
      const user2fa = await db('user_2fa')
        .where({ user_id: userId })
        .first();

      if (!user2fa || !user2fa.secret_key) {
        throw new Error('2FA not set up for user');
      }

      const decryptedSecret = this.decryptSecret(user2fa.secret_key);
      
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: token.toString(),
        window: window
      });

      // Log attempt
      await this.logVerificationAttempt(userId, 'totp', verified);

      if (verified) {
        await this.updateLastUsed(userId);
        await this.resetFailedAttempts(userId);
      } else {
        await this.incrementFailedAttempts(userId);
      }

      return verified;
    } catch (error) {
      logger.error('Error verifying TOTP', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId, phoneNumber, purpose = 'login') {
    try {
      // Validate phone number
      if (!isValidPhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      const parsedPhone = parsePhoneNumber(phoneNumber);
      const formattedPhone = parsedPhone.format('E.164');

      // Generate 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      // Check rate limiting
      await this.checkSMSRateLimit(formattedPhone);

      // Store verification code
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await db('2fa_attempts').insert({
        user_id: userId,
        method: 'sms',
        code_sent: hashedCode,
        ip_address: null, // Will be set by caller
        user_agent: null,
        expires_at: expiresAt
      });

      // Send SMS via Twilio
      const message = await twilioClient.messages.create({
        body: `Your ${this.appName} verification code is: ${code}. Valid for 10 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      logger.info('SMS verification code sent', { 
        userId, 
        phoneNumber: formattedPhone,
        messageSid: message.sid,
        purpose
      });

      return {
        success: true,
        expiresAt,
        messageSid: message.sid
      };
    } catch (error) {
      logger.error('Error sending SMS code', { userId, phoneNumber, error: error.message });
      throw error;
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId, code, ipAddress = null) {
    try {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      const attempt = await db('2fa_attempts')
        .where({
          user_id: userId,
          method: 'sms',
          code_sent: hashedCode
        })
        .where('expires_at', '>', new Date())
        .whereNull('successful')
        .first();

      if (!attempt) {
        await this.logVerificationAttempt(userId, 'sms', false, ipAddress);
        return false;
      }

      // Mark as successful
      await db('2fa_attempts')
        .where({ id: attempt.id })
        .update({ 
          successful: true,
          attempted_at: new Date()
        });

      await this.updateLastUsed(userId);
      await this.resetFailedAttempts(userId);

      logger.info('SMS code verified successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Error verifying SMS code', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate and store backup codes
   */
  async generateBackupCodes(userId, count = 10) {
    try {
      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
      }

      const encryptedCodes = this.encryptSecret(JSON.stringify(codes));
      
      await db('user_2fa')
        .where({ user_id: userId })
        .update({ 
          backup_codes: encryptedCodes,
          updated_at: new Date()
        });

      logger.info('Backup codes generated', { userId, count });
      return codes;
    } catch (error) {
      logger.error('Error generating backup codes', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId, code) {
    try {
      const user2fa = await db('user_2fa')
        .where({ user_id: userId })
        .first();

      if (!user2fa || !user2fa.backup_codes) {
        return false;
      }

      const decryptedCodes = JSON.parse(this.decryptSecret(user2fa.backup_codes));
      const codeIndex = decryptedCodes.indexOf(code.toUpperCase());

      if (codeIndex === -1) {
        await this.logVerificationAttempt(userId, 'backup', false);
        return false;
      }

      // Remove used code
      decryptedCodes.splice(codeIndex, 1);
      const updatedEncryptedCodes = this.encryptSecret(JSON.stringify(decryptedCodes));

      await db('user_2fa')
        .where({ user_id: userId })
        .update({ 
          backup_codes: updatedEncryptedCodes,
          updated_at: new Date()
        });

      await this.logVerificationAttempt(userId, 'backup', true);
      await this.updateLastUsed(userId);

      logger.info('Backup code used successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Error verifying backup code', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId, method = 'totp', phoneNumber = null) {
    try {
      const updateData = {
        is_enabled: true,
        preferred_method: method,
        updated_at: new Date()
      };

      if (method === 'sms' || method === 'both') {
        if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
          throw new Error('Valid phone number required for SMS 2FA');
        }
        updateData.phone_number = parsePhoneNumber(phoneNumber).format('E.164');
        updateData.phone_verified = false;
      }

      await db('user_2fa')
        .where({ user_id: userId })
        .update(updateData);

      logger.info('2FA enabled for user', { userId, method });
      return true;
    } catch (error) {
      logger.error('Error enabling 2FA', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId) {
    try {
      await db('user_2fa')
        .where({ user_id: userId })
        .update({
          is_enabled: false,
          secret_key: null,
          backup_codes: null,
          phone_number: null,
          phone_verified: false,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date()
        });

      logger.info('2FA disabled for user', { userId });
      return true;
    } catch (error) {
      logger.error('Error disabling 2FA', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId) {
    try {
      const user2fa = await db('user_2fa')
        .where({ user_id: userId, is_enabled: true })
        .first();

      return !!user2fa;
    } catch (error) {
      logger.error('Error checking 2FA status', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Get 2FA status and settings for user
   */
  async get2FAStatus(userId) {
    try {
      const user2fa = await db('user_2fa')
        .where({ user_id: userId })
        .first();

      if (!user2fa) {
        return {
          enabled: false,
          method: null,
          phoneNumber: null,
          phoneVerified: false,
          backupCodesCount: 0,
          isLocked: false
        };
      }

      const backupCodes = user2fa.backup_codes 
        ? JSON.parse(this.decryptSecret(user2fa.backup_codes)).length 
        : 0;

      return {
        enabled: user2fa.is_enabled,
        method: user2fa.preferred_method,
        phoneNumber: user2fa.phone_number 
          ? user2fa.phone_number.replace(/(\+\d{1,3})\d{6,}(\d{4})/, '$1***$2')
          : null,
        phoneVerified: user2fa.phone_verified,
        backupCodesCount: backupCodes,
        isLocked: user2fa.locked_until && new Date(user2fa.locked_until) > new Date(),
        lastUsed: user2fa.last_used_at
      };
    } catch (error) {
      logger.error('Error getting 2FA status', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  encryptSecret(text) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_PASSWORD || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptSecret(encryptedText) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_PASSWORD || 'default-key', 'salt', 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async logVerificationAttempt(userId, method, successful, ipAddress = null) {
    await db('2fa_attempts').insert({
      user_id: userId,
      method,
      successful,
      ip_address: ipAddress,
      attempted_at: new Date()
    });
  }

  async updateLastUsed(userId) {
    await db('user_2fa')
      .where({ user_id: userId })
      .update({ last_used_at: new Date() });
  }

  async incrementFailedAttempts(userId) {
    const result = await db('user_2fa')
      .where({ user_id: userId })
      .increment('failed_attempts', 1);

    const user2fa = await db('user_2fa')
      .where({ user_id: userId })
      .first();

    // Lock account after 5 failed attempts
    if (user2fa.failed_attempts >= 5) {
      const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await db('user_2fa')
        .where({ user_id: userId })
        .update({ locked_until: lockUntil });
      
      logger.warn('2FA account locked due to failed attempts', { 
        userId, 
        failedAttempts: user2fa.failed_attempts 
      });
    }
  }

  async resetFailedAttempts(userId) {
    await db('user_2fa')
      .where({ user_id: userId })
      .update({ 
        failed_attempts: 0,
        locked_until: null
      });
  }

  async checkSMSRateLimit(phoneNumber) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentAttempts = await db('2fa_attempts')
      .join('user_2fa', 'user_2fa.user_id', '2fa_attempts.user_id')
      .where('user_2fa.phone_number', phoneNumber)
      .where('2fa_attempts.method', 'sms')
      .where('2fa_attempts.attempted_at', '>', oneHourAgo)
      .count('* as count')
      .first();

    if (recentAttempts.count >= 5) {
      throw new Error('SMS rate limit exceeded. Please try again later.');
    }
  }
}

module.exports = new TwoFactorAuthService();