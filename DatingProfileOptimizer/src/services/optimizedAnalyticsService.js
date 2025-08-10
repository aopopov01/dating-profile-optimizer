import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { logger } from '../utils/logger';

/**
 * Optimized Analytics Service for Dating Profile Optimizer Mobile App
 * Specialized for dating app user behavior tracking with battery and data optimization
 */
class OptimizedAnalyticsService {
  constructor() {
    this.eventQueue = [];
    this.isInitialized = false;
    this.isOnline = true;
    this.appState = 'active';
    this.sessionId = null;
    this.userId = null;
    this.deviceInfo = {};
    
    // Dating app specific configuration
    this.config = {
      batchSize: 20,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      offlineStorageKey: 'dating_analytics_offline',
      compressionThreshold: 1024, // 1KB
      maxQueueSize: 1000,
      batteryOptimization: true
    };

    // Dating app event types with priority levels
    this.eventPriority = {
      // Critical events (immediate flush)
      critical: [
        'user_registration',
        'purchase_completed',
        'subscription_started',
        'app_crash',
        'security_breach'
      ],
      // High priority events (flush within 10 seconds)
      high: [
        'profile_completed',
        'photo_uploaded',
        'bio_generated',
        'match_created',
        'message_sent',
        'payment_initiated'
      ],
      // Medium priority events (normal batching)
      medium: [
        'profile_viewed',
        'photo_analyzed',
        'swipe_action',
        'filter_applied',
        'search_performed',
        'feature_used'
      ],
      // Low priority events (batch when convenient)
      low: [
        'app_opened',
        'screen_viewed',
        'button_clicked',
        'scroll_action',
        'session_duration'
      ]
    };

    this.flushTimer = null;
    this.retryAttempts = new Map();
    this.sessionStartTime = Date.now();
    
    this.initializeNetworkListener();
    this.initializeAppStateListener();
  }

  /**
   * Initialize the analytics service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.debug('Analytics service already initialized');
      return;
    }

    try {
      // Generate session ID
      this.sessionId = await this.generateSessionId();
      
      // Collect device information
      this.deviceInfo = await this.collectDeviceInfo();
      
      // Load offline events
      await this.loadOfflineEvents();
      
      // Start flush timer
      this.startFlushTimer();
      
      // Track session start
      await this.trackEvent('session_started', {
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo,
        timestamp: Date.now()
      });

      this.isInitialized = true;
      logger.info('Dating app analytics service initialized');
      
    } catch (error) {
      logger.error('Failed to initialize analytics service:', error);
      throw error;
    }
  }

  /**
   * Generate unique session ID
   */
  async generateSessionId() {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const deviceId = await DeviceInfo.getUniqueId();
    return `${deviceId}_${timestamp}_${randomString}`;
  }

  /**
   * Collect device information for dating app analytics
   */
  async collectDeviceInfo() {
    try {
      const [
        brand,
        model,
        systemVersion,
        appVersion,
        buildNumber,
        deviceType,
        isTablet,
        batteryLevel,
        availableMemory,
        totalMemory
      ] = await Promise.all([
        DeviceInfo.getBrand(),
        DeviceInfo.getModel(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.getDeviceType(),
        DeviceInfo.isTablet(),
        DeviceInfo.getBatteryLevel(),
        DeviceInfo.getAvailableMemory(),
        DeviceInfo.getTotalMemory()
      ]);

      return {
        brand,
        model,
        systemVersion,
        appVersion,
        buildNumber,
        deviceType,
        isTablet,
        batteryLevel,
        availableMemory,
        totalMemory,
        platform: DeviceInfo.getSystemName()
      };
    } catch (error) {
      logger.error('Error collecting device info:', error);
      return {};
    }
  }

  /**
   * Initialize network connectivity listener
   */
  initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      if (!wasOnline && this.isOnline) {
        // Came back online - flush offline events
        this.flushOfflineEvents();
      }
      
      // Track network state for dating app usage analysis
      this.trackEvent('network_state_changed', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        effectiveType: state.details?.effectiveType
      }, { priority: 'low' });
    });
  }

  /**
   * Initialize app state listener for battery optimization
   */
  initializeAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      const previousState = this.appState;
      this.appState = nextAppState;
      
      if (previousState === 'active' && nextAppState !== 'active') {
        // App going to background - flush immediately for battery optimization
        this.flushEvents(true);
        this.stopFlushTimer();
      } else if (previousState !== 'active' && nextAppState === 'active') {
        // App coming to foreground - restart timer
        this.startFlushTimer();
        
        // Track session resume
        this.trackEvent('session_resumed', {
          sessionId: this.sessionId,
          backgroundDuration: Date.now() - this.sessionStartTime
        });
      }
      
      // Track app state for engagement analysis
      this.trackEvent('app_state_changed', {
        previousState,
        currentState: nextAppState,
        sessionDuration: Date.now() - this.sessionStartTime
      }, { priority: 'medium' });
    });
  }

  /**
   * Track dating app specific events with optimization
   */
  async trackEvent(eventType, properties = {}, options = {}) {
    try {
      if (!this.isInitialized && eventType !== 'session_started') {
        logger.debug('Analytics not initialized, queuing event:', eventType);
      }

      const priority = this.getEventPriority(eventType);
      const event = {
        id: this.generateEventId(),
        type: eventType,
        properties: {
          ...properties,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: Date.now(),
          appState: this.appState,
          isOnline: this.isOnline,
          platform: this.deviceInfo.platform || 'unknown'
        },
        priority,
        retryCount: 0,
        createdAt: Date.now()
      };

      // Add dating app specific enrichment
      event.properties = await this.enrichDatingEvent(event);

      // Add to queue
      this.eventQueue.push(event);
      
      // Manage queue size
      if (this.eventQueue.length > this.config.maxQueueSize) {
        // Remove oldest low priority events
        this.eventQueue = this.eventQueue
          .filter(e => e.priority !== 'low')
          .slice(-this.config.maxQueueSize);
      }

      // Immediate flush for critical events
      if (priority === 'critical') {
        await this.flushEvents(true);
      } else if (priority === 'high' && this.isOnline) {
        // Flush high priority events quickly
        setTimeout(() => this.flushEvents(), 10000);
      }

      logger.debug(`Tracked ${eventType} event with priority ${priority}`);
      
    } catch (error) {
      logger.error('Error tracking event:', error);
    }
  }

  /**
   * Enrich dating app events with contextual data
   */
  async enrichDatingEvent(event) {
    const enriched = { ...event.properties };
    
    try {
      // Add dating-specific context based on event type
      switch (event.type) {
        case 'profile_viewed':
        case 'profile_completed':
          enriched.profileCompleteness = await this.getProfileCompleteness();
          enriched.photoCount = await this.getPhotoCount();
          break;
          
        case 'photo_uploaded':
        case 'photo_analyzed':
          enriched.totalPhotos = await this.getPhotoCount();
          enriched.hasProfilePhoto = await this.hasProfilePhoto();
          break;
          
        case 'bio_generated':
          enriched.bioLength = enriched.bioText?.length || 0;
          enriched.bioVersion = enriched.bioVersion || 1;
          enriched.generationTime = enriched.processingTime || 0;
          break;
          
        case 'swipe_action':
          enriched.swipeDirection = enriched.direction || 'unknown';
          enriched.profileAge = enriched.targetAge || 0;
          enriched.distance = enriched.targetDistance || 0;
          break;
          
        case 'match_created':
          enriched.isFirstMatch = await this.isFirstMatch();
          enriched.matchQuality = enriched.compatibilityScore || 0;
          break;
          
        case 'purchase_completed':
        case 'subscription_started':
          enriched.purchaseValue = enriched.amount || 0;
          enriched.currency = enriched.currency || 'USD';
          enriched.paymentMethod = enriched.paymentMethod || 'unknown';
          break;
      }

      // Add performance metrics
      if (this.config.batteryOptimization) {
        const batteryLevel = await DeviceInfo.getBatteryLevel();
        if (batteryLevel < 0.2) { // Below 20%
          enriched.lowBattery = true;
        }
      }

      // Add network quality context
      const networkState = await NetInfo.fetch();
      enriched.networkType = networkState.type;
      enriched.networkQuality = this.getNetworkQuality(networkState);
      
    } catch (error) {
      logger.error('Error enriching dating event:', error);
    }
    
    return enriched;
  }

  /**
   * Get network quality score for performance analysis
   */
  getNetworkQuality(networkState) {
    if (!networkState.isConnected) return 0;
    
    const { type, details } = networkState;
    
    switch (type) {
      case 'wifi':
        return details?.strength > 0 ? Math.min(details.strength / 100, 1) : 0.8;
      case 'cellular':
        switch (details?.cellularGeneration) {
          case '5g': return 1.0;
          case '4g': return 0.8;
          case '3g': return 0.4;
          case '2g': return 0.2;
          default: return 0.6;
        }
      default:
        return 0.5;
    }
  }

  /**
   * Get event priority level
   */
  getEventPriority(eventType) {
    for (const [priority, events] of Object.entries(this.eventPriority)) {
      if (events.includes(eventType)) {
        return priority;
      }
    }
    return 'medium'; // Default priority
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Start flush timer for batch processing
   */
  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush events to analytics backend
   */
  async flushEvents(forceFlush = false) {
    if (this.eventQueue.length === 0) return;
    
    if (!this.isOnline && !forceFlush) {
      // Save to offline storage
      await this.saveOfflineEvents();
      return;
    }

    try {
      const batchSize = forceFlush ? this.eventQueue.length : Math.min(this.config.batchSize, this.eventQueue.length);
      const batch = this.eventQueue.splice(0, batchSize);
      
      // Compress batch if needed
      const payload = await this.prepareBatchPayload(batch);
      
      // Send to analytics endpoint
      const success = await this.sendBatch(payload);
      
      if (!success) {
        // Re-add failed events to queue for retry
        this.eventQueue.unshift(...batch.map(event => ({
          ...event,
          retryCount: (event.retryCount || 0) + 1
        })));
      } else {
        logger.debug(`Successfully flushed ${batch.length} events`);
      }
      
    } catch (error) {
      logger.error('Error flushing events:', error);
    }
  }

  /**
   * Prepare batch payload with compression
   */
  async prepareBatchPayload(batch) {
    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      events: batch,
      batchTimestamp: Date.now(),
      batchSize: batch.length
    };

    const payloadString = JSON.stringify(payload);
    
    // Check if compression is beneficial
    if (payloadString.length > this.config.compressionThreshold) {
      // In a real implementation, you would use a compression library
      // For now, we'll just return the payload as-is
      return {
        ...payload,
        compressed: false
      };
    }
    
    return payload;
  }

  /**
   * Send batch to analytics backend
   */
  async sendBatch(payload) {
    try {
      const response = await fetch(`${process.env.API_URL}/api/v1/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 second timeout
      });

      if (response.ok) {
        return true;
      } else {
        logger.error('Analytics batch send failed:', response.status, response.statusText);
        return false;
      }
      
    } catch (error) {
      logger.error('Network error sending analytics batch:', error);
      return false;
    }
  }

  /**
   * Save events to offline storage
   */
  async saveOfflineEvents() {
    try {
      const existingEvents = await this.loadOfflineEventsFromStorage();
      const allEvents = [...existingEvents, ...this.eventQueue];
      
      // Keep only recent events and limit size
      const maxOfflineEvents = 500;
      const recentEvents = allEvents
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, maxOfflineEvents);
      
      await AsyncStorage.setItem(
        this.config.offlineStorageKey,
        JSON.stringify(recentEvents)
      );
      
      this.eventQueue = []; // Clear queue after saving
      logger.debug(`Saved ${recentEvents.length} events offline`);
      
    } catch (error) {
      logger.error('Error saving offline events:', error);
    }
  }

  /**
   * Load offline events from storage
   */
  async loadOfflineEvents() {
    try {
      const offlineEvents = await this.loadOfflineEventsFromStorage();
      this.eventQueue.unshift(...offlineEvents);
      
      // Clear offline storage
      await AsyncStorage.removeItem(this.config.offlineStorageKey);
      
      if (offlineEvents.length > 0) {
        logger.info(`Loaded ${offlineEvents.length} offline events`);
      }
      
    } catch (error) {
      logger.error('Error loading offline events:', error);
    }
  }

  /**
   * Load offline events from AsyncStorage
   */
  async loadOfflineEventsFromStorage() {
    try {
      const storedEvents = await AsyncStorage.getItem(this.config.offlineStorageKey);
      return storedEvents ? JSON.parse(storedEvents) : [];
    } catch (error) {
      logger.error('Error parsing offline events:', error);
      return [];
    }
  }

  /**
   * Flush offline events when coming online
   */
  async flushOfflineEvents() {
    if (this.eventQueue.length > 0) {
      logger.info('Flushing offline events after reconnection');
      await this.flushEvents(true);
    }
  }

  /**
   * Set user ID for analytics tracking
   */
  setUserId(userId) {
    this.userId = userId;
    logger.debug(`Analytics user ID set: ${userId}`);
  }

  /**
   * Track dating app specific user properties
   */
  async trackUserProperties(properties) {
    await this.trackEvent('user_properties_updated', {
      properties,
      updateTimestamp: Date.now()
    }, { priority: 'medium' });
  }

  /**
   * Track dating app screen views
   */
  async trackScreenView(screenName, properties = {}) {
    await this.trackEvent('screen_viewed', {
      screenName,
      ...properties,
      viewTimestamp: Date.now()
    }, { priority: 'low' });
  }

  /**
   * Track dating app user journey milestones
   */
  async trackMilestone(milestone, properties = {}) {
    await this.trackEvent('milestone_reached', {
      milestone,
      ...properties,
      milestoneTimestamp: Date.now()
    }, { priority: 'high' });
  }

  /**
   * Get authentication token for API calls
   */
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      logger.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Dating app specific helper methods
   */
  async getProfileCompleteness() {
    try {
      const profile = await AsyncStorage.getItem('user_profile');
      if (!profile) return 0;
      
      const profileData = JSON.parse(profile);
      let completeness = 0;
      
      if (profileData.name) completeness += 20;
      if (profileData.age) completeness += 20;
      if (profileData.bio) completeness += 20;
      if (profileData.photos && profileData.photos.length > 0) completeness += 20;
      if (profileData.interests && profileData.interests.length > 0) completeness += 20;
      
      return completeness;
    } catch (error) {
      return 0;
    }
  }

  async getPhotoCount() {
    try {
      const photos = await AsyncStorage.getItem('user_photos');
      return photos ? JSON.parse(photos).length : 0;
    } catch (error) {
      return 0;
    }
  }

  async hasProfilePhoto() {
    try {
      const photos = await AsyncStorage.getItem('user_photos');
      const photosData = photos ? JSON.parse(photos) : [];
      return photosData.some(photo => photo.isProfilePhoto);
    } catch (error) {
      return false;
    }
  }

  async isFirstMatch() {
    try {
      const matches = await AsyncStorage.getItem('user_matches');
      const matchData = matches ? JSON.parse(matches) : [];
      return matchData.length <= 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get analytics statistics
   */
  getStats() {
    return {
      queueSize: this.eventQueue.length,
      sessionId: this.sessionId,
      isOnline: this.isOnline,
      appState: this.appState,
      isInitialized: this.isInitialized,
      sessionDuration: Date.now() - this.sessionStartTime,
      retryAttempts: this.retryAttempts.size
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopFlushTimer();
    
    // Flush remaining events
    if (this.eventQueue.length > 0) {
      await this.flushEvents(true);
    }
    
    // Track session end
    await this.trackEvent('session_ended', {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStartTime,
      totalEvents: this.eventQueue.length
    });
    
    logger.info('Analytics service cleaned up');
  }
}

export default new OptimizedAnalyticsService();