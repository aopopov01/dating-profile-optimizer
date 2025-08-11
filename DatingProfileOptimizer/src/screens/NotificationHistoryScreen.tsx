import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthService } from '../services/AuthService';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  imageUrl?: string;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';
  sentAt?: string;
  clickedAt?: string;
}

interface NotificationHistoryData {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'onboarding_welcome': '#FF9F43',
  'bio_completion': '#00d2d3',
  'photo_analysis_ready': '#5f27cd',
  'subscription_renewal': '#ff3838',
  'subscription_offer': '#2ed573',
  'profile_performance': '#3742fa',
  'weekly_insights': '#ffa502',
  'security_alert': '#ff4757',
  'feature_update': '#7bed9f',
  'engagement_boost': '#ff6b81',
  'tips_educational': '#ffd32a',
  'general': '#747d8c'
};

const CATEGORY_ICONS: { [key: string]: string } = {
  'onboarding_welcome': 'waving-hand',
  'bio_completion': 'article',
  'photo_analysis_ready': 'photo-camera',
  'subscription_renewal': 'payment',
  'subscription_offer': 'local-offer',
  'profile_performance': 'trending-up',
  'weekly_insights': 'analytics',
  'security_alert': 'security',
  'feature_update': 'new-releases',
  'engagement_boost': 'notifications-active',
  'tips_educational': 'lightbulb',
  'general': 'notifications'
};

const CATEGORY_NAMES: { [key: string]: string } = {
  'onboarding_welcome': 'Welcome',
  'bio_completion': 'Bio Results',
  'photo_analysis_ready': 'Photo Analysis',
  'subscription_renewal': 'Subscription',
  'subscription_offer': 'Offers',
  'profile_performance': 'Performance',
  'weekly_insights': 'Insights',
  'security_alert': 'Security',
  'feature_update': 'Updates',
  'engagement_boost': 'Engagement',
  'tips_educational': 'Tips',
  'general': 'General'
};

export default function NotificationHistoryScreen({ navigation }: any) {
  const [data, setData] = useState<NotificationHistoryData>({
    notifications: [],
    pagination: {
      page: 1,
      limit: 20,
      totalCount: 0,
      totalPages: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (page: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const authToken = await AuthService.getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token');
      }

      const response = await fetch(
        `${API_BASE_URL}/push-notifications/history?page=${page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load notifications');
      }

      const newData = result.data;

      if (page === 1 || refresh) {
        setData(newData);
      } else {
        setData(prevData => ({
          notifications: [...prevData.notifications, ...newData.notifications],
          pagination: newData.pagination
        }));
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
      Alert.alert('Error', 'Failed to load notification history');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadNotifications(1, true);
  }, []);

  const loadMore = () => {
    if (loadingMore || data.pagination.page >= data.pagination.totalPages) {
      return;
    }

    loadNotifications(data.pagination.page + 1);
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }

    // Format as date
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
        return '#4CAF50';
      case 'clicked':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'sent':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'delivered':
        return 'check-circle';
      case 'clicked':
        return 'touch-app';
      case 'failed':
        return 'error';
      case 'sent':
        return 'send';
      default:
        return 'schedule';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'clicked':
        return 'Opened';
      case 'failed':
        return 'Failed';
      case 'sent':
        return 'Sent';
      default:
        return 'Pending';
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
    const categoryIcon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.general;
    const categoryName = CATEGORY_NAMES[item.category] || 'General';

    return (
      <TouchableOpacity style={styles.notificationItem}>
        <View style={styles.notificationHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20` }]}>
            <Icon name={categoryIcon} size={14} color={categoryColor} />
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {categoryName}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Icon
              name={getStatusIcon(item.deliveryStatus)}
              size={14}
              color={getStatusColor(item.deliveryStatus)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.deliveryStatus) }]}>
              {getStatusText(item.deliveryStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.notificationContent}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.notificationImage} />
          )}
          <View style={styles.textContent}>
            <Text style={styles.notificationTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.notificationBody} numberOfLines={3}>
              {item.body}
            </Text>
          </View>
        </View>

        <View style={styles.notificationFooter}>
          <Text style={styles.timeText}>
            {formatDate(item.clickedAt || item.sentAt)}
          </Text>
          {item.clickedAt && (
            <View style={styles.clickedIndicator}>
              <Icon name="visibility" size={12} color="#2196F3" />
              <Text style={styles.clickedText}>Opened</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyDescription}>
        You haven't received any notifications yet. When you do, they'll appear here.
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.statsHeader}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{data.pagination.totalCount}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {data.notifications.filter(n => n.deliveryStatus === 'clicked').length}
        </Text>
        <Text style={styles.statLabel}>Opened</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {data.notifications.filter(n => n.deliveryStatus === 'failed').length}
        </Text>
        <Text style={styles.statLabel}>Failed</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification History</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading notifications...</Text>
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
        <Text style={styles.headerTitle}>Notification History</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('NotificationPreferences')}
        >
          <Icon name="settings" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={data.notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={data.notifications.length === 0 ? styles.emptyContainer : undefined}
        showsVerticalScrollIndicator={false}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 8
  },
  settingsButton: {
    padding: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginBottom: 8
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef'
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  notificationContent: {
    flexDirection: 'row',
    marginBottom: 12
  },
  notificationImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12
  },
  textContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  timeText: {
    fontSize: 12,
    color: '#999'
  },
  clickedIndicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  clickedText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4
  },
  emptyContainer: {
    flexGrow: 1
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  },
  loadingFooter: {
    padding: 16,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#666'
  }
});