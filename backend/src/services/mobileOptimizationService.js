const logger = require('../config/logger');
const sharp = require('sharp');
const cacheService = require('./cacheService');

class MobileOptimizationService {
  constructor() {
    this.initialized = false;
    
    // Mobile response format configurations
    this.responseFormats = {
      minimal: {
        description: 'Minimal data for quick loading',
        includes: ['essential', 'summary'],
        max_payload_kb: 50,
        image_quality: 60,
        image_max_width: 400
      },
      standard: {
        description: 'Balanced data for most mobile use cases',
        includes: ['essential', 'summary', 'details'],
        max_payload_kb: 150,
        image_quality: 75,
        image_max_width: 800
      },
      detailed: {
        description: 'Full data for high-bandwidth scenarios',
        includes: ['essential', 'summary', 'details', 'analytics', 'metadata'],
        max_payload_kb: 300,
        image_quality: 85,
        image_max_width: 1200
      }
    };

    // Progressive loading configurations
    this.progressiveLoadingConfig = {
      phases: [
        {
          id: 'critical',
          name: 'Critical Content',
          priority: 1,
          timeout_ms: 1000,
          includes: ['user_profile', 'primary_photo', 'bio_preview']
        },
        {
          id: 'important',
          name: 'Important Content',
          priority: 2,
          timeout_ms: 3000,
          includes: ['photo_analysis', 'bio_variations', 'success_score']
        },
        {
          id: 'enhanced',
          name: 'Enhanced Content',
          priority: 3,
          timeout_ms: 8000,
          includes: ['detailed_analytics', 'recommendations', 'ab_test_data']
        },
        {
          id: 'supplementary',
          name: 'Supplementary Content',
          priority: 4,
          timeout_ms: 15000,
          includes: ['historical_data', 'comparison_analytics', 'advanced_insights']
        }
      ]
    };

    // Image optimization settings
    this.imageOptimization = {
      formats: ['webp', 'jpeg', 'png'],
      quality_levels: {
        thumbnail: { quality: 60, width: 200, height: 200 },
        mobile: { quality: 75, width: 400, height: 400 },
        standard: { quality: 80, width: 800, height: 800 },
        high: { quality: 85, width: 1200, height: 1200 }
      },
      progressive: true,
      compression: {
        webp: { quality: 80, effort: 4 },
        jpeg: { quality: 80, progressive: true, mozjpeg: true },
        png: { compressionLevel: 8, progressive: true }
      }
    };

    // Connection type optimizations
    this.connectionOptimizations = {
      '2g': {
        response_format: 'minimal',
        image_quality: 'thumbnail',
        enable_progressive: true,
        batch_size: 1,
        timeout_multiplier: 2.0
      },
      '3g': {
        response_format: 'standard',
        image_quality: 'mobile',
        enable_progressive: true,
        batch_size: 2,
        timeout_multiplier: 1.5
      },
      '4g': {
        response_format: 'standard',
        image_quality: 'standard',
        enable_progressive: false,
        batch_size: 3,
        timeout_multiplier: 1.0
      },
      'wifi': {
        response_format: 'detailed',
        image_quality: 'high',
        enable_progressive: false,
        batch_size: 5,
        timeout_multiplier: 1.0
      }
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Mobile Optimization Service for Dating Profile Optimizer...');

      // Verify image processing capabilities
      try {
        await sharp().png().toBuffer();
        logger.info('Sharp image processing verified');
      } catch (sharpError) {
        logger.error('Sharp image processing not available:', sharpError);
      }

      this.initialized = true;
      logger.info('Mobile Optimization Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Mobile Optimization Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize response based on mobile client capabilities
   */
  async optimizeForMobile(data, clientInfo = {}) {
    try {
      const startTime = Date.now();
      
      // Determine optimization strategy
      const strategy = this.determineOptimizationStrategy(clientInfo);
      logger.debug('Optimization strategy determined:', strategy);

      // Apply response format optimization
      const optimizedData = await this.applyResponseFormatting(data, strategy);

      // Optimize images if present
      if (optimizedData.images) {
        optimizedData.images = await this.optimizeImages(optimizedData.images, strategy);
      }

      // Apply data compression
      const compressedData = await this.compressResponseData(optimizedData, strategy);

      // Calculate optimization metrics
      const optimizationMetrics = {
        original_size_kb: this.calculateDataSize(data),
        optimized_size_kb: this.calculateDataSize(compressedData),
        optimization_time_ms: Date.now() - startTime,
        strategy_used: strategy,
        compression_ratio: this.calculateCompressionRatio(data, compressedData)
      };

      logger.debug('Mobile optimization completed:', optimizationMetrics);

      return {
        data: compressedData,
        metadata: {
          mobile_optimized: true,
          optimization_strategy: strategy.response_format,
          ...optimizationMetrics
        }
      };
    } catch (error) {
      logger.error('Mobile optimization failed:', error);
      // Return original data if optimization fails
      return {
        data,
        metadata: {
          mobile_optimized: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Progressive loading implementation
   */
  async loadProgressively(dataRequest, clientInfo = {}, onPhaseComplete = null) {
    try {
      const progressiveData = {
        phases: {},
        metadata: {
          progressive_loading: true,
          phases_completed: 0,
          total_phases: this.progressiveLoadingConfig.phases.length,
          loading_start: new Date().toISOString()
        }
      };

      const strategy = this.determineOptimizationStrategy(clientInfo);
      
      // Load each phase sequentially
      for (const phase of this.progressiveLoadingConfig.phases) {
        const phaseStartTime = Date.now();
        
        try {
          logger.debug('Loading progressive phase:', phase.id);

          // Load phase data
          const phaseData = await this.loadPhaseData(dataRequest, phase, strategy);
          
          // Optimize phase data
          const optimizedPhaseData = await this.applyResponseFormatting(phaseData, strategy);
          
          // Store phase result
          progressiveData.phases[phase.id] = {
            data: optimizedPhaseData,
            loaded_at: new Date().toISOString(),
            loading_time_ms: Date.now() - phaseStartTime,
            phase_info: {
              name: phase.name,
              priority: phase.priority,
              includes: phase.includes
            }
          };

          progressiveData.metadata.phases_completed++;

          // Notify callback if provided
          if (onPhaseComplete) {
            try {
              onPhaseComplete(phase.id, progressiveData.phases[phase.id]);
            } catch (callbackError) {
              logger.warn('Progressive loading callback error:', callbackError);
            }
          }

          // Apply timeout between phases for lower priority content
          if (phase.priority > 2 && strategy.response_format === 'minimal') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (phaseError) {
          logger.error(`Progressive loading phase ${phase.id} failed:`, phaseError);
          
          progressiveData.phases[phase.id] = {
            error: phaseError.message,
            loaded_at: new Date().toISOString(),
            loading_time_ms: Date.now() - phaseStartTime,
            phase_info: phase
          };

          // For critical phases, propagate the error
          if (phase.priority === 1) {
            throw phaseError;
          }
        }
      }

      progressiveData.metadata.loading_completed = new Date().toISOString();
      progressiveData.metadata.total_loading_time = Date.now() - new Date(progressiveData.metadata.loading_start);

      return progressiveData;
    } catch (error) {
      logger.error('Progressive loading failed:', error);
      throw error;
    }
  }

  /**
   * Optimize images for mobile consumption
   */
  async optimizeImages(images, strategy) {
    try {
      const qualityLevel = this.imageOptimization.quality_levels[strategy.image_quality];
      const optimizedImages = [];

      for (const image of images) {
        try {
          // Check cache first
          const cacheKey = `img_opt:${this.generateImageHash(image)}:${strategy.image_quality}`;
          const cachedOptimized = await cacheService.get(cacheKey, 'image_processing');
          
          if (cachedOptimized) {
            optimizedImages.push(cachedOptimized);
            continue;
          }

          let optimizedImage;
          
          if (image.buffer || image.url) {
            // Optimize actual image
            optimizedImage = await this.processImageForMobile(image, qualityLevel);
          } else {
            // Handle image metadata only
            optimizedImage = {
              ...image,
              optimized_for_mobile: true,
              quality_level: strategy.image_quality
            };
          }

          // Cache optimized image
          await cacheService.set(cacheKey, optimizedImage, 'image_processing', 3600);
          optimizedImages.push(optimizedImage);

        } catch (imageError) {
          logger.warn('Image optimization failed for single image:', imageError);
          // Include original image with error note
          optimizedImages.push({
            ...image,
            optimization_error: imageError.message
          });
        }
      }

      return optimizedImages;
    } catch (error) {
      logger.error('Batch image optimization failed:', error);
      return images; // Return original images if batch optimization fails
    }
  }

  /**
   * Process single image for mobile optimization
   */
  async processImageForMobile(image, qualitySettings) {
    try {
      if (!image.buffer && !image.url) {
        throw new Error('Image buffer or URL required for processing');
      }

      let imageBuffer;
      
      if (image.buffer) {
        imageBuffer = Buffer.from(image.buffer, 'base64');
      } else if (image.url) {
        // In a real implementation, you would fetch the image from the URL
        throw new Error('URL-based image processing not implemented in this example');
      }

      // Create multiple formats and sizes
      const formats = {};
      
      // WebP format (most efficient)
      if (this.imageOptimization.formats.includes('webp')) {
        formats.webp = await sharp(imageBuffer)
          .resize(qualitySettings.width, qualitySettings.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({
            quality: qualitySettings.quality,
            effort: this.imageOptimization.compression.webp.effort
          })
          .toBuffer();
      }

      // JPEG fallback
      if (this.imageOptimization.formats.includes('jpeg')) {
        formats.jpeg = await sharp(imageBuffer)
          .resize(qualitySettings.width, qualitySettings.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: qualitySettings.quality,
            progressive: this.imageOptimization.compression.jpeg.progressive,
            mozjpeg: this.imageOptimization.compression.jpeg.mozjpeg
          })
          .toBuffer();
      }

      return {
        ...image,
        formats: Object.keys(formats).reduce((acc, format) => {
          acc[format] = {
            data: formats[format].toString('base64'),
            size_bytes: formats[format].length,
            format,
            quality: qualitySettings.quality,
            dimensions: {
              width: qualitySettings.width,
              height: qualitySettings.height
            }
          };
          return acc;
        }, {}),
        optimized_for_mobile: true,
        optimization_settings: qualitySettings
      };
    } catch (error) {
      logger.error('Single image processing failed:', error);
      throw error;
    }
  }

  /**
   * Determine optimization strategy based on client info
   */
  determineOptimizationStrategy(clientInfo) {
    try {
      // Default strategy
      let strategy = { ...this.connectionOptimizations['4g'] };

      // Determine by connection type
      if (clientInfo.connection) {
        const connectionType = clientInfo.connection.toLowerCase();
        if (this.connectionOptimizations[connectionType]) {
          strategy = { ...this.connectionOptimizations[connectionType] };
        }
      }

      // Override by device capabilities
      if (clientInfo.device) {
        if (clientInfo.device.memory && clientInfo.device.memory < 2) {
          // Low memory device
          strategy.response_format = 'minimal';
          strategy.image_quality = 'thumbnail';
        }
        
        if (clientInfo.device.cpu && clientInfo.device.cpu === 'slow') {
          strategy.enable_progressive = true;
          strategy.timeout_multiplier *= 1.5;
        }
      }

      // Override by user preferences
      if (clientInfo.preferences) {
        if (clientInfo.preferences.data_saver === true) {
          strategy.response_format = 'minimal';
          strategy.image_quality = 'thumbnail';
        }
        
        if (clientInfo.preferences.high_quality_images === true && strategy.response_format !== 'minimal') {
          strategy.image_quality = 'high';
        }
      }

      return strategy;
    } catch (error) {
      logger.error('Strategy determination failed:', error);
      // Return safe default
      return { ...this.connectionOptimizations['3g'] };
    }
  }

  /**
   * Apply response formatting based on strategy
   */
  async applyResponseFormatting(data, strategy) {
    try {
      const format = this.responseFormats[strategy.response_format];
      if (!format) {
        return data; // Return original if format not found
      }

      const formattedData = {};
      
      // Include sections based on format configuration
      if (format.includes.includes('essential')) {
        formattedData.user = data.user ? {
          id: data.user.id,
          name: data.user.name,
          age: data.user.age,
          location: data.user.location
        } : undefined;
        
        formattedData.bio = data.bio ? {
          primary: data.bio.primary,
          success_score: data.bio.success_score
        } : undefined;
      }

      if (format.includes.includes('summary')) {
        formattedData.photo_summary = data.photo_analysis ? {
          overall_score: data.photo_analysis.overall_attractiveness_score,
          photo_count: data.photo_analysis.photos?.length || 0,
          top_recommendation: data.photo_analysis.recommendations?.[0]
        } : undefined;
      }

      if (format.includes.includes('details')) {
        formattedData.detailed_analysis = data.photo_analysis;
        formattedData.bio_variations = data.bio_variations;
      }

      if (format.includes.includes('analytics')) {
        formattedData.analytics = data.analytics;
        formattedData.success_predictions = data.success_predictions;
      }

      if (format.includes.includes('metadata')) {
        formattedData.metadata = data.metadata;
        formattedData.processing_info = data.processing_info;
      }

      // Remove null/undefined values to reduce payload
      return this.removeEmptyValues(formattedData);
    } catch (error) {
      logger.error('Response formatting failed:', error);
      return data;
    }
  }

  /**
   * Load specific phase data for progressive loading
   */
  async loadPhaseData(dataRequest, phase, strategy) {
    try {
      const phaseData = {};

      for (const include of phase.includes) {
        switch (include) {
          case 'user_profile':
            phaseData.user_profile = await this.loadUserProfile(dataRequest.userId);
            break;
          case 'primary_photo':
            phaseData.primary_photo = await this.loadPrimaryPhoto(dataRequest.userId, strategy);
            break;
          case 'bio_preview':
            phaseData.bio_preview = await this.loadBioPreview(dataRequest.userId);
            break;
          case 'photo_analysis':
            phaseData.photo_analysis = await this.loadPhotoAnalysis(dataRequest.userId);
            break;
          case 'bio_variations':
            phaseData.bio_variations = await this.loadBioVariations(dataRequest.userId);
            break;
          case 'success_score':
            phaseData.success_score = await this.loadSuccessScore(dataRequest.userId);
            break;
          case 'detailed_analytics':
            phaseData.detailed_analytics = await this.loadDetailedAnalytics(dataRequest.userId);
            break;
          case 'recommendations':
            phaseData.recommendations = await this.loadRecommendations(dataRequest.userId);
            break;
          case 'ab_test_data':
            phaseData.ab_test_data = await this.loadABTestData(dataRequest.userId);
            break;
          default:
            logger.warn('Unknown progressive loading include:', include);
        }
      }

      return phaseData;
    } catch (error) {
      logger.error('Phase data loading failed:', error);
      throw error;
    }
  }

  /**
   * Compress response data
   */
  async compressResponseData(data, strategy) {
    try {
      // Remove unnecessary whitespace from strings
      const compressedData = this.compressStrings(data);
      
      // Round numbers to reduce precision where appropriate
      const roundedData = this.roundNumbers(compressedData);
      
      // Truncate arrays if they exceed limits
      const truncatedData = this.truncateArrays(roundedData, strategy);
      
      return truncatedData;
    } catch (error) {
      logger.error('Response compression failed:', error);
      return data;
    }
  }

  /**
   * Helper methods
   */
  compressStrings(obj) {
    if (typeof obj === 'string') {
      return obj.trim().replace(/\s+/g, ' ');
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.compressStrings(item));
    }
    if (obj && typeof obj === 'object') {
      const compressed = {};
      for (const [key, value] of Object.entries(obj)) {
        compressed[key] = this.compressStrings(value);
      }
      return compressed;
    }
    return obj;
  }

  roundNumbers(obj, precision = 2) {
    if (typeof obj === 'number') {
      return Math.round(obj * Math.pow(10, precision)) / Math.pow(10, precision);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.roundNumbers(item, precision));
    }
    if (obj && typeof obj === 'object') {
      const rounded = {};
      for (const [key, value] of Object.entries(obj)) {
        rounded[key] = this.roundNumbers(value, precision);
      }
      return rounded;
    }
    return obj;
  }

  truncateArrays(obj, strategy) {
    const maxArrayLength = strategy.response_format === 'minimal' ? 3 : 
                          strategy.response_format === 'standard' ? 10 : 50;
    
    if (Array.isArray(obj)) {
      return obj.slice(0, maxArrayLength);
    }
    if (obj && typeof obj === 'object') {
      const truncated = {};
      for (const [key, value] of Object.entries(obj)) {
        truncated[key] = this.truncateArrays(value, strategy);
      }
      return truncated;
    }
    return obj;
  }

  removeEmptyValues(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeEmptyValues(item)).filter(item => item != null);
    }
    if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.removeEmptyValues(value);
        if (cleanedValue != null && cleanedValue !== '' && 
            (!Array.isArray(cleanedValue) || cleanedValue.length > 0) &&
            (!Object.isObject(cleanedValue) || Object.keys(cleanedValue).length > 0)) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }
    return obj;
  }

  calculateDataSize(data) {
    return Math.round(JSON.stringify(data).length / 1024 * 100) / 100; // KB with 2 decimal precision
  }

  calculateCompressionRatio(originalData, compressedData) {
    const originalSize = this.calculateDataSize(originalData);
    const compressedSize = this.calculateDataSize(compressedData);
    return originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) / 100 : 0;
  }

  generateImageHash(image) {
    const hashInput = JSON.stringify({
      url: image.url,
      width: image.width,
      height: image.height,
      size: image.size_bytes
    });
    
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Placeholder methods for progressive loading data sources
  async loadUserProfile(userId) {
    // Implementation would fetch user profile data
    return { id: userId, loaded: 'user_profile' };
  }

  async loadPrimaryPhoto(userId, strategy) {
    // Implementation would fetch and optimize primary photo
    return { user_id: userId, photo_type: 'primary', strategy: strategy.image_quality };
  }

  async loadBioPreview(userId) {
    // Implementation would fetch bio preview
    return { user_id: userId, loaded: 'bio_preview' };
  }

  async loadPhotoAnalysis(userId) {
    // Implementation would fetch photo analysis
    return { user_id: userId, loaded: 'photo_analysis' };
  }

  async loadBioVariations(userId) {
    // Implementation would fetch bio variations
    return { user_id: userId, loaded: 'bio_variations' };
  }

  async loadSuccessScore(userId) {
    // Implementation would fetch success score
    return { user_id: userId, loaded: 'success_score' };
  }

  async loadDetailedAnalytics(userId) {
    // Implementation would fetch detailed analytics
    return { user_id: userId, loaded: 'detailed_analytics' };
  }

  async loadRecommendations(userId) {
    // Implementation would fetch recommendations
    return { user_id: userId, loaded: 'recommendations' };
  }

  async loadABTestData(userId) {
    // Implementation would fetch A/B test data
    return { user_id: userId, loaded: 'ab_test_data' };
  }

  /**
   * Get service configuration and stats
   */
  getServiceInfo() {
    return {
      service: 'Dating Profile Mobile Optimization',
      initialized: this.initialized,
      response_formats: Object.keys(this.responseFormats),
      progressive_phases: this.progressiveLoadingConfig.phases.length,
      supported_image_formats: this.imageOptimization.formats,
      connection_optimizations: Object.keys(this.connectionOptimizations)
    };
  }
}

module.exports = new MobileOptimizationService();