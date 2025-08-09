/**
 * Security Logger for Dating Profile Optimizer
 * Handles security event logging, monitoring, and alerting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { SECURITY_CONFIG, SECURITY_EVENTS } from './SecurityConfig';

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  userId?: string;
  sessionId?: string;
  details: Record<string, any>;
  deviceInfo: {
    deviceId: string;
    platform: string;
    version: string;
    appVersion: string;
  };
  location?: {
    ipAddress?: string;
    country?: string;
    city?: string;
  };
}

export interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  eventIds: string[];
  acknowledged: boolean;
  actions: string[];
}

export interface LoggingConfig {
  enableConsoleLogging: boolean;
  enableFileLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  maxLogEntries: number;
  retentionDays: number;
}

export class SecurityLogger {
  private static instance: SecurityLogger;
  private config: LoggingConfig;
  private logBuffer: SecurityEvent[] = [];
  private deviceInfo: any = null;
  private sessionId: string;

  private constructor() {
    this.config = {
      enableConsoleLogging: __DEV__,
      enableFileLogging: true,
      enableRemoteLogging: !__DEV__,
      logLevel: __DEV__ ? 'debug' : 'info',
      maxLogEntries: 10000,
      retentionDays: SECURITY_CONFIG.monitoring.logRetentionDays,
    };
    
    this.sessionId = this.generateSessionId();
    this.initializeDeviceInfo();
  }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Initialize security logger
   */
  async initialize(): Promise<void> {
    try {
      await this.loadStoredLogs();
      await this.cleanupOldLogs();
      this.startPeriodicSync();
    } catch (error) {
      console.error('SecurityLogger initialization failed:', error);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, details: Record<string, any> = {}): void {
    if (this.shouldLog('debug')) {
      this.log('debug', 'low', message, details);
    }
  }

  /**
   * Log info message
   */
  info(eventType: string, details: Record<string, any> = {}): void {
    if (this.shouldLog('info')) {
      this.log(eventType, 'low', 'Security event', details);
    }
  }

  /**
   * Log warning message
   */
  warn(eventType: string, details: Record<string, any> = {}): void {
    if (this.shouldLog('warn')) {
      this.log(eventType, 'medium', 'Security warning', details);
      this.checkForSecurityAlerts(eventType, details);
    }
  }

  /**
   * Log error message
   */
  error(message: string, details: Record<string, any> = {}): void {
    if (this.shouldLog('error')) {
      this.log('security_error', 'high', message, details);
      this.checkForSecurityAlerts('security_error', details);
    }
  }

  /**
   * Log critical security event
   */
  critical(eventType: string, details: Record<string, any> = {}): void {
    this.log(eventType, 'critical', 'Critical security event', details);
    this.triggerImmediateAlert(eventType, details);
    this.checkForSecurityAlerts(eventType, details);
  }

  /**
   * Log authentication event
   */
  logAuthEvent(eventType: string, userId?: string, details: Record<string, any> = {}): void {
    const severity = this.getAuthEventSeverity(eventType);
    this.log(eventType, severity, 'Authentication event', {
      userId,
      ...details,
    });

    if (severity === 'high' || severity === 'critical') {
      this.checkForSecurityAlerts(eventType, { userId, ...details });
    }
  }

  /**
   * Log data access event
   */
  logDataAccess(operation: string, dataType: string, userId: string, details: Record<string, any> = {}): void {
    this.log('data_access', 'medium', 'Data access event', {
      operation,
      dataType,
      userId,
      ...details,
    });
  }

  /**
   * Log API request
   */
  logAPIRequest(endpoint: string, method: string, userId?: string, details: Record<string, any> = {}): void {
    this.log('api_request', 'low', 'API request', {
      endpoint,
      method,
      userId,
      ...details,
    });
  }

  /**
   * Log payment event
   */
  logPaymentEvent(eventType: string, amount: number, userId: string, details: Record<string, any> = {}): void {
    const severity = eventType.includes('failed') ? 'medium' : 'low';
    this.log(eventType, severity, 'Payment event', {
      amount,
      userId,
      ...details,
    });
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.logBuffer
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit: number = 50): SecurityEvent[] {
    return this.logBuffer
      .filter(event => event.eventType === eventType)
      .slice(-limit);
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit: number = 50): SecurityEvent[] {
    return this.logBuffer
      .filter(event => event.userId === userId)
      .slice(-limit);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentFailedLogins: number;
    suspiciousActivities: number;
  } {
    const events = this.logBuffer;
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const eventsByType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentFailedLogins = events.filter(
      event => event.eventType === SECURITY_EVENTS.LOGIN_FAILURE &&
                new Date(event.timestamp).getTime() > oneHourAgo
    ).length;

    const suspiciousActivities = events.filter(
      event => event.eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY &&
                new Date(event.timestamp).getTime() > oneHourAgo
    ).length;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      recentFailedLogins,
      suspiciousActivities,
    };
  }

  /**
   * Export logs for analysis
   */
  async exportLogs(format: 'json' | 'csv' = 'json'): Promise<string> {
    const events = this.logBuffer;

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    }

    // CSV format
    const headers = ['timestamp', 'eventType', 'severity', 'userId', 'details'];
    const csvRows = [
      headers.join(','),
      ...events.map(event => [
        event.timestamp,
        event.eventType,
        event.severity,
        event.userId || '',
        JSON.stringify(event.details).replace(/"/g, '""'),
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Clear logs (admin only)
   */
  async clearLogs(): Promise<void> {
    this.logBuffer = [];
    await AsyncStorage.removeItem('security_logs');
  }

  // Private methods

  private async log(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details: Record<string, any>
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      eventType,
      severity,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      details: {
        message,
        ...details,
      },
      deviceInfo: this.deviceInfo,
    };

    // Add to buffer
    this.logBuffer.push(event);

    // Trim buffer if too large
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.consoleLog(event);
    }

    // File logging
    if (this.config.enableFileLogging) {
      await this.persistLog(event);
    }

    // Remote logging
    if (this.config.enableRemoteLogging && severity !== 'low') {
      await this.sendToRemote(event);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  private consoleLog(event: SecurityEvent): void {
    const { eventType, severity, timestamp, details } = event;
    const message = `[${timestamp}] [${severity.toUpperCase()}] ${eventType}: ${details.message || ''}`;

    switch (severity) {
      case 'critical':
      case 'high':
        console.error(message, details);
        break;
      case 'medium':
        console.warn(message, details);
        break;
      default:
        console.log(message, details);
        break;
    }
  }

  private async persistLog(event: SecurityEvent): Promise<void> {
    try {
      // Store recent logs in AsyncStorage
      const recentLogs = this.logBuffer.slice(-1000); // Keep last 1000 events
      await AsyncStorage.setItem('security_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to persist security log:', error);
    }
  }

  private async sendToRemote(event: SecurityEvent): Promise<void> {
    try {
      // In production, send to SIEM or logging service
      // This is a mock implementation
      console.log('Sending to remote logging service:', event);
    } catch (error) {
      console.error('Failed to send log to remote service:', error);
    }
  }

  private async loadStoredLogs(): Promise<void> {
    try {
      const storedLogs = await AsyncStorage.getItem('security_logs');
      if (storedLogs) {
        this.logBuffer = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('Failed to load stored logs:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.logBuffer = this.logBuffer.filter(
      event => new Date(event.timestamp) > cutoffDate
    );

    await this.persistLog({} as SecurityEvent); // Persist cleaned logs
  }

  private startPeriodicSync(): void {
    // Sync logs every 5 minutes
    setInterval(async () => {
      if (this.config.enableFileLogging) {
        await this.persistLog({} as SecurityEvent);
      }
    }, 5 * 60 * 1000);
  }

  private async initializeDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        deviceId: await DeviceInfo.getUniqueId(),
        platform: await DeviceInfo.getSystemName(),
        version: await DeviceInfo.getSystemVersion(),
        appVersion: await DeviceInfo.getVersion(),
      };
    } catch (error) {
      this.deviceInfo = {
        deviceId: 'unknown',
        platform: 'unknown',
        version: 'unknown',
        appVersion: 'unknown',
      };
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAuthEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    const highSeverityEvents = [
      SECURITY_EVENTS.LOGIN_LOCKED,
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
    ];

    const mediumSeverityEvents = [
      SECURITY_EVENTS.LOGIN_FAILURE,
      SECURITY_EVENTS.PASSWORD_CHANGE,
    ];

    if (highSeverityEvents.includes(eventType)) {
      return 'high';
    }

    if (mediumSeverityEvents.includes(eventType)) {
      return 'medium';
    }

    return 'low';
  }

  private async checkForSecurityAlerts(eventType: string, details: Record<string, any>): Promise<void> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Check for repeated failed login attempts
    if (eventType === SECURITY_EVENTS.LOGIN_FAILURE) {
      const recentFailures = this.logBuffer.filter(
        event => event.eventType === SECURITY_EVENTS.LOGIN_FAILURE &&
                  event.details.email === details.email &&
                  new Date(event.timestamp).getTime() > oneHourAgo
      );

      if (recentFailures.length >= 3) {
        await this.createSecurityAlert(
          'Multiple Failed Login Attempts',
          `User ${details.email} has ${recentFailures.length} failed login attempts in the last hour`,
          'high',
          ['lock_account', 'notify_admin']
        );
      }
    }

    // Check for suspicious activity patterns
    if (eventType === SECURITY_EVENTS.SUSPICIOUS_ACTIVITY) {
      await this.createSecurityAlert(
        'Suspicious Activity Detected',
        'Unusual user behavior pattern detected',
        'high',
        ['monitor_user', 'review_activity']
      );
    }

    // Check for potential data breach attempts
    if (eventType === SECURITY_EVENTS.DATA_BREACH_ATTEMPT) {
      await this.createSecurityAlert(
        'Potential Data Breach Attempt',
        'Unauthorized access to sensitive data attempted',
        'critical',
        ['immediate_investigation', 'notify_authorities', 'lock_affected_accounts']
      );
    }
  }

  private async triggerImmediateAlert(eventType: string, details: Record<string, any>): Promise<void> {
    // Send immediate notification for critical events
    console.error('CRITICAL SECURITY EVENT:', eventType, details);
    
    // In production, send push notification, email, SMS, etc.
    await this.createSecurityAlert(
      'Critical Security Event',
      `Immediate attention required: ${eventType}`,
      'critical',
      ['immediate_response', 'escalate_to_admin']
    );
  }

  private async createSecurityAlert(
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    actions: string[]
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: this.generateEventId(),
      title,
      message,
      severity,
      timestamp: new Date().toISOString(),
      eventIds: [], // Would be populated with related event IDs
      acknowledged: false,
      actions,
    };

    // Store alert
    try {
      const existingAlerts = await AsyncStorage.getItem('security_alerts');
      const alerts = existingAlerts ? JSON.parse(existingAlerts) : [];
      alerts.push(alert);
      
      await AsyncStorage.setItem('security_alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to store security alert:', error);
    }
  }
}

// Export singleton instance
export const securityLogger = SecurityLogger.getInstance();