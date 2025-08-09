const Redis = require('ioredis');
const logger = require('../config/logger');
const db = require('../config/database');

class AIConfigService {
  constructor() {
    this.redis = null;
    this.initialized = false;
    
    // API usage tracking and limits
    this.usageLimits = {
      openai: {
        daily_requests: 10000,
        hourly_requests: 1000,
        cost_limit_daily: 100.00, // USD
        model_costs: {
          'gpt-4': 0.03, // per 1K tokens
          'gpt-3.5-turbo': 0.002,
          'gpt-4-turbo': 0.01
        }
      },
      replicate: {
        daily_requests: 500,
        hourly_requests: 100,
        cost_limit_daily: 50.00,
        base_cost_per_image: 0.0023
      }
    };

    // Performance monitoring thresholds
    this.performanceThresholds = {
      response_time_warning: 30000, // 30 seconds
      response_time_critical: 60000, // 60 seconds
      error_rate_warning: 0.05, // 5%
      error_rate_critical: 0.15 // 15%
    };

    // Retry configuration
    this.retryConfig = {
      max_retries: 3,
      base_delay: 1000, // 1 second
      max_delay: 10000, // 10 seconds
      exponential_base: 2,
      retryable_errors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate_limit_exceeded',
        'server_error',
        'service_unavailable'
      ]
    };
  }

  async initialize() {
    try {
      logger.info('Initializing AI Configuration Service...');

      // Initialize Redis for caching and rate limiting
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('error', (error) => {
          logger.error('Redis connection error:', error);
        });

        await this.redis.connect();
        logger.info('Redis connection established');
      }

      // Validate API keys
      await this.validateAPIKeys();

      // Initialize usage tracking
      await this.initializeUsageTracking();

      this.initialized = true;
      logger.info('AI Configuration Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('AI Configuration Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate all required API keys
   */
  async validateAPIKeys() {
    const requiredKeys = {
      OPENAI_API_KEY: 'OpenAI API',
      REPLICATE_API_TOKEN: 'Replicate API'
    };

    const missingKeys = [];
    const validKeys = {};

    for (const [key, service] of Object.entries(requiredKeys)) {
      if (!process.env[key]) {
        missingKeys.push(service);
      } else {
        // Validate key format
        const isValid = await this.validateAPIKeyFormat(key, process.env[key]);
        if (isValid) {
          validKeys[service] = 'valid';
        } else {
          validKeys[service] = 'invalid_format';
        }
      }
    }

    if (missingKeys.length > 0) {
      logger.warn('Missing API keys:', missingKeys);
    }

    logger.info('API Key validation results:', validKeys);
    return { valid: validKeys, missing: missingKeys };
  }

  /**
   * Validate API key format
   */
  async validateAPIKeyFormat(keyType, keyValue) {
    try {
      switch (keyType) {
        case 'OPENAI_API_KEY':
          return keyValue.startsWith('sk-') && keyValue.length > 40;
        case 'REPLICATE_API_TOKEN':
          return keyValue.length > 30; // Basic length check
        default:
          return true;
      }
    } catch (error) {
      logger.error(`API key validation failed for ${keyType}:`, error);
      return false;
    }
  }

  /**
   * Initialize usage tracking system
   */
  async initializeUsageTracking() {
    try {
      // Create usage tracking tables if they don't exist
      const today = new Date().toISOString().split('T')[0];
      
      if (this.redis) {
        // Initialize daily counters
        await this.redis.setnx(`usage:openai:requests:${today}`, 0);
        await this.redis.setnx(`usage:openai:cost:${today}`, 0);
        await this.redis.setnx(`usage:replicate:requests:${today}`, 0);
        await this.redis.setnx(`usage:replicate:cost:${today}`, 0);
        
        // Set expiration for usage keys (7 days)
        await this.redis.expire(`usage:openai:requests:${today}`, 604800);
        await this.redis.expire(`usage:openai:cost:${today}`, 604800);
        await this.redis.expire(`usage:replicate:requests:${today}`, 604800);
        await this.redis.expire(`usage:replicate:cost:${today}`, 604800);
      }

      logger.info('Usage tracking initialized');
    } catch (error) {
      logger.error('Usage tracking initialization failed:', error);
    }
  }

  /**
   * Check if API request is within limits
   */
  async checkRateLimit(service, userId = null) {
    try {
      if (!this.redis) {
        return { allowed: true, reason: 'No rate limiting configured' };
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const hour = now.getHours();
      
      const dailyKey = `usage:${service}:requests:${today}`;
      const hourlyKey = `usage:${service}:requests:${today}:${hour}`;
      const userDailyKey = userId ? `usage:${service}:user:${userId}:${today}` : null;

      // Get current usage
      const [dailyUsage, hourlyUsage, userDailyUsage] = await Promise.all([
        this.redis.get(dailyKey),
        this.redis.get(hourlyKey),
        userDailyKey ? this.redis.get(userDailyKey) : Promise.resolve(0)
      ]);

      const limits = this.usageLimits[service];
      
      // Check daily limit
      if (parseInt(dailyUsage) >= limits.daily_requests) {
        return {
          allowed: false,
          reason: 'Daily request limit exceeded',
          limits: { daily: limits.daily_requests, current: parseInt(dailyUsage) }
        };
      }

      // Check hourly limit
      if (parseInt(hourlyUsage) >= limits.hourly_requests) {
        return {
          allowed: false,
          reason: 'Hourly request limit exceeded',
          limits: { hourly: limits.hourly_requests, current: parseInt(hourlyUsage) }
        };
      }

      // Check user-specific limits (if applicable)
      if (userDailyKey && parseInt(userDailyUsage) >= 100) { // 100 requests per user per day
        return {
          allowed: false,
          reason: 'User daily limit exceeded',
          limits: { user_daily: 100, current: parseInt(userDailyUsage) }
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      return { allowed: true, error: error.message };
    }
  }

  /**
   * Track API usage
   */
  async trackUsage(service, options = {}) {
    try {
      const {
        userId = null,
        cost = 0,
        tokens = 0,
        responseTime = 0,
        success = true,
        errorType = null
      } = options;

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const hour = now.getHours();

      if (this.redis) {
        const pipeline = this.redis.pipeline();

        // Increment request counters
        pipeline.incr(`usage:${service}:requests:${today}`);
        pipeline.incr(`usage:${service}:requests:${today}:${hour}`);
        
        if (userId) {
          pipeline.incr(`usage:${service}:user:${userId}:${today}`);
        }

        // Track costs
        if (cost > 0) {
          pipeline.incrbyfloat(`usage:${service}:cost:${today}`, cost);
        }

        // Track tokens for OpenAI
        if (service === 'openai' && tokens > 0) {
          pipeline.incr(`usage:${service}:tokens:${today}`, tokens);
        }

        // Track errors
        if (!success && errorType) {
          pipeline.incr(`usage:${service}:errors:${today}:${errorType}`);
        }

        // Set expiration for hourly keys
        pipeline.expire(`usage:${service}:requests:${today}:${hour}`, 3600);
        
        await pipeline.exec();
      }

      // Store detailed usage in database
      await this.storeUsageRecord({
        service,
        user_id: userId,
        request_cost: cost,
        tokens_used: tokens,
        response_time_ms: responseTime,
        success,
        error_type: errorType,
        created_at: now
      });

      logger.debug('Usage tracked:', { service, userId, cost, success });
    } catch (error) {
      logger.error('Usage tracking failed:', error);
    }
  }

  /**
   * Store detailed usage record in database
   */
  async storeUsageRecord(record) {
    try {
      await db('ai_usage_logs').insert(record);
    } catch (error) {
      logger.error('Failed to store usage record:', error);
    }
  }

  /**
   * Get current usage statistics
   */
  async getUsageStats(service, timeframe = 'today') {
    try {
      const today = new Date().toISOString().split('T')[0];
      let stats = {};

      if (this.redis) {
        switch (timeframe) {
          case 'today':
            const [requests, cost] = await Promise.all([
              this.redis.get(`usage:${service}:requests:${today}`),
              this.redis.get(`usage:${service}:cost:${today}`)
            ]);
            
            stats = {
              requests: parseInt(requests) || 0,
              cost: parseFloat(cost) || 0,
              limits: this.usageLimits[service]
            };
            break;

          case 'week':
            // Get last 7 days of data
            const weekStats = await this.getWeeklyUsage(service);
            stats = weekStats;
            break;
        }
      }

      // Add performance metrics from database
      const performanceStats = await this.getPerformanceStats(service, timeframe);
      
      return {
        usage: stats,
        performance: performanceStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Get weekly usage statistics
   */
  async getWeeklyUsage(service) {
    try {
      const weekData = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const [requests, cost] = await Promise.all([
          this.redis.get(`usage:${service}:requests:${dateStr}`),
          this.redis.get(`usage:${service}:cost:${dateStr}`)
        ]);
        
        weekData.push({
          date: dateStr,
          requests: parseInt(requests) || 0,
          cost: parseFloat(cost) || 0
        });
      }
      
      return {
        daily_breakdown: weekData,
        total_requests: weekData.reduce((sum, day) => sum + day.requests, 0),
        total_cost: weekData.reduce((sum, day) => sum + day.cost, 0)
      };
    } catch (error) {
      logger.error('Failed to get weekly usage:', error);
      return { error: error.message };
    }
  }

  /**
   * Get performance statistics from database
   */
  async getPerformanceStats(service, timeframe = 'today') {
    try {
      let timeCondition = '';
      const now = new Date();
      
      switch (timeframe) {
        case 'today':
          timeCondition = `created_at >= '${now.toISOString().split('T')[0]}'`;
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          timeCondition = `created_at >= '${weekAgo.toISOString()}'`;
          break;
      }

      const stats = await db('ai_usage_logs')
        .where('service', service)
        .whereRaw(timeCondition)
        .select(
          db.raw('COUNT(*) as total_requests'),
          db.raw('AVG(response_time_ms) as avg_response_time'),
          db.raw('MAX(response_time_ms) as max_response_time'),
          db.raw('COUNT(CASE WHEN success = false THEN 1 END) as error_count'),
          db.raw('AVG(request_cost) as avg_cost'),
          db.raw('SUM(tokens_used) as total_tokens')
        )
        .first();

      const errorRate = stats.total_requests > 0 
        ? (stats.error_count / stats.total_requests) 
        : 0;

      return {
        total_requests: parseInt(stats.total_requests) || 0,
        avg_response_time_ms: Math.round(stats.avg_response_time) || 0,
        max_response_time_ms: parseInt(stats.max_response_time) || 0,
        error_rate: parseFloat(errorRate.toFixed(4)),
        avg_cost_per_request: parseFloat(stats.avg_cost) || 0,
        total_tokens: parseInt(stats.total_tokens) || 0,
        health_status: this.calculateHealthStatus(stats, errorRate)
      };
    } catch (error) {
      logger.error('Failed to get performance stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate service health status
   */
  calculateHealthStatus(stats, errorRate) {
    const avgResponseTime = stats.avg_response_time || 0;
    
    if (avgResponseTime > this.performanceThresholds.response_time_critical ||
        errorRate > this.performanceThresholds.error_rate_critical) {
      return 'critical';
    }
    
    if (avgResponseTime > this.performanceThresholds.response_time_warning ||
        errorRate > this.performanceThresholds.error_rate_warning) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Implement retry logic with exponential backoff
   */
  async withRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.retryConfig.max_retries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const responseTime = Date.now() - startTime;
        
        // Track successful operation
        await this.trackUsage(context.service, {
          ...context,
          responseTime,
          success: true
        });
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (attempt === this.retryConfig.max_retries || !isRetryable) {
          // Track failed operation
          await this.trackUsage(context.service, {
            ...context,
            success: false,
            errorType: this.categorizeError(error)
          });
          
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.base_delay * Math.pow(this.retryConfig.exponential_base, attempt),
          this.retryConfig.max_delay
        );
        
        logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.max_retries + 1})`, {
          error: error.message,
          service: context.service
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return this.retryConfig.retryable_errors.some(retryableError => 
      errorMessage.includes(retryableError) || errorCode.includes(retryableError)
    );
  }

  /**
   * Categorize error for tracking
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    if (message.includes('rate limit') || code.includes('429')) return 'rate_limit';
    if (message.includes('unauthorized') || code.includes('401')) return 'auth_error';
    if (message.includes('timeout') || code.includes('timeout')) return 'timeout';
    if (message.includes('network') || code.includes('econnreset')) return 'network_error';
    if (message.includes('invalid') || code.includes('400')) return 'invalid_request';
    if (code.includes('5')) return 'server_error';
    
    return 'unknown_error';
  }

  /**
   * Get cached result or execute operation
   */
  async withCache(cacheKey, operation, ttlSeconds = 3600) {
    try {
      if (!this.redis) {
        return await operation();
      }

      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit:', { cacheKey });
        return JSON.parse(cached);
      }

      // Execute operation
      const result = await operation();
      
      // Store in cache
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));
      logger.debug('Cache miss, result cached:', { cacheKey });
      
      return result;
    } catch (error) {
      logger.error('Cache operation failed, executing directly:', error);
      return await operation();
    }
  }

  /**
   * Cost estimation methods
   */
  estimateOpenAICost(model, tokens) {
    const costs = this.usageLimits.openai.model_costs;
    const costPerToken = (costs[model] || costs['gpt-3.5-turbo']) / 1000;
    return tokens * costPerToken;
  }

  estimateReplicateCost(numImages, style = 'corporate') {
    const baseCost = this.usageLimits.replicate.base_cost_per_image;
    const styleMultipliers = {
      corporate: 1.0,
      creative: 0.9,
      executive: 1.2,
      startup: 0.8,
      healthcare: 1.0
    };
    
    return numImages * baseCost * (styleMultipliers[style] || 1.0);
  }

  /**
   * Alert system for monitoring
   */
  async checkAlerts() {
    try {
      const alerts = [];
      const services = ['openai', 'replicate'];
      
      for (const service of services) {
        const stats = await this.getUsageStats(service, 'today');
        
        // Cost alerts
        const costLimit = this.usageLimits[service].cost_limit_daily;
        if (stats.usage.cost > costLimit * 0.8) {
          alerts.push({
            type: 'cost_warning',
            service,
            message: `${service} daily cost is at ${(stats.usage.cost / costLimit * 100).toFixed(1)}% of limit`,
            severity: stats.usage.cost > costLimit * 0.95 ? 'critical' : 'warning'
          });
        }
        
        // Performance alerts
        if (stats.performance.health_status !== 'healthy') {
          alerts.push({
            type: 'performance_warning',
            service,
            message: `${service} health status: ${stats.performance.health_status}`,
            severity: stats.performance.health_status === 'critical' ? 'critical' : 'warning'
          });
        }
        
        // Error rate alerts
        if (stats.performance.error_rate > this.performanceThresholds.error_rate_warning) {
          alerts.push({
            type: 'error_rate_warning',
            service,
            message: `${service} error rate: ${(stats.performance.error_rate * 100).toFixed(2)}%`,
            severity: stats.performance.error_rate > this.performanceThresholds.error_rate_critical ? 'critical' : 'warning'
          });
        }
      }
      
      if (alerts.length > 0) {
        logger.warn('AI Service alerts detected:', alerts);
        // Here you would typically send notifications (email, Slack, etc.)
      }
      
      return alerts;
    } catch (error) {
      logger.error('Alert check failed:', error);
      return [];
    }
  }

  /**
   * Cleanup old usage data
   */
  async cleanupOldData() {
    try {
      // Clean up database records older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deleted = await db('ai_usage_logs')
        .where('created_at', '<', thirtyDaysAgo)
        .del();
      
      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} old usage records`);
      }
      
      // Redis keys are automatically cleaned up by TTL
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }
}

module.exports = new AIConfigService();