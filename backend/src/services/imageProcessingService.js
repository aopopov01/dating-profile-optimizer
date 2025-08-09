const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const logger = require('../config/logger');
const aiConfigService = require('./aiConfigService');

class ImageProcessingService {
  constructor() {
    this.initialized = false;
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    // Image processing configurations
    this.processingConfigs = {
      profile_photo: {
        sizes: [
          { name: 'thumbnail', width: 150, height: 150, quality: 80 },
          { name: 'small', width: 300, height: 300, quality: 85 },
          { name: 'medium', width: 600, height: 600, quality: 90 },
          { name: 'large', width: 1200, height: 1200, quality: 95 }
        ],
        format: 'webp',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      },
      headshot_input: {
        sizes: [
          { name: 'processed', width: 1024, height: 1024, quality: 95 }
        ],
        format: 'jpeg',
        enhance: true
      }
    };

    // Quality assessment thresholds
    this.qualityThresholds = {
      minimum_resolution: { width: 300, height: 300 },
      recommended_resolution: { width: 800, height: 800 },
      max_file_size: 10 * 1024 * 1024, // 10MB
      min_face_size_ratio: 0.15, // Face should be at least 15% of image
      max_faces: 5,
      blur_threshold: 100, // Laplacian variance threshold
      brightness_range: [30, 220],
      acceptable_formats: ['jpeg', 'jpg', 'png', 'webp']
    };

    // Enhancement filters
    this.enhancementFilters = {
      brightness: { min: 0.8, max: 1.2 },
      contrast: { min: 0.9, max: 1.3 },
      saturation: { min: 0.9, max: 1.1 },
      sharpness: { radius: 1, amount: 0.5, threshold: 0 }
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Image Processing Service...');

      // Test Cloudinary connection
      try {
        await cloudinary.api.ping();
        logger.info('Cloudinary connection established');
      } catch (error) {
        logger.warn('Cloudinary not available, using local processing only');
      }

      this.initialized = true;
      logger.info('Image Processing Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Image Processing Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process and validate uploaded image
   */
  async processUploadedImage(imageBuffer, options = {}) {
    try {
      const startTime = Date.now();
      
      const {
        type = 'profile_photo',
        userId = null,
        filename = 'image',
        enhance = false,
        generateVariants = true
      } = options;

      // Validate input image
      const validation = await this.validateImage(imageBuffer);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
      }

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Pre-processing: orientation correction and basic cleanup
      let processedBuffer = await this.preprocessImage(imageBuffer);
      
      // Optional enhancement
      if (enhance) {
        processedBuffer = await this.enhanceImage(processedBuffer);
      }

      // Generate variants based on type
      const variants = generateVariants 
        ? await this.generateImageVariants(processedBuffer, type)
        : null;

      // Upload to cloud storage
      const uploadResults = await this.uploadToCloudStorage(processedBuffer, variants, {
        filename,
        userId,
        type
      });

      const processingTime = Date.now() - startTime;

      const result = {
        success: true,
        original: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length
        },
        processed: {
          main_url: uploadResults.main_url,
          variants: uploadResults.variants,
          cloud_public_id: uploadResults.public_id
        },
        processing_time_ms: processingTime,
        enhancements_applied: enhance,
        validation: validation
      };

      logger.info('Image processing completed:', {
        userId,
        processingTime: `${processingTime}ms`,
        originalSize: `${Math.round(imageBuffer.length / 1024)}KB`,
        variants: Object.keys(uploadResults.variants || {}).length
      });

      return result;
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw error;
    }
  }

  /**
   * Validate image quality and format
   */
  async validateImage(imageBuffer) {
    try {
      const errors = [];
      const warnings = [];
      
      // Basic format validation
      let metadata;
      try {
        metadata = await sharp(imageBuffer).metadata();
      } catch (error) {
        return {
          valid: false,
          errors: ['Invalid image format or corrupted file']
        };
      }

      // File size validation
      if (imageBuffer.length > this.qualityThresholds.max_file_size) {
        errors.push(`File too large: ${Math.round(imageBuffer.length / 1024 / 1024)}MB (max ${this.qualityThresholds.max_file_size / 1024 / 1024}MB)`);
      }

      // Format validation
      if (!this.qualityThresholds.acceptable_formats.includes(metadata.format.toLowerCase())) {
        errors.push(`Unsupported format: ${metadata.format}. Supported: ${this.qualityThresholds.acceptable_formats.join(', ')}`);
      }

      // Resolution validation
      if (metadata.width < this.qualityThresholds.minimum_resolution.width ||
          metadata.height < this.qualityThresholds.minimum_resolution.height) {
        errors.push(`Resolution too low: ${metadata.width}x${metadata.height} (minimum ${this.qualityThresholds.minimum_resolution.width}x${this.qualityThresholds.minimum_resolution.height})`);
      }

      if (metadata.width < this.qualityThresholds.recommended_resolution.width ||
          metadata.height < this.qualityThresholds.recommended_resolution.height) {
        warnings.push(`Below recommended resolution: ${metadata.width}x${metadata.height} (recommended ${this.qualityThresholds.recommended_resolution.width}x${this.qualityThresholds.recommended_resolution.height})`);
      }

      // Quality assessment
      const qualityAssessment = await this.assessImageQuality(imageBuffer);
      
      if (qualityAssessment.blur_score < this.qualityThresholds.blur_threshold) {
        warnings.push('Image appears blurry - consider using a sharper photo');
      }

      if (qualityAssessment.brightness_score < 30) {
        warnings.push('Image is too dark - consider better lighting');
      } else if (qualityAssessment.brightness_score > 90) {
        warnings.push('Image is overexposed - consider reducing brightness');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        quality_score: qualityAssessment.overall_score,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length,
          has_alpha: metadata.channels === 4
        }
      };
    } catch (error) {
      logger.error('Image validation failed:', error);
      return {
        valid: false,
        errors: ['Validation process failed'],
        error: error.message
      };
    }
  }

  /**
   * Assess image quality metrics
   */
  async assessImageQuality(imageBuffer) {
    try {
      const image = sharp(imageBuffer);
      const stats = await image.stats();
      
      // Blur detection using Laplacian variance
      const grayImage = await image.greyscale().raw().toBuffer();
      const blurScore = await this.calculateLaplacianVariance(grayImage, await image.metadata());
      
      // Brightness analysis
      const brightness = stats.channels[0].mean;
      let brightnessScore = 50;
      
      if (brightness >= this.qualityThresholds.brightness_range[0] && 
          brightness <= this.qualityThresholds.brightness_range[1]) {
        brightnessScore = 80;
      } else {
        const deviation = Math.min(
          Math.abs(brightness - this.qualityThresholds.brightness_range[0]),
          Math.abs(brightness - this.qualityThresholds.brightness_range[1])
        );
        brightnessScore = Math.max(0, 80 - deviation);
      }

      // Contrast analysis
      const contrast = stats.channels[0].std;
      const contrastScore = Math.min(100, contrast * 2); // Higher std = better contrast

      // Color balance (for color images)
      let colorBalanceScore = 70;
      if (stats.channels.length >= 3) {
        const [r, g, b] = stats.channels;
        const rgDiff = Math.abs(r.mean - g.mean);
        const rbDiff = Math.abs(r.mean - b.mean);
        const gbDiff = Math.abs(g.mean - b.mean);
        const avgDiff = (rgDiff + rbDiff + gbDiff) / 3;
        colorBalanceScore = Math.max(0, 100 - avgDiff);
      }

      // Overall quality score (weighted average)
      const overallScore = Math.round(
        blurScore * 0.3 +
        brightnessScore * 0.25 +
        contrastScore * 0.25 +
        colorBalanceScore * 0.2
      );

      return {
        overall_score: overallScore,
        blur_score: blurScore,
        brightness_score: brightnessScore,
        contrast_score: contrastScore,
        color_balance_score: colorBalanceScore,
        brightness_value: brightness,
        contrast_value: contrast
      };
    } catch (error) {
      logger.error('Quality assessment failed:', error);
      return {
        overall_score: 50,
        error: error.message
      };
    }
  }

  /**
   * Calculate Laplacian variance for blur detection
   */
  async calculateLaplacianVariance(grayBuffer, metadata) {
    try {
      // Apply Laplacian kernel for edge detection
      const laplacian = await sharp(grayBuffer, {
        raw: {
          width: metadata.width,
          height: metadata.height,
          channels: 1
        }
      })
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
      })
      .raw()
      .toBuffer();

      // Calculate variance
      const mean = laplacian.reduce((sum, val) => sum + val, 0) / laplacian.length;
      const variance = laplacian.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / laplacian.length;
      
      // Normalize to 0-100 scale
      return Math.min(100, Math.max(0, variance / 10));
    } catch (error) {
      logger.error('Blur detection failed:', error);
      return 50;
    }
  }

  /**
   * Pre-process image: orientation, basic cleanup
   */
  async preprocessImage(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();
    } catch (error) {
      logger.error('Pre-processing failed:', error);
      return imageBuffer;
    }
  }

  /**
   * Enhance image quality
   */
  async enhanceImage(imageBuffer) {
    try {
      // Get image statistics for adaptive enhancement
      const stats = await sharp(imageBuffer).stats();
      const brightness = stats.channels[0].mean;
      const contrast = stats.channels[0].std;

      // Calculate enhancement parameters
      const brightnessAdjustment = this.calculateBrightnessAdjustment(brightness);
      const contrastAdjustment = this.calculateContrastAdjustment(contrast);
      const saturationAdjustment = this.calculateSaturationAdjustment(stats);

      // Apply enhancements
      const enhanced = await sharp(imageBuffer)
        .modulate({
          brightness: brightnessAdjustment,
          saturation: saturationAdjustment
        })
        .linear(contrastAdjustment, 0) // Linear adjustment for contrast
        .sharpen(this.enhancementFilters.sharpness)
        .toBuffer();

      logger.debug('Image enhancement applied:', {
        brightness: brightnessAdjustment,
        contrast: contrastAdjustment,
        saturation: saturationAdjustment
      });

      return enhanced;
    } catch (error) {
      logger.error('Image enhancement failed:', error);
      return imageBuffer;
    }
  }

  /**
   * Calculate brightness adjustment based on current brightness
   */
  calculateBrightnessAdjustment(currentBrightness) {
    const target = 128; // Target brightness
    const adjustment = target / currentBrightness;
    
    // Clamp to safe range
    return Math.max(
      this.enhancementFilters.brightness.min,
      Math.min(this.enhancementFilters.brightness.max, adjustment)
    );
  }

  /**
   * Calculate contrast adjustment
   */
  calculateContrastAdjustment(currentContrast) {
    // If contrast is low, increase it
    if (currentContrast < 30) {
      return Math.min(this.enhancementFilters.contrast.max, 1.2);
    }
    // If contrast is too high, reduce it slightly
    if (currentContrast > 80) {
      return Math.max(this.enhancementFilters.contrast.min, 0.9);
    }
    return 1.0;
  }

  /**
   * Calculate saturation adjustment for color images
   */
  calculateSaturationAdjustment(stats) {
    if (stats.channels.length < 3) return 1.0;
    
    // Calculate color variance
    const [r, g, b] = stats.channels;
    const colorVariance = (r.std + g.std + b.std) / 3;
    
    // If colors are muted, slightly increase saturation
    if (colorVariance < 20) {
      return Math.min(this.enhancementFilters.saturation.max, 1.1);
    }
    
    return 1.0;
  }

  /**
   * Generate image variants for different use cases
   */
  async generateImageVariants(imageBuffer, type) {
    try {
      const config = this.processingConfigs[type];
      if (!config) {
        logger.warn(`No processing config found for type: ${type}`);
        return null;
      }

      const variants = {};
      
      for (const size of config.sizes) {
        try {
          const variant = await sharp(imageBuffer)
            .resize(size.width, size.height, {
              fit: 'cover',
              position: 'center',
              background: config.background || { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toFormat(config.format || 'webp', {
              quality: size.quality,
              progressive: true
            })
            .toBuffer();

          variants[size.name] = {
            buffer: variant,
            width: size.width,
            height: size.height,
            format: config.format || 'webp',
            size: variant.length
          };
        } catch (error) {
          logger.error(`Failed to generate ${size.name} variant:`, error);
        }
      }

      logger.debug(`Generated ${Object.keys(variants).length} variants for ${type}`);
      return variants;
    } catch (error) {
      logger.error('Variant generation failed:', error);
      return null;
    }
  }

  /**
   * Upload images to cloud storage
   */
  async uploadToCloudStorage(mainBuffer, variants, options = {}) {
    try {
      const { filename, userId, type } = options;
      const timestamp = Date.now();
      const publicId = `${type}/${userId || 'anonymous'}/${timestamp}`;

      // Upload main image
      const mainUpload = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: 'image',
            quality: 'auto:good',
            fetch_format: 'auto',
            flags: 'progressive'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(mainBuffer);
      });

      const result = {
        main_url: mainUpload.secure_url,
        public_id: mainUpload.public_id,
        variants: {}
      };

      // Upload variants
      if (variants) {
        for (const [variantName, variantData] of Object.entries(variants)) {
          try {
            const variantUpload = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  public_id: `${publicId}_${variantName}`,
                  resource_type: 'image',
                  quality: 'auto:good',
                  fetch_format: 'auto'
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              uploadStream.end(variantData.buffer);
            });

            result.variants[variantName] = {
              url: variantUpload.secure_url,
              public_id: variantUpload.public_id,
              width: variantData.width,
              height: variantData.height,
              format: variantData.format
            };
          } catch (error) {
            logger.error(`Failed to upload ${variantName} variant:`, error);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('Cloud upload failed:', error);
      throw error;
    }
  }

  /**
   * Crop image to focus on detected face
   */
  async cropToFace(imageBuffer, faceDetection) {
    try {
      if (!faceDetection || !faceDetection.box) {
        throw new Error('No face detection data provided');
      }

      const { box } = faceDetection;
      const padding = 0.3; // Add 30% padding around face
      
      // Calculate crop dimensions with padding
      const paddingX = box.width * padding;
      const paddingY = box.height * padding;
      
      const cropX = Math.max(0, box.x - paddingX);
      const cropY = Math.max(0, box.y - paddingY);
      const cropWidth = box.width + (paddingX * 2);
      const cropHeight = box.height + (paddingY * 2);

      // Get original dimensions
      const metadata = await sharp(imageBuffer).metadata();
      
      // Ensure crop doesn't exceed image boundaries
      const finalCropWidth = Math.min(cropWidth, metadata.width - cropX);
      const finalCropHeight = Math.min(cropHeight, metadata.height - cropY);

      const croppedImage = await sharp(imageBuffer)
        .extract({
          left: Math.round(cropX),
          top: Math.round(cropY),
          width: Math.round(finalCropWidth),
          height: Math.round(finalCropHeight)
        })
        .resize(600, 600, { fit: 'cover' })
        .toBuffer();

      return {
        success: true,
        cropped_image: croppedImage,
        crop_info: {
          original_face: box,
          crop_coordinates: {
            x: Math.round(cropX),
            y: Math.round(cropY),
            width: Math.round(finalCropWidth),
            height: Math.round(finalCropHeight)
          }
        }
      };
    } catch (error) {
      logger.error('Face cropping failed:', error);
      throw error;
    }
  }

  /**
   * Background removal/replacement
   */
  async removeBackground(imageBuffer, options = {}) {
    try {
      const { backgroundColor = { r: 255, g: 255, b: 255 }, threshold = 10 } = options;
      
      // This is a basic implementation - for production, consider using
      // specialized services like Remove.bg API or advanced ML models
      
      const processedImage = await sharp(imageBuffer)
        .removeAlpha() // Remove existing alpha channel
        .flop() // Example processing - replace with actual background removal
        .flatten({ background: backgroundColor })
        .toBuffer();

      return {
        success: true,
        processed_image: processedImage,
        note: 'Basic background processing applied - consider using specialized background removal service for better results'
      };
    } catch (error) {
      logger.error('Background removal failed:', error);
      throw error;
    }
  }

  /**
   * Convert image to base64 for API consumption
   */
  async convertToBase64(imageBuffer, options = {}) {
    try {
      const { 
        maxWidth = 1024, 
        maxHeight = 1024, 
        quality = 85,
        format = 'jpeg'
      } = options;

      // Resize if needed
      const processedImage = await sharp(imageBuffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .toFormat(format, { quality })
        .toBuffer();

      const base64String = `data:image/${format};base64,${processedImage.toString('base64')}`;
      
      return {
        success: true,
        base64: base64String,
        size: processedImage.length,
        estimated_api_cost: this.estimateAPITransferCost(processedImage.length)
      };
    } catch (error) {
      logger.error('Base64 conversion failed:', error);
      throw error;
    }
  }

  /**
   * Estimate API transfer cost based on image size
   */
  estimateAPITransferCost(imageSize) {
    // Rough estimation based on typical API costs
    const costPerMB = 0.001; // $0.001 per MB
    const sizeInMB = imageSize / (1024 * 1024);
    return (sizeInMB * costPerMB).toFixed(6);
  }

  /**
   * Batch process multiple images
   */
  async processBatch(images, options = {}) {
    try {
      const results = [];
      const batchStartTime = Date.now();
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        try {
          const result = await this.processUploadedImage(image.buffer, {
            ...options,
            filename: image.filename || `batch_image_${i}`,
            userId: options.userId
          });
          
          results.push({
            index: i,
            filename: image.filename,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            index: i,
            filename: image.filename,
            success: false,
            error: error.message
          });
        }
      }
      
      const batchProcessingTime = Date.now() - batchStartTime;
      
      return {
        success: true,
        batch_size: images.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        total_processing_time_ms: batchProcessingTime
      };
    } catch (error) {
      logger.error('Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Get image processing statistics
   */
  async getProcessingStats(timeframe = 'today') {
    try {
      // This would typically query a database for processing statistics
      // For now, return placeholder stats
      return {
        timeframe,
        images_processed: 0,
        average_processing_time_ms: 0,
        quality_improvements: {
          brightness_corrections: 0,
          contrast_enhancements: 0,
          blur_reductions: 0
        },
        storage_usage: {
          total_images: 0,
          storage_size_mb: 0,
          bandwidth_used_mb: 0
        }
      };
    } catch (error) {
      logger.error('Failed to get processing stats:', error);
      return { error: error.message };
    }
  }
}

module.exports = new ImageProcessingService();