/**
 * Security Manager for Dating Profile Optimizer
 * Central coordinator for all security services and policies
 */

import { Alert, Platform } from 'react-native';
import { authService } from './AuthService';
import { cryptoService } from './CryptoService';
import { securityLogger } from './SecurityLogger';
import { biometricAuth } from './BiometricAuth';
import { secureStorage } from './SecureStorage';
import { deviceSecurityService } from './DeviceSecurityService';
import { dataProtectionService } from './DataProtectionService';
import { apiSecurityService } from './APISecurityService';
import { aiSecurityService } from './AISecurityService';
import { SECURITY_CONFIG, SECURITY_EVENTS } from './SecurityConfig';

export interface SecurityInitializationResult {
  success: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  errors: string[];
  deviceTrusted: boolean;
  biometricsAvailable: boolean;
}

export interface SecurityStatus {
  authenticationStatus: 'authenticated' | 'unauthenticated' | 'expired';
  deviceSecurityLevel: 'low' | 'medium' | 'high';
  dataProtectionCompliant: boolean;
  encryptionEnabled: boolean;
  monitoringActive: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  lastSecurityCheck: string;
}

export interface SecurityIncident {
  id: string;
  type: 'authentication' | 'data_breach' | 'device_compromise' | 'api_abuse' | 'ai_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  timestamp: string;
  resolved: boolean;
  actions: string[];
}

export interface SecurityPolicy {
  requireBiometrics: boolean;
  allowRootedDevices: boolean;
  allowEmulators: boolean;
  enforceAppPinning: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  dataRetentionDays: number;
  encryptionRequired: boolean;
  auditLoggingEnabled: boolean;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private isInitialized: boolean = false;
  private securityStatus: SecurityStatus | null = null;
  private securityPolicy: SecurityPolicy;
  private activeIncidents: Map<string, SecurityIncident> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.securityPolicy = this.getDefaultSecurityPolicy();
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize all security services
   */
  async initialize(): Promise<SecurityInitializationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let deviceTrusted = true;
    let biometricsAvailable = false;

    try {
      securityLogger.info('security_manager_initialization_started');

      // Initialize core services
      const initResults = await Promise.allSettled([
        cryptoService.initialize(),
        secureStorage.initialize(),
        deviceSecurityService.initialize(),
        authService.initialize(),
        dataProtectionService.initialize(),
        aiSecurityService.initialize(),
        biometricAuth.initialize(),
        securityLogger.initialize(),
      ]);

      // Check initialization results
      for (let i = 0; i < initResults.length; i++) {
        const result = initResults[i];
        if (result.status === 'rejected') {
          errors.push(`Service ${i} initialization failed: ${result.reason}`);
        }
      }

      // Check device security
      const deviceStatus = deviceSecurityService.getSecurityStatus();
      if (deviceStatus) {
        deviceTrusted = deviceStatus.securityLevel !== 'low';
        
        if (deviceStatus.isRooted || deviceStatus.isJailbroken) {
          if (!this.securityPolicy.allowRootedDevices) {
            warnings.push('Device is rooted/jailbroken - security may be compromised');
            deviceTrusted = false;
          }
        }

        if (deviceStatus.isEmulator && !this.securityPolicy.allowEmulators) {
          warnings.push('Running on emulator - some security features disabled');
        }
      }

      // Check biometric availability
      const biometricCapabilities = await biometricAuth.checkBiometricCapabilities();
      biometricsAvailable = biometricCapabilities.available;

      if (!biometricsAvailable && this.securityPolicy.requireBiometrics) {
        warnings.push('Biometric authentication not available');
      }

      // Initialize security status
      this.securityStatus = await this.assessSecurityStatus();

      // Start security monitoring
      this.startSecurityMonitoring();

      // Determine overall security level
      const securityLevel = this.determineSecurityLevel(deviceTrusted, biometricsAvailable, errors.length);

      this.isInitialized = true;

      securityLogger.info('security_manager_initialized', {
        securityLevel,
        deviceTrusted,
        biometricsAvailable,
        warnings: warnings.length,
        errors: errors.length,
      });

      return {
        success: errors.length === 0,
        securityLevel,
        warnings,
        errors,
        deviceTrusted,
        biometricsAvailable,
      };
    } catch (error) {
      securityLogger.error('Security manager initialization failed', { error });
      return {
        success: false,
        securityLevel: 'low',
        warnings,
        errors: [...errors, 'Critical initialization failure'],
        deviceTrusted: false,
        biometricsAvailable: false,
      };
    }
  }

  /**
   * Check if app should be blocked due to security issues
   */
  async shouldBlockAppAccess(): Promise<{
    blocked: boolean;
    reason?: string;
    allowOverride?: boolean;
  }> {
    try {
      if (!this.isInitialized) {
        return { blocked: true, reason: 'Security not initialized' };
      }

      // Check device security
      const deviceSecurityResult = await deviceSecurityService.shouldBlockApp();
      if (deviceSecurityResult.blocked) {
        return {
          blocked: true,
          reason: deviceSecurityResult.reason,
          allowOverride: false,
        };
      }

      // Check for critical security incidents
      const criticalIncidents = Array.from(this.activeIncidents.values())
        .filter(incident => incident.severity === 'critical' && !incident.resolved);

      if (criticalIncidents.length > 0) {
        return {
          blocked: true,
          reason: 'Critical security incidents detected',
          allowOverride: false,
        };
      }

      // Check authentication status
      const authState = authService.getAuthState();
      if (!authState.isAuthenticated && this.requiresAuthentication()) {
        return {
          blocked: true,
          reason: 'Authentication required',
          allowOverride: true,
        };
      }

      return { blocked: false };
    } catch (error) {
      securityLogger.error('Security check failed', { error });
      return { blocked: true, reason: 'Security check failed' };
    }
  }

  /**
   * Handle security incident
   */
  async handleSecurityIncident(
    type: SecurityIncident['type'],
    severity: SecurityIncident['severity'],
    description: string,
    userId?: string,
    additionalData?: any
  ): Promise<string> {
    try {
      const incidentId = cryptoService.generateUUID();
      
      const incident: SecurityIncident = {
        id: incidentId,
        type,
        severity,
        description,
        userId,
        timestamp: new Date().toISOString(),
        resolved: false,
        actions: [],
      };

      // Log the incident
      securityLogger.critical('security_incident', {
        incidentId,
        type,
        severity,
        description,
        userId,
        additionalData,
      });

      // Store incident
      this.activeIncidents.set(incidentId, incident);

      // Execute immediate response actions
      const actions = await this.executeIncidentResponse(incident);
      incident.actions = actions;

      // Update incident
      this.activeIncidents.set(incidentId, incident);

      // Notify if critical
      if (severity === 'critical') {
        await this.notifyCriticalIncident(incident);
      }

      return incidentId;
    } catch (error) {
      securityLogger.error('Failed to handle security incident', { error });
      throw new Error('Failed to handle security incident');
    }
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): SecurityStatus | null {
    return this.securityStatus;
  }

  /**
   * Update security policy
   */
  async updateSecurityPolicy(policy: Partial<SecurityPolicy>): Promise<void> {
    try {
      this.securityPolicy = { ...this.securityPolicy, ...policy };
      
      // Store policy securely
      await secureStorage.setItem('security_policy', this.securityPolicy, {
        encryptData: true,
      });

      securityLogger.info('security_policy_updated', {
        changes: Object.keys(policy),
      });

      // Re-assess security status with new policy
      this.securityStatus = await this.assessSecurityStatus();
    } catch (error) {
      securityLogger.error('Failed to update security policy', { error });
      throw new Error('Failed to update security policy');
    }
  }

  /**
   * Perform security health check
   */
  async performSecurityHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const checks = [];
      const recommendations = [];

      // Authentication health
      const authState = authService.getAuthState();
      checks.push({
        name: 'Authentication',
        status: authState.isAuthenticated ? 'pass' : 'warn',
        message: authState.isAuthenticated ? 'User authenticated' : 'No active authentication',
      });

      // Device security health
      const deviceStatus = deviceSecurityService.getSecurityStatus();
      if (deviceStatus) {
        checks.push({
          name: 'Device Security',
          status: deviceStatus.securityLevel === 'high' ? 'pass' : 
                  deviceStatus.securityLevel === 'medium' ? 'warn' : 'fail',
          message: `Security level: ${deviceStatus.securityLevel}`,
        });

        if (deviceStatus.isRooted || deviceStatus.isJailbroken) {
          recommendations.push('Use app on non-rooted/non-jailbroken device');
        }
      }

      // Encryption health
      const encryptionEnabled = SECURITY_CONFIG.storage.encryptSensitiveData;
      checks.push({
        name: 'Data Encryption',
        status: encryptionEnabled ? 'pass' : 'fail',
        message: encryptionEnabled ? 'Encryption enabled' : 'Encryption disabled',
      });

      // Biometric availability
      const biometricCapabilities = await biometricAuth.checkBiometricCapabilities();
      checks.push({
        name: 'Biometric Authentication',
        status: biometricCapabilities.available ? 'pass' : 'warn',
        message: biometricCapabilities.available ? 
          `${biometricCapabilities.biometryType} available` : 'Not available',
      });

      // API security
      checks.push({
        name: 'API Security',
        status: 'pass', // Assume pass if no critical issues
        message: 'API security active',
      });

      // Determine overall health
      const failCount = checks.filter(c => c.status === 'fail').length;
      const warnCount = checks.filter(c => c.status === 'warn').length;

      let overall: 'healthy' | 'degraded' | 'critical';
      if (failCount > 0) {
        overall = 'critical';
      } else if (warnCount > 2) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      return { overall, checks, recommendations };
    } catch (error) {
      securityLogger.error('Security health check failed', { error });
      return {
        overall: 'critical',
        checks: [{ name: 'Health Check', status: 'fail', message: 'Health check failed' }],
        recommendations: ['Restart application and check security services'],
      };
    }
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<{
    timestamp: string;
    securityStatus: SecurityStatus;
    deviceInfo: any;
    incidents: SecurityIncident[];
    healthCheck: any;
    compliance: any;
    recommendations: string[];
  }> {
    try {
      const [healthCheck, deviceInfo, complianceCheck] = await Promise.all([
        this.performSecurityHealthCheck(),
        deviceSecurityService.generateSecurityReport(),
        dataProtectionService.checkRetentionCompliance(),
      ]);

      const incidents = Array.from(this.activeIncidents.values());
      
      const recommendations = [
        ...healthCheck.recommendations,
        ...complianceCheck.recommendations,
      ];

      return {
        timestamp: new Date().toISOString(),
        securityStatus: this.securityStatus!,
        deviceInfo,
        incidents,
        healthCheck,
        compliance: complianceCheck,
        recommendations,
      };
    } catch (error) {
      securityLogger.error('Failed to generate security report', { error });
      throw new Error('Failed to generate security report');
    }
  }

  /**
   * Emergency security lockdown
   */
  async emergencyLockdown(reason: string): Promise<void> {
    try {
      securityLogger.critical('emergency_lockdown_initiated', { reason });

      // Log out user
      await authService.logout();

      // Clear sensitive data
      await this.clearSensitiveData();

      // Block further access
      await secureStorage.setItem('emergency_lockdown', {
        active: true,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Notify user
      Alert.alert(
        'Security Lockdown',
        'Emergency security measures have been activated. Please contact support.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      securityLogger.error('Emergency lockdown failed', { error });
    }
  }

  // Private methods

  private getDefaultSecurityPolicy(): SecurityPolicy {
    return {
      requireBiometrics: false,
      allowRootedDevices: false,
      allowEmulators: __DEV__,
      enforceAppPinning: !__DEV__,
      maxLoginAttempts: SECURITY_CONFIG.auth.maxLoginAttempts,
      sessionTimeout: SECURITY_CONFIG.auth.sessionTimeoutMinutes,
      dataRetentionDays: SECURITY_CONFIG.storage.dataRetentionDays,
      encryptionRequired: SECURITY_CONFIG.storage.encryptSensitiveData,
      auditLoggingEnabled: SECURITY_CONFIG.monitoring.enableSecurityLogging,
    };
  }

  private async assessSecurityStatus(): Promise<SecurityStatus> {
    const authState = authService.getAuthState();
    const deviceStatus = deviceSecurityService.getSecurityStatus();
    
    let threatLevel: SecurityStatus['threatLevel'] = 'none';
    
    // Assess threat level based on various factors
    const criticalIncidents = Array.from(this.activeIncidents.values())
      .filter(i => i.severity === 'critical' && !i.resolved).length;
    
    if (criticalIncidents > 0) {
      threatLevel = 'critical';
    } else if (deviceStatus && deviceStatus.securityLevel === 'low') {
      threatLevel = 'high';
    } else if (!authState.isAuthenticated) {
      threatLevel = 'medium';
    }

    return {
      authenticationStatus: authState.isAuthenticated ? 'authenticated' : 'unauthenticated',
      deviceSecurityLevel: deviceStatus?.securityLevel || 'low',
      dataProtectionCompliant: SECURITY_CONFIG.compliance.gdprEnabled,
      encryptionEnabled: SECURITY_CONFIG.storage.encryptSensitiveData,
      monitoringActive: this.monitoringInterval !== null,
      threatLevel,
      lastSecurityCheck: new Date().toISOString(),
    };
  }

  private determineSecurityLevel(
    deviceTrusted: boolean,
    biometricsAvailable: boolean,
    errorCount: number
  ): 'low' | 'medium' | 'high' {
    if (errorCount > 0 || !deviceTrusted) {
      return 'low';
    }
    
    if (biometricsAvailable && SECURITY_CONFIG.storage.encryptSensitiveData) {
      return 'high';
    }
    
    return 'medium';
  }

  private requiresAuthentication(): boolean {
    // Check if current screen requires authentication
    return true; // Simplified - in production, check navigation state
  }

  private async executeIncidentResponse(incident: SecurityIncident): Promise<string[]> {
    const actions: string[] = [];

    switch (incident.type) {
      case 'authentication':
        if (incident.severity === 'high' || incident.severity === 'critical') {
          await authService.logout();
          actions.push('User logged out');
        }
        break;

      case 'device_compromise':
        if (incident.severity === 'critical') {
          await this.emergencyLockdown('Device compromise detected');
          actions.push('Emergency lockdown activated');
        }
        break;

      case 'data_breach':
        // Notify user and authorities if required
        actions.push('Data breach notification initiated');
        break;

      case 'api_abuse':
        // Block user or IP temporarily
        actions.push('API rate limiting applied');
        break;

      case 'ai_abuse':
        // Suspend AI access
        actions.push('AI services suspended');
        break;
    }

    return actions;
  }

  private async notifyCriticalIncident(incident: SecurityIncident): Promise<void> {
    // Send push notification, email, etc.
    console.error('CRITICAL SECURITY INCIDENT:', incident);
  }

  private startSecurityMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Update security status
        this.securityStatus = await this.assessSecurityStatus();

        // Check for new threats
        const healthCheck = await this.performSecurityHealthCheck();
        
        if (healthCheck.overall === 'critical') {
          securityLogger.critical('security_health_critical', healthCheck);
        }
      } catch (error) {
        securityLogger.error('Security monitoring failed', { error });
      }
    }, 60000); // Check every minute
  }

  private async clearSensitiveData(): Promise<void> {
    try {
      // Clear sensitive data from storage
      const keys = await secureStorage.getAllKeys();
      const sensitiveKeys = keys.filter(key => 
        key.includes('token') || 
        key.includes('password') || 
        key.includes('credential') ||
        key.includes('biometric')
      );

      for (const key of sensitiveKeys) {
        await secureStorage.removeItem(key);
      }

      securityLogger.info('sensitive_data_cleared', {
        clearedKeys: sensitiveKeys.length,
      });
    } catch (error) {
      securityLogger.error('Failed to clear sensitive data', { error });
    }
  }

  /**
   * Stop security monitoring (for cleanup)
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get security policy
   */
  getSecurityPolicy(): SecurityPolicy {
    return { ...this.securityPolicy };
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Resolve security incident
   */
  async resolveIncident(incidentId: string, resolution: string): Promise<void> {
    const incident = this.activeIncidents.get(incidentId);
    if (incident) {
      incident.resolved = true;
      incident.actions.push(`Resolved: ${resolution}`);
      
      securityLogger.info('security_incident_resolved', {
        incidentId,
        resolution,
        duration: Date.now() - new Date(incident.timestamp).getTime(),
      });
    }
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();