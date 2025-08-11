/**
 * Permissions Screen
 * Educates users about permissions and handles permission requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
  AppState,
  AppStateStatus,
} from 'react-native';
import { request, PERMISSIONS, RESULTS, check, openSettings } from 'react-native-permissions';
import messaging from '@react-native-firebase/messaging';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../utils/designSystem';
import { PrimaryButton, SecondaryButton } from '../shared/Button';
import Card from '../shared/Card';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  status: 'granted' | 'denied' | 'pending';
  benefits: string[];
  action: () => Promise<boolean>;
}

interface PermissionsScreenProps {
  onNext: (data?: any) => void;
  onBack: () => void;
  permissions: {
    camera: 'granted' | 'denied' | 'pending';
    storage: 'granted' | 'denied' | 'pending';
    notifications: 'granted' | 'denied' | 'pending';
  };
}

const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  onNext,
  onBack,
  permissions: initialPermissions,
}) => {
  const { updatePermissionStatus } = useOnboarding();
  const [permissions, setPermissions] = useState(initialPermissions);
  const [isProcessing, setIsProcessing] = useState(false);

  // Monitor app state to check permissions when user returns from settings
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkAllPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      let result;
      
      if (Platform.OS === 'android') {
        result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'We need camera access to take photos for your dating profile analysis.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        result = await request(PERMISSIONS.IOS.CAMERA);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      return false;
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      let result;
      
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          // Android 13+ requires media permissions
          const readImages = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          return readImages === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      } else {
        result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Storage permission error:', error);
      return false;
    }
  };

  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      const authStatus = await messaging().requestPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  };

  const permissionDefinitions: Permission[] = [
    {
      id: 'camera',
      title: 'Camera Access',
      description: 'Take new photos directly within the app for instant analysis',
      icon: '📷',
      required: true,
      status: permissions.camera,
      benefits: [
        'Take photos with optimal settings',
        'Instant AI analysis',
        'No need to switch between apps',
        'Better photo quality guidance'
      ],
      action: requestCameraPermission,
    },
    {
      id: 'storage',
      title: 'Photo Library Access',
      description: 'Select existing photos from your gallery for analysis',
      icon: '🖼️',
      required: true,
      status: permissions.storage,
      benefits: [
        'Choose your best existing photos',
        'Analyze multiple photos at once',
        'Compare different photo options',
        'No re-upload needed'
      ],
      action: requestStoragePermission,
    },
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Get notified about analysis results and profile tips',
      icon: '🔔',
      required: false,
      status: permissions.notifications,
      benefits: [
        'Real-time analysis updates',
        'Dating tips and insights',
        'New feature announcements',
        'Success story notifications'
      ],
      action: requestNotificationPermission,
    },
  ];

  const updatePermissionState = (permissionId: string, granted: boolean) => {
    const status = granted ? 'granted' : 'denied';
    setPermissions(prev => ({ ...prev, [permissionId]: status }));
    updatePermissionStatus(permissionId as keyof typeof permissions, status);
  };

  const handlePermissionRequest = async (permission: Permission) => {
    setIsProcessing(true);
    try {
      const granted = await permission.action();
      updatePermissionState(permission.id, granted);
      
      if (!granted && permission.required) {
        Alert.alert(
          'Permission Required',
          `${permission.title} is required for the app to work properly. Please grant this permission in your device settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSettings },
          ]
        );
      }
    } catch (error) {
      console.error(`Error requesting ${permission.title}:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkAllPermissions = async () => {
    try {
      // Check camera permission
      let cameraStatus;
      if (Platform.OS === 'android') {
        cameraStatus = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
      } else {
        const result = await check(PERMISSIONS.IOS.CAMERA);
        cameraStatus = result === RESULTS.GRANTED;
      }
      updatePermissionState('camera', cameraStatus);

      // Check storage permission
      let storageStatus;
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          storageStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
        } else {
          storageStatus = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
        }
      } else {
        const result = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
        storageStatus = result === RESULTS.GRANTED;
      }
      updatePermissionState('storage', storageStatus);

      // Check notification permission
      const authStatus = await messaging().hasPermission();
      const notificationStatus = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      updatePermissionState('notifications', notificationStatus);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestAllPermissions = async () => {
    setIsProcessing(true);
    
    for (const permission of permissionDefinitions) {
      if (permission.status !== 'granted') {
        await handlePermissionRequest(permission);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsProcessing(false);
  };

  const canContinue = () => {
    const requiredPermissions = permissionDefinitions.filter(p => p.required);
    return requiredPermissions.every(p => permissions[p.id as keyof typeof permissions] === 'granted');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted': return '✅';
      case 'denied': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted': return COLORS.semantic.success;
      case 'denied': return COLORS.semantic.error;
      default: return COLORS.semantic.warning;
    }
  };

  const renderPermissionCard = (permission: Permission) => (
    <Card key={permission.id} style={styles.permissionCard} variant="elevated">
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIconContainer}>
          <Text style={styles.permissionIcon}>{permission.icon}</Text>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(permission.status) }
          ]}>
            <Text style={styles.statusIcon}>{getStatusIcon(permission.status)}</Text>
          </View>
        </View>
        
        <View style={styles.permissionInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.permissionTitle}>{permission.title}</Text>
            {permission.required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            )}
          </View>
          <Text style={styles.permissionDescription}>{permission.description}</Text>
        </View>
      </View>

      <View style={styles.benefitsList}>
        <Text style={styles.benefitsTitle}>Why we need this:</Text>
        {permission.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Text style={styles.benefitIcon}>•</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {permission.status !== 'granted' && (
        <SecondaryButton
          title={`Allow ${permission.title}`}
          onPress={() => handlePermissionRequest(permission)}
          disabled={isProcessing}
          size="medium"
          style={styles.permissionButton}
        />
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>App Permissions</Text>
        <Text style={styles.headerSubtitle}>
          We need a few permissions to provide you with the best experience
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {permissionDefinitions.map(renderPermissionCard)}
        
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Your privacy is our priority. We only use these permissions for app functionality and never share your data without consent.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <SecondaryButton
          title="Back"
          onPress={onBack}
          size="medium"
          style={styles.backButton}
        />

        {!canContinue() ? (
          <PrimaryButton
            title="Allow All Permissions"
            onPress={requestAllPermissions}
            disabled={isProcessing}
            loading={isProcessing}
            size="large"
            style={styles.allowAllButton}
            icon={<Text style={styles.buttonIcon}>🚀</Text>}
            iconPosition="left"
          />
        ) : (
          <PrimaryButton
            title="Continue Setup"
            onPress={() => onNext({ permissions })}
            size="large"
            style={styles.continueButton}
            icon={<Text style={styles.buttonIcon}>→</Text>}
            iconPosition="right"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },

  headerTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },

  headerSubtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  permissionCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },

  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },

  permissionIconContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },

  permissionIcon: {
    fontSize: 32,
  },

  statusIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface.card,
  },

  statusIcon: {
    fontSize: 10,
  },

  permissionInfo: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },

  permissionTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
  },

  requiredBadge: {
    backgroundColor: COLORS.semantic.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },

  requiredText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },

  permissionDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },

  benefitsList: {
    marginBottom: SPACING.md,
  },

  benefitsTitle: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },

  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  benefitIcon: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.primary[500],
    marginRight: SPACING.sm,
    marginTop: 2,
  },

  benefitText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
  },

  permissionButton: {
    alignSelf: 'flex-start',
  },

  privacyNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary[50],
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    marginTop: SPACING.lg,
  },

  privacyIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },

  privacyText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },

  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.light,
  },

  backButton: {
    flex: 1,
    marginRight: SPACING.md,
  },

  allowAllButton: {
    flex: 2,
  },

  continueButton: {
    flex: 2,
  },

  buttonIcon: {
    fontSize: 16,
  },
});

export default PermissionsScreen;