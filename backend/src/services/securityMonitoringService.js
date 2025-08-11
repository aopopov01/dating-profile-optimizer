const db = require('../config/database');
const logger = require('../config/logger');
const emailService = require('./emailService');
const cron = require('node-cron');

class SecurityMonitoringService {
  constructor() {
    this.alertThresholds = {
      criticalEvents: 5, // Per hour
      highEvents: 20,    // Per hour
      failedLogins: 50,  // Per hour globally
      newDevices: 100,   // Per hour globally
      ipBlocks: 10,      // Per hour
      accountLockouts: 20 // Per hour
    };

    this.alertCooldowns = {
      critical: 15 * 60 * 1000,  // 15 minutes
      high: 30 * 60 * 1000,     // 30 minutes
      medium: 60 * 60 * 1000,   // 1 hour
      low: 4 * 60 * 60 * 1000   // 4 hours
    };

    this.recentAlerts = new Map(); // In-memory cooldown tracking
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring cron jobs
   */
  initializeMonitoring() {
    // Real-time threat monitoring every minute
    cron.schedule('* * * * *', () => {
      this.monitorRealTimeThreats().catch(error => {
        logger.error('Error in real-time threat monitoring', { error: error.message });
      });
    });

    // Hourly security metrics analysis
    cron.schedule('0 * * * *', () => {
      this.analyzeHourlyMetrics().catch(error => {
        logger.error('Error in hourly metrics analysis', { error: error.message });
      });
    });

    // Daily security report
    cron.schedule('0 8 * * *', () => {
      this.generateDailySecurityReport().catch(error => {
        logger.error('Error generating daily security report', { error: error.message });
      });
    });

    // Weekly security trend analysis
    cron.schedule('0 9 * * 1', () => {
      this.generateWeeklyTrendReport().catch(error => {
        logger.error('Error generating weekly trend report', { error: error.message });
      });
    });

    logger.info('Security monitoring initialized');
  }

  /**
   * Monitor real-time security threats
   */
  async monitorRealTimeThreats() {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Check for critical security events
      const criticalEvents = await this.getRecentEvents('critical', oneMinuteAgo);
      if (criticalEvents.length > 0) {
        await this.handleCriticalEvents(criticalEvents);
      }

      // Check for brute force attacks
      const bruteForceAttacks = await this.detectBruteForceAttacks(oneMinuteAgo);
      if (bruteForceAttacks.length > 0) {
        await this.handleBruteForceAttacks(bruteForceAttacks);
      }

      // Check for account takeover indicators
      const takeoverAttempts = await this.detectAccountTakeoverAttempts(oneMinuteAgo);
      if (takeoverAttempts.length > 0) {
        await this.handleAccountTakeoverAttempts(takeoverAttempts);
      }

      // Check for distributed attacks
      const distributedAttacks = await this.detectDistributedAttacks(oneMinuteAgo);
      if (distributedAttacks.length > 0) {
        await this.handleDistributedAttacks(distributedAttacks);
      }

    } catch (error) {
      logger.error('Error monitoring real-time threats', { error: error.message });
    }
  }

  /**
   * Analyze hourly security metrics
   */
  async analyzeHourlyMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metrics = await this.calculateSecurityMetrics(oneHourAgo, now);
      
      // Check against thresholds
      const alerts = [];

      if (metrics.criticalEvents >= this.alertThresholds.criticalEvents) {
        alerts.push({
          type: 'high_critical_events',
          severity: 'critical',
          message: `${metrics.criticalEvents} critical security events in the last hour`,
          data: metrics
        });
      }

      if (metrics.failedLogins >= this.alertThresholds.failedLogins) {
        alerts.push({
          type: 'high_failed_logins',
          severity: 'high',
          message: `${metrics.failedLogins} failed login attempts in the last hour`,
          data: metrics
        });
      }

      if (metrics.newDevices >= this.alertThresholds.newDevices) {
        alerts.push({
          type: 'high_new_devices',
          severity: 'medium',
          message: `${metrics.newDevices} new devices registered in the last hour`,
          data: metrics
        });
      }

      if (metrics.accountLockouts >= this.alertThresholds.accountLockouts) {
        alerts.push({
          type: 'high_account_lockouts',
          severity: 'high',
          message: `${metrics.accountLockouts} accounts locked in the last hour`,
          data: metrics
        });
      }

      // Send alerts
      for (const alert of alerts) {
        await this.sendSecurityAlert(alert);
      }

      // Store metrics for trend analysis
      await this.storeSecurityMetrics(metrics, oneHourAgo);

    } catch (error) {
      logger.error('Error analyzing hourly metrics', { error: error.message });
    }
  }

  /**
   * Calculate security metrics for time period
   */
  async calculateSecurityMetrics(startDate, endDate) {
    try {
      const [
        totalEvents,
        criticalEvents,
        highEvents,
        mediumEvents,
        lowEvents,
        failedLogins,
        successfulLogins,
        newDevices,
        accountLockouts,
        twoFAAttempts,
        phoneVerifications,
        biometricAttempts
      ] = await Promise.all([
        // Total security events
        db('security_events')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Critical events
        db('security_events')
          .where('severity', 'critical')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // High severity events
        db('security_events')
          .where('severity', 'high')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Medium severity events
        db('security_events')
          .where('severity', 'medium')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Low severity events
        db('security_events')
          .where('severity', 'low')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Failed login attempts
        db('login_attempts')
          .where('successful', false)
          .whereBetween('attempted_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Successful logins
        db('login_attempts')
          .where('successful', true)
          .whereBetween('attempted_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // New devices
        db('user_devices')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Account lockouts
        db('account_lockouts')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // 2FA attempts
        db('2fa_attempts')
          .whereBetween('attempted_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Phone verifications
        db('phone_verifications')
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first(),

        // Biometric attempts
        db('security_events')
          .whereIn('event_type', ['biometric_auth_success', 'biometric_auth_failure'])
          .whereBetween('created_at', [startDate, endDate])
          .count('* as count')
          .first()
      ]);

      // Calculate additional metrics
      const totalLogins = parseInt(failedLogins.count) + parseInt(successfulLogins.count);
      const failureRate = totalLogins > 0 ? (parseInt(failedLogins.count) / totalLogins) * 100 : 0;

      return {
        timeRange: { start: startDate, end: endDate },
        totalEvents: parseInt(totalEvents.count),
        criticalEvents: parseInt(criticalEvents.count),
        highEvents: parseInt(highEvents.count),
        mediumEvents: parseInt(mediumEvents.count),
        lowEvents: parseInt(lowEvents.count),
        failedLogins: parseInt(failedLogins.count),
        successfulLogins: parseInt(successfulLogins.count),
        totalLogins,
        failureRate: Math.round(failureRate * 100) / 100,
        newDevices: parseInt(newDevices.count),
        accountLockouts: parseInt(accountLockouts.count),
        twoFAAttempts: parseInt(twoFAAttempts.count),
        phoneVerifications: parseInt(phoneVerifications.count),
        biometricAttempts: parseInt(biometricAttempts.count)
      };

    } catch (error) {
      logger.error('Error calculating security metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect various attack patterns
   */
  async detectBruteForceAttacks(since) {
    try {
      const attacks = await db('login_attempts')
        .select('ip_address')
        .where('successful', false)
        .where('attempted_at', '>', since)
        .groupBy('ip_address')
        .havingRaw('COUNT(*) >= 10') // 10+ failed attempts in 1 minute
        .orderByRaw('COUNT(*) DESC');

      return attacks.map(attack => ({
        type: 'brute_force_attack',
        ipAddress: attack.ip_address,
        severity: 'critical'
      }));

    } catch (error) {
      logger.error('Error detecting brute force attacks', { error: error.message });
      return [];
    }
  }

  async detectAccountTakeoverAttempts(since) {
    try {
      const attempts = await db('security_events')
        .where('event_type', 'potential_account_takeover')
        .where('created_at', '>', since)
        .orderBy('created_at', 'desc');

      return attempts.map(attempt => ({
        type: 'account_takeover_attempt',
        userId: attempt.user_id,
        severity: attempt.severity,
        data: JSON.parse(attempt.event_data)
      }));

    } catch (error) {
      logger.error('Error detecting account takeover attempts', { error: error.message });
      return [];
    }
  }

  async detectDistributedAttacks(since) {
    try {
      // Detect attacks from multiple IPs targeting multiple users
      const distributedAttacks = await db('login_attempts')
        .select('ip_address')
        .where('attempted_at', '>', since)
        .where('successful', false)
        .groupBy('ip_address')
        .havingRaw('COUNT(DISTINCT email) >= 5') // 5+ different users
        .havingRaw('COUNT(*) >= 15'); // 15+ attempts

      return distributedAttacks.map(attack => ({
        type: 'distributed_attack',
        ipAddress: attack.ip_address,
        severity: 'critical'
      }));

    } catch (error) {
      logger.error('Error detecting distributed attacks', { error: error.message });
      return [];
    }
  }

  /**
   * Handle different types of security events
   */
  async handleCriticalEvents(events) {
    try {
      const alertKey = 'critical_events';
      if (this.isAlertOnCooldown(alertKey, 'critical')) return;

      const alert = {
        type: 'critical_security_events',
        severity: 'critical',
        message: `${events.length} critical security events detected`,
        data: {
          events: events.map(e => ({
            type: e.event_type,
            userId: e.user_id,
            timestamp: e.created_at,
            data: JSON.parse(e.event_data || '{}')
          }))
        }
      };

      await this.sendSecurityAlert(alert);
      this.setAlertCooldown(alertKey, 'critical');

    } catch (error) {
      logger.error('Error handling critical events', { error: error.message });
    }
  }

  async handleBruteForceAttacks(attacks) {
    try {
      for (const attack of attacks) {
        const alertKey = `brute_force_${attack.ipAddress}`;
        if (this.isAlertOnCooldown(alertKey, 'critical')) continue;

        const alert = {
          type: 'brute_force_attack',
          severity: 'critical',
          message: `Brute force attack detected from IP: ${attack.ipAddress}`,
          data: { ipAddress: attack.ipAddress }
        };

        await this.sendSecurityAlert(alert);
        this.setAlertCooldown(alertKey, 'critical');

        // Auto-block IP if not already blocked
        await this.autoBlockIP(attack.ipAddress, 'brute_force');
      }
    } catch (error) {
      logger.error('Error handling brute force attacks', { error: error.message });
    }
  }

  async handleAccountTakeoverAttempts(attempts) {
    try {
      for (const attempt of attempts) {
        const alertKey = `takeover_${attempt.userId}`;
        if (this.isAlertOnCooldown(alertKey, 'critical')) continue;

        const alert = {
          type: 'account_takeover_attempt',
          severity: 'critical',
          message: `Potential account takeover detected for user: ${attempt.userId}`,
          data: attempt.data
        };

        await this.sendSecurityAlert(alert);
        this.setAlertCooldown(alertKey, 'critical');
      }
    } catch (error) {
      logger.error('Error handling account takeover attempts', { error: error.message });
    }
  }

  async handleDistributedAttacks(attacks) {
    try {
      for (const attack of attacks) {
        const alertKey = `distributed_${attack.ipAddress}`;
        if (this.isAlertOnCooldown(alertKey, 'critical')) continue;

        const alert = {
          type: 'distributed_attack',
          severity: 'critical',
          message: `Distributed attack detected from IP: ${attack.ipAddress}`,
          data: { ipAddress: attack.ipAddress }
        };

        await this.sendSecurityAlert(alert);
        this.setAlertCooldown(alertKey, 'critical');

        // Auto-block IP
        await this.autoBlockIP(attack.ipAddress, 'distributed_attack');
      }
    } catch (error) {
      logger.error('Error handling distributed attacks', { error: error.message });
    }
  }

  /**
   * Send security alerts
   */
  async sendSecurityAlert(alert) {
    try {
      // Log alert
      logger.warn(`Security Alert: ${alert.message}`, {
        type: alert.type,
        severity: alert.severity,
        data: alert.data
      });

      // Store alert in database
      await db('security_events').insert({
        event_type: 'security_alert',
        severity: alert.severity,
        event_data: JSON.stringify({
          alertType: alert.type,
          message: alert.message,
          originalData: alert.data
        })
      });

      // Send email alerts to security team
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.sendEmailAlert(alert);
      }

      // Send to external monitoring services (Slack, PagerDuty, etc.)
      await this.sendExternalAlert(alert);

    } catch (error) {
      logger.error('Error sending security alert', {
        alert: alert.type,
        error: error.message
      });
    }
  }

  async sendEmailAlert(alert) {
    try {
      const securityTeam = process.env.SECURITY_TEAM_EMAILS?.split(',') || [];
      
      if (securityTeam.length === 0) return;

      const emailData = {
        subject: `SECURITY ALERT: ${alert.message}`,
        html: this.generateAlertEmailHTML(alert),
        recipients: securityTeam
      };

      await emailService.sendBulkEmail(emailData);

    } catch (error) {
      logger.error('Error sending email alert', { error: error.message });
    }
  }

  async sendExternalAlert(alert) {
    try {
      // Send to Slack webhook if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(alert);
      }

      // Send to PagerDuty if configured
      if (process.env.PAGERDUTY_INTEGRATION_KEY) {
        await this.sendPagerDutyAlert(alert);
      }

    } catch (error) {
      logger.error('Error sending external alert', { error: error.message });
    }
  }

  /**
   * Generate security reports
   */
  async generateDailySecurityReport() {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const metrics = await this.calculateSecurityMetrics(yesterday, today);
      const topEvents = await this.getTopSecurityEvents(yesterday, today, 10);
      const topIPs = await this.getTopOffendingIPs(yesterday, today, 10);

      const report = {
        date: yesterday.toISOString().split('T')[0],
        metrics,
        topEvents,
        topIPs,
        summary: this.generateSecuritySummary(metrics)
      };

      // Store report
      await this.storeSecurityReport('daily', report);

      // Send report to security team
      await this.sendSecurityReport('daily', report);

      logger.info('Daily security report generated', {
        date: report.date,
        totalEvents: metrics.totalEvents,
        criticalEvents: metrics.criticalEvents
      });

    } catch (error) {
      logger.error('Error generating daily security report', { error: error.message });
    }
  }

  async generateWeeklyTrendReport() {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weeklyMetrics = await this.calculateSecurityMetrics(weekAgo, today);
      const trends = await this.calculateSecurityTrends(weekAgo, today);

      const report = {
        week: `${weekAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`,
        metrics: weeklyMetrics,
        trends,
        recommendations: this.generateSecurityRecommendations(weeklyMetrics, trends)
      };

      await this.storeSecurityReport('weekly', report);
      await this.sendSecurityReport('weekly', report);

      logger.info('Weekly security trend report generated', {
        week: report.week,
        totalEvents: weeklyMetrics.totalEvents
      });

    } catch (error) {
      logger.error('Error generating weekly trend report', { error: error.message });
    }
  }

  /**
   * Helper methods
   */
  async getRecentEvents(severity, since) {
    return await db('security_events')
      .where('severity', severity)
      .where('created_at', '>', since)
      .orderBy('created_at', 'desc');
  }

  async getTopSecurityEvents(startDate, endDate, limit = 10) {
    return await db('security_events')
      .select('event_type', db.raw('COUNT(*) as count'))
      .whereBetween('created_at', [startDate, endDate])
      .groupBy('event_type')
      .orderBy('count', 'desc')
      .limit(limit);
  }

  async getTopOffendingIPs(startDate, endDate, limit = 10) {
    return await db('login_attempts')
      .select('ip_address', db.raw('COUNT(*) as attempts'))
      .where('successful', false)
      .whereBetween('attempted_at', [startDate, endDate])
      .groupBy('ip_address')
      .orderBy('attempts', 'desc')
      .limit(limit);
  }

  async autoBlockIP(ipAddress, reason) {
    try {
      await db('security_events').insert({
        event_type: 'ip_auto_blocked',
        severity: 'high',
        event_data: JSON.stringify({
          ipAddress,
          reason,
          autoBlocked: true,
          timestamp: new Date()
        }),
        ip_address: ipAddress
      });

      logger.warn('IP address auto-blocked', { ipAddress, reason });
    } catch (error) {
      logger.error('Error auto-blocking IP', { ipAddress, error: error.message });
    }
  }

  isAlertOnCooldown(alertKey, severity) {
    const cooldownDuration = this.alertCooldowns[severity];
    const lastAlert = this.recentAlerts.get(alertKey);
    
    if (!lastAlert) return false;
    
    return (Date.now() - lastAlert) < cooldownDuration;
  }

  setAlertCooldown(alertKey, severity) {
    this.recentAlerts.set(alertKey, Date.now());
  }

  generateAlertEmailHTML(alert) {
    return `
      <html>
        <body>
          <h2 style="color: ${alert.severity === 'critical' ? 'red' : 'orange'};">
            Security Alert: ${alert.severity.toUpperCase()}
          </h2>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Type:</strong> ${alert.type}</p>
          ${alert.data ? `<p><strong>Data:</strong> <pre>${JSON.stringify(alert.data, null, 2)}</pre></p>` : ''}
          <p>Please investigate immediately.</p>
        </body>
      </html>
    `;
  }

  generateSecuritySummary(metrics) {
    const severity = metrics.criticalEvents > 0 ? 'CRITICAL' :
                    metrics.highEvents > 10 ? 'HIGH' :
                    metrics.mediumEvents > 50 ? 'MEDIUM' : 'LOW';

    return {
      severity,
      failureRate: metrics.failureRate,
      riskLevel: metrics.criticalEvents > 5 ? 'HIGH' : 
                 metrics.failureRate > 20 ? 'MEDIUM' : 'LOW',
      recommendations: this.generateRecommendations(metrics)
    };
  }

  generateRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.failureRate > 20) {
      recommendations.push('High failure rate detected - consider implementing additional brute force protection');
    }
    
    if (metrics.newDevices > 100) {
      recommendations.push('High number of new devices - review device registration process');
    }
    
    if (metrics.accountLockouts > 20) {
      recommendations.push('High number of account lockouts - investigate potential attacks');
    }

    return recommendations;
  }

  async storeSecurityMetrics(metrics, timestamp) {
    // Store metrics in a time-series format for trend analysis
    // Implementation would depend on your time-series storage solution
  }

  async storeSecurityReport(type, report) {
    // Store reports for historical analysis
    // Implementation would store in database or file system
  }

  async sendSecurityReport(type, report) {
    // Send reports to security team
    // Implementation would send via email or other channels
  }

  async sendSlackAlert(alert) {
    // Send alert to Slack
    // Implementation would use Slack webhook
  }

  async sendPagerDutyAlert(alert) {
    // Send alert to PagerDuty
    // Implementation would use PagerDuty API
  }

  async calculateSecurityTrends(startDate, endDate) {
    // Calculate security trends over time
    // Implementation would analyze metrics over time periods
    return {
      eventTrend: 'increasing',
      attackTrend: 'stable',
      riskTrend: 'decreasing'
    };
  }

  generateSecurityRecommendations(metrics, trends) {
    // Generate security recommendations based on metrics and trends
    return [
      'Continue monitoring suspicious activity patterns',
      'Review and update security policies',
      'Consider implementing additional authentication factors'
    ];
  }

  /**
   * Get security dashboard data
   */
  async getDashboardData(timeframe = '24h') {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - this.getTimeframeMs(timeframe));

      const metrics = await this.calculateSecurityMetrics(startDate, now);
      const recentAlerts = await this.getRecentSecurityAlerts(startDate, 10);
      const topThreats = await this.getTopThreats(startDate, 5);

      return {
        timeframe,
        lastUpdated: now,
        metrics,
        recentAlerts,
        topThreats,
        systemStatus: this.getSystemSecurityStatus(metrics)
      };

    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message });
      throw error;
    }
  }

  getTimeframeMs(timeframe) {
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return timeframes[timeframe] || timeframes['24h'];
  }

  async getRecentSecurityAlerts(since, limit) {
    return await db('security_events')
      .where('event_type', 'security_alert')
      .where('created_at', '>', since)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getTopThreats(since, limit) {
    return await db('security_events')
      .select('event_type', 'severity', db.raw('COUNT(*) as count'))
      .where('created_at', '>', since)
      .whereIn('severity', ['critical', 'high'])
      .groupBy('event_type', 'severity')
      .orderBy('count', 'desc')
      .limit(limit);
  }

  getSystemSecurityStatus(metrics) {
    if (metrics.criticalEvents > 5) return 'critical';
    if (metrics.highEvents > 20 || metrics.failureRate > 25) return 'warning';
    if (metrics.mediumEvents > 50 || metrics.failureRate > 10) return 'attention';
    return 'normal';
  }
}

module.exports = new SecurityMonitoringService();