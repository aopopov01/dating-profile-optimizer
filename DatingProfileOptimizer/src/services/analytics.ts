import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

export interface UserProperties {
  [key: string]: any;
}

// Analytics event constants (matching backend)
export const ANALYTICS_EVENTS = {
  // User lifecycle
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // Core features
  PHOTO_UPLOADED: 'photo_uploaded',
  PHOTO_ANALYZED: 'photo_analyzed',
  BIO_GENERATED: 'bio_generated',
  BIO_COPIED: 'bio_copied',
  LINKEDIN_HEADSHOT_GENERATED: 'linkedin_headshot_generated',
  HEADSHOT_DOWNLOADED: 'headshot_downloaded',
  
  // Subscription
  SUBSCRIPTION_VIEWED: 'subscription_viewed',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  
  // Engagement
  SCREEN_VIEWED: 'screen_viewed',
  FEATURE_USED: 'feature_used',
  ERROR_OCCURRED: 'error_occurred',
  
  // Business metrics
  REVENUE_GENERATED: 'revenue_generated',
  SUPPORT_CONTACTED: 'support_contacted'
};

class AnalyticsService {
  private static instance: AnalyticsService;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = true;
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeService();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private initializeService() {
    // Start periodic flush of events
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds

    // Flush events when app comes to foreground
    // Note: In a full implementation, you'd listen to app state changes
  }

  // Track a single event
  async track(event: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      const eventData: AnalyticsEvent = {
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString()
      };

      // Add to queue
      this.eventQueue.push(eventData);

      // Try to send immediately if online
      if (this.isOnline && this.eventQueue.length === 1) {
        this.flushEvents();
      }

      // Store in local storage as backup
      await this.storeEventLocally(eventData);

    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Track multiple events in batch
  async trackBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      const enrichedEvents = events.map(event => ({
        ...event,
        timestamp: event.timestamp || new Date().toISOString()
      }));

      this.eventQueue.push(...enrichedEvents);

      // Store locally as backup
      for (const event of enrichedEvents) {
        await this.storeEventLocally(event);
      }

      // Try to flush
      if (this.isOnline) {
        this.flushEvents();
      }

    } catch (error) {
      console.error('Batch analytics tracking error:', error);
    }
  }

  // Identify user with properties
  async identify(userId: string, properties: UserProperties = {}): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      
      if (!token) {
        console.warn('No auth token available for user identification');
        return;
      }

      const response = await fetch('http://localhost:3004/api/analytics/identify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            ...properties,
            platform: 'mobile',
            app_version: '1.0.0' // You could get this from app config
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('User identification failed:', errorData);
      }

    } catch (error) {
      console.error('User identification error:', error);
    }
  }

  // Flush queued events to server
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const token = await AsyncStorage.getItem('@access_token');
      
      if (!token) {
        console.warn('No auth token available for analytics');
        return;
      }

      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch('http://localhost:3004/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend
        })
      });

      if (!response.ok) {
        // If failed, add events back to queue
        this.eventQueue.unshift(...eventsToSend);
        const errorData = await response.json();
        console.error('Analytics batch failed:', errorData);
      } else {
        // Success - remove from local storage
        for (const event of eventsToSend) {
          await this.removeEventFromLocal(event);
        }
      }

    } catch (error) {
      console.error('Analytics flush error:', error);
      // Events remain in queue for retry
    }
  }

  // Store event locally as backup
  private async storeEventLocally(event: AnalyticsEvent): Promise<void> {
    try {
      const key = `analytics_event_${Date.now()}_${Math.random()}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    } catch (error) {
      console.error('Failed to store analytics event locally:', error);
    }
  }

  // Remove event from local storage
  private async removeEventFromLocal(event: AnalyticsEvent): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(key => key.startsWith('analytics_event_'));
      
      for (const key of analyticsKeys) {
        const storedEvent = await AsyncStorage.getItem(key);
        if (storedEvent) {
          const parsed = JSON.parse(storedEvent);
          if (parsed.timestamp === event.timestamp && parsed.event === event.event) {
            await AsyncStorage.removeItem(key);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to remove analytics event from local storage:', error);
    }
  }

  // Load and retry failed events from local storage
  async loadAndRetryFailedEvents(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter(key => key.startsWith('analytics_event_'));
      
      for (const key of analyticsKeys) {
        const eventData = await AsyncStorage.getItem(key);
        if (eventData) {
          const event = JSON.parse(eventData);
          this.eventQueue.push(event);
        }
      }

      // Try to flush
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }

    } catch (error) {
      console.error('Failed to load failed analytics events:', error);
    }
  }

  // Screen tracking helper
  async trackScreenView(screenName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.track(ANALYTICS_EVENTS.SCREEN_VIEWED, {
      screen_name: screenName,
      ...properties
    });
  }

  // Feature usage tracking helper
  async trackFeatureUsage(featureName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.track(ANALYTICS_EVENTS.FEATURE_USED, {
      feature_name: featureName,
      ...properties
    });
  }

  // Error tracking helper
  async trackError(errorMessage: string, errorDetails: Record<string, any> = {}): Promise<void> {
    await this.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_message: errorMessage,
      ...errorDetails
    });
  }

  // Set online/offline status
  setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    
    if (isOnline && this.eventQueue.length > 0) {
      this.flushEvents();
    }
  }

  // Get analytics report (for dashboard)
  async getAnalyticsReport(startDate?: string, endDate?: string): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      
      if (!token) {
        throw new Error('No auth token available');
      }

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`http://localhost:3004/api/analytics/report?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics report');
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to get analytics report:', error);
      throw error;
    }
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining events
    this.flushEvents();
  }
}

// Create singleton instance
const analytics = AnalyticsService.getInstance();

export default analytics;
export { AnalyticsService };