/**
 * Analytics Initializer Service
 * Central service that initializes and coordinates all analytics components
 * Handles configuration, service startup, and graceful shutdown
 */

import { AnalyticsConfig } from '../../types';
import AnalyticsManager from './AnalyticsManager';
import BusinessIntelligenceDashboard from './BusinessIntelligenceDashboard';
import AIPerformanceMonitor from './AIPerformanceMonitor';
import OperationalMetricsMonitor from './OperationalMetricsMonitor';
import MarketingAttributionService from './MarketingAttributionService';
import ReportingAlertingService from './ReportingAlertingService';
import LinkedInAnalyticsService from './LinkedInAnalyticsService';

// Import configuration files
import analyticsConfig from './config/analytics-config.json';
import dashboardsConfig from './config/dashboards.json';

export interface AnalyticsServices {
  analyticsManager: AnalyticsManager;
  biDashboard: BusinessIntelligenceDashboard;
  aiMonitor: AIPerformanceMonitor;
  opsMonitor: OperationalMetricsMonitor;
  marketingAttribution: MarketingAttributionService;
  reportingAlerting: ReportingAlertingService;
  linkedInAnalytics: LinkedInAnalyticsService;
}

export class AnalyticsInitializer {
  private static instance: AnalyticsInitializer;
  private services: AnalyticsServices | null = null;
  private isInitialized = false;
  private config: any;

  private constructor() {
    this.config = analyticsConfig;
  }

  public static getInstance(): AnalyticsInitializer {
    if (!AnalyticsInitializer.instance) {
      AnalyticsInitializer.instance = new AnalyticsInitializer();
    }
    return AnalyticsInitializer.instance;
  }

  /**
   * Initialize all analytics services
   */
  public async initialize(customConfig?: Partial<AnalyticsConfig>): Promise<AnalyticsServices> {
    if (this.isInitialized && this.services) {
      console.warn('Analytics services already initialized');
      return this.services;
    }

    console.log('Initializing comprehensive analytics system...');

    try {
      // Merge custom config with default config
      const finalConfig = this.mergeConfigs(this.config, customConfig);

      // Initialize core analytics manager
      const analyticsManager = AnalyticsManager.getInstance(finalConfig.analytics);
      await analyticsManager.initialize();

      // Initialize other services
      const biDashboard = BusinessIntelligenceDashboard.getInstance();
      const aiMonitor = AIPerformanceMonitor.getInstance();
      const opsMonitor = OperationalMetricsMonitor.getInstance();
      const marketingAttribution = MarketingAttributionService.getInstance();
      const reportingAlerting = ReportingAlertingService.getInstance();
      const linkedInAnalytics = LinkedInAnalyticsService.getInstance();

      this.services = {
        analyticsManager,
        biDashboard,
        aiMonitor,
        opsMonitor,
        marketingAttribution,
        reportingAlerting,
        linkedInAnalytics
      };

      // Configure AI models
      await this.configureAIModels(finalConfig.aiModels);

      // Configure dashboards
      await this.configureDashboards();

      // Configure alerts and reporting
      await this.configureReportingAndAlerts(finalConfig);

      // Start monitoring services
      await this.startMonitoringServices(finalConfig);

      this.isInitialized = true;
      console.log('Analytics system initialized successfully');

      return this.services;

    } catch (error) {
      console.error('Failed to initialize analytics system:', error);
      throw error;
    }
  }

  /**
   * Get initialized services
   */
  public getServices(): AnalyticsServices | null {
    if (!this.isInitialized) {
      console.warn('Analytics services not initialized. Call initialize() first.');
      return null;
    }
    return this.services;
  }

  /**
   * Track user identification across all services
   */
  public async identifyUser(userId: string, userProperties: Record<string, any>): Promise<void> {
    if (!this.services) {
      console.error('Analytics services not initialized');
      return;
    }

    await this.services.analyticsManager.identifyUser(userId, userProperties);
    console.log(`User identified across all analytics services: ${userId}`);
  }

  /**
   * Track a comprehensive event across relevant services
   */
  public async trackEvent(
    eventType: 'user_action' | 'conversion' | 'ai_interaction' | 'business_metric',
    eventData: any
  ): Promise<void> {
    if (!this.services) {
      console.error('Analytics services not initialized');
      return;
    }

    try {
      switch (eventType) {
        case 'user_action':
          await this.services.analyticsManager.trackEvent(eventData);
          break;
        
        case 'conversion':
          await this.services.analyticsManager.trackEvent(eventData);
          await this.services.marketingAttribution.recordConversion(eventData);
          break;
        
        case 'ai_interaction':
          await this.services.analyticsManager.trackAIUsage(eventData);
          if (eventData.feature === 'headshot_generation') {
            await this.services.linkedInAnalytics.trackHeadshotGeneration(eventData);
          }
          break;
        
        case 'business_metric':
          await this.services.analyticsManager.trackBusinessMetrics(eventData);
          break;
      }
    } catch (error) {
      console.error(`Failed to track ${eventType} event:`, error);
    }
  }

  /**
   * Generate and send reports
   */
  public async generateReports(reportType: 'executive' | 'product' | 'marketing' | 'linkedin' | 'operations'): Promise<any> {
    if (!this.services) {
      throw new Error('Analytics services not initialized');
    }

    const dateRange = {
      start: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days ago
      end: new Date().toISOString()
    };

    switch (reportType) {
      case 'executive':
        return await this.services.biDashboard.getExecutiveDashboard(dateRange);
      
      case 'product':
        return await this.services.biDashboard.getProductDashboard(dateRange);
      
      case 'marketing':
        return await this.services.biDashboard.getMarketingDashboard(dateRange);
      
      case 'linkedin':
        return await this.services.biDashboard.getLinkedInDashboard(dateRange);
      
      case 'operations':
        return await this.services.opsMonitor.getPerformanceDashboard(dateRange);
      
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  /**
   * Check system health across all services
   */
  public async getSystemHealth(): Promise<any> {
    if (!this.services) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'healthy',
      services: {
        analyticsManager: this.services.analyticsManager.isReady(),
        aiMonitor: true, // Would check actual service health
        opsMonitor: true,
        reportingAlerting: true
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    if (!this.services) {
      console.log('Analytics services not initialized, nothing to shutdown');
      return;
    }

    console.log('Shutting down analytics services...');

    try {
      // Stop monitoring services
      this.services.aiMonitor.stopMonitoring();
      this.services.opsMonitor.stopMonitoring();
      this.services.reportingAlerting.stop();

      // Clean up resources
      await this.services.analyticsManager.reset();

      this.services = null;
      this.isInitialized = false;

      console.log('Analytics services shut down successfully');

    } catch (error) {
      console.error('Error during analytics shutdown:', error);
    }
  }

  /**
   * Configure AI models for monitoring
   */
  private async configureAIModels(aiModelsConfig: any): Promise<void> {
    if (!this.services) return;

    for (const [modelKey, modelConfig] of Object.entries(aiModelsConfig)) {
      this.services.aiMonitor.registerModel(modelConfig as any);
    }
  }

  /**
   * Configure dashboards
   */
  private async configureDashboards(): Promise<void> {
    // Dashboard configuration is handled by individual services
    // This could be extended to push configuration to external dashboard systems
    console.log('Dashboard configurations loaded from config files');
  }

  /**
   * Configure reporting and alerting
   */
  private async configureReportingAndAlerts(config: any): Promise<void> {
    if (!this.services) return;

    // Configure default alert rules
    if (config.alerts?.defaultRules) {
      for (const rule of config.alerts.defaultRules) {
        this.services.reportingAlerting.configureAlert(rule);
      }
    }

    // Configure default report schedules
    if (config.reporting?.defaultSchedules) {
      for (const [audience, schedule] of Object.entries(config.reporting.defaultSchedules)) {
        const reportConfig = {
          id: `${audience}_default`,
          name: `${audience.charAt(0).toUpperCase() + audience.slice(1)} Report`,
          description: `Default ${audience} report`,
          type: audience as any,
          schedule: schedule as any,
          recipients: [{
            email: `${audience}@company.com`,
            role: audience,
            preferences: {
              format: 'pdf' as const,
              includeCharts: true,
              includeTrends: true,
              includeRecommendations: true
            }
          }],
          dateRange: {
            type: 'relative' as const,
            value: '30d'
          },
          filters: {},
          enabled: false // Disabled by default, enable manually
        };

        this.services.reportingAlerting.configureReport(reportConfig);
      }
    }

    // Create default configurations
    this.services.reportingAlerting.createDefaultReportConfigurations();
    this.services.reportingAlerting.createDefaultAlertRules();
  }

  /**
   * Start monitoring services
   */
  private async startMonitoringServices(config: any): Promise<void> {
    if (!this.services) return;

    // Configure performance thresholds
    if (config.performanceThresholds) {
      this.services.opsMonitor.setThresholds(config.performanceThresholds);
    }

    // Start monitoring
    this.services.aiMonitor.startMonitoring();
    this.services.opsMonitor.startMonitoring();
    this.services.reportingAlerting.start();
  }

  /**
   * Merge configurations
   */
  private mergeConfigs(defaultConfig: any, customConfig?: any): any {
    if (!customConfig) return defaultConfig;

    return {
      ...defaultConfig,
      ...customConfig,
      analytics: {
        ...defaultConfig.analytics,
        ...customConfig.analytics
      }
    };
  }

  /**
   * Helper method to track app launch
   */
  public trackAppLaunch(): void {
    if (!this.services) return;

    const startTime = Date.now();
    
    // Track app launch time when initialization completes
    setTimeout(() => {
      const endTime = Date.now();
      this.services!.opsMonitor.trackAppLaunchTime(startTime, endTime);
    }, 100);
  }

  /**
   * Helper method to track screen navigation
   */
  public trackScreenView(screenName: string, loadTime?: number): void {
    if (!this.services) return;

    const startTime = Date.now();
    
    if (loadTime) {
      this.services.opsMonitor.trackScreenLoadTime(screenName, loadTime);
    }

    this.services.analyticsManager.trackEvent({
      eventType: 'screen_view',
      eventName: 'screen_viewed',
      userId: this.services.analyticsManager.getUserId(),
      properties: {
        screen_name: screenName,
        load_time: loadTime
      },
      platform: 'ios', // Would be detected
      appVersion: '1.0.0' // Would be detected
    });
  }

  /**
   * Helper method to track API calls
   */
  public trackAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    error?: Error
  ): void {
    if (!this.services) return;

    this.services.opsMonitor.trackApiCall(
      endpoint,
      method,
      responseTime,
      statusCode,
      0, // retryCount
      error?.name
    );
  }

  /**
   * Helper method to record crashes
   */
  public recordCrash(error: Error, userId?: string): void {
    if (!this.services) return;

    this.services.opsMonitor.recordCrash(
      error.message,
      error.stack || 'No stack trace available',
      userId,
      'high'
    );
  }
}

export default AnalyticsInitializer;