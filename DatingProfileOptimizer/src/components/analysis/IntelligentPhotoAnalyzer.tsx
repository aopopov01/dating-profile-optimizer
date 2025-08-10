/**
 * Intelligent Photo Analyzer - Dating Profile Optimizer
 * Real-time AI-powered photo analysis with actionable feedback
 * Visual feedback system with heat maps and improvement suggestions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, getScoreColor } from '../../utils/designSystem';
import { PrimaryButton, TertiaryButton } from '../shared/Button';
import Card, { ScoreCard } from '../shared/Card';

interface PhotoAnalyzerProps {
  photos: AnalysisPhoto[];
  onAnalysisComplete: (results: PhotoAnalysisResults) => void;
  onRetakePhoto: (photoId: string) => void;
  onPhotoReorder: (newOrder: string[]) => void;
}

interface AnalysisPhoto {
  id: string;
  uri: string;
  order: number;
  fileName?: string;
}

interface PhotoAnalysis {
  photoId: string;
  overallScore: number;
  confidenceScore: number;
  metrics: {
    faceQuality: number;
    lighting: number;
    composition: number;
    background: number;
    expression: number;
    attire: number;
  };
  insights: {
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };
  demographics: {
    estimatedAge: number;
    gender: 'male' | 'female' | 'unknown';
    ethnicity?: string;
  };
  technicalIssues: string[];
  platformOptimization: {
    tinder: number;
    bumble: number;
    hinge: number;
  };
  heatMap?: HeatMapData[];
  faceDetection?: FaceDetectionData;
}

interface HeatMapData {
  x: number;
  y: number;
  intensity: number;
  type: 'good' | 'neutral' | 'poor';
}

interface FaceDetectionData {
  x: number;
  y: number;
  width: number;
  height: number;
  landmarks: {
    eyes: { left: [number, number]; right: [number, number] };
    nose: [number, number];
    mouth: [number, number];
  };
}

interface PhotoAnalysisResults {
  photos: PhotoAnalysis[];
  overallScore: number;
  recommendations: string[];
  profileOptimization: {
    mainPhotoSuggestion: string;
    photoOrder: string[];
    missingPhotoTypes: string[];
  };
}

const { width: screenWidth } = Dimensions.get('window');

const IntelligentPhotoAnalyzer: React.FC<PhotoAnalyzerProps> = ({
  photos,
  onAnalysisComplete,
  onRetakePhoto,
  onPhotoReorder,
}) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<PhotoAnalysis[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string>(photos[0]?.id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Start analysis when component mounts
  useEffect(() => {
    if (photos.length > 0) {
      startAnalysis();
    }
  }, [photos]);

  // Simulate AI analysis process
  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 8000,
      useNativeDriver: false,
    }).start();

    const results: PhotoAnalysis[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const analysis = await analyzePhoto(photo);
      results.push(analysis);
      
      setCurrentAnalysis([...results]);
      setAnalysisProgress(((i + 1) / photos.length) * 100);
    }

    setIsAnalyzing(false);
    
    // Animate completion
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Generate overall results
    const overallScore = Math.round(
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length
    );

    const analysisResults: PhotoAnalysisResults = {
      photos: results,
      overallScore,
      recommendations: generateOverallRecommendations(results),
      profileOptimization: optimizeProfileOrder(results),
    };

    onAnalysisComplete(analysisResults);
  };

  // Simulate photo analysis with realistic data
  const analyzePhoto = async (photo: AnalysisPhoto): Promise<PhotoAnalysis> => {
    // Generate realistic scores with some variance
    const baseScore = Math.floor(Math.random() * 30) + 60; // 60-90
    const variance = () => Math.floor(Math.random() * 20) - 10;

    const faceQuality = Math.max(0, Math.min(100, baseScore + variance()));
    const lighting = Math.max(0, Math.min(100, baseScore + variance()));
    const composition = Math.max(0, Math.min(100, baseScore + variance()));
    const background = Math.max(0, Math.min(100, baseScore + variance()));
    const expression = Math.max(0, Math.min(100, baseScore + variance()));
    const attire = Math.max(0, Math.min(100, baseScore + variance()));

    const overallScore = Math.round(
      (faceQuality + lighting + composition + background + expression + attire) / 6
    );

    return {
      photoId: photo.id,
      overallScore,
      confidenceScore: Math.floor(Math.random() * 20) + 80,
      metrics: {
        faceQuality,
        lighting,
        composition,
        background,
        expression,
        attire,
      },
      insights: generateInsights(overallScore, {
        faceQuality,
        lighting,
        composition,
        background,
        expression,
        attire,
      }),
      demographics: {
        estimatedAge: Math.floor(Math.random() * 15) + 25,
        gender: 'unknown',
      },
      technicalIssues: generateTechnicalIssues(overallScore),
      platformOptimization: {
        tinder: Math.max(0, Math.min(100, overallScore + Math.floor(Math.random() * 20) - 10)),
        bumble: Math.max(0, Math.min(100, overallScore + Math.floor(Math.random() * 20) - 10)),
        hinge: Math.max(0, Math.min(100, overallScore + Math.floor(Math.random() * 20) - 10)),
      },
      heatMap: generateHeatMap(),
      faceDetection: generateFaceDetection(),
    };
  };

  // Generate contextual insights based on scores
  const generateInsights = (overallScore: number, metrics: any) => {
    const strengths = [];
    const improvements = [];
    const suggestions = [];

    // Analyze strengths
    if (metrics.lighting > 80) strengths.push('Excellent natural lighting');
    if (metrics.expression > 85) strengths.push('Genuine, approachable expression');
    if (metrics.composition > 80) strengths.push('Well-framed composition');
    if (metrics.background > 75) strengths.push('Clean, non-distracting background');

    // Identify improvements
    if (metrics.faceQuality < 70) {
      improvements.push('Face clarity could be improved');
      suggestions.push('Use higher resolution camera or better focus');
    }
    if (metrics.lighting < 65) {
      improvements.push('Lighting needs enhancement');
      suggestions.push('Try natural outdoor lighting or well-lit indoor spaces');
    }
    if (metrics.composition < 60) {
      improvements.push('Photo framing could be optimized');
      suggestions.push('Position face to take up 1/3 of the frame');
    }
    if (metrics.background < 55) {
      improvements.push('Background is distracting');
      suggestions.push('Choose simpler backgrounds or use portrait mode');
    }

    // General suggestions based on overall score
    if (overallScore < 70) {
      suggestions.push('Consider retaking this photo with better conditions');
      suggestions.push('Ask a friend to help with photography');
    } else if (overallScore > 85) {
      suggestions.push('Great photo! Consider this for main profile picture');
    }

    return { strengths, improvements, suggestions };
  };

  // Generate technical issues
  const generateTechnicalIssues = (score: number): string[] => {
    const issues = [];
    if (score < 60) {
      const possibleIssues = [
        'Image appears slightly blurry',
        'Low resolution detected',
        'Overexposed areas present',
        'Underexposed shadows',
        'Digital noise visible',
      ];
      return possibleIssues.slice(0, Math.floor(Math.random() * 3) + 1);
    }
    return issues;
  };

  // Generate heat map data
  const generateHeatMap = (): HeatMapData[] => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      points.push({
        x: Math.random(),
        y: Math.random(),
        intensity: Math.random(),
        type: Math.random() > 0.6 ? 'good' : Math.random() > 0.3 ? 'neutral' : 'poor',
      } as HeatMapData);
    }
    return points;
  };

  // Generate face detection data
  const generateFaceDetection = (): FaceDetectionData => {
    return {
      x: 0.3,
      y: 0.2,
      width: 0.4,
      height: 0.5,
      landmarks: {
        eyes: { left: [0.4, 0.35], right: [0.6, 0.35] },
        nose: [0.5, 0.45],
        mouth: [0.5, 0.55],
      },
    };
  };

  // Generate overall recommendations
  const generateOverallRecommendations = (analyses: PhotoAnalysis[]): string[] => {
    const recommendations = [];
    const avgScore = analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length;
    
    if (avgScore < 70) {
      recommendations.push('Consider retaking some photos with better lighting and composition');
      recommendations.push('Add more variety in photo types (headshots, full body, activities)');
    }
    
    if (analyses.filter(a => a.overallScore > 80).length < 2) {
      recommendations.push('Aim for at least 2-3 high-scoring photos (80+) for maximum impact');
    }
    
    recommendations.push('Mix close-up portraits with full-body shots for variety');
    recommendations.push('Include at least one photo showing your interests or hobbies');
    
    return recommendations;
  };

  // Optimize profile photo order
  const optimizeProfileOrder = (analyses: PhotoAnalysis[]) => {
    const sorted = [...analyses].sort((a, b) => b.overallScore - a.overallScore);
    
    return {
      mainPhotoSuggestion: sorted[0].photoId,
      photoOrder: sorted.map(a => a.photoId),
      missingPhotoTypes: [
        'Full body shot',
        'Activity photo',
        'Social setting photo',
        'Professional headshot',
      ],
    };
  };

  // Get current photo analysis
  const getCurrentAnalysis = (): PhotoAnalysis | undefined => {
    return currentAnalysis.find(a => a.photoId === selectedPhoto);
  };

  // Render analysis progress
  const renderAnalysisProgress = () => {
    if (!isAnalyzing) return null;

    return (
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>🔍 Analyzing Your Photos...</Text>
          <Text style={styles.progressSubtitle}>
            Our AI is evaluating lighting, composition, and appeal
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        
        <Text style={styles.progressText}>
          {Math.round(analysisProgress)}% Complete
        </Text>
        
        <View style={styles.analysisSteps}>
          {[
            'Face detection',
            'Lighting analysis',
            'Composition check',
            'Background evaluation',
            'Platform optimization',
          ].map((step, index) => (
            <View key={index} style={styles.analysisStep}>
              <View style={[
                styles.stepIndicator,
                {
                  backgroundColor: analysisProgress > (index * 20)
                    ? COLORS.primary[500]
                    : COLORS.neutral[300],
                },
              ]} />
              <Text style={[
                styles.stepText,
                {
                  color: analysisProgress > (index * 20)
                    ? COLORS.text.primary
                    : COLORS.text.tertiary,
                },
              ]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  // Render photo selector
  const renderPhotoSelector = () => (
    <View style={styles.photoSelector}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoList}
      >
        {photos.map((photo, index) => {
          const analysis = currentAnalysis.find(a => a.photoId === photo.id);
          const isSelected = selectedPhoto === photo.id;
          
          return (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.photoThumbnail,
                isSelected && styles.selectedThumbnail,
              ]}
              onPress={() => setSelectedPhoto(photo.id)}
            >
              <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
              
              {analysis && (
                <View style={[
                  styles.thumbnailScore,
                  { backgroundColor: getScoreColor(analysis.overallScore) },
                ]}>
                  <Text style={styles.thumbnailScoreText}>
                    {analysis.overallScore}
                  </Text>
                </View>
              )}
              
              <Text style={styles.thumbnailLabel}>Photo {index + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Render detailed analysis
  const renderDetailedAnalysis = () => {
    const analysis = getCurrentAnalysis();
    if (!analysis) return null;

    return (
      <Animated.View style={[styles.analysisContainer, { transform: [{ scale: scaleAnim }] }]}>
        {/* Overall Score */}
        <ScoreCard
          style={styles.overallScoreCard}
          scoreColor={getScoreColor(analysis.overallScore)}
        >
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Overall Score</Text>
            <Text style={[
              styles.scoreValue,
              { color: getScoreColor(analysis.overallScore) },
            ]}>
              {analysis.overallScore}/100
            </Text>
          </View>
          
          <Text style={styles.confidenceText}>
            Confidence: {analysis.confidenceScore}%
          </Text>
          
          <View style={styles.scoreDescription}>
            {analysis.overallScore >= 85 && (
              <Text style={styles.scoreDescText}>🌟 Excellent! This photo will perform very well</Text>
            )}
            {analysis.overallScore >= 70 && analysis.overallScore < 85 && (
              <Text style={styles.scoreDescText}>👍 Good photo with room for improvement</Text>
            )}
            {analysis.overallScore < 70 && (
              <Text style={styles.scoreDescText}>⚠️ Consider retaking or replacing this photo</Text>
            )}
          </View>
        </ScoreCard>

        {/* Metrics Breakdown */}
        <Card style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>Analysis Breakdown</Text>
            <TouchableOpacity
              onPress={() => setShowDetailedMetrics(!showDetailedMetrics)}
            >
              <Text style={styles.toggleText}>
                {showDetailedMetrics ? 'Hide' : 'Show'} Details
              </Text>
            </TouchableOpacity>
          </View>
          
          {Object.entries(analysis.metrics).map(([metric, score]) => (
            <View key={metric} style={styles.metricRow}>
              <View style={styles.metricInfo}>
                <Text style={styles.metricName}>
                  {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
                </Text>
                {showDetailedMetrics && (
                  <Text style={styles.metricDescription}>
                    {getMetricDescription(metric)}
                  </Text>
                )}
              </View>
              
              <View style={styles.metricScoreContainer}>
                <View style={styles.metricBar}>
                  <View
                    style={[
                      styles.metricFill,
                      {
                        width: `${score}%`,
                        backgroundColor: getScoreColor(score),
                      },
                    ]}
                  />
                </View>
                <Text style={[
                  styles.metricScore,
                  { color: getScoreColor(score) },
                ]}>
                  {score}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Platform Optimization */}
        <Card style={styles.platformCard}>
          <Text style={styles.platformTitle}>Platform Performance</Text>
          
          <View style={styles.platformScores}>
            {Object.entries(analysis.platformOptimization).map(([platform, score]) => (
              <View key={platform} style={styles.platformScore}>
                <Text style={styles.platformName}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Text>
                <View style={[
                  styles.platformBadge,
                  { backgroundColor: getScoreColor(score) },
                ]}>
                  <Text style={styles.platformScoreText}>{score}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Insights and Suggestions */}
        <Card style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>AI Insights & Suggestions</Text>
          
          {analysis.insights.strengths.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightSectionTitle}>✅ Strengths</Text>
              {analysis.insights.strengths.map((strength, index) => (
                <Text key={index} style={styles.insightText}>• {strength}</Text>
              ))}
            </View>
          )}
          
          {analysis.insights.improvements.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightSectionTitle}>🔧 Areas for Improvement</Text>
              {analysis.insights.improvements.map((improvement, index) => (
                <Text key={index} style={styles.insightText}>• {improvement}</Text>
              ))}
            </View>
          )}
          
          {analysis.insights.suggestions.length > 0 && (
            <View style={styles.insightSection}>
              <Text style={styles.insightSectionTitle}>💡 Suggestions</Text>
              {analysis.insights.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.insightText}>• {suggestion}</Text>
              ))}
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TertiaryButton
            title="Retake Photo"
            onPress={() => onRetakePhoto(selectedPhoto)}
            style={styles.retakeButton}
            icon={<Text style={styles.buttonIcon}>📷</Text>}
          />
          
          <TertiaryButton
            title={showHeatMap ? 'Hide Heat Map' : 'Show Heat Map'}
            onPress={() => setShowHeatMap(!showHeatMap)}
            style={styles.heatMapButton}
            icon={<Text style={styles.buttonIcon}>🔥</Text>}
          />
        </View>
      </Animated.View>
    );
  };

  // Get metric description
  const getMetricDescription = (metric: string): string => {
    const descriptions = {
      faceQuality: 'Clarity and sharpness of facial features',
      lighting: 'Even, natural lighting without harsh shadows',
      composition: 'Framing, angle, and visual balance',
      background: 'Clean, non-distracting background',
      expression: 'Natural, genuine facial expression',
      attire: 'Appropriate clothing and styling choices',
    };
    return descriptions[metric as keyof typeof descriptions] || '';
  };

  if (isAnalyzing) {
    return (
      <ScrollView style={styles.container}>
        {renderAnalysisProgress()}
      </ScrollView>
    );
  }

  if (currentAnalysis.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No analysis data available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {renderPhotoSelector()}
      {renderDetailedAnalysis()}
      
      {currentAnalysis.length === photos.length && (
        <View style={styles.completeActions}>
          <PrimaryButton
            title="Continue to Bio Generation"
            onPress={() => {
              // Navigate to next step
            }}
            fullWidth
            size="large"
            icon={<Text style={styles.buttonIcon}>→</Text>}
            iconPosition="right"
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  
  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },

  // Progress Card
  progressCard: {
    margin: SPACING.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  
  progressHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  
  progressTitle: {
    ...TYPOGRAPHY.headline.small,
    color: COLORS.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  
  progressSubtitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary[500],
  },
  
  progressText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  
  analysisSteps: {
    alignItems: 'flex-start',
    width: '100%',
  },
  
  analysisStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  
  stepText: {
    ...TYPOGRAPHY.body.small,
  },

  // Photo Selector
  photoSelector: {
    marginVertical: SPACING.md,
  },
  
  photoList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  
  photoThumbnail: {
    alignItems: 'center',
    position: 'relative',
  },
  
  selectedThumbnail: {
    transform: [{ scale: 1.1 }],
  },
  
  thumbnailImage: {
    width: 80,
    height: 100,
    borderRadius: RADIUS.md,
    resizeMode: 'cover',
    marginBottom: SPACING.xs,
  },
  
  thumbnailScore: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  thumbnailScoreText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
    fontSize: 10,
  },
  
  thumbnailLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
  },

  // Analysis Container
  analysisContainer: {
    paddingHorizontal: SPACING.lg,
  },

  // Overall Score Card
  overallScoreCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  
  scoreHeader: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  
  scoreTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  
  scoreValue: {
    ...TYPOGRAPHY.headline.medium,
    fontWeight: 'bold',
  },
  
  confidenceText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  
  scoreDescription: {
    alignItems: 'center',
  },
  
  scoreDescText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Metrics Card
  metricsCard: {
    marginBottom: SPACING.lg,
  },
  
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  metricsTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  
  toggleText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  
  metricInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  
  metricName: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  
  metricDescription: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  
  metricScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  
  metricBar: {
    width: 50,
    height: 4,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
    marginRight: SPACING.sm,
  },
  
  metricFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  metricScore: {
    ...TYPOGRAPHY.body.small,
    fontWeight: 'bold',
    minWidth: 24,
  },

  // Platform Card
  platformCard: {
    marginBottom: SPACING.lg,
  },
  
  platformTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  
  platformScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  platformScore: {
    alignItems: 'center',
  },
  
  platformName: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  
  platformBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  
  platformScoreText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.inverse,
    fontWeight: 'bold',
  },

  // Insights Card
  insightsCard: {
    marginBottom: SPACING.lg,
  },
  
  insightsTitle: {
    ...TYPOGRAPHY.title.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  
  insightSection: {
    marginBottom: SPACING.md,
  },
  
  insightSectionTitle: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.primary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  
  insightText: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    marginBottom: 4,
    paddingLeft: SPACING.sm,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  
  retakeButton: {
    flex: 1,
  },
  
  heatMapButton: {
    flex: 1,
  },
  
  completeActions: {
    paddingHorizontal: SPACING.lg,
  },
  
  buttonIcon: {
    fontSize: 16,
  },
});

export default IntelligentPhotoAnalyzer;