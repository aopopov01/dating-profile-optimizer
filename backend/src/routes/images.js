const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');
const { 
  uploadImage, 
  uploadFromBase64, 
  deleteImage, 
  generateImageUrls,
  isConfigured 
} = require('../config/cloudinary');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * Upload single image
 * POST /api/images/upload
 */
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    const userId = req.user.id;
    const { folder = 'user-photos', quality = 'auto' } = req.body;

    // Process image with Sharp for optimization
    const processedBuffer = await sharp(req.file.buffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();

    // Create temporary file for Cloudinary upload
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilename = `temp_${userId}_${Date.now()}.jpg`;
    const tempPath = path.join(tempDir, tempFilename);
    
    await fs.writeFile(tempPath, processedBuffer);

    try {
      // Upload to Cloudinary
      const uploadOptions = {
        folder: `dating-profile-optimizer/${folder}`,
        public_id: `user_${userId}_${Date.now()}`,
        quality,
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      };

      const cloudinaryResult = await uploadImage(tempPath, uploadOptions);

      // Clean up temp file
      await fs.unlink(tempPath).catch(err => {
        logger.warn('Failed to delete temp file', { tempPath, error: err.message });
      });

      // Generate different sized URLs
      const imageUrls = generateImageUrls(cloudinaryResult.public_id);

      const imageData = {
        id: cloudinaryResult.public_id,
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        url: cloudinaryResult.url,
        urls: imageUrls,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
        uploaded_at: cloudinaryResult.created_at,
        user_id: userId,
      };

      logger.info('Image uploaded successfully', {
        userId,
        publicId: cloudinaryResult.public_id,
        bytes: cloudinaryResult.bytes,
        cloudinaryConfigured: isConfigured()
      });

      res.json({
        success: true,
        image: imageData,
        message: 'Image uploaded successfully'
      });

    } catch (uploadError) {
      // Clean up temp file on error
      await fs.unlink(tempPath).catch(() => {});
      throw uploadError;
    }

  } catch (error) {
    logger.error('Image upload failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      filename: req.file?.originalname
    });

    res.status(500).json({
      success: false,
      error: 'Image upload failed',
      code: 'UPLOAD_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Upload image from base64
 * POST /api/images/upload-base64
 */
router.post('/upload-base64', authenticateToken, async (req, res) => {
  try {
    const { base64Data, filename, folder = 'user-photos', quality = 'auto' } = req.body;

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'No base64 data provided',
        code: 'NO_DATA'
      });
    }

    const userId = req.user.id;

    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    // Upload to Cloudinary
    const uploadOptions = {
      folder: `dating-profile-optimizer/${folder}`,
      public_id: `user_${userId}_${Date.now()}`,
      quality,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    };

    const cloudinaryResult = await uploadFromBase64(cleanBase64, uploadOptions);

    // Generate different sized URLs
    const imageUrls = generateImageUrls(cloudinaryResult.public_id);

    const imageData = {
      id: cloudinaryResult.public_id,
      public_id: cloudinaryResult.public_id,
      secure_url: cloudinaryResult.secure_url,
      url: cloudinaryResult.url,
      urls: imageUrls,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      uploaded_at: cloudinaryResult.created_at,
      user_id: userId,
    };

    logger.info('Base64 image uploaded successfully', {
      userId,
      publicId: cloudinaryResult.public_id,
      bytes: cloudinaryResult.bytes,
      cloudinaryConfigured: isConfigured()
    });

    res.json({
      success: true,
      image: imageData,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    logger.error('Base64 image upload failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Image upload failed',
      code: 'UPLOAD_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Delete image
 * DELETE /api/images/:publicId
 */
router.delete('/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const userId = req.user.id;

    // In production, you might want to verify the user owns this image
    // For now, we'll allow deletion for demo purposes

    const result = await deleteImage(publicId);

    logger.info('Image deleted successfully', {
      userId,
      publicId,
      result: result.result
    });

    res.json({
      success: true,
      message: 'Image deleted successfully',
      result: result.result
    });

  } catch (error) {
    logger.error('Image deletion failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      publicId: req.params.publicId
    });

    res.status(500).json({
      success: false,
      error: 'Image deletion failed',
      code: 'DELETE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get image URLs for different sizes
 * GET /api/images/:publicId/urls
 */
router.get('/:publicId/urls', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { transformations } = req.query;

    let transforms = {};
    if (transformations) {
      try {
        transforms = JSON.parse(transformations);
      } catch (e) {
        logger.warn('Invalid transformations parameter', { transformations });
      }
    }

    const urls = generateImageUrls(publicId, transforms);

    res.json({
      success: true,
      public_id: publicId,
      urls
    });

  } catch (error) {
    logger.error('Failed to generate image URLs', {
      error: error.message,
      publicId: req.params.publicId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate image URLs',
      code: 'URL_GENERATION_ERROR'
    });
  }
});

/**
 * Health check for Cloudinary configuration
 * GET /api/images/health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const configured = isConfigured();
    
    res.json({
      success: true,
      cloudinary: {
        configured,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 
          (process.env.CLOUDINARY_CLOUD_NAME !== 'demo-cloud-name' ? '✓ Configured' : '⚠ Demo Mode') : 
          '❌ Not set',
        api_key: process.env.CLOUDINARY_API_KEY ? 
          (process.env.CLOUDINARY_API_KEY !== 'demo-api-key' ? '✓ Configured' : '⚠ Demo Mode') : 
          '❌ Not set',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 
          (process.env.CLOUDINARY_API_SECRET !== 'demo-api-secret' ? '✓ Configured' : '⚠ Demo Mode') : 
          '❌ Not set',
      },
      note: configured ? 'Cloudinary is fully configured' : 'Using demo mode - set environment variables for production use'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR'
    });
  }
});

module.exports = router;