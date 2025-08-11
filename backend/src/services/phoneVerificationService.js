const crypto = require('crypto');
const { parsePhoneNumber, isValidPhoneNumber, getCountryCallingCode } = require('libphonenumber-js');
const twilio = require('twilio');
const geoip = require('geoip-lite');
const db = require('../config/database');
const logger = require('../config/logger');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

class PhoneVerificationService {
  constructor() {
    this.appName = process.env.APP_NAME || 'Dating Profile Optimizer';
    this.maxVerificationAttempts = 3;
    this.codeExpiryMinutes = 10;
    this.dailySMSLimit = 5;
    this.hourlyIPLimit = 3;
  }

  /**
   * Send verification code to phone number
   */
  async sendVerificationCode(phoneNumber, purpose = 'registration', userId = null, ipAddress = null) {
    try {
      // Validate phone number
      if (!isValidPhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      const parsedPhone = parsePhoneNumber(phoneNumber);
      const formattedPhone = parsedPhone.format('E.164');
      const country = parsedPhone.country;

      // Check rate limits
      await this.checkRateLimits(formattedPhone, ipAddress);

      // Check for suspicious patterns
      await this.checkFraudPatterns(formattedPhone, ipAddress, userId);

      // Generate verification code
      const code = this.generateVerificationCode();
      const hashedCode = this.hashCode(code);

      // Store verification attempt
      const expiresAt = new Date(Date.now() + this.codeExpiryMinutes * 60 * 1000);
      
      const verificationId = await db('phone_verifications')
        .insert({
          user_id: userId,
          phone_number: formattedPhone,
          verification_code: hashedCode,
          purpose,
          ip_address: ipAddress,
          expires_at: expiresAt
        })
        .returning('id');

      // Send SMS
      const message = await this.sendSMS(formattedPhone, code, purpose);

      // Log security event
      await this.logSecurityEvent(userId, 'phone_verification_sent', {
        phoneNumber: formattedPhone,
        country,
        purpose,
        ipAddress,
        messageSid: message.sid
      });

      logger.info('Phone verification code sent', {
        userId,
        phoneNumber: this.maskPhoneNumber(formattedPhone),
        purpose,
        country,
        verificationId: verificationId[0]
      });

      return {
        success: true,
        verificationId: verificationId[0],
        expiresAt,
        maskedPhone: this.maskPhoneNumber(formattedPhone)
      };

    } catch (error) {
      logger.error('Error sending phone verification', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify phone number with code
   */
  async verifyPhoneNumber(phoneNumber, code, purpose = 'registration', ipAddress = null) {
    try {
      const formattedPhone = parsePhoneNumber(phoneNumber).format('E.164');
      const hashedCode = this.hashCode(code);

      // Find active verification
      const verification = await db('phone_verifications')
        .where({
          phone_number: formattedPhone,
          verification_code: hashedCode,
          purpose,
          verified: false
        })
        .where('expires_at', '>', new Date())
        .where('attempts', '<', this.maxVerificationAttempts)
        .first();

      if (!verification) {
        // Increment attempts for this phone/purpose combination
        await db('phone_verifications')
          .where({
            phone_number: formattedPhone,
            purpose,
            verified: false
          })
          .where('expires_at', '>', new Date())
          .increment('attempts', 1);

        await this.logSecurityEvent(verification?.user_id, 'phone_verification_failed', {
          phoneNumber: formattedPhone,
          purpose,
          ipAddress
        });

        return {
          success: false,
          error: 'Invalid or expired verification code'
        };
      }

      // Mark as verified
      await db('phone_verifications')
        .where({ id: verification.id })
        .update({
          verified: true,
          verified_at: new Date()
        });

      // Update user's phone verification status
      if (verification.user_id && purpose === 'registration') {
        await db('users')
          .where({ id: verification.user_id })
          .update({ 
            phone_verified: true,
            phone_verified_at: new Date()
          });
      }

      // Update 2FA phone verification if applicable
      if (verification.user_id && purpose === '2fa_setup') {
        await db('user_2fa')
          .where({ user_id: verification.user_id })
          .update({
            phone_number: formattedPhone,
            phone_verified: true
          });
      }

      await this.logSecurityEvent(verification.user_id, 'phone_verification_success', {
        phoneNumber: formattedPhone,
        purpose,
        ipAddress
      });

      logger.info('Phone verification successful', {
        userId: verification.user_id,
        phoneNumber: this.maskPhoneNumber(formattedPhone),
        purpose
      });

      return {
        success: true,
        userId: verification.user_id,
        phoneNumber: formattedPhone
      };

    } catch (error) {
      logger.error('Error verifying phone number', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(phoneNumber, purpose = 'registration', ipAddress = null) {
    try {
      const formattedPhone = parsePhoneNumber(phoneNumber).format('E.164');

      // Check if there's a recent unverified attempt
      const recentVerification = await db('phone_verifications')
        .where({
          phone_number: formattedPhone,
          purpose,
          verified: false
        })
        .where('created_at', '>', new Date(Date.now() - 2 * 60 * 1000)) // Within last 2 minutes
        .first();

      if (recentVerification) {
        throw new Error('Please wait before requesting a new code');
      }

      // Send new verification code
      return await this.sendVerificationCode(phoneNumber, purpose, null, ipAddress);

    } catch (error) {
      logger.error('Error resending verification code', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if phone number is already verified
   */
  async isPhoneVerified(phoneNumber, purpose = 'registration') {
    try {
      const formattedPhone = parsePhoneNumber(phoneNumber).format('E.164');
      
      const verification = await db('phone_verifications')
        .where({
          phone_number: formattedPhone,
          purpose,
          verified: true
        })
        .first();

      return !!verification;
    } catch (error) {
      logger.error('Error checking phone verification status', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(phoneNumber, purpose = 'registration') {
    try {
      const formattedPhone = parsePhoneNumber(phoneNumber).format('E.164');
      
      const verification = await db('phone_verifications')
        .where({
          phone_number: formattedPhone,
          purpose
        })
        .orderBy('created_at', 'desc')
        .first();

      if (!verification) {
        return {
          status: 'not_requested',
          verified: false
        };
      }

      const isExpired = new Date(verification.expires_at) < new Date();
      const attemptsExhausted = verification.attempts >= this.maxVerificationAttempts;

      return {
        status: verification.verified ? 'verified' : 
                isExpired ? 'expired' :
                attemptsExhausted ? 'max_attempts_reached' : 'pending',
        verified: verification.verified,
        attempts: verification.attempts,
        maxAttempts: this.maxVerificationAttempts,
        expiresAt: verification.expires_at,
        verifiedAt: verification.verified_at
      };

    } catch (error) {
      logger.error('Error getting verification status', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Rate limiting checks
   */
  async checkRateLimits(phoneNumber, ipAddress) {
    // Check daily SMS limit per phone number
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dailyCount = await db('phone_verifications')
      .where('phone_number', phoneNumber)
      .where('created_at', '>=', todayStart)
      .count('* as count')
      .first();

    if (dailyCount.count >= this.dailySMSLimit) {
      throw new Error('Daily SMS limit exceeded for this phone number');
    }

    // Check hourly IP limit
    if (ipAddress) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const hourlyCount = await db('phone_verifications')
        .where('ip_address', ipAddress)
        .where('created_at', '>=', hourAgo)
        .count('* as count')
        .first();

      if (hourlyCount.count >= this.hourlyIPLimit) {
        throw new Error('Too many verification requests from this IP address');
      }
    }
  }

  /**
   * Fraud detection patterns
   */
  async checkFraudPatterns(phoneNumber, ipAddress, userId) {
    const risks = [];

    // Check if phone number is associated with multiple users
    if (userId) {
      const phoneUsageCount = await db('users')
        .where('phone_number', phoneNumber)
        .whereNot('id', userId)
        .count('* as count')
        .first();

      if (phoneUsageCount.count > 0) {
        risks.push('phone_reuse');
      }
    }

    // Check geographical consistency
    if (ipAddress) {
      const geo = geoip.lookup(ipAddress);
      if (geo) {
        const phoneCountry = parsePhoneNumber(phoneNumber).country;
        if (phoneCountry && geo.country !== phoneCountry) {
          risks.push('geo_mismatch');
        }
      }
    }

    // Check for rapid-fire verifications from same IP
    if (ipAddress) {
      const recentCount = await db('phone_verifications')
        .where('ip_address', ipAddress)
        .where('created_at', '>', new Date(Date.now() - 10 * 60 * 1000))
        .count('* as count')
        .first();

      if (recentCount.count > 2) {
        risks.push('rapid_requests');
      }
    }

    // Log risks but don't block (could be legitimate)
    if (risks.length > 0) {
      await this.logSecurityEvent(userId, 'phone_verification_risk', {
        phoneNumber,
        ipAddress,
        risks
      });

      logger.warn('Phone verification risk detected', {
        userId,
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        risks
      });
    }
  }

  /**
   * Helper methods
   */
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
    const length = phoneNumber.length;
    return phoneNumber.substring(0, length - 6) + '***' + phoneNumber.substring(length - 3);
  }

  async sendSMS(phoneNumber, code, purpose) {
    let messageBody;
    
    switch (purpose) {
      case 'registration':
        messageBody = `Welcome to ${this.appName}! Your verification code is: ${code}`;
        break;
      case '2fa_setup':
        messageBody = `${this.appName} 2FA setup code: ${code}`;
        break;
      case 'phone_change':
        messageBody = `${this.appName} phone change verification: ${code}`;
        break;
      case 'login':
        messageBody = `${this.appName} login code: ${code}`;
        break;
      default:
        messageBody = `Your ${this.appName} verification code is: ${code}`;
    }

    messageBody += ` Valid for ${this.codeExpiryMinutes} minutes.`;

    return await twilioClient.messages.create({
      body: messageBody,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
  }

  async logSecurityEvent(userId, eventType, data) {
    try {
      await db('security_events').insert({
        user_id: userId,
        event_type: eventType,
        severity: this.getEventSeverity(eventType),
        event_data: JSON.stringify(data),
        ip_address: data.ipAddress,
        created_at: new Date()
      });
    } catch (error) {
      logger.error('Error logging security event', { error: error.message });
    }
  }

  getEventSeverity(eventType) {
    const severityMap = {
      'phone_verification_sent': 'low',
      'phone_verification_success': 'low',
      'phone_verification_failed': 'medium',
      'phone_verification_risk': 'medium'
    };
    return severityMap[eventType] || 'low';
  }

  /**
   * Cleanup expired verifications
   */
  async cleanupExpiredVerifications() {
    try {
      const result = await db('phone_verifications')
        .where('expires_at', '<', new Date())
        .where('verified', false)
        .del();

      logger.info(`Cleaned up ${result} expired phone verifications`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired verifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Admin methods
   */
  async getVerificationStats(startDate, endDate) {
    try {
      const stats = await db('phone_verifications')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as total_sent'),
          db.raw('COUNT(CASE WHEN verified = true THEN 1 END) as successful'),
          db.raw('COUNT(DISTINCT phone_number) as unique_phones'),
          db.raw('COUNT(DISTINCT ip_address) as unique_ips')
        )
        .whereBetween('created_at', [startDate, endDate])
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'desc');

      return stats;
    } catch (error) {
      logger.error('Error getting verification stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PhoneVerificationService();