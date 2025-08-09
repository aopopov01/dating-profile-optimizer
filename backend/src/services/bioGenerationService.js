const OpenAI = require('openai');
const logger = require('../config/logger');
const db = require('../config/database');
const aiConfigService = require('./aiConfigService');
const photoAnalysisService = require('./photoAnalysisService');
const abTestingService = require('./abTestingService');

class BioGenerationService {
  constructor() {
    this.openai = null;
    this.initialized = false;
    
    // Bio generation templates based on personality types and dating goals
    this.bioTemplates = {
      adventurous: {
        tone: 'fun and energetic',
        keywords: ['adventure', 'travel', 'explore', 'spontaneous', 'outdoors'],
        style: 'casual and exciting'
      },
      professional: {
        tone: 'confident and ambitious',
        keywords: ['career', 'goals', 'success', 'driven', 'networking'],
        style: 'sophisticated and focused'
      },
      creative: {
        tone: 'artistic and expressive',
        keywords: ['art', 'music', 'design', 'creative', 'inspiration'],
        style: 'unique and imaginative'
      },
      humorous: {
        tone: 'witty and playful',
        keywords: ['humor', 'laugh', 'fun', 'comedy', 'entertainment'],
        style: 'light-hearted and engaging'
      },
      romantic: {
        tone: 'warm and caring',
        keywords: ['connection', 'love', 'relationship', 'genuine', 'meaningful'],
        style: 'sincere and heartfelt'
      },
      intellectual: {
        tone: 'thoughtful and curious',
        keywords: ['books', 'knowledge', 'learning', 'discussion', 'ideas'],
        style: 'smart and engaging'
      },
      fitness: {
        tone: 'energetic and health-conscious',
        keywords: ['fitness', 'gym', 'workout', 'healthy', 'active'],
        style: 'motivating and dynamic'
      },
      foodie: {
        tone: 'passionate and social',
        keywords: ['food', 'cooking', 'restaurants', 'cuisine', 'flavors'],
        style: 'warm and inviting'
      },
      spiritual: {
        tone: 'mindful and peaceful',
        keywords: ['mindfulness', 'growth', 'balance', 'inner peace', 'meditation'],
        style: 'thoughtful and centered'
      }
    };

    // Advanced bio optimization patterns
    this.optimizationPatterns = {
      conversation_starters: [
        'Ask me about my latest [hobby/interest]',
        'I can teach you how to [skill]',
        'Let\'s debate: [controversial topic]',
        'What\'s your take on [current topic]?',
        'Challenge me to [game/activity]'
      ],
      personality_hooks: {
        myers_briggs: {
          'ENFP': ['spontaneous adventures', 'deep conversations', 'creative projects'],
          'INTJ': ['strategic planning', 'intellectual discussions', 'long-term goals'],
          'ESFJ': ['helping others', 'social gatherings', 'meaningful connections'],
          'ISTP': ['hands-on projects', 'problem solving', 'practical skills']
        },
        enneagram: {
          '1': ['perfectionism', 'improvement', 'principles'],
          '2': ['helping others', 'relationships', 'caring'],
          '7': ['adventure', 'variety', 'enthusiasm'],
          '8': ['leadership', 'challenge', 'intensity']
        }
      },
      success_predictors: [
        'specific_interests', 'unique_experiences', 'conversation_starters',
        'authenticity_markers', 'activity_mentions', 'value_statements'
      ]
    };

    // Platform-specific requirements
    this.platformRequirements = {
      tinder: {
        max_length: 500,
        style: 'casual and direct',
        focus: 'visual appeal and initial attraction'
      },
      bumble: {
        max_length: 300,
        style: 'thoughtful and engaging',
        focus: 'conversation starters and personality'
      },
      hinge: {
        max_length: 150,
        style: 'authentic and specific',
        focus: 'prompts and detailed responses'
      },
      match: {
        max_length: 2000,
        style: 'detailed and comprehensive',
        focus: 'long-term compatibility and values'
      }
    };
  }

  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Test the connection
      await this.testConnection();
      this.initialized = true;
      
      logger.info('Bio generation service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Bio generation service initialization failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.openai.models.list();
      logger.info('OpenAI connection test successful');
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error.message);
      throw new Error('Failed to connect to OpenAI service');
    }
  }

  /**
   * Generate dating profile bio based on user profile and photo analysis
   */
  async generateBio(userProfile, photoAnalysis, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Bio generation service not initialized');
      }

      const {
        personality_type = 'balanced',
        target_platform = 'tinder',
        bio_style = 'casual',
        include_hobbies = true,
        include_profession = true,
        conversation_starter = true,
        num_variations = 3
      } = options;

      // Get platform requirements
      const platformReq = this.platformRequirements[target_platform] || this.platformRequirements.tinder;
      
      // Build the prompt
      const prompt = this.buildBioPrompt(userProfile, photoAnalysis, {
        personality_type,
        target_platform,
        bio_style,
        include_hobbies,
        include_profession,
        conversation_starter,
        max_length: platformReq.max_length,
        platform_style: platformReq.style,
        platform_focus: platformReq.focus
      });

      const startTime = Date.now();
      
      // Generate multiple bio variations
      const generatedBios = [];
      
      for (let i = 0; i < num_variations; i++) {
        const completion = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(personality_type, target_platform)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.8 + (i * 0.1), // Vary temperature for different variations
          frequency_penalty: 0.3,
          presence_penalty: 0.3
        });

        const bioText = completion.choices[0].message.content.trim();
        
        // Analyze and score the generated bio
        const bioAnalysis = await this.analyzeBio(bioText, userProfile, target_platform);
        
        generatedBios.push({
          text: bioText,
          variation: i + 1,
          analysis: bioAnalysis,
          word_count: bioText.split(' ').length,
          character_count: bioText.length
        });
      }

      const processingTime = Date.now() - startTime;

      // Sort bios by overall score
      generatedBios.sort((a, b) => b.analysis.overall_score - a.analysis.overall_score);

      // Store results in database
      const bioRecord = await this.storeBioGeneration(userProfile.user_id, {
        user_profile: userProfile,
        photo_analysis: photoAnalysis,
        generated_bios: generatedBios,
        options,
        processing_time_ms: processingTime
      });

      logger.info('Bio generation completed:', {
        userId: userProfile.user_id,
        bioId: bioRecord.id,
        variations: num_variations,
        processingTime: `${processingTime}ms`,
        platform: target_platform
      });

      return {
        success: true,
        bio_id: bioRecord.id,
        generated_bios: generatedBios,
        processing_time_ms: processingTime,
        recommendations: this.getBioRecommendations(generatedBios, target_platform),
        platform: target_platform,
        personality_type
      };

    } catch (error) {
      logger.error('Bio generation failed:', {
        error: error.message,
        userId: userProfile?.user_id
      });
      throw error;
    }
  }

  /**
   * Build the bio generation prompt
   */
  buildBioPrompt(userProfile, photoAnalysis, options) {
    const template = this.bioTemplates[options.personality_type] || this.bioTemplates.balanced;
    
    return `Create an engaging dating profile bio with the following information:

USER PROFILE:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Location: ${userProfile.location || 'Not specified'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Profession: ${options.include_profession ? userProfile.profession : 'Not specified'}
- Relationship goals: ${userProfile.relationship_goals || 'Connection and dating'}

PHOTO ANALYSIS:
- Main vibe: ${photoAnalysis.overall_vibe}
- Lifestyle signals: ${photoAnalysis.lifestyle_signals?.join(', ')}
- Strengths: ${photoAnalysis.strengths?.join(', ')}
- Activity context: ${photoAnalysis.activities?.join(', ')}

REQUIREMENTS:
- Platform: ${options.target_platform.toUpperCase()}
- Max length: ${options.max_length} characters
- Style: ${options.platform_style}
- Personality type: ${options.personality_type}
- Tone: ${template.tone}
- Include conversation starter: ${options.conversation_starter ? 'Yes' : 'No'}

GUIDELINES:
1. Write in first person
2. Be authentic and specific
3. Avoid clichés like "love to laugh" or "live life to the fullest"
4. Include 2-3 specific interests or activities
5. Make it conversation-friendly
6. Match the ${options.platform_focus}
7. Keep it under ${options.max_length} characters
8. Use a ${template.style} writing style
9. Incorporate keywords naturally: ${template.keywords.join(', ')}

Generate a compelling bio that stands out and attracts meaningful connections:`;
  }

  /**
   * Get system prompt for different personality types and platforms
   */
  getSystemPrompt(personalityType, platform) {
    return `You are an expert dating coach and copywriter who specializes in creating compelling dating profiles. Your expertise includes:

1. Understanding dating psychology and what attracts people
2. Writing engaging, authentic bios that start conversations
3. Tailoring content for different dating platforms (${platform.toUpperCase()})
4. Matching personality types (${personalityType}) with appropriate writing styles
5. Avoiding overused phrases and creating unique, memorable profiles

Your goal is to help users create bios that:
- Attract compatible matches
- Represent their authentic personality
- Start meaningful conversations
- Stand out from typical generic profiles

Write bios that are specific, engaging, and conversation-friendly. Avoid generic phrases and focus on what makes this person unique and interesting.`;
  }

  /**
   * Analyze generated bio for quality and effectiveness
   */
  async analyzeBio(bioText, userProfile, platform) {
    try {
      const analysis = {
        readability_score: this.calculateReadabilityScore(bioText),
        uniqueness_score: this.calculateUniquenessScore(bioText),
        conversation_starter_score: this.calculateConversationScore(bioText),
        personality_match_score: this.calculatePersonalityMatchScore(bioText, userProfile),
        platform_optimization_score: this.calculatePlatformScore(bioText, platform),
        length_score: this.calculateLengthScore(bioText, platform),
        overall_score: 0
      };

      // Calculate weighted overall score
      analysis.overall_score = (
        analysis.readability_score * 0.15 +
        analysis.uniqueness_score * 0.25 +
        analysis.conversation_starter_score * 0.20 +
        analysis.personality_match_score * 0.15 +
        analysis.platform_optimization_score * 0.15 +
        analysis.length_score * 0.10
      ).toFixed(2);

      return analysis;
    } catch (error) {
      logger.error('Bio analysis failed:', error);
      return {
        overall_score: 50,
        error: 'Analysis failed'
      };
    }
  }

  /**
   * Calculate readability score (1-100)
   */
  calculateReadabilityScore(text) {
    const words = text.split(' ').length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Optimal range is 10-15 words per sentence for dating profiles
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 16) {
      return 90;
    } else if (avgWordsPerSentence >= 6 && avgWordsPerSentence <= 20) {
      return 75;
    } else {
      return 60;
    }
  }

  /**
   * Calculate uniqueness score by checking for common clichés
   */
  calculateUniquenessScore(text) {
    const cliches = [
      'love to laugh', 'live life to the fullest', 'work hard play hard',
      'partner in crime', 'go with the flow', 'down to earth',
      'easy going', 'no drama', 'genuine guy/girl', 'loves to have fun'
    ];

    const lowerText = text.toLowerCase();
    const clicheCount = cliches.filter(cliche => lowerText.includes(cliche)).length;
    
    return Math.max(20, 100 - (clicheCount * 25));
  }

  /**
   * Calculate conversation starter potential
   */
  calculateConversationScore(text) {
    const conversationStarters = [
      '?', 'ask me about', 'guess', 'challenge', 'debate',
      'teach me', 'show me', 'join me', 'help me'
    ];

    const lowerText = text.toLowerCase();
    const starterCount = conversationStarters.filter(starter => 
      lowerText.includes(starter)
    ).length;

    return Math.min(100, 60 + (starterCount * 15));
  }

  /**
   * Calculate platform optimization score
   */
  calculatePlatformScore(text, platform) {
    const requirements = this.platformRequirements[platform];
    if (!requirements) return 70;

    const length = text.length;
    const maxLength = requirements.max_length;

    // Score based on length appropriateness
    if (length <= maxLength * 0.8) return 95;
    if (length <= maxLength) return 85;
    return Math.max(40, 85 - ((length - maxLength) / 10));
  }

  /**
   * Calculate length optimization score
   */
  calculateLengthScore(text, platform) {
    const requirements = this.platformRequirements[platform];
    const length = text.length;
    const maxLength = requirements.max_length;
    
    // Optimal range is 60-80% of max length
    const optimalMin = maxLength * 0.6;
    const optimalMax = maxLength * 0.8;

    if (length >= optimalMin && length <= optimalMax) {
      return 100;
    } else if (length <= maxLength) {
      return 85;
    } else {
      return Math.max(20, 85 - ((length - maxLength) * 2));
    }
  }

  /**
   * Calculate personality match score
   */
  calculatePersonalityMatchScore(text, userProfile) {
    // This would ideally use more sophisticated NLP analysis
    // For now, we'll use a simplified approach
    const interests = userProfile.interests || [];
    const lowerText = text.toLowerCase();
    
    const mentionedInterests = interests.filter(interest =>
      lowerText.includes(interest.toLowerCase())
    ).length;

    const interestScore = interests.length > 0 
      ? (mentionedInterests / interests.length) * 100 
      : 70;

    return Math.min(100, Math.max(40, interestScore));
  }

  /**
   * Store bio generation results in database
   */
  async storeBioGeneration(userId, generationData) {
    try {
      const [bioRecord] = await db('generated_bios').insert({
        user_id: userId,
        bio_variations: JSON.stringify(generationData.generated_bios),
        user_profile_data: JSON.stringify(generationData.user_profile),
        photo_analysis_data: JSON.stringify(generationData.photo_analysis),
        generation_options: JSON.stringify(generationData.options),
        processing_time_ms: generationData.processing_time_ms,
        created_at: new Date()
      }).returning('*');

      return bioRecord;
    } catch (error) {
      logger.error('Failed to store bio generation:', error);
      throw error;
    }
  }

  /**
   * Get bio recommendations based on generated variations
   */
  getBioRecommendations(generatedBios, platform) {
    const topBio = generatedBios[0];
    const recommendations = [];

    if (topBio.analysis.conversation_starter_score < 70) {
      recommendations.push({
        type: 'improvement',
        message: 'Consider adding a question or conversation starter to encourage messages'
      });
    }

    if (topBio.analysis.uniqueness_score < 70) {
      recommendations.push({
        type: 'improvement', 
        message: 'Try to be more specific about your interests to stand out from other profiles'
      });
    }

    if (topBio.character_count > this.platformRequirements[platform]?.max_length * 0.9) {
      recommendations.push({
        type: 'warning',
        message: `Bio is quite long for ${platform}. Consider shortening for better readability`
      });
    }

    recommendations.push({
      type: 'tip',
      message: `Best performing bio scored ${topBio.analysis.overall_score}/100. Consider A/B testing different variations.`
    });

    return recommendations;
  }

  /**
   * Get user's bio generation history
   */
  async getBioHistory(userId, limit = 10) {
    try {
      const bios = await db('generated_bios')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .select([
          'id', 'bio_variations', 'generation_options',
          'processing_time_ms', 'created_at'
        ]);

      return bios.map(bio => ({
        id: bio.id,
        variations_count: JSON.parse(bio.bio_variations).length,
        options: JSON.parse(bio.generation_options),
        processing_time_ms: bio.processing_time_ms,
        created_at: bio.created_at
      }));
    } catch (error) {
      logger.error('Failed to get bio history:', error);
      throw error;
    }
  }

  /**
   * Regenerate bio with different options
   */
  async regenerateBio(bioId, userId, newOptions = {}) {
    try {
      // Get original bio data
      const originalBio = await db('generated_bios')
        .where({ id: bioId, user_id: userId })
        .first();

      if (!originalBio) {
        throw new Error('Original bio not found');
      }

      const originalData = {
        user_profile: JSON.parse(originalBio.user_profile_data),
        photo_analysis: JSON.parse(originalBio.photo_analysis_data),
        options: { ...JSON.parse(originalBio.generation_options), ...newOptions }
      };

      // Generate new bio with updated options
      return await this.generateBio(
        originalData.user_profile,
        originalData.photo_analysis,
        originalData.options
      );
    } catch (error) {
      logger.error('Bio regeneration failed:', error);
      throw error;
    }
  }

  /**
   * Generate bio with advanced AI features and success prediction
   */
  async generateAdvancedBio(userProfile, photoAnalysis, options = {}) {
    try {
      // Use AI config service for rate limiting and monitoring
      const rateLimitCheck = await aiConfigService.checkRateLimit('openai', userProfile.user_id);
      if (!rateLimitCheck.allowed) {
        throw new Error(rateLimitCheck.reason);
      }

      // Enhanced options with success prediction
      const enhancedOptions = {
        ...options,
        use_photo_insights: true,
        personality_detection: true,
        success_prediction: true,
        conversation_optimization: true,
        platform_specific_hooks: true
      };

      // Generate photo-informed personality insights
      const personalityInsights = await this.analyzePersonalityFromPhotos(photoAnalysis);
      
      // Predict bio success factors
      const successFactors = await this.predictBioSuccessFactors(userProfile, photoAnalysis);
      
      // Generate bio with advanced prompting
      const bioResult = await aiConfigService.withRetry(
        async () => await this.generateBioWithSuccessPrediction(
          userProfile, 
          photoAnalysis, 
          personalityInsights, 
          successFactors, 
          enhancedOptions
        ),
        { service: 'openai', userId: userProfile.user_id }
      );

      // Post-process for optimization
      const optimizedBio = await this.optimizeBioForPlatform(bioResult, options.target_platform);
      
      // Create A/B test variants if requested
      if (options.create_ab_test) {
        const abTestResult = await this.createBioABTest(userProfile.user_id, optimizedBio, options);
        optimizedBio.ab_test_id = abTestResult.test_id;
      }

      return optimizedBio;
    } catch (error) {
      logger.error('Advanced bio generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze personality traits from photo analysis
   */
  async analyzePersonalityFromPhotos(photoAnalysis) {
    try {
      const insights = {
        confidence_level: 'medium',
        traits: [],
        lifestyle_indicators: [],
        social_context: 'unknown'
      };

      if (!photoAnalysis || !photoAnalysis.lifestyle_signals) {
        return insights;
      }

      const lifestyle = photoAnalysis.lifestyle_signals;
      
      // Map lifestyle signals to personality traits
      if (lifestyle.detected_activities.includes('outdoor')) {
        insights.traits.push('adventurous', 'active');
      }
      
      if (lifestyle.detected_activities.includes('professional')) {
        insights.traits.push('ambitious', 'career-focused');
      }
      
      if (lifestyle.setting_type === 'outdoor') {
        insights.lifestyle_indicators.push('nature_lover', 'active');
      }
      
      if (lifestyle.formality_level === 'business') {
        insights.lifestyle_indicators.push('professional', 'sophisticated');
      }

      // Analyze facial expressions if available
      if (photoAnalysis.face_analysis && photoAnalysis.face_analysis.dominant_expression) {
        const expression = photoAnalysis.face_analysis.dominant_expression;
        const expressionTraits = {
          happy: ['optimistic', 'friendly'],
          confident: ['self-assured', 'outgoing'],
          neutral: ['calm', 'balanced'],
          surprised: ['spontaneous', 'expressive']
        };
        
        if (expressionTraits[expression]) {
          insights.traits.push(...expressionTraits[expression]);
        }
      }

      insights.confidence_level = insights.traits.length > 2 ? 'high' : insights.traits.length > 0 ? 'medium' : 'low';
      
      return insights;
    } catch (error) {
      logger.error('Personality analysis from photos failed:', error);
      return { confidence_level: 'low', traits: [], lifestyle_indicators: [] };
    }
  }

  /**
   * Predict bio success factors based on user data and photo analysis
   */
  async predictBioSuccessFactors(userProfile, photoAnalysis) {
    try {
      const factors = {
        predicted_success_score: 50,
        key_strengths: [],
        optimization_opportunities: [],
        recommended_elements: [],
        risk_factors: []
      };

      // Age-based predictions
      if (userProfile.age >= 25 && userProfile.age <= 35) {
        factors.key_strengths.push('desirable_age_range');
        factors.predicted_success_score += 10;
      }

      // Photo quality impact
      if (photoAnalysis && photoAnalysis.attractiveness_score) {
        const photoScore = photoAnalysis.attractiveness_score.overall_score;
        if (photoScore >= 80) {
          factors.key_strengths.push('high_quality_photos');
          factors.predicted_success_score += 15;
        } else if (photoScore < 60) {
          factors.risk_factors.push('low_photo_quality');
          factors.optimization_opportunities.push('improve_photo_quality');
        }
      }

      // Interest diversity
      if (userProfile.interests && userProfile.interests.length > 0) {
        if (userProfile.interests.length >= 5) {
          factors.key_strengths.push('diverse_interests');
          factors.predicted_success_score += 5;
        }
        
        // Check for conversation-friendly interests
        const socialInterests = ['music', 'travel', 'food', 'movies', 'books', 'sports'];
        const hasSocialInterests = userProfile.interests.some(interest => 
          socialInterests.some(social => interest.toLowerCase().includes(social))
        );
        
        if (hasSocialInterests) {
          factors.recommended_elements.push('highlight_social_interests');
        }
      } else {
        factors.risk_factors.push('no_interests_listed');
        factors.optimization_opportunities.push('add_specific_interests');
      }

      // Profession impact
      if (userProfile.profession) {
        const professionalFields = ['doctor', 'lawyer', 'engineer', 'teacher', 'designer', 'entrepreneur'];
        const isProfessional = professionalFields.some(field => 
          userProfile.profession.toLowerCase().includes(field)
        );
        
        if (isProfessional) {
          factors.key_strengths.push('attractive_profession');
          factors.recommended_elements.push('mention_profession');
        }
      }

      // Location advantages
      if (userProfile.location) {
        const desirableLocations = ['new york', 'san francisco', 'los angeles', 'chicago', 'boston'];
        const isDesirableLocation = desirableLocations.some(loc => 
          userProfile.location.toLowerCase().includes(loc)
        );
        
        if (isDesirableLocation) {
          factors.key_strengths.push('desirable_location');
        }
      }

      // Relationship goals alignment
      if (userProfile.relationship_goals) {
        if (userProfile.relationship_goals.toLowerCase().includes('serious')) {
          factors.recommended_elements.push('emphasize_commitment');
        } else if (userProfile.relationship_goals.toLowerCase().includes('casual')) {
          factors.recommended_elements.push('emphasize_fun_spontaneity');
        }
      }

      return factors;
    } catch (error) {
      logger.error('Success factor prediction failed:', error);
      return {
        predicted_success_score: 50,
        key_strengths: [],
        optimization_opportunities: ['improve_profile_completeness']
      };
    }
  }

  /**
   * Generate bio with success prediction and optimization
   */
  async generateBioWithSuccessPrediction(userProfile, photoAnalysis, personalityInsights, successFactors, options) {
    try {
      const enhancedPrompt = this.buildAdvancedBioPrompt(
        userProfile, 
        photoAnalysis, 
        personalityInsights, 
        successFactors, 
        options
      );

      const systemPrompt = this.getAdvancedSystemPrompt(options.target_platform, personalityInsights);

      // Calculate estimated cost
      const estimatedTokens = enhancedPrompt.length / 4; // Rough estimation
      const estimatedCost = aiConfigService.estimateOpenAICost(
        process.env.OPENAI_MODEL || 'gpt-4', 
        estimatedTokens
      );

      logger.info('Advanced bio generation started:', {
        userId: userProfile.user_id,
        estimatedCost,
        personalityTraits: personalityInsights.traits.length,
        successScore: successFactors.predicted_success_score
      });

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedPrompt }
        ],
        max_tokens: 400,
        temperature: 0.8,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      });

      const bioText = completion.choices[0].message.content.trim();
      
      // Enhanced bio analysis including success prediction
      const bioAnalysis = await this.analyzeAdvancedBio(bioText, userProfile, options.target_platform, successFactors);
      
      const result = {
        text: bioText,
        analysis: bioAnalysis,
        personality_insights: personalityInsights,
        success_factors: successFactors,
        predicted_performance: this.predictBioPerformance(bioAnalysis, successFactors),
        optimization_suggestions: this.generateOptimizationSuggestions(bioAnalysis, successFactors),
        tokens_used: completion.usage?.total_tokens || 0,
        cost: aiConfigService.estimateOpenAICost(
          process.env.OPENAI_MODEL || 'gpt-4',
          completion.usage?.total_tokens || 0
        )
      };

      return result;
    } catch (error) {
      logger.error('Advanced bio generation failed:', error);
      throw error;
    }
  }

  /**
   * Build advanced bio prompt with personality and success insights
   */
  buildAdvancedBioPrompt(userProfile, photoAnalysis, personalityInsights, successFactors, options) {
    const template = this.bioTemplates[options.personality_type] || this.bioTemplates.balanced;
    const platform = this.platformRequirements[options.target_platform] || this.platformRequirements.tinder;

    return `Create a highly optimized dating profile bio using advanced psychology and data insights:

USER PROFILE:
- Age: ${userProfile.age}
- Gender: ${userProfile.gender}
- Location: ${userProfile.location || 'Not specified'}
- Profession: ${userProfile.profession || 'Not specified'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Relationship goals: ${userProfile.relationship_goals || 'Connection and dating'}

PHOTO ANALYSIS INSIGHTS:
- Photo quality score: ${photoAnalysis?.attractiveness_score?.overall_score || 'N/A'}/100
- Detected lifestyle: ${photoAnalysis?.lifestyle_signals?.detected_activities?.join(', ') || 'General'}
- Setting context: ${photoAnalysis?.lifestyle_signals?.setting_type || 'Unknown'}
- Facial expression: ${photoAnalysis?.face_analysis?.dominant_expression || 'Neutral'}

PERSONALITY INSIGHTS (Confidence: ${personalityInsights.confidence_level}):
- Detected traits: ${personalityInsights.traits.join(', ') || 'None detected'}
- Lifestyle indicators: ${personalityInsights.lifestyle_indicators.join(', ') || 'General'}

SUCCESS PREDICTION ANALYSIS:
- Predicted success score: ${successFactors.predicted_success_score}/100
- Key strengths: ${successFactors.key_strengths.join(', ') || 'None identified'}
- Recommended elements: ${successFactors.recommended_elements.join(', ') || 'Standard approach'}
- Risk factors to avoid: ${successFactors.risk_factors.join(', ') || 'None identified'}

PLATFORM OPTIMIZATION (${options.target_platform.toUpperCase()}):
- Max length: ${platform.max_length} characters
- Platform style: ${platform.style}
- Focus area: ${platform.focus}

ADVANCED REQUIREMENTS:
1. Use psychological triggers for the detected personality type
2. Include conversation starters based on success factors
3. Highlight unique strengths while mitigating risk factors
4. Optimize for ${platform.focus}
5. Include specific, non-cliché details
6. Create emotional connection through storytelling
7. End with a compelling call-to-action
8. Ensure optimal length for ${options.target_platform}

PERSONALITY-SPECIFIC OPTIMIZATION:
${this.getPersonalityOptimizationInstructions(personalityInsights, options.target_platform)}

Generate a bio that maximizes match potential while maintaining authenticity:`;
  }

  /**
   * Get personality-specific optimization instructions
   */
  getPersonalityOptimizationInstructions(personalityInsights, platform) {
    const traits = personalityInsights.traits;
    let instructions = [];

    if (traits.includes('adventurous')) {
      instructions.push('- Mention specific adventures or travel experiences');
      instructions.push('- Use action words and dynamic language');
    }

    if (traits.includes('professional') || traits.includes('ambitious')) {
      instructions.push('- Subtly reference career achievements without bragging');
      instructions.push('- Show drive and goal orientation');
    }

    if (traits.includes('creative') || traits.includes('artistic')) {
      instructions.push('- Highlight creative projects or artistic interests');
      instructions.push('- Use more expressive and unique language');
    }

    if (traits.includes('active') || traits.includes('fitness')) {
      instructions.push('- Mention specific activities or fitness goals');
      instructions.push('- Appeal to other active individuals');
    }

    // Platform-specific personality adaptations
    if (platform === 'tinder' && traits.includes('humorous')) {
      instructions.push('- Include a witty one-liner or playful joke');
    } else if (platform === 'bumble' && traits.includes('intellectual')) {
      instructions.push('- Include thought-provoking questions or interests');
    }

    return instructions.length > 0 ? instructions.join('\n') : '- Use authentic, specific details that reflect genuine personality';
  }

  /**
   * Advanced bio analysis with success prediction
   */
  async analyzeAdvancedBio(bioText, userProfile, platform, successFactors) {
    try {
      // Get standard analysis
      const standardAnalysis = await this.analyzeBio(bioText, userProfile, platform);
      
      // Add advanced metrics
      const advancedMetrics = {
        ...standardAnalysis,
        success_indicators: this.analyzeSuccessIndicators(bioText),
        psychological_appeal: this.analyzePsychologicalAppeal(bioText),
        conversation_potential: this.analyzeConversationPotential(bioText),
        authenticity_score: this.analyzeAuthenticity(bioText, userProfile),
        emotional_engagement: this.analyzeEmotionalEngagement(bioText),
        competitive_advantage: this.analyzeCompetitiveAdvantage(bioText, successFactors)
      };

      // Recalculate overall score with advanced metrics
      advancedMetrics.overall_score = this.calculateAdvancedOverallScore(advancedMetrics);
      
      return advancedMetrics;
    } catch (error) {
      logger.error('Advanced bio analysis failed:', error);
      return await this.analyzeBio(bioText, userProfile, platform);
    }
  }

  /**
   * Analyze success indicators in bio text
   */
  analyzeSuccessIndicators(bioText) {
    const indicators = {
      specific_details: 0,
      unique_experiences: 0,
      conversation_hooks: 0,
      value_statements: 0,
      call_to_action: 0
    };

    const lowerText = bioText.toLowerCase();

    // Count specific details (numbers, names, places)
    const specificDetails = bioText.match(/\b\d+\b|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g);
    indicators.specific_details = specificDetails ? Math.min(specificDetails.length * 10, 100) : 0;

    // Check for unique experiences
    const uniqueWords = ['traveled', 'climbed', 'performed', 'created', 'built', 'founded', 'competed'];
    indicators.unique_experiences = uniqueWords.filter(word => lowerText.includes(word)).length * 15;

    // Check for conversation hooks
    const hooks = ['ask me', 'tell me', 'let\'s', 'we could', 'i can teach', 'challenge me'];
    indicators.conversation_hooks = hooks.filter(hook => lowerText.includes(hook)).length * 20;

    // Check for value statements
    const values = ['honest', 'loyal', 'kind', 'ambitious', 'creative', 'passionate'];
    indicators.value_statements = values.filter(value => lowerText.includes(value)).length * 10;

    // Check for call to action
    if (bioText.includes('?') || lowerText.includes('message me') || lowerText.includes('let\'s')) {
      indicators.call_to_action = 80;
    }

    return indicators;
  }

  /**
   * Predict bio performance based on analysis
   */
  predictBioPerformance(bioAnalysis, successFactors) {
    const prediction = {
      like_rate_increase: 0,
      message_rate_increase: 0,
      match_quality_improvement: 0,
      overall_performance_score: 0
    };

    // Base predictions on analysis scores
    const overallScore = bioAnalysis.overall_score;
    const successScore = successFactors.predicted_success_score;

    // Like rate prediction
    if (overallScore >= 85) {
      prediction.like_rate_increase = 25;
    } else if (overallScore >= 75) {
      prediction.like_rate_increase = 15;
    } else if (overallScore >= 65) {
      prediction.like_rate_increase = 8;
    }

    // Message rate prediction (based on conversation potential)
    const conversationScore = bioAnalysis.conversation_potential?.overall_score || 50;
    if (conversationScore >= 80) {
      prediction.message_rate_increase = 30;
    } else if (conversationScore >= 70) {
      prediction.message_rate_increase = 20;
    }

    // Match quality improvement
    const authenticityScore = bioAnalysis.authenticity_score || 50;
    if (authenticityScore >= 80) {
      prediction.match_quality_improvement = 20;
    }

    // Overall performance score
    prediction.overall_performance_score = Math.round(
      (prediction.like_rate_increase * 0.4) +
      (prediction.message_rate_increase * 0.4) +
      (prediction.match_quality_improvement * 0.2)
    );

    return prediction;
  }

  /**
   * Create A/B test for bio variations
   */
  async createBioABTest(userId, bioResult, options) {
    try {
      // Generate alternative bio variations for A/B testing
      const variations = await this.generateBioVariations(bioResult, options, 3);
      
      const testConfig = {
        user_id: userId,
        test_type: 'bio_variation',
        test_name: `Bio A/B Test - ${options.target_platform}`,
        description: `Testing bio effectiveness on ${options.target_platform}`,
        variants: [
          {
            id: 'control',
            name: 'Original Bio',
            bio_text: bioResult.text,
            variation_type: 'control'
          },
          ...variations.map((variation, index) => ({
            id: `variant_${index + 1}`,
            name: `Variation ${index + 1}`,
            bio_text: variation.text,
            variation_type: variation.type
          }))
        ],
        target_metric: 'engagement_rate',
        metadata: {
          platform: options.target_platform,
          generated_at: new Date().toISOString()
        }
      };

      return await abTestingService.createTest(testConfig);
    } catch (error) {
      logger.error('A/B test creation failed:', error);
      return { test_id: null, error: error.message };
    }
  }

  /**
   * Generate bio variations for A/B testing
   */
  async generateBioVariations(originalBio, options, numVariations = 2) {
    const variations = [];
    
    try {
      for (let i = 0; i < numVariations; i++) {
        const variationType = ['humor_focused', 'achievement_focused', 'activity_focused'][i];
        
        const variation = await this.generateVariation(originalBio, variationType, options);
        variations.push({
          text: variation.text,
          type: variationType,
          analysis: variation.analysis
        });
      }
      
      return variations;
    } catch (error) {
      logger.error('Bio variations generation failed:', error);
      return [];
    }
  }

  /**
   * Generate a specific bio variation
   */
  async generateVariation(originalBio, variationType, options) {
    const variationPrompts = {
      humor_focused: 'Rewrite this bio with more humor and wit while keeping core information',
      achievement_focused: 'Rewrite this bio emphasizing achievements and ambitions',
      activity_focused: 'Rewrite this bio focusing more on activities and shared experiences'
    };

    const prompt = `${variationPrompts[variationType]}:

Original bio: "${originalBio.text}"

Platform: ${options.target_platform}
Max length: ${this.platformRequirements[options.target_platform]?.max_length || 500} characters

Create a variation that maintains the same core message but with a different approach.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a dating profile expert creating bio variations for A/B testing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.9
      });

      const variationText = completion.choices[0].message.content.trim();
      
      return {
        text: variationText,
        analysis: await this.analyzeBio(variationText, {}, options.target_platform)
      };
    } catch (error) {
      logger.error(`Failed to generate ${variationType} variation:`, error);
      return {
        text: originalBio.text,
        analysis: originalBio.analysis
      };
    }
  }

  /**
   * Additional helper methods for advanced features
   */
  analyzeConversationPotential(bioText) {
    const score = this.calculateConversationScore(bioText);
    return {
      overall_score: score,
      has_questions: bioText.includes('?'),
      has_call_to_action: /message|text|ask|tell/i.test(bioText),
      conversation_starters: this.extractConversationStarters(bioText)
    };
  }

  analyzeAuthenticity(bioText, userProfile) {
    // Analyze how well the bio reflects the user's actual profile
    let score = 70; // Base authenticity score
    
    if (userProfile.interests) {
      const mentionedInterests = userProfile.interests.filter(interest =>
        bioText.toLowerCase().includes(interest.toLowerCase())
      );
      score += (mentionedInterests.length / userProfile.interests.length) * 20;
    }
    
    // Penalize overly generic statements
    const genericPhrases = ['love to laugh', 'live life', 'good vibes'];
    const genericCount = genericPhrases.filter(phrase => 
      bioText.toLowerCase().includes(phrase)
    ).length;
    score -= genericCount * 10;
    
    return Math.max(20, Math.min(100, score));
  }

  analyzeEmotionalEngagement(bioText) {
    const emotionalWords = ['passionate', 'love', 'excited', 'adventure', 'dream', 'inspire'];
    const emotionalCount = emotionalWords.filter(word =>
      bioText.toLowerCase().includes(word)
    ).length;
    
    return Math.min(100, emotionalCount * 15 + 40);
  }

  analyzeCompetitiveAdvantage(bioText, successFactors) {
    let score = 50;
    
    // Boost score for key strengths mentioned
    successFactors.key_strengths.forEach(strength => {
      if (this.bioContainsStrength(bioText, strength)) {
        score += 10;
      }
    });
    
    // Penalize for risk factors
    successFactors.risk_factors.forEach(risk => {
      if (this.bioContainsRisk(bioText, risk)) {
        score -= 15;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  bioContainsStrength(bioText, strength) {
    const strengthMappings = {
      'high_quality_photos': false, // Not relevant for bio text
      'attractive_profession': /doctor|lawyer|engineer|designer|entrepreneur/i.test(bioText),
      'diverse_interests': bioText.split(',').length > 2,
      'desirable_location': /new york|san francisco|los angeles|chicago/i.test(bioText)
    };
    
    return strengthMappings[strength] || false;
  }

  bioContainsRisk(bioText, risk) {
    const riskMappings = {
      'low_photo_quality': false, // Not relevant for bio text
      'no_interests_listed': bioText.length < 50,
      'generic_content': /love to laugh|live life|good vibes|no drama/i.test(bioText)
    };
    
    return riskMappings[risk] || false;
  }

  calculateAdvancedOverallScore(metrics) {
    const weights = {
      readability_score: 0.10,
      uniqueness_score: 0.20,
      conversation_starter_score: 0.15,
      personality_match_score: 0.10,
      platform_optimization_score: 0.10,
      authenticity_score: 0.15,
      emotional_engagement: 0.10,
      competitive_advantage: 0.10
    };
    
    let totalScore = 0;
    Object.keys(weights).forEach(metric => {
      const score = metrics[metric] || 50;
      totalScore += score * weights[metric];
    });
    
    return Math.round(totalScore);
  }

  extractConversationStarters(bioText) {
    const starters = [];
    
    // Look for questions
    const questions = bioText.match(/[^.!?]*\?[^.!?]*/g);
    if (questions) {
      starters.push(...questions);
    }
    
    // Look for "ask me about" patterns
    const askPatterns = bioText.match(/ask me about [^.!?]*/gi);
    if (askPatterns) {
      starters.push(...askPatterns);
    }
    
    return starters;
  }

  generateOptimizationSuggestions(bioAnalysis, successFactors) {
    const suggestions = [];
    
    if (bioAnalysis.conversation_starter_score < 70) {
      suggestions.push({
        type: 'conversation',
        suggestion: 'Add a specific question or conversation starter',
        impact: 'medium'
      });
    }
    
    if (bioAnalysis.uniqueness_score < 70) {
      suggestions.push({
        type: 'uniqueness',
        suggestion: 'Replace generic phrases with specific details about your interests',
        impact: 'high'
      });
    }
    
    if (bioAnalysis.authenticity_score < 70) {
      suggestions.push({
        type: 'authenticity',
        suggestion: 'Include more details that reflect your actual interests and personality',
        impact: 'high'
      });
    }
    
    return suggestions;
  }

  optimizeBioForPlatform(bioResult, platform) {
    const requirements = this.platformRequirements[platform];
    if (!requirements) return bioResult;
    
    // Adjust length if needed
    if (bioResult.text.length > requirements.max_length) {
      // Intelligently trim while preserving key elements
      bioResult.text = this.intelligentTrim(bioResult.text, requirements.max_length);
      bioResult.was_trimmed = true;
    }
    
    return bioResult;
  }

  intelligentTrim(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    // Try to trim at sentence boundaries
    const sentences = text.split(/[.!?]+/);
    let trimmed = '';
    
    for (const sentence of sentences) {
      if ((trimmed + sentence).length <= maxLength - 3) {
        trimmed += sentence + '.';
      } else {
        break;
      }
    }
    
    if (trimmed.length < maxLength * 0.7) {
      // If sentence-based trimming is too aggressive, do word-based
      const words = text.split(' ');
      trimmed = '';
      
      for (const word of words) {
        if ((trimmed + word).length <= maxLength - 3) {
          trimmed += word + ' ';
        } else {
          break;
        }
      }
      trimmed = trimmed.trim() + '...';
    }
    
    return trimmed.trim();
  }

  getAdvancedSystemPrompt(platform, personalityInsights) {
    const basePrompt = this.getSystemPrompt('advanced', platform);
    
    const personalityAddition = `
Additional context: This user's photos suggest they are ${personalityInsights.traits.join(', ')} with ${personalityInsights.confidence_level} confidence.
Focus on creating content that appeals to people looking for someone with these qualities.`;
    
    return basePrompt + personalityAddition;
  }

  analyzePsychologicalAppeal(bioText) {
    // Analyze psychological triggers and appeal factors
    const triggers = {
      social_proof: /friends|group|team/i.test(bioText),
      scarcity: /selective|quality|standards/i.test(bioText),
      curiosity: /guess|mystery|surprise/i.test(bioText),
      reciprocity: /teach|help|share/i.test(bioText)
    };
    
    const score = Object.values(triggers).filter(Boolean).length * 20 + 20;
    return Math.min(100, score);
  }
}

module.exports = new BioGenerationService();