/**
 * Dating Psychology Principles and Success Algorithms
 * Based on research and data from successful dating profiles
 */

export interface PersonalityType {
  type: 'extrovert' | 'introvert' | 'adventurous' | 'creative' | 'professional' | 'casual';
  bioStyle: string;
  photoPreferences: string[];
  successTips: string[];
}

export interface DatingPlatformRules {
  platform: 'tinder' | 'bumble' | 'hinge' | 'match' | 'general';
  photoLimit: number;
  bioLength: number;
  successFactors: string[];
  avoidFactors: string[];
  demographicPreferences: { [key: string]: string[] };
}

/**
 * Core dating psychology principles
 */
export const DATING_PSYCHOLOGY_PRINCIPLES = {
  // Visual attraction principles
  VISUAL_HIERARCHY: {
    primaryPhoto: {
      importance: 0.6,
      requirements: ['clear face', 'good lighting', 'genuine smile', 'eye contact'],
      avoidances: ['sunglasses', 'group photos', 'poor quality'],
    },
    secondaryPhotos: {
      importance: 0.4,
      types: ['full body', 'hobby/activity', 'social proof', 'lifestyle'],
      balance: 'mix of close-up and distant shots',
    },
  },

  // Bio psychology
  BIO_PSYCHOLOGY: {
    optimalLength: { min: 150, max: 200 },
    engagement: {
      hooks: ['conversation starters', 'unique details', 'humor'],
      authenticity: ['personal interests', 'genuine personality', 'specific examples'],
      callToAction: ['question for match', 'shared activity suggestion'],
    },
    avoidNegatives: ['what you dont want', 'past relationships', 'complaints'],
  },

  // Social proof elements
  SOCIAL_PROOF: {
    friends: 'one group photo maximum',
    activities: 'show diverse interests',
    achievements: 'subtle professional/personal wins',
    lifestyle: 'demonstrate social life without showing off',
  },
};

/**
 * Personality type configurations for bio generation
 */
export const PERSONALITY_TYPES: { [key: string]: PersonalityType } = {
  extrovert: {
    type: 'extrovert',
    bioStyle: 'energetic and social',
    photoPreferences: ['group activities', 'social events', 'outdoor adventures'],
    successTips: [
      'Show your social side with group photos',
      'Mention activities you enjoy with others',
      'Use energetic language in your bio',
    ],
  },
  introvert: {
    type: 'introvert',
    bioStyle: 'thoughtful and authentic',
    photoPreferences: ['quiet settings', 'reading/hobbies', 'nature scenes'],
    successTips: [
      'Highlight your thoughtful nature',
      'Mention meaningful hobbies',
      'Show your authentic self',
    ],
  },
  adventurous: {
    type: 'adventurous',
    bioStyle: 'exciting and spontaneous',
    photoPreferences: ['travel', 'hiking', 'sports', 'outdoor activities'],
    successTips: [
      'Include adventure photos',
      'Mention travel experiences',
      'Suggest active date ideas',
    ],
  },
  creative: {
    type: 'creative',
    bioStyle: 'artistic and unique',
    photoPreferences: ['art/music', 'unique locations', 'creative projects'],
    successTips: [
      'Show your creative work',
      'Mention artistic interests',
      'Use creative language',
    ],
  },
  professional: {
    type: 'professional',
    bioStyle: 'accomplished and ambitious',
    photoPreferences: ['business casual', 'professional settings', 'networking events'],
    successTips: [
      'Mention career achievements subtly',
      'Show professional but approachable side',
      'Balance work and personal interests',
    ],
  },
  casual: {
    type: 'casual',
    bioStyle: 'relaxed and easygoing',
    photoPreferences: ['casual wear', 'home settings', 'relaxed activities'],
    successTips: [
      'Keep tone light and friendly',
      'Show your laid-back personality',
      'Mention simple pleasures',
    ],
  },
};

/**
 * Platform-specific optimization rules
 */
export const PLATFORM_RULES: { [key: string]: DatingPlatformRules } = {
  tinder: {
    platform: 'tinder',
    photoLimit: 9,
    bioLength: 500,
    successFactors: [
      'Strong first photo is crucial',
      'Quick visual impact',
      'Brief, witty bio',
      'Show personality quickly',
    ],
    avoidFactors: [
      'Long paragraphs',
      'Too serious tone',
      'Multiple selfies',
    ],
    demographicPreferences: {
      '18-25': ['fun activities', 'college life', 'adventures'],
      '26-35': ['career mentions', 'travel', 'hobbies'],
      '35+': ['mature interests', 'life experience', 'stability'],
    },
  },
  bumble: {
    platform: 'bumble',
    photoLimit: 6,
    bioLength: 300,
    successFactors: [
      'Women message first - be approachable',
      'Show conversation starters',
      'Professional yet fun balance',
    ],
    avoidFactors: [
      'Overly casual approach',
      'Intimidating photos',
      'Negative language',
    ],
    demographicPreferences: {
      '22-30': ['career-focused', 'educated', 'ambitious'],
      '30+': ['serious intentions', 'life goals', 'maturity'],
    },
  },
  hinge: {
    platform: 'hinge',
    photoLimit: 6,
    bioLength: 150,
    successFactors: [
      'Detailed prompts matter',
      'Show personality depth',
      'Authentic responses',
    ],
    avoidFactors: [
      'Generic answers',
      'One-word responses',
      'Cliché prompts',
    ],
    demographicPreferences: {
      'all': ['thoughtful responses', 'relationship-focused', 'authentic'],
    },
  },
};

/**
 * Calculate bio effectiveness score
 */
export const calculateBioScore = (
  bio: string,
  personalityType: string,
  platform: string = 'general'
): number => {
  let score = 0;
  const platformRules = PLATFORM_RULES[platform];
  const personalityConfig = PERSONALITY_TYPES[personalityType];

  // Length check
  if (platformRules) {
    const lengthRatio = bio.length / platformRules.bioLength;
    if (lengthRatio >= 0.4 && lengthRatio <= 1.0) {
      score += 20;
    } else {
      score += Math.max(0, 20 - Math.abs(lengthRatio - 0.7) * 30);
    }
  }

  // Personality alignment
  if (personalityConfig) {
    const bioLower = bio.toLowerCase();
    const personalityKeywords = getPersonalityKeywords(personalityType);
    const matchingKeywords = personalityKeywords.filter(keyword =>
      bioLower.includes(keyword.toLowerCase())
    );
    score += Math.min(25, matchingKeywords.length * 5);
  }

  // Engagement elements
  score += calculateEngagementScore(bio);

  // Authenticity check
  score += calculateAuthenticityScore(bio);

  return Math.min(100, Math.round(score));
};

/**
 * Generate personality-specific keywords
 */
const getPersonalityKeywords = (personalityType: string): string[] => {
  const keywordMap: { [key: string]: string[] } = {
    extrovert: ['friends', 'social', 'party', 'meet', 'group', 'events'],
    introvert: ['reading', 'quiet', 'thoughtful', 'deep', 'meaningful'],
    adventurous: ['travel', 'adventure', 'explore', 'hike', 'journey'],
    creative: ['art', 'music', 'create', 'design', 'artistic', 'unique'],
    professional: ['career', 'work', 'business', 'professional', 'success'],
    casual: ['chill', 'relax', 'easy', 'simple', 'laid-back'],
  };
  return keywordMap[personalityType] || [];
};

/**
 * Calculate engagement score for bio
 */
const calculateEngagementScore = (bio: string): number => {
  let score = 0;
  
  // Check for questions
  if (bio.includes('?')) score += 10;
  
  // Check for conversation starters
  const conversationStarters = ['ask me about', 'tell me', 'what about you', 'your favorite'];
  if (conversationStarters.some(starter => bio.toLowerCase().includes(starter))) {
    score += 15;
  }
  
  // Check for specific details
  const specificWords = ['favorite', 'recently', 'currently', 'love to', 'passionate about'];
  const matches = specificWords.filter(word => bio.toLowerCase().includes(word));
  score += Math.min(10, matches.length * 3);
  
  return score;
};

/**
 * Calculate authenticity score
 */
const calculateAuthenticityScore = (bio: string): number => {
  let score = 20; // Base authenticity score
  
  // Penalize clichés
  const cliches = [
    'love to laugh',
    'work hard play hard',
    'live laugh love',
    'looking for adventure',
    'netflix and chill',
    'fluent in sarcasm',
  ];
  
  const clicheCount = cliches.filter(cliche =>
    bio.toLowerCase().includes(cliche.toLowerCase())
  ).length;
  
  score -= clicheCount * 5;
  
  // Reward specificity
  const specificityIndicators = [':', 'recently', 'currently', 'favorite', 'just finished'];
  const specificityScore = specificityIndicators.filter(indicator =>
    bio.toLowerCase().includes(indicator)
  ).length;
  
  score += Math.min(15, specificityScore * 3);
  
  return Math.max(0, score);
};

/**
 * Generate improvement suggestions for bio
 */
export const generateBioImprovements = (
  bio: string,
  personalityType: string,
  platform: string = 'general'
): string[] => {
  const suggestions: string[] = [];
  const score = calculateBioScore(bio, personalityType, platform);
  
  if (score < 70) {
    if (!bio.includes('?')) {
      suggestions.push('Add a question to encourage responses');
    }
    
    if (bio.length < 100) {
      suggestions.push('Add more specific details about your interests');
    }
    
    const personalityKeywords = getPersonalityKeywords(personalityType);
    const bioLower = bio.toLowerCase();
    const hasPersonalityMatch = personalityKeywords.some(keyword =>
      bioLower.includes(keyword.toLowerCase())
    );
    
    if (!hasPersonalityMatch) {
      suggestions.push(`Include more ${personalityType} personality elements`);
    }
  }
  
  if (bio.length > 250) {
    suggestions.push('Consider shortening for better readability');
  }
  
  // Check for negative language
  const negativeWords = ['dont', "don't", 'not looking for', 'hate', 'dislike'];
  if (negativeWords.some(word => bio.toLowerCase().includes(word))) {
    suggestions.push('Remove negative language and focus on what you want');
  }
  
  return suggestions;
};

/**
 * Generate platform-specific optimization tips
 */
export const getPlatformOptimizationTips = (platform: string): string[] => {
  const platformRules = PLATFORM_RULES[platform];
  if (!platformRules) return [];
  
  return [
    ...platformRules.successFactors,
    `Keep bio under ${platformRules.bioLength} characters`,
    `Use maximum ${platformRules.photoLimit} high-quality photos`,
  ];
};

/**
 * Calculate expected match improvement based on optimization
 */
export const calculateMatchImprovement = (
  beforeScore: number,
  afterScore: number,
  personalityType: string,
  platform: string = 'general'
): {
  improvementPercentage: number;
  expectedMatches: number;
  confidenceLevel: number;
} => {
  const scoreDifference = afterScore - beforeScore;
  const improvementPercentage = Math.round((scoreDifference / beforeScore) * 100);
  
  // Base matches per week (varies by platform and demographics)
  const baseMatches = platform === 'tinder' ? 3 : platform === 'bumble' ? 2 : 4;
  const expectedMatches = Math.round(baseMatches * (1 + improvementPercentage / 100));
  
  // Confidence based on score improvement and personality alignment
  const confidenceLevel = Math.min(95, 60 + scoreDifference * 2);
  
  return {
    improvementPercentage: Math.max(0, improvementPercentage),
    expectedMatches,
    confidenceLevel,
  };
};