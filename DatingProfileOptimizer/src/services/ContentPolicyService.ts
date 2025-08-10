import { Platform } from 'react-native';

/**
 * Content Policy Service for Dating Profile Optimizer
 * Ensures compliance with App Store and Google Play content policies for dating apps
 */

export interface ContentViolation {
  type: 'warning' | 'violation' | 'severe';
  category: string;
  description: string;
  suggestion?: string;
}

export interface ContentAnalysisResult {
  isCompliant: boolean;
  violations: ContentViolation[];
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  recommendations: string[];
}

export interface PhotoAnalysisResult {
  isAppropriate: boolean;
  violations: ContentViolation[];
  safetyScore: number; // 0-100, higher is safer
  ageVerificationNeeded: boolean;
}

class ContentPolicyService {
  private prohibitedWords: string[] = [
    // Explicit adult content
    'explicit', 'sexual', 'nsfw', 'adult', 'xxx', 
    // Dating app policy violations
    'escort', 'sugar', 'arrangement', 'transaction', 'payment',
    'hookup', 'casual', 'fwb', 'ons', 'netflix and chill',
    // Harassment and inappropriate behavior
    'stalk', 'harass', 'creep', 'perv', 'prey',
    // Discrimination
    'whites only', 'no blacks', 'no asians', 'no latinos',
    // Illegal activities
    'drugs', 'weed', '420', 'party', 'get high',
    // Minors and age-inappropriate content
    'teen', 'young', 'schoolgirl', 'barely legal',
    // Commercial activities
    'onlyfans', 'premium', 'venmo', 'cashapp', 'snapchat premium'
  ];

  private flaggedPhrases: string[] = [
    'looking for fun',
    'no strings attached',
    'just for tonight',
    'send me money',
    'follow my instagram',
    'check out my profile',
    'message me for pics',
    'looking for daddy',
    'sugar baby',
    'financial support'
  ];

  private suspiciousPatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
    /\$\d+/, // Money references
    /venmo|cashapp|paypal|bitcoin/i, // Payment platforms
    /onlyfans|premium|snapchat|instagram/i, // External platforms
  ];

  /**
   * Analyze bio text for content policy compliance
   */
  analyzeBioContent(bioText: string): ContentAnalysisResult {
    const violations: ContentViolation[] = [];
    const lowerBio = bioText.toLowerCase();

    // Check for prohibited words
    this.prohibitedWords.forEach(word => {
      if (lowerBio.includes(word.toLowerCase())) {
        violations.push({
          type: 'violation',
          category: 'Prohibited Content',
          description: `Contains prohibited word: "${word}"`,
          suggestion: 'Remove or replace with appropriate alternative'
        });
      }
    });

    // Check for flagged phrases
    this.flaggedPhrases.forEach(phrase => {
      if (lowerBio.includes(phrase.toLowerCase())) {
        violations.push({
          type: 'warning',
          category: 'Potentially Inappropriate',
          description: `Contains potentially inappropriate phrase: "${phrase}"`,
          suggestion: 'Consider rephrasing to be more appropriate'
        });
      }
    });

    // Check for suspicious patterns
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(bioText)) {
        const categories = ['Contact Information', 'Contact Information', 'Commercial Content', 'Commercial Content', 'External Platforms'];
        violations.push({
          type: 'violation',
          category: categories[index] || 'Policy Violation',
          description: 'Contains potentially inappropriate contact/commercial information',
          suggestion: 'Remove external contact information and commercial references'
        });
      }
    });

    // Determine risk level
    const severeViolations = violations.filter(v => v.type === 'severe').length;
    const regularViolations = violations.filter(v => v.type === 'violation').length;
    const warnings = violations.filter(v => v.type === 'warning').length;

    let riskLevel: 'low' | 'medium' | 'high' | 'severe' = 'low';
    if (severeViolations > 0) riskLevel = 'severe';
    else if (regularViolations > 2) riskLevel = 'high';
    else if (regularViolations > 0 || warnings > 2) riskLevel = 'medium';

    const recommendations = this.generateRecommendations(violations);

    return {
      isCompliant: violations.filter(v => v.type !== 'warning').length === 0,
      violations,
      riskLevel,
      recommendations
    };
  }

  /**
   * Analyze photo content for appropriateness (mock implementation)
   * In production, this would use ML/AI image analysis services
   */
  async analyzePhotoContent(photoUri: string): Promise<PhotoAnalysisResult> {
    // Mock analysis - in production, integrate with Google Vision API, AWS Rekognition, etc.
    const mockAnalysis = {
      hasExplicitContent: Math.random() < 0.1,
      hasInappropriateText: Math.random() < 0.05,
      estimatedAge: Math.floor(Math.random() * 40) + 18,
      hasContactInfo: Math.random() < 0.02,
      safetyScore: Math.floor(Math.random() * 30) + 70
    };

    const violations: ContentViolation[] = [];

    if (mockAnalysis.hasExplicitContent) {
      violations.push({
        type: 'severe',
        category: 'Explicit Content',
        description: 'Photo contains explicit or inappropriate content',
        suggestion: 'Use a different photo that follows community guidelines'
      });
    }

    if (mockAnalysis.hasInappropriateText) {
      violations.push({
        type: 'violation',
        category: 'Inappropriate Text',
        description: 'Photo contains inappropriate text overlay',
        suggestion: 'Remove text overlays or use appropriate messaging'
      });
    }

    if (mockAnalysis.estimatedAge < 18) {
      violations.push({
        type: 'severe',
        category: 'Age Verification',
        description: 'Photo appears to show person under 18',
        suggestion: 'Use photos that clearly show you are 18 or older'
      });
    }

    if (mockAnalysis.hasContactInfo) {
      violations.push({
        type: 'warning',
        category: 'Contact Information',
        description: 'Photo may contain contact information',
        suggestion: 'Remove any visible contact information from photos'
      });
    }

    return {
      isAppropriate: violations.filter(v => v.type === 'severe' || v.type === 'violation').length === 0,
      violations,
      safetyScore: Math.max(0, mockAnalysis.safetyScore - (violations.length * 10)),
      ageVerificationNeeded: mockAnalysis.estimatedAge < 21 // Conservative approach
    };
  }

  /**
   * Check if content meets platform-specific requirements
   */
  getPlatformCompliance(content: string, platform: 'ios' | 'android' | 'both' = 'both'): {
    ios: boolean;
    android: boolean;
    issues: string[];
  } {
    const analysis = this.analyzeBioContent(content);
    const hasViolations = analysis.violations.filter(v => v.type !== 'warning').length > 0;

    const issues: string[] = [];

    if (hasViolations) {
      issues.push('Content contains policy violations that may result in app rejection');
    }

    if (analysis.riskLevel === 'high' || analysis.riskLevel === 'severe') {
      issues.push('High risk content may trigger manual review');
    }

    // iOS is generally stricter
    const iosCompliant = !hasViolations && analysis.riskLevel !== 'severe';
    
    // Google Play allows slightly more flexibility
    const androidCompliant = analysis.violations.filter(v => v.type === 'severe').length === 0;

    return {
      ios: iosCompliant,
      android: androidCompliant,
      issues
    };
  }

  /**
   * Generate appropriate dating profile suggestions
   */
  generateSafeBioSuggestions(interests: string[], personality: string[]): string[] {
    const safeSuggestions = [
      'Looking to meet someone genuine and kind for meaningful connections.',
      'Passionate about [interests]. Love exploring new places and trying new experiences.',
      'Believe in authentic conversations and building real connections.',
      'Family-oriented person who values honesty and loyalty.',
      'Always up for adventures, whether that\'s hiking, trying new restaurants, or traveling.',
      'Love to laugh and looking for someone who shares my sense of humor.',
      'Professional by day, adventurer by weekend. Let\'s explore the world together!',
      'Big believer in kindness, good conversation, and making each other laugh.',
      'Looking for my best friend and partner in all of life\'s adventures.',
      'Passionate about personal growth and finding someone to share life\'s journey.'
    ];

    // Filter and personalize based on inputs
    return safeSuggestions.slice(0, 3);
  }

  /**
   * Get content guidelines for users
   */
  getContentGuidelines(): {
    dos: string[];
    donts: string[];
    tips: string[];
  } {
    return {
      dos: [
        'Be authentic and honest about yourself',
        'Use clear, recent photos that show your face',
        'Write positive, uplifting descriptions',
        'Mention your hobbies and interests',
        'Be respectful in your language',
        'Show your personality and sense of humor',
        'Use proper grammar and spelling',
        'Keep it appropriate for all audiences'
      ],
      donts: [
        'Share personal contact information',
        'Use explicit or suggestive language',
        'Mention commercial services or payments',
        'Include discriminatory language',
        'Reference illegal activities',
        'Use photos with inappropriate content',
        'Mention other social media platforms',
        'Make negative or bitter comments'
      ],
      tips: [
        'Keep your bio between 150-300 characters for best results',
        'Use 3-5 photos that show different aspects of your life',
        'Smile in at least one photo',
        'Include one full-body photo',
        'Show yourself doing activities you enjoy',
        'Update your profile regularly with fresh content',
        'Ask friends to review your profile before publishing',
        'Remember that your profile represents you to potential matches'
      ]
    };
  }

  /**
   * Age verification helper
   */
  requiresAgeVerification(profileData: any): boolean {
    // Check if additional age verification is needed based on profile content or photo analysis
    return profileData.estimatedAge < 21 || profileData.hasYouthfulAppearance;
  }

  /**
   * Report inappropriate content
   */
  async reportContent(
    contentType: 'photo' | 'bio' | 'message',
    contentId: string,
    reason: string,
    reporterId: string
  ): Promise<{
    reportId: string;
    status: 'received' | 'under_review' | 'resolved';
    message: string;
  }> {
    // Mock implementation - in production, integrate with content moderation system
    const reportId = `report_${Date.now()}`;
    
    console.log('Content report received:', {
      contentType,
      contentId,
      reason,
      reporterId,
      timestamp: new Date().toISOString()
    });

    return {
      reportId,
      status: 'received',
      message: 'Thank you for your report. We will review this content within 24 hours.'
    };
  }

  private generateRecommendations(violations: ContentViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.category === 'Prohibited Content')) {
      recommendations.push('Remove any explicit or inappropriate language');
    }

    if (violations.some(v => v.category === 'Contact Information')) {
      recommendations.push('Keep contact information private - let matches contact you through the app');
    }

    if (violations.some(v => v.category === 'Commercial Content')) {
      recommendations.push('Focus on personal connections rather than commercial interests');
    }

    if (violations.some(v => v.category === 'External Platforms')) {
      recommendations.push('Avoid mentioning other social media platforms or external services');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your content looks good! Consider adding more about your interests and personality.');
    }

    return recommendations;
  }
}

// Export singleton instance
export const contentPolicyService = new ContentPolicyService();

// Export class for custom configurations
export { ContentPolicyService };