const db = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const natural = require('natural');
const compromise = require('compromise');

/**
 * AI-Powered Fake Profile Detection Service
 * Uses multiple algorithms and data points to identify potentially fake profiles
 */
class FakeProfileDetectionService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Common fake profile indicators
    this.suspiciousPatterns = {
      // Common fake bio patterns
      genericBios: [
        /looking for someone special/i,
        /love to travel/i,
        /work hard play hard/i,
        /just ask me/i,
        /no drama/i,
        /good vibes only/i,
        /live life to the fullest/i
      ],
      
      // Suspicious contact patterns
      contactPushPatterns: [
        /text me at/i,
        /call me at/i,
        /whatsapp me/i,
        /kik me/i,
        /snapchat/i,
        /telegram/i,
        /message me on/i
      ],
      
      // Money/scam related patterns
      scamPatterns: [
        /need money/i,
        /financial help/i,
        /emergency/i,
        /western union/i,
        /gift cards/i,
        /bitcoin/i,
        /investment opportunity/i,
        /business opportunity/i
      ],
      
      // Modeling/webcam patterns
      adultServicePatterns: [
        /webcam/i,
        /cam shows/i,
        /premium content/i,
        /onlyfans/i,
        /subscribe/i,
        /private shows/i,
        /escort/i
      ]
    };

    // Geographic inconsistency patterns
    this.locationPatterns = {
      // Common fake location claims
      vagueCities: ['new york', 'los angeles', 'chicago', 'houston', 'miami'],
      // Countries commonly used by scammers
      suspiciousCountries: ['ghana', 'nigeria', 'ivory coast', 'benin', 'malaysia']
    };

    // Photo analysis patterns
    this.photoIndicators = {
      // Professional modeling photo indicators
      modelingIndicators: [
        'professional_lighting',
        'studio_background',
        'professional_makeup',
        'posed_modeling_shot',
        'stock_photo_watermark'
      ]
    };
  }

  /**
   * Analyze a user profile for fake indicators
   * @param {string} userId - The user ID to analyze
   * @returns {Object} Analysis results with fake probability score
   */
  async analyzeProfile(userId) {
    try {
      const user = await db('users')
        .where('id', userId)
        .first();

      if (!user) {
        throw new Error('User not found');
      }

      const analysisFactors = [];
      let fakeScore = 0.0;

      // 1. Profile completeness analysis
      const completenessAnalysis = this.analyzeProfileCompleteness(user);
      analysisFactors.push(completenessAnalysis);
      fakeScore += completenessAnalysis.risk_score;

      // 2. Bio text analysis
      if (user.bio) {
        const bioAnalysis = this.analyzeBioText(user.bio);
        analysisFactors.push(bioAnalysis);
        fakeScore += bioAnalysis.risk_score;
      }

      // 3. Photo analysis (if available)
      if (user.profile_image_url) {
        const photoAnalysis = await this.analyzeProfilePhotos(userId);
        analysisFactors.push(photoAnalysis);
        fakeScore += photoAnalysis.risk_score;
      }

      // 4. Account behavior analysis
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(userId);
      analysisFactors.push(behaviorAnalysis);
      fakeScore += behaviorAnalysis.risk_score;

      // 5. Communication patterns analysis
      const communicationAnalysis = await this.analyzeCommunicationPatterns(userId);
      if (communicationAnalysis) {
        analysisFactors.push(communicationAnalysis);
        fakeScore += communicationAnalysis.risk_score;
      }

      // 6. Geographic consistency check
      const geoAnalysis = this.analyzeGeographicConsistency(user);
      analysisFactors.push(geoAnalysis);
      fakeScore += geoAnalysis.risk_score;

      // 7. Social proof analysis
      const socialProofAnalysis = await this.analyzeSocialProof(userId);
      analysisFactors.push(socialProofAnalysis);
      fakeScore += socialProofAnalysis.risk_score;

      // Normalize score to 0-1 range
      const normalizedScore = Math.min(1.0, Math.max(0.0, fakeScore / analysisFactors.length));

      // Determine status based on score
      let status = 'verified_real';
      if (normalizedScore >= 0.8) status = 'confirmed_fake';
      else if (normalizedScore >= 0.6) status = 'suspicious';
      else if (normalizedScore >= 0.3) status = 'pending_review';

      const result = {
        user_id: userId,
        fake_probability_score: normalizedScore,
        status,
        detection_factors: analysisFactors,
        analysis_timestamp: new Date().toISOString(),
        confidence_level: this.calculateConfidenceLevel(analysisFactors),
        recommendations: this.generateRecommendations(normalizedScore, analysisFactors)
      };

      // Store results in database
      await this.storeFakeDetectionResults(result);

      return result;

    } catch (error) {
      logger.error('Fake profile analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze profile completeness (incomplete profiles are often fake)
   */
  analyzeProfileCompleteness(user) {
    let completenessScore = 0;
    const factors = [];

    // Check essential fields
    if (user.profile_image_url) {
      completenessScore += 0.3;
      factors.push('Has profile photo');
    } else {
      factors.push('Missing profile photo (suspicious)');
    }

    if (user.bio && user.bio.length >= 50) {
      completenessScore += 0.2;
      factors.push('Has detailed bio');
    } else if (user.bio && user.bio.length < 20) {
      factors.push('Very short bio (suspicious)');
    } else {
      factors.push('Missing bio');
    }

    if (user.first_name && user.last_name) {
      completenessScore += 0.2;
      factors.push('Has full name');
    }

    if (user.date_of_birth) {
      completenessScore += 0.1;
      factors.push('Has date of birth');
    }

    if (user.phone_verified) {
      completenessScore += 0.2;
      factors.push('Phone verified');
    }

    // Risk calculation: lower completeness = higher fake risk
    const riskScore = Math.max(0, 1.0 - completenessScore);

    return {
      factor_type: 'profile_completeness',
      completeness_score: completenessScore,
      risk_score: riskScore,
      details: factors,
      explanation: `Profile completeness: ${(completenessScore * 100).toFixed(1)}%`
    };
  }

  /**
   * Analyze bio text for fake patterns
   */
  analyzeBioText(bioText) {
    let suspiciousCount = 0;
    const detectedPatterns = [];
    const factors = [];

    // Check for generic/template bios
    for (const pattern of this.suspiciousPatterns.genericBios) {
      if (pattern.test(bioText)) {
        suspiciousCount++;
        detectedPatterns.push('generic_bio_pattern');
        factors.push(`Generic phrase detected: ${pattern.source}`);
      }
    }

    // Check for contact pushing patterns
    for (const pattern of this.suspiciousPatterns.contactPushPatterns) {
      if (pattern.test(bioText)) {
        suspiciousCount += 2; // Higher weight
        detectedPatterns.push('contact_pushing');
        factors.push(`Contact pushing detected: ${pattern.source}`);
      }
    }

    // Check for scam patterns
    for (const pattern of this.suspiciousPatterns.scamPatterns) {
      if (pattern.test(bioText)) {
        suspiciousCount += 3; // Highest weight
        detectedPatterns.push('scam_pattern');
        factors.push(`Scam pattern detected: ${pattern.source}`);
      }
    }

    // Check for adult service patterns
    for (const pattern of this.suspiciousPatterns.adultServicePatterns) {
      if (pattern.test(bioText)) {
        suspiciousCount += 2;
        detectedPatterns.push('adult_service_pattern');
        factors.push(`Adult service pattern detected: ${pattern.source}`);
      }
    }

    // Analyze text complexity and naturalness
    const textComplexity = this.analyzeTextComplexity(bioText);
    if (textComplexity.is_suspicious) {
      suspiciousCount++;
      detectedPatterns.push('unnatural_text');
      factors.push(`Unnatural text pattern: ${textComplexity.reason}`);
    }

    // Calculate risk score (0-1)
    const riskScore = Math.min(1.0, suspiciousCount * 0.15);

    return {
      factor_type: 'bio_analysis',
      risk_score: riskScore,
      detected_patterns: detectedPatterns,
      details: factors,
      suspicious_count: suspiciousCount,
      explanation: `Bio analysis found ${suspiciousCount} suspicious indicators`
    };
  }

  /**
   * Analyze text complexity to detect AI-generated or template text
   */
  analyzeTextComplexity(text) {
    const doc = compromise(text);
    
    // Check for overly perfect grammar (potential AI)
    const sentences = doc.sentences().out('array');
    const avgSentenceLength = text.split(/[.!?]+/).reduce((sum, sent) => sum + sent.trim().split(' ').length, 0) / sentences.length;
    
    // Check for repetitive patterns
    const words = this.tokenizer.tokenize(text.toLowerCase());
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const repeatedWords = Object.values(wordFreq).filter(freq => freq > 2).length;
    const uniqueWordRatio = Object.keys(wordFreq).length / words.length;

    let suspicious = false;
    let reason = '';

    // Very short text with common phrases
    if (text.length < 30 && sentences.length <= 1) {
      suspicious = true;
      reason = 'Extremely short bio';
    }
    // Overly long with repetitive content
    else if (text.length > 500 && uniqueWordRatio < 0.6) {
      suspicious = true;
      reason = 'Long bio with repetitive content';
    }
    // Perfect grammar but generic content
    else if (avgSentenceLength > 20 && repeatedWords > 3) {
      suspicious = true;
      reason = 'Overly complex sentences with repetitive words';
    }

    return {
      is_suspicious: suspicious,
      reason,
      avg_sentence_length: avgSentenceLength,
      unique_word_ratio: uniqueWordRatio,
      repeated_word_count: repeatedWords
    };
  }

  /**
   * Analyze profile photos for fake indicators
   */
  async analyzeProfilePhotos(userId) {
    try {
      // This would integrate with image analysis APIs
      // For now, we'll analyze based on available photo metadata
      
      const photoCount = 1; // Placeholder - would count actual photos
      const factors = [];
      let riskScore = 0;

      // Single photo is more suspicious
      if (photoCount === 1) {
        riskScore += 0.3;
        factors.push('Only one photo uploaded');
      }

      // Would integrate with reverse image search
      const reverseSearchResult = await this.performReverseImageSearch(userId);
      if (reverseSearchResult.found_elsewhere) {
        riskScore += 0.5;
        factors.push(`Photo found on ${reverseSearchResult.source_count} other sites`);
      }

      return {
        factor_type: 'photo_analysis',
        risk_score: riskScore,
        details: factors,
        photo_count: photoCount,
        explanation: `Photo analysis completed for ${photoCount} photos`
      };

    } catch (error) {
      logger.error('Photo analysis failed:', error);
      return {
        factor_type: 'photo_analysis',
        risk_score: 0.1,
        details: ['Photo analysis unavailable'],
        explanation: 'Could not analyze photos'
      };
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeBehaviorPatterns(userId) {
    try {
      // Account age analysis
      const user = await db('users').select('created_at').where('id', userId).first();
      const accountAge = Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
      
      // Recent activity analysis
      const recentActivity = await db('analytics_events')
        .where('user_id', userId)
        .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .count('* as count')
        .first();

      // Profile updates analysis
      const profileUpdates = await db('users')
        .select('updated_at', 'created_at')
        .where('id', userId)
        .first();

      const factors = [];
      let riskScore = 0;

      // Very new accounts are suspicious
      if (accountAge < 1) {
        riskScore += 0.4;
        factors.push('Account created less than 1 day ago');
      } else if (accountAge < 7) {
        riskScore += 0.2;
        factors.push('Very new account (less than 1 week)');
      }

      // No activity is suspicious
      const activityCount = parseInt(recentActivity.count);
      if (activityCount === 0) {
        riskScore += 0.3;
        factors.push('No recent activity');
      } else if (activityCount > 1000) {
        riskScore += 0.2;
        factors.push('Unusually high activity (possible bot)');
      }

      // Profile never updated after creation is suspicious
      if (profileUpdates.updated_at && new Date(profileUpdates.updated_at).getTime() === new Date(profileUpdates.created_at).getTime()) {
        riskScore += 0.2;
        factors.push('Profile never updated since creation');
      }

      return {
        factor_type: 'behavior_analysis',
        risk_score: riskScore,
        details: factors,
        account_age_days: accountAge,
        recent_activity_count: activityCount,
        explanation: `Account is ${accountAge} days old with ${activityCount} recent activities`
      };

    } catch (error) {
      logger.error('Behavior analysis failed:', error);
      return {
        factor_type: 'behavior_analysis',
        risk_score: 0.1,
        details: ['Behavior analysis unavailable'],
        explanation: 'Could not analyze behavior patterns'
      };
    }
  }

  /**
   * Analyze communication patterns (if chat data available)
   */
  async analyzeCommunicationPatterns(userId) {
    try {
      // This would analyze chat messages if available
      // For now, return null as chat isn't implemented
      return null;

    } catch (error) {
      logger.error('Communication analysis failed:', error);
      return null;
    }
  }

  /**
   * Analyze geographic consistency
   */
  analyzeGeographicConsistency(user) {
    const factors = [];
    let riskScore = 0;

    // Check if location seems suspicious
    if (user.location) {
      const locationLower = user.location.toLowerCase();
      
      // Check for vague city names
      if (this.locationPatterns.vagueCities.some(city => locationLower.includes(city))) {
        riskScore += 0.2;
        factors.push('Located in commonly faked city');
      }

      // Check for suspicious countries (if country data available)
      // This would need additional geographic parsing
    }

    // No location provided is also suspicious
    if (!user.location) {
      riskScore += 0.1;
      factors.push('No location provided');
    }

    return {
      factor_type: 'geographic_analysis',
      risk_score: riskScore,
      details: factors,
      explanation: 'Geographic consistency analysis completed'
    };
  }

  /**
   * Analyze social proof indicators
   */
  async analyzeSocialProof(userId) {
    try {
      const factors = [];
      let riskScore = 0;

      // Check for verification badges
      const verification = await db('user_verification')
        .where('user_id', userId)
        .first();

      if (!verification || verification.photo_verification_status !== 'verified') {
        riskScore += 0.2;
        factors.push('No photo verification');
      }

      if (!verification || verification.identity_verification_status !== 'verified') {
        riskScore += 0.1;
        factors.push('No identity verification');
      }

      // Check for connected social accounts (if implemented)
      // This would check for Facebook, Instagram, LinkedIn connections

      return {
        factor_type: 'social_proof_analysis',
        risk_score: riskScore,
        details: factors,
        explanation: 'Social proof analysis completed'
      };

    } catch (error) {
      logger.error('Social proof analysis failed:', error);
      return {
        factor_type: 'social_proof_analysis',
        risk_score: 0.1,
        details: ['Social proof analysis unavailable'],
        explanation: 'Could not analyze social proof'
      };
    }
  }

  /**
   * Calculate confidence level in the analysis
   */
  calculateConfidenceLevel(factors) {
    const completedAnalyses = factors.filter(f => f && f.factor_type).length;
    const totalPossibleAnalyses = 7;
    
    if (completedAnalyses >= 6) return 'high';
    if (completedAnalyses >= 4) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(fakeScore, factors) {
    const recommendations = [];

    if (fakeScore >= 0.8) {
      recommendations.push({
        action: 'immediate_review',
        priority: 'critical',
        message: 'Profile shows strong indicators of being fake - immediate human review required'
      });
    } else if (fakeScore >= 0.6) {
      recommendations.push({
        action: 'enhanced_verification',
        priority: 'high',
        message: 'Require additional verification steps before full platform access'
      });
    } else if (fakeScore >= 0.3) {
      recommendations.push({
        action: 'monitor_activity',
        priority: 'medium',
        message: 'Monitor user activity for suspicious patterns'
      });
    }

    // Specific recommendations based on factors
    factors.forEach(factor => {
      if (factor && factor.detected_patterns) {
        if (factor.detected_patterns.includes('contact_pushing')) {
          recommendations.push({
            action: 'restrict_messaging',
            priority: 'high',
            message: 'Temporarily restrict messaging capabilities due to contact pushing'
          });
        }
        if (factor.detected_patterns.includes('scam_pattern')) {
          recommendations.push({
            action: 'immediate_suspension',
            priority: 'critical',
            message: 'Suspend account immediately due to scam indicators'
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Store fake detection results
   */
  async storeFakeDetectionResults(result) {
    try {
      await db('fake_profile_detection').insert({
        id: uuidv4(),
        user_id: result.user_id,
        fake_probability_score: result.fake_probability_score,
        detection_factors: result.detection_factors,
        status: result.status,
        analysis_notes: `Confidence: ${result.confidence_level}, Factors analyzed: ${result.detection_factors.length}`
      });

    } catch (error) {
      logger.error('Failed to store fake detection results:', error);
    }
  }

  /**
   * Placeholder for reverse image search
   */
  async performReverseImageSearch(userId) {
    // This would integrate with services like TinEye, Google Images API
    // For now, return mock data
    return {
      found_elsewhere: false,
      source_count: 0,
      sources: []
    };
  }

  /**
   * Batch analyze multiple profiles
   */
  async batchAnalyzeProfiles(userIds) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const result = await this.analyzeProfile(userId);
          results.push(result);
        } catch (error) {
          logger.error(`Failed to analyze profile ${userId}:`, error);
          results.push({
            user_id: userId,
            error: error.message,
            fake_probability_score: null
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('Batch analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get fake detection statistics
   */
  async getFakeDetectionStats(timeRange = '7d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      const stats = await db('fake_profile_detection')
        .select(
          db.raw('COUNT(*) as total_analyzed'),
          db.raw('AVG(fake_probability_score) as avg_fake_score'),
          db.raw('COUNT(CASE WHEN status = "confirmed_fake" THEN 1 END) as confirmed_fake'),
          db.raw('COUNT(CASE WHEN status = "suspicious" THEN 1 END) as suspicious'),
          db.raw('COUNT(CASE WHEN status = "pending_review" THEN 1 END) as pending_review'),
          db.raw('COUNT(CASE WHEN fake_probability_score >= 0.8 THEN 1 END) as high_risk'),
          db.raw('COUNT(CASE WHEN fake_probability_score >= 0.6 AND fake_probability_score < 0.8 THEN 1 END) as medium_risk'),
          db.raw('COUNT(CASE WHEN fake_probability_score < 0.3 THEN 1 END) as low_risk')
        )
        .whereBetween('created_at', [startDate, endDate])
        .first();

      return {
        ...stats,
        fake_detection_rate: stats.total_analyzed > 0 ? 
          ((stats.confirmed_fake + stats.suspicious) / stats.total_analyzed * 100).toFixed(2) : 0,
        time_range: timeRange
      };

    } catch (error) {
      logger.error('Failed to get fake detection stats:', error);
      throw error;
    }
  }
}

module.exports = new FakeProfileDetectionService();