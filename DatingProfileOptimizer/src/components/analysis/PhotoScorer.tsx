import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Card, Title, ProgressBar, Chip, Button } from 'react-native-paper';

interface PhotoScore {
  uri: string;
  overallScore: number;
  qualityScore: number;
  attractivenessScore: number;
  backgroundScore: number;
  outfitScore: number;
  expressionScore: number;
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  rank: number;
}

interface PhotoScorerProps {
  photoScores: PhotoScore[];
  onReorder?: (newOrder: PhotoScore[]) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const PhotoScorer: React.FC<PhotoScorerProps> = ({ photoScores, onReorder }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    return '#f44336'; // Red
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 90) return 'Outstanding';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Average';
    return 'Needs Improvement';
  };

  const getRankBadgeColor = (rank: number): string => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return '#e91e63';
    }
  };

  const sortedPhotos = [...photoScores].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Photo Analysis Results</Title>
          <Text style={styles.subtitle}>
            AI-powered analysis of your dating photos
          </Text>
        </Card.Content>
      </Card>

      {sortedPhotos.map((photo, index) => (
        <Card key={`${photo.uri}-${index}`} style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <View style={styles.scoreOverview}>
              <View style={styles.rankBadge} backgroundColor={getRankBadgeColor(photo.rank)}>
                <Text style={styles.rankText}>#{photo.rank}</Text>
              </View>
              <Text style={styles.overallScore}>{photo.overallScore}/100</Text>
              <Text style={styles.scoreDescription}>
                {getScoreDescription(photo.overallScore)}
              </Text>
            </View>
          </View>

          <Card.Content>
            <View style={styles.detailedScores}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Photo Quality</Text>
                <View style={styles.scoreBarContainer}>
                  <ProgressBar
                    progress={photo.qualityScore / 100}
                    color={getScoreColor(photo.qualityScore)}
                    style={styles.progressBar}
                  />
                  <Text style={styles.scoreValue}>{photo.qualityScore}</Text>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Attractiveness</Text>
                <View style={styles.scoreBarContainer}>
                  <ProgressBar
                    progress={photo.attractivenessScore / 100}
                    color={getScoreColor(photo.attractivenessScore)}
                    style={styles.progressBar}
                  />
                  <Text style={styles.scoreValue}>{photo.attractivenessScore}</Text>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Background</Text>
                <View style={styles.scoreBarContainer}>
                  <ProgressBar
                    progress={photo.backgroundScore / 100}
                    color={getScoreColor(photo.backgroundScore)}
                    style={styles.progressBar}
                  />
                  <Text style={styles.scoreValue}>{photo.backgroundScore}</Text>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Outfit & Style</Text>
                <View style={styles.scoreBarContainer}>
                  <ProgressBar
                    progress={photo.outfitScore / 100}
                    color={getScoreColor(photo.outfitScore)}
                    style={styles.progressBar}
                  />
                  <Text style={styles.scoreValue}>{photo.outfitScore}</Text>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Expression</Text>
                <View style={styles.scoreBarContainer}>
                  <ProgressBar
                    progress={photo.expressionScore / 100}
                    color={getScoreColor(photo.expressionScore)}
                    style={styles.progressBar}
                  />
                  <Text style={styles.scoreValue}>{photo.expressionScore}</Text>
                </View>
              </View>
            </View>

            {photo.strengths.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>✓ Strengths</Text>
                <View style={styles.chipContainer}>
                  {photo.strengths.map((strength, idx) => (
                    <Chip key={idx} style={styles.strengthChip} textStyle={styles.strengthText}>
                      {strength}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {photo.improvements.length > 0 && (
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>⚡ Areas for Improvement</Text>
                <View style={styles.chipContainer}>
                  {photo.improvements.map((improvement, idx) => (
                    <Chip key={idx} style={styles.improvementChip} textStyle={styles.improvementText}>
                      {improvement}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {photo.recommendations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.feedbackTitle}>💡 Recommendations</Text>
                {photo.recommendations.map((rec, idx) => (
                  <Text key={idx} style={styles.recommendation}>
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      ))}

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => {/* Navigate to next screen */}}
          style={styles.continueButton}
          contentStyle={styles.continueButtonContent}
        >
          Continue to Bio Generation
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
  headerCard: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#e91e63',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  photoCard: {
    margin: 16,
    elevation: 2,
  },
  photoHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  photo: {
    width: 120,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  scoreOverview: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  overallScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  detailedScores: {
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  scoreBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  progressBar: {
    flex: 1,
    height: 8,
    marginRight: 8,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 30,
    textAlign: 'right',
  },
  feedbackSection: {
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  strengthChip: {
    backgroundColor: '#E8F5E8',
    marginRight: 6,
    marginBottom: 6,
  },
  strengthText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  improvementChip: {
    backgroundColor: '#FFF3E0',
    marginRight: 6,
    marginBottom: 6,
  },
  improvementText: {
    color: '#FF9800',
    fontSize: 12,
  },
  recommendationsSection: {
    marginTop: 8,
  },
  recommendation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
  },
  continueButton: {
    backgroundColor: '#e91e63',
  },
  continueButtonContent: {
    paddingVertical: 8,
  },
});

export default PhotoScorer;