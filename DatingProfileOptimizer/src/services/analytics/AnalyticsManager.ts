/**
 * Comprehensive Analytics Manager
 * Handles all analytics tracking across multiple platforms (Mixpanel, Amplitude, Firebase, Segment)
 * Provides unified interface for both Dating Profile Optimizer and LinkedIn Headshot Generator
 */

import { Mixpanel } from 'mixpanel-react-native';
import { Amplitude } from '@amplitude/analytics-react-native';
import analytics from '@react-native-firebase/analytics';
import { createClient, AnalyticsBrowser } from '@segment/analytics-react-native';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { getLocales } from 'react-native-localize';

import {
  UserBehaviorEvent,
  AnalyticsConfig,
  BusinessMetrics,
  AIUsageAnalytics,
  LinkedInAnalytics,
  ProfessionalMetrics,
  DetailedDeviceInfo,
  NetworkInfo,
  LocationInfo,
  MarketingAttribution,
  ApplicationPerformance,
  ABTestConfig,
  ABTestResult
} from '../../types';

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private config: AnalyticsConfig;
  private mixpanel: Mixpanel;
  private amplitude: Amplitude;
  private segment: AnalyticsBrowser;
  private userId: string | null = null;
  private sessionId: string = '';
  private deviceInfo: DetailedDeviceInfo | null = null;
  private networkInfo: NetworkInfo | null = null;
  private locationInfo: LocationInfo | null = null;
  private isInitialized = false;

  // Event queues for offline mode
  private eventQueue: UserBehaviorEvent[] = [];
  private businessMetricsQueue: BusinessMetrics[] = [];
  private aiAnalyticsQueue: AIUsageAnalytics[] = [];

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(config?: AnalyticsConfig): AnalyticsManager {
    if (!AnalyticsManager.instance && config) {
      AnalyticsManager.instance = new AnalyticsManager(config);
    }
    return AnalyticsManager.instance;
  }

  /**
   * Initialize all analytics platforms
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize device and network info
      await this.initializeDeviceInfo();
      await this.initializeNetworkInfo();
      await this.initializeLocationInfo();

      // Initialize analytics platforms
      await Promise.all([
        this.initializeMixpanel(),
        this.initializeAmplitude(),
        this.initializeFirebase(),
        this.initializeSegment()
      ]);

      // Set up network listener for offline queue processing
      this.setupNetworkListener();

      this.isInitialized = true;
      console.log('AnalyticsManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AnalyticsManager:', error);
      throw error;
    }
  }

  /**
   * Set user identity across all platforms
   */
  public async identifyUser(userId: string, userProperties: Record<string, any>): Promise<void> {
    this.userId = userId;
    
    if (!this.isInitialized) {
      console.warn('AnalyticsManager not initialized, queuing identify event');
      return;
    }

    try {
      await Promise.all([
        this.mixpanel.identify(userId),
        this.amplitude.setUserId(userId),
        analytics().setUserId(userId),
        this.segment.identify(userId, userProperties)
      ]);

      // Set user properties
      await this.setUserProperties(userProperties);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Track user behavior events
   */
  public async trackEvent(event: Omit<UserBehaviorEvent, 'id' | 'timestamp' | 'sessionId' | 'deviceInfo' | 'networkInfo' | 'locationInfo'>): Promise<void> {
    const fullEvent: UserBehaviorEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo!,
      networkInfo: this.networkInfo!,
      locationInfo: this.locationInfo,
    };

    if (!this.isInitialized || !this.networkInfo?.isConnected) {
      this.eventQueue.push(fullEvent);
      return;
    }

    try {
      const eventProperties = {
        ...event.properties,
        event_type: event.eventType,
        session_id: this.sessionId,
        platform: event.platform,
        app_version: event.appVersion,
        user_id: event.userId
      };

      await Promise.all([
        this.mixpanel.track(event.eventName, eventProperties),
        this.amplitude.track(event.eventName, eventProperties),
        analytics().logEvent(this.sanitizeEventName(event.eventName), eventProperties),
        this.segment.track(event.eventName, eventProperties)
      ]);
    } catch (error) {
      console.error('Failed to track event:', error);
      // Queue for retry if tracking fails
      this.eventQueue.push(fullEvent);
    }
  }

  /**
   * Track business metrics
   */
  public async trackBusinessMetrics(metrics: BusinessMetrics): Promise<void> {
    if (!this.isInitialized || !this.networkInfo?.isConnected) {
      this.businessMetricsQueue.push(metrics);
      return;
    }

    try {
      const eventName = 'business_metrics_updated';
      const properties = {
        ...metrics.metrics,
        timestamp: metrics.timestamp,
        user_id: metrics.userId
      };

      await Promise.all([
        this.mixpanel.track(eventName, properties),
        this.amplitude.track(eventName, properties),
        analytics().logEvent(eventName, properties)
      ]);
    } catch (error) {
      console.error('Failed to track business metrics:', error);
      this.businessMetricsQueue.push(metrics);
    }
  }

  /**
   * Track AI usage analytics
   */
  public async trackAIUsage(analytics: AIUsageAnalytics): Promise<void> {
    if (!this.isInitialized || !this.networkInfo?.isConnected) {
      this.aiAnalyticsQueue.push(analytics);
      return;
    }

    try {
      const eventName = `ai_${analytics.feature}_usage`;
      const properties = {
        feature: analytics.feature,
        user_id: analytics.userId,
        processing_time: analytics.performance.processingTime,
        user_rating: analytics.outputQuality.userRating,
        system_confidence: analytics.outputQuality.systemConfidence,
        error_occurred: analytics.performance.errorOccurred,
        accepted_suggestions: analytics.userBehavior.acceptedSuggestions,
        timestamp: analytics.timestamp
      };

      await Promise.all([
        this.mixpanel.track(eventName, properties),
        this.amplitude.track(eventName, properties),
        analytics().logEvent(eventName, properties),
        this.segment.track(eventName, properties)
      ]);
    } catch (error) {
      console.error('Failed to track AI usage:', error);
      this.aiAnalyticsQueue.push(analytics);
    }
  }

  /**
   * Track LinkedIn-specific analytics
   */
  public async trackLinkedInAnalytics(linkedInAnalytics: LinkedInAnalytics): Promise<void> {
    try {
      const eventName = 'linkedin_headshot_generation';
      const properties = {
        ...linkedInAnalytics.properties,
        industry_type: linkedInAnalytics.headshotGeneration.industryType,
        professional_level: linkedInAnalytics.headshotGeneration.professionalLevel,
        brand_alignment: linkedInAnalytics.headshotGeneration.brandAlignment,
        profile_view_improvement: linkedInAnalytics.headshotGeneration.profileViews.improvement,
        network_connections: linkedInAnalytics.headshotGeneration.networkConnections
      };

      await this.trackEvent({
        eventType: 'ai_interaction',
        eventName,
        userId: linkedInAnalytics.userId,
        properties,
        platform: linkedInAnalytics.platform,
        appVersion: linkedInAnalytics.appVersion
      });
    } catch (error) {
      console.error('Failed to track LinkedIn analytics:', error);
    }
  }

  /**
   * Track professional metrics for LinkedIn Headshot Generator
   */
  public async trackProfessionalMetrics(metrics: ProfessionalMetrics): Promise<void> {
    try {
      const eventName = 'professional_outcome_metrics';
      const properties = {
        user_id: metrics.userId,
        quality_score: metrics.headshot.qualityScore,
        professionalism_rating: metrics.headshot.professionalismRating,
        profile_view_increase: metrics.businessOutcome.profileViewIncrease,
        connection_acceptance_rate: metrics.businessOutcome.connectionAcceptanceRate,
        recruiter_inquiries: metrics.businessOutcome.recruiterInquiries,
        ta_connections: metrics.referralNetwork.taConnections,
        viral_coefficient: metrics.referralNetwork.networkViralCoefficient,
        timestamp: metrics.timestamp
      };

      await Promise.all([
        this.mixpanel.track(eventName, properties),
        this.amplitude.track(eventName, properties),
        analytics().logEvent(eventName, properties),
        this.segment.track(eventName, properties)
      ]);
    } catch (error) {
      console.error('Failed to track professional metrics:', error);
    }
  }

  /**
   * Track conversion funnels
   */
  public async trackFunnelStep(funnelName: string, step: string, completed: boolean, properties?: Record<string, any>): Promise<void> {
    const eventName = `funnel_${funnelName}_${step}`;
    const eventProperties = {
      funnel_name: funnelName,
      step_name: step,
      completed,
      step_order: this.getFunnelStepOrder(funnelName, step),
      ...properties
    };

    await this.trackEvent({
      eventType: 'conversion',
      eventName,
      userId: this.userId,
      properties: eventProperties,
      platform: this.deviceInfo?.platform || 'unknown',
      appVersion: this.deviceInfo?.appVersion || '1.0.0'
    });
  }

  /**
   * Track revenue events
   */
  public async trackRevenue(revenue: number, currency: string, productId: string, properties?: Record<string, any>): Promise<void> {
    const eventName = 'revenue_generated';
    const eventProperties = {
      revenue,
      currency,
      product_id: productId,
      ...properties
    };

    try {
      await Promise.all([
        this.mixpanel.track(eventName, eventProperties),
        this.mixpanel.trackCharge(revenue, { currency, ...properties }),
        this.amplitude.revenue().setPrice(revenue).setProductId(productId).commit(),
        analytics().logEvent('purchase', { value: revenue, currency, items: [{ item_id: productId }] }),
        this.segment.track(eventName, eventProperties)
      ]);
    } catch (error) {
      console.error('Failed to track revenue:', error);
    }
  }

  /**
   * Track A/B test events
   */
  public async trackABTest(testId: string, variant: string, event: string, properties?: Record<string, any>): Promise<void> {
    const eventName = `ab_test_${event}`;
    const eventProperties = {
      ab_test_id: testId,
      ab_test_variant: variant,
      ...properties
    };

    await this.trackEvent({
      eventType: 'conversion',
      eventName,
      userId: this.userId,
      properties: eventProperties,
      platform: this.deviceInfo?.platform || 'unknown',
      appVersion: this.deviceInfo?.appVersion || '1.0.0'
    });
  }

  /**
   * Set user properties across all platforms
   */
  public async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await Promise.all([
        this.mixpanel.getPeople().set(properties),
        this.amplitude.identify({ user_properties: properties }),
        analytics().setUserProperties(properties),
        this.segment.identify(this.userId!, properties)
      ]);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  /**
   * Track application performance metrics
   */
  public async trackPerformance(performance: ApplicationPerformance): Promise<void> {
    try {
      const eventName = 'app_performance_metrics';
      const properties = {
        app_launch_time: performance.metrics.appLaunchTime,
        crash_rate: performance.metrics.crashRate,
        memory_usage: performance.metrics.memoryUsage,
        cpu_usage: performance.metrics.cpuUsage,
        uptime: performance.metrics.uptime,
        error_rate: performance.metrics.errorRate,
        user_rating: performance.metrics.userRating,
        timestamp: performance.timestamp
      };

      await Promise.all([
        this.mixpanel.track(eventName, properties),
        this.amplitude.track(eventName, properties),
        analytics().logEvent(eventName, properties)
      ]);
    } catch (error) {
      console.error('Failed to track performance metrics:', error);
    }
  }

  /**
   * Initialize device information
   */
  private async initializeDeviceInfo(): Promise<void> {
    try {
      const [
        deviceId,
        manufacturer,
        brand,
        model,
        systemName,
        systemVersion,
        buildNumber,
        bundleId,
        version,
        timezone,
        isEmulator,
        totalMemory
      ] = await Promise.all([
        DeviceInfo.getUniqueId(),
        DeviceInfo.getManufacturer(),
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getBundleId(),
        DeviceInfo.getVersion(),
        DeviceInfo.getTimezone(),
        DeviceInfo.isEmulator(),
        DeviceInfo.getTotalMemory()
      ]);

      this.deviceInfo = {
        platform: systemName.toLowerCase() === 'ios' ? 'ios' : 'android',
        version: systemVersion,
        model,
        screenSize: { width: 0, height: 0 }, // Will be updated when available
        appVersion: version,
        deviceId,
        manufacturer,
        brand,
        buildNumber,
        bundleId,
        systemName,
        systemVersion,
        timezone,
        isEmulator,
        totalMemory,
        availableMemory: 0 // Will be updated periodically
      };
    } catch (error) {
      console.error('Failed to initialize device info:', error);
    }
  }

  /**
   * Initialize network information
   */
  private async initializeNetworkInfo(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      this.networkInfo = {
        type: this.mapNetworkType(netInfo.type),
        isConnected: netInfo.isConnected || false,
        speed: netInfo.details?.linkSpeed,
        strength: netInfo.details?.strength,
        carrier: netInfo.details?.cellularGeneration
      };
    } catch (error) {
      console.error('Failed to initialize network info:', error);
      this.networkInfo = {
        type: 'unknown',
        isConnected: true
      };
    }
  }

  /**
   * Initialize location information
   */
  private async initializeLocationInfo(): Promise<void> {
    try {
      const locales = getLocales();
      const primaryLocale = locales[0];
      
      this.locationInfo = {
        country: primaryLocale.countryCode,
        region: primaryLocale.languageCode,
        timezone: primaryLocale.identifier
      };
    } catch (error) {
      console.error('Failed to initialize location info:', error);
    }
  }

  /**
   * Initialize Mixpanel
   */
  private async initializeMixpanel(): Promise<void> {
    try {
      this.mixpanel = new Mixpanel(this.config.mixpanel.token, this.config.mixpanel.trackAutomaticEvents);
      await this.mixpanel.init();
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
    }
  }

  /**
   * Initialize Amplitude
   */
  private async initializeAmplitude(): Promise<void> {
    try {
      this.amplitude = Amplitude.getInstance();
      await this.amplitude.init(this.config.amplitude.apiKey, {
        trackingOptions: this.config.amplitude.trackingOptions
      });
    } catch (error) {
      console.error('Failed to initialize Amplitude:', error);
    }
  }

  /**
   * Initialize Firebase Analytics
   */
  private async initializeFirebase(): Promise<void> {
    try {
      await analytics().setAnalyticsCollectionEnabled(this.config.firebase.enabled);
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
    }
  }

  /**
   * Initialize Segment
   */
  private async initializeSegment(): Promise<void> {
    try {
      this.segment = createClient({
        writeKey: this.config.segment.writeKey,
        trackAppLifecycleEvents: this.config.segment.trackAppLifecycleEvents
      });
    } catch (error) {
      console.error('Failed to initialize Segment:', error);
    }
  }

  /**
   * Set up network listener for offline queue processing
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasConnected = this.networkInfo?.isConnected;
      this.networkInfo = {
        type: this.mapNetworkType(state.type),
        isConnected: state.isConnected || false,
        speed: state.details?.linkSpeed,
        strength: state.details?.strength,
        carrier: state.details?.cellularGeneration
      };

      // Process queued events when coming back online
      if (!wasConnected && this.networkInfo.isConnected) {
        this.processQueuedEvents();
      }
    });
  }

  /**
   * Process queued events when network comes back online
   */
  private async processQueuedEvents(): Promise<void> {
    console.log(`Processing ${this.eventQueue.length + this.businessMetricsQueue.length + this.aiAnalyticsQueue.length} queued events`);

    // Process user behavior events
    const eventPromises = this.eventQueue.splice(0).map(event => 
      this.trackEvent(event).catch(err => console.error('Failed to process queued event:', err))
    );

    // Process business metrics
    const businessPromises = this.businessMetricsQueue.splice(0).map(metrics => 
      this.trackBusinessMetrics(metrics).catch(err => console.error('Failed to process queued business metrics:', err))
    );

    // Process AI analytics
    const aiPromises = this.aiAnalyticsQueue.splice(0).map(analytics => 
      this.trackAIUsage(analytics).catch(err => console.error('Failed to process queued AI analytics:', err))
    );

    await Promise.all([...eventPromises, ...businessPromises, ...aiPromises]);
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeEventName(eventName: string): string {
    return eventName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  private mapNetworkType(type: string): 'wifi' | 'cellular' | 'none' | 'unknown' {
    switch (type.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'none':
        return 'none';
      default:
        return 'unknown';
    }
  }

  private getFunnelStepOrder(funnelName: string, step: string): number {
    const funnelSteps: Record<string, string[]> = {
      'onboarding': ['signup', 'profile_creation', 'photo_upload', 'analysis_complete'],
      'conversion': ['analysis_view', 'upgrade_prompt', 'payment_start', 'payment_complete'],
      'optimization': ['results_view', 'platform_selection', 'optimization_apply', 'success_share']
    };

    const steps = funnelSteps[funnelName] || [];
    return steps.indexOf(step) + 1;
  }

  /**
   * Cleanup and reset
   */
  public async reset(): Promise<void> {
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.eventQueue = [];
    this.businessMetricsQueue = [];
    this.aiAnalyticsQueue = [];

    if (this.isInitialized) {
      try {
        await Promise.all([
          this.mixpanel.reset(),
          this.amplitude.setUserId(null),
          analytics().resetAnalyticsData()
        ]);
      } catch (error) {
        console.error('Failed to reset analytics:', error);
      }
    }
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current user ID
   */
  public getUserId(): string | null {
    return this.userId;
  }

  /**
   * Check if analytics is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

export default AnalyticsManager;