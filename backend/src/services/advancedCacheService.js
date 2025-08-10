const Redis = require('ioredis');
const zlib = require('zlib');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Advanced Cache Service for Dating Profile Optimizer
 * Optimized for dating app workloads with intelligent caching strategies
 */
class AdvancedCacheService {
  constructor() {
    this.redis = null;
    this.compressionThreshold = 1024; // Compress data larger than 1KB
    this.defaultTTL = 3600; // 1 hour default TTL
    this.batchSize = 1000; // Maximum batch size for bulk operations
    this.circuitBreakerFailures = 0;
    this.circuitBreakerThreshold = 5;
    this.circuitBreakerResetTime = 60000; // 1 minute
    this.isCircuitBreakerOpen = false;
    
    // Dating app specific cache namespaces
    this.namespaces = {
      PROFILES: 'profiles',
      PHOTOS: 'photos',
      BIO_ANALYSIS: 'bio_analysis',
      MATCHES: 'matches',
      PREFERENCES: 'preferences',
      ANALYTICS: 'analytics',
      AI_RESULTS: 'ai_results',
      SESSION: 'session',
      RATE_LIMIT: 'rate_limit'
    };
    
    // Cache TTL configurations for different data types
    this.ttlConfig = {
      [this.namespaces.PROFILES]: 1800, // 30 minutes
      [this.namespaces.PHOTOS]: 3600, // 1 hour
      [this.namespaces.BIO_ANALYSIS]: 7200, // 2 hours
      [this.namespaces.MATCHES]: 900, // 15 minutes
      [this.namespaces.PREFERENCES]: 3600, // 1 hour
      [this.namespaces.ANALYTICS]: 300, // 5 minutes
      [this.namespaces.AI_RESULTS]: 1800, // 30 minutes
      [this.namespaces.SESSION]: 86400, // 24 hours
      [this.namespaces.RATE_LIMIT]: 900 // 15 minutes
    };
  }

  /**
   * Initialize Redis connection with optimized configuration
   */
  async initialize() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        compression: 'gzip',
        // Connection pool settings for high concurrency
        family: 4,
        enableOfflineQueue: false,
        // Cluster mode for production scaling
        ...(process.env.REDIS_CLUSTER_NODES && {
          enableReadyCheck: false,
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          }
        })
      };

      if (process.env.REDIS_CLUSTER_NODES) {
        // Cluster configuration for production
        const nodes = process.env.REDIS_CLUSTER_NODES.split(',');
        this.redis = new Redis.Cluster(nodes, redisConfig);
      } else {
        this.redis = new Redis(redisConfig);
      }

      // Event listeners
      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.circuitBreakerFailures = 0;
        this.isCircuitBreakerOpen = false;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.handleCircuitBreaker();
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready for operations');
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      logger.info('Advanced Cache Service initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  /**
   * Handle circuit breaker logic for Redis failures
   */
  handleCircuitBreaker() {
    this.circuitBreakerFailures++;
    if (this.circuitBreakerFailures >= this.circuitBreakerThreshold) {
      this.isCircuitBreakerOpen = true;
      logger.warn('Cache circuit breaker opened due to repeated failures');
      
      setTimeout(() => {
        this.isCircuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
        logger.info('Cache circuit breaker reset');
      }, this.circuitBreakerResetTime);
    }
  }

  /**
   * Generate cache key with namespace and version
   */
  generateKey(namespace, identifier, version = 'v1') {
    const hash = crypto.createHash('md5').update(identifier.toString()).digest('hex');
    return `dating:${version}:${namespace}:${hash}`;
  }

  /**
   * Compress data if it exceeds threshold
   */
  async compressData(data) {
    const serialized = JSON.stringify(data);
    if (serialized.length < this.compressionThreshold) {
      return { data: serialized, compressed: false };
    }
    
    return new Promise((resolve, reject) => {
      zlib.gzip(serialized, (error, compressed) => {
        if (error) reject(error);
        else resolve({ data: compressed, compressed: true });
      });
    });
  }

  /**
   * Decompress data if it was compressed
   */
  async decompressData(data, isCompressed) {
    if (!isCompressed) {
      return JSON.parse(data);
    }
    
    return new Promise((resolve, reject) => {
      zlib.gunzip(Buffer.from(data), (error, decompressed) => {
        if (error) reject(error);
        else resolve(JSON.parse(decompressed.toString()));
      });
    });
  }

  /**
   * Set data in cache with intelligent compression and TTL
   */
  async set(namespace, key, data, customTTL = null) {
    if (this.isCircuitBreakerOpen) {
      logger.debug('Cache circuit breaker open, skipping set operation');
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const { data: processedData, compressed } = await this.compressData(data);
      const ttl = customTTL || this.ttlConfig[namespace] || this.defaultTTL;
      
      const cacheValue = {
        data: compressed ? processedData.toString('base64') : processedData,
        compressed,
        timestamp: Date.now(),
        namespace,
        version: '1.0'
      };

      await this.redis.setex(cacheKey, ttl, JSON.stringify(cacheValue));
      
      logger.debug(`Cache set: ${cacheKey}, TTL: ${ttl}s, Compressed: ${compressed}`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.handleCircuitBreaker();
      return false;
    }
  }

  /**
   * Get data from cache with decompression
   */
  async get(namespace, key) {
    if (this.isCircuitBreakerOpen) {
      logger.debug('Cache circuit breaker open, skipping get operation');
      return null;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheValue = JSON.parse(cached);
      let data = cacheValue.data;
      
      if (cacheValue.compressed) {
        data = Buffer.from(data, 'base64');
      }
      
      const result = await this.decompressData(data, cacheValue.compressed);
      
      logger.debug(`Cache hit: ${cacheKey}`);
      return result;
    } catch (error) {
      logger.error('Cache get error:', error);
      this.handleCircuitBreaker();
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(namespace, key) {
    if (this.isCircuitBreakerOpen) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.del(cacheKey);
      logger.debug(`Cache delete: ${cacheKey}`);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.handleCircuitBreaker();
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern (use carefully)
   */
  async deletePattern(namespace, pattern = '*') {
    if (this.isCircuitBreakerOpen) {
      return 0;
    }

    try {
      const searchPattern = `dating:v1:${namespace}:${pattern}`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      logger.debug(`Cache pattern delete: ${searchPattern}, deleted: ${result} keys`);
      return result;
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
      this.handleCircuitBreaker();
      return 0;
    }
  }

  /**
   * Get multiple keys in batch
   */
  async getBatch(namespace, keys) {
    if (this.isCircuitBreakerOpen) {
      return {};
    }

    try {
      const cacheKeys = keys.map(key => this.generateKey(namespace, key));
      const pipeline = this.redis.pipeline();
      
      cacheKeys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();
      
      const output = {};
      for (let i = 0; i < keys.length; i++) {
        const [error, cached] = results[i];
        if (!error && cached) {
          try {
            const cacheValue = JSON.parse(cached);
            let data = cacheValue.data;
            
            if (cacheValue.compressed) {
              data = Buffer.from(data, 'base64');
            }
            
            output[keys[i]] = await this.decompressData(data, cacheValue.compressed);
          } catch (parseError) {
            logger.error(`Cache batch parse error for key ${keys[i]}:`, parseError);
          }
        }
      }
      
      logger.debug(`Cache batch get: ${keys.length} keys, ${Object.keys(output).length} hits`);
      return output;
    } catch (error) {
      logger.error('Cache batch get error:', error);
      this.handleCircuitBreaker();
      return {};
    }
  }

  /**
   * Set multiple keys in batch
   */
  async setBatch(namespace, keyValuePairs, customTTL = null) {
    if (this.isCircuitBreakerOpen) {
      return false;
    }

    try {
      const ttl = customTTL || this.ttlConfig[namespace] || this.defaultTTL;
      const pipeline = this.redis.pipeline();
      
      for (const [key, data] of Object.entries(keyValuePairs)) {
        const cacheKey = this.generateKey(namespace, key);
        const { data: processedData, compressed } = await this.compressData(data);
        
        const cacheValue = {
          data: compressed ? processedData.toString('base64') : processedData,
          compressed,
          timestamp: Date.now(),
          namespace,
          version: '1.0'
        };
        
        pipeline.setex(cacheKey, ttl, JSON.stringify(cacheValue));
      }
      
      await pipeline.exec();
      logger.debug(`Cache batch set: ${Object.keys(keyValuePairs).length} keys`);
      return true;
    } catch (error) {
      logger.error('Cache batch set error:', error);
      this.handleCircuitBreaker();
      return false;
    }
  }

  /**
   * Increment counter (useful for rate limiting)
   */
  async increment(namespace, key, amount = 1, ttl = null) {
    if (this.isCircuitBreakerOpen) {
      return 0;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const currentTTL = await this.redis.ttl(cacheKey);
      
      let result;
      if (currentTTL === -1) {
        // Key exists but has no TTL
        result = await this.redis.incrby(cacheKey, amount);
        if (ttl) {
          await this.redis.expire(cacheKey, ttl);
        }
      } else if (currentTTL === -2) {
        // Key doesn't exist
        result = await this.redis.incrby(cacheKey, amount);
        const expireTime = ttl || this.ttlConfig[namespace] || this.defaultTTL;
        await this.redis.expire(cacheKey, expireTime);
      } else {
        // Key exists with TTL
        result = await this.redis.incrby(cacheKey, amount);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      this.handleCircuitBreaker();
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(namespace, key) {
    if (this.isCircuitBreakerOpen) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(namespace, key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      this.handleCircuitBreaker();
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.isCircuitBreakerOpen) {
      return { error: 'Circuit breaker open' };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        circuitBreaker: {
          open: this.isCircuitBreakerOpen,
          failures: this.circuitBreakerFailures
        }
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return { error: error.message };
    }
  }

  /**
   * Dating app specific: Cache user profile with related data
   */
  async cacheUserProfile(userId, profileData, photos = [], preferences = {}) {
    try {
      const operations = [
        this.set(this.namespaces.PROFILES, userId, profileData),
        this.set(this.namespaces.PHOTOS, userId, photos),
        this.set(this.namespaces.PREFERENCES, userId, preferences)
      ];
      
      await Promise.all(operations);
      logger.debug(`User profile cached: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Profile cache error:', error);
      return false;
    }
  }

  /**
   * Dating app specific: Get complete user profile
   */
  async getUserProfile(userId) {
    try {
      const [profile, photos, preferences] = await Promise.all([
        this.get(this.namespaces.PROFILES, userId),
        this.get(this.namespaces.PHOTOS, userId),
        this.get(this.namespaces.PREFERENCES, userId)
      ]);
      
      if (!profile) {
        return null;
      }
      
      return {
        profile,
        photos: photos || [],
        preferences: preferences || {}
      };
    } catch (error) {
      logger.error('Get profile cache error:', error);
      return null;
    }
  }

  /**
   * Dating app specific: Cache AI analysis results
   */
  async cacheAIResult(type, inputHash, result, ttl = 7200) {
    const key = `${type}:${inputHash}`;
    return await this.set(this.namespaces.AI_RESULTS, key, result, ttl);
  }

  /**
   * Dating app specific: Get AI analysis results
   */
  async getAIResult(type, inputHash) {
    const key = `${type}:${inputHash}`;
    return await this.get(this.namespaces.AI_RESULTS, key);
  }

  /**
   * Cleanup expired keys (maintenance operation)
   */
  async cleanup() {
    try {
      const info = await this.redis.info('keyspace');
      logger.info('Cache cleanup completed', { info });
    } catch (error) {
      logger.error('Cache cleanup error:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Cache service connection closed');
    }
  }
}

// Singleton instance
const cacheService = new AdvancedCacheService();

module.exports = cacheService;