const tf = require('@tensorflow/tfjs-node');
const faceapi = require('face-api.js');
const sharp = require('sharp');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const logger = require('../config/logger');
const db = require('../config/database');

// Configure face-api.js for Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

class PhotoAnalysisService {
  constructor() {
    this.initialized = false;
    this.models = null;
    
    // Attractiveness scoring weights based on research
    this.scoringWeights = {
      face_symmetry: 0.25,
      facial_features: 0.20,
      lighting_quality: 0.15,
      composition: 0.15,
      background_quality: 0.10,
      image_sharpness: 0.10,
      color_balance: 0.05
    };

    // Photo quality thresholds
    this.qualityThresholds = {
      resolution: {
        min_width: 400,
        min_height: 400,
        recommended_width: 800,
        recommended_height: 800
      },
      lighting: {
        brightness_range: [50, 200],
        contrast_min: 30
      },
      face_detection: {
        min_confidence: 0.7,
        max_faces: 3,
        face_size_ratio: 0.15 // minimum face size relative to image
      }
    };

    // Lifestyle and activity detection keywords
    this.activityPatterns = {
      sports: ['gym', 'fitness', 'workout', 'running', 'basketball', 'soccer', 'tennis'],
      travel: ['beach', 'mountain', 'city', 'travel', 'vacation', 'passport', 'landmark'],
      social: ['friends', 'party', 'event', 'wedding', 'celebration', 'group'],
      professional: ['office', 'suit', 'business', 'meeting', 'conference', 'corporate'],
      creative: ['art', 'music', 'painting', 'drawing', 'studio', 'creative', 'design'],
      outdoor: ['hiking', 'camping', 'nature', 'forest', 'park', 'outdoor', 'adventure']
    };
  }

  async initialize() {
    try {
      logger.info('Initializing photo analysis service...');

      // Load face-api.js models
      const MODEL_PATH = process.env.FACEAPI_MODEL_PATH || './models';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
        faceapi.nets.faceExpressionNet.loadFromDisk(MODEL_PATH),
        faceapi.nets.ageGenderNet.loadFromDisk(MODEL_PATH)
      ]);

      // Initialize TensorFlow.js
      await tf.ready();
      
      this.initialized = true;
      logger.info('Photo analysis service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Photo analysis service initialization failed:', error);
      // Continue without models for basic analysis
      this.initialized = false;
      return false;
    }
  }

  /**
   * Comprehensive photo analysis for dating profiles
   */
  async analyzePhoto(imageBuffer, photoMetadata = {}) {
    try {
      const startTime = Date.now();
      
      // Basic image analysis
      const imageStats = await this.getImageStatistics(imageBuffer);
      
      // Face detection and analysis
      const faceAnalysis = await this.analyzeFaces(imageBuffer);
      
      // Quality assessment
      const qualityAnalysis = await this.assessPhotoQuality(imageBuffer, imageStats);
      
      // Attractiveness scoring
      const attractivenessScore = await this.calculateAttractivenessScore({
        imageStats,
        faceAnalysis,
        qualityAnalysis
      });
      
      // Lifestyle and activity detection
      const lifestyleAnalysis = await this.detectLifestyleSignals(imageBuffer, photoMetadata);
      
      // Background analysis
      const backgroundAnalysis = await this.analyzeBackground(imageBuffer);
      
      // Composition analysis
      const compositionAnalysis = await this.analyzeComposition(imageBuffer, faceAnalysis);
      
      const processingTime = Date.now() - startTime;
      
      const analysis = {
        attractiveness_score: attractivenessScore,
        face_analysis: faceAnalysis,
        quality_assessment: qualityAnalysis,
        lifestyle_signals: lifestyleAnalysis,
        background_analysis: backgroundAnalysis,
        composition_analysis: compositionAnalysis,
        image_statistics: imageStats,
        processing_time_ms: processingTime,
        recommendations: [],
        overall_rating: this.calculateOverallRating({
          attractivenessScore,
          qualityAnalysis,
          faceAnalysis,
          compositionAnalysis
        })
      };
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);
      
      logger.info('Photo analysis completed:', {
        processingTime: `${processingTime}ms`,
        attractivenessScore,
        overallRating: analysis.overall_rating
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('Photo analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get basic image statistics
   */
  async getImageStatistics(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const stats = await image.stats();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        filesize: imageBuffer.length,
        aspect_ratio: (metadata.width / metadata.height).toFixed(2),
        channels: metadata.channels,
        density: metadata.density,
        color_stats: stats.channels.map(channel => ({
          mean: Math.round(channel.mean),
          std: Math.round(channel.std),
          min: channel.min,
          max: channel.max
        }))
      };
    } catch (error) {
      logger.error('Failed to get image statistics:', error);
      throw error;
    }
  }

  /**
   * Analyze faces in the photo
   */
  async analyzeFaces(imageBuffer) {
    try {
      if (!this.initialized) {
        return {
          faces_detected: 0,
          face_confidence: 0,
          expressions: [],
          age_estimates: [],
          gender_estimates: [],
          face_landmarks: [],
          warning: 'Face detection models not available'
        };
      }

      // Convert buffer to canvas-compatible format
      const image = sharp(imageBuffer);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      // Create canvas from image data
      const canvas = new Canvas(info.width, info.height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(info.width, info.height);
      
      // Convert to RGBA format
      for (let i = 0; i < data.length; i += info.channels) {
        const idx = (i / info.channels) * 4;
        imageData.data[idx] = data[i];     // R
        imageData.data[idx + 1] = data[i + 1] || data[i]; // G
        imageData.data[idx + 2] = data[i + 2] || data[i]; // B
        imageData.data[idx + 3] = 255;     // A
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Detect faces with all features
      const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      const faces = detections.map((detection, index) => ({
        confidence: detection.detection.score,
        box: detection.detection.box,
        landmarks: detection.landmarks ? detection.landmarks.positions : [],
        expressions: detection.expressions,
        age: detection.age,
        gender: detection.gender,
        face_size_ratio: (detection.detection.box.width * detection.detection.box.height) / (info.width * info.height)
      }));

      // Calculate face symmetry scores
      const symmetryScores = faces.map(face => this.calculateFaceSymmetry(face.landmarks));

      return {
        faces_detected: faces.length,
        faces: faces,
        symmetry_scores: symmetryScores,
        dominant_expression: this.getDominantExpression(faces),
        average_age: faces.length > 0 ? faces.reduce((sum, f) => sum + f.age, 0) / faces.length : 0,
        gender_distribution: this.getGenderDistribution(faces)
      };
      
    } catch (error) {
      logger.error('Face analysis failed:', error);
      return {
        faces_detected: 0,
        error: error.message,
        warning: 'Face analysis failed - using fallback scoring'
      };
    }
  }

  /**
   * Calculate face symmetry score
   */
  calculateFaceSymmetry(landmarks) {
    if (!landmarks || landmarks.length < 68) {
      return 50; // Default score if landmarks not available
    }

    try {
      // Use specific landmark points for symmetry calculation
      const leftEye = landmarks[36];
      const rightEye = landmarks[45];
      const noseTip = landmarks[30];
      const leftMouth = landmarks[48];
      const rightMouth = landmarks[54];

      // Calculate center line
      const centerX = (leftEye.x + rightEye.x) / 2;
      
      // Calculate deviations from center
      const noseDeviation = Math.abs(noseTip.x - centerX);
      const eyeDistanceRatio = Math.abs(leftEye.x - centerX) / Math.abs(rightEye.x - centerX);
      const mouthDeviation = Math.abs((leftMouth.x + rightMouth.x) / 2 - centerX);
      
      // Normalize and score (lower deviation = higher symmetry)
      const symmetryScore = Math.max(0, 100 - (noseDeviation + mouthDeviation) * 2 - Math.abs(1 - eyeDistanceRatio) * 20);
      
      return Math.round(symmetryScore);
    } catch (error) {
      logger.error('Symmetry calculation failed:', error);
      return 50;
    }
  }

  /**
   * Assess photo quality
   */
  async assessPhotoQuality(imageBuffer, imageStats) {
    try {
      const image = sharp(imageBuffer);
      
      // Resolution score
      const resolutionScore = this.calculateResolutionScore(imageStats.width, imageStats.height);
      
      // Sharpness analysis using Laplacian variance
      const sharpnessScore = await this.calculateSharpnessScore(image);
      
      // Lighting analysis
      const lightingScore = this.calculateLightingScore(imageStats.color_stats);
      
      // Color balance analysis
      const colorBalanceScore = this.calculateColorBalance(imageStats.color_stats);
      
      // Noise analysis
      const noiseScore = await this.calculateNoiseScore(image);
      
      const qualityScore = Math.round(
        resolutionScore * 0.25 +
        sharpnessScore * 0.25 +
        lightingScore * 0.25 +
        colorBalanceScore * 0.15 +
        noiseScore * 0.10
      );

      return {
        overall_quality_score: qualityScore,
        resolution_score: resolutionScore,
        sharpness_score: sharpnessScore,
        lighting_score: lightingScore,
        color_balance_score: colorBalanceScore,
        noise_score: noiseScore,
        file_size_mb: (imageBuffer.length / 1024 / 1024).toFixed(2),
        is_high_quality: qualityScore >= 75,
        quality_tier: this.getQualityTier(qualityScore)
      };
    } catch (error) {
      logger.error('Quality assessment failed:', error);
      return {
        overall_quality_score: 50,
        error: error.message
      };
    }
  }

  /**
   * Calculate resolution score
   */
  calculateResolutionScore(width, height) {
    const totalPixels = width * height;
    const thresholds = this.qualityThresholds.resolution;
    
    if (width >= thresholds.recommended_width && height >= thresholds.recommended_height) {
      return 100;
    } else if (width >= thresholds.min_width && height >= thresholds.min_height) {
      return 80;
    } else {
      return Math.max(20, (totalPixels / (thresholds.min_width * thresholds.min_height)) * 60);
    }
  }

  /**
   * Calculate sharpness score using Laplacian variance
   */
  async calculateSharpnessScore(sharpImage) {
    try {
      // Convert to grayscale and apply Laplacian filter
      const { data, info } = await sharpImage
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Calculate variance of Laplacian
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
      const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
      
      // Normalize variance to 0-100 scale
      const sharpnessScore = Math.min(100, Math.max(0, (variance / 1000) * 100));
      
      return Math.round(sharpnessScore);
    } catch (error) {
      logger.error('Sharpness calculation failed:', error);
      return 50;
    }
  }

  /**
   * Calculate lighting score
   */
  calculateLightingScore(colorStats) {
    if (!colorStats || colorStats.length === 0) return 50;
    
    const brightness = colorStats[0].mean; // Using first channel (R or grayscale)
    const contrast = colorStats[0].std;
    
    const thresholds = this.qualityThresholds.lighting;
    
    let brightnessScore = 100;
    if (brightness < thresholds.brightness_range[0] || brightness > thresholds.brightness_range[1]) {
      brightnessScore = Math.max(0, 100 - Math.abs(brightness - 125) * 2);
    }
    
    let contrastScore = Math.min(100, Math.max(0, (contrast / thresholds.contrast_min) * 100));
    
    return Math.round((brightnessScore + contrastScore) / 2);
  }

  /**
   * Calculate color balance score
   */
  calculateColorBalance(colorStats) {
    if (!colorStats || colorStats.length < 3) return 70;
    
    const [r, g, b] = colorStats;
    
    // Calculate differences between channels
    const rgDiff = Math.abs(r.mean - g.mean);
    const rbDiff = Math.abs(r.mean - b.mean);
    const gbDiff = Math.abs(g.mean - b.mean);
    
    const avgDiff = (rgDiff + rbDiff + gbDiff) / 3;
    
    // Lower difference = better color balance
    const balanceScore = Math.max(0, 100 - (avgDiff / 2));
    
    return Math.round(balanceScore);
  }

  /**
   * Calculate noise score
   */
  async calculateNoiseScore(sharpImage) {
    try {
      // Apply median filter and compare with original
      const originalBuffer = await sharpImage.raw().toBuffer();
      const filteredBuffer = await sharpImage.median(3).raw().toBuffer();
      
      let diffSum = 0;
      for (let i = 0; i < originalBuffer.length; i++) {
        diffSum += Math.abs(originalBuffer[i] - filteredBuffer[i]);
      }
      
      const avgDiff = diffSum / originalBuffer.length;
      const noiseScore = Math.max(0, 100 - (avgDiff * 2));
      
      return Math.round(noiseScore);
    } catch (error) {
      logger.error('Noise calculation failed:', error);
      return 70;
    }
  }

  /**
   * Calculate overall attractiveness score
   */
  async calculateAttractivenessScore({ imageStats, faceAnalysis, qualityAnalysis }) {
    try {
      let scores = {
        face_symmetry: 50,
        facial_features: 50,
        lighting_quality: qualityAnalysis.lighting_score || 50,
        composition: 50,
        background_quality: 50,
        image_sharpness: qualityAnalysis.sharpness_score || 50,
        color_balance: qualityAnalysis.color_balance_score || 50
      };

      // Face-based scoring
      if (faceAnalysis.faces_detected > 0) {
        const mainFace = faceAnalysis.faces[0];
        
        // Symmetry score
        scores.face_symmetry = faceAnalysis.symmetry_scores[0] || 50;
        
        // Facial features score based on confidence and size
        scores.facial_features = Math.min(100, (mainFace.confidence * 100) + 
          (mainFace.face_size_ratio * 200));
        
        // Composition score - face positioning
        scores.composition = this.calculateFaceCompositionScore(mainFace, imageStats);
      }
      
      // Background quality estimation
      scores.background_quality = this.estimateBackgroundQuality(qualityAnalysis);
      
      // Calculate weighted score
      const weightedScore = Object.keys(scores).reduce((total, key) => {
        return total + (scores[key] * (this.scoringWeights[key] || 0.1));
      }, 0);

      return {
        overall_score: Math.round(weightedScore),
        component_scores: scores,
        score_breakdown: this.getScoreBreakdown(scores)
      };
    } catch (error) {
      logger.error('Attractiveness scoring failed:', error);
      return {
        overall_score: 50,
        error: error.message
      };
    }
  }

  /**
   * Calculate face composition score
   */
  calculateFaceCompositionScore(face, imageStats) {
    const faceCenter = {
      x: face.box.x + face.box.width / 2,
      y: face.box.y + face.box.height / 2
    };
    
    const imageCenter = {
      x: imageStats.width / 2,
      y: imageStats.height / 2
    };
    
    // Distance from center (rule of thirds consideration)
    const distance = Math.sqrt(
      Math.pow(faceCenter.x - imageCenter.x, 2) + 
      Math.pow(faceCenter.y - imageCenter.y, 2)
    );
    
    const maxDistance = Math.sqrt(Math.pow(imageStats.width / 2, 2) + Math.pow(imageStats.height / 2, 2));
    const centerScore = 100 - (distance / maxDistance) * 50;
    
    // Face size relative to image
    const faceSizeScore = Math.min(100, face.face_size_ratio * 400);
    
    return Math.round((centerScore + faceSizeScore) / 2);
  }

  /**
   * Detect lifestyle signals and activities
   */
  async detectLifestyleSignals(imageBuffer, metadata = {}) {
    try {
      // This would ideally use computer vision to detect objects/scenes
      // For now, using metadata and basic analysis
      
      const signals = {
        detected_activities: [],
        lifestyle_category: 'general',
        setting_type: 'indoor', // indoor/outdoor/studio
        social_context: 'solo', // solo/group/couple
        formality_level: 'casual', // casual/business/formal
        confidence_scores: {}
      };
      
      // Basic scene analysis based on color patterns and brightness
      const imageStats = await this.getImageStatistics(imageBuffer);
      
      // Outdoor detection (high brightness, high contrast)
      if (imageStats.color_stats[0].mean > 150 && imageStats.color_stats[0].std > 40) {
        signals.setting_type = 'outdoor';
        signals.detected_activities.push('outdoor');
      }
      
      // Professional setting detection (low color variance, balanced lighting)
      const colorVariance = imageStats.color_stats.reduce((sum, c) => sum + c.std, 0) / 3;
      if (colorVariance < 30 && imageStats.color_stats[0].mean > 100 && imageStats.color_stats[0].mean < 180) {
        signals.formality_level = 'business';
        signals.detected_activities.push('professional');
      }
      
      // Use filename/metadata for additional context
      if (metadata.filename) {
        const filename = metadata.filename.toLowerCase();
        for (const [category, keywords] of Object.entries(this.activityPatterns)) {
          if (keywords.some(keyword => filename.includes(keyword))) {
            signals.detected_activities.push(category);
            signals.confidence_scores[category] = 0.7;
          }
        }
      }
      
      return signals;
    } catch (error) {
      logger.error('Lifestyle detection failed:', error);
      return {
        detected_activities: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze background composition
   */
  async analyzeBackground(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const stats = await image.stats();
      
      // Edge detection to identify background complexity
      const edges = await image
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .raw()
        .toBuffer();
      
      const edgeIntensity = edges.reduce((sum, val) => sum + val, 0) / edges.length;
      
      return {
        complexity_score: Math.min(100, edgeIntensity / 2),
        color_harmony_score: this.calculateColorHarmony(stats.channels),
        background_type: edgeIntensity > 30 ? 'complex' : 'simple',
        distraction_level: edgeIntensity > 50 ? 'high' : edgeIntensity > 20 ? 'medium' : 'low'
      };
    } catch (error) {
      logger.error('Background analysis failed:', error);
      return {
        complexity_score: 50,
        error: error.message
      };
    }
  }

  /**
   * Analyze photo composition
   */
  async analyzeComposition(imageBuffer, faceAnalysis) {
    try {
      const imageStats = await this.getImageStatistics(imageBuffer);
      
      const composition = {
        rule_of_thirds_score: 50,
        balance_score: 50,
        framing_score: 50,
        aspect_ratio_score: this.calculateAspectRatioScore(imageStats.aspect_ratio),
        overall_composition_score: 50
      };
      
      if (faceAnalysis.faces_detected > 0) {
        const mainFace = faceAnalysis.faces[0];
        composition.rule_of_thirds_score = this.calculateRuleOfThirdsScore(mainFace, imageStats);
        composition.framing_score = this.calculateFramingScore(mainFace, imageStats);
      }
      
      composition.balance_score = await this.calculateVisualBalance(imageBuffer);
      composition.overall_composition_score = Math.round(
        (composition.rule_of_thirds_score + composition.balance_score + 
         composition.framing_score + composition.aspect_ratio_score) / 4
      );
      
      return composition;
    } catch (error) {
      logger.error('Composition analysis failed:', error);
      return {
        overall_composition_score: 50,
        error: error.message
      };
    }
  }

  /**
   * Calculate rule of thirds score
   */
  calculateRuleOfThirdsScore(face, imageStats) {
    const faceCenter = {
      x: face.box.x + face.box.width / 2,
      y: face.box.y + face.box.height / 2
    };
    
    // Rule of thirds points
    const thirdPoints = [
      { x: imageStats.width / 3, y: imageStats.height / 3 },
      { x: (2 * imageStats.width) / 3, y: imageStats.height / 3 },
      { x: imageStats.width / 3, y: (2 * imageStats.height) / 3 },
      { x: (2 * imageStats.width) / 3, y: (2 * imageStats.height) / 3 }
    ];
    
    // Find closest third point
    const distances = thirdPoints.map(point => 
      Math.sqrt(Math.pow(faceCenter.x - point.x, 2) + Math.pow(faceCenter.y - point.y, 2))
    );
    
    const minDistance = Math.min(...distances);
    const maxDistance = Math.sqrt(Math.pow(imageStats.width, 2) + Math.pow(imageStats.height, 2));
    
    return Math.round(100 - (minDistance / maxDistance) * 200);
  }

  /**
   * Calculate visual balance score
   */
  async calculateVisualBalance(imageBuffer) {
    try {
      // Divide image into quadrants and analyze weight distribution
      const image = sharp(imageBuffer);
      const { width, height } = await image.metadata();
      
      const quadrants = await Promise.all([
        image.extract({ left: 0, top: 0, width: width/2, height: height/2 }).stats(),
        image.extract({ left: width/2, top: 0, width: width/2, height: height/2 }).stats(),
        image.extract({ left: 0, top: height/2, width: width/2, height: height/2 }).stats(),
        image.extract({ left: width/2, top: height/2, width: width/2, height: height/2 }).stats()
      ]);
      
      const weights = quadrants.map(q => q.channels[0].mean + q.channels[0].std);
      const avgWeight = weights.reduce((sum, w) => sum + w, 0) / 4;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / 4;
      
      // Lower variance = better balance
      const balanceScore = Math.max(0, 100 - (variance / 10));
      
      return Math.round(balanceScore);
    } catch (error) {
      logger.error('Balance calculation failed:', error);
      return 50;
    }
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Quality recommendations
    if (analysis.quality_assessment.overall_quality_score < 70) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Consider retaking this photo with better lighting and camera stability'
      });
    }
    
    // Lighting recommendations
    if (analysis.quality_assessment.lighting_score < 60) {
      recommendations.push({
        type: 'lighting',
        priority: 'medium',
        message: 'Try taking photos in natural light or improve artificial lighting setup'
      });
    }
    
    // Face composition recommendations
    if (analysis.face_analysis.faces_detected === 0) {
      recommendations.push({
        type: 'composition',
        priority: 'high',
        message: 'Make sure your face is clearly visible and well-framed in the photo'
      });
    } else if (analysis.composition_analysis.rule_of_thirds_score < 50) {
      recommendations.push({
        type: 'composition',
        priority: 'low',
        message: 'Try positioning your face along the rule of thirds lines for better composition'
      });
    }
    
    // Background recommendations
    if (analysis.background_analysis.distraction_level === 'high') {
      recommendations.push({
        type: 'background',
        priority: 'medium',
        message: 'Consider using a simpler background that doesn\'t distract from your face'
      });
    }
    
    // Attractiveness recommendations
    if (analysis.attractiveness_score.overall_score < 60) {
      recommendations.push({
        type: 'overall',
        priority: 'medium',
        message: 'Focus on better lighting, clear facial visibility, and photo composition'
      });
    }
    
    return recommendations;
  }

  /**
   * Store photo analysis results
   */
  async storePhotoAnalysis(userId, photoId, analysis) {
    try {
      const [record] = await db('photo_analyses').insert({
        user_id: userId,
        photo_id: photoId,
        attractiveness_score: analysis.attractiveness_score.overall_score,
        quality_score: analysis.quality_assessment.overall_quality_score,
        face_count: analysis.face_analysis.faces_detected,
        analysis_data: JSON.stringify(analysis),
        processing_time_ms: analysis.processing_time_ms,
        created_at: new Date()
      }).returning('*');

      return record;
    } catch (error) {
      logger.error('Failed to store photo analysis:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  getDominantExpression(faces) {
    if (!faces || faces.length === 0) return 'neutral';
    
    const expressions = faces[0].expressions || {};
    return Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
  }

  getGenderDistribution(faces) {
    if (!faces || faces.length === 0) return {};
    
    const distribution = faces.reduce((acc, face) => {
      acc[face.gender] = (acc[face.gender] || 0) + 1;
      return acc;
    }, {});
    
    return distribution;
  }

  getQualityTier(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very_good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  calculateAspectRatioScore(ratio) {
    const idealRatio = 1.0; // Square format ideal for dating profiles
    const deviation = Math.abs(parseFloat(ratio) - idealRatio);
    return Math.max(0, 100 - (deviation * 50));
  }

  calculateFramingScore(face, imageStats) {
    const faceArea = face.box.width * face.box.height;
    const imageArea = imageStats.width * imageStats.height;
    const faceRatio = faceArea / imageArea;
    
    // Ideal face ratio for headshots is 15-30%
    if (faceRatio >= 0.15 && faceRatio <= 0.30) {
      return 100;
    } else if (faceRatio >= 0.10 && faceRatio <= 0.40) {
      return 80;
    } else {
      return Math.max(20, 80 - Math.abs(faceRatio - 0.225) * 200);
    }
  }

  calculateColorHarmony(channels) {
    if (!channels || channels.length < 3) return 70;
    
    // Calculate color temperature and harmony
    const [r, g, b] = channels;
    const colorTemp = (r.mean - b.mean) / (r.mean + g.mean + b.mean);
    const saturation = Math.max(r.std, g.std, b.std) / Math.max(r.mean, g.mean, b.mean);
    
    // Balanced color temperature and moderate saturation = good harmony
    const tempScore = Math.max(0, 100 - Math.abs(colorTemp) * 200);
    const satScore = Math.max(0, 100 - Math.abs(saturation - 0.3) * 200);
    
    return Math.round((tempScore + satScore) / 2);
  }

  estimateBackgroundQuality(qualityAnalysis) {
    // Estimate based on color balance and noise
    const colorBalance = qualityAnalysis.color_balance_score || 50;
    const noise = qualityAnalysis.noise_score || 50;
    
    return Math.round((colorBalance + noise) / 2);
  }

  getScoreBreakdown(scores) {
    return Object.keys(scores).map(key => ({
      component: key.replace(/_/g, ' '),
      score: scores[key],
      weight: this.scoringWeights[key] || 0.1,
      contribution: Math.round(scores[key] * (this.scoringWeights[key] || 0.1))
    }));
  }

  calculateOverallRating({ attractivenessScore, qualityAnalysis, faceAnalysis, compositionAnalysis }) {
    const weights = {
      attractiveness: 0.4,
      quality: 0.3,
      composition: 0.2,
      face_detection: 0.1
    };
    
    const scores = {
      attractiveness: attractivenessScore.overall_score || 50,
      quality: qualityAnalysis.overall_quality_score || 50,
      composition: compositionAnalysis.overall_composition_score || 50,
      face_detection: faceAnalysis.faces_detected > 0 ? 80 : 20
    };
    
    const weightedScore = Object.keys(scores).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);
    
    return Math.round(weightedScore);
  }

  /**
   * Batch analyze multiple photos
   */
  async analyzePhotoBatch(photoData) {
    try {
      const results = [];
      
      for (const photo of photoData) {
        try {
          const analysis = await this.analyzePhoto(photo.buffer, photo.metadata);
          results.push({
            photo_id: photo.id,
            success: true,
            analysis
          });
        } catch (error) {
          results.push({
            photo_id: photo.id,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        results,
        batch_summary: this.generateBatchSummary(results)
      };
    } catch (error) {
      logger.error('Batch analysis failed:', error);
      throw error;
    }
  }

  generateBatchSummary(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length === 0) {
      return { total: results.length, successful: 0, failed: failed.length };
    }
    
    const avgScore = successful.reduce((sum, r) => sum + r.analysis.attractiveness_score.overall_score, 0) / successful.length;
    const bestPhoto = successful.reduce((best, current) => 
      current.analysis.attractiveness_score.overall_score > best.analysis.attractiveness_score.overall_score ? current : best
    );
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      average_score: Math.round(avgScore),
      best_photo_id: bestPhoto.photo_id,
      best_photo_score: bestPhoto.analysis.attractiveness_score.overall_score
    };
  }
}

module.exports = new PhotoAnalysisService();