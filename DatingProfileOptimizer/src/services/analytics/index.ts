/**
 * Analytics Services Export Index
 * Central export point for all analytics services and utilities
 */

// Main services
export { default as AnalyticsInitializer } from './AnalyticsInitializer';
export { default as AnalyticsManager } from './AnalyticsManager';
export { default as BusinessIntelligenceDashboard } from './BusinessIntelligenceDashboard';
export { default as AIPerformanceMonitor } from './AIPerformanceMonitor';
export { default as OperationalMetricsMonitor } from './OperationalMetricsMonitor';
export { default as MarketingAttributionService } from './MarketingAttributionService';
export { default as ReportingAlertingService } from './ReportingAlertingService';
export { default as LinkedInAnalyticsService } from './LinkedInAnalyticsService';

// Type exports
export type {
  AnalyticsServices,
} from './AnalyticsInitializer';

export type {
  PerformanceThresholds,
  AlertConfiguration,
  ResourceUsage,
  ApiEndpointMetrics,
  CrashReport
} from './OperationalMetricsMonitor';

export type {
  AIModelConfig,
  AIPerformanceAlert,
  ModelComparison
} from './AIPerformanceMonitor';

export type {
  TouchpointData,
  AttributionModel,
  ConversionEvent,
  ChannelPerformance
} from './MarketingAttributionService';

export type {
  ReportConfiguration,
  AlertRule,
  AlertChannel,
  GeneratedReport,
  TriggeredAlert
} from './ReportingAlertingService';

export type {
  IndustryMetrics,
  ProfessionalLevelMetrics,
  TAConnectionAnalytics,
  CareerImpactTracking,
  BrandAlignmentMetrics
} from './LinkedInAnalyticsService';

export type {
  BIDashboardData
} from './BusinessIntelligenceDashboard';

/**
 * Quick initialization helper for common use cases
 */
export const initializeAnalytics = async (config?: any) => {
  const initializer = AnalyticsInitializer.getInstance();
  return await initializer.initialize(config);
};

/**
 * Analytics event tracking helpers
 */
export const Analytics = {
  // Initialize analytics system
  init: async (config?: any) => {
    const initializer = AnalyticsInitializer.getInstance();
    const services = await initializer.initialize(config);
    
    // Track app launch automatically
    initializer.trackAppLaunch();
    
    return services;
  },

  // Identify user
  identify: async (userId: string, properties: Record<string, any>) => {
    const initializer = AnalyticsInitializer.getInstance();
    await initializer.identifyUser(userId, properties);
  },

  // Track events
  track: {
    // User actions
    userAction: async (eventName: string, properties: Record<string, any>) => {
      const initializer = AnalyticsInitializer.getInstance();
      await initializer.trackEvent('user_action', {
        eventType: 'user_action',
        eventName,
        properties,
        platform: 'ios', // Would be detected
        appVersion: '1.0.0' // Would be detected
      });
    },

    // Conversions
    conversion: async (eventName: string, value: number, properties: Record<string, any> = {}) => {
      const initializer = AnalyticsInitializer.getInstance();
      await initializer.trackEvent('conversion', {
        eventType: 'conversion',
        eventName,
        eventValue: value,
        properties,
        timestamp: new Date().toISOString()
      });
    },

    // AI interactions
    aiInteraction: async (feature: string, data: any) => {
      const initializer = AnalyticsInitializer.getInstance();
      await initializer.trackEvent('ai_interaction', {
        feature,
        ...data
      });
    },

    // Screen views
    screenView: (screenName: string, loadTime?: number) => {
      const initializer = AnalyticsInitializer.getInstance();
      initializer.trackScreenView(screenName, loadTime);
    },

    // API calls
    apiCall: (endpoint: string, method: string, responseTime: number, statusCode: number, error?: Error) => {
      const initializer = AnalyticsInitializer.getInstance();
      initializer.trackAPICall(endpoint, method, responseTime, statusCode, error);
    },

    // Crashes
    crash: (error: Error, userId?: string) => {
      const initializer = AnalyticsInitializer.getInstance();
      initializer.recordCrash(error, userId);
    }
  },

  // Generate reports
  generateReport: async (type: 'executive' | 'product' | 'marketing' | 'linkedin' | 'operations') => {
    const initializer = AnalyticsInitializer.getInstance();
    return await initializer.generateReports(type);
  },

  // Get system health
  getHealth: async () => {
    const initializer = AnalyticsInitializer.getInstance();
    return await initializer.getSystemHealth();
  },

  // Shutdown
  shutdown: async () => {
    const initializer = AnalyticsInitializer.getInstance();
    await initializer.shutdown();
  }
};

/**
 * React Native lifecycle integration helpers
 */
export const AnalyticsLifecycle = {
  // App state changes
  onAppStateChange: (nextAppState: string) => {
    Analytics.track.userAction('app_state_change', { app_state: nextAppState });
  },

  // Network state changes
  onNetworkStateChange: (isConnected: boolean, type: string) => {
    Analytics.track.userAction('network_state_change', { 
      is_connected: isConnected, 
      network_type: type 
    });
  },

  // Memory warnings
  onMemoryWarning: () => {
    Analytics.track.userAction('memory_warning', {});
  }
};

/**
 * Development utilities
 */
export const AnalyticsDebug = {
  // Enable debug logging
  enableDebugMode: () => {
    // Implementation would enable verbose logging
    console.log('Analytics debug mode enabled');
  },

  // Test event tracking
  testEvent: async () => {
    await Analytics.track.userAction('test_event', { 
      timestamp: new Date().toISOString(),
      test: true 
    });
  },

  // Validate configuration
  validateConfig: (config: any) => {
    // Implementation would validate analytics configuration
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }
};

export default Analytics;