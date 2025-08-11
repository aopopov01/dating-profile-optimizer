import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import OfflineManager, { SyncProgress, SyncResult, StorageUsage } from '../../services/OfflineManager';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useAnalytics } from '../../contexts/AnalyticsContext';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWifiEnabled: boolean;
}

const OfflineIndicator: React.FC = () => {
  const { theme, colors } = useTheme();
  const { getAdjustedFontSize, announceForAccessibility } = useAccessibility();
  const { trackEvent } = useAnalytics();
  
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isWifiEnabled: false
  });
  
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  
  const [slideAnimation] = useState(new Animated.Value(-100));
  const [pulseAnimation] = useState(new Animated.Value(1));

  const offlineManager = OfflineManager.getInstance();

  // Initialize offline manager listeners
  useEffect(() => {
    // Network status listener
    const handleNetworkChange = (status: NetworkStatus) => {
      const wasOffline = !networkStatus.isConnected;
      const isNowOnline = status.isConnected;
      
      setNetworkStatus(status);
      
      // Announce network status change
      if (wasOffline && isNowOnline) {
        announceForAccessibility('Connection restored. Syncing offline data.');
        showIndicator();
      } else if (!wasOffline && !isNowOnline) {
        announceForAccessibility('Connection lost. Working offline.');
        showIndicator();
      }
      
      // Track network changes
      trackEvent('network_status_changed', {
        was_connected: networkStatus.isConnected,
        is_connected: status.isConnected,
        connection_type: status.type
      });
    };

    // Sync progress listener
    const handleSyncProgress = (progress: SyncProgress) => {
      setSyncProgress(progress);
      
      // Announce sync progress for screen readers
      if (progress.phase === 'starting') {
        announceForAccessibility('Starting data synchronization');
      } else if (progress.phase === 'completed') {
        announceForAccessibility(`Synchronization completed. ${progress.completedItems} items synced.`);
        setTimeout(() => setSyncProgress(null), 3000); // Hide after 3 seconds
      } else if (progress.phase === 'error') {
        announceForAccessibility('Synchronization failed');
        setTimeout(() => setSyncProgress(null), 5000); // Hide after 5 seconds
      }
    };

    // Add listeners
    offlineManager.addNetworkListener(handleNetworkChange);
    offlineManager.addSyncListener(handleSyncProgress);

    // Load initial data
    loadOfflineData();

    // Cleanup
    return () => {
      offlineManager.removeNetworkListener(handleNetworkChange);
      offlineManager.removeSyncListener(handleSyncProgress);
    };
  }, []);

  // Load offline data statistics
  const loadOfflineData = useCallback(async () => {
    try {
      const [lastSync, pendingUploads, syncQueue, usage] = await Promise.all([
        offlineManager.getLastSyncTime(),
        offlineManager.getPendingUploads(),
        offlineManager.getSyncQueue(),
        offlineManager.getStorageUsage()
      ]);

      setLastSyncTime(lastSync);
      setPendingCount(pendingUploads.length + syncQueue.length);
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  }, [offlineManager]);

  // Show indicator animation
  const showIndicator = useCallback(() => {
    Animated.sequence([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnimation, {
        toValue: -100,
        duration: 300,
        delay: 3000,
        useNativeDriver: true
      })
    ]).start();
  }, [slideAnimation]);

  // Pulse animation for sync indicator
  useEffect(() => {
    if (syncProgress?.phase === 'syncing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    }
  }, [syncProgress?.phase, pulseAnimation]);

  // Manual sync
  const handleManualSync = useCallback(async () => {
    if (!networkStatus.isConnected) {
      Alert.alert(
        'Offline',
        'Cannot sync while offline. Please check your internet connection.'
      );
      return;
    }

    try {
      announceForAccessibility('Starting manual synchronization');
      const result: SyncResult = await offlineManager.sync();
      
      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.syncedItems} items.`
        );
        
        trackEvent('manual_sync_completed', {
          synced_items: result.syncedItems,
          failed_items: result.failedItems
        });
      } else {
        Alert.alert(
          'Sync Failed',
          result.error || `Failed to sync ${result.failedItems} items.`
        );
        
        trackEvent('manual_sync_failed', {
          error: result.error,
          failed_items: result.failedItems
        });
      }
      
      // Reload offline data
      await loadOfflineData();
      
    } catch (error) {
      console.error('Manual sync error:', error);
      Alert.alert('Sync Error', 'An error occurred during sync.');
    }
  }, [networkStatus.isConnected, offlineManager, announceForAccessibility, trackEvent, loadOfflineData]);

  // Clear offline data
  const handleClearOfflineData = useCallback(() => {
    Alert.alert(
      'Clear Offline Data',
      'This will remove all cached data and pending uploads. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineManager.clearAllOfflineData();
              await loadOfflineData();
              
              announceForAccessibility('All offline data cleared');
              
              trackEvent('offline_data_cleared', {
                user_initiated: true
              });
              
              Alert.alert('Success', 'Offline data cleared successfully.');
            } catch (error) {
              console.error('Error clearing offline data:', error);
              Alert.alert('Error', 'Failed to clear offline data.');
            }
          }
        }
      ]
    );
  }, [offlineManager, loadOfflineData, announceForAccessibility, trackEvent]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Format time ago
  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Get network status icon and color
  const getNetworkIndicator = () => {
    if (syncProgress?.phase === 'syncing') {
      return { icon: '🔄', color: colors.info };
    } else if (!networkStatus.isConnected) {
      return { icon: '📵', color: colors.error };
    } else if (pendingCount > 0) {
      return { icon: '⏳', color: colors.warning };
    } else {
      return { icon: '✅', color: colors.success };
    }
  };

  const networkIndicator = getNetworkIndicator();

  const styles = StyleSheet.create({
    floatingIndicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: networkStatus.isConnected ? colors.success : colors.error,
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      elevation: 10
    },
    floatingText: {
      color: 'white',
      fontSize: getAdjustedFontSize(14),
      fontWeight: '600',
      marginLeft: 8
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border
    },
    statusIcon: {
      fontSize: 16,
      marginRight: 6
    },
    statusText: {
      fontSize: getAdjustedFontSize(12),
      color: colors.textSecondary,
      marginRight: 8
    },
    syncIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.info + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.info
    },
    syncText: {
      fontSize: getAdjustedFontSize(12),
      color: colors.info,
      marginLeft: 6,
      fontWeight: '600'
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%'
    },
    modalTitle: {
      fontSize: getAdjustedFontSize(20),
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center'
    },
    infoSection: {
      marginBottom: 20
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider
    },
    infoLabel: {
      fontSize: getAdjustedFontSize(14),
      color: colors.textSecondary,
      flex: 1
    },
    infoValue: {
      fontSize: getAdjustedFontSize(14),
      color: colors.text,
      fontWeight: '600'
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4
    },
    syncButton: {
      backgroundColor: colors.primary
    },
    clearButton: {
      backgroundColor: colors.error
    },
    closeButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border
    },
    buttonText: {
      fontSize: getAdjustedFontSize(14),
      fontWeight: '600'
    },
    syncButtonText: {
      color: 'white'
    },
    clearButtonText: {
      color: 'white'
    },
    closeButtonText: {
      color: colors.text
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20
    },
    loadingText: {
      marginLeft: 12,
      fontSize: getAdjustedFontSize(14),
      color: colors.text
    }
  });

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOfflineData();
    }, [loadOfflineData])
  );

  return (
    <>
      {/* Floating Network Status Indicator */}
      <Animated.View
        style={[
          styles.floatingIndicator,
          {
            transform: [{ translateY: slideAnimation }]
          }
        ]}
      >
        <Text style={styles.floatingText}>
          {networkStatus.isConnected ? '🌐 Back Online' : '📵 Working Offline'}
        </Text>
      </Animated.View>

      {/* Status Bar */}
      <TouchableOpacity
        style={styles.statusBar}
        onPress={() => setShowSyncModal(true)}
        accessibilityRole="button"
        accessibilityLabel={`Network status: ${networkStatus.isConnected ? 'Online' : 'Offline'}. ${pendingCount > 0 ? `${pendingCount} items pending sync.` : 'All data synced.'} Tap for details.`}
      >
        <Text style={styles.statusIcon}>{networkIndicator.icon}</Text>
        <Text style={[styles.statusText, { color: networkIndicator.color }]}>
          {networkStatus.isConnected ? 'Online' : 'Offline'}
        </Text>
        {pendingCount > 0 && (
          <Text style={[styles.statusText, { color: colors.warning }]}>
            {pendingCount} pending
          </Text>
        )}
      </TouchableOpacity>

      {/* Sync Progress Indicator */}
      {syncProgress && (
        <Animated.View
          style={[
            styles.syncIndicator,
            syncProgress.phase === 'syncing' && {
              transform: [{ scale: pulseAnimation }]
            }
          ]}
        >
          {syncProgress.phase === 'syncing' && (
            <ActivityIndicator size="small" color={colors.info} />
          )}
          <Text style={styles.syncText}>
            {syncProgress.phase === 'starting' && 'Starting sync...'}
            {syncProgress.phase === 'syncing' && `Syncing ${syncProgress.completedItems}/${syncProgress.totalItems}`}
            {syncProgress.phase === 'completed' && '✅ Sync complete'}
            {syncProgress.phase === 'error' && '❌ Sync failed'}
          </Text>
        </Animated.View>
      )}

      {/* Sync Details Modal */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSyncModal(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Offline Status</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Network Information */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Connection Status</Text>
                  <Text style={[styles.infoValue, { color: networkIndicator.color }]}>
                    {networkStatus.isConnected ? 'Online' : 'Offline'}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Connection Type</Text>
                  <Text style={styles.infoValue}>
                    {networkStatus.type.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Sync</Text>
                  <Text style={styles.infoValue}>
                    {formatTimeAgo(lastSyncTime)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pending Items</Text>
                  <Text style={[styles.infoValue, { color: pendingCount > 0 ? colors.warning : colors.success }]}>
                    {pendingCount}
                  </Text>
                </View>

                {storageUsage && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Storage Used</Text>
                    <Text style={styles.infoValue}>
                      {formatFileSize(storageUsage.totalSize)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Sync Progress */}
              {syncProgress && (
                <View style={styles.infoSection}>
                  <Text style={[styles.modalTitle, { fontSize: getAdjustedFontSize(16), marginBottom: 8 }]}>
                    Sync Progress
                  </Text>
                  
                  {syncProgress.phase === 'syncing' ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingText}>
                        {syncProgress.currentItem || 'Synchronizing...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status</Text>
                      <Text style={[styles.infoValue, { 
                        color: syncProgress.phase === 'completed' ? colors.success : colors.error 
                      }]}>
                        {syncProgress.phase === 'completed' ? 'Completed' : 'Failed'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={() => setShowSyncModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close sync details"
              >
                <Text style={[styles.buttonText, styles.closeButtonText]}>
                  Close
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.syncButton]}
                onPress={handleManualSync}
                disabled={!networkStatus.isConnected || syncProgress?.phase === 'syncing'}
                accessibilityRole="button"
                accessibilityLabel="Start manual synchronization"
              >
                <Text style={[styles.buttonText, styles.syncButtonText]}>
                  {syncProgress?.phase === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={handleClearOfflineData}
                disabled={syncProgress?.phase === 'syncing'}
                accessibilityRole="button"
                accessibilityLabel="Clear all offline data"
              >
                <Text style={[styles.buttonText, styles.clearButtonText]}>
                  Clear Data
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default OfflineIndicator;