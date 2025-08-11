import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification, { Importance } from 'react-native-push-notification';
import { AuthService } from './AuthService';
import { analytics } from './analytics';

interface NotificationData {
  notificationId: string;
  category: string;
  deepLinkUrl?: string;
  [key: string]: any;
}

interface NotificationPreferences {
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories: {
    onboardingWelcome: boolean;
    bioCompletion: boolean;
    photoAnalysisReady: boolean;
    subscriptionRenewal: boolean;
    subscriptionOffer: boolean;
    profilePerformance: boolean;
    weeklyInsights: boolean;
    securityAlert: boolean;
    featureUpdate: boolean;
    engagementBoost: boolean;
    tipsEducational: boolean;
    general: boolean;
  };
  maxDailyNotifications: number;
}

class PushNotificationService {
  private isInitialized = false;
  private currentToken: string | null = null;
  private preferences: NotificationPreferences | null = null;
  private notificationHandler: ((notification: any) => void) | null = null;
  private deepLinkHandler: ((url: string) => void) | null = null;
  
  private readonly API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
  private readonly STORAGE_KEYS = {
    FCM_TOKEN: '@push_notification_token',
    PREFERENCES: '@notification_preferences',
    PERMISSION_ASKED: '@notification_permission_asked'
  };

  constructor() {
    this.setupNotificationChannels();
  }

  // Initialize push notification service
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('Initializing Push Notification Service...');

      // Request permissions
      const hasPermission = await this.requestUserPermission();
      if (!hasPermission) {
        console.warn('Push notification permission denied');
        return false;
      }

      // Get FCM token
      const token = await this.getFCMToken();
      if (!token) {
        console.error('Failed to get FCM token');
        return false;
      }

      // Register token with backend
      await this.registerTokenWithBackend(token);

      // Load user preferences
      await this.loadNotificationPreferences();

      // Set up message handlers
      this.setupMessageHandlers();

      // Set up background handlers
      this.setupBackgroundHandlers();

      this.isInitialized = true;
      console.log('Push Notification Service initialized successfully');

      // Track initialization
      analytics.track('push_notification_initialized', {
        platform: Platform.OS,
        hasPermission: true
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      
      analytics.track('push_notification_init_failed', {
        error: error.message,
        platform: Platform.OS
      });

      return false;
    }
  }

  // Request user permission for notifications
  private async requestUserPermission(): Promise<boolean> {
    try {
      // Check if we've already asked for permission
      const permissionAsked = await AsyncStorage.getItem(this.STORAGE_KEYS.PERMISSION_ASKED);
      
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission({
          sound: true,
          announcement: false,
          carPlay: false,
          criticalAlert: false,
          provisional: false,
          badge: true,
          alert: true
        });

        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          await AsyncStorage.setItem(this.STORAGE_KEYS.PERMISSION_ASKED, 'true');
        }

        return enabled;
      } else if (Platform.OS === 'android') {
        // For Android 13+, request notification permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            await AsyncStorage.setItem(this.STORAGE_KEYS.PERMISSION_ASKED, 'true');
            return true;
          }
          
          // Show explanation if permission denied and not asked before
          if (!permissionAsked) {
            Alert.alert(
              'Notification Permission',
              'Enable notifications to receive updates about your profile optimization, results, and important account information.',
              [
                { text: 'Skip', style: 'cancel' },
                { 
                  text: 'Settings', 
                  onPress: () => Linking.openSettings()
                }
              ]
            );
          }
          
          await AsyncStorage.setItem(this.STORAGE_KEYS.PERMISSION_ASKED, 'true');
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // For older Android versions, permissions are granted at install time
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Get FCM token
  private async getFCMToken(): Promise<string | null> {
    try {
      // Check for cached token first
      const cachedToken = await AsyncStorage.getItem(this.STORAGE_KEYS.FCM_TOKEN);
      
      const currentToken = await messaging().getToken();
      
      if (currentToken !== cachedToken) {
        // Token has changed, update cache and backend
        await AsyncStorage.setItem(this.STORAGE_KEYS.FCM_TOKEN, currentToken);
        
        if (cachedToken && this.isInitialized) {
          // Unregister old token
          await this.unregisterTokenFromBackend(cachedToken);
        }
      }
      
      this.currentToken = currentToken;
      return currentToken;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Register token with backend
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const authToken = await AuthService.getAuthToken();
      if (!authToken) {
        console.warn('No auth token available for registering push token');
        return;
      }

      const deviceInfo = await this.getDeviceInfo();

      const response = await fetch(`${this.API_BASE_URL}/push-notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          ...deviceInfo
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to register token');
      }

      console.log('Token registered successfully with backend');
    } catch (error) {
      console.error('Failed to register token with backend:', error);
      // Don't throw error - this shouldn't block initialization
    }
  }

  // Unregister token from backend
  private async unregisterTokenFromBackend(token: string): Promise<void> {
    try {
      const authToken = await AuthService.getAuthToken();
      if (!authToken) {
        return;
      }

      await fetch(`${this.API_BASE_URL}/push-notifications/unregister-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token })
      });

      console.log('Token unregistered from backend');
    } catch (error) {
      console.error('Failed to unregister token from backend:', error);
    }
  }

  // Get device information
  private async getDeviceInfo(): Promise<any> {
    try {
      const DeviceInfo = require('react-native-device-info');
      
      return {
        deviceId: DeviceInfo.getUniqueId(),
        deviceModel: DeviceInfo.getModel(),
        appVersion: DeviceInfo.getVersion(),
        osVersion: DeviceInfo.getSystemVersion()
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        deviceId: 'unknown',
        deviceModel: 'unknown',
        appVersion: '1.0.0',
        osVersion: Platform.Version.toString()
      };
    }
  }

  // Set up notification channels for Android
  private setupNotificationChannels(): void {
    if (Platform.OS !== 'android') return;

    const channels = [
      {
        channelId: 'general',
        channelName: 'General Notifications',
        channelDescription: 'General app notifications',
        importance: Importance.DEFAULT
      },
      {
        channelId: 'onboarding',
        channelName: 'Onboarding',
        channelDescription: 'Welcome and onboarding messages',
        importance: Importance.DEFAULT
      },
      {
        channelId: 'results',
        channelName: 'Results',
        channelDescription: 'Photo analysis and bio generation results',
        importance: Importance.HIGH
      },
      {
        channelId: 'billing',
        channelName: 'Billing & Subscriptions',
        channelDescription: 'Subscription and billing notifications',
        importance: Importance.HIGH
      },
      {
        channelId: 'promotions',
        channelName: 'Promotions & Offers',
        channelDescription: 'Special offers and promotions',
        importance: Importance.DEFAULT
      },
      {
        channelId: 'insights',
        channelName: 'Insights & Performance',
        channelDescription: 'Profile performance and insights',
        importance: Importance.DEFAULT
      },
      {
        channelId: 'security',
        channelName: 'Security Alerts',
        channelDescription: 'Important security notifications',
        importance: Importance.HIGH
      },
      {
        channelId: 'engagement',
        channelName: 'Engagement',
        channelDescription: 'Re-engagement and boost notifications',
        importance: Importance.DEFAULT
      },
      {
        channelId: 'tips',
        channelName: 'Tips & Education',
        channelDescription: 'Dating tips and educational content',
        importance: Importance.LOW
      }
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(
        {
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelDescription: channel.channelDescription,
          importance: channel.importance,
          vibrate: true,
          playSound: true,
          soundName: 'default'
        },
        (created) => {
          if (created) {
            console.log(`Notification channel '${channel.channelId}' created`);
          }
        }
      );
    });
  }

  // Set up message handlers
  private setupMessageHandlers(): void {
    // Handle messages when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      
      await this.handleForegroundMessage(remoteMessage);
      await this.trackNotificationEvent(remoteMessage, 'delivered');
    });

    // Handle notification opened when app is in background/killed
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app from background:', remoteMessage);
      
      this.handleNotificationOpened(remoteMessage);
      this.trackNotificationEvent(remoteMessage, 'clicked');
    });

    // Handle notification opened when app was killed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification opened app from killed state:', remoteMessage);
          
          // Delay handling to ensure app is fully loaded
          setTimeout(() => {
            this.handleNotificationOpened(remoteMessage);
            this.trackNotificationEvent(remoteMessage, 'clicked');
          }, 2000);
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      
      this.currentToken = token;
      await AsyncStorage.setItem(this.STORAGE_KEYS.FCM_TOKEN, token);
      await this.registerTokenWithBackend(token);
    });
  }

  // Set up background message handlers
  private setupBackgroundHandlers(): void {
    // Background message handler
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      
      // Handle background message processing
      await this.trackNotificationEvent(remoteMessage, 'delivered');
    });
  }

  // Handle foreground messages
  private async handleForegroundMessage(remoteMessage: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    try {
      const { notification, data } = remoteMessage;
      
      if (!notification) return;

      // Check user preferences
      const shouldShow = await this.shouldShowNotification(data?.category);
      if (!shouldShow) {
        console.log('Notification blocked by user preferences');
        return;
      }

      // Show local notification for foreground messages
      PushNotification.localNotification({
        channelId: this.getChannelIdForCategory(data?.category),
        title: notification.title || 'Dating Profile Optimizer',
        message: notification.body || '',
        bigText: notification.body,
        bigPictureUrl: notification.android?.imageUrl || notification.imageUrl,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        color: '#FF6B6B',
        vibrate: true,
        playSound: true,
        soundName: 'default',
        userInfo: data || {},
        actions: this.getActionsForCategory(data?.category)
      });

      // Call notification handler if set
      if (this.notificationHandler) {
        this.notificationHandler({
          title: notification.title,
          body: notification.body,
          data: data || {}
        });
      }
    } catch (error) {
      console.error('Error handling foreground message:', error);
    }
  }

  // Handle notification opened
  private handleNotificationOpened(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    try {
      const { data } = remoteMessage;
      
      // Handle deep link
      if (data?.deepLinkUrl) {
        this.handleDeepLink(data.deepLinkUrl);
      }

      // Call notification handler if set
      if (this.notificationHandler) {
        this.notificationHandler({
          title: remoteMessage.notification?.title,
          body: remoteMessage.notification?.body,
          data: data || {},
          opened: true
        });
      }
    } catch (error) {
      console.error('Error handling notification opened:', error);
    }
  }

  // Handle deep links
  private handleDeepLink(url: string): void {
    try {
      console.log('Handling deep link:', url);
      
      if (this.deepLinkHandler) {
        this.deepLinkHandler(url);
      } else {
        // Store deep link to handle when handler is set
        AsyncStorage.setItem('@pending_deep_link', url);
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  // Check if notification should be shown based on preferences
  private async shouldShowNotification(category?: string): Promise<boolean> {
    try {
      if (!this.preferences) {
        await this.loadNotificationPreferences();
      }

      if (!this.preferences || !this.preferences.enabled) {
        return false;
      }

      // Check category-specific preference
      if (category && this.preferences.categories) {
        const categoryKey = this.getCategoryKey(category);
        if (categoryKey && this.preferences.categories[categoryKey] === false) {
          return false;
        }
      }

      // Check quiet hours
      if (this.preferences.quietHoursStart && this.preferences.quietHoursEnd) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS format
        
        if (this.isInQuietHours(currentTime, this.preferences.quietHoursStart, this.preferences.quietHoursEnd)) {
          // Allow critical notifications during quiet hours
          return category === 'security_alert';
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Show notification if preference check fails
    }
  }

  // Load notification preferences
  private async loadNotificationPreferences(): Promise<void> {
    try {
      // Try to load from local storage first
      const cachedPreferences = await AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
      if (cachedPreferences) {
        this.preferences = JSON.parse(cachedPreferences);
      }

      // Load from backend
      const authToken = await AuthService.getAuthToken();
      if (!authToken) {
        return;
      }

      const response = await fetch(`${this.API_BASE_URL}/push-notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.preferences = this.transformPreferencesFromBackend(result.data);
          
          // Cache preferences locally
          await AsyncStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  // Transform backend preferences to frontend format
  private transformPreferencesFromBackend(backendPrefs: any): NotificationPreferences {
    return {
      enabled: backendPrefs.enabled || true,
      quietHoursStart: backendPrefs.quiet_hours_start,
      quietHoursEnd: backendPrefs.quiet_hours_end,
      maxDailyNotifications: backendPrefs.max_daily_notifications || 5,
      categories: {
        onboardingWelcome: backendPrefs.onboarding_welcome !== false,
        bioCompletion: backendPrefs.bio_completion !== false,
        photoAnalysisReady: backendPrefs.photo_analysis_ready !== false,
        subscriptionRenewal: backendPrefs.subscription_renewal !== false,
        subscriptionOffer: backendPrefs.subscription_offer !== false,
        profilePerformance: backendPrefs.profile_performance !== false,
        weeklyInsights: backendPrefs.weekly_insights !== false,
        securityAlert: backendPrefs.security_alert !== false,
        featureUpdate: backendPrefs.feature_update !== false,
        engagementBoost: backendPrefs.engagement_boost !== false,
        tipsEducational: backendPrefs.tips_educational !== false,
        general: backendPrefs.general !== false
      }
    };
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      // Update local preferences
      this.preferences = { ...this.preferences, ...preferences };
      await AsyncStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));

      // Update backend
      const authToken = await AuthService.getAuthToken();
      if (!authToken) {
        return false;
      }

      const backendPrefs = this.transformPreferencesToBackend(preferences);

      const response = await fetch(`${this.API_BASE_URL}/push-notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(backendPrefs)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      analytics.track('notification_preferences_updated', {
        enabled: this.preferences?.enabled
      });

      return result.success;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  // Transform frontend preferences to backend format
  private transformPreferencesToBackend(frontendPrefs: any): any {
    const backendPrefs: any = {};

    if (frontendPrefs.enabled !== undefined) {
      backendPrefs.enabled = frontendPrefs.enabled;
    }

    if (frontendPrefs.quietHoursStart !== undefined) {
      backendPrefs.quietHoursStart = frontendPrefs.quietHoursStart;
    }

    if (frontendPrefs.quietHoursEnd !== undefined) {
      backendPrefs.quietHoursEnd = frontendPrefs.quietHoursEnd;
    }

    if (frontendPrefs.maxDailyNotifications !== undefined) {
      backendPrefs.maxDailyNotifications = frontendPrefs.maxDailyNotifications;
    }

    if (frontendPrefs.categories) {
      Object.keys(frontendPrefs.categories).forEach(key => {
        const backendKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        backendPrefs[backendKey] = frontendPrefs.categories[key];
      });
    }

    return backendPrefs;
  }

  // Track notification events
  private async trackNotificationEvent(remoteMessage: FirebaseMessagingTypes.RemoteMessage, event: string): Promise<void> {
    try {
      const notificationId = remoteMessage.data?.notificationId;
      if (!notificationId) return;

      const authToken = await AuthService.getAuthToken();
      if (!authToken) return;

      await fetch(`${this.API_BASE_URL}/push-notifications/track/${notificationId}/${event}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Also track with analytics
      analytics.track('push_notification_event', {
        event,
        category: remoteMessage.data?.category,
        platform: Platform.OS
      });
    } catch (error) {
      console.error('Error tracking notification event:', error);
    }
  }

  // Utility methods
  private getCategoryKey(category: string): keyof NotificationPreferences['categories'] | null {
    const categoryMap: { [key: string]: keyof NotificationPreferences['categories'] } = {
      'onboarding_welcome': 'onboardingWelcome',
      'bio_completion': 'bioCompletion',
      'photo_analysis_ready': 'photoAnalysisReady',
      'subscription_renewal': 'subscriptionRenewal',
      'subscription_offer': 'subscriptionOffer',
      'profile_performance': 'profilePerformance',
      'weekly_insights': 'weeklyInsights',
      'security_alert': 'securityAlert',
      'feature_update': 'featureUpdate',
      'engagement_boost': 'engagementBoost',
      'tips_educational': 'tipsEducational',
      'general': 'general'
    };

    return categoryMap[category] || null;
  }

  private getChannelIdForCategory(category?: string): string {
    const channelMap: { [key: string]: string } = {
      'onboarding_welcome': 'onboarding',
      'bio_completion': 'results',
      'photo_analysis_ready': 'results',
      'subscription_renewal': 'billing',
      'subscription_offer': 'promotions',
      'profile_performance': 'insights',
      'weekly_insights': 'insights',
      'security_alert': 'security',
      'feature_update': 'general',
      'engagement_boost': 'engagement',
      'tips_educational': 'tips',
      'general': 'general'
    };

    return channelMap[category || ''] || 'general';
  }

  private getActionsForCategory(category?: string): string[] {
    // Define actions based on category
    switch (category) {
      case 'subscription_renewal':
        return ['Renew', 'Remind Later'];
      case 'security_alert':
        return ['Review', 'Dismiss'];
      default:
        return [];
    }
  }

  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Public API methods
  setNotificationHandler(handler: (notification: any) => void): void {
    this.notificationHandler = handler;
  }

  setDeepLinkHandler(handler: (url: string) => void): void {
    this.deepLinkHandler = handler;
    
    // Handle any pending deep links
    AsyncStorage.getItem('@pending_deep_link').then((url) => {
      if (url) {
        AsyncStorage.removeItem('@pending_deep_link');
        handler(url);
      }
    });
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  async refreshToken(): Promise<string | null> {
    return await this.getFCMToken();
  }

  async isPermissionGranted(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  // Send test notification (development only)
  async sendTestNotification(message?: string): Promise<boolean> {
    if (process.env.NODE_ENV !== 'development') {
      return false;
    }

    try {
      const authToken = await AuthService.getAuthToken();
      if (!authToken) return false;

      const response = await fetch(`${this.API_BASE_URL}/push-notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ message })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  // Cleanup on logout
  async cleanup(): Promise<void> {
    try {
      if (this.currentToken) {
        await this.unregisterTokenFromBackend(this.currentToken);
      }

      // Clear stored data
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.FCM_TOKEN,
        this.STORAGE_KEYS.PREFERENCES
      ]);

      this.currentToken = null;
      this.preferences = null;
      this.isInitialized = false;

      console.log('Push notification service cleaned up');
    } catch (error) {
      console.error('Error during push notification cleanup:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;