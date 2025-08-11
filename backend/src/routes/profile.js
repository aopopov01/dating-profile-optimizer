const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/profiles');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 10 * 1024 * 1024, // 10MB
    files: parseInt(process.env.MAX_PHOTOS_PER_ANALYSIS) || 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_UPLOAD_TYPES || 'image/jpeg,image/png,image/webp').split(',');
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Validation middleware
const profileValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('interests')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Maximum 20 interests allowed'),
  
  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),
  
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Occupation cannot exceed 100 characters'),
  
  body('education')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Education cannot exceed 100 characters'),
  
  body('height')
    .optional()
    .isInt({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),
  
  body('drinking')
    .optional()
    .isIn(['never', 'rarely', 'socially', 'regularly'])
    .withMessage('Invalid drinking preference'),
  
  body('smoking')
    .optional()
    .isIn(['never', 'rarely', 'socially', 'regularly'])
    .withMessage('Invalid smoking preference'),
  
  body('relationshipType')
    .optional()
    .isIn(['casual', 'serious', 'both'])
    .withMessage('Invalid relationship type'),
  
  body('hasKids')
    .optional()
    .isBoolean()
    .withMessage('hasKids must be a boolean'),
  
  body('wantsKids')
    .optional()
    .isIn(['yes', 'no', 'maybe', 'someday'])
    .withMessage('Invalid wantsKids preference'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters')
];

// Get current user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile with photos
    const profile = await db('users')
      .leftJoin('user_photos', 'users.id', 'user_photos.user_id')
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.date_of_birth',
        'users.gender',
        'users.interested_in',
        'users.location',
        'users.bio',
        'users.occupation',
        'users.education',
        'users.height',
        'users.drinking',
        'users.smoking',
        'users.relationship_type',
        'users.has_kids',
        'users.wants_kids',
        'users.interests',
        'users.subscription_status',
        'users.email_verified',
        'users.profile_completion_score',
        'users.created_at',
        'users.updated_at',
        db.raw('JSON_AGG(DISTINCT jsonb_build_object(\'id\', user_photos.id, \'url\', user_photos.photo_url, \'isPrimary\', user_photos.is_primary, \'order\', user_photos.display_order)) FILTER (WHERE user_photos.id IS NOT NULL) as photos')
      )
      .where('users.id', userId)
      .groupBy('users.id')
      .first();

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Calculate age
    const birthDate = new Date(profile.date_of_birth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        ...profile,
        age,
        photos: profile.photos || []
      }
    });

  } catch (error) {
    logger.error('Get profile error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
});

// Update user profile
router.put('/me', authenticateToken, profileValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const allowedFields = [
      'bio', 'interests', 'occupation', 'education', 'height',
      'drinking', 'smoking', 'relationship_type', 'has_kids',
      'wants_kids', 'location'
    ];

    // Filter only allowed fields
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    updateData.updated_at = new Date();

    // Update profile
    await db('users')
      .where({ id: userId })
      .update(updateData);

    // Calculate profile completion score
    const profile = await db('users')
      .where({ id: userId })
      .first();

    const completionScore = calculateProfileCompletion(profile);
    
    if (completionScore !== profile.profile_completion_score) {
      await db('users')
        .where({ id: userId })
        .update({ profile_completion_score: completionScore });
    }

    logger.info('Profile updated successfully', {
      userId,
      updatedFields: Object.keys(updateData),
      completionScore
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profileCompletionScore: completionScore
      }
    });

  } catch (error) {
    logger.error('Update profile error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Upload profile photos
router.post('/photos', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos uploaded',
        code: 'NO_PHOTOS'
      });
    }

    const userId = req.user.id;
    
    // Check current photo count
    const currentPhotoCount = await db('user_photos')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    const maxPhotos = parseInt(process.env.MAX_PHOTOS_PER_ANALYSIS) || 10;
    
    if (parseInt(currentPhotoCount.count) + req.files.length > maxPhotos) {
      // Clean up uploaded files
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
      
      return res.status(400).json({
        success: false,
        error: `Maximum ${maxPhotos} photos allowed`,
        code: 'MAX_PHOTOS_EXCEEDED'
      });
    }

    const photoUrls = [];
    const insertData = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const photoUrl = `/uploads/profiles/${file.filename}`;
      
      photoUrls.push(photoUrl);
      insertData.push({
        user_id: userId,
        photo_url: photoUrl,
        display_order: parseInt(currentPhotoCount.count) + i + 1,
        is_primary: parseInt(currentPhotoCount.count) === 0 && i === 0, // First photo is primary
        created_at: new Date()
      });
    }

    // Insert photo records
    await db('user_photos').insert(insertData);

    // Update profile completion score
    const profile = await db('users').where({ id: userId }).first();
    const completionScore = calculateProfileCompletion(profile);
    
    await db('users')
      .where({ id: userId })
      .update({ profile_completion_score: completionScore });

    logger.info('Photos uploaded successfully', {
      userId,
      photoCount: req.files.length,
      photoUrls
    });

    res.json({
      success: true,
      message: 'Photos uploaded successfully',
      data: {
        photos: insertData.map((photo, index) => ({
          ...photo,
          id: null, // Will be set by database
          url: photoUrls[index]
        })),
        profileCompletionScore: completionScore
      }
    });

  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    logger.error('Photo upload error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to upload photos',
      code: 'PHOTO_UPLOAD_ERROR'
    });
  }
});

// Delete photo
router.delete('/photos/:photoId', authenticateToken, [
  param('photoId').isInt().withMessage('Invalid photo ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const photoId = parseInt(req.params.photoId);

    // Find and delete photo
    const photo = await db('user_photos')
      .where({ id: photoId, user_id: userId })
      .first();

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found',
        code: 'PHOTO_NOT_FOUND'
      });
    }

    // Delete from database
    await db('user_photos').where({ id: photoId }).del();

    // Delete file
    const filePath = path.join(__dirname, '../..', photo.photo_url);
    await fs.unlink(filePath).catch(() => {
      logger.warn('Failed to delete photo file', { filePath });
    });

    // If primary photo was deleted, set new primary
    if (photo.is_primary) {
      const nextPhoto = await db('user_photos')
        .where({ user_id: userId })
        .orderBy('display_order')
        .first();

      if (nextPhoto) {
        await db('user_photos')
          .where({ id: nextPhoto.id })
          .update({ is_primary: true });
      }
    }

    logger.info('Photo deleted successfully', {
      userId,
      photoId,
      photoUrl: photo.photo_url
    });

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    logger.error('Photo deletion error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      photoId: req.params.photoId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete photo',
      code: 'PHOTO_DELETE_ERROR'
    });
  }
});

// Set primary photo
router.put('/photos/:photoId/primary', authenticateToken, [
  param('photoId').isInt().withMessage('Invalid photo ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const photoId = parseInt(req.params.photoId);

    // Check if photo exists and belongs to user
    const photo = await db('user_photos')
      .where({ id: photoId, user_id: userId })
      .first();

    if (!photo) {
      return res.status(404).json({
        success: false,
        error: 'Photo not found',
        code: 'PHOTO_NOT_FOUND'
      });
    }

    // Update primary photos
    await db.transaction(async (trx) => {
      // Remove primary from all user photos
      await trx('user_photos')
        .where({ user_id: userId })
        .update({ is_primary: false });

      // Set new primary
      await trx('user_photos')
        .where({ id: photoId })
        .update({ is_primary: true });
    });

    logger.info('Primary photo updated', {
      userId,
      photoId
    });

    res.json({
      success: true,
      message: 'Primary photo updated successfully'
    });

  } catch (error) {
    logger.error('Set primary photo error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id,
      photoId: req.params.photoId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to set primary photo',
      code: 'PRIMARY_PHOTO_ERROR'
    });
  }
});

// Helper function to calculate profile completion score
function calculateProfileCompletion(profile) {
  if (!profile) return 0;

  let score = 0;
  const maxScore = 100;

  // Basic info (already filled during registration) - 30 points
  if (profile.first_name && profile.last_name && profile.email && profile.date_of_birth && profile.gender) {
    score += 30;
  }

  // Bio - 15 points
  if (profile.bio && profile.bio.trim().length > 0) {
    score += 15;
  }

  // Interests - 10 points
  if (profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) {
    score += 10;
  }

  // Occupation - 10 points
  if (profile.occupation && profile.occupation.trim().length > 0) {
    score += 10;
  }

  // Photos - 20 points (will be calculated separately based on photo count)
  // This is just a placeholder, actual photo scoring would be done in the calling function
  score += 20;

  // Additional details - 15 points
  let additionalFields = 0;
  if (profile.education) additionalFields++;
  if (profile.height) additionalFields++;
  if (profile.drinking) additionalFields++;
  if (profile.smoking) additionalFields++;
  if (profile.relationship_type) additionalFields++;
  
  score += Math.min(additionalFields * 3, 15);

  return Math.min(score, maxScore);
}

module.exports = router;