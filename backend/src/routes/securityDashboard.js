const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { enhancedAuthenticate, requireHighSecurity, logSecurityEvent } = require('../middleware/enhancedAuth');
const securityMonitoringService = require('../services/securityMonitoringService');
const suspiciousActivityService = require('../services/suspiciousActivityService');
const accountSecurityService = require('../services/accountSecurityService');
const logger = require('../config/logger');
const db = require('../config/database');

const router = express.Router();

// Admin role check middleware
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    logger.error('Admin check error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Access verification error'
    });
  }
};

// =============================================================================
// SECURITY DASHBOARD ENDPOINTS
// =============================================================================

/**
 * Get comprehensive security dashboard data
 */
router.get('/overview',
  enhancedAuthenticate,
  requireAdmin,
  logSecurityEvent('security_dashboard_accessed', 'low'),
  async (req, res) => {
    try {
      const { timeframe = '24h' } = req.query;
      
      const dashboardData = await securityMonitoringService.getDashboardData(timeframe);

      res.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error getting security dashboard overview', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }
);

/**
 * Get real-time security metrics
 */
router.get('/metrics/realtime',
  enhancedAuthenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const realtimeMetrics = await securityMonitoringService.calculateSecurityMetrics(
        fiveMinutesAgo,
        now
      );

      // Get active threats
      const activeThreats = await suspiciousActivityService.monitorRealTimeThreats();

      // Get system status
      const systemStatus = securityMonitoringService.getSystemSecurityStatus(realtimeMetrics);

      res.json({
        success: true,
        data: {
          metrics: realtimeMetrics,
          activeThreats: activeThreats.length,
          systemStatus,
          lastUpdated: now
        }
      });

    } catch (error) {
      logger.error('Error getting real-time metrics', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics'
      });
    }
  }
);

/**
 * Get security events with filtering
 */
router.get('/events',
  enhancedAuthenticate,
  requireAdmin,
  [
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('eventType').optional().isString(),
    query('userId').optional().isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const {
        severity,
        eventType,
        userId,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = req.query;

      let query = db('security_events')
        .select(
          'security_events.*',
          'users.email',
          'users.first_name',
          'users.last_name'
        )
        .leftJoin('users', 'users.id', 'security_events.user_id')
        .orderBy('security_events.created_at', 'desc')
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Apply filters
      if (severity) query = query.where('security_events.severity', severity);
      if (eventType) query = query.where('security_events.event_type', eventType);
      if (userId) query = query.where('security_events.user_id', userId);
      if (startDate) query = query.where('security_events.created_at', '>=', startDate);
      if (endDate) query = query.where('security_events.created_at', '<=', endDate);

      const events = await query;

      // Get total count for pagination
      let countQuery = db('security_events').count('* as count');
      if (severity) countQuery = countQuery.where('severity', severity);
      if (eventType) countQuery = countQuery.where('event_type', eventType);
      if (userId) countQuery = countQuery.where('user_id', userId);
      if (startDate) countQuery = countQuery.where('created_at', '>=', startDate);
      if (endDate) countQuery = countQuery.where('created_at', '<=', endDate);

      const [{ count }] = await countQuery;

      // Format events
      const formattedEvents = events.map(event => ({
        id: event.id,
        type: event.event_type,
        severity: event.severity,
        message: formatEventMessage(event.event_type, JSON.parse(event.event_data || '{}')),
        user: event.user_id ? {
          id: event.user_id,
          email: event.email,
          name: `${event.first_name || ''} ${event.last_name || ''}`.trim()
        } : null,
        ipAddress: event.ip_address ? maskIP(event.ip_address) : null,
        location: event.location_data ? JSON.parse(event.location_data) : null,
        data: JSON.parse(event.event_data || '{}'),
        timestamp: event.created_at,
        resolved: event.is_resolved
      }));

      res.json({
        success: true,
        data: {
          events: formattedEvents,
          pagination: {
            total: parseInt(count),
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < parseInt(count)
          }
        }
      });

    } catch (error) {
      logger.error('Error getting security events', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get security events'
      });
    }
  }
);

/**
 * Get top security threats
 */
router.get('/threats/top',
  enhancedAuthenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { timeframe = '24h', limit = 10 } = req.query;
      const timeframeMs = getTimeframeMs(timeframe);
      const startDate = new Date(Date.now() - timeframeMs);

      const topThreats = await db('security_events')
        .select('event_type', 'severity')
        .count('* as count')
        .where('created_at', '>', startDate)
        .whereIn('severity', ['medium', 'high', 'critical'])
        .groupBy('event_type', 'severity')
        .orderBy('count', 'desc')
        .limit(parseInt(limit));

      const threatDetails = await Promise.all(
        topThreats.map(async (threat) => {
          const recentIncidents = await db('security_events')
            .where('event_type', threat.event_type)
            .where('severity', threat.severity)
            .where('created_at', '>', startDate)
            .orderBy('created_at', 'desc')
            .limit(3);

          return {
            type: threat.event_type,
            severity: threat.severity,
            count: parseInt(threat.count),
            description: getEventTypeDescription(threat.event_type),
            recentIncidents: recentIncidents.map(incident => ({
              id: incident.id,
              timestamp: incident.created_at,
              userId: incident.user_id,
              ipAddress: incident.ip_address ? maskIP(incident.ip_address) : null
            }))
          };
        })
      );

      res.json({
        success: true,
        data: {
          threats: threatDetails,
          timeframe,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error getting top threats', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get top threats'
      });
    }
  }
);

/**
 * Get user risk analysis
 */
router.get('/users/risk-analysis',
  enhancedAuthenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get users with recent security events
      const usersWithEvents = await db('security_events')
        .select('user_id')
        .count('* as eventCount')
        .sum(db.raw(`
          CASE 
            WHEN severity = 'critical' THEN 10
            WHEN severity = 'high' THEN 5
            WHEN severity = 'medium' THEN 2
            ELSE 1
          END
        `)).as('riskScore')
        .where('created_at', '>', last24h)
        .whereNotNull('user_id')
        .groupBy('user_id')
        .orderBy('riskScore', 'desc')
        .limit(parseInt(limit));

      // Get user details
      const riskAnalysis = await Promise.all(
        usersWithEvents.map(async (userRisk) => {
          const user = await db('users')
            .where('id', userRisk.user_id)
            .first();

          const recentEvents = await db('security_events')
            .where('user_id', userRisk.user_id)
            .where('created_at', '>', last24h)
            .orderBy('created_at', 'desc')
            .limit(5);

          const accountStatus = await accountSecurityService.isAccountLocked(userRisk.user_id);

          return {
            user: {
              id: user.id,
              email: user.email,
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              createdAt: user.created_at,
              lastActive: user.last_active
            },
            risk: {
              score: parseInt(userRisk.riskScore),
              level: categorizeRiskScore(parseInt(userRisk.riskScore)),
              eventCount: parseInt(userRisk.eventCount)
            },
            accountStatus: {
              isLocked: accountStatus.isLocked,
              lockReason: accountStatus.lockout?.reason
            },
            recentEvents: recentEvents.map(event => ({
              type: event.event_type,
              severity: event.severity,
              timestamp: event.created_at
            }))
          };
        })
      );

      res.json({
        success: true,
        data: {
          users: riskAnalysis,
          summary: {
            totalUsers: riskAnalysis.length,
            highRiskUsers: riskAnalysis.filter(u => u.risk.level === 'high').length,
            lockedAccounts: riskAnalysis.filter(u => u.accountStatus.isLocked).length
          }
        }
      });

    } catch (error) {
      logger.error('Error getting user risk analysis', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get user risk analysis'
      });
    }
  }
);

/**
 * Get blocked IPs
 */
router.get('/blocked-ips',
  enhancedAuthenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const blockedIPs = await db('security_events')
        .select('ip_address', 'event_data', 'created_at')
        .where('event_type', 'ip_auto_blocked')
        .where('created_at', '>', last24h)
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit));

      const ipAnalysis = blockedIPs.map(ip => {
        const data = JSON.parse(ip.event_data || '{}');
        return {
          ipAddress: maskIP(ip.ip_address),
          reason: data.reason,
          timestamp: ip.created_at,
          attemptCount: data.attemptCount || 0,
          autoBlocked: data.autoBlocked || false
        };
      });

      res.json({
        success: true,
        data: {
          blockedIPs: ipAnalysis,
          totalBlocked: ipAnalysis.length,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error getting blocked IPs', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get blocked IPs'
      });
    }
  }
);

/**
 * Resolve security event
 */
router.post('/events/:eventId/resolve',
  enhancedAuthenticate,
  requireAdmin,
  requireHighSecurity,
  [
    body('resolution').notEmpty().withMessage('Resolution action required'),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { eventId } = req.params;
      const { resolution, notes } = req.body;
      const adminId = req.user.id;

      // Update security event
      await db('security_events')
        .where('id', eventId)
        .update({
          is_resolved: true,
          resolution_action: resolution,
          resolved_by: adminId,
          resolved_at: new Date(),
          updated_at: new Date()
        });

      // Log resolution
      await db('security_events').insert({
        event_type: 'security_event_resolved',
        severity: 'low',
        event_data: JSON.stringify({
          originalEventId: eventId,
          resolution,
          notes,
          resolvedBy: adminId
        }),
        user_id: adminId
      });

      res.json({
        success: true,
        message: 'Security event resolved successfully'
      });

    } catch (error) {
      logger.error('Error resolving security event', {
        error: error.message,
        eventId: req.params.eventId,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to resolve security event'
      });
    }
  }
);

/**
 * Get security statistics
 */
router.get('/statistics',
  enhancedAuthenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      const periodMs = getTimeframeMs(period);
      const startDate = new Date(Date.now() - periodMs);
      const endDate = new Date();

      const stats = await accountSecurityService.getSecurityStats(startDate, endDate);

      // Process statistics
      const processedStats = stats.reduce((acc, stat) => {
        const date = stat.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            events: { low: 0, medium: 0, high: 0, critical: 0 },
            total: 0
          };
        }
        acc[date].events[stat.severity] = parseInt(stat.count);
        acc[date].total += parseInt(stat.count);
        return acc;
      }, {});

      const timeSeriesData = Object.values(processedStats);

      // Calculate totals
      const totals = timeSeriesData.reduce((acc, day) => {
        acc.total += day.total;
        Object.keys(day.events).forEach(severity => {
          acc[severity] += day.events[severity];
        });
        return acc;
      }, { total: 0, low: 0, medium: 0, high: 0, critical: 0 });

      res.json({
        success: true,
        data: {
          period,
          timeSeries: timeSeriesData,
          totals,
          averagePerDay: timeSeriesData.length > 0 ? Math.round(totals.total / timeSeriesData.length) : 0,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error getting security statistics', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get security statistics'
      });
    }
  }
);

/**
 * Manually trigger security scan
 */
router.post('/scan/trigger',
  enhancedAuthenticate,
  requireAdmin,
  requireHighSecurity,
  logSecurityEvent('manual_security_scan', 'medium'),
  async (req, res) => {
    try {
      const adminId = req.user.id;

      // Trigger manual security monitoring
      const threats = await suspiciousActivityService.monitorRealTimeThreats();

      // Log the manual scan
      await db('security_events').insert({
        event_type: 'manual_security_scan',
        severity: 'low',
        event_data: JSON.stringify({
          triggeredBy: adminId,
          threatsFound: threats.length,
          timestamp: new Date()
        }),
        user_id: adminId
      });

      res.json({
        success: true,
        message: 'Security scan completed',
        data: {
          threatsFound: threats.length,
          threats: threats.slice(0, 10) // Return first 10 threats
        }
      });

    } catch (error) {
      logger.error('Error triggering security scan', {
        error: error.message,
        userId: req.user?.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger security scan'
      });
    }
  }
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTimeframeMs(timeframe) {
  const timeframes = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return timeframes[timeframe] || timeframes['24h'];
}

function maskIP(ip) {
  if (!ip) return 'unknown';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.**`;
  }
  return ip.substring(0, ip.length - 6) + '***';
}

function formatEventMessage(eventType, eventData) {
  const messages = {
    'suspicious_login': 'Suspicious login attempt detected',
    'brute_force_attack': 'Brute force attack detected',
    'account_locked': 'Account locked due to security concerns',
    'new_device_detected': 'New device detected on account',
    '2fa_enabled': 'Two-factor authentication enabled',
    '2fa_disabled': 'Two-factor authentication disabled',
    'password_changed': 'Password was changed',
    'phone_verification_sent': 'Phone verification code sent',
    'biometric_registered': 'Biometric authentication registered',
    'ip_auto_blocked': 'IP address automatically blocked'
  };

  return messages[eventType] || `Security event: ${eventType}`;
}

function getEventTypeDescription(eventType) {
  const descriptions = {
    'suspicious_login': 'Login attempts with unusual patterns or high risk factors',
    'brute_force_attack': 'Multiple failed login attempts in short time period',
    'account_locked': 'User accounts locked due to security concerns',
    'new_device_detected': 'New devices registering with user accounts',
    'ip_auto_blocked': 'IP addresses automatically blocked for malicious activity'
  };

  return descriptions[eventType] || `Security event: ${eventType}`;
}

function categorizeRiskScore(score) {
  if (score >= 50) return 'critical';
  if (score >= 20) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

module.exports = router;