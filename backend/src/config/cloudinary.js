const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo-api-secret',
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Path to the image file
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'dating-profile-optimizer',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
      resource_type: 'image',
      ...options,
    };

    // For demo purposes, return mock response if no real API keys
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'demo-api-key') {
      logger.info('Using mock Cloudinary upload (no API key configured)');
      return {
        public_id: `mock_${Date.now()}`,
        secure_url: `https://res.cloudinary.com/demo-cloud-name/image/upload/v${Date.now()}/dating-profile-optimizer/mock_image.jpg`,
        url: `https://res.cloudinary.com/demo-cloud-name/image/upload/v${Date.now()}/dating-profile-optimizer/mock_image.jpg`,
        width: 800,
        height: 600,
        format: 'jpg',
        resource_type: 'image',
        bytes: 156789,
        created_at: new Date().toISOString(),
      };
    }

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);

    logger.info('Image uploaded successfully to Cloudinary', {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      bytes: result.bytes,
      format: result.format,
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary upload failed', {
      error: error.message,
      filePath,
      options,
    });
    throw error;
  }
};

/**
 * Upload image from base64 data
 * @param {string} base64Data - Base64 encoded image data
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
const uploadFromBase64 = async (base64Data, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'dating-profile-optimizer',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
      resource_type: 'image',
      ...options,
    };

    // For demo purposes, return mock response if no real API keys
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'demo-api-key') {
      logger.info('Using mock Cloudinary base64 upload (no API key configured)');
      return {
        public_id: `mock_b64_${Date.now()}`,
        secure_url: `https://res.cloudinary.com/demo-cloud-name/image/upload/v${Date.now()}/dating-profile-optimizer/mock_base64_image.jpg`,
        url: `https://res.cloudinary.com/demo-cloud-name/image/upload/v${Date.now()}/dating-profile-optimizer/mock_base64_image.jpg`,
        width: 800,
        height: 600,
        format: 'jpg',
        resource_type: 'image',
        bytes: 189234,
        created_at: new Date().toISOString(),
      };
    }

    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, defaultOptions);

    logger.info('Base64 image uploaded successfully to Cloudinary', {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      bytes: result.bytes,
      format: result.format,
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary base64 upload failed', {
      error: error.message,
      options,
    });
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<object>} - Deletion result
 */
const deleteImage = async (publicId) => {
  try {
    // For demo purposes, return mock response if no real API keys
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'demo-api-key') {
      logger.info('Using mock Cloudinary delete (no API key configured)', { publicId });
      return { result: 'ok' };
    }

    const result = await cloudinary.uploader.destroy(publicId);

    logger.info('Image deleted from Cloudinary', {
      publicId,
      result: result.result,
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary delete failed', {
      error: error.message,
      publicId,
    });
    throw error;
  }
};

/**
 * Generate optimized URLs for different image sizes
 * @param {string} publicId - Public ID of the image
 * @param {object} transformations - Transformation options
 * @returns {object} - URLs for different sizes
 */
const generateImageUrls = (publicId, transformations = {}) => {
  try {
    // For demo purposes, return mock URLs if no real configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'demo-cloud-name') {
      const baseUrl = `https://res.cloudinary.com/demo-cloud-name/image/upload`;
      return {
        thumbnail: `${baseUrl}/c_fill,w_150,h_150,q_auto/${publicId}`,
        small: `${baseUrl}/c_fill,w_400,h_400,q_auto/${publicId}`,
        medium: `${baseUrl}/c_fill,w_800,h_800,q_auto/${publicId}`,
        large: `${baseUrl}/c_fill,w_1200,h_1200,q_auto/${publicId}`,
        original: `${baseUrl}/${publicId}`,
      };
    }

    const baseTransform = {
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
      ...transformations,
    };

    return {
      thumbnail: cloudinary.url(publicId, {
        ...baseTransform,
        width: 150,
        height: 150,
        crop: 'fill',
      }),
      small: cloudinary.url(publicId, {
        ...baseTransform,
        width: 400,
        height: 400,
        crop: 'fill',
      }),
      medium: cloudinary.url(publicId, {
        ...baseTransform,
        width: 800,
        height: 800,
        crop: 'fill',
      }),
      large: cloudinary.url(publicId, {
        ...baseTransform,
        width: 1200,
        height: 1200,
        crop: 'fill',
      }),
      original: cloudinary.url(publicId, baseTransform),
    };
  } catch (error) {
    logger.error('Failed to generate image URLs', {
      error: error.message,
      publicId,
      transformations,
    });
    throw error;
  }
};

/**
 * Get image details from Cloudinary
 * @param {string} publicId - Public ID of the image
 * @returns {Promise<object>} - Image details
 */
const getImageDetails = async (publicId) => {
  try {
    // For demo purposes, return mock details if no real API keys
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'demo-api-key') {
      logger.info('Using mock Cloudinary details (no API key configured)', { publicId });
      return {
        public_id: publicId,
        width: 800,
        height: 600,
        format: 'jpg',
        resource_type: 'image',
        bytes: 156789,
        created_at: new Date().toISOString(),
        secure_url: `https://res.cloudinary.com/demo-cloud-name/image/upload/v${Date.now()}/${publicId}`,
      };
    }

    const result = await cloudinary.api.resource(publicId);

    logger.info('Retrieved image details from Cloudinary', {
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
    });

    return result;
  } catch (error) {
    logger.error('Failed to get image details from Cloudinary', {
      error: error.message,
      publicId,
    });
    throw error;
  }
};

/**
 * Check if Cloudinary is properly configured
 * @returns {boolean} - Configuration status
 */
const isConfigured = () => {
  const hasCloudName = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'demo-cloud-name';
  const hasApiKey = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'demo-api-key';
  const hasApiSecret = process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_SECRET !== 'demo-api-secret';
  
  return hasCloudName && hasApiKey && hasApiSecret;
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadFromBase64,
  deleteImage,
  generateImageUrls,
  getImageDetails,
  isConfigured,
};