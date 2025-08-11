import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  ProgressBar,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

interface UserStats {
  bio_generations_used: number;
  bio_generations_limit: number;
  photo_analyses_used: number;
  photo_analyses_limit: number;
  plan_name: string;
  plan_display_name: string;
}

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/user/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('Failed to load user stats');
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserStats();
  };

  const getUsageProgress = (used: number, limit: number) => {
    if (limit === -1) return 1; // Unlimited
    return limit > 0 ? used / limit : 0;
  };

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return '#4caf50'; // Unlimited - green
    const progress = used / limit;
    if (progress < 0.7) return '#4caf50'; // Green
    if (progress < 0.9) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const handleStartOptimization = () => {
    navigation.navigate('Upload');
  };

  const handleGenerateBio = () => {
    if (stats && stats.bio_generations_limit !== -1 && 
        stats.bio_generations_used >= stats.bio_generations_limit) {
      Alert.alert(
        'Limit Reached',
        'You have reached your monthly bio generation limit. Upgrade your plan for unlimited access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('PaymentModal') },
        ]
      );
      return;
    }
    navigation.navigate('Bio');
  };

  const handleAnalyzePhotos = () => {
    if (stats && stats.photo_analyses_limit !== -1 && 
        stats.photo_analyses_used >= stats.photo_analyses_limit) {
      Alert.alert(
        'Limit Reached',
        'You have reached your monthly photo analysis limit. Upgrade your plan for unlimited access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('PaymentModal') },
        ]
      );
      return;
    }
    navigation.navigate('Analysis');
  };

  const handleViewResults = () => {
    navigation.navigate('Results');
  };

  const handleUpgrade = () => {
    navigation.navigate('PaymentModal');
  };

  const handleLinkedInHeadshot = () => {
    navigation.navigate('LinkedInHeadshot');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e91e63']}
            tintColor="#e91e63"
          />
        }
      >
        {/* Welcome Header */}
        <Surface style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeContent}>
              <Text variant="headlineMedium" style={styles.welcomeTitle}>
                Welcome back, {user?.first_name}! 👋
              </Text>
              <Text variant="bodyMedium" style={styles.welcomeSubtitle}>
                Ready to optimize your dating profile?
              </Text>
            </View>
            <Icon name="favorite" size={48} color="#e91e63" />
          </View>
        </Surface>

        {/* Quick Actions */}
        <Surface style={styles.quickActionsCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.actionGrid}>
            <Card style={styles.actionCard} onPress={handleStartOptimization}>
              <Card.Content style={styles.actionContent}>
                <Icon name="cloud-upload" size={32} color="#e91e63" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  Upload Photos
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  Get started with photo analysis
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard} onPress={handleGenerateBio}>
              <Card.Content style={styles.actionContent}>
                <Icon name="edit" size={32} color="#e91e63" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  Generate Bio
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  AI-powered bio creation
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard} onPress={handleAnalyzePhotos}>
              <Card.Content style={styles.actionContent}>
                <Icon name="analytics" size={32} color="#e91e63" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  Photo Analysis
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  Detailed photo scoring
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard} onPress={handleViewResults}>
              <Card.Content style={styles.actionContent}>
                <Icon name="star" size={32} color="#e91e63" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  View Results
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  Your optimized profile
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard} onPress={handleLinkedInHeadshot}>
              <Card.Content style={styles.actionContent}>
                <Icon name="person" size={32} color="#0077b5" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  LinkedIn Headshot
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  Professional headshots
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard} onPress={handleUpgrade}>
              <Card.Content style={styles.actionContent}>
                <Icon name="workspace-premium" size={32} color="#ff9800" />
                <Text variant="titleSmall" style={styles.actionTitle}>
                  Go Premium
                </Text>
                <Text variant="bodySmall" style={styles.actionDescription}>
                  Unlock all features
                </Text>
              </Card.Content>
            </Card>
          </View>
        </Surface>

        {/* Usage Statistics */}
        {stats && (
          <Surface style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Your Usage This Month
              </Text>
              <Chip 
                icon="star" 
                style={[styles.planChip, { backgroundColor: stats.plan_name === 'free' ? '#ff9800' : '#4caf50' }]}
                textStyle={{ color: 'white', fontSize: 12 }}
              >
                {stats.plan_display_name}
              </Chip>
            </View>

            {/* Bio Generations */}
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text variant="titleSmall">Bio Generations</Text>
                <Text variant="bodyMedium" style={styles.statNumbers}>
                  {stats.bio_generations_used} / {stats.bio_generations_limit === -1 ? '∞' : stats.bio_generations_limit}
                </Text>
              </View>
              <ProgressBar 
                progress={getUsageProgress(stats.bio_generations_used, stats.bio_generations_limit)}
                color={getUsageColor(stats.bio_generations_used, stats.bio_generations_limit)}
                style={styles.progressBar}
              />
            </View>

            {/* Photo Analyses */}
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text variant="titleSmall">Photo Analyses</Text>
                <Text variant="bodyMedium" style={styles.statNumbers}>
                  {stats.photo_analyses_used} / {stats.photo_analyses_limit === -1 ? '∞' : stats.photo_analyses_limit}
                </Text>
              </View>
              <ProgressBar 
                progress={getUsageProgress(stats.photo_analyses_used, stats.photo_analyses_limit)}
                color={getUsageColor(stats.photo_analyses_used, stats.photo_analyses_limit)}
                style={styles.progressBar}
              />
            </View>

            {stats.plan_name === 'free' && (
              <Button
                mode="contained"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
                icon="arrow-up"
              >
                Upgrade for Unlimited Access
              </Button>
            )}
          </Surface>
        )}

        {/* Tips & Insights */}
        <Surface style={styles.tipsCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            💡 Pro Tips
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Icon name="photo-camera" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Upload 5-6 photos for best analysis results
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="face" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Make sure your face is clearly visible in photos
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="edit" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Personalize your AI-generated bio with your own touch
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  welcomeCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    color: '#666',
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '31%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  actionContent: {
    alignItems: 'center',
    padding: 12,
  },
  actionTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    color: '#666',
    textAlign: 'center',
    fontSize: 11,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planChip: {
    borderRadius: 16,
  },
  statItem: {
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumbers: {
    fontWeight: 'bold',
    color: '#666',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  upgradeButton: {
    marginTop: 8,
  },
  tipsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    color: '#666',
  },
});

export default HomeScreen;