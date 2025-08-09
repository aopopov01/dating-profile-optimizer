const logger = require('../config/logger');
const aiService = require('./aiService');
const photoAnalysisService = require('./photoAnalysisService');
const bioGenerationService = require('./bioGenerationService');
const paymentService = require('./paymentService');
const analyticsService = require('./analyticsService');
const redisService = require('./redisService');

/**
 * Initialize all external services for Dating Profile Optimizer
 */
async function initializeServices() {
  try {
    // Initialize Redis connection
    await redisService.connect();
    logger.info('Redis service initialized');

    // Initialize OpenAI service
    await bioGenerationService.initialize();
    logger.info('Bio generation service initialized');

    // Initialize photo analysis service
    await photoAnalysisService.initialize();
    logger.info('Photo analysis service initialized');

    // Initialize payment service (Stripe)
    await paymentService.initialize();
    logger.info('Payment service initialized');

    // Initialize analytics service
    await analyticsService.initialize();
    logger.info('Analytics service initialized');

    // Test AI service connections
    await aiService.testConnections();
    logger.info('AI services initialized');

    return true;
  } catch (error) {
    logger.error('Service initialization failed:', error);
    throw error;
  }
}

/**
 * Gracefully shutdown all services
 */
async function shutdownServices() {
  try {
    await redisService.disconnect();
    logger.info('Services shutdown complete');
  } catch (error) {
    logger.error('Error during service shutdown:', error);
    throw error;
  }
}

module.exports = {
  initializeServices,
  shutdownServices,
  aiService,
  photoAnalysisService,
  bioGenerationService,
  paymentService,
  analyticsService,
  redisService
};