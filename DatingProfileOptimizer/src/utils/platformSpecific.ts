/**
 * Platform-specific optimization utilities
 * Handles Tinder, Bumble, Hinge, Match.com specific requirements
 */

export interface PlatformConfig {
  name: string;
  photoLimit: number;
  bioCharacterLimit: number;
  primaryAudience: string;
  keySuccessFactors: string[];
  photoPreferences: string[];
  bioStyle: string;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface OptimizationResult {
  platform: string;
  photoOrder: string[];
  bioText: string;
  improvementScore: number;
  recommendations: string[];
  expectedIncrease: number;
}

/**
 * Platform configurations with specific optimization rules
 */
export const PLATFORM_CONFIGS: { [key: string]: PlatformConfig } = {
  tinder: {
    name: 'Tinder',
    photoLimit: 9,
    bioCharacterLimit: 500,
    primaryAudience: '18-35, casual to serious dating',
    keySuccessFactors: [
      'Visual impact is everything',
      'First photo determines 80% of swipes',
      'Keep bio short and punchy',
      'Show personality quickly',
      'Avoid group photos as main',
    ],
    photoPreferences: [
      'Clear face shot as primary',
      'Full body photo (2nd or 3rd)',
      'Activity/hobby photo',
      'Social proof (group photo max 1)',
      'Travel/adventure photo',
    ],
    bioStyle: 'Brief, witty, conversation-starting',
    colorScheme: {
      primary: '#FD5068',
      secondary: '#424242',
      accent: '#FF6B35',
    },
  },
  bumble: {
    name: 'Bumble',
    photoLimit: 6,
    bioCharacterLimit: 300,
    primaryAudience: '22-40, relationship-focused',
    keySuccessFactors: [
      'Women message first - be approachable',
      'Professional but personable',
      'Show ambition and goals',
      'Quality over quantity photos',
      'Genuine expressions work best',
    ],
    photoPreferences: [
      'Professional-casual headshot',
      'Activity showing interests',
      'Clear full-body photo',
      'Travel or lifestyle photo',
      'Genuine smile required',
    ],
    bioStyle: 'Authentic, goal-oriented, approachable',
    colorScheme: {
      primary: '#F7CE1A',
      secondary: '#424242',
      accent: '#F7CE1A',
    },
  },
  hinge: {
    name: 'Hinge',
    photoLimit: 6,
    bioCharacterLimit: 150,
    primaryAudience: '25-40, serious relationships',
    keySuccessFactors: [
      'Prompts matter more than bio',
      'Show depth and personality',
      'Answer questions authentically',
      'Less is more approach',
      'Focus on relationship intentions',
    ],
    photoPreferences: [
      'Natural, unposed photos',
      'Activity-based photos',
      'Photos that tell stories',
      'Variety in settings',
      'Authentic moments',
    ],
    bioStyle: 'Thoughtful, authentic, relationship-focused',
    colorScheme: {
      primary: '#A6192E',
      secondary: '#424242',
      accent: '#FF6B6B',
    },
  },
  match: {
    name: 'Match.com',
    photoLimit: 12,
    bioCharacterLimit: 4000,
    primaryAudience: '30-50, serious long-term relationships',
    keySuccessFactors: [
      'Detailed profiles perform better',
      'Professional success matters',
      'Life stability is attractive',
      'Multiple photo categories needed',
      'Comprehensive bio expected',
    ],
    photoPreferences: [
      'Professional headshot',
      'Full-body photo',
      'Hobby/interest photos (multiple)',
      'Travel photos',
      'Social/family appropriate photos',
    ],
    bioStyle: 'Detailed, mature, relationship-serious',
    colorScheme: {
      primary: '#0074D9',
      secondary: '#424242',
      accent: '#4169E1',
    },
  },
};

/**
 * Optimize photo order for specific platform
 */
export const optimizePhotosForPlatform = (
  photoAnalyses: any[],
  platform: string
): string[] => {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return photoAnalyses.map(p => p.uri);

  let optimizedOrder: any[] = [];

  switch (platform) {
    case 'tinder':
      optimizedOrder = optimizeTinderPhotos(photoAnalyses);
      break;
    case 'bumble':
      optimizedOrder = optimizeBumblePhotos(photoAnalyses);
      break;
    case 'hinge':
      optimizedOrder = optimizeHingePhotos(photoAnalyses);
      break;
    case 'match':
      optimizedOrder = optimizeMatchPhotos(photoAnalyses);
      break;
    default:
      optimizedOrder = [...photoAnalyses].sort((a, b) => b.overallScore - a.overallScore);
  }

  return optimizedOrder.slice(0, config.photoLimit).map(photo => photo.uri);
};

/**
 * Optimize bio for specific platform
 */
export const optimizeBioForPlatform = (
  baseBio: string,
  userProfile: any,
  platform: string
): string => {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return baseBio;

  let optimizedBio = baseBio;

  // Adjust length
  if (optimizedBio.length > config.bioCharacterLimit) {
    optimizedBio = truncateBio(optimizedBio, config.bioCharacterLimit);
  }

  // Apply platform-specific style
  switch (platform) {
    case 'tinder':
      optimizedBio = makeTinderStyle(optimizedBio);
      break;
    case 'bumble':
      optimizedBio = makeBumbleStyle(optimizedBio);
      break;
    case 'hinge':
      optimizedBio = makeHingeStyle(optimizedBio);
      break;
    case 'match':
      optimizedBio = makeMatchStyle(optimizedBio, userProfile);
      break;
  }

  return optimizedBio;
};

/**
 * Get platform-specific recommendations
 */
export const getPlatformRecommendations = (
  photoAnalyses: any[],
  bio: string,
  platform: string
): string[] => {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return [];

  const recommendations: string[] = [];

  // Photo recommendations
  if (photoAnalyses.length < 3) {
    recommendations.push(`Add more photos - ${config.name} works better with ${Math.min(6, config.photoLimit)} photos`);
  }

  // Bio recommendations
  if (bio.length < config.bioCharacterLimit * 0.3) {
    recommendations.push(`Your bio is too short for ${config.name} - aim for ${Math.round(config.bioCharacterLimit * 0.6)} characters`);
  }

  // Platform-specific recommendations
  switch (platform) {
    case 'tinder':
      recommendations.push(...getTinderRecommendations(photoAnalyses, bio));
      break;
    case 'bumble':
      recommendations.push(...getBumbleRecommendations(photoAnalyses, bio));
      break;
    case 'hinge':
      recommendations.push(...getHingeRecommendations(photoAnalyses, bio));
      break;
    case 'match':
      recommendations.push(...getMatchRecommendations(photoAnalyses, bio));
      break;
  }

  return recommendations;
};

/**
 * Calculate platform compatibility score
 */
export const calculatePlatformCompatibility = (
  userProfile: any,
  photoAnalyses: any[],
  bio: string,
  platform: string
): number => {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return 70;

  let score = 0;

  // Age compatibility
  const ageScore = calculateAgeCompatibility(userProfile.age, platform);
  score += ageScore * 0.2;

  // Photo compatibility
  const photoScore = calculatePhotoCompatibility(photoAnalyses, platform);
  score += photoScore * 0.4;

  // Bio compatibility
  const bioScore = calculateBioCompatibility(bio, platform);
  score += bioScore * 0.3;

  // Profile completeness
  const completenessScore = calculateProfileCompleteness(userProfile, photoAnalyses, bio, platform);
  score += completenessScore * 0.1;

  return Math.round(Math.max(0, Math.min(100, score)));
};

/**
 * Get success prediction for platform
 */
export const predictPlatformSuccess = (
  userProfile: any,
  photoAnalyses: any[],
  bio: string,
  platform: string
): {
  successScore: number;
  expectedMatches: number;
  confidenceLevel: number;
  keyFactors: string[];
} => {
  const compatibility = calculatePlatformCompatibility(userProfile, photoAnalyses, bio, platform);
  const config = PLATFORM_CONFIGS[platform];

  // Base success metrics vary by platform
  const baseMetrics = {
    tinder: { matches: 5, confidence: 75 },
    bumble: { matches: 3, confidence: 80 },
    hinge: { matches: 8, confidence: 85 },
    match: { matches: 12, confidence: 90 },
  };

  const base = baseMetrics[platform as keyof typeof baseMetrics] || baseMetrics.tinder;

  const successScore = compatibility;
  const expectedMatches = Math.round(base.matches * (compatibility / 100));
  const confidenceLevel = Math.min(95, base.confidence + (compatibility - 70) * 0.5);

  const keyFactors = config.keySuccessFactors.slice(0, 3);

  return {
    successScore,
    expectedMatches,
    confidenceLevel,
    keyFactors,
  };
};

// Private helper functions

function optimizeTinderPhotos(photos: any[]): any[] {
  // Tinder optimization: Visual impact first
  return [...photos].sort((a, b) => {
    const aScore = a.attractivenessScore + a.expressionScore + (a.qualityScore * 0.5);
    const bScore = b.attractivenessScore + b.expressionScore + (b.qualityScore * 0.5);
    return bScore - aScore;
  });
}

function optimizeBumblePhotos(photos: any[]): any[] {
  // Bumble optimization: Professionalism + approachability
  return [...photos].sort((a, b) => {
    const aScore = a.expressionScore + a.qualityScore + (a.backgroundScore * 0.7);
    const bScore = b.expressionScore + b.qualityScore + (b.backgroundScore * 0.7);
    return bScore - aScore;
  });
}

function optimizeHingePhotos(photos: any[]): any[] {
  // Hinge optimization: Authenticity and story-telling
  return [...photos].sort((a, b) => {
    const aScore = a.overallScore + (a.backgroundScore * 0.8) + (a.expressionScore * 0.6);
    const bScore = b.overallScore + (b.backgroundScore * 0.8) + (b.expressionScore * 0.6);
    return bScore - aScore;
  });
}

function optimizeMatchPhotos(photos: any[]): any[] {
  // Match.com optimization: Professional and comprehensive
  return [...photos].sort((a, b) => {
    const aScore = a.qualityScore + a.outfitScore + (a.backgroundScore * 0.9);
    const bScore = b.qualityScore + b.outfitScore + (b.backgroundScore * 0.9);
    return bScore - aScore;
  });
}

function truncateBio(bio: string, maxLength: number): string {
  if (bio.length <= maxLength) return bio;
  
  // Try to truncate at sentence boundary
  const sentences = bio.split('. ');
  let result = '';
  
  for (const sentence of sentences) {
    if ((result + sentence).length > maxLength - 3) break;
    result += (result ? '. ' : '') + sentence;
  }
  
  return result + (result.endsWith('.') ? '' : '...');
}

function makeTinderStyle(bio: string): string {
  // Tinder: Punchy, emoji-friendly
  return bio.replace(/\. /g, '. ').trim();
}

function makeBumbleStyle(bio: string): string {
  // Bumble: Professional yet warm
  return bio.replace(/!/g, '.').replace(/😎|🔥/g, '😊').trim();
}

function makeHingeStyle(bio: string): string {
  // Hinge: Authentic and conversational
  return bio.replace(/!/g, '.').replace(/\s+/g, ' ').trim();
}

function makeMatchStyle(bio: string, userProfile: any): string {
  // Match.com: Detailed and mature
  let enhanced = bio;
  
  // Add profession context if missing
  if (!bio.toLowerCase().includes(userProfile.profession?.toLowerCase() || '')) {
    enhanced = `${userProfile.profession}. ${enhanced}`;
  }
  
  return enhanced;
}

function getTinderRecommendations(photos: any[], bio: string): string[] {
  const recs: string[] = [];
  
  if (!bio.includes('?')) {
    recs.push('Add a question to your bio for better engagement on Tinder');
  }
  
  if (photos.length > 0 && photos[0].attractivenessScore < 80) {
    recs.push('Your main photo should have stronger visual impact for Tinder');
  }
  
  return recs;
}

function getBumbleRecommendations(photos: any[], bio: string): string[] {
  const recs: string[] = [];
  
  if (!bio.toLowerCase().includes('work') && !bio.toLowerCase().includes('career')) {
    recs.push('Mention your career - professional success resonates on Bumble');
  }
  
  const hasApproachablePhoto = photos.some(p => p.expressionScore > 80);
  if (!hasApproachablePhoto) {
    recs.push('Include photos with genuine, approachable expressions for Bumble');
  }
  
  return recs;
}

function getHingeRecommendations(photos: any[], bio: string): string[] {
  const recs: string[] = [];
  
  if (bio.length > 100) {
    recs.push('Keep it shorter on Hinge - focus on prompts instead of long bio');
  }
  
  const hasStoryPhotos = photos.some(p => p.backgroundScore > 75);
  if (!hasStoryPhotos) {
    recs.push('Include photos that tell a story about your lifestyle for Hinge');
  }
  
  return recs;
}

function getMatchRecommendations(photos: any[], bio: string): string[] {
  const recs: string[] = [];
  
  if (bio.length < 200) {
    recs.push('Expand your bio - Match.com users expect detailed profiles');
  }
  
  if (photos.length < 5) {
    recs.push('Add more photos - Match.com allows up to 12 photos');
  }
  
  return recs;
}

function calculateAgeCompatibility(age: number, platform: string): number {
  const ageRanges = {
    tinder: [18, 35],
    bumble: [22, 40],
    hinge: [25, 40],
    match: [30, 50],
  };
  
  const range = ageRanges[platform as keyof typeof ageRanges] || [18, 50];
  
  if (age >= range[0] && age <= range[1]) return 100;
  if (age < range[0] - 5 || age > range[1] + 10) return 50;
  return 75;
}

function calculatePhotoCompatibility(photos: any[], platform: string): number {
  if (photos.length === 0) return 0;
  
  const avgQuality = photos.reduce((sum, p) => sum + p.qualityScore, 0) / photos.length;
  const avgAppeal = photos.reduce((sum, p) => sum + p.attractivenessScore, 0) / photos.length;
  
  const platformMultiplier = {
    tinder: [0.3, 0.7], // Quality 30%, Appeal 70%
    bumble: [0.5, 0.5], // Balanced
    hinge: [0.6, 0.4],  // Quality focused
    match: [0.7, 0.3],  // Professional quality
  };
  
  const multiplier = platformMultiplier[platform as keyof typeof platformMultiplier] || [0.5, 0.5];
  
  return avgQuality * multiplier[0] + avgAppeal * multiplier[1];
}

function calculateBioCompatibility(bio: string, platform: string): number {
  let score = 50; // Base score
  
  const config = PLATFORM_CONFIGS[platform];
  if (!config) return score;
  
  // Length appropriateness
  const lengthRatio = bio.length / config.bioCharacterLimit;
  if (lengthRatio >= 0.3 && lengthRatio <= 0.8) score += 25;
  
  // Platform-specific elements
  switch (platform) {
    case 'tinder':
      if (bio.includes('?')) score += 15;
      if (bio.length < 150) score += 10; // Brevity bonus
      break;
    case 'bumble':
      if (bio.toLowerCase().includes('work') || bio.toLowerCase().includes('career')) score += 15;
      if (bio.includes('goal') || bio.includes('ambition')) score += 10;
      break;
    case 'hinge':
      if (bio.includes('looking for')) score += 15;
      if (bio.length < 100) score += 10; // Conciseness bonus
      break;
    case 'match':
      if (bio.length > 200) score += 15; // Detail bonus
      if (bio.includes('relationship')) score += 10;
      break;
  }
  
  return Math.min(100, score);
}

function calculateProfileCompleteness(
  userProfile: any,
  photos: any[],
  bio: string,
  platform: string
): number {
  let score = 0;
  
  // Basic completeness
  if (userProfile.age) score += 20;
  if (userProfile.profession) score += 20;
  if (userProfile.interests?.length > 2) score += 20;
  if (photos.length >= 3) score += 20;
  if (bio.length > 50) score += 20;
  
  return score;
}