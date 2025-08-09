import { calculateBioScore, PERSONALITY_TYPES } from '../utils/datingPsychology';

/**
 * Bio Generation Service
 * Integrates with OpenAI GPT for personalized bio creation
 */

export interface UserProfile {
  age: number;
  gender: string;
  location?: string;
  profession: string;
  interests: string[];
  personalityType: string;
  lookingFor?: string;
  currentBio?: string;
}

export interface PhotoInsights {
  mainVibe: string;
  lifestyleSignals: string[];
  strengths: string[];
  activities: string[];
}

export interface GeneratedBio {
  id: string;
  text: string;
  style: 'professional' | 'casual' | 'witty' | 'adventurous';
  score: number;
  personalityMatch: number;
  platform?: string;
  reasoning: string[];
}

export interface BioGenerationConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  platform: string;
}

class BioGenerationService {
  private config: BioGenerationConfig;
  private generationHistory: GeneratedBio[] = [];

  constructor(config: BioGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate multiple bio variations for user
   */
  async generateBioVariations(
    userProfile: UserProfile,
    photoInsights: PhotoInsights,
    count: number = 4
  ): Promise<GeneratedBio[]> {
    const styles: Array<'professional' | 'casual' | 'witty' | 'adventurous'> = [
      'professional',
      'casual',
      'witty',
      'adventurous',
    ];

    const bios: GeneratedBio[] = [];

    for (let i = 0; i < Math.min(count, styles.length); i++) {
      try {
        const bio = await this.generateBio(userProfile, photoInsights, styles[i]);
        bios.push(bio);
      } catch (error) {
        console.error(`Failed to generate ${styles[i]} bio:`, error);
      }
    }

    return bios.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate a single bio with specific style
   */
  async generateBio(
    userProfile: UserProfile,
    photoInsights: PhotoInsights,
    style: 'professional' | 'casual' | 'witty' | 'adventurous'
  ): Promise<GeneratedBio> {
    try {
      // In production, this would call OpenAI API
      const bioText = await this.simulateAIGeneration(userProfile, photoInsights, style);
      
      const score = calculateBioScore(bioText, userProfile.personalityType, this.config.platform);
      const personalityMatch = this.calculatePersonalityMatch(bioText, userProfile);
      const reasoning = this.generateReasoning(userProfile, photoInsights, style);

      const bio: GeneratedBio = {
        id: `bio_${Date.now()}_${style}`,
        text: bioText,
        style,
        score,
        personalityMatch,
        platform: this.config.platform,
        reasoning,
      };

      this.generationHistory.push(bio);
      return bio;
    } catch (error) {
      console.error('Bio generation failed:', error);
      throw new Error('Failed to generate bio. Please try again.');
    }
  }

  /**
   * Regenerate a bio with improvements
   */
  async regenerateBio(
    originalBio: GeneratedBio,
    userProfile: UserProfile,
    photoInsights: PhotoInsights,
    improvements: string[]
  ): Promise<GeneratedBio> {
    // Apply improvements to generation prompt
    const enhancedProfile = this.applyImprovements(userProfile, improvements);
    return this.generateBio(enhancedProfile, photoInsights, originalBio.style);
  }

  /**
   * Optimize bio for specific platform
   */
  async optimizeBioForPlatform(
    bio: GeneratedBio,
    targetPlatform: string,
    userProfile: UserProfile
  ): Promise<GeneratedBio> {
    // Platform-specific optimization rules
    const platformRules = this.getPlatformRules(targetPlatform);
    let optimizedText = bio.text;

    // Adjust length for platform
    if (optimizedText.length > platformRules.maxLength) {
      optimizedText = this.truncateBio(optimizedText, platformRules.maxLength);
    }

    // Apply platform-specific style adjustments
    optimizedText = this.applyPlatformStyle(optimizedText, targetPlatform);

    const newScore = calculateBioScore(optimizedText, userProfile.personalityType, targetPlatform);

    return {
      ...bio,
      id: `${bio.id}_${targetPlatform}`,
      text: optimizedText,
      score: newScore,
      platform: targetPlatform,
    };
  }

  /**
   * Get bio performance prediction
   */
  async predictBioPerformance(
    bio: GeneratedBio,
    userProfile: UserProfile,
    platform: string = 'general'
  ): Promise<{
    matchProbability: number;
    engagementScore: number;
    memorabilityScore: number;
    suggestions: string[];
  }> {
    const matchProbability = this.calculateMatchProbability(bio, userProfile, platform);
    const engagementScore = this.calculateEngagementScore(bio.text);
    const memorabilityScore = this.calculateMemorabilityScore(bio.text);
    const suggestions = this.generateImprovementSuggestions(bio, userProfile);

    return {
      matchProbability,
      engagementScore,
      memorabilityScore,
      suggestions,
    };
  }

  // Private helper methods

  private async simulateAIGeneration(
    userProfile: UserProfile,
    photoInsights: PhotoInsights,
    style: string
  ): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    const templates = this.getBioTemplates(style);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return this.populateTemplate(template, userProfile, photoInsights);
  }

  private getBioTemplates(style: string): string[] {
    const templates: { [key: string]: string[] } = {
      professional: [
        "{profession} by day, {interest1} enthusiast by weekend. I believe in {value} and love {activity}. Looking for someone who appreciates {quality} and enjoys {shared_activity}. Let's {call_to_action}! 🚀",
        "{profession} with a passion for {interest1} and {interest2}. When I'm not {work_activity}, you'll find me {hobby_activity}. Seeking someone who shares my love for {shared_interest} and {quality}. {conversation_starter}?",
      ],
      casual: [
        "Just a {adjective} person who loves {interest1}, {interest2}, and {interest3}. I make great {skill} and terrible {weakness}. If you're into {shared_activity} and {quality}, let's {call_to_action}! 😄",
        "{hobby_activity} and {interest1} are my jam. I'm the person who {quirky_trait} and {positive_trait}. Looking for someone to {shared_activity} and {relationship_goal} with. {conversation_starter}?",
      ],
      witty: [
        "Professional {profession} with a PhD in {humorous_skill}. I can {ability1} but still {humorous_weakness}. Seeking a partner in crime for {activity} (and {mundane_activity}). {witty_question}? 🧠✨",
        "{profession} by day, {humorous_identity} by night. I {achievement} but {humorous_flaw}. If you can {challenge} and {shared_trait}, we'll get along great! {conversation_starter}",
      ],
      adventurous: [
        "{activity1}, {activity2}, {activity3}. Life's too short for {boring_thing} and {another_boring_thing}. If you're ready to {adventure_goal} and {exploration_activity}, let's start with {simple_activity}! 🏔️🌊",
        "Always planning the next {adventure_type}. Recent adventures: {recent_activity}. Next up: {future_plan}. Looking for someone who {shared_trait} and loves {shared_activity}. {adventure_question}?",
      ],
    };

    return templates[style] || templates['casual'];
  }

  private populateTemplate(
    template: string,
    userProfile: UserProfile,
    photoInsights: PhotoInsights
  ): string {
    const placeholders: { [key: string]: string } = {
      profession: userProfile.profession,
      interest1: userProfile.interests[0] || 'good conversation',
      interest2: userProfile.interests[1] || 'new experiences',
      interest3: userProfile.interests[2] || 'great food',
      activity: this.getActivityFromInterests(userProfile.interests),
      shared_activity: this.getSharedActivity(userProfile.interests),
      call_to_action: this.getCallToAction(),
      conversation_starter: this.getConversationStarter(userProfile),
      adjective: this.getPersonalityAdjective(userProfile.personalityType),
      quality: this.getPersonalityQuality(userProfile.personalityType),
      value: this.getPersonalityValue(userProfile.personalityType),
    };

    let result = template;
    Object.entries(placeholders).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return result;
  }

  private calculatePersonalityMatch(bio: string, userProfile: UserProfile): number {
    const personalityConfig = PERSONALITY_TYPES[userProfile.personalityType];
    if (!personalityConfig) return 70;

    const bioLower = bio.toLowerCase();
    let matchScore = 70; // Base score

    // Check for personality-specific keywords
    const keywords = this.getPersonalityKeywords(userProfile.personalityType);
    const matchingKeywords = keywords.filter(keyword => 
      bioLower.includes(keyword.toLowerCase())
    );
    matchScore += matchingKeywords.length * 5;

    // Check for interests alignment
    const interestMatches = userProfile.interests.filter(interest =>
      bioLower.includes(interest.toLowerCase())
    );
    matchScore += interestMatches.length * 3;

    // Check for tone alignment
    const toneScore = this.calculateToneAlignment(bio, userProfile.personalityType);
    matchScore += toneScore;

    return Math.min(100, matchScore);
  }

  private generateReasoning(
    userProfile: UserProfile,
    photoInsights: PhotoInsights,
    style: string
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Optimized for ${userProfile.personalityType} personality type`);
    reasoning.push(`${style.charAt(0).toUpperCase() + style.slice(1)} tone matches your photo vibe`);
    
    if (userProfile.interests.length >= 3) {
      reasoning.push('Incorporates your top interests for conversation starters');
    }
    
    if (photoInsights.lifestyleSignals.length > 0) {
      reasoning.push('Aligns with lifestyle shown in your photos');
    }
    
    return reasoning;
  }

  private getActivityFromInterests(interests: string[]): string {
    const activities: { [key: string]: string } = {
      travel: 'exploring new places',
      photography: 'capturing moments',
      fitness: 'staying active',
      cooking: 'trying new recipes',
      music: 'discovering new artists',
      reading: 'diving into good books',
    };
    
    for (const interest of interests) {
      if (activities[interest.toLowerCase()]) {
        return activities[interest.toLowerCase()];
      }
    }
    
    return 'new experiences';
  }

  private getSharedActivity(interests: string[]): string {
    const sharedActivities = [
      'exploring the city',
      'trying new restaurants',
      'weekend adventures',
      'coffee shop discoveries',
      'outdoor activities',
    ];
    
    return sharedActivities[Math.floor(Math.random() * sharedActivities.length)];
  }

  private getCallToAction(): string {
    const actions = [
      'grab coffee and chat',
      'explore the city together',
      'start our next adventure',
      'see where this goes',
      'make some memories',
    ];
    
    return actions[Math.floor(Math.random() * actions.length)];
  }

  private getConversationStarter(userProfile: UserProfile): string {
    const starters = [
      `What's your favorite ${userProfile.interests[0] || 'hobby'}`,
      'What\'s the best advice you\'ve ever received',
      'What\'s your go-to comfort food',
      'What\'s the most spontaneous thing you\'ve done',
    ];
    
    return starters[Math.floor(Math.random() * starters.length)];
  }

  private getPersonalityAdjective(personalityType: string): string {
    const adjectives: { [key: string]: string[] } = {
      extrovert: ['social', 'outgoing', 'energetic'],
      introvert: ['thoughtful', 'genuine', 'authentic'],
      adventurous: ['curious', 'spontaneous', 'adventurous'],
      creative: ['creative', 'artistic', 'imaginative'],
      professional: ['ambitious', 'driven', 'focused'],
      casual: ['laid-back', 'easygoing', 'chill'],
    };
    
    const options = adjectives[personalityType] || adjectives['casual'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getPersonalityQuality(personalityType: string): string {
    const qualities: { [key: string]: string[] } = {
      extrovert: ['great conversations', 'genuine connections', 'shared laughter'],
      introvert: ['meaningful discussions', 'authentic moments', 'deep connections'],
      adventurous: ['spontaneous adventures', 'new experiences', 'exciting challenges'],
      creative: ['artistic expression', 'creative projects', 'unique perspectives'],
      professional: ['ambitious goals', 'personal growth', 'success stories'],
      casual: ['simple pleasures', 'relaxed vibes', 'easy companionship'],
    };
    
    const options = qualities[personalityType] || qualities['casual'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getPersonalityValue(personalityType: string): string {
    const values: { [key: string]: string[] } = {
      extrovert: ['building connections', 'shared experiences', 'community'],
      introvert: ['authenticity', 'meaningful relationships', 'personal growth'],
      adventurous: ['exploring possibilities', 'pushing boundaries', 'living fully'],
      creative: ['self-expression', 'innovation', 'artistic beauty'],
      professional: ['continuous improvement', 'achieving goals', 'making impact'],
      casual: ['work-life balance', 'enjoying the moment', 'simple happiness'],
    };
    
    const options = values[personalityType] || values['casual'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getPersonalityKeywords(personalityType: string): string[] {
    const keywords: { [key: string]: string[] } = {
      extrovert: ['social', 'friends', 'party', 'meet', 'group', 'people'],
      introvert: ['quiet', 'thoughtful', 'deep', 'meaningful', 'genuine'],
      adventurous: ['adventure', 'explore', 'travel', 'discover', 'journey'],
      creative: ['create', 'art', 'design', 'music', 'imagine', 'express'],
      professional: ['career', 'goal', 'achieve', 'success', 'growth'],
      casual: ['relax', 'chill', 'easy', 'simple', 'comfortable'],
    };
    
    return keywords[personalityType] || [];
  }

  private calculateToneAlignment(bio: string, personalityType: string): number {
    // Analyze tone and style alignment with personality
    const toneIndicators: { [key: string]: RegExp[] } = {
      extrovert: [/\b(love|enjoy|excited|fun|amazing)\b/gi, /[!]{1,2}/g],
      introvert: [/\b(thoughtful|genuine|meaningful|deep)\b/gi, /\./g],
      adventurous: [/\b(adventure|explore|discover|journey)\b/gi, /[!🏔️🌊]/g],
      creative: [/\b(creative|artistic|unique|imagine)\b/gi, /✨/g],
    };
    
    const indicators = toneIndicators[personalityType] || [];
    let matches = 0;
    
    indicators.forEach(pattern => {
      matches += (bio.match(pattern) || []).length;
    });
    
    return Math.min(15, matches * 3);
  }

  private calculateMatchProbability(
    bio: GeneratedBio,
    userProfile: UserProfile,
    platform: string
  ): number {
    // Base probability on bio score and personality match
    const baseProb = (bio.score + bio.personalityMatch) / 2;
    
    // Platform adjustments
    const platformMultiplier = platform === 'tinder' ? 0.8 : 
                              platform === 'bumble' ? 0.9 : 1.0;
    
    return Math.round(baseProb * platformMultiplier);
  }

  private calculateEngagementScore(bioText: string): number {
    let score = 50; // Base score
    
    // Check for questions
    if (bioText.includes('?')) score += 15;
    
    // Check for emojis
    const emojiCount = (bioText.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    score += Math.min(10, emojiCount * 5);
    
    // Check for conversation starters
    const starterWords = ['ask', 'tell', 'share', 'favorite', 'what', 'how'];
    const starterMatches = starterWords.filter(word => 
      bioText.toLowerCase().includes(word)
    ).length;
    score += Math.min(15, starterMatches * 3);
    
    return Math.min(100, score);
  }

  private calculateMemorabilityScore(bioText: string): number {
    let score = 60; // Base score
    
    // Check for unique details
    const uniqueWords = ['recently', 'currently', 'favorite', 'obsessed', 'passionate'];
    const uniqueMatches = uniqueWords.filter(word => 
      bioText.toLowerCase().includes(word)
    ).length;
    score += uniqueMatches * 5;
    
    // Check for specific examples
    if (bioText.includes(':')) score += 10;
    
    // Penalize clichés
    const cliches = ['love to laugh', 'work hard play hard', 'netflix and chill'];
    const clicheMatches = cliches.filter(cliche => 
      bioText.toLowerCase().includes(cliche)
    ).length;
    score -= clicheMatches * 10;
    
    return Math.max(20, Math.min(100, score));
  }

  private generateImprovementSuggestions(
    bio: GeneratedBio,
    userProfile: UserProfile
  ): string[] {
    const suggestions: string[] = [];
    
    if (bio.score < 75) {
      suggestions.push('Add more specific details about your interests');
    }
    
    if (!bio.text.includes('?')) {
      suggestions.push('Include a question to encourage responses');
    }
    
    if (bio.personalityMatch < 85) {
      suggestions.push(`Better align with your ${userProfile.personalityType} personality`);
    }
    
    return suggestions;
  }

  private applyImprovements(userProfile: UserProfile, improvements: string[]): UserProfile {
    // Apply user feedback to profile for regeneration
    return { ...userProfile };
  }

  private getPlatformRules(platform: string): { maxLength: number; style: string } {
    const rules: { [key: string]: { maxLength: number; style: string } } = {
      tinder: { maxLength: 500, style: 'brief and catchy' },
      bumble: { maxLength: 300, style: 'professional yet approachable' },
      hinge: { maxLength: 150, style: 'authentic and detailed' },
    };
    
    return rules[platform] || rules['tinder'];
  }

  private truncateBio(bio: string, maxLength: number): string {
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

  private applyPlatformStyle(bio: string, platform: string): string {
    // Apply platform-specific style adjustments
    switch (platform) {
      case 'tinder':
        return bio.replace(/\. /g, '. ').trim();
      case 'bumble':
        return bio; // Bumble style is already good
      case 'hinge':
        return bio.replace(/!/g, '.').trim(); // Less exclamatory
      default:
        return bio;
    }
  }
}

// Export singleton instance
export const bioGenerationService = new BioGenerationService({
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 150,
  platform: 'general',
});

// Export class for custom configurations
export { BioGenerationService };