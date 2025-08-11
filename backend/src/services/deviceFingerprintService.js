const crypto = require('crypto');
const DeviceDetector = require('device-detector-js');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const db = require('../config/database');
const logger = require('../config/logger');

class DeviceFingerprintService {
  constructor() {
    this.deviceDetector = new DeviceDetector();
    this.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5;
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_HOURS) || 24;
  }

  /**
   * Generate device fingerprint from request
   */
  async generateFingerprint(req, additionalData = {}) {
    try {
      const userAgent = req.get('User-Agent') || '';
      const acceptLanguage = req.get('Accept-Language') || '';
      const acceptEncoding = req.get('Accept-Encoding') || '';
      const acceptCharset = req.get('Accept-Charset') || '';
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Parse user agent
      const uaParser = new UAParser(userAgent);
      const deviceInfo = this.deviceDetector.parse(userAgent);

      // Create fingerprint components
      const fingerprintData = {
        userAgent,
        acceptLanguage,
        acceptEncoding,
        acceptCharset,
        ipAddress,
        timezone: additionalData.timezone,
        screenResolution: additionalData.screenResolution,
        colorDepth: additionalData.colorDepth,
        platform: additionalData.platform,
        cookiesEnabled: additionalData.cookiesEnabled,
        doNotTrack: additionalData.doNotTrack,
        // Parsed data
        browser: uaParser.getBrowser(),
        engine: uaParser.getEngine(),
        os: uaParser.getOS(),
        device: uaParser.getDevice(),
        deviceInfo: {
          type: deviceInfo.device?.type || 'unknown',
          brand: deviceInfo.device?.brand || 'unknown',
          model: deviceInfo.device?.model || 'unknown'
        }
      };

      // Generate device ID from fingerprint
      const fingerprintString = JSON.stringify({
        userAgent,
        platform: additionalData.platform,
        screenResolution: additionalData.screenResolution,
        timezone: additionalData.timezone,
        browser: fingerprintData.browser.name,
        os: fingerprintData.os.name
      });

      const deviceId = crypto
        .createHash('sha256')
        .update(fingerprintString)
        .digest('hex')
        .substring(0, 32);

      // Get location from IP
      const location = geoip.lookup(ipAddress);

      return {
        deviceId,
        fingerprintData,
        location,
        deviceType: this.determineDeviceType(fingerprintData),
        trustScore: this.calculateInitialTrustScore(fingerprintData, location)
      };

    } catch (error) {
      logger.error('Error generating device fingerprint', {
        error: error.message,
        ip: req.ip
      });
      throw error;
    }
  }

  /**
   * Register or update device for user
   */
  async registerDevice(userId, deviceFingerprint, ipAddress, location = null) {
    try {
      const { deviceId, fingerprintData, deviceType, trustScore } = deviceFingerprint;

      // Check if device already exists
      const existingDevice = await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId
        })
        .first();

      if (existingDevice) {
        // Update existing device
        await db('user_devices')
          .where({ id: existingDevice.id })
          .update({
            fingerprint_data: JSON.stringify(fingerprintData),
            last_seen_at: new Date(),
            trust_score: Math.min(existingDevice.trust_score + 5, 100),
            updated_at: new Date()
          });

        return existingDevice;
      } else {
        // Create new device
        const deviceData = {
          user_id: userId,
          device_id: deviceId,
          fingerprint_data: JSON.stringify(fingerprintData),
          device_type: deviceType,
          os_name: fingerprintData.os?.name,
          os_version: fingerprintData.os?.version,
          browser_name: fingerprintData.browser?.name,
          browser_version: fingerprintData.browser?.version,
          is_trusted: false,
          trust_score: trustScore,
          first_seen_at: new Date(),
          last_seen_at: new Date()
        };

        const [deviceRecord] = await db('user_devices')
          .insert(deviceData)
          .returning('*');

        // Log new device detection
        await this.logSecurityEvent(userId, 'new_device_detected', {
          deviceId,
          deviceType,
          location,
          ipAddress,
          fingerprintData
        });

        logger.info('New device registered', {
          userId,
          deviceId,
          deviceType,
          location: location?.city || 'unknown'
        });

        return deviceRecord;
      }

    } catch (error) {
      logger.error('Error registering device', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create enhanced session
   */
  async createSession(userId, deviceId, sessionToken, ipAddress, requires2FA = false) {
    try {
      // Check concurrent session limits
      await this.enforceSessionLimits(userId);

      // Get location data
      const location = geoip.lookup(ipAddress);

      const sessionData = {
        user_id: userId,
        device_id: deviceId,
        session_token: sessionToken,
        ip_address: ipAddress,
        location_data: location ? JSON.stringify(location) : null,
        requires_2fa: requires2FA,
        2fa_verified: !requires2FA,
        last_activity: new Date(),
        expires_at: new Date(Date.now() + this.sessionTimeout * 60 * 60 * 1000)
      };

      const [session] = await db('enhanced_sessions')
        .insert(sessionData)
        .returning('*');

      logger.info('Enhanced session created', {
        userId,
        deviceId,
        sessionId: session.id,
        location: location?.city || 'unknown',
        requires2FA
      });

      return session;

    } catch (error) {
      logger.error('Error creating enhanced session', {
        userId,
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate and update session
   */
  async validateSession(sessionToken, ipAddress = null) {
    try {
      const session = await db('enhanced_sessions')
        .select('enhanced_sessions.*', 'users.id as user_id', 'users.email', 'users.is_active')
        .join('users', 'users.id', 'enhanced_sessions.user_id')
        .where({
          'enhanced_sessions.session_token': sessionToken,
          'enhanced_sessions.is_active': true,
          'users.is_active': true
        })
        .where('enhanced_sessions.expires_at', '>', new Date())
        .first();

      if (!session) {
        return null;
      }

      // Check for IP change (potential session hijacking)
      if (ipAddress && session.ip_address !== ipAddress) {
        await this.logSecurityEvent(session.user_id, 'session_ip_change', {
          sessionId: session.id,
          oldIp: session.ip_address,
          newIp: ipAddress,
          deviceId: session.device_id
        });

        // Optionally invalidate session on IP change
        if (process.env.INVALIDATE_ON_IP_CHANGE === 'true') {
          await this.terminateSession(sessionToken, 'security');
          return null;
        }
      }

      // Update session activity
      await db('enhanced_sessions')
        .where({ id: session.id })
        .update({ 
          last_activity: new Date(),
          ip_address: ipAddress || session.ip_address
        });

      return session;

    } catch (error) {
      logger.error('Error validating session', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionToken, reason = 'logout') {
    try {
      const session = await db('enhanced_sessions')
        .where({ session_token: sessionToken })
        .first();

      if (session) {
        await db('enhanced_sessions')
          .where({ session_token: sessionToken })
          .update({
            is_active: false,
            termination_reason: reason,
            updated_at: new Date()
          });

        logger.info('Session terminated', {
          userId: session.user_id,
          sessionId: session.id,
          reason
        });
      }

      return true;
    } catch (error) {
      logger.error('Error terminating session', {
        sessionToken: sessionToken?.substring(0, 8),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId) {
    try {
      const sessions = await db('enhanced_sessions')
        .select(
          'enhanced_sessions.*',
          'user_devices.device_name',
          'user_devices.device_type',
          'user_devices.os_name',
          'user_devices.browser_name',
          'user_devices.is_trusted'
        )
        .join('user_devices', 'user_devices.id', 'enhanced_sessions.device_id')
        .where({
          'enhanced_sessions.user_id': userId,
          'enhanced_sessions.is_active': true
        })
        .where('enhanced_sessions.expires_at', '>', new Date())
        .orderBy('enhanced_sessions.last_activity', 'desc');

      return sessions.map(session => ({
        id: session.id,
        deviceName: session.device_name || `${session.os_name} ${session.browser_name}`,
        deviceType: session.device_type,
        location: session.location_data ? JSON.parse(session.location_data) : null,
        lastActivity: session.last_activity,
        ipAddress: this.maskIP(session.ip_address),
        isCurrent: false, // Will be set by caller
        isTrusted: session.is_trusted,
        requires2FA: session.requires_2fa,
        twoFAVerified: session['2fa_verified']
      }));

    } catch (error) {
      logger.error('Error getting user sessions', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Terminate all sessions for user
   */
  async terminateAllSessions(userId, except = null, reason = 'security') {
    try {
      let query = db('enhanced_sessions')
        .where({
          user_id: userId,
          is_active: true
        });

      if (except) {
        query = query.whereNot('session_token', except);
      }

      const terminatedCount = await query.update({
        is_active: false,
        termination_reason: reason,
        updated_at: new Date()
      });

      logger.info('All sessions terminated', {
        userId,
        terminatedCount,
        reason
      });

      return terminatedCount;
    } catch (error) {
      logger.error('Error terminating all sessions', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Trust/untrust device
   */
  async setDeviceTrust(userId, deviceId, trusted) {
    try {
      await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId
        })
        .update({
          is_trusted: trusted,
          trust_score: trusted ? 100 : 25,
          updated_at: new Date()
        });

      await this.logSecurityEvent(userId, trusted ? 'device_trusted' : 'device_untrusted', {
        deviceId
      });

      logger.info(`Device ${trusted ? 'trusted' : 'untrusted'}`, {
        userId,
        deviceId
      });

      return true;
    } catch (error) {
      logger.error('Error setting device trust', {
        userId,
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(userId, deviceId) {
    try {
      const device = await db('user_devices')
        .where({
          user_id: userId,
          device_id: deviceId
        })
        .first();

      if (!device) {
        return null;
      }

      const fingerprintData = JSON.parse(device.fingerprint_data);
      
      return {
        id: device.id,
        deviceId: device.device_id,
        deviceName: device.device_name,
        deviceType: device.device_type,
        osName: device.os_name,
        osVersion: device.os_version,
        browserName: device.browser_name,
        browserVersion: device.browser_version,
        isTrusted: device.is_trusted,
        trustScore: device.trust_score,
        firstSeen: device.first_seen_at,
        lastSeen: device.last_seen_at,
        fingerprintData
      };

    } catch (error) {
      logger.error('Error getting device info', {
        userId,
        deviceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  determineDeviceType(fingerprintData) {
    const deviceType = fingerprintData.device?.type || 
                      fingerprintData.deviceInfo?.type ||
                      'unknown';

    switch (deviceType.toLowerCase()) {
      case 'smartphone':
      case 'mobile':
        return 'mobile';
      case 'tablet':
        return 'tablet';
      case 'desktop':
      case 'unknown':
      default:
        return 'desktop';
    }
  }

  calculateInitialTrustScore(fingerprintData, location) {
    let score = 30; // Base score

    // Browser and OS factors
    if (fingerprintData.browser?.name) score += 10;
    if (fingerprintData.os?.name) score += 10;
    
    // Location factor
    if (location) score += 5;

    // Additional fingerprint data
    if (fingerprintData.timezone) score += 5;
    if (fingerprintData.screenResolution) score += 5;

    return Math.min(score, 75); // Max initial score of 75
  }

  async enforceSessionLimits(userId) {
    const activeSessions = await db('enhanced_sessions')
      .where({
        user_id: userId,
        is_active: true
      })
      .where('expires_at', '>', new Date())
      .count('* as count')
      .first();

    if (activeSessions.count >= this.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = await db('enhanced_sessions')
        .where({
          user_id: userId,
          is_active: true
        })
        .orderBy('last_activity', 'asc')
        .first();

      if (oldestSession) {
        await this.terminateSession(oldestSession.session_token, 'limit_exceeded');
      }
    }
  }

  maskIP(ip) {
    if (!ip) return 'unknown';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.**`;
    }
    return ip.substring(0, ip.length - 6) + '***';
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
      'new_device_detected': 'medium',
      'session_ip_change': 'high',
      'device_trusted': 'low',
      'device_untrusted': 'low'
    };
    return severityMap[eventType] || 'low';
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const result = await db('enhanced_sessions')
        .where('expires_at', '<', new Date())
        .where('is_active', true)
        .update({
          is_active: false,
          termination_reason: 'expired',
          updated_at: new Date()
        });

      logger.info(`Cleaned up ${result} expired sessions`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error: error.message });
      throw error;
    }
  }
}

module.exports = new DeviceFingerprintService();