import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Chip,
  ActivityIndicator,
  Divider,
  List,
  Avatar,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ResultsScreenProps {
  navigation: any;
}

interface ProfileResult {
  id: string;
  created_at: string;
  bio: {
    text: string;
    style: string;
    score: number;
  };
  photos: {
    id: string;
    url: string;
    score: number;
    feedback: string;
    platform_recommendations: string[];
  }[];
  overall_score: number;
  improvements: {
    expected_matches_increase: number;
    improvement_percentage: number;
    strong_points: string[];
    weak_points: string[];
    platform_tips: {
      [platform: string]: string[];
    };
  };
  success_predictions: {
    tinder: number;
    bumble: number;
    hinge: number;
    overall: number;
  };
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ProfileResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'photos' | 'bio' | 'analytics'>('overview');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch('http://localhost:3004/api/profile/results', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        
        if (data.results && data.results.length > 0) {
          setCurrentResult(data.results[0]); // Show most recent result
        } else {
          // Generate mock result for demo
          generateMockResult();
        }
      } else {
        generateMockResult();
      }
    } catch (error) {
      console.error('Error loading results:', error);
      generateMockResult();
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResult = () => {
    const mockResult: ProfileResult = {
      id: 'demo-result-1',
      created_at: new Date().toISOString(),
      bio: {
        text: "Adventure seeker and coffee enthusiast ☕ Love exploring new places, trying authentic cuisine, and meaningful conversations under starry skies. Looking for someone who shares my passion for life and isn't afraid of spontaneous road trips! 🚗✨",
        style: 'adventurous',
        score: 87,
      },
      photos: [
        {
          id: 'photo1',
          url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
          score: 92,
          feedback: 'Great natural lighting and genuine smile',
          platform_recommendations: ['Perfect for main profile photo', 'High swipe rate potential']
        },
        {
          id: 'photo2',
          url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
          score: 78,
          feedback: 'Shows personality and interests well',
          platform_recommendations: ['Great for secondary photos', 'Shows active lifestyle']
        }
      ],
      overall_score: 85,
      improvements: {
        expected_matches_increase: 150,
        improvement_percentage: 75,
        strong_points: [
          'Authentic and engaging bio',
          'High-quality photos with great lighting',
          'Shows variety in interests',
          'Optimized for your target age group'
        ],
        weak_points: [
          'Consider adding one more group photo',
          'Bio could mention specific hobbies',
          'Add a photo showing your profession'
        ],
        platform_tips: {
          'Tinder': ['Use photo #1 as main', 'Keep bio concise', 'Show personality'],
          'Bumble': ['Highlight career achievements', 'Show social activities', 'Be specific about interests'],
          'Hinge': ['Answer prompts authentically', 'Use varied photo types', 'Show conversation starters']
        }
      },
      success_predictions: {
        tinder: 82,
        bumble: 88,
        hinge: 85,
        overall: 85
      }
    };

    setCurrentResult(mockResult);
    setResults([mockResult]);
  };

  const shareResults = async () => {
    if (!currentResult) return;

    try {
      const shareMessage = `🎉 My Dating Profile Optimization Results!\n\n` +
        `📈 Overall Score: ${currentResult.overall_score}/100\n` +
        `💕 Expected ${currentResult.improvements.expected_matches_increase}% more matches!\n\n` +
        `Created with Dating Profile Optimizer by Xciterr Ltd`;

      await Share.share({
        message: shareMessage,
        title: 'My Profile Results',
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  };

  const copyBio = async () => {
    if (currentResult?.bio.text) {
      try {
        await Clipboard.setString(currentResult.bio.text);
        Alert.alert(
          'Bio Copied!',
          'Your optimized bio has been copied to clipboard. You can now paste it in your dating app profile.',
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Error copying bio:', error);
        Alert.alert(
          'Copy Failed',
          'Unable to copy to clipboard. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const renderTabContent = () => {
    if (!currentResult) return null;

    switch (selectedTab) {
      case 'overview':
        return renderOverviewTab();
      case 'photos':
        return renderPhotosTab();
      case 'bio':
        return renderBioTab();
      case 'analytics':
        return renderAnalyticsTab();
      default:
        return null;
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Overall Score */}
      <Card style={styles.scoreCard}>
        <Card.Content style={styles.scoreContent}>
          <View style={styles.scoreHeader}>
            <Text variant="headlineMedium" style={styles.scoreNumber}>
              {currentResult!.overall_score}
            </Text>
            <Text variant="titleLarge" style={styles.scoreLabel}>
              /100
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.scoreTitle}>
            Profile Optimization Score
          </Text>
          <Text variant="bodyMedium" style={styles.scoreDescription}>
            Your profile is performing {currentResult!.overall_score > 80 ? 'excellently' : 
              currentResult!.overall_score > 60 ? 'well' : 'below average'}
          </Text>
        </Card.Content>
      </Card>

      {/* Key Improvements */}
      <Card style={styles.improvementCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            🎯 Expected Results
          </Text>
          <View style={styles.improvementStats}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                +{currentResult!.improvements.expected_matches_increase}%
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                More Matches
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                {currentResult!.improvements.improvement_percentage}%
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                Overall Improvement
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Strong Points */}
      <Card style={styles.feedbackCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            ✅ What's Working Well
          </Text>
          {currentResult!.improvements.strong_points.map((point, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Icon name="check-circle" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.feedbackText}>
                {point}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Improvement Areas */}
      <Card style={styles.feedbackCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            🔧 Areas for Improvement
          </Text>
          {currentResult!.improvements.weak_points.map((point, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Icon name="warning" size={20} color="#ff9800" />
              <Text variant="bodyMedium" style={styles.feedbackText}>
                {point}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </View>
  );

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      <Text variant="titleLarge" style={styles.sectionTitle}>
        📷 Photo Analysis
      </Text>
      {currentResult!.photos.map((photo, index) => (
        <Card key={photo.id} style={styles.photoCard}>
          <Card.Content>
            <View style={styles.photoHeader}>
              <Avatar.Image 
                source={{ uri: photo.url }} 
                size={60}
                style={styles.photoThumbnail}
              />
              <View style={styles.photoInfo}>
                <Text variant="titleMedium">
                  Photo #{index + 1}
                </Text>
                <View style={styles.photoScore}>
                  <Text variant="bodyMedium" style={styles.scoreText}>
                    Score: {photo.score}/100
                  </Text>
                  <Chip 
                    style={[
                      styles.scoreChip,
                      { backgroundColor: photo.score > 80 ? '#e8f5e8' : photo.score > 60 ? '#fff3e0' : '#ffebee' }
                    ]}
                    textStyle={{ 
                      color: photo.score > 80 ? '#2e7d32' : photo.score > 60 ? '#f57c00' : '#c62828'
                    }}
                  >
                    {photo.score > 80 ? 'Excellent' : photo.score > 60 ? 'Good' : 'Needs Work'}
                  </Chip>
                </View>
              </View>
            </View>
            <Text variant="bodyMedium" style={styles.photoFeedback}>
              {photo.feedback}
            </Text>
            <View style={styles.recommendations}>
              <Text variant="titleSmall" style={styles.recommendationsTitle}>
                Recommendations:
              </Text>
              {photo.platform_recommendations.map((rec, recIndex) => (
                <Text key={recIndex} variant="bodySmall" style={styles.recommendationItem}>
                  • {rec}
                </Text>
              ))}
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderBioTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.bioCard}>
        <Card.Content>
          <View style={styles.bioHeader}>
            <Text variant="titleLarge" style={styles.cardTitle}>
              📝 Optimized Bio
            </Text>
            <View style={styles.bioScore}>
              <Text variant="bodyMedium">Score: {currentResult!.bio.score}/100</Text>
              <Chip style={styles.styleChip}>
                {currentResult!.bio.style}
              </Chip>
            </View>
          </View>
          
          <Surface style={styles.bioText}>
            <Text variant="bodyLarge" style={styles.bioContent}>
              {currentResult!.bio.text}
            </Text>
          </Surface>

          <View style={styles.bioActions}>
            <Button
              mode="contained"
              onPress={copyBio}
              icon="content-copy"
              style={styles.copyButton}
            >
              Copy Bio
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Bio')}
              icon="edit"
            >
              Edit Bio
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Platform-Specific Tips */}
      <Card style={styles.tipsCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            📱 Platform-Specific Tips
          </Text>
          {Object.entries(currentResult!.improvements.platform_tips).map(([platform, tips]) => (
            <List.Accordion
              key={platform}
              title={platform}
              titleStyle={styles.platformTitle}
              left={props => <List.Icon {...props} icon="heart" />}
            >
              {tips.map((tip, index) => (
                <List.Item
                  key={index}
                  title={tip}
                  titleNumberOfLines={3}
                  left={() => <Icon name="lightbulb-outline" size={20} color="#ff9800" />}
                />
              ))}
            </List.Accordion>
          ))}
        </Card.Content>
      </Card>
    </View>
  );

  const renderAnalyticsTab = () => {
    const chartData = {
      labels: ['Tinder', 'Bumble', 'Hinge'],
      datasets: [
        {
          data: [
            currentResult!.success_predictions.tinder,
            currentResult!.success_predictions.bumble,
            currentResult!.success_predictions.hinge,
          ],
          color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    const pieData = [
      {
        name: 'Bio Quality',
        population: currentResult!.bio.score,
        color: '#e91e63',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Photo Quality',
        population: Math.round(currentResult!.photos.reduce((sum, p) => sum + p.score, 0) / currentResult!.photos.length),
        color: '#ff9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: 'Profile Completeness',
        population: 92,
        color: '#4caf50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
    ];

    return (
      <View style={styles.tabContent}>
        <Card style={styles.analyticsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              📊 Success Predictions by Platform
            </Text>
            <LineChart
              data={chartData}
              width={width - 60}
              height={200}
              yAxisSuffix="%"
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(233, 30, 99, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#e91e63',
                },
              }}
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        <Card style={styles.analyticsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              🎯 Profile Component Breakdown
            </Text>
            <PieChart
              data={pieData}
              width={width - 60}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        <Card style={styles.analyticsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>
              🏆 Optimization History
            </Text>
            <Text variant="bodyMedium" style={styles.historyText}>
              Profile created: {new Date(currentResult!.created_at).toLocaleDateString()}
            </Text>
            <Text variant="bodyMedium" style={styles.historyText}>
              Last optimized: Today
            </Text>
            <Text variant="bodyMedium" style={styles.historyText}>
              Total optimizations: 1
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading your results...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="analytics" size={80} color="#ccc" />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Results Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyMessage}>
            Create your first optimized profile to see detailed results and analytics.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Upload')}
            style={styles.createButton}
            icon="upload"
          >
            Upload Photos
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Profile Results
          </Text>
          <IconButton
            icon="share"
            size={24}
            onPress={shareResults}
            style={styles.shareButton}
          />
        </View>
      </Surface>

      {/* Tab Navigation */}
      <Surface style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview', icon: 'dashboard' },
          { key: 'photos', label: 'Photos', icon: 'photo-camera' },
          { key: 'bio', label: 'Bio', icon: 'edit' },
          { key: 'analytics', label: 'Analytics', icon: 'analytics' },
        ].map((tab) => (
          <Button
            key={tab.key}
            mode={selectedTab === tab.key ? 'contained' : 'text'}
            onPress={() => setSelectedTab(tab.key as any)}
            style={styles.tabButton}
            compact
            icon={tab.icon}
          >
            {tab.label}
          </Button>
        ))}
      </Surface>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  emptyMessage: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  createButton: {
    minWidth: 200,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    margin: 0,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  scoreCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  scoreContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e91e63',
  },
  scoreLabel: {
    color: '#666',
    marginLeft: 4,
  },
  scoreTitle: {
    color: '#333',
    marginBottom: 4,
  },
  scoreDescription: {
    color: '#666',
    textAlign: 'center',
  },
  improvementCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    color: '#333',
    marginBottom: 16,
  },
  improvementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#4caf50',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  feedbackCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  feedbackText: {
    flex: 1,
    color: '#555',
  },
  sectionTitle: {
    color: '#333',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  photoCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photoThumbnail: {
    marginRight: 16,
  },
  photoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  photoScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  scoreText: {
    color: '#666',
  },
  scoreChip: {
    height: 28,
  },
  photoFeedback: {
    color: '#555',
    marginBottom: 12,
  },
  recommendations: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  recommendationsTitle: {
    color: '#333',
    marginBottom: 8,
  },
  recommendationItem: {
    color: '#666',
    marginBottom: 4,
  },
  bioCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bioScore: {
    alignItems: 'flex-end',
    gap: 8,
  },
  styleChip: {
    backgroundColor: '#e3f2fd',
  },
  bioText: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  bioContent: {
    color: '#333',
    lineHeight: 24,
  },
  bioActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    flex: 1,
  },
  tipsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  platformTitle: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  analyticsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
    alignSelf: 'center',
  },
  historyText: {
    color: '#666',
    marginBottom: 8,
  },
});

export default ResultsScreen;