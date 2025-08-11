const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../config/logger');

class BiometricAuthService {
  constructor() {
    this.supportedTypes = ['face_id', 'touch_id', 'fingerprint', 'voice'];
    this.maxFailureCount = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Register biometric authentication for device
   */
  async registerBiometric(userId, deviceId, biometricType, biometricData = null, settings = {}) {
    try {
      // Validate biometric type
      if (!this.supportedTypes.includes(biometricType)) {
        throw new Error(`Unsupported biometric type: ${biometricType}`);
      }

      // Verify device belongs to user
      const device = await db('user_devices')
        .where({ id: deviceId, user_id: userId })
        .first();

      if (!device) {
        throw new Error('Device not found or does not belong to user');
      }

      // Hash biometric template if provided (for server-side storage)
      let biometricHash = null;
      if (biometricData) {
        biometricHash = crypto.createHash('sha256')
          .update(JSON.stringify(biometricData))
          .digest('hex');
      }

      // Register biometric
      const biometricRecord = {
        user_id: userId,
        device_id: deviceId,
        biometric_type: biometricType,
        biometric_hash: biometricHash,
        is_enabled: true,
        settings: JSON.stringify(settings)
      };

      const [biometric] = await db('biometric_auth')
        .insert(biometricRecord)
        .onConflict(['user_id', 'device_id', 'biometric_type'])
        .merge({
          biometric_hash: biometricHash,
          is_enabled: true,
          settings: JSON.stringify(settings),
          updated_at: new Date()
        })
        .returning('*');

      await this.logSecurityEvent(userId, 'biometric_registered', 'low', {
        deviceId,
        biometricType,
        settings
      });

      logger.info('Biometric authentication registered', {
        userId,
        deviceId,
        biometricType
      });

      return {
        success: true,
        biometric: {
          id: biometric.id,
          type: biometric.biometric_type,
          deviceId: biometric.device_id,
          isEnabled: biometric.is_enabled,
          registeredAt: biometric.created_at
        }
      };

    } catch (error) {
      logger.error('Error registering biometric', {
        userId,
        deviceId,
        biometricType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Authenticate using biometric data
   */
  async authenticateBiometric(userId, deviceId, biometricType, biometricData, challenge = null) {
    try {
      // Get biometric record
      const biometric = await db('biometric_auth')
        .where({
          user_id: userId,
          device_id: deviceId,
          biometric_type: biometricType,
          is_enabled: true
        })
        .first();

      if (!biometric) {
        await this.logBiometricAttempt(userId, deviceId, biometricType, false, 'not_registered');
        return {
          success: false,
          error: 'Biometric authentication not registered for this device'
        };
      }

      // Check if biometric is locked due to failures
      if (biometric.failure_count >= this.maxFailureCount) {
        const lockExpiry = new Date(biometric.updated_at.getTime() + this.lockoutDuration);
        if (new Date() < lockExpiry) {
          await this.logBiometricAttempt(userId, deviceId, biometricType, false, 'locked');
          return {
            success: false,
            error: 'Biometric authentication locked due to multiple failures',
            lockedUntil: lockExpiry
          };
        } else {
          // Reset failure count after lockout period
          await this.resetFailureCount(biometric.id);
        }
      }

      // For client-side biometrics (Face ID, Touch ID), we rely on device verification
      let authenticated = false;
      let verificationMethod = 'client_side';

      if (biometricType === 'face_id' || biometricType === 'touch_id') {
        // Client-side biometrics - verify challenge response
        authenticated = await this.verifyClientSideBiometric(userId, deviceId, challenge);
        verificationMethod = 'client_side';
      } else if (biometric.biometric_hash && biometricData) {
        // Server-side verification for fingerprint or voice
        authenticated = await this.verifyServerSideBiometric(biometric, biometricData);
        verificationMethod = 'server_side';
      } else {
        throw new Error('No verification method available for this biometric type');
      }

      // Update statistics
      if (authenticated) {
        await this.recordSuccessfulAuth(biometric.id);
        await this.logBiometricAttempt(userId, deviceId, biometricType, true, verificationMethod);
        
        return {
          success: true,
          verificationMethod,
          biometricId: biometric.id
        };
      } else {
        await this.recordFailedAuth(biometric.id);
        await this.logBiometricAttempt(userId, deviceId, biometricType, false, verificationMethod);
        
        return {
          success: false,
          error: 'Biometric verification failed',
          remainingAttempts: Math.max(0, this.maxFailureCount - biometric.failure_count - 1)
        };
      }

    } catch (error) {
      logger.error('Error authenticating biometric', {
        userId,
        deviceId,
        biometricType,
        error: error.message
      });
      
      await this.logBiometricAttempt(userId, deviceId, biometricType, false, 'error');
      
      return {
        success: false,
        error: 'Biometric authentication service error'
      };
    }
  }

  /**
   * Generate challenge for client-side biometric verification
   */
  async generateBiometricChallenge(userId, deviceId) {
    try {
      // Generate cryptographic challenge
      const challenge = crypto.randomBytes(32).toString('hex');
      const timestamp = Date.now();
      
      // Store challenge with expiry
      const challengeData = {
        user_id: userId,
        device_id: deviceId,
        challenge,
        timestamp,
        expires_at: new Date(timestamp + 5 * 60 * 1000) // 5 minutes
      };

      // Store in Redis or database with TTL
      // For now, we'll use a simple in-memory store or database
      await this.storeBiometricChallenge(challengeData);

      return {
        challenge,
        expiresAt: challengeData.expires_at
      };

    } catch (error) {
      logger.error('Error generating biometric challenge', {
        userId,
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId, deviceId, biometricType) {
    try {
      const result = await db('biometric_auth')
        .where({
          user_id: userId,
          device_id: deviceId,
          biometric_type: biometricType
        })
        .update({
          is_enabled: false,
          updated_at: new Date()
        });

      if (result === 0) {
        throw new Error('Biometric authentication not found');
      }

      await this.logSecurityEvent(userId, 'biometric_disabled', 'low', {
        deviceId,
        biometricType
      });

      logger.info('Biometric authentication disabled', {
        userId,
        deviceId,
        biometricType
      });

      return { success: true };

    } catch (error) {
      logger.error('Error disabling biometric', {
        userId,
        deviceId,
        biometricType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's biometric authentication settings
   */
  async getBiometricSettings(userId, deviceId = null) {
    try {
      let query = db('biometric_auth')
        .select(
          'biometric_auth.*',
          'user_devices.device_name',
          'user_devices.device_type'
        )
        .join('user_devices', 'user_devices.id', 'biometric_auth.device_id')
        .where('biometric_auth.user_id', userId);

      if (deviceId) {
        query = query.where('biometric_auth.device_id', deviceId);
      }

      const biometrics = await query;

      return biometrics.map(bio => ({
        id: bio.id,
        deviceId: bio.device_id,
        deviceName: bio.device_name,
        deviceType: bio.device_type,
        biometricType: bio.biometric_type,
        isEnabled: bio.is_enabled,
        lastUsed: bio.last_used_at,
        successCount: bio.success_count,
        failureCount: bio.failure_count,
        settings: bio.settings ? JSON.parse(bio.settings) : {},
        registeredAt: bio.created_at
      }));

    } catch (error) {
      logger.error('Error getting biometric settings', {
        userId,
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check device biometric capabilities
   */
  async checkDeviceCapabilities(deviceId, userAgent, deviceInfo = {}) {
    try {
      const capabilities = {
        faceId: false,
        touchId: false,
        fingerprint: false,
        voice: false
      };

      // Analyze device capabilities based on user agent and device info
      const ua = userAgent?.toLowerCase() || '';
      
      // iOS devices
      if (ua.includes('iphone') || ua.includes('ipad')) {
        capabilities.faceId = deviceInfo.supportsFaceID || this.detectiOSFaceID(ua);
        capabilities.touchId = deviceInfo.supportsTouchID || this.detectiOSTouchID(ua);
      }
      
      // Android devices
      if (ua.includes('android')) {
        capabilities.fingerprint = deviceInfo.supportsFingerprint || true; // Most Android devices
        capabilities.faceId = deviceInfo.supportsFaceUnlock || this.detectAndroidFaceUnlock(ua);
      }

      // Desktop browsers
      if (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari')) {
        capabilities.fingerprint = deviceInfo.supportsWebAuthn || this.detectWebAuthnSupport(ua);
      }

      // Voice is available on most devices with microphone
      capabilities.voice = deviceInfo.hasMicrophone !== false;

      // Store device capabilities
      await db('user_devices')
        .where({ id: deviceId })
        .update({
          fingerprint_data: JSON.stringify({
            ...JSON.parse(await db('user_devices').where({ id: deviceId }).first().then(d => d.fingerprint_data || '{}')),
            biometricCapabilities: capabilities
          }),
          updated_at: new Date()
        });

      return capabilities;

    } catch (error) {
      logger.error('Error checking device capabilities', {
        deviceId,
        error: error.message
      });
      return {
        faceId: false,
        touchId: false,
        fingerprint: false,
        voice: false
      };
    }
  }

  /**
   * Helper methods
   */
  async verifyClientSideBiometric(userId, deviceId, challenge) {
    try {
      // Verify the challenge response for client-side biometrics
      // This would typically involve verifying a cryptographic signature
      // from the client that proves biometric authentication occurred
      
      const storedChallenge = await this.getBiometricChallenge(userId, deviceId);
      
      if (!storedChallenge || storedChallenge.expires_at < new Date()) {
        return false;
      }

      // Verify challenge response (simplified - in practice would verify signature)
      const expectedResponse = crypto.createHmac('sha256', process.env.BIOMETRIC_SECRET || 'biometric-key')
        .update(storedChallenge.challenge)
        .digest('hex');

      return challenge === expectedResponse;

    } catch (error) {
      logger.error('Error verifying client-side biometric', { error: error.message });
      return false;
    }
  }

  async verifyServerSideBiometric(biometric, biometricData) {
    try {
      // Hash the provided biometric data
      const providedHash = crypto.createHash('sha256')
        .update(JSON.stringify(biometricData))
        .digest('hex');

      // Compare with stored hash
      return providedHash === biometric.biometric_hash;

    } catch (error) {
      logger.error('Error verifying server-side biometric', { error: error.message });
      return false;
    }
  }

  async recordSuccessfulAuth(biometricId) {
    await db('biometric_auth')
      .where({ id: biometricId })
      .update({
        success_count: db.raw('success_count + 1'),
        failure_count: 0, // Reset failures on success
        last_used_at: new Date(),
        updated_at: new Date()
      });
  }

  async recordFailedAuth(biometricId) {
    await db('biometric_auth')
      .where({ id: biometricId })
      .update({
        failure_count: db.raw('failure_count + 1'),
        updated_at: new Date()
      });
  }

  async resetFailureCount(biometricId) {
    await db('biometric_auth')
      .where({ id: biometricId })
      .update({
        failure_count: 0,
        updated_at: new Date()
      });
  }

  async logBiometricAttempt(userId, deviceId, biometricType, success, method) {
    try {
      await db('security_events').insert({
        user_id: userId,
        event_type: success ? 'biometric_auth_success' : 'biometric_auth_failure',
        severity: success ? 'low' : 'medium',
        event_data: JSON.stringify({
          deviceId,
          biometricType,
          method,
          success
        })
      });
    } catch (error) {
      logger.error('Error logging biometric attempt', { error: error.message });
    }
  }

  async storeBiometricChallenge(challengeData) {
    // In production, this should use Redis with TTL
    // For now, store in database with cleanup job
    try {
      await db('biometric_challenges').insert(challengeData)
        .onConflict(['user_id', 'device_id'])
        .merge(challengeData);
    } catch (error) {
      logger.error('Error storing biometric challenge', { error: error.message });
    }
  }

  async getBiometricChallenge(userId, deviceId) {
    try {
      return await db('biometric_challenges')
        .where({ user_id: userId, device_id: deviceId })
        .where('expires_at', '>', new Date())
        .first();
    } catch (error) {
      logger.error('Error getting biometric challenge', { error: error.message });
      return null;
    }
  }

  // Device capability detection helpers
  detectiOSFaceID(ua) {
    // Face ID available on iPhone X and later, iPad Pro (3rd gen) and later
    const iPhoneMatch = ua.match(/iphone os (\d+)_/i);
    if (iPhoneMatch && parseInt(iPhoneMatch[1]) >= 11) return true;
    
    const iPadMatch = ua.match(/os (\d+)_/i);
    if (iPadMatch && parseInt(iPadMatch[1]) >= 12) return true;
    
    return false;
  }

  detectiOSTouchID(ua) {
    // Touch ID available on older devices
    return ua.includes('iphone') || ua.includes('ipad');
  }

  detectAndroidFaceUnlock(ua) {
    // Many Android devices support face unlock
    const versionMatch = ua.match(/android (\d+)/i);
    return versionMatch && parseInt(versionMatch[1]) >= 9;
  }

  detectWebAuthnSupport(ua) {
    // WebAuthn support for desktop browsers
    if (ua.includes('chrome')) {
      const versionMatch = ua.match(/chrome\/(\d+)/i);
      return versionMatch && parseInt(versionMatch[1]) >= 67;
    }
    if (ua.includes('firefox')) {
      const versionMatch = ua.match(/firefox\/(\d+)/i);
      return versionMatch && parseInt(versionMatch[1]) >= 60;
    }
    if (ua.includes('safari')) {
      const versionMatch = ua.match(/version\/(\d+)/i);
      return versionMatch && parseInt(versionMatch[1]) >= 14;
    }
    return false;
  }

  async logSecurityEvent(userId, eventType, severity, data) {
    try {
      await db('security_events').insert({
        user_id: userId,
        event_type: eventType,
        severity,
        event_data: JSON.stringify(data),
        ip_address: data.ipAddress,
        user_agent: data.userAgent
      });
    } catch (error) {
      logger.error('Error logging security event', { error: error.message });
    }
  }

  /**
   * Cleanup expired challenges
   */
  async cleanupExpiredChallenges() {
    try {
      const result = await db('biometric_challenges')
        .where('expires_at', '<', new Date())
        .del();

      logger.info(`Cleaned up ${result} expired biometric challenges`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired challenges', { error: error.message });
      throw error;
    }
  }

  /**
   * Get biometric authentication statistics
   */
  async getBiometricStats(userId = null, startDate = null, endDate = null) {
    try {
      let query = db('security_events')
        .whereIn('event_type', ['biometric_auth_success', 'biometric_auth_failure'])
        .select(
          'event_type',
          db.raw('JSON_EXTRACT(event_data, "$.biometricType") as biometric_type'),
          db.raw('COUNT(*) as count')
        )
        .groupBy('event_type', 'biometric_type');

      if (userId) {
        query = query.where('user_id', userId);
      }

      if (startDate && endDate) {
        query = query.whereBetween('created_at', [startDate, endDate]);
      }

      return await query;
    } catch (error) {
      logger.error('Error getting biometric stats', { error: error.message });
      throw error;
    }
  }
}

module.exports = new BiometricAuthService();