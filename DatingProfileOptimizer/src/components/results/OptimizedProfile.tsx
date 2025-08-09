import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Button,
  Chip,
  IconButton,
} from 'react-native-paper';

interface OptimizedPhoto {
  uri: string;
  rank: number;
  score: number;
  isMain: boolean;
}

interface OptimizedProfileProps {
  photos: OptimizedPhoto[];
  bio: {
    text: string;
    style: string;
    score: number;
  };
  improvements: {
    expectedMatches: number;
    improvementPercentage: number;
    strongPoints: string[];
    platformTips: { [key: string]: string[] };
  };
}

const OptimizedProfile: React.FC<OptimizedProfileProps> = ({
  photos,
  bio,
  improvements,
}) => {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Just optimized my dating profile with AI! Check out my new bio:\n\n${bio.text}\n\nExpected match increase: ${improvements.improvementPercentage}%! 🚀`,
        title: 'My Optimized Dating Profile',
      });
    } catch (error) {
      Alert.alert('Share Failed', 'Unable to share your profile optimization.');
    }
  };

  const handleExport = (platform: string) => {
    Alert.alert(
      `Export to ${platform}`,
      `Copy your optimized profile for ${platform}?\n\nThis will copy your bio and photo recommendations to clipboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => exportToClipboard(platform) },
      ]
    );
  };

  const exportToClipboard = (platform: string) => {
    // Implement clipboard copy functionality
    Alert.alert('Copied!', `Profile optimized for ${platform} copied to clipboard.`);
  };

  const sortedPhotos = [...photos].sort((a, b) => a.rank - b.rank);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.successCard}>
        <Card.Content>
          <View style={styles.successHeader}>
            <Title style={styles.successTitle}>🎉 Profile Optimized!</Title>
            <Text style={styles.successSubtitle}>
              Expected match increase: +{improvements.improvementPercentage}%
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{improvements.expectedMatches}</Text>
              <Text style={styles.statLabel}>Expected matches/week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{bio.score}</Text>
              <Text style={styles.statLabel}>Bio appeal score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{sortedPhotos[0]?.score || 0}</Text>
              <Text style={styles.statLabel}>Top photo score</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.bioCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Your Optimized Bio</Title>
            <Chip style={styles.bioStyleChip}>{bio.style}</Chip>
          </View>
          
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{bio.text}</Text>
            <View style={styles.bioFooter}>
              <Text style={styles.bioLength}>{bio.text.length} characters</Text>
              <IconButton
                icon="content-copy"
                size={20}
                onPress={() => exportToClipboard('bio')}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.photosCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Recommended Photo Order</Title>
          <Text style={styles.photosSubtitle}>
            Use this order for maximum impact
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {sortedPhotos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
                <View style={styles.photoRankBadge}>
                  <Text style={styles.photoRankText}>
                    {photo.isMain ? 'MAIN' : `#${photo.rank}`}
                  </Text>
                </View>
                <Image source={{ uri: photo.uri }} style={styles.optimizedPhoto} />
                <Text style={styles.photoScore}>{photo.score}/100</Text>
              </View>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      <Card style={styles.strengthsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Your Profile Strengths</Title>
          <View style={styles.strengthsContainer}>
            {improvements.strongPoints.map((strength, index) => (
              <Chip key={index} style={styles.strengthChip} textStyle={styles.strengthText}>
                ✓ {strength}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.platformCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Platform-Specific Tips</Title>
          
          {Object.entries(improvements.platformTips).map(([platform, tips]) => (
            <View key={platform} style={styles.platformSection}>
              <Text style={styles.platformName}>{platform}</Text>
              {tips.map((tip, index) => (
                <Text key={index} style={styles.platformTip}>• {tip}</Text>
              ))}
              <Button
                mode="outlined"
                onPress={() => handleExport(platform)}
                style={styles.exportButton}
                compact
              >
                Export for {platform}
              </Button>
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={handleShare}
          style={styles.shareButton}
          contentStyle={styles.buttonContent}
          icon="share-variant"
        >
          Share Success Story
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => Alert.alert('Premium', 'Upgrade to track your success and get ongoing optimization!')}
          style={styles.upgradeButton}
          contentStyle={styles.buttonContent}
        >
          Track My Success
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  successCard: {
    margin: 16,
    backgroundColor: '#e8f5e8',
    elevation: 4,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d2e',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 18,
    color: '#4caf50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d2e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  bioCard: {
    margin: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bioStyleChip: {
    backgroundColor: '#e91e63',
  },
  bioContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  bioLength: {
    fontSize: 12,
    color: '#666',
  },
  photosCard: {
    margin: 16,
    elevation: 2,
  },
  photosSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  photosScroll: {
    marginHorizontal: -8,
  },
  photoItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  photoRankBadge: {
    backgroundColor: '#e91e63',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  photoRankText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optimizedPhoto: {
    width: 100,
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 4,
  },
  photoScore: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  strengthsCard: {
    margin: 16,
    elevation: 2,
  },
  strengthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthChip: {
    backgroundColor: '#e8f5e8',
    marginBottom: 8,
  },
  strengthText: {
    color: '#4caf50',
  },
  platformCard: {
    margin: 16,
    elevation: 2,
  },
  platformSection: {
    marginBottom: 20,
  },
  platformName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e91e63',
    marginBottom: 8,
  },
  platformTip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
  },
  exportButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  shareButton: {
    backgroundColor: '#e91e63',
  },
  upgradeButton: {
    borderColor: '#e91e63',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default OptimizedProfile;