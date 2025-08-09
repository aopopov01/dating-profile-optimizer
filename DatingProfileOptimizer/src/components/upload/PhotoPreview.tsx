import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Card, Title, Chip } from 'react-native-paper';

interface PhotoPreviewProps {
  photos: string[];
  analysisResults?: PhotoAnalysisResult[];
}

interface PhotoAnalysisResult {
  uri: string;
  qualityScore: number;
  attractivenessScore: number;
  backgroundScore: number;
  overallScore: number;
  recommendations: string[];
}

const { width: screenWidth } = Dimensions.get('window');
const photoWidth = (screenWidth - 48) / 2;

const PhotoPreview: React.FC<PhotoPreviewProps> = ({ photos, analysisResults }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    return '#f44336'; // Red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Photo Analysis Preview</Title>
          <Text style={styles.subtitle}>
            {photos.length} photos ready for analysis
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.photosGrid}>
        {photos.map((photoUri, index) => {
          const analysis = analysisResults?.find(result => result.uri === photoUri);
          
          return (
            <Card key={index} style={styles.photoCard}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              
              {analysis && (
                <Card.Content style={styles.analysisContent}>
                  <View style={styles.scoreContainer}>
                    <Chip 
                      style={[
                        styles.scoreChip, 
                        { backgroundColor: getScoreColor(analysis.overallScore) }
                      ]}
                      textStyle={styles.scoreText}
                    >
                      {analysis.overallScore}/100
                    </Chip>
                    <Text style={styles.scoreLabel}>
                      {getScoreLabel(analysis.overallScore)}
                    </Text>
                  </View>
                  
                  <View style={styles.detailedScores}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreCategory}>Quality:</Text>
                      <Text style={styles.scoreValue}>{analysis.qualityScore}/100</Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreCategory}>Appeal:</Text>
                      <Text style={styles.scoreValue}>{analysis.attractivenessScore}/100</Text>
                    </View>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreCategory}>Background:</Text>
                      <Text style={styles.scoreValue}>{analysis.backgroundScore}/100</Text>
                    </View>
                  </View>
                  
                  {analysis.recommendations.length > 0 && (
                    <View style={styles.recommendationsContainer}>
                      <Text style={styles.recommendationsTitle}>Tips:</Text>
                      {analysis.recommendations.slice(0, 2).map((rec, idx) => (
                        <Text key={idx} style={styles.recommendation}>
                          • {rec}
                        </Text>
                      ))}
                    </View>
                  )}
                </Card.Content>
              )}
              
              {!analysis && (
                <Card.Content style={styles.pendingContent}>
                  <Text style={styles.pendingText}>Ready for analysis</Text>
                </Card.Content>
              )}
            </Card>
          );
        })}
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  photoCard: {
    width: photoWidth,
    marginBottom: 16,
    elevation: 2,
  },
  photo: {
    width: '100%',
    height: photoWidth * 1.2,
    resizeMode: 'cover',
  },
  analysisContent: {
    padding: 12,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreChip: {
    marginBottom: 4,
  },
  scoreText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailedScores: {
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  scoreCategory: {
    fontSize: 12,
    color: '#666',
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  pendingContent: {
    padding: 12,
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default PhotoPreview;