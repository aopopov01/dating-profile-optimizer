const OpenAI = require('openai');
const tf = require('@tensorflow/tfjs-node');
const crypto = require('crypto');
const logger = require('../config/logger');
const cacheService = require('./advancedCacheService');

/**
 * AI Processing Optimization Service for Dating Profile Optimizer
 * Optimized for bio generation and photo analysis with intelligent caching and batching
 */
class AIOptimizationService {
  constructor() {
    this.openai = null;
    this.processingQueue = new Map();
    this.batchQueue = new Map();
    this.maxConcurrentRequests = parseInt(process.env.MAX_CONCURRENT_AI_REQUESTS) || 5;
    this.currentRequests = 0;
    this.batchSize = 10;
    this.batchTimeout = 5000; // 5 seconds
    this.rateLimitWindow = 60000; // 1 minute
    this.rateLimitRequests = 100;
    this.requestCounts = new Map();
    
    // AI model configurations for dating app
    this.modelConfigs = {
      bioGeneration: {
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 200,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3
      },
      photoAnalysis: {
        model: 'gpt-4-vision-preview',
        temperature: 0.3,
        maxTokens: 500,
        detail: 'high'
      },
      personalityAnalysis: {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 300
      },
      matchingInsights: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 150
      }
    };

    // Dating app specific prompts
    this.datingPrompts = {
      bioGeneration: {
        casual: "Create an engaging, authentic dating profile bio that's casual and fun. Focus on personality, interests, and what makes this person unique. Keep it conversational and approachable.",
        professional: "Write a sophisticated dating profile bio that balances professionalism with personal warmth. Highlight career achievements while showing personality and relationship goals.",
        creative: "Craft a creative and memorable dating profile bio that stands out. Use humor, wordplay, or unique perspectives while staying genuine and attractive.",
        adventurous: "Generate an exciting dating profile bio that emphasizes adventure, travel, and outdoor activities. Show energy and enthusiasm for life and new experiences."
      },
      photoAnalysis: {
        attractiveness: "Analyze this dating profile photo for visual appeal and attractiveness. Consider lighting, composition, facial expression, styling, and overall presentation. Provide a score from 1-10 and specific improvement suggestions.",
        authenticity: "Evaluate this photo for authenticity and trustworthiness in a dating context. Look for natural expressions, genuine smiles, and signs of photo manipulation. Rate authenticity from 1-10.",
        lifestyle: "Analyze this photo to determine what lifestyle and personality it communicates. Consider setting, activity, clothing, and body language. Describe the lifestyle signals being sent."
      }
    };

    this.initialize();
  }

  /**
   * Initialize OpenAI client and other AI services
   */
  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 30000, // 30 second timeout
        maxRetries: 3,
      });

      // Initialize TensorFlow.js for local processing
      await tf.ready();
      logger.info('TensorFlow.js initialized for local AI processing');

      // Start batch processing timer
      this.startBatchProcessor();

      logger.info('AI Optimization Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Optimization Service:', error);
      throw error;
    }
  }

  /**
   * Start batch processing timer for efficient API usage
   */
  startBatchProcessor() {
    setInterval(() => {
      this.processBatchQueue();
    }, this.batchTimeout);
  }

  /**
   * Generate hash for input caching
   */
  generateInputHash(input, options = {}) {
    const combined = JSON.stringify({ input, options });
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Check rate limits
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userKey = `rate_limit_${userId}`;
    
    if (!this.requestCounts.has(userKey)) {
      this.requestCounts.set(userKey, { count: 0, windowStart: now });
    }
    
    const userLimits = this.requestCounts.get(userKey);
    
    // Reset window if expired
    if (now - userLimits.windowStart > this.rateLimitWindow) {
      userLimits.count = 0;
      userLimits.windowStart = now;
    }
    
    if (userLimits.count >= this.rateLimitRequests) {
      return false;
    }
    
    userLimits.count++;
    return true;
  }

  /**
   * Wait for available processing slot
   */
  async waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.currentRequests < this.maxConcurrentRequests) {
          this.currentRequests++;
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  /**
   * Optimized bio generation with caching and personalization
   */
  async generateOptimizedBio(userProfile, options = {}) {
    const { style = 'casual', userId, personality = {}, interests = [] } = options;
    
    // Check rate limits
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for AI bio generation');
    }

    // Generate cache key
    const inputHash = this.generateInputHash({ userProfile, style, personality, interests });
    const cacheKey = `bio_generation_${inputHash}`;
    
    // Check cache first
    const cached = await cacheService.getAIResult('bio_generation', inputHash);
    if (cached && options.useCache !== false) {
      logger.debug(`Using cached bio generation for user ${userId}`);
      return cached;
    }

    await this.waitForSlot();

    try {
      const startTime = Date.now();
      
      // Build personalized prompt
      const prompt = this.buildBioPrompt(userProfile, style, personality, interests);
      const config = this.modelConfigs.bioGeneration;

      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert dating profile writer who creates authentic, engaging bios that attract meaningful connections. Focus on personality, genuine interests, and what makes someone uniquely attractive.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty
      });

      const generatedBio = response.choices[0]?.message?.content?.trim();
      
      if (!generatedBio) {
        throw new Error('Empty response from AI bio generation');
      }

      // Analyze the generated bio
      const bioAnalysis = await this.analyzeBioQuality(generatedBio);
      
      const result = {
        bio: generatedBio,
        style,
        analysis: bioAnalysis,
        metadata: {
          userId,
          model: config.model,
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          generatedAt: new Date().toISOString()
        }
      };

      // Cache the result
      await cacheService.cacheAIResult('bio_generation', inputHash, result, 7200); // 2 hours

      logger.info(`Bio generated successfully for user ${userId} in ${result.metadata.processingTime}ms`);
      return result;
      
    } catch (error) {
      logger.error(`Bio generation failed for user ${userId}:`, error);
      throw error;
    } finally {
      this.currentRequests--;
    }
  }

  /**
   * Build personalized bio prompt
   */
  buildBioPrompt(userProfile, style, personality, interests) {
    const { age, occupation, location, hobbies = [] } = userProfile;
    
    let prompt = this.datingPrompts.bioGeneration[style] || this.datingPrompts.bioGeneration.casual;
    
    prompt += `\n\nProfile details:
- Age: ${age}
- Occupation: ${occupation || 'Not specified'}
- Location: ${location || 'Not specified'}
- Interests/Hobbies: ${[...hobbies, ...interests].join(', ') || 'Not specified'}`;

    if (Object.keys(personality).length > 0) {
      prompt += `\n- Personality traits: ${JSON.stringify(personality)}`;
    }

    prompt += `\n\nRequirements:
- Keep it under 150 words
- Make it authentic and genuine
- Include specific details that make them memorable
- End with something that invites conversation
- Avoid clichés like "love to laugh" or "looking for my partner in crime"
- Match the ${style} style requested`;

    return prompt;
  }

  /**
   * Analyze bio quality for dating apps
   */
  async analyzeBioQuality(bio) {
    try {
      const analysisPrompt = `Analyze this dating profile bio for quality and effectiveness:

"${bio}"

Rate the bio on the following criteria (1-10 scale):
1. Authenticity (how genuine it sounds)
2. Engagement (how likely to start conversations)
3. Memorability (how unique and memorable)
4. Balance (good mix of personal info and personality)
5. Attractiveness (overall appeal)

Also identify:
- Strong points
- Areas for improvement
- Conversation starters it provides
- Overall effectiveness score (1-100)

Respond in JSON format.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a dating profile expert who analyzes bios for effectiveness. Provide detailed, constructive feedback in JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 400
      });

      const analysisText = response.choices[0]?.message?.content;
      return JSON.parse(analysisText);
      
    } catch (error) {
      logger.error('Bio quality analysis failed:', error);
      return {
        error: 'Analysis failed',
        defaultScores: {
          authenticity: 7,
          engagement: 7,
          memorability: 6,
          balance: 7,
          attractiveness: 7,
          overall: 70
        }
      };
    }
  }

  /**
   * Optimized photo analysis with visual AI
   */
  async analyzePhotoOptimized(imageUrl, analysisType = 'attractiveness', options = {}) {
    const { userId } = options;
    
    // Check rate limits
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded for photo analysis');
    }

    // Generate cache key
    const inputHash = this.generateInputHash({ imageUrl, analysisType });
    const cacheKey = `photo_analysis_${inputHash}`;
    
    // Check cache
    const cached = await cacheService.getAIResult('photo_analysis', inputHash);
    if (cached && options.useCache !== false) {
      logger.debug(`Using cached photo analysis for user ${userId}`);
      return cached;
    }

    await this.waitForSlot();

    try {
      const startTime = Date.now();
      const prompt = this.datingPrompts.photoAnalysis[analysisType] || this.datingPrompts.photoAnalysis.attractiveness;
      const config = this.modelConfigs.photoAnalysis;

      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional dating photo analyst who provides constructive feedback to help people present their best selves online.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: config.detail
                }
              }
            ]
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const analysis = response.choices[0]?.message?.content;
      
      if (!analysis) {
        throw new Error('Empty response from photo analysis');
      }

      // Extract structured data from analysis
      const structuredAnalysis = await this.extractPhotoAnalysisData(analysis);
      
      const result = {
        analysis,
        structured: structuredAnalysis,
        analysisType,
        metadata: {
          userId,
          imageUrl,
          model: config.model,
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          analyzedAt: new Date().toISOString()
        }
      };

      // Cache the result
      await cacheService.cacheAIResult('photo_analysis', inputHash, result, 3600); // 1 hour

      logger.info(`Photo analysis completed for user ${userId} in ${result.metadata.processingTime}ms`);
      return result;
      
    } catch (error) {
      logger.error(`Photo analysis failed for user ${userId}:`, error);
      throw error;
    } finally {
      this.currentRequests--;
    }
  }

  /**
   * Extract structured data from photo analysis
   */
  async extractPhotoAnalysisData(analysisText) {
    try {
      const extractPrompt = `Extract key data points from this photo analysis in JSON format:

"${analysisText}"

Extract:
- Overall score (1-10)
- Key strengths (array)
- Areas for improvement (array)
- Specific suggestions (array)
- Lighting quality (1-10)
- Composition score (1-10)
- Authenticity score (1-10)
- Professional rating (1-10)

Return only valid JSON.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract structured data from photo analysis. Return only valid JSON.'
          },
          {
            role: 'user',
            content: extractPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      });

      const extractedData = response.choices[0]?.message?.content;
      return JSON.parse(extractedData);
      
    } catch (error) {
      logger.error('Photo analysis data extraction failed:', error);
      return {
        overallScore: 7,
        strengths: ['Good lighting'],
        improvements: ['Better angle'],
        suggestions: ['Try smiling more'],
        lightingQuality: 7,
        compositionScore: 7,
        authenticityScore: 8,
        professionalRating: 6
      };
    }
  }

  /**
   * Batch process multiple AI requests efficiently
   */
  async batchProcessAI(requests, options = {}) {
    const { batchSize = this.batchSize, maxConcurrency = 3 } = options;
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(async (request) => {
        try {
          switch (request.type) {
            case 'bio_generation':
              return await this.generateOptimizedBio(request.userProfile, request.options);
            case 'photo_analysis':
              return await this.analyzePhotoOptimized(request.imageUrl, request.analysisType, request.options);
            default:
              throw new Error(`Unknown request type: ${request.type}`);
          }
        } catch (error) {
          logger.error(`Batch AI processing error for request ${request.id}:`, error);
          return { error: error.message, requestId: request.id };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ));
      
      logger.info(`Processed AI batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(requests.length / batchSize)}`);
      
      // Brief pause between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Process batch queue efficiently
   */
  async processBatchQueue() {
    if (this.batchQueue.size === 0) return;
    
    const queuedItems = Array.from(this.batchQueue.values());
    this.batchQueue.clear();
    
    if (queuedItems.length > 0) {
      logger.info(`Processing AI batch queue with ${queuedItems.length} items`);
      await this.batchProcessAI(queuedItems);
    }
  }

  /**
   * Generate personality insights from user data
   */
  async generatePersonalityInsights(userData, options = {}) {
    const { userId } = options;
    const inputHash = this.generateInputHash(userData);
    
    // Check cache
    const cached = await cacheService.getAIResult('personality_analysis', inputHash);
    if (cached && options.useCache !== false) {
      return cached;
    }

    await this.waitForSlot();
    
    try {
      const startTime = Date.now();
      const config = this.modelConfigs.personalityAnalysis;
      
      const prompt = `Analyze this user's dating profile data and generate personality insights:

User Data:
${JSON.stringify(userData, null, 2)}

Provide:
1. Primary personality traits (Big 5 personality model)
2. Dating strengths
3. Potential compatibility indicators
4. Communication style
5. Relationship preferences
6. Attraction patterns

Focus on insights that would help with matching and dating success. Be positive and constructive.`;

      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a relationship psychology expert who analyzes dating profiles to provide insights for better matching and dating success.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const insights = response.choices[0]?.message?.content;
      
      const result = {
        insights,
        userData: userData,
        metadata: {
          userId,
          model: config.model,
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          analyzedAt: new Date().toISOString()
        }
      };

      // Cache the result
      await cacheService.cacheAIResult('personality_analysis', inputHash, result, 3600);
      
      return result;
      
    } catch (error) {
      logger.error(`Personality analysis failed for user ${userId}:`, error);
      throw error;
    } finally {
      this.currentRequests--;
    }
  }

  /**
   * Get AI processing statistics
   */
  getProcessingStats() {
    const rateLimitStats = {};
    for (const [key, limits] of this.requestCounts.entries()) {
      rateLimitStats[key] = {
        requestCount: limits.count,
        windowStart: new Date(limits.windowStart).toISOString()
      };
    }
    
    return {
      currentRequests: this.currentRequests,
      maxConcurrentRequests: this.maxConcurrentRequests,
      queueSize: this.batchQueue.size,
      utilization: (this.currentRequests / this.maxConcurrentRequests) * 100,
      rateLimits: rateLimitStats,
      batchSettings: {
        batchSize: this.batchSize,
        batchTimeout: this.batchTimeout
      }
    };
  }

  /**
   * Health check for AI services
   */
  async healthCheck() {
    try {
      // Test OpenAI connectivity
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return {
        status: 'healthy',
        openai: 'connected',
        tensorflow: tf.ready() ? 'ready' : 'not ready',
        currentLoad: this.currentRequests,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    this.requestCounts.clear();
    this.batchQueue.clear();
    this.processingQueue.clear();
    logger.info('AI Optimization Service cleaned up');
  }
}

module.exports = new AIOptimizationService();