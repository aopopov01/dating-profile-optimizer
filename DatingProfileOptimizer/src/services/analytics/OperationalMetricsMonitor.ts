/**
 * Operational Metrics Monitor
 * Tracks application performance, reliability, resource usage, and user experience
 * Provides real-time monitoring and alerting for operational issues
 */

import { 
  ApplicationPerformance, 
  SecurityMetrics, 
  UserBehaviorEvent, 
  DateRange 
} from '../../types';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { performance } from 'react-native-performance';

export interface PerformanceThresholds {
  appLaunchTime: number; // milliseconds
  screenLoadTime: number; // milliseconds
  apiResponseTime: number; // milliseconds
  crashRate: number; // percentage
  anrRate: number; // percentage
  memoryUsageLimit: number; // MB
  cpuUsageLimit: number; // percentage
  networkLatency: number; // milliseconds
}

export interface AlertConfiguration {
  id: string;
  metric: string;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  channels: ('console' | 'analytics' | 'webhook')[];
}

export interface ResourceUsage {
  timestamp: string;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  networkUsage: {
    bytesReceived: number;
    bytesSent: number;
  };
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
  batteryUsage: number;
}

export interface ApiEndpointMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  timestamp: string;
  retryCount: number;
  errorType?: string;
}

export interface CrashReport {
  id: string;
  timestamp: string;
  errorMessage: string;
  stackTrace: string;
  userId?: string;
  deviceInfo: any;
  appVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class OperationalMetricsMonitor {
  private static instance: OperationalMetricsMonitor;
  private performanceData: ApplicationPerformance[] = [];
  private securityMetrics: SecurityMetrics[] = [];
  private resourceUsageHistory: ResourceUsage[] = [];
  private apiMetrics: Map<string, ApiEndpointMetrics[]> = new Map();
  private crashReports: CrashReport[] = [];
  private alerts: AlertConfiguration[] = [];
  private thresholds: PerformanceThresholds;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.thresholds = {
      appLaunchTime: 3000, // 3 seconds
      screenLoadTime: 1000, // 1 second
      apiResponseTime: 2000, // 2 seconds
      crashRate: 0.01, // 1%
      anrRate: 0.005, // 0.5%
      memoryUsageLimit: 512, // 512 MB
      cpuUsageLimit: 80, // 80%
      networkLatency: 1000 // 1 second
    };

    this.initializeDefaultAlerts();
  }

  public static getInstance(): OperationalMetricsMonitor {
    if (!OperationalMetricsMonitor.instance) {
      OperationalMetricsMonitor.instance = new OperationalMetricsMonitor();
    }
    return OperationalMetricsMonitor.instance;
  }

  /**
   * Start monitoring operational metrics
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Operational monitoring already running');
      return;
    }

    this.isMonitoring = true;

    // Monitor resource usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, 30000);

    // Monitor performance every minute
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000);

    // Security monitoring every 5 minutes
    setInterval(() => {
      this.collectSecurityMetrics();
    }, 300000);

    console.log('Operational Metrics Monitor started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Operational Metrics Monitor stopped');
  }

  /**
   * Track app launch time
   */
  public trackAppLaunchTime(startTime: number, endTime: number): void {
    const launchTime = endTime - startTime;
    
    this.recordPerformanceMetric('appLaunchTime', launchTime);
    
    if (launchTime > this.thresholds.appLaunchTime) {
      this.triggerAlert('app_launch_slow', launchTime);
    }
  }

  /**
   * Track screen load time
   */
  public trackScreenLoadTime(screenName: string, loadTime: number): void {
    this.recordPerformanceMetric(`screenLoadTime_${screenName}`, loadTime);
    
    if (loadTime > this.thresholds.screenLoadTime) {
      this.triggerAlert('screen_load_slow', loadTime, { screen: screenName });
    }
  }

  /**
   * Track API call performance
   */
  public trackApiCall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    retryCount = 0,
    errorType?: string
  ): void {
    const metrics: ApiEndpointMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      success: statusCode >= 200 && statusCode < 300,
      timestamp: new Date().toISOString(),
      retryCount,
      errorType
    };

    const endpointKey = `${method}_${endpoint}`;
    const endpointMetrics = this.apiMetrics.get(endpointKey) || [];
    endpointMetrics.push(metrics);
    
    // Keep only last 1000 metrics per endpoint
    if (endpointMetrics.length > 1000) {
      endpointMetrics.splice(0, endpointMetrics.length - 1000);
    }
    
    this.apiMetrics.set(endpointKey, endpointMetrics);

    // Check for performance issues
    if (responseTime > this.thresholds.apiResponseTime) {
      this.triggerAlert('api_slow_response', responseTime, { endpoint, method });
    }

    if (!metrics.success) {
      this.triggerAlert('api_error', statusCode, { endpoint, method, errorType });
    }
  }

  /**
   * Record crash report
   */
  public recordCrash(
    errorMessage: string,
    stackTrace: string,
    userId?: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
  ): void {
    const crashReport: CrashReport = {
      id: this.generateCrashId(),
      timestamp: new Date().toISOString(),
      errorMessage,
      stackTrace,
      userId,
      deviceInfo: this.getCurrentDeviceInfo(),
      appVersion: DeviceInfo.getVersion(),
      severity,
      resolved: false
    };

    this.crashReports.push(crashReport);
    
    // Trigger immediate alert for crashes
    this.triggerAlert('app_crash', 1, { 
      crashId: crashReport.id, 
      severity, 
      errorMessage: errorMessage.substring(0, 100) 
    });

    console.error('Crash recorded:', crashReport);
  }

  /**
   * Record ANR (Application Not Responding) event
   */
  public recordANR(duration: number, context: string): void {
    this.recordPerformanceMetric('anrDuration', duration);
    
    this.triggerAlert('anr_detected', duration, { context });
    
    console.warn(`ANR detected: ${duration}ms in ${context}`);
  }

  /**
   * Get performance dashboard data
   */
  public getPerformanceDashboard(dateRange: DateRange): any {
    const filteredData = this.filterPerformanceByDateRange(dateRange);
    const apiData = this.getApiMetricsInRange(dateRange);
    
    return {
      overview: {
        averageAppLaunchTime: this.calculateAverageMetric(filteredData, 'appLaunchTime'),
        crashRate: this.calculateCrashRate(dateRange),
        anrRate: this.calculateANRRate(dateRange),
        apiSuccessRate: this.calculateApiSuccessRate(apiData),
        averageApiResponseTime: this.calculateAverageApiResponseTime(apiData)
      },
      trends: {
        performance: this.calculatePerformanceTrends(filteredData),
        crashes: this.calculateCrashTrends(dateRange),
        apiMetrics: this.calculateApiTrends(apiData)
      },
      resourceUsage: this.getResourceUsageSummary(dateRange),
      topIssues: this.getTopPerformanceIssues(dateRange),
      recommendations: this.generatePerformanceRecommendations(filteredData)
    };
  }

  /**
   * Get API performance metrics
   */
  public getApiPerformanceMetrics(dateRange: DateRange): any {
    const apiData = this.getApiMetricsInRange(dateRange);
    const endpointPerformance: Record<string, any> = {};

    for (const [endpoint, metrics] of apiData) {
      const filteredMetrics = this.filterApiMetricsByDateRange(metrics, dateRange);
      
      if (filteredMetrics.length > 0) {
        endpointPerformance[endpoint] = {
          totalCalls: filteredMetrics.length,
          successRate: filteredMetrics.filter(m => m.success).length / filteredMetrics.length,
          averageResponseTime: filteredMetrics.reduce((sum, m) => sum + m.responseTime, 0) / filteredMetrics.length,
          errorRate: filteredMetrics.filter(m => !m.success).length / filteredMetrics.length,
          p95ResponseTime: this.calculateP95ResponseTime(filteredMetrics),
          errors: this.groupApiErrors(filteredMetrics.filter(m => !m.success))
        };
      }
    }

    return {
      endpointPerformance,
      overallMetrics: this.calculateOverallApiMetrics(apiData, dateRange),
      slowestEndpoints: this.getSlowestEndpoints(endpointPerformance),
      mostErrorProneEndpoints: this.getMostErrorProneEndpoints(endpointPerformance)
    };
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(dateRange: DateRange): SecurityMetrics[] {
    return this.securityMetrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= new Date(dateRange.start) && metricDate <= new Date(dateRange.end);
    });
  }

  /**
   * Get crash analytics
   */
  public getCrashAnalytics(dateRange: DateRange): any {
    const crashes = this.getCrashesInRange(dateRange);
    
    const crashesByType = this.groupCrashesByType(crashes);
    const crashesByDevice = this.groupCrashesByDevice(crashes);
    const crashesByVersion = this.groupCrashesByVersion(crashes);
    
    return {
      totalCrashes: crashes.length,
      uniqueCrashes: Object.keys(crashesByType).length,
      crashRate: this.calculateCrashRate(dateRange),
      crashTrends: this.calculateCrashTrends(dateRange),
      crashesByType,
      crashesByDevice,
      crashesByVersion,
      topCrashes: this.getTopCrashes(crashes),
      resolvedCrashes: crashes.filter(c => c.resolved).length,
      criticalCrashes: crashes.filter(c => c.severity === 'critical').length
    };
  }

  /**
   * Configure performance thresholds
   */
  public setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('Performance thresholds updated:', this.thresholds);
  }

  /**
   * Configure alerts
   */
  public configureAlerts(alerts: AlertConfiguration[]): void {
    this.alerts = alerts;
    console.log('Alert configuration updated');
  }

  /**
   * Private methods for data collection and processing
   */
  private async collectResourceMetrics(): Promise<void> {
    try {
      const [
        usedMemory,
        totalMemory,
        batteryLevel
      ] = await Promise.all([
        DeviceInfo.getUsedMemory(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getBatteryLevel()
      ]);

      const resourceUsage: ResourceUsage = {
        timestamp: new Date().toISOString(),
        memoryUsage: {
          used: usedMemory / (1024 * 1024), // Convert to MB
          total: totalMemory / (1024 * 1024), // Convert to MB
          percentage: (usedMemory / totalMemory) * 100
        },
        cpuUsage: await this.getCPUUsage(),
        networkUsage: {
          bytesReceived: 0, // Would be implemented with network monitoring
          bytesSent: 0
        },
        storageUsage: {
          used: 0, // Would be implemented with storage monitoring
          available: 0,
          percentage: 0
        },
        batteryUsage: batteryLevel
      };

      this.resourceUsageHistory.push(resourceUsage);
      
      // Keep only last 2880 entries (24 hours at 30-second intervals)
      if (this.resourceUsageHistory.length > 2880) {
        this.resourceUsageHistory.splice(0, this.resourceUsageHistory.length - 2880);
      }

      // Check thresholds
      if (resourceUsage.memoryUsage.used > this.thresholds.memoryUsageLimit) {
        this.triggerAlert('high_memory_usage', resourceUsage.memoryUsage.used);
      }

      if (resourceUsage.cpuUsage > this.thresholds.cpuUsageLimit) {
        this.triggerAlert('high_cpu_usage', resourceUsage.cpuUsage);
      }

    } catch (error) {
      console.error('Failed to collect resource metrics:', error);
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    const performanceMetrics: ApplicationPerformance = {
      timestamp: new Date().toISOString(),
      metrics: {
        appLaunchTime: this.getAverageAppLaunchTime(),
        screenLoadTimes: this.getAverageScreenLoadTimes(),
        apiResponseTimes: this.getAverageApiResponseTimes(),
        crashRate: this.calculateRecentCrashRate(),
        anrRate: this.calculateRecentANRRate(),
        memoryUsage: this.getCurrentMemoryUsage(),
        cpuUsage: await this.getCPUUsage(),
        batteryUsage: await this.getBatteryUsage(),
        networkLatency: await this.measureNetworkLatency(),
        uptime: this.calculateUptime(),
        errorRate: this.calculateRecentErrorRate(),
        successRate: this.calculateRecentSuccessRate(),
        timeouts: this.countRecentTimeouts(),
        retries: this.countRecentRetries(),
        dataUsage: this.calculateDataUsage(),
        storageUsage: this.getCurrentStorageUsage(),
        bandwidthUsage: this.calculateBandwidthUsage(),
        apiCallCount: this.countRecentApiCalls(),
        userRating: 0, // Would be updated from app store data
        supportTickets: 0, // Would be updated from support system
        bugReports: this.countRecentBugReports(),
        featureRequests: 0 // Would be updated from feedback system
      }
    };

    this.performanceData.push(performanceMetrics);
    
    // Keep only last 1440 entries (24 hours at 1-minute intervals)
    if (this.performanceData.length > 1440) {
      this.performanceData.splice(0, this.performanceData.length - 1440);
    }
  }

  private async collectSecurityMetrics(): Promise<void> {
    const securityMetrics: SecurityMetrics = {
      timestamp: new Date().toISOString(),
      metrics: {
        authenticationAttempts: this.countAuthenticationAttempts(),
        failedLogins: this.countFailedLogins(),
        suspiciousActivity: this.detectSuspiciousActivity(),
        dataBreachAttempts: 0,
        encryptionFailures: 0,
        certificateIssues: 0,
        privacyViolations: 0,
        complianceScore: 0.95
      },
      incidents: []
    };

    this.securityMetrics.push(securityMetrics);
    
    // Keep only last 288 entries (24 hours at 5-minute intervals)
    if (this.securityMetrics.length > 288) {
      this.securityMetrics.splice(0, this.securityMetrics.length - 288);
    }
  }

  private recordPerformanceMetric(metric: string, value: number): void {
    // Record individual performance metrics for detailed tracking
    console.log(`Performance metric recorded: ${metric} = ${value}`);
  }

  private triggerAlert(alertType: string, value: number, context?: any): void {
    const alert = this.alerts.find(a => a.metric === alertType);
    
    if (alert && alert.enabled) {
      console.warn(`Alert triggered: ${alertType} = ${value}`, context);
      
      // In production, this would send alerts through configured channels
      if (alert.channels.includes('analytics')) {
        // Send to analytics
      }
      
      if (alert.channels.includes('webhook')) {
        // Send to webhook
      }
    }
  }

  private initializeDefaultAlerts(): void {
    this.alerts = [
      {
        id: 'app_launch_slow',
        metric: 'app_launch_slow',
        threshold: this.thresholds.appLaunchTime,
        severity: 'warning',
        enabled: true,
        channels: ['console', 'analytics']
      },
      {
        id: 'high_memory_usage',
        metric: 'high_memory_usage',
        threshold: this.thresholds.memoryUsageLimit,
        severity: 'critical',
        enabled: true,
        channels: ['console', 'analytics', 'webhook']
      },
      {
        id: 'app_crash',
        metric: 'app_crash',
        threshold: 1,
        severity: 'critical',
        enabled: true,
        channels: ['console', 'analytics', 'webhook']
      }
    ];
  }

  // Helper methods (mock implementations for complex calculations)
  private filterPerformanceByDateRange(dateRange: DateRange): ApplicationPerformance[] {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    return this.performanceData.filter(data => {
      const dataDate = new Date(data.timestamp);
      return dataDate >= start && dataDate <= end;
    });
  }

  private getApiMetricsInRange(dateRange: DateRange): Map<string, ApiEndpointMetrics[]> {
    const result = new Map();
    
    for (const [endpoint, metrics] of this.apiMetrics) {
      const filtered = this.filterApiMetricsByDateRange(metrics, dateRange);
      if (filtered.length > 0) {
        result.set(endpoint, filtered);
      }
    }
    
    return result;
  }

  private filterApiMetricsByDateRange(metrics: ApiEndpointMetrics[], dateRange: DateRange): ApiEndpointMetrics[] {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    return metrics.filter(metric => {
      const metricDate = new Date(metric.timestamp);
      return metricDate >= start && metricDate <= end;
    });
  }

  private calculateAverageMetric(data: ApplicationPerformance[], metric: string): number {
    if (data.length === 0) return 0;
    
    const values = data.map(d => (d.metrics as any)[metric]).filter(v => v !== undefined);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  private getCurrentDeviceInfo(): any {
    return {
      model: DeviceInfo.getModel(),
      systemName: DeviceInfo.getSystemName(),
      systemVersion: DeviceInfo.getSystemVersion()
    };
  }

  private generateCrashId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock implementations for complex calculations
  private async getCPUUsage(): Promise<number> { return Math.random() * 100; }
  private async getBatteryUsage(): Promise<number> { return await DeviceInfo.getBatteryLevel(); }
  private async measureNetworkLatency(): Promise<number> { return Math.random() * 1000; }
  private calculateUptime(): number { return Date.now(); }
  private calculateCrashRate(dateRange: DateRange): number { return 0.001; }
  private calculateANRRate(dateRange: DateRange): number { return 0.0005; }
  private calculateApiSuccessRate(apiData: Map<string, ApiEndpointMetrics[]>): number { return 0.99; }
  private calculateAverageApiResponseTime(apiData: Map<string, ApiEndpointMetrics[]>): number { return 500; }
  private calculatePerformanceTrends(data: ApplicationPerformance[]): any { return {}; }
  private calculateCrashTrends(dateRange: DateRange): any { return {}; }
  private calculateApiTrends(apiData: Map<string, ApiEndpointMetrics[]>): any { return {}; }
  private getResourceUsageSummary(dateRange: DateRange): any { return {}; }
  private getTopPerformanceIssues(dateRange: DateRange): any[] { return []; }
  private generatePerformanceRecommendations(data: ApplicationPerformance[]): string[] { return []; }
  private calculateP95ResponseTime(metrics: ApiEndpointMetrics[]): number { return 1000; }
  private groupApiErrors(metrics: ApiEndpointMetrics[]): any { return {}; }
  private calculateOverallApiMetrics(apiData: Map<string, ApiEndpointMetrics[]>, dateRange: DateRange): any { return {}; }
  private getSlowestEndpoints(endpointPerformance: Record<string, any>): any[] { return []; }
  private getMostErrorProneEndpoints(endpointPerformance: Record<string, any>): any[] { return []; }
  private getCrashesInRange(dateRange: DateRange): CrashReport[] { return []; }
  private groupCrashesByType(crashes: CrashReport[]): any { return {}; }
  private groupCrashesByDevice(crashes: CrashReport[]): any { return {}; }
  private groupCrashesByVersion(crashes: CrashReport[]): any { return {}; }
  private getTopCrashes(crashes: CrashReport[]): any[] { return []; }
  private getAverageAppLaunchTime(): number { return 2000; }
  private getAverageScreenLoadTimes(): Record<string, number> { return {}; }
  private getAverageApiResponseTimes(): Record<string, number> { return {}; }
  private calculateRecentCrashRate(): number { return 0.001; }
  private calculateRecentANRRate(): number { return 0.0005; }
  private getCurrentMemoryUsage(): number { return 256; }
  private calculateRecentErrorRate(): number { return 0.01; }
  private calculateRecentSuccessRate(): number { return 0.99; }
  private countRecentTimeouts(): number { return 5; }
  private countRecentRetries(): number { return 10; }
  private calculateDataUsage(): number { return 1024; }
  private getCurrentStorageUsage(): number { return 512; }
  private calculateBandwidthUsage(): number { return 2048; }
  private countRecentApiCalls(): number { return 100; }
  private countRecentBugReports(): number { return 2; }
  private countAuthenticationAttempts(): number { return 150; }
  private countFailedLogins(): number { return 5; }
  private detectSuspiciousActivity(): number { return 0; }
}

export default OperationalMetricsMonitor;