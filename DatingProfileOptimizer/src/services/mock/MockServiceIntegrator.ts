/**
 * Mock Service Integrator - Dating Profile Optimizer
 * Provides seamless mock services for API-free functionality testing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock AI Analysis Service
export class MockAIAnalysisService {
  private static readonly MOCK_DELAY_MS = 2000;
  
  static async analyzePhoto(photoUri: string): Promise<{
    score: number;
    improvements: string[];
    insights: string[];
    confidence: number;
    processing_time: number;
  }> {
    const startTime = Date.now();
    
    // Simulate realistic AI processing delay
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY_MS));
    
    // Generate realistic mock analysis
    const mockScores = [6.8, 7.2, 7.8, 8.1, 8.5, 8.9, 9.2];
    const baseScore = mockScores[Math.floor(Math.random() * mockScores.length)];
    
    const improvements = this.generateRealisticImprovements();
    const insights = this.generatePersonalizedInsights();
    
    const result = {
      score: Number((baseScore + Math.random() * 0.3).toFixed(1)),
      improvements: improvements.slice(0, 3 + Math.floor(Math.random() * 3)),
      insights: insights.slice(0, 2 + Math.floor(Math.random() * 2)),
      confidence: 0.89 + Math.random() * 0.1,
      processing_time: Date.now() - startTime
    };
    
    // Cache result for consistency
    await AsyncStorage.setItem(
      `mock_analysis_${this.hashPhotoUri(photoUri)}`, 
      JSON.stringify(result)
    );
    
    return result;
  }
  
  private static generateRealisticImprovements(): string[] {
    const improvements = [
      "Adjust lighting to reduce shadows on face",
      "Try a more engaging smile to appear approachable", 
      "Consider a cleaner background to reduce distractions",
      "Angle your body slightly toward the camera",
      "Use natural lighting instead of harsh indoor lights",
      "Remove sunglasses to show your eyes clearly",
      "Ensure your face takes up 60% of the frame",
      "Try a more confident, relaxed expression",
      "Consider professional attire that fits well",
      "Show genuine emotion rather than a forced smile",
      "Improve photo resolution and sharpness",
      "Use the rule of thirds for better composition"
    ];
    
    return improvements.sort(() => Math.random() - 0.5);
  }
  
  private static generatePersonalizedInsights(): string[] {
    const insights = [
      "Your style suggests you're adventurous - great for outdoor activity matches",
      "Professional attire indicates career focus - attractive to ambitious partners", 
      "Genuine smile creates trustworthy first impression",
      "Good eye contact shows confidence and openness",
      "Your photo suggests shared interests in [activity] - mention this in bio",
      "Approachable expression will increase message response rates",
      "Professional photo quality suggests attention to detail",
      "Your choice of setting reflects personality well"
    ];
    
    return insights.sort(() => Math.random() - 0.5);
  }
  
  private static hashPhotoUri(uri: string): string {
    return btoa(uri).slice(0, 16);
  }
}

// Mock Bio Generation Service
export class MockBioGeneratorService {
  static async generateBio(preferences: {
    age: number;
    interests: string[];
    profession: string;
    personality: string[];
    lookingFor: string;
  }): Promise<{
    bio: string;
    alternatives: string[];
    wordCount: number;
    tone: string;
    effectiveness_score: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const templates = this.getBioTemplates();
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const customBio = this.customizeBio(selectedTemplate, preferences);
    const alternatives = this.generateAlternatives(preferences);
    
    return {
      bio: customBio,
      alternatives: alternatives,
      wordCount: customBio.split(' ').length,
      tone: this.detectTone(customBio),
      effectiveness_score: 7.5 + Math.random() * 2
    };
  }
  
  private static getBioTemplates(): string[] {
    return [
      "Adventurous {profession} who loves {interest1} and {interest2}. Looking for someone who appreciates {personality1} and enjoys {shared_activity}. Let's explore the city together! 🌟",
      
      "Coffee enthusiast ☕ and {profession} by day, {hobby} by night. {personality1} personality with a passion for {interest1}. Seeking genuine connections and {lookingFor}.",
      
      "{age}-year-old {profession} with a love for {interest1} and {interest2}. {personality1} and {personality2} - let's see if we click! Looking for {lookingFor} 💫",
      
      "Professional {profession} who believes life's too short for boring conversations. Passionate about {interest1}, {interest2}, and making people laugh. Seeking {lookingFor}.",
      
      "Curious {profession} exploring life one adventure at a time. Love {interest1} and {interest2}. {personality1} soul looking for someone equally {personality2} 🗺️",
    ];
  }
  
  private static customizeBio(template: string, prefs: any): string {
    return template
      .replace('{profession}', prefs.profession.toLowerCase())
      .replace('{age}', prefs.age.toString())
      .replace('{interest1}', prefs.interests[0] || 'reading')
      .replace('{interest2}', prefs.interests[1] || 'hiking')
      .replace('{personality1}', prefs.personality[0] || 'outgoing')
      .replace('{personality2}', prefs.personality[1] || 'adventurous')
      .replace('{lookingFor}', prefs.lookingFor.toLowerCase())
      .replace('{hobby}', prefs.interests[2] || 'cooking')
      .replace('{shared_activity}', this.getSharedActivity(prefs.interests));
  }
  
  private static generateAlternatives(prefs: any): string[] {
    const templates = this.getBioTemplates();
    return templates
      .slice(1, 4)
      .map(template => this.customizeBio(template, prefs));
  }
  
  private static getSharedActivity(interests: string[]): string {
    const activities = ['trying new restaurants', 'weekend hikes', 'live music', 'art galleries', 'coffee shops'];
    return activities[Math.floor(Math.random() * activities.length)];
  }
  
  private static detectTone(bio: string): string {
    const tones = ['playful', 'professional', 'adventurous', 'casual', 'witty'];
    return tones[Math.floor(Math.random() * tones.length)];
  }
}

// Mock Service Coordinator
export class MockServiceCoordinator {
  private static isInitialized = false;
  
  static async initializeMockServices(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[Mock Services] Initializing Dating Profile Optimizer mock services...');
    
    // Initialize mock data storage
    await this.setupMockStorage();
    
    // Configure mock service defaults
    await this.configureMockDefaults();
    
    this.isInitialized = true;
    console.log('[Mock Services] Mock services initialized successfully');
  }
  
  private static async setupMockStorage(): Promise<void> {
    const mockConfig = {
      api_mode: 'mock',
      mock_version: '1.0',
      initialized_at: new Date().toISOString(),
      platform: Platform.OS,
      features_enabled: [
        'photo_analysis',
        'bio_generation', 
        'social_integration',
        'premium_insights',
        'analytics_tracking',
        'push_notifications'
      ]
    };
    
    await AsyncStorage.setItem('mock_service_config', JSON.stringify(mockConfig));
  }
  
  private static async configureMockDefaults(): Promise<void> {
    // Set up default user preferences for consistent mock experience
    const defaultPreferences = {
      age: 28,
      interests: ['hiking', 'photography', 'cooking'],
      profession: 'Software Engineer',
      personality: ['outgoing', 'adventurous'],
      lookingFor: 'meaningful connections'
    };
    
    const existing = await AsyncStorage.getItem('user_preferences');
    if (!existing) {
      await AsyncStorage.setItem('user_preferences', JSON.stringify(defaultPreferences));
    }
  }
  
  static async getMockServiceStatus(): Promise<{
    initialized: boolean;
    services: {[key: string]: boolean};
    version: string;
  }> {
    const config = await AsyncStorage.getItem('mock_service_config');
    const parsedConfig = config ? JSON.parse(config) : null;
    
    return {
      initialized: this.isInitialized,
      services: {
        ai_analysis: true,
        bio_generation: true,
        social_integration: true,
        premium_features: true,
        analytics: true,
        push_notifications: true
      },
      version: parsedConfig?.mock_version || '1.0'
    };
  }
}