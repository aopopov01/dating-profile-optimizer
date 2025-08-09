const Redis = require('ioredis');
const logger = require('../config/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.initialized = false;
    this.localCache = new Map(); // Fallback local cache
    this.localCacheMaxSize = 1000;
    
    // Cache configuration with TTL (Time To Live) settings
    this.cacheConfigs = {
      // User profile data
      user_profile: {
        ttl: 3600, // 1 hour
        namespace: 'user',
        compress: false
      },
      
      // Photo analysis results
      photo_analysis: {
        ttl: 86400, // 24 hours
        namespace: 'photo',
        compress: true // Photo analysis data can be large
      },
      
      // Bio generation results
      bio_generation: {
        ttl: 7200, // 2 hours
        namespace: 'bio',
        compress: true
      },
      
      // A/B test data
      ab_test_data: {
        ttl: 43200, // 12 hours
        namespace: 'abtest',
        compress: false
      },
      
      // Success metrics and analytics
      success_metrics: {
        ttl: 1800, // 30 minutes
        namespace: 'metrics',
        compress: false
      },
      
      // API rate limiting data
      rate_limiting: {
        ttl: 3600, // 1 hour
        namespace: 'rate',
        compress: false
      },
      
      // OpenAI response cache
      openai_responses: {
        ttl: 21600, // 6 hours
        namespace: 'ai',
        compress: true
      },
      
      // Image processing results
      image_processing: {
        ttl: 172800, // 48 hours
        namespace: 'img',
        compress: true
      },
      
      // Session data
      session_data: {
        ttl: 1800, // 30 minutes
        namespace: 'session',
        compress: false
      },
      
      // Temporary job data
      job_temp_data: {
        ttl: 600, // 10 minutes
        namespace: 'job',
        compress: false
      }
    };

    // Performance optimization settings
    this.performanceSettings = {
      pipeline_batch_size: 100,
      connection_pool_size: 10,
      retry_attempts: 3,
      timeout_ms: 5000,
      enable_compression: true,
      enable_local_fallback: true
    };

    // Metrics tracking
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      total_operations: 0,
      avg_response_time: 0,
      cache_size: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Cache Service...');

      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: this.performanceSettings.retry_attempts,
          lazyConnect: true,
          connectTimeout: this.performanceSettings.timeout_ms,
          commandTimeout: this.performanceSettings.timeout_ms,
          maxmemoryPolicy: 'allkeys-lru', // LRU eviction policy
          compression: this.performanceSettings.enable_compression ? 'gzip' : null
        });

        this.redis.on('error', (error) => {
          logger.error('Redis cache error:', error);
          this.metrics.errors++;
        });

        this.redis.on('connect', () => {
          logger.info('Redis cache connected successfully');
        });

        await this.redis.connect();
        
        // Test the connection
        await this.redis.ping();
        logger.info('Redis cache connection verified');
      } else {
        logger.warn('Redis URL not provided - using local cache only');
      }

      this.initialized = true;
      logger.info('Cache Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Cache Service initialization failed:', error);
      // Continue with local cache only
      this.initialized = true;
      return false;
    }
  }

  /**
   * Set cache value with automatic compression and TTL
   */
  async set(key, value, type = 'general', customTTL = null) {
    const startTime = Date.now();
    
    try {
      const config = this.cacheConfigs[type] || { ttl: 3600, namespace: 'general', compress: false };
      const fullKey = `${config.namespace}:${key}`;
      const ttl = customTTL || config.ttl;
      
      let serializedValue = JSON.stringify(value);
      
      // Compress large values if enabled
      if (config.compress && serializedValue.length > 1024) {
        serializedValue = await this.compressData(serializedValue);
      }

      if (this.redis) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else if (this.performanceSettings.enable_local_fallback) {
        this.setLocalCache(fullKey, { value: serializedValue, expires: Date.now() + (ttl * 1000) });
      }

      this.updateMetrics('set', Date.now() - startTime, true);
      return true;
    } catch (error) {
      logger.error('Cache set failed:', { key, type, error: error.message });
      this.updateMetrics('set', Date.now() - startTime, false);
      return false;
    }
  }

  /**
   * Get cache value with automatic decompression
   */
  async get(key, type = 'general') {
    const startTime = Date.now();
    
    try {
      const config = this.cacheConfigs[type] || { ttl: 3600, namespace: 'general', compress: false };
      const fullKey = `${config.namespace}:${key}`;
      
      let cachedValue = null;
      
      if (this.redis) {
        cachedValue = await this.redis.get(fullKey);
      } else if (this.performanceSettings.enable_local_fallback) {
        const localData = this.getLocalCache(fullKey);
        if (localData && localData.expires > Date.now()) {
          cachedValue = localData.value;
        }
      }

      if (cachedValue) {
        // Try to decompress if it was compressed
        let decompressedValue = cachedValue;
        if (config.compress && this.isCompressed(cachedValue)) {
          decompressedValue = await this.decompressData(cachedValue);
        }
        
        const parsedValue = JSON.parse(decompressedValue);
        this.updateMetrics('get', Date.now() - startTime, true, true);
        return parsedValue;
      }

      this.updateMetrics('get', Date.now() - startTime, true, false);
      return null;
    } catch (error) {
      logger.error('Cache get failed:', { key, type, error: error.message });
      this.updateMetrics('get', Date.now() - startTime, false, false);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key, type = 'general') {
    try {
      const config = this.cacheConfigs[type] || { namespace: 'general' };
      const fullKey = `${config.namespace}:${key}`;
      
      if (this.redis) {
        await this.redis.del(fullKey);
      }
      
      this.deleteLocalCache(fullKey);
      return true;
    } catch (error) {
      logger.error('Cache delete failed:', { key, type, error: error.message });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key, type = 'general') {
    try {
      const config = this.cacheConfigs[type] || { namespace: 'general' };
      const fullKey = `${config.namespace}:${key}`;
      
      if (this.redis) {
        const exists = await this.redis.exists(fullKey);
        return exists === 1;
      }
      
      if (this.performanceSettings.enable_local_fallback) {
        const localData = this.getLocalCache(fullKey);
        return localData && localData.expires > Date.now();
      }
      
      return false;
    } catch (error) {
      logger.error('Cache exists check failed:', { key, type, error: error.message });
      return false;
    }
  }

  /**
   * Set multiple cache entries in a pipeline for better performance
   */
  async mset(keyValuePairs, type = 'general', customTTL = null) {
    try {
      const config = this.cacheConfigs[type] || { ttl: 3600, namespace: 'general', compress: false };
      const ttl = customTTL || config.ttl;
      
      if (this.redis) {
        const pipeline = this.redis.pipeline();
        
        for (const [key, value] of keyValuePairs) {
          const fullKey = `${config.namespace}:${key}`;
          let serializedValue = JSON.stringify(value);
          
          if (config.compress && serializedValue.length > 1024) {
            serializedValue = await this.compressData(serializedValue);
          }
          
          pipeline.setex(fullKey, ttl, serializedValue);
        }
        
        await pipeline.exec();
      } else if (this.performanceSettings.enable_local_fallback) {
        for (const [key, value] of keyValuePairs) {
          const fullKey = `${config.namespace}:${key}`;
          const serializedValue = JSON.stringify(value);
          this.setLocalCache(fullKey, { 
            value: serializedValue, 
            expires: Date.now() + (ttl * 1000) 
          });
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Cache mset failed:', { count: keyValuePairs.length, type, error: error.message });
      return false;
    }
  }

  /**
   * Get multiple cache entries in a pipeline
   */
  async mget(keys, type = 'general') {
    try {
      const config = this.cacheConfigs[type] || { namespace: 'general', compress: false };
      const fullKeys = keys.map(key => `${config.namespace}:${key}`);
      const results = {};
      
      if (this.redis) {
        const values = await this.redis.mget(fullKeys);
        
        for (let i = 0; i < keys.length; i++) {
          if (values[i]) {
            let decompressedValue = values[i];
            if (config.compress && this.isCompressed(values[i])) {
              decompressedValue = await this.decompressData(values[i]);
            }
            results[keys[i]] = JSON.parse(decompressedValue);
          } else {
            results[keys[i]] = null;
          }
        }
      } else if (this.performanceSettings.enable_local_fallback) {
        for (let i = 0; i < keys.length; i++) {
          const localData = this.getLocalCache(fullKeys[i]);
          if (localData && localData.expires > Date.now()) {
            results[keys[i]] = JSON.parse(localData.value);
          } else {
            results[keys[i]] = null;
          }
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Cache mget failed:', { keys: keys.length, type, error: error.message });
      return {};
    }
  }

  /**
   * Cache with automatic key generation for complex objects
   */
  async cacheResult(operation, keyGenerator, type = 'general', customTTL = null) {
    try {
      const cacheKey = await keyGenerator();
      
      // Try to get from cache first
      const cachedResult = await this.get(cacheKey, type);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Execute operation and cache result
      const result = await operation();
      await this.set(cacheKey, result, type, customTTL);
      
      return result;
    } catch (error) {
      logger.error('Cache result operation failed:', error);
      // If caching fails, still execute operation
      try {
        return await operation();
      } catch (operationError) {
        throw operationError;
      }
    }
  }

  /**
   * Cache function results with intelligent key generation
   */
  cacheFunction(fn, keyPrefix, type = 'general', ttl = null) {
    return async (...args) => {
      const keyGenerator = () => {
        const argsHash = this.generateHash(JSON.stringify(args));
        return `${keyPrefix}:${argsHash}`;
      };
      
      return await this.cacheResult(() => fn(...args), keyGenerator, type, ttl);
    };
  }

  /**
   * Invalidate cache by pattern (Redis only)
   */
  async invalidatePattern(pattern, type = 'general') {
    try {
      if (!this.redis) {
        logger.warn('Pattern invalidation only supported with Redis');
        return false;
      }
      
      const config = this.cacheConfigs[type] || { namespace: 'general' };
      const fullPattern = `${config.namespace}:${pattern}`;
      
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
        logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${fullPattern}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache pattern invalidation failed:', { pattern, type, error: error.message });
      return false;
    }
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(warmingData) {
    try {
      logger.info('Starting cache warming process...');
      let successCount = 0;
      
      for (const [key, value, type, ttl] of warmingData) {
        try {
          await this.set(key, value, type, ttl);
          successCount++;
        } catch (error) {
          logger.warn('Failed to warm cache entry:', { key, error: error.message });
        }
      }
      
      logger.info(`Cache warming completed: ${successCount}/${warmingData.length} entries loaded`);
      return successCount;
    } catch (error) {
      logger.error('Cache warming failed:', error);
      return 0;
    }
  }

  /**
   * Performance optimization: Batch operations
   */
  async batchOperations(operations) {
    if (!this.redis) {
      // Execute operations sequentially for local cache
      const results = [];
      for (const op of operations) {
        results.push(await this.executeBatchOperation(op));
      }
      return results;
    }

    // Use Redis pipeline for batch operations
    const pipeline = this.redis.pipeline();
    const configs = [];
    
    for (const op of operations) {
      const config = this.cacheConfigs[op.type] || { namespace: 'general', compress: false };
      configs.push(config);
      
      const fullKey = `${config.namespace}:${op.key}`;
      
      switch (op.operation) {
        case 'get':
          pipeline.get(fullKey);
          break;
        case 'set':
          let serializedValue = JSON.stringify(op.value);
          if (config.compress && serializedValue.length > 1024) {
            serializedValue = await this.compressData(serializedValue);
          }
          pipeline.setex(fullKey, op.ttl || config.ttl, serializedValue);
          break;
        case 'del':
          pipeline.del(fullKey);
          break;
        case 'exists':
          pipeline.exists(fullKey);
          break;
      }
    }
    
    const results = await pipeline.exec();
    
    // Process results
    const processedResults = [];
    for (let i = 0; i < results.length; i++) {
      const [error, result] = results[i];
      const op = operations[i];
      const config = configs[i];
      
      if (error) {
        processedResults.push({ success: false, error: error.message });
        continue;
      }
      
      if (op.operation === 'get' && result) {
        let decompressedValue = result;
        if (config.compress && this.isCompressed(result)) {
          decompressedValue = await this.decompressData(result);
        }
        processedResults.push({ success: true, value: JSON.parse(decompressedValue) });
      } else {
        processedResults.push({ success: true, value: result });
      }
    }
    
    return processedResults;
  }

  /**
   * Cache statistics and monitoring
   */
  getStatistics() {
    const hitRate = this.metrics.total_operations > 0 
      ? ((this.metrics.hits / this.metrics.total_operations) * 100).toFixed(2)
      : 0;
    
    return {
      hit_rate: `${hitRate}%`,
      total_hits: this.metrics.hits,
      total_misses: this.metrics.misses,
      total_errors: this.metrics.errors,
      total_operations: this.metrics.total_operations,
      avg_response_time_ms: this.metrics.avg_response_time.toFixed(2),
      local_cache_size: this.localCache.size,
      redis_connected: this.redis && this.redis.status === 'ready',
      cache_types: Object.keys(this.cacheConfigs),
      performance_settings: this.performanceSettings
    };
  }

  /**
   * Memory usage optimization
   */
  async optimizeMemoryUsage() {
    try {
      // Clean up expired local cache entries
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, data] of this.localCache.entries()) {
        if (data.expires < now) {
          this.localCache.delete(key);
          cleanedCount++;
        }
      }
      
      // Limit local cache size
      if (this.localCache.size > this.localCacheMaxSize) {
        const entriesToRemove = this.localCache.size - this.localCacheMaxSize;
        const keys = Array.from(this.localCache.keys()).slice(0, entriesToRemove);
        
        for (const key of keys) {
          this.localCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Memory optimization: cleaned ${cleanedCount} local cache entries`);
      }
      
      return cleanedCount;
    } catch (error) {
      logger.error('Memory optimization failed:', error);
      return 0;
    }
  }

  /**
   * Helper methods
   */
  setLocalCache(key, data) {
    if (this.localCache.size >= this.localCacheMaxSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
    this.localCache.set(key, data);
  }

  getLocalCache(key) {
    return this.localCache.get(key);
  }

  deleteLocalCache(key) {
    this.localCache.delete(key);
  }

  updateMetrics(operation, responseTime, success, hit = null) {
    this.metrics.total_operations++;
    
    if (hit === true) this.metrics.hits++;
    if (hit === false) this.metrics.misses++;
    if (!success) this.metrics.errors++;
    
    // Update average response time
    this.metrics.avg_response_time = (
      (this.metrics.avg_response_time * (this.metrics.total_operations - 1)) + responseTime
    ) / this.metrics.total_operations;
  }

  generateHash(input) {
    // Simple hash function for cache keys
    let hash = 0;
    if (input.length === 0) return hash;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  async compressData(data) {
    // Simple compression placeholder - in production, use gzip or similar
    return `compressed:${Buffer.from(data).toString('base64')}`;
  }

  async decompressData(compressedData) {
    // Simple decompression placeholder
    if (compressedData.startsWith('compressed:')) {
      return Buffer.from(compressedData.substring(11), 'base64').toString();
    }
    return compressedData;
  }

  isCompressed(data) {
    return typeof data === 'string' && data.startsWith('compressed:');
  }

  async executeBatchOperation(op) {
    switch (op.operation) {
      case 'get':
        return await this.get(op.key, op.type);
      case 'set':
        return await this.set(op.key, op.value, op.type, op.ttl);
      case 'del':
        return await this.delete(op.key, op.type);
      case 'exists':
        return await this.exists(op.key, op.type);
      default:
        throw new Error(`Unknown operation: ${op.operation}`);
    }
  }

  /**
   * Cache health check
   */
  async healthCheck() {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };
      
      // Test set and get operations
      await this.set(testKey, testValue, 'general', 60);
      const retrieved = await this.get(testKey, 'general');
      await this.delete(testKey, 'general');
      
      const isHealthy = retrieved && retrieved.test === true;
      
      return {
        healthy: isHealthy,
        redis_connected: this.redis && this.redis.status === 'ready',
        local_cache_available: true,
        last_check: new Date().toISOString(),
        metrics: this.getStatistics()
      };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down Cache Service...');
      
      if (this.redis) {
        await this.redis.quit();
        logger.info('Redis connection closed');
      }
      
      this.localCache.clear();
      logger.info('Local cache cleared');
      
      this.initialized = false;
      logger.info('Cache Service shutdown completed');
    } catch (error) {
      logger.error('Cache Service shutdown error:', error);
    }
  }
}

module.exports = new CacheService();