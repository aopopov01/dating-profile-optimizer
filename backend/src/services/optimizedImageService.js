const sharp = require('sharp');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');
const cacheService = require('./advancedCacheService');

/**
 * Optimized Image Processing Service for Dating Profile Photos
 * Specialized for dating app requirements with focus on attractiveness optimization
 */
class OptimizedImageService {
  constructor() {
    this.processingQueue = new Map();
    this.maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_IMAGE_JOBS) || 3;
    this.currentJobs = 0;
    this.tempDir = process.env.TEMP_DIR || '/tmp/dating-optimizer';
    
    // Dating app specific image configurations
    this.datingImageConfigs = {
      profile: {
        primary: { width: 800, height: 800, quality: 85, format: 'jpeg' },
        thumbnail: { width: 200, height: 200, quality: 80, format: 'jpeg' },
        preview: { width: 400, height: 400, quality: 75, format: 'webp' }
      },
      gallery: {
        large: { width: 1200, height: 1200, quality: 90, format: 'jpeg' },
        medium: { width: 600, height: 600, quality: 80, format: 'jpeg' },
        small: { width: 300, height: 300, quality: 75, format: 'webp' }
      },
      story: {
        standard: { width: 1080, height: 1920, quality: 85, format: 'jpeg' },
        preview: { width: 405, height: 720, quality: 75, format: 'webp' }
      }
    };

    // Dating photo optimization filters
    this.enhancementFilters = {
      portraitEnhancement: {
        sharpen: { sigma: 1.0, flat: 1, jagged: 2 },
        colorBoost: { saturation: 1.1, brightness: 1.05, contrast: 1.02 }
      },
      skinSmoothing: {
        blur: { sigma: 0.8 },
        mask: { threshold: 0.7 }
      },
      eyeEnhancement: {
        sharpen: { sigma: 1.5, flat: 1, jagged: 3 },
        contrast: 1.15
      }
    };

    this.initializeCloudinary();
    this.initializeTempDirectory();
  }

  /**
   * Initialize Cloudinary with dating app specific settings
   */
  initializeCloudinary() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      // Dating app specific folder structure
      folder: 'dating-profiles',
      use_filename: false,
      unique_filename: true,
      overwrite: false
    });

    logger.info('Cloudinary initialized for dating profile images');
  }

  /**
   * Initialize temporary directory
   */
  async initializeTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Temp directory initialized: ${this.tempDir}`);
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Generate unique filename with dating context
   */
  generateFilename(userId, imageType, format, variant = 'original') {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${userId}-${timestamp}`).digest('hex').substring(0, 8);
    return `user_${userId}_${imageType}_${variant}_${hash}.${format}`;
  }

  /**
   * Analyze image for dating app suitability
   */
  async analyzeImageSuitability(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      const analysis = {
        resolution: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        },
        quality: {
          format: metadata.format,
          density: metadata.density || 72,
          hasProfile: !!metadata.icc
        },
        suitability: {
          isSquare: Math.abs(metadata.width - metadata.height) < 100,
          isPortrait: metadata.height > metadata.width,
          isLandscape: metadata.width > metadata.height,
          isHighRes: metadata.width >= 800 && metadata.height >= 800,
          isLowRes: metadata.width < 400 || metadata.height < 400
        }
      };

      // Dating app specific scoring
      analysis.datingScore = this.calculateDatingScore(analysis);
      
      return analysis;
    } catch (error) {
      logger.error('Image analysis error:', error);
      throw new Error('Failed to analyze image suitability');
    }
  }

  /**
   * Calculate dating app suitability score
   */
  calculateDatingScore(analysis) {
    let score = 0;
    const { resolution, suitability } = analysis;

    // Resolution scoring (0-30 points)
    if (suitability.isHighRes) score += 30;
    else if (resolution.width >= 600 && resolution.height >= 600) score += 20;
    else if (resolution.width >= 400 && resolution.height >= 400) score += 10;

    // Aspect ratio scoring (0-25 points)
    if (suitability.isSquare) score += 25; // Best for profile photos
    else if (suitability.isPortrait && resolution.aspectRatio > 0.7) score += 20;
    else if (suitability.isLandscape && resolution.aspectRatio < 1.5) score += 15;

    // Format scoring (0-15 points)
    if (analysis.quality.format === 'jpeg') score += 15;
    else if (analysis.quality.format === 'png') score += 10;
    else if (analysis.quality.format === 'webp') score += 12;

    // Quality scoring (0-30 points)
    if (analysis.quality.density >= 150) score += 30;
    else if (analysis.quality.density >= 72) score += 20;
    else score += 10;

    return Math.min(100, score);
  }

  /**
   * Apply dating app specific enhancements
   */
  async applyDatingEnhancements(sharpInstance, enhancementLevel = 'moderate') {
    const { portraitEnhancement, skinSmoothing, eyeEnhancement } = this.enhancementFilters;
    
    let enhanced = sharpInstance;

    switch (enhancementLevel) {
      case 'subtle':
        enhanced = enhanced
          .sharpen(0.5, 1, 1)
          .modulate({ 
            brightness: 1.02, 
            saturation: 1.05 
          });
        break;

      case 'moderate':
        enhanced = enhanced
          .sharpen(portraitEnhancement.sharpen.sigma, 1, 2)
          .modulate({
            brightness: portraitEnhancement.colorBoost.brightness,
            saturation: portraitEnhancement.colorBoost.saturation
          })
          .linear(portraitEnhancement.colorBoost.contrast, 0);
        break;

      case 'strong':
        enhanced = enhanced
          .sharpen(eyeEnhancement.sharpen.sigma, 1, 3)
          .modulate({
            brightness: 1.08,
            saturation: 1.15,
            hue: 2
          })
          .linear(eyeEnhancement.contrast, 0)
          .blur(0.3); // Subtle skin smoothing
        break;
    }

    return enhanced;
  }

  /**
   * Process dating profile image with multiple variants
   */
  async processDatingProfileImage(buffer, userId, options = {}) {
    const jobId = `${userId}-${Date.now()}`;
    
    try {
      // Wait for available slot
      await this.waitForSlot(jobId);
      this.currentJobs++;

      logger.info(`Starting dating profile image processing for user ${userId}`);

      // Analyze image suitability
      const analysis = await this.analyzeImageSuitability(buffer);
      
      // Check cache first
      const cacheKey = crypto.createHash('md5').update(buffer).digest('hex');
      const cached = await cacheService.get(cacheService.namespaces.PHOTOS, cacheKey);
      
      if (cached && options.useCache !== false) {
        logger.info(`Using cached dating profile images for user ${userId}`);
        this.currentJobs--;
        return cached;
      }

      const results = {
        analysis,
        variants: {},
        metadata: {
          userId,
          processedAt: new Date().toISOString(),
          processingTime: 0,
          enhancementLevel: options.enhancement || 'moderate'
        }
      };

      const startTime = Date.now();
      const sharpInstance = sharp(buffer);

      // Process profile variants
      const profileVariants = await this.processImageVariants(
        sharpInstance.clone(),
        this.datingImageConfigs.profile,
        options.enhancement || 'moderate'
      );

      // Upload to Cloudinary with dating-specific transformations
      const uploads = await this.uploadVariantsToCloudinary(
        profileVariants,
        userId,
        'profile'
      );

      results.variants.profile = uploads;

      // Process gallery variants if requested
      if (options.includeGallery) {
        const galleryVariants = await this.processImageVariants(
          sharpInstance.clone(),
          this.datingImageConfigs.gallery,
          options.enhancement || 'moderate'
        );

        const galleryUploads = await this.uploadVariantsToCloudinary(
          galleryVariants,
          userId,
          'gallery'
        );

        results.variants.gallery = galleryUploads;
      }

      results.metadata.processingTime = Date.now() - startTime;

      // Cache results
      await cacheService.set(
        cacheService.namespaces.PHOTOS,
        cacheKey,
        results,
        3600 // 1 hour cache
      );

      logger.info(`Dating profile image processing completed for user ${userId} in ${results.metadata.processingTime}ms`);
      
      return results;
    } catch (error) {
      logger.error(`Dating profile image processing failed for user ${userId}:`, error);
      throw error;
    } finally {
      this.currentJobs--;
      this.processingQueue.delete(jobId);
    }
  }

  /**
   * Process image variants with enhancements
   */
  async processImageVariants(sharpInstance, configs, enhancementLevel) {
    const variants = {};
    
    for (const [variantName, config] of Object.entries(configs)) {
      try {
        let processed = sharpInstance.clone()
          .resize(config.width, config.height, {
            fit: 'cover',
            position: 'center'
          });

        // Apply dating enhancements
        processed = await this.applyDatingEnhancements(processed, enhancementLevel);

        // Apply format and quality
        if (config.format === 'jpeg') {
          processed = processed.jpeg({ 
            quality: config.quality,
            progressive: true,
            mozjpeg: true
          });
        } else if (config.format === 'webp') {
          processed = processed.webp({ 
            quality: config.quality,
            effort: 4
          });
        }

        const buffer = await processed.toBuffer();
        variants[variantName] = {
          buffer,
          config,
          size: buffer.length
        };
        
      } catch (error) {
        logger.error(`Failed to process variant ${variantName}:`, error);
        throw error;
      }
    }
    
    return variants;
  }

  /**
   * Upload variants to Cloudinary with dating-specific settings
   */
  async uploadVariantsToCloudinary(variants, userId, imageType) {
    const uploads = {};
    const uploadPromises = [];

    for (const [variantName, variantData] of Object.entries(variants)) {
      const filename = this.generateFilename(userId, imageType, 'auto', variantName);
      
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `dating-profiles/${userId}`,
            public_id: filename,
            resource_type: 'image',
            // Dating app specific transformations
            transformation: [
              {
                quality: 'auto:good',
                fetch_format: 'auto',
                dpr: 'auto'
              },
              // Add face detection for smart cropping
              {
                gravity: 'face',
                crop: 'thumb'
              }
            ],
            // Responsive images for dating apps
            responsive_breakpoints: [
              {
                create_derived: true,
                bytes_step: 20000,
                min_width: 200,
                max_width: 1000,
                max_images: 5
              }
            ]
          },
          (error, result) => {
            if (error) {
              logger.error(`Cloudinary upload failed for ${variantName}:`, error);
              reject(error);
            } else {
              uploads[variantName] = {
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
                version: result.version,
                // Dating app specific URLs
                responsiveUrls: result.responsive_breakpoints?.[0]?.breakpoints?.map(bp => ({
                  width: bp.width,
                  height: bp.height,
                  url: bp.secure_url
                })) || []
              };
              resolve();
            }
          }
        );
        
        uploadStream.end(variantData.buffer);
      });
      
      uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);
    return uploads;
  }

  /**
   * Generate optimized dating profile photo URLs
   */
  generateOptimizedUrls(publicId, transformations = {}) {
    const baseTransformation = {
      quality: 'auto:good',
      fetch_format: 'auto',
      dpr: 'auto'
    };

    const datingTransformations = {
      profile: {
        ...baseTransformation,
        width: 400,
        height: 400,
        crop: 'thumb',
        gravity: 'face'
      },
      thumbnail: {
        ...baseTransformation,
        width: 150,
        height: 150,
        crop: 'thumb',
        gravity: 'face'
      },
      gallery: {
        ...baseTransformation,
        width: 800,
        height: 600,
        crop: 'fill',
        gravity: 'auto'
      }
    };

    const urls = {};
    for (const [variant, transform] of Object.entries(datingTransformations)) {
      urls[variant] = cloudinary.url(publicId, {
        ...transform,
        ...transformations[variant]
      });
    }

    return urls;
  }

  /**
   * Batch process multiple dating profile images
   */
  async batchProcessDatingImages(imageData, options = {}) {
    const batchSize = options.batchSize || 5;
    const results = [];
    
    for (let i = 0; i < imageData.length; i += batchSize) {
      const batch = imageData.slice(i, i + batchSize);
      const batchPromises = batch.map(({ buffer, userId, options: imgOptions }) =>
        this.processDatingProfileImage(buffer, userId, { ...options, ...imgOptions })
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        logger.info(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(imageData.length / batchSize)}`);
        
        // Brief pause between batches to prevent overload
        if (i + batchSize < imageData.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error(`Batch processing error for batch starting at index ${i}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Wait for available processing slot
   */
  async waitForSlot(jobId) {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.currentJobs < this.maxConcurrentJobs) {
          resolve();
        } else {
          this.processingQueue.set(jobId, checkSlot);
          setTimeout(() => {
            if (this.processingQueue.has(jobId)) {
              this.processingQueue.get(jobId)();
            }
          }, 100);
        }
      };
      
      checkSlot();
    });
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      currentJobs: this.currentJobs,
      maxConcurrentJobs: this.maxConcurrentJobs,
      queuedJobs: this.processingQueue.size,
      utilization: (this.currentJobs / this.maxConcurrentJobs) * 100
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.tempDir);
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          await fs.unlink(filePath);
          logger.debug(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }
}

module.exports = new OptimizedImageService();