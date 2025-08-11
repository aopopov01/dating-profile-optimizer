const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../config/logger');

class SuspiciousActivityService {
  constructor() {
    this.thresholds = {
      loginAttempts: {
        maxPerHour: 5,
        maxPerDay: 15,
        lockoutDuration: 30 * 60 * 1000 // 30 minutes
      },
      locationChange: {
        maxDistanceKm: 1000,
        timeWindowHours: 1
      },
      deviceChange: {
        maxNewDevicesPerDay: 3,
        suspiciousTimeWindow: 24 * 60 * 60 * 1000
      },
      bruteForce: {
        maxAttemptsPerIP: 10,
        timeWindow: 60 * 60 * 1000, // 1 hour
        blockDuration: 60 * 60 * 1000 // 1 hour
      },
      accountTakeover: {
        riskFactors: ['new_device', 'new_location', 'password_change', 'email_change', '2fa_disable'],
        highRiskThreshold: 3
      }
    };
  }

  /**
   * Analyze login attempt for suspicious patterns
   */
  async analyzeLoginAttempt(userId, ipAddress, userAgent, success, additionalData = {}) {
    try {
      const risks = [];
      const currentTime = new Date();
      
      // Get user's login history
      const recentAttempts = await this.getRecentLoginAttempts(userId, ipAddress, 24 * 60 * 60 * 1000);
      
      // 1. Check for excessive failed login attempts
      const failedAttempts = recentAttempts.filter(attempt => !attempt.successful);
      if (failedAttempts.length >= this.thresholds.loginAttempts.maxPerHour) {
        risks.push({
          type: 'excessive_failed_attempts',
          severity: 'high',
          data: { attemptCount: failedAttempts.length }
        });
      }

      // 2. Check for location anomalies
      const locationRisk = await this.checkLocationAnomaly(userId, ipAddress);
      if (locationRisk) {
        risks.push(locationRisk);
      }

      // 3. Check for device/browser changes
      const deviceRisk = await this.checkDeviceAnomaly(userId, userAgent, additionalData.deviceFingerprint);
      if (deviceRisk) {
        risks.push(deviceRisk);
      }

      // 4. Check for timing patterns (velocity attacks)
      const timingRisk = this.checkTimingPatterns(recentAttempts);
      if (timingRisk) {
        risks.push(timingRisk);
      }

      // 5. Check IP reputation
      const ipRisk = await this.checkIPReputation(ipAddress);
      if (ipRisk) {
        risks.push(ipRisk);
      }

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(risks);
      const riskLevel = this.categorizeRisk(riskScore);

      // Log the login attempt
      await this.logLoginAttempt(userId, ipAddress, userAgent, success, {
        risks,
        riskScore,
        riskLevel,
        ...additionalData
      });

      // Take action based on risk level
      const action = await this.determineAction(userId, riskLevel, risks, success);

      logger.info('Login attempt analyzed', {
        userId,
        success,
        riskScore,
        riskLevel,
        risksCount: risks.length,
        action: action.type
      });

      return {
        riskScore,
        riskLevel,
        risks,
        action,
        requiresAdditionalVerification: riskLevel === 'high' && success
      };

    } catch (error) {
      logger.error('Error analyzing login attempt', {
        userId,
        error: error.message
      });
      return {
        riskScore: 0,
        riskLevel: 'low',
        risks: [],
        action: { type: 'allow' },
        requiresAdditionalVerification: false
      };
    }
  }

  /**
   * Check for brute force attacks by IP
   */
  async checkBruteForceByIP(ipAddress) {
    try {
      const timeWindow = new Date(Date.now() - this.thresholds.bruteForce.timeWindow);
      
      const attempts = await db('login_attempts')
        .where('ip_address', ipAddress)
        .where('attempted_at', '>', timeWindow)
        .where('successful', false)
        .count('* as count')
        .first();

      const attemptCount = parseInt(attempts.count);
      
      if (attemptCount >= this.thresholds.bruteForce.maxAttemptsPerIP) {
        // Check if IP is already blocked
        const existing = await db('security_events')
          .where({
            event_type: 'ip_blocked_brute_force',
            ip_address: ipAddress
          })
          .where('created_at', '>', new Date(Date.now() - this.thresholds.bruteForce.blockDuration))
          .first();

        if (!existing) {
          await this.blockIPAddress(ipAddress, 'brute_force', attemptCount);
        }

        return {
          blocked: true,
          attemptCount,
          reason: 'brute_force'
        };
      }

      return { blocked: false, attemptCount };

    } catch (error) {
      logger.error('Error checking brute force', { ipAddress, error: error.message });
      return { blocked: false, attemptCount: 0 };
    }
  }

  /**
   * Detect account takeover patterns
   */
  async detectAccountTakeover(userId, eventType, eventData) {
    try {
      const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
      
      // Get recent security events for this user
      const recentEvents = await db('security_events')
        .where('user_id', userId)
        .where('created_at', '>', timeWindow)
        .orderBy('created_at', 'desc');

      // Look for high-risk event combinations
      const riskFactors = [];
      
      // Check for new device + password change
      const hasNewDevice = recentEvents.some(e => e.event_type === 'new_device_detected');
      const hasPasswordChange = recentEvents.some(e => e.event_type === 'password_changed');
      const hasEmailChange = recentEvents.some(e => e.event_type === 'email_changed');
      const has2FADisable = recentEvents.some(e => e.event_type === '2fa_disabled');
      const hasLocationChange = recentEvents.some(e => e.event_type === 'suspicious_location');

      if (hasNewDevice) riskFactors.push('new_device');
      if (hasPasswordChange) riskFactors.push('password_change');
      if (hasEmailChange) riskFactors.push('email_change');
      if (has2FADisable) riskFactors.push('2fa_disable');
      if (hasLocationChange) riskFactors.push('location_change');

      const riskScore = riskFactors.length;
      
      if (riskScore >= this.thresholds.accountTakeover.highRiskThreshold) {
        await this.logSecurityEvent(userId, 'potential_account_takeover', 'critical', {
          riskFactors,
          riskScore,
          triggerEvent: eventType,
          recentEventsCount: recentEvents.length,
          ...eventData
        });

        // Automatically lock account for manual review
        await this.lockAccount(userId, 'potential_takeover', riskFactors);

        logger.warn('Potential account takeover detected', {
          userId,
          riskFactors,
          riskScore
        });

        return {
          detected: true,
          riskScore,
          riskFactors,
          action: 'account_locked'
        };
      }

      return {
        detected: false,
        riskScore,
        riskFactors
      };

    } catch (error) {
      logger.error('Error detecting account takeover', {
        userId,
        error: error.message
      });
      return { detected: false, riskScore: 0, riskFactors: [] };
    }
  }

  /**
   * Monitor user behavior patterns
   */
  async monitorBehaviorPatterns(userId, action, metadata = {}) {
    try {
      const patterns = await this.analyzeBehaviorPatterns(userId, action, metadata);
      
      // Check for anomalous patterns
      const anomalies = [];

      // Time-based anomalies (unusual login times)
      if (patterns.timeAnomaly) {
        anomalies.push({
          type: 'unusual_time',
          severity: 'medium',
          data: patterns.timeAnomaly
        });
      }

      // Frequency anomalies (too many actions in short time)
      if (patterns.frequencyAnomaly) {
        anomalies.push({
          type: 'unusual_frequency',
          severity: 'medium',
          data: patterns.frequencyAnomaly
        });
      }

      // Geographic anomalies
      if (patterns.geoAnomaly) {
        anomalies.push({
          type: 'geographic_anomaly',
          severity: 'high',
          data: patterns.geoAnomaly
        });
      }

      if (anomalies.length > 0) {
        await this.logSecurityEvent(userId, 'behavior_anomaly', 'medium', {
          action,
          anomalies,
          metadata
        });
      }

      return {
        anomalies,
        patterns,
        riskLevel: anomalies.length > 2 ? 'high' : anomalies.length > 0 ? 'medium' : 'low'
      };

    } catch (error) {
      logger.error('Error monitoring behavior patterns', {
        userId,
        action,
        error: error.message
      });
      return { anomalies: [], patterns: {}, riskLevel: 'low' };
    }
  }

  /**
   * Real-time threat monitoring
   */
  async monitorRealTimeThreats() {
    try {
      const threats = [];
      const timeWindow = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

      // 1. Detect distributed attacks
      const distributedAttacks = await this.detectDistributedAttacks(timeWindow);
      threats.push(...distributedAttacks);

      // 2. Detect credential stuffing
      const credentialStuffing = await this.detectCredentialStuffing(timeWindow);
      threats.push(...credentialStuffing);

      // 3. Detect session hijacking
      const sessionHijacking = await this.detectSessionHijacking(timeWindow);
      threats.push(...sessionHijacking);

      // Process threats
      for (const threat of threats) {
        await this.processThreat(threat);
      }

      return threats;

    } catch (error) {
      logger.error('Error monitoring real-time threats', { error: error.message });
      return [];
    }
  }

  /**
   * Helper methods
   */
  async getRecentLoginAttempts(userId, ipAddress, timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    
    return await db('login_attempts')
      .where(function() {
        this.where('email', function() {
          this.select('email').from('users').where('id', userId);
        }).orWhere('ip_address', ipAddress);
      })
      .where('attempted_at', '>', since)
      .orderBy('attempted_at', 'desc');
  }

  async checkLocationAnomaly(userId, ipAddress) {
    try {
      const currentLocation = geoip.lookup(ipAddress);
      if (!currentLocation) return null;

      // Get user's recent successful logins
      const recentLogins = await db('login_attempts')
        .join('users', 'users.email', 'login_attempts.email')
        .where('users.id', userId)
        .where('login_attempts.successful', true)
        .where('login_attempts.attempted_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .orderBy('attempted_at', 'desc')
        .limit(10);

      if (recentLogins.length === 0) return null;

      // Check for significant location changes
      for (const login of recentLogins) {
        const loginLocation = geoip.lookup(login.ip_address);
        if (!loginLocation) continue;

        const distance = this.calculateDistance(
          currentLocation.ll[0], currentLocation.ll[1],
          loginLocation.ll[0], loginLocation.ll[1]
        );

        const timeDiff = new Date() - new Date(login.attempted_at);
        const hours = timeDiff / (1000 * 60 * 60);

        // Impossible travel: distance too far for time elapsed
        if (distance > this.thresholds.locationChange.maxDistanceKm && 
            hours < this.thresholds.locationChange.timeWindowHours) {
          return {
            type: 'impossible_travel',
            severity: 'high',
            data: {
              distance,
              timeHours: hours,
              currentLocation: currentLocation.city,
              previousLocation: loginLocation.city
            }
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking location anomaly', { error: error.message });
      return null;
    }
  }

  async checkDeviceAnomaly(userId, userAgent, deviceFingerprint) {
    try {
      // Check for new device
      const recentDevices = await db('user_devices')
        .where('user_id', userId)
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000));

      if (recentDevices.length > this.thresholds.deviceChange.maxNewDevicesPerDay) {
        return {
          type: 'too_many_new_devices',
          severity: 'high',
          data: { deviceCount: recentDevices.length }
        };
      }

      // Check for suspicious device characteristics
      if (deviceFingerprint) {
        const ua = new UAParser(userAgent);
        const parsed = ua.getResult();

        // Check for headless browser indicators
        if (this.isHeadlessBrowser(parsed, deviceFingerprint)) {
          return {
            type: 'headless_browser',
            severity: 'high',
            data: { userAgent, browserName: parsed.browser.name }
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Error checking device anomaly', { error: error.message });
      return null;
    }
  }

  checkTimingPatterns(attempts) {
    if (attempts.length < 3) return null;

    // Check for mechanical timing (bot-like behavior)
    const intervals = [];
    for (let i = 1; i < attempts.length; i++) {
      const interval = new Date(attempts[i-1].attempted_at) - new Date(attempts[i].attempted_at);
      intervals.push(interval);
    }

    // Look for suspiciously regular intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // If intervals are too regular, it might be automated
    if (stdDev < avgInterval * 0.1 && avgInterval < 5000) { // Less than 5 seconds with low variance
      return {
        type: 'mechanical_timing',
        severity: 'medium',
        data: { avgInterval, stdDev, attemptCount: attempts.length }
      };
    }

    return null;
  }

  async checkIPReputation(ipAddress) {
    try {
      // Check against known malicious IPs
      const maliciousIP = await db('security_events')
        .where('ip_address', ipAddress)
        .where('event_type', 'malicious_ip')
        .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .first();

      if (maliciousIP) {
        return {
          type: 'known_malicious_ip',
          severity: 'critical',
          data: { lastSeen: maliciousIP.created_at }
        };
      }

      // Check for high-frequency usage
      const recentUsage = await db('login_attempts')
        .where('ip_address', ipAddress)
        .where('attempted_at', '>', new Date(Date.now() - 60 * 60 * 1000))
        .count('* as count')
        .first();

      if (parseInt(recentUsage.count) > 50) {
        return {
          type: 'high_frequency_ip',
          severity: 'medium',
          data: { attemptCount: recentUsage.count }
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking IP reputation', { error: error.message });
      return null;
    }
  }

  calculateRiskScore(risks) {
    const severityWeights = {
      'low': 1,
      'medium': 3,
      'high': 5,
      'critical': 10
    };

    return risks.reduce((total, risk) => {
      return total + (severityWeights[risk.severity] || 1);
    }, 0);
  }

  categorizeRisk(score) {
    if (score >= 15) return 'critical';
    if (score >= 8) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  async determineAction(userId, riskLevel, risks, loginSuccess) {
    switch (riskLevel) {
      case 'critical':
        await this.lockAccount(userId, 'high_risk_activity', risks);
        return { type: 'account_locked', message: 'Account locked due to suspicious activity' };
      
      case 'high':
        if (loginSuccess) {
          return { type: 'require_2fa', message: 'Additional verification required' };
        } else {
          return { type: 'delay_response', delay: 5000, message: 'Login attempt delayed' };
        }
      
      case 'medium':
        return { type: 'enhanced_monitoring', message: 'Activity will be monitored' };
      
      default:
        return { type: 'allow', message: 'Login allowed' };
    }
  }

  async lockAccount(userId, reason, additionalData = {}) {
    try {
      await db('account_lockouts').insert({
        user_id: userId,
        lockout_type: 'suspicious_activity',
        reason,
        lockout_data: JSON.stringify(additionalData),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await db('users')
        .where('id', userId)
        .update({ is_locked: true });

      logger.warn('Account locked', { userId, reason });
    } catch (error) {
      logger.error('Error locking account', { userId, error: error.message });
    }
  }

  async blockIPAddress(ipAddress, reason, attemptCount) {
    try {
      await this.logSecurityEvent(null, 'ip_blocked_brute_force', 'critical', {
        ipAddress,
        reason,
        attemptCount,
        blockDuration: this.thresholds.bruteForce.blockDuration
      });

      logger.warn('IP address blocked', { ipAddress, reason, attemptCount });
    } catch (error) {
      logger.error('Error blocking IP', { ipAddress, error: error.message });
    }
  }

  async logLoginAttempt(userId, ipAddress, userAgent, success, data) {
    try {
      // Get user email for login_attempts table
      const user = userId ? await db('users').where('id', userId).first() : null;
      
      await db('login_attempts').insert({
        email: user?.email || 'unknown',
        ip_address: ipAddress,
        successful: success,
        user_agent: userAgent,
        attempted_at: new Date()
      });

      // Log security event if there are risks
      if (data.risks && data.risks.length > 0) {
        await this.logSecurityEvent(userId, 'suspicious_login', data.riskLevel, {
          ipAddress,
          userAgent,
          success,
          ...data
        });
      }
    } catch (error) {
      logger.error('Error logging login attempt', { error: error.message });
    }
  }

  async logSecurityEvent(userId, eventType, severity, data) {
    try {
      await db('security_events').insert({
        user_id: userId,
        event_type: eventType,
        severity,
        event_data: JSON.stringify(data),
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        location_data: data.location ? JSON.stringify(data.location) : null
      });
    } catch (error) {
      logger.error('Error logging security event', { error: error.message });
    }
  }

  // Utility methods
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  isHeadlessBrowser(parsed, fingerprint) {
    const suspiciousIndicators = [
      parsed.browser.name === 'Headless Chrome',
      parsed.browser.name === 'PhantomJS',
      !fingerprint.screenResolution,
      fingerprint.cookiesEnabled === false,
      !fingerprint.timezone
    ];

    return suspiciousIndicators.filter(Boolean).length >= 2;
  }

  async analyzeBehaviorPatterns(userId, action, metadata) {
    // Implementation would analyze historical user behavior
    // This is a simplified version
    return {
      timeAnomaly: null,
      frequencyAnomaly: null,
      geoAnomaly: null
    };
  }

  async detectDistributedAttacks(timeWindow) {
    // Detect attacks from multiple IPs targeting multiple users
    const attacks = await db('login_attempts')
      .select('ip_address')
      .where('attempted_at', '>', timeWindow)
      .where('successful', false)
      .groupBy('ip_address')
      .havingRaw('COUNT(DISTINCT email) > 5')
      .havingRaw('COUNT(*) > 20');

    return attacks.map(attack => ({
      type: 'distributed_attack',
      severity: 'critical',
      data: { ipAddress: attack.ip_address }
    }));
  }

  async detectCredentialStuffing(timeWindow) {
    // Detect rapid login attempts across multiple accounts
    return []; // Simplified implementation
  }

  async detectSessionHijacking(timeWindow) {
    // Detect suspicious session activity
    return []; // Simplified implementation
  }

  async processThreat(threat) {
    // Process and respond to detected threats
    logger.warn('Threat detected', threat);
  }
}

module.exports = new SuspiciousActivityService();