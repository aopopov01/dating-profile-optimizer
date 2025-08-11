import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DatePicker from '@react-native-community/datetimepicker';
import pushNotificationService from '../services/PushNotificationService';

interface NotificationCategory {
  id: keyof NotificationPreferences['categories'];
  title: string;
  description: string;
  icon: string;
  critical?: boolean;
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

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'securityAlert',
    title: 'Security Alerts',
    description: 'Important security notifications about your account',
    icon: 'security',
    critical: true
  },
  {
    id: 'bioCompletion',
    title: 'Bio Generation Results',
    description: 'When your optimized dating bio is ready',
    icon: 'article'
  },
  {
    id: 'photoAnalysisReady',
    title: 'Photo Analysis Results',
    description: 'When your photo analysis and scores are complete',
    icon: 'photo-camera'
  },
  {
    id: 'subscriptionRenewal',
    title: 'Subscription Reminders',
    description: 'Renewal reminders for your premium subscription',
    icon: 'payment'
  },
  {
    id: 'subscriptionOffer',
    title: 'Special Offers',
    description: 'Exclusive deals and promotional offers',
    icon: 'local-offer'
  },
  {
    id: 'profilePerformance',
    title: 'Profile Performance',
    description: 'Updates about your profile\'s performance and insights',
    icon: 'trending-up'
  },
  {
    id: 'weeklyInsights',
    title: 'Weekly Insights',
    description: 'Weekly summary of your dating profile performance',
    icon: 'analytics'
  },
  {
    id: 'featureUpdate',
    title: 'New Features',
    description: 'Updates about new app features and improvements',
    icon: 'new-releases'
  },
  {
    id: 'engagementBoost',
    title: 'Engagement Reminders',
    description: 'Reminders to optimize your profile and stay active',
    icon: 'notifications-active'
  },
  {
    id: 'tipsEducational',
    title: 'Dating Tips',
    description: 'Helpful tips and educational content for better dating success',
    icon: 'lightbulb'
  },
  {
    id: 'onboardingWelcome',
    title: 'Welcome Messages',
    description: 'Welcome and onboarding messages for new features',
    icon: 'waving-hand'
  },
  {
    id: 'general',
    title: 'General Notifications',
    description: 'Other important app notifications',
    icon: 'notifications'
  }
];

const DAILY_NOTIFICATION_OPTIONS = [
  { value: 1, label: '1 per day' },
  { value: 3, label: '3 per day' },
  { value: 5, label: '5 per day' },
  { value: 10, label: '10 per day' },
  { value: 50, label: 'Unlimited' }
];

export default function NotificationPreferencesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    quietHoursStart: '22:00:00',
    quietHoursEnd: '08:00:00',
    maxDailyNotifications: 5,
    categories: {
      onboardingWelcome: true,
      bioCompletion: true,
      photoAnalysisReady: true,
      subscriptionRenewal: true,
      subscriptionOffer: true,
      profilePerformance: true,
      weeklyInsights: true,
      securityAlert: true,
      featureUpdate: true,
      engagementBoost: true,
      tipsEducational: true,
      general: true
    }
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [showQuietHoursStart, setShowQuietHoursStart] = useState(false);
  const [showQuietHoursEnd, setShowQuietHoursEnd] = useState(false);
  const [showDailyLimitPicker, setShowDailyLimitPicker] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const currentPrefs = pushNotificationService.getPreferences();
      if (currentPrefs) {
        setPreferences(currentPrefs);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const checkPermissionStatus = async () => {
    const permission = await pushNotificationService.isPermissionGranted();
    setHasPermission(permission);
  };

  const requestPermission = async () => {
    try {
      const success = await pushNotificationService.initialize();
      if (success) {
        setHasPermission(true);
        Alert.alert(
          'Success',
          'Notification permission granted! You can now receive important updates.'
        );
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive important updates.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPrefs = { ...preferences, ...newPreferences };
      setPreferences(updatedPrefs);

      const success = await pushNotificationService.updateNotificationPreferences(newPreferences);
      if (!success) {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
      
      // Revert changes on error
      loadPreferences();
    }
  };

  const toggleNotifications = (enabled: boolean) => {
    updatePreferences({ enabled });
  };

  const toggleCategory = (categoryId: keyof NotificationPreferences['categories'], enabled: boolean) => {
    updatePreferences({
      categories: {
        ...preferences.categories,
        [categoryId]: enabled
      }
    });
  };

  const updateQuietHours = (isStart: boolean, time: Date) => {
    const timeString = time.toTimeString().slice(0, 8); // HH:MM:SS format
    
    if (isStart) {
      updatePreferences({ quietHoursStart: timeString });
      setShowQuietHoursStart(false);
    } else {
      updatePreferences({ quietHoursEnd: timeString });
      setShowQuietHoursEnd(false);
    }
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  const parseTimeString = (timeString?: string): Date => {
    if (!timeString) return new Date();
    
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    
    return date;
  };

  const renderPermissionSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="notifications" size={24} color="#FF6B6B" />
        <Text style={styles.sectionTitle}>Notification Permission</Text>
      </View>
      
      {hasPermission ? (
        <View style={styles.permissionStatus}>
          <Icon name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.permissionText}>Notifications are enabled</Text>
        </View>
      ) : (
        <View style={styles.permissionPrompt}>
          <Text style={styles.permissionDescription}>
            Enable notifications to receive important updates about your profile optimization, 
            results, and account security.
          </Text>
          <TouchableOpacity style={styles.enableButton} onPress={requestPermission}>
            <Text style={styles.enableButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderGlobalSettings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="settings" size={24} color="#FF6B6B" />
        <Text style={styles.sectionTitle}>Global Settings</Text>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Enable Notifications</Text>
          <Text style={styles.settingDescription}>
            Master switch for all push notifications
          </Text>
        </View>
        <Switch
          value={preferences.enabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: '#767577', true: '#FF6B6B' }}
          thumbColor={preferences.enabled ? '#FFFFFF' : '#f4f3f4'}
          disabled={!hasPermission}
        />
      </View>

      {preferences.enabled && (
        <>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Quiet Hours</Text>
              <Text style={styles.settingDescription}>
                No notifications during these hours (except security alerts)
              </Text>
            </View>
          </View>

          <View style={styles.timePickerRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowQuietHoursStart(true)}
            >
              <Text style={styles.timeLabel}>Start:</Text>
              <Text style={styles.timeValue}>
                {formatTime(preferences.quietHoursStart)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowQuietHoursEnd(true)}
            >
              <Text style={styles.timeLabel}>End:</Text>
              <Text style={styles.timeValue}>
                {formatTime(preferences.quietHoursEnd)}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowDailyLimitPicker(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Daily Notification Limit</Text>
              <Text style={styles.settingDescription}>
                Maximum notifications per day: {preferences.maxDailyNotifications === 50 ? 'Unlimited' : preferences.maxDailyNotifications}
              </Text>
            </View>
            <Icon name="arrow-forward-ios" size={16} color="#666" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="category" size={24} color="#FF6B6B" />
        <Text style={styles.sectionTitle}>Notification Categories</Text>
      </View>

      {NOTIFICATION_CATEGORIES.map((category) => (
        <View key={category.id} style={styles.categoryRow}>
          <View style={styles.categoryIcon}>
            <Icon name={category.icon} size={20} color="#FF6B6B" />
          </View>
          <View style={styles.categoryInfo}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {category.critical && (
                <View style={styles.criticalBadge}>
                  <Text style={styles.criticalText}>CRITICAL</Text>
                </View>
              )}
            </View>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
          <Switch
            value={preferences.categories[category.id]}
            onValueChange={(enabled) => toggleCategory(category.id, enabled)}
            trackColor={{ false: '#767577', true: '#FF6B6B' }}
            thumbColor={preferences.categories[category.id] ? '#FFFFFF' : '#f4f3f4'}
            disabled={!preferences.enabled || !hasPermission || category.critical}
          />
        </View>
      ))}
    </View>
  );

  const renderDailyLimitPicker = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Daily Notification Limit</Text>
          <TouchableOpacity onPress={() => setShowDailyLimitPicker(false)}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {DAILY_NOTIFICATION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionRow,
              preferences.maxDailyNotifications === option.value && styles.selectedOption
            ]}
            onPress={() => {
              updatePreferences({ maxDailyNotifications: option.value });
              setShowDailyLimitPicker(false);
            }}
          >
            <Text style={[
              styles.optionText,
              preferences.maxDailyNotifications === option.value && styles.selectedOptionText
            ]}>
              {option.label}
            </Text>
            {preferences.maxDailyNotifications === option.value && (
              <Icon name="check" size={20} color="#FF6B6B" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.content}>
        {renderPermissionSection()}
        {renderGlobalSettings()}
        {renderCategories()}
      </ScrollView>

      {showQuietHoursStart && (
        <DatePicker
          value={parseTimeString(preferences.quietHoursStart)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime) {
              updateQuietHours(true, selectedTime);
            } else {
              setShowQuietHoursStart(false);
            }
          }}
        />
      )}

      {showQuietHoursEnd && (
        <DatePicker
          value={parseTimeString(preferences.quietHoursEnd)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            if (selectedTime) {
              updateQuietHours(false, selectedTime);
            } else {
              setShowQuietHoursEnd(false);
            }
          }}
        />
      )}

      {showDailyLimitPicker && renderDailyLimitPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333'
  },
  content: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e8f5e8',
    marginHorizontal: 16,
    borderRadius: 8
  },
  permissionText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500'
  },
  permissionPrompt: {
    paddingHorizontal: 16
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16
  },
  enableButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  settingInfo: {
    flex: 1,
    marginRight: 12
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  timePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  timeLabel: {
    fontSize: 14,
    color: '#666'
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333'
  },
  categoryDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  },
  criticalBadge: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  criticalText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 32,
    borderRadius: 12,
    maxHeight: 400
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  selectedOption: {
    backgroundColor: '#fff5f5'
  },
  optionText: {
    fontSize: 16,
    color: '#333'
  },
  selectedOptionText: {
    color: '#FF6B6B',
    fontWeight: '500'
  }
});