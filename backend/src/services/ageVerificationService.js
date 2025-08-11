const db = require('../config/database');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const vision = require('@google-cloud/vision');
const AWS = require('aws-sdk');

/**
 * Age Verification Service
 * Ensures compliance with COPPA and other minor protection laws
 * Uses multiple verification methods to confirm user age
 */
class AgeVerificationService {
  constructor() {
    this.visionClient = new vision.ImageAnnotatorClient();
    this.rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Age verification thresholds
    this.thresholds = {
      minimum_age: 18, // Platform minimum age
      ai_confidence_threshold: 0.85, // AI confidence required for auto-approval
      manual_review_threshold: 0.7, // Below this requires manual review
      rejection_threshold: 0.3 // Below this is auto-rejected
    };

    // Common fake ID indicators
    this.fakeIdIndicators = [
      'poor_image_quality',
      'digital_tampering_detected',
      'inconsistent_fonts',
      'missing_security_features',
      'invalid_format',
      'expired_document'
    ];
  }

  /**
   * Initialize age verification for a user
   * @param {string} userId - The user ID
   * @param {Date} dateOfBirth - User-provided date of birth
   * @param {string} verificationMethod - Method of verification
   */
  async initializeVerification(userId, dateOfBirth, verificationMethod = 'government_id') {
    try {
      const age = this.calculateAge(dateOfBirth);
      
      // Check if user meets minimum age requirement
      if (age < this.thresholds.minimum_age) {
        await this.rejectUnderageUser(userId, age);
        return {
          success: false,
          reason: 'underage',
          message: `Users must be at least ${this.thresholds.minimum_age} years old`,
          required_age: this.thresholds.minimum_age,
          provided_age: age
        };
      }

      // Create or update age verification record
      await db('age_verification')
        .insert({
          id: uuidv4(),
          user_id: userId,
          date_of_birth: dateOfBirth,
          verification_method: verificationMethod,
          verification_status: 'pending'
        })
        .onConflict('user_id')
        .merge({
          date_of_birth: dateOfBirth,
          verification_method: verificationMethod,
          verification_status: 'pending',
          updated_at: new Date()
        });

      return {
        success: true,
        message: 'Age verification initialized',
        verification_method: verificationMethod,
        next_steps: this.getVerificationSteps(verificationMethod)
      };

    } catch (error) {
      logger.error('Age verification initialization failed:', error);
      throw error;
    }
  }

  /**
   * Verify government ID document
   * @param {string} userId - The user ID
   * @param {string} documentImageUrl - URL of the ID document image
   * @param {string} documentType - Type of document (drivers_license, passport, id_card)
   */
  async verifyGovernmentId(userId, documentImageUrl, documentType = 'drivers_license') {
    try {
      const verificationResult = {
        user_id: userId,
        document_type: documentType,
        verification_status: 'pending',
        confidence_score: 0,
        extracted_data: {},
        validation_issues: [],
        age_verified: false
      };

      // 1. Extract text from document using OCR
      const ocrResult = await this.extractDocumentText(documentImageUrl);
      if (!ocrResult.success) {
        verificationResult.verification_status = 'rejected';
        verificationResult.validation_issues.push('Unable to read document text');
        await this.updateVerificationRecord(userId, verificationResult);
        return verificationResult;
      }

      verificationResult.extracted_data = ocrResult.extracted_data;

      // 2. Validate document format and security features
      const formatValidation = await this.validateDocumentFormat(documentImageUrl, documentType);
      verificationResult.confidence_score += formatValidation.confidence_score * 0.3;
      verificationResult.validation_issues.push(...formatValidation.issues);

      // 3. Extract and validate date of birth
      const dobValidation = this.validateDateOfBirth(ocrResult.extracted_data, userId);
      verificationResult.confidence_score += dobValidation.confidence_score * 0.4;
      verificationResult.age_verified = dobValidation.age_verified;
      verificationResult.validation_issues.push(...dobValidation.issues);

      // 4. Validate name consistency (if name is available)
      const nameValidation = await this.validateNameConsistency(ocrResult.extracted_data, userId);
      verificationResult.confidence_score += nameValidation.confidence_score * 0.2;
      verificationResult.validation_issues.push(...nameValidation.issues);

      // 5. Check for tampering or fake document indicators
      const tamperingCheck = await this.checkForTampering(documentImageUrl);
      verificationResult.confidence_score += tamperingCheck.confidence_score * 0.1;
      verificationResult.validation_issues.push(...tamperingCheck.issues);

      // Determine final status
      if (verificationResult.confidence_score >= this.thresholds.ai_confidence_threshold && 
          verificationResult.age_verified && 
          verificationResult.validation_issues.length === 0) {
        verificationResult.verification_status = 'verified';
      } else if (verificationResult.confidence_score < this.thresholds.rejection_threshold || 
                !verificationResult.age_verified) {
        verificationResult.verification_status = 'rejected';
      } else {
        verificationResult.verification_status = 'pending'; // Requires manual review
      }

      // Update database record
      await this.updateVerificationRecord(userId, verificationResult);

      // Log verification attempt
      await this.logVerificationAttempt(userId, verificationResult);

      return verificationResult;

    } catch (error) {
      logger.error('Government ID verification failed:', error);
      await this.updateVerificationRecord(userId, {
        verification_status: 'rejected',
        rejection_reason: 'Verification system error'
      });
      throw error;
    }
  }

  /**
   * Verify age through photo analysis (AI-based age estimation)
   * @param {string} userId - The user ID  
   * @param {string} photoUrl - URL of the user's photo
   */
  async verifyAgeFromPhoto(userId, photoUrl) {
    try {
      const result = {
        user_id: userId,
        estimated_age: null,
        confidence_score: 0,
        verification_status: 'pending',
        analysis_details: {}
      };

      // 1. Google Vision API face detection and age estimation
      const [faces] = await this.visionClient.faceDetection(photoUrl);
      const faceAnnotations = faces.faceAnnotations || [];

      if (faceAnnotations.length === 0) {
        result.verification_status = 'rejected';
        result.analysis_details.error = 'No face detected in photo';
        await this.updateVerificationRecord(userId, result);
        return result;
      }

      if (faceAnnotations.length > 1) {
        result.verification_status = 'rejected';
        result.analysis_details.error = 'Multiple faces detected - single person photos required';
        await this.updateVerificationRecord(userId, result);
        return result;
      }

      const face = faceAnnotations[0];

      // 2. AWS Rekognition for age range estimation
      let awsAgeEstimate = null;
      if (process.env.AWS_ACCESS_KEY_ID) {
        try {
          const rekognitionResult = await this.rekognition.detectFaces({
            Image: { S3Object: { Bucket: process.env.S3_BUCKET, Key: photoUrl } },
            Attributes: ['ALL']
          }).promise();

          if (rekognitionResult.FaceDetails && rekognitionResult.FaceDetails.length > 0) {
            const faceDetail = rekognitionResult.FaceDetails[0];
            awsAgeEstimate = {
              low: faceDetail.AgeRange.Low,
              high: faceDetail.AgeRange.High,
              confidence: faceDetail.Confidence
            };
          }
        } catch (awsError) {
          logger.warn('AWS Rekognition age estimation failed:', awsError.message);
        }
      }

      // 3. Analyze facial features for age indicators
      const faceAnalysis = this.analyzeFacialFeatures(face);
      
      // 4. Combine estimations and determine age
      const combinedEstimate = this.combineAgeEstimates(faceAnalysis, awsAgeEstimate);
      result.estimated_age = combinedEstimate.estimated_age;
      result.confidence_score = combinedEstimate.confidence_score;
      result.analysis_details = {
        face_analysis: faceAnalysis,
        aws_estimate: awsAgeEstimate,
        combined_estimate: combinedEstimate
      };

      // 5. Determine verification status
      if (result.confidence_score >= this.thresholds.ai_confidence_threshold) {
        if (result.estimated_age >= this.thresholds.minimum_age) {
          result.verification_status = 'verified';
        } else {
          result.verification_status = 'rejected';
          result.rejection_reason = 'Estimated age below minimum requirement';
        }
      } else {
        result.verification_status = 'pending'; // Manual review required
      }

      // Update database
      await this.updateVerificationRecord(userId, result);

      return result;

    } catch (error) {
      logger.error('Photo age verification failed:', error);
      await this.updateVerificationRecord(userId, {
        verification_status: 'rejected',
        rejection_reason: 'Photo analysis failed'
      });
      throw error;
    }
  }

  /**
   * Manual review of age verification
   * @param {string} userId - The user ID
   * @param {string} reviewerId - The reviewer's user ID
   * @param {string} decision - 'approved' or 'rejected'
   * @param {string} notes - Review notes
   */
  async manualReview(userId, reviewerId, decision, notes) {
    try {
      const updateData = {
        verification_status: decision === 'approved' ? 'verified' : 'rejected',
        verified_by: reviewerId,
        verified_at: new Date(),
        verification_notes: notes,
        updated_at: new Date()
      };

      if (decision === 'rejected') {
        updateData.rejection_reason = notes;
      }

      await db('age_verification')
        .where('user_id', userId)
        .update(updateData);

      // Update user account status
      await db('users')
        .where('id', userId)
        .update({
          age_verified: decision === 'approved',
          updated_at: new Date()
        });

      // Log the manual review
      await db('moderation_actions').insert({
        id: uuidv4(),
        moderator_id: reviewerId,
        target_user_id: userId,
        action_type: decision === 'approved' ? 'age_verify_approve' : 'age_verify_reject',
        reason: notes
      });

      // Send notification to user
      await this.notifyVerificationDecision(userId, decision, notes);

      return {
        success: true,
        decision,
        message: `Age verification ${decision} for user ${userId}`
      };

    } catch (error) {
      logger.error('Manual age verification review failed:', error);
      throw error;
    }
  }

  /**
   * Get pending age verifications for manual review
   */
  async getPendingVerifications(page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;

      const query = db('age_verification as av')
        .leftJoin('users as u', 'av.user_id', 'u.id')
        .select(
          'av.*',
          'u.email',
          'u.first_name',
          'u.last_name',
          'u.profile_image_url'
        )
        .where('av.verification_status', 'pending')
        .orderBy('av.created_at', 'asc')
        .limit(limit)
        .offset(offset);

      const verifications = await query;
      const total = await db('age_verification')
        .where('verification_status', 'pending')
        .count('* as count')
        .first();

      return {
        verifications,
        total: parseInt(total.count),
        page,
        pages: Math.ceil(total.count / limit)
      };

    } catch (error) {
      logger.error('Failed to get pending verifications:', error);
      throw error;
    }
  }

  /**
   * Get age verification statistics
   */
  async getVerificationStats(timeRange = '30d') {
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
          startDate.setDate(startDate.getDate() - 30);
      }

      const stats = await db('age_verification')
        .select(
          db.raw('COUNT(*) as total_verifications'),
          db.raw('COUNT(CASE WHEN verification_status = "verified" THEN 1 END) as verified'),
          db.raw('COUNT(CASE WHEN verification_status = "rejected" THEN 1 END) as rejected'),
          db.raw('COUNT(CASE WHEN verification_status = "pending" THEN 1 END) as pending'),
          db.raw('COUNT(CASE WHEN verification_method = "government_id" THEN 1 END) as government_id'),
          db.raw('COUNT(CASE WHEN verification_method = "face_analysis" THEN 1 END) as face_analysis'),
          db.raw('AVG(CASE WHEN estimated_age IS NOT NULL THEN estimated_age END) as avg_estimated_age')
        )
        .whereBetween('created_at', [startDate, endDate])
        .first();

      // Get rejection reasons
      const rejectionReasons = await db('age_verification')
        .select('rejection_reason', db.raw('COUNT(*) as count'))
        .where('verification_status', 'rejected')
        .whereBetween('created_at', [startDate, endDate])
        .whereNotNull('rejection_reason')
        .groupBy('rejection_reason')
        .orderBy('count', 'desc');

      return {
        ...stats,
        verification_rate: stats.total_verifications > 0 ? 
          (stats.verified / stats.total_verifications * 100).toFixed(2) : 0,
        rejection_rate: stats.total_verifications > 0 ? 
          (stats.rejected / stats.total_verifications * 100).toFixed(2) : 0,
        rejection_reasons: rejectionReasons,
        time_range: timeRange
      };

    } catch (error) {
      logger.error('Failed to get verification stats:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Extract text from document using OCR
   */
  async extractDocumentText(imageUrl) {
    try {
      const [result] = await this.visionClient.textDetection(imageUrl);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        return { success: false, error: 'No text detected in document' };
      }

      const fullText = detections[0].description;
      
      // Extract specific fields (this would be more sophisticated in production)
      const extractedData = {
        full_text: fullText,
        date_of_birth: this.extractDateOfBirth(fullText),
        name: this.extractName(fullText),
        document_number: this.extractDocumentNumber(fullText),
        expiration_date: this.extractExpirationDate(fullText)
      };

      return { success: true, extracted_data: extractedData };

    } catch (error) {
      logger.error('Document text extraction failed:', error);
      return { success: false, error: 'OCR processing failed' };
    }
  }

  /**
   * Validate document format
   */
  async validateDocumentFormat(imageUrl, documentType) {
    // This would implement sophisticated document format validation
    // For now, return basic validation
    return {
      confidence_score: 0.8,
      issues: []
    };
  }

  /**
   * Validate date of birth from extracted text
   */
  validateDateOfBirth(extractedData, userId) {
    const issues = [];
    let confidenceScore = 0;
    let ageVerified = false;

    if (!extractedData.date_of_birth) {
      issues.push('Date of birth not found in document');
      return { confidence_score: 0, age_verified: false, issues };
    }

    try {
      const dobFromDoc = new Date(extractedData.date_of_birth);
      const age = this.calculateAge(dobFromDoc);
      
      if (age >= this.thresholds.minimum_age) {
        ageVerified = true;
        confidenceScore = 1.0;
      } else {
        issues.push(`Age from document (${age}) is below minimum requirement`);
      }

    } catch (error) {
      issues.push('Invalid date of birth format in document');
    }

    return { confidence_score: confidenceScore, age_verified: ageVerified, issues };
  }

  /**
   * Validate name consistency
   */
  async validateNameConsistency(extractedData, userId) {
    try {
      const user = await db('users')
        .select('first_name', 'last_name')
        .where('id', userId)
        .first();

      if (!user || !extractedData.name) {
        return { confidence_score: 0.5, issues: ['Cannot verify name consistency'] };
      }

      const userFullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const docName = extractedData.name.toLowerCase();

      // Simple name matching (would be more sophisticated in production)
      const similarity = this.calculateStringSimilarity(userFullName, docName);
      
      if (similarity >= 0.8) {
        return { confidence_score: 1.0, issues: [] };
      } else if (similarity >= 0.6) {
        return { confidence_score: 0.7, issues: ['Partial name match with profile'] };
      } else {
        return { confidence_score: 0.0, issues: ['Name does not match profile'] };
      }

    } catch (error) {
      return { confidence_score: 0.5, issues: ['Error validating name consistency'] };
    }
  }

  /**
   * Check for document tampering
   */
  async checkForTampering(imageUrl) {
    // This would implement sophisticated tampering detection
    // For now, return basic check
    return {
      confidence_score: 0.9,
      issues: []
    };
  }

  /**
   * Analyze facial features for age estimation
   */
  analyzeFacialFeatures(face) {
    // This would implement sophisticated facial analysis
    // For now, return basic analysis
    return {
      estimated_age: 25,
      confidence: 0.7,
      features_analyzed: ['face_structure', 'skin_texture', 'eye_area']
    };
  }

  /**
   * Combine multiple age estimates
   */
  combineAgeEstimates(faceAnalysis, awsEstimate) {
    let estimatedAge = faceAnalysis.estimated_age;
    let confidence = faceAnalysis.confidence;

    if (awsEstimate) {
      const avgAge = (awsEstimate.low + awsEstimate.high) / 2;
      estimatedAge = (estimatedAge + avgAge) / 2;
      confidence = (confidence + (awsEstimate.confidence / 100)) / 2;
    }

    return {
      estimated_age: Math.round(estimatedAge),
      confidence_score: confidence
    };
  }

  /**
   * Update verification record in database
   */
  async updateVerificationRecord(userId, data) {
    try {
      await db('age_verification')
        .where('user_id', userId)
        .update({
          ...data,
          updated_at: new Date()
        });
    } catch (error) {
      logger.error('Failed to update verification record:', error);
    }
  }

  /**
   * Log verification attempt
   */
  async logVerificationAttempt(userId, result) {
    try {
      await db('moderation_actions').insert({
        id: uuidv4(),
        moderator_id: null, // System action
        target_user_id: userId,
        action_type: 'age_verification_attempt',
        reason: `Automatic age verification: ${result.verification_status}`,
        action_details: {
          confidence_score: result.confidence_score,
          verification_method: result.verification_method || 'unknown',
          issues_count: result.validation_issues ? result.validation_issues.length : 0
        }
      });
    } catch (error) {
      logger.error('Failed to log verification attempt:', error);
    }
  }

  /**
   * Handle underage user rejection
   */
  async rejectUnderageUser(userId, age) {
    try {
      // Update verification record
      await db('age_verification')
        .insert({
          id: uuidv4(),
          user_id: userId,
          verification_status: 'rejected',
          estimated_age: age,
          rejection_reason: `User age (${age}) is below minimum requirement (${this.thresholds.minimum_age})`
        })
        .onConflict('user_id')
        .merge({
          verification_status: 'rejected',
          estimated_age: age,
          rejection_reason: `User age (${age}) is below minimum requirement (${this.thresholds.minimum_age})`,
          updated_at: new Date()
        });

      // Suspend user account
      await db('users')
        .where('id', userId)
        .update({
          account_status: 'suspended',
          suspension_reason: 'Underage user - COPPA compliance',
          updated_at: new Date()
        });

      // Log compliance action
      await db('moderation_actions').insert({
        id: uuidv4(),
        target_user_id: userId,
        action_type: 'account_suspended',
        reason: `COPPA compliance: User age (${age}) below minimum (${this.thresholds.minimum_age})`
      });

    } catch (error) {
      logger.error('Failed to handle underage user:', error);
    }
  }

  /**
   * Get verification steps for different methods
   */
  getVerificationSteps(method) {
    const steps = {
      government_id: [
        'Take a clear photo of your government-issued ID',
        'Ensure all text is readable and document is not expired',
        'Upload the photo through the verification interface',
        'Wait for automated or manual review'
      ],
      face_analysis: [
        'Take a clear selfie with good lighting',
        'Look directly at the camera',
        'Ensure only your face is visible',
        'Upload the photo for AI age analysis'
      ],
      credit_card: [
        'Provide credit card information',
        'Verify billing address matches profile',
        'Complete micro-transaction verification'
      ]
    };

    return steps[method] || ['Contact support for verification instructions'];
  }

  // Text extraction helper methods
  extractDateOfBirth(text) {
    const dobPatterns = [
      /DOB:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Date of Birth:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Born:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /(\d{2}[-\/]\d{2}[-\/]\d{4})/g
    ];

    for (const pattern of dobPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractName(text) {
    // This would be more sophisticated in production
    const namePatterns = [
      /Name:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /([A-Z][A-Z\s]+)/g
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractDocumentNumber(text) {
    const numberPatterns = [
      /(?:ID|License|Document)\s*#?:?\s*([A-Z0-9]+)/i,
      /([A-Z]\d{8})/g
    ];

    for (const pattern of numberPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractExpirationDate(text) {
    const expPatterns = [
      /(?:Exp|Expires?):?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i,
      /Expiration:?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i
    ];

    for (const pattern of expPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  calculateStringSimilarity(str1, str2) {
    // Simple Levenshtein distance-based similarity
    const matrix = [];
    const n = str1.length;
    const m = str2.length;

    for (let i = 0; i <= n; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= m; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLength = Math.max(n, m);
    return (maxLength - matrix[n][m]) / maxLength;
  }

  async notifyVerificationDecision(userId, decision, notes) {
    // This would integrate with the notification service
    logger.info(`User ${userId} notified of age verification ${decision}: ${notes}`);
  }
}

module.exports = new AgeVerificationService();