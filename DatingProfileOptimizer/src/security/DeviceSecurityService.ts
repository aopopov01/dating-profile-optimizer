/**
 * Device Security Service for Dating Profile Optimizer
 * Handles root/jailbreak detection, device integrity, and mobile-specific security measures
 */

import { Platform, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { securityLogger } from './SecurityLogger';
import { SECURITY_CONFIG } from './SecurityConfig';

export interface DeviceSecurityStatus {
  isRooted: boolean;
  isJailbroken: boolean;
  isEmulator: boolean;
  hasHooks: boolean;
  isDebuggingEnabled: boolean;
  isUSBDebuggingEnabled: boolean;
  hasXposed: boolean;
  hasFrida: boolean;
  tamperingDetected: boolean;
  trustScore: number; // 0-100
  securityLevel: 'low' | 'medium' | 'high';
}

export interface DeviceInfo {
  deviceId: string;
  brand: string;
  model: string;
  systemName: string;
  systemVersion: string;
  buildNumber: string;
  appVersion: string;
  bundleId: string;
  isTablet: boolean;
  hasNotch: boolean;
  screenSize: {
    width: number;
    height: number;
  };
}

export interface SecurityThreat {
  type: 'root' | 'jailbreak' | 'emulator' | 'debugger' | 'hook' | 'tampering';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected: boolean;
  confidence: number; // 0-100
}

export class DeviceSecurityService {
  private static instance: DeviceSecurityService;
  private deviceInfo: DeviceInfo | null = null;
  private securityStatus: DeviceSecurityStatus | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DeviceSecurityService {
    if (!DeviceSecurityService.instance) {
      DeviceSecurityService.instance = new DeviceSecurityService();
    }
    return DeviceSecurityService.instance;
  }

  /**
   * Initialize device security service
   */
  async initialize(): Promise<void> {
    try {
      // Gather device information
      this.deviceInfo = await this.collectDeviceInfo();
      
      // Perform initial security check
      this.securityStatus = await this.performSecurityCheck();
      
      // Log device security status
      securityLogger.info('device_security_initialized', {
        deviceId: this.deviceInfo.deviceId,
        securityLevel: this.securityStatus.securityLevel,
        trustScore: this.securityStatus.trustScore,
        threats: this.getDetectedThreats(),
      });

      // Start continuous monitoring if high-security mode
      if (SECURITY_CONFIG.monitoring.enableSecurityLogging) {
        this.startContinuousMonitoring();
      }
    } catch (error) {
      securityLogger.error('Device security initialization failed', { error });
      throw new Error('Failed to initialize device security');
    }
  }

  /**
   * Check if device is compromised (rooted/jailbroken)
   */
  async isDeviceCompromised(): Promise<boolean> {
    if (!this.securityStatus) {
      this.securityStatus = await this.performSecurityCheck();
    }

    return this.securityStatus.isRooted || 
           this.securityStatus.isJailbroken || 
           this.securityStatus.tamperingDetected;
  }

  /**
   * Get current device security status
   */
  getSecurityStatus(): DeviceSecurityStatus | null {
    return this.securityStatus;
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Check if app should be blocked due to security threats
   */
  async shouldBlockApp(): Promise<{
    blocked: boolean;
    reason?: string;
    threats: SecurityThreat[];
  }> {
    if (!this.securityStatus) {
      this.securityStatus = await this.performSecurityCheck();
    }

    const threats = this.getDetectedThreats();
    const criticalThreats = threats.filter(t => t.severity === 'critical' && t.detected);
    const highThreats = threats.filter(t => t.severity === 'high' && t.detected);

    // Block if critical threats detected
    if (criticalThreats.length > 0) {
      return {
        blocked: true,
        reason: 'Critical security threats detected',
        threats,
      };
    }

    // Block if multiple high threats or trust score too low
    if (highThreats.length >= 2 || this.securityStatus.trustScore < 30) {
      return {
        blocked: true,
        reason: 'Device security level insufficient',
        threats,
      };
    }

    return {
      blocked: false,
      threats,
    };
  }

  /**
   * Perform comprehensive security check
   */
  async performSecurityCheck(): Promise<DeviceSecurityStatus> {
    const checks = await Promise.all([
      this.checkRootStatus(),
      this.checkJailbreakStatus(),
      this.checkEmulatorStatus(),
      this.checkHookingFrameworks(),
      this.checkDebuggingStatus(),
      this.checkTamperingDetection(),
    ]);

    const [
      isRooted,
      isJailbroken,
      isEmulator,
      hasHooks,
      debuggingInfo,
      tamperingDetected,
    ] = checks;

    const trustScore = this.calculateTrustScore({
      isRooted,
      isJailbroken,
      isEmulator,
      hasHooks,
      isDebuggingEnabled: debuggingInfo.isEnabled,
      isUSBDebuggingEnabled: debuggingInfo.isUSBEnabled,
      tamperingDetected,
    });

    const securityLevel = this.determineSecurityLevel(trustScore);

    return {
      isRooted,
      isJailbroken,
      isEmulator,
      hasHooks: hasHooks.detected,
      isDebuggingEnabled: debuggingInfo.isEnabled,
      isUSBDebuggingEnabled: debuggingInfo.isUSBEnabled,
      hasXposed: hasHooks.xposed,
      hasFrida: hasHooks.frida,
      tamperingDetected,
      trustScore,
      securityLevel,
    };
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<{
    timestamp: string;
    deviceInfo: DeviceInfo;
    securityStatus: DeviceSecurityStatus;
    threats: SecurityThreat[];
    recommendations: string[];
  }> {
    const currentStatus = this.securityStatus || await this.performSecurityCheck();
    const threats = this.getDetectedThreats();
    const recommendations = this.getSecurityRecommendations(threats);

    return {
      timestamp: new Date().toISOString(),
      deviceInfo: this.deviceInfo!,
      securityStatus: currentStatus,
      threats,
      recommendations,
    };
  }

  // Private methods for security checks

  private async checkRootStatus(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      // Check for common root indicators
      const rootIndicators = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
        '/su/bin/su',
      ];

      // Check for root management apps
      const rootApps = [
        'com.noshufou.android.su',
        'com.thirdparty.superuser',
        'eu.chainfire.supersu',
        'com.koushikdutta.superuser',
        'com.zachspong.temprootremovejb',
        'com.ramdroid.appquarantine',
        'com.topjohnwu.magisk',
      ];

      // Check build tags
      const buildTags = await DeviceInfo.getBuildId();
      if (buildTags.includes('test-keys')) {
        return true;
      }

      // In a real implementation, you would check for:
      // - File system access to root paths
      // - Installed root apps
      // - System properties
      // - Native checks through JNI

      return false; // Simplified check
    } catch (error) {
      securityLogger.error('Root check failed', { error });
      return false;
    }
  }

  private async checkJailbreakStatus(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      // Check for common jailbreak indicators
      const jailbreakPaths = [
        '/Applications/Cydia.app',
        '/Library/MobileSubstrate/MobileSubstrate.dylib',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/apt',
        '/private/var/lib/apt',
        '/usr/bin/ssh',
        '/Applications/blackra1n.app',
        '/Applications/IntelliScreen.app',
        '/Applications/Snoop-it Config.app',
      ];

      // Check for jailbreak apps
      const jailbreakApps = [
        'cydia://',
        'sileo://',
        'zbra://',
        'installer://',
      ];

      // In a real implementation, you would:
      // - Check file system access
      // - Verify code signing
      // - Check for dynamic library injection
      // - Verify system integrity

      return false; // Simplified check
    } catch (error) {
      securityLogger.error('Jailbreak check failed', { error });
      return false;
    }
  }

  private async checkEmulatorStatus(): Promise<boolean> {
    try {
      const isEmulator = await DeviceInfo.isEmulator();
      
      if (isEmulator) {
        securityLogger.warn('emulator_detected', {
          brand: await DeviceInfo.getBrand(),
          model: await DeviceInfo.getModel(),
        });
      }

      return isEmulator;
    } catch (error) {
      return false;
    }
  }

  private async checkHookingFrameworks(): Promise<{
    detected: boolean;
    xposed: boolean;
    frida: boolean;
    cydia: boolean;
  }> {
    try {
      let xposed = false;
      let frida = false;
      let cydia = false;

      if (Platform.OS === 'android') {
        // Check for Xposed Framework
        try {
          // Check for Xposed classes
          // In native code: Class.forName("de.robv.android.xposed.XposedHelpers")
          xposed = false; // Simplified
        } catch (error) {
          // Xposed not detected
        }

        // Check for Frida
        try {
          // Check for Frida server port
          // Check for frida-agent libraries
          frida = false; // Simplified
        } catch (error) {
          // Frida not detected
        }
      }

      if (Platform.OS === 'ios') {
        // Check for Cydia Substrate
        try {
          // Check for MobileSubstrate
          cydia = false; // Simplified
        } catch (error) {
          // Cydia not detected
        }
      }

      const detected = xposed || frida || cydia;

      if (detected) {
        securityLogger.warn('hooking_framework_detected', {
          xposed,
          frida,
          cydia,
        });
      }

      return { detected, xposed, frida, cydia };
    } catch (error) {
      return { detected: false, xposed: false, frida: false, cydia: false };
    }
  }

  private async checkDebuggingStatus(): Promise<{
    isEnabled: boolean;
    isUSBEnabled: boolean;
  }> {
    try {
      // Check if debugging is enabled
      const isEnabled = __DEV__; // Simplified check
      
      // Check USB debugging (Android)
      let isUSBEnabled = false;
      if (Platform.OS === 'android') {
        // In native code, check Settings.Global.ADB_ENABLED
        isUSBEnabled = false; // Simplified
      }

      if (isEnabled || isUSBEnabled) {
        securityLogger.warn('debugging_detected', {
          appDebugging: isEnabled,
          usbDebugging: isUSBEnabled,
        });
      }

      return { isEnabled, isUSBEnabled };
    } catch (error) {
      return { isEnabled: false, isUSBEnabled: false };
    }
  }

  private async checkTamperingDetection(): Promise<boolean> {
    try {
      // Check app signature/certificate
      const bundleId = await DeviceInfo.getBundleId();
      const expectedBundleId = 'com.datingprofileoptimizer';
      
      if (bundleId !== expectedBundleId) {
        securityLogger.warn('bundle_id_mismatch', {
          expected: expectedBundleId,
          actual: bundleId,
        });
        return true;
      }

      // Check for code injection
      // Check for modified resources
      // Verify app integrity

      return false; // Simplified
    } catch (error) {
      securityLogger.error('Tampering detection failed', { error });
      return false;
    }
  }

  private async collectDeviceInfo(): Promise<DeviceInfo> {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      brand: await DeviceInfo.getBrand(),
      model: await DeviceInfo.getModel(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      buildNumber: await DeviceInfo.getBuildNumber(),
      appVersion: await DeviceInfo.getVersion(),
      bundleId: await DeviceInfo.getBundleId(),
      isTablet: await DeviceInfo.isTablet(),
      hasNotch: await DeviceInfo.hasNotch(),
      screenSize: {
        width: 0, // Would get from Dimensions
        height: 0,
      },
    };
  }

  private calculateTrustScore(status: Partial<DeviceSecurityStatus>): number {
    let score = 100;

    // Deduct points for security threats
    if (status.isRooted) score -= 40;
    if (status.isJailbroken) score -= 40;
    if (status.isEmulator) score -= 30;
    if (status.hasHooks) score -= 25;
    if (status.isDebuggingEnabled) score -= 15;
    if (status.isUSBDebuggingEnabled) score -= 20;
    if (status.tamperingDetected) score -= 35;

    return Math.max(0, Math.min(100, score));
  }

  private determineSecurityLevel(trustScore: number): 'low' | 'medium' | 'high' {
    if (trustScore >= 80) return 'high';
    if (trustScore >= 50) return 'medium';
    return 'low';
  }

  private getDetectedThreats(): SecurityThreat[] {
    if (!this.securityStatus) return [];

    const threats: SecurityThreat[] = [
      {
        type: 'root',
        severity: 'critical',
        description: 'Device has root access which compromises app security',
        detected: this.securityStatus.isRooted,
        confidence: this.securityStatus.isRooted ? 95 : 0,
      },
      {
        type: 'jailbreak',
        severity: 'critical',
        description: 'Device is jailbroken which compromises app security',
        detected: this.securityStatus.isJailbroken,
        confidence: this.securityStatus.isJailbroken ? 95 : 0,
      },
      {
        type: 'emulator',
        severity: 'high',
        description: 'App is running on an emulator which may indicate testing or malicious activity',
        detected: this.securityStatus.isEmulator,
        confidence: this.securityStatus.isEmulator ? 90 : 0,
      },
      {
        type: 'hook',
        severity: 'high',
        description: 'Hooking frameworks detected which may indicate runtime manipulation',
        detected: this.securityStatus.hasHooks,
        confidence: this.securityStatus.hasHooks ? 80 : 0,
      },
      {
        type: 'debugger',
        severity: 'medium',
        description: 'Debugging is enabled which reduces security',
        detected: this.securityStatus.isDebuggingEnabled,
        confidence: this.securityStatus.isDebuggingEnabled ? 100 : 0,
      },
      {
        type: 'tampering',
        severity: 'critical',
        description: 'App tampering detected which compromises integrity',
        detected: this.securityStatus.tamperingDetected,
        confidence: this.securityStatus.tamperingDetected ? 85 : 0,
      },
    ];

    return threats.filter(threat => threat.detected);
  }

  private getSecurityRecommendations(threats: SecurityThreat[]): string[] {
    const recommendations: string[] = [];

    if (threats.some(t => t.type === 'root' && t.detected)) {
      recommendations.push('Use the app on a non-rooted device for better security');
    }

    if (threats.some(t => t.type === 'jailbreak' && t.detected)) {
      recommendations.push('Use the app on a non-jailbroken device for better security');
    }

    if (threats.some(t => t.type === 'emulator' && t.detected)) {
      recommendations.push('Use the app on a physical device instead of an emulator');
    }

    if (threats.some(t => t.type === 'debugger' && t.detected)) {
      recommendations.push('Disable debugging mode in device settings');
    }

    if (threats.some(t => t.type === 'hook' && t.detected)) {
      recommendations.push('Remove hooking frameworks and security testing tools');
    }

    if (threats.some(t => t.type === 'tampering' && t.detected)) {
      recommendations.push('Reinstall the app from official app store to ensure integrity');
    }

    return recommendations;
  }

  private startContinuousMonitoring(): void {
    // Check security status every 30 seconds
    this.checkInterval = setInterval(async () => {
      try {
        const newStatus = await this.performSecurityCheck();
        
        // Check if security status changed
        if (this.hasSecurityStatusChanged(this.securityStatus!, newStatus)) {
          securityLogger.warn('device_security_changed', {
            previous: this.securityStatus,
            current: newStatus,
          });
          
          this.securityStatus = newStatus;
          
          // Check if app should be blocked
          const blockResult = await this.shouldBlockApp();
          if (blockResult.blocked) {
            securityLogger.critical('device_security_compromised', {
              reason: blockResult.reason,
              threats: blockResult.threats,
            });
          }
        }
      } catch (error) {
        securityLogger.error('Continuous monitoring failed', { error });
      }
    }, 30000);
  }

  private hasSecurityStatusChanged(
    previous: DeviceSecurityStatus,
    current: DeviceSecurityStatus
  ): boolean {
    return (
      previous.isRooted !== current.isRooted ||
      previous.isJailbroken !== current.isJailbroken ||
      previous.isEmulator !== current.isEmulator ||
      previous.hasHooks !== current.hasHooks ||
      previous.isDebuggingEnabled !== current.isDebuggingEnabled ||
      previous.tamperingDetected !== current.tamperingDetected ||
      Math.abs(previous.trustScore - current.trustScore) > 10
    );
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const deviceSecurityService = DeviceSecurityService.getInstance();