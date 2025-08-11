const logger = require('../config/logger');

// Mock AI Service for Dating Profile Optimization
// This provides realistic responses without expensive API calls
// Easy to replace with real AI services when ready

class MockAIService {
  constructor() {
    this.bioTemplates = {
      adventure: [
        "I'm always up for a new adventure, whether it's hiking a mountain trail or trying a new restaurant in town. Looking for someone who shares my passion for exploration and isn't afraid to step outside their comfort zone.",
        "Adventure seeker who believes life is too short for boring weekends. From spontaneous road trips to cozy nights planning our next escape, I'm looking for a partner in crime who's ready to make memories.",
        "They say the best views come after the hardest climbs - and I live by that philosophy. Whether we're conquering hiking trails or just conquering a new recipe together, I'm all about the journey."
      ],
      professional: [
        "Passionate about my career in {occupation}, but I know how to leave work at the office. Looking for someone who shares my drive for success while knowing how to unwind and enjoy life's simple pleasures.",
        "Career-focused but relationship-ready. I've built something I'm proud of professionally, and now I'm looking for someone special to share life's adventures with. Let's build something beautiful together.",
        "I love what I do in {occupation}, but what I love even more is sharing good times with the right person. Work hard, love harder - that's my motto."
      ],
      creative: [
        "Creative soul who finds inspiration in everything from street art to sunset colors. I believe the best conversations happen over coffee at 2 AM when we're discussing life, dreams, and everything in between.",
        "Art, music, and meaningful conversations fuel my soul. Looking for someone who appreciates creativity and isn't afraid to get a little paint on their hands or dance like nobody's watching.",
        "I see the world through a creative lens, finding beauty in the everyday moments. Whether we're exploring galleries, making music, or just appreciating a perfect sunrise, let's create something beautiful together."
      ],
      family: [
        "Family means everything to me, and I'm ready to build something lasting with the right person. Looking for someone who values deep connections, Sunday dinners, and creating traditions together.",
        "I'm at a place in life where I know what matters most - genuine connections, shared values, and building something meaningful together. Ready to find my person and create our own little family.",
        "Family-oriented person who believes in old-school values wrapped in modern love. I'm looking for someone ready to build a life filled with laughter, love, and maybe some little feet running around."
      ],
      fitness: [
        "Fitness isn't just a hobby for me, it's a lifestyle. Whether we're crushing a workout together or relaxing with a post-gym smoothie, I love staying active and would love a partner who shares that passion.",
        "They say couples who sweat together, stay together. I'm looking for someone who enjoys an active lifestyle - from morning runs to weekend hikes, let's explore what our bodies are capable of together.",
        "Gym enthusiast who believes in strong bodies and stronger relationships. When I'm not pushing iron, I'm pushing myself to be better in all areas of life. Looking for someone who inspires me to grow."
      ],
      foodie: [
        "Food is my love language. From hole-in-the-wall tacos to fancy dining experiences, I believe the best conversations happen over great meals. Let's explore the culinary world together, one bite at a time.",
        "Amateur chef who loves experimenting in the kitchen and exploring new restaurants around town. Looking for someone who appreciates good food and isn't afraid to get their hands dirty cooking together.",
        "Wine enthusiast and foodie who believes every meal should be a celebration. Whether we're trying that new fusion place or cooking together at home, let's make every bite count."
      ]
    };

    this.personalityTraits = {
      outgoing: ["social butterfly", "people person", "life of the party", "naturally charismatic", "loves meeting new people"],
      introverted: ["thoughtful conversationalist", "deep thinker", "quality time lover", "meaningful connection seeker", "introspective soul"],
      adventurous: ["thrill seeker", "spontaneous spirit", "world explorer", "risk taker", "experience collector"],
      homebody: ["cozy night enthusiast", "home is where the heart is", "comfort zone appreciator", "intimate gathering lover", "peace seeker"],
      intellectual: ["curious mind", "lifelong learner", "deep conversation lover", "knowledge seeker", "thought-provoking"],
      humorous: ["comedy lover", "laughter enthusiast", "witty conversationalist", "fun-loving spirit", "joke appreciator"]
    };

    this.photoAnalysisTemplates = {
      facial: {
        positive: [
          "Great natural smile that looks genuine and approachable",
          "Your eyes have a warm, inviting quality that draws people in",
          "Confident facial expression that shows your personality",
          "Natural lighting brings out your best features beautifully"
        ],
        improvement: [
          "Try smiling with your eyes (Duchenne smile) for more authenticity",
          "Consider photos with softer, natural lighting for a warmer feel",
          "Angle your face slightly to show your jawline definition",
          "Make sure your main photo shows your face clearly and unobstructed"
        ]
      },
      composition: {
        positive: [
          "Good use of the rule of thirds in your photo composition",
          "Nice background choice that doesn't distract from you",
          "Perfect framing that shows your personality",
          "Great variety in your photo selection showing different sides of you"
        ],
        improvement: [
          "Consider using the rule of thirds for more dynamic composition",
          "Try to avoid cluttered backgrounds that distract from you",
          "Include at least one full-body photo to give a complete picture",
          "Mix headshots with lifestyle photos to show your interests"
        ]
      },
      style: {
        positive: [
          "Your style choices reflect your personality well",
          "Great color coordination that complements your features",
          "Your outfit choices show you put thought into your appearance",
          "Nice balance between casual and dressed-up photos"
        ],
        improvement: [
          "Consider adding photos that show your personal style variety",
          "Colors that complement your skin tone could enhance your photos",
          "Include at least one photo where you're dressed up nicely",
          "Show different sides of your style from casual to more formal"
        ]
      }
    };
  }

  // Simulate processing delay for realistic feel
  async delay(ms = 2000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate bio based on user profile
  async generateBio(userProfile, preferences = {}) {
    try {
      await this.delay(3000); // Simulate AI processing time

      const { interests, occupation, age, gender, relationship_type } = userProfile;
      const { tone = 'friendly', length = 'medium', focus = 'auto' } = preferences;

      // Determine bio category based on profile
      let category = this.determineBioCategory(userProfile);
      
      // Get base template
      let bioTemplates = this.bioTemplates[category] || this.bioTemplates.adventure;
      let selectedTemplate = bioTemplates[Math.floor(Math.random() * bioTemplates.length)];

      // Personalize the template
      selectedTemplate = this.personalizeBio(selectedTemplate, userProfile);

      // Add personality-based elements
      const personalityAddition = this.addPersonalityTouch(userProfile);
      
      // Generate multiple variations
      const variations = await this.generateBioVariations(selectedTemplate, userProfile, 3);

      const response = {
        success: true,
        bio: selectedTemplate + (personalityAddition ? ` ${personalityAddition}` : ''),
        variations: variations,
        analysis: {
          tone: tone,
          length: selectedTemplate.length,
          readabilityScore: this.calculateReadabilityScore(selectedTemplate),
          personalityMatch: this.calculatePersonalityMatch(userProfile),
          suggestions: this.getBioSuggestions(userProfile)
        },
        metadata: {
          category: category,
          processingTime: '3.2s',
          confidence: 0.87,
          modelUsed: 'mock-gpt-4-turbo'
        }
      };

      logger.info('Mock bio generated successfully', {
        userId: userProfile.id,
        category,
        length: selectedTemplate.length
      });

      return response;

    } catch (error) {
      logger.error('Mock bio generation error', {
        error: error.message,
        userId: userProfile.id
      });
      throw error;
    }
  }

  // Analyze photos with mock AI
  async analyzePhotos(photos, userProfile) {
    try {
      await this.delay(4000); // Simulate photo analysis processing

      const analysis = {
        success: true,
        overallScore: Math.floor(Math.random() * 30) + 70, // Score between 70-100
        photoAnalysis: [],
        recommendations: {
          immediate: [],
          longTerm: [],
          photoOrder: []
        },
        insights: {
          strengths: [],
          improvements: [],
          demographicAppeal: this.generateDemographicInsights(userProfile)
        },
        metadata: {
          photosAnalyzed: photos.length,
          processingTime: '4.7s',
          confidence: 0.91,
          modelUsed: 'mock-vision-pro'
        }
      };

      // Analyze each photo
      photos.forEach((photo, index) => {
        const photoAnalysis = this.analyzeIndividualPhoto(photo, index, userProfile);
        analysis.photoAnalysis.push(photoAnalysis);
        
        // Add to overall insights
        analysis.insights.strengths.push(...photoAnalysis.strengths);
        analysis.insights.improvements.push(...photoAnalysis.improvements);
      });

      // Remove duplicates and limit suggestions
      analysis.insights.strengths = [...new Set(analysis.insights.strengths)].slice(0, 5);
      analysis.insights.improvements = [...new Set(analysis.insights.improvements)].slice(0, 5);

      // Generate recommendations
      analysis.recommendations = this.generatePhotoRecommendations(analysis);

      logger.info('Mock photo analysis completed', {
        userId: userProfile.id,
        photosAnalyzed: photos.length,
        overallScore: analysis.overallScore
      });

      return analysis;

    } catch (error) {
      logger.error('Mock photo analysis error', {
        error: error.message,
        userId: userProfile.id
      });
      throw error;
    }
  }

  // Determine bio category based on user profile
  determineBioCategory(profile) {
    const { interests, occupation, age, relationship_type } = profile;
    
    // Check interests for category hints
    if (interests) {
      const interestString = interests.join(' ').toLowerCase();
      
      if (interestString.includes('travel') || interestString.includes('hiking') || interestString.includes('adventure')) {
        return 'adventure';
      }
      if (interestString.includes('art') || interestString.includes('music') || interestString.includes('creative')) {
        return 'creative';
      }
      if (interestString.includes('fitness') || interestString.includes('gym') || interestString.includes('workout')) {
        return 'fitness';
      }
      if (interestString.includes('food') || interestString.includes('cooking') || interestString.includes('wine')) {
        return 'foodie';
      }
      if (interestString.includes('family') || relationship_type === 'serious') {
        return 'family';
      }
    }

    // Check occupation
    if (occupation) {
      const occupationLower = occupation.toLowerCase();
      if (occupationLower.includes('engineer') || occupationLower.includes('manager') || 
          occupationLower.includes('director') || occupationLower.includes('consultant')) {
        return 'professional';
      }
      if (occupationLower.includes('artist') || occupationLower.includes('designer') || 
          occupationLower.includes('writer') || occupationLower.includes('photographer')) {
        return 'creative';
      }
    }

    // Default categories based on age and relationship goals
    if (age > 28 && relationship_type === 'serious') {
      return 'family';
    }

    return 'adventure'; // Default fallback
  }

  // Personalize bio template with user data
  personalizeBio(template, profile) {
    let personalized = template;
    
    // Replace occupation placeholder
    if (profile.occupation) {
      personalized = personalized.replace('{occupation}', profile.occupation.toLowerCase());
    }

    return personalized;
  }

  // Add personality touch based on profile
  addPersonalityTouch(profile) {
    const touches = [
      "Coffee dates and deep conversations are my love language.",
      "I believe in living life with no regrets and lots of laughter.",
      "Looking for someone who can keep up with my energy and ambition.",
      "Life's too short for boring conversations and bad coffee.",
      "I'm all about authentic connections and genuine moments.",
      "Ready to find someone who challenges me to be my best self."
    ];

    return touches[Math.floor(Math.random() * touches.length)];
  }

  // Generate bio variations
  async generateBioVariations(baseBio, profile, count) {
    const variations = [];
    
    for (let i = 0; i < count; i++) {
      let category = Object.keys(this.bioTemplates)[Math.floor(Math.random() * Object.keys(this.bioTemplates).length)];
      let templates = this.bioTemplates[category];
      let template = templates[Math.floor(Math.random() * templates.length)];
      
      template = this.personalizeBio(template, profile);
      variations.push({
        bio: template,
        category: category,
        score: Math.floor(Math.random() * 20) + 80 // Score between 80-100
      });
    }

    return variations;
  }

  // Analyze individual photo
  analyzeIndividualPhoto(photo, index, userProfile) {
    const categories = ['facial', 'composition', 'style'];
    const analysis = {
      photoIndex: index,
      url: photo.url || photo.photo_url,
      isPrimary: photo.isPrimary || photo.is_primary || index === 0,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      strengths: [],
      improvements: [],
      tags: [],
      emotions: this.detectMockEmotions()
    };

    // Add random positive and improvement feedback
    categories.forEach(category => {
      if (Math.random() > 0.5) {
        const positive = this.photoAnalysisTemplates[category].positive;
        analysis.strengths.push(positive[Math.floor(Math.random() * positive.length)]);
      }
      
      if (Math.random() > 0.6) {
        const improvement = this.photoAnalysisTemplates[category].improvement;
        analysis.improvements.push(improvement[Math.floor(Math.random() * improvement.length)]);
      }
    });

    // Add tags based on photo position and type
    if (analysis.isPrimary) {
      analysis.tags.push('primary', 'first-impression', 'profile-main');
    }
    analysis.tags.push(`photo-${index + 1}`, 'dating-profile');

    return analysis;
  }

  // Generate mock emotion detection
  detectMockEmotions() {
    const emotions = ['happiness', 'confidence', 'friendliness', 'authenticity', 'warmth'];
    const scores = {};
    
    emotions.forEach(emotion => {
      scores[emotion] = parseFloat((Math.random() * 0.4 + 0.6).toFixed(2)); // 0.6 - 1.0
    });

    return scores;
  }

  // Generate photo recommendations
  generatePhotoRecommendations(analysis) {
    const recommendations = {
      immediate: [
        "Consider adding a full-body shot to show your complete style",
        "Include a photo of you engaged in one of your hobbies",
        "Add a group photo to show your social side",
        "Make sure your primary photo has good lighting and shows your face clearly"
      ],
      longTerm: [
        "Consider professional photos for higher quality results",
        "Update photos regularly to keep your profile fresh",
        "Add photos that tell your story and show personality",
        "Include photos from different settings and occasions"
      ],
      photoOrder: []
    };

    // Generate photo order recommendations
    analysis.photoAnalysis.forEach((photo, index) => {
      recommendations.photoOrder.push({
        currentPosition: index,
        recommendedPosition: Math.floor(Math.random() * analysis.photoAnalysis.length),
        reason: "This photo would work better as your " + (index === 0 ? "secondary" : "primary") + " photo due to its composition and lighting"
      });
    });

    return {
      immediate: recommendations.immediate.slice(0, 3),
      longTerm: recommendations.longTerm.slice(0, 2),
      photoOrder: recommendations.photoOrder.slice(0, 2)
    };
  }

  // Generate demographic insights
  generateDemographicInsights(userProfile) {
    const { age, gender, interested_in } = userProfile;
    
    return {
      ageGroup: {
        appeal: Math.floor(Math.random() * 20) + 80,
        feedback: `Your photos appeal well to the ${age < 25 ? 'younger' : age > 35 ? 'mature' : 'mid-twenties to thirties'} demographic`
      },
      gender: {
        appeal: Math.floor(Math.random() * 25) + 75,
        feedback: `Strong appeal across your target demographic`
      },
      overall: {
        marketability: Math.floor(Math.random() * 20) + 80,
        uniqueness: Math.floor(Math.random() * 30) + 70,
        approachability: Math.floor(Math.random() * 25) + 75
      }
    };
  }

  // Calculate readability score
  calculateReadabilityScore(text) {
    // Simple mock calculation based on sentence length and complexity
    const sentences = text.split('.').length;
    const words = text.split(' ').length;
    const avgWordsPerSentence = words / sentences;
    
    let score = 85;
    if (avgWordsPerSentence > 20) score -= 10;
    if (avgWordsPerSentence < 8) score -= 5;
    
    return Math.max(60, Math.min(100, score));
  }

  // Calculate personality match score
  calculatePersonalityMatch(profile) {
    // Mock personality matching based on profile completeness and interests
    let score = 75;
    
    if (profile.interests && profile.interests.length > 3) score += 10;
    if (profile.bio && profile.bio.length > 100) score += 10;
    if (profile.occupation) score += 5;
    
    return Math.min(100, score);
  }

  // Get bio improvement suggestions
  getBioSuggestions(profile) {
    const suggestions = [
      "Add more specific details about your hobbies to spark conversations",
      "Include a conversation starter or question to encourage messages",
      "Mention what you're looking for in a relationship to attract compatible matches",
      "Add humor to show your personality and make your profile memorable",
      "Include your values or what's important to you for deeper connections"
    ];

    return suggestions.slice(0, 3);
  }

  // Check if using real AI services
  isUsingRealAI() {
    return process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key';
  }

  // Get upgrade instructions
  getUpgradeInstructions() {
    return {
      message: "To enable real AI services, update your environment variables",
      steps: [
        "1. Get OpenAI API key from https://platform.openai.com/api-keys",
        "2. Update OPENAI_API_KEY in your .env file",
        "3. Optionally add REPLICATE_API_TOKEN for advanced image analysis",
        "4. Restart your application",
        "5. The app will automatically use real AI services when valid keys are detected"
      ],
      estimatedCost: "~$0.01-0.05 per bio generation, ~$0.02-0.10 per photo analysis"
    };
  }
}

module.exports = new MockAIService();