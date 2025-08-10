const db = require('../config/database');
const logger = require('../config/logger');
const cacheService = require('./advancedCacheService');

/**
 * Database Performance Optimization Service for Dating Profile Optimizer
 * Specialized for dating app database patterns and high-concurrency workloads
 */
class DatabaseOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000; // 1 second
    this.connectionPoolStats = {
      acquired: 0,
      released: 0,
      pending: 0,
      failed: 0
    };
    
    // Dating app specific query patterns
    this.commonQueries = {
      userProfile: 'SELECT * FROM users WHERE id = ?',
      userPhotos: 'SELECT * FROM photo_analyses WHERE user_id = ? ORDER BY created_at DESC',
      userBios: 'SELECT * FROM generated_bios WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      userMatches: 'SELECT * FROM matches WHERE user_id = ? OR target_user_id = ?',
      recentAnalytics: 'SELECT * FROM analytics_events WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC',
      activeUsers: 'SELECT id, updated_at FROM users WHERE updated_at > ? LIMIT 100',
      popularPhotos: 'SELECT photo_id, avg(score) as avg_score FROM photo_analyses WHERE created_at > ? GROUP BY photo_id ORDER BY avg_score DESC LIMIT 50'
    };

    this.initializeConnectionPoolMonitoring();
  }

  /**
   * Initialize connection pool monitoring
   */
  initializeConnectionPoolMonitoring() {
    if (db.client && db.client.pool) {
      const pool = db.client.pool;
      
      // Monitor pool events
      pool.on('acquireRequest', (eventId) => {
        this.connectionPoolStats.acquired++;
        logger.debug(`Pool acquire request: ${eventId}`);
      });

      pool.on('acquireSuccess', (eventId, resource) => {
        logger.debug(`Pool acquire success: ${eventId}`);
      });

      pool.on('acquireFail', (eventId, error) => {
        this.connectionPoolStats.failed++;
        logger.error(`Pool acquire failed: ${eventId}`, error);
      });

      pool.on('release', (resource) => {
        this.connectionPoolStats.released++;
        logger.debug('Pool resource released');
      });

      pool.on('createRequest', (eventId) => {
        logger.debug(`Pool create request: ${eventId}`);
      });

      pool.on('createSuccess', (eventId, resource) => {
        logger.debug(`Pool create success: ${eventId}`);
      });

      pool.on('createFail', (eventId, error) => {
        logger.error(`Pool create failed: ${eventId}`, error);
      });
    }

    logger.info('Database connection pool monitoring initialized');
  }

  /**
   * Create optimized indexes for dating app queries
   */
  async createOptimizationIndexes() {
    const indexes = [
      // User-related indexes
      {
        name: 'idx_users_updated_at_active',
        table: 'users',
        columns: ['updated_at', 'id'],
        condition: 'WHERE updated_at > NOW() - INTERVAL \'7 days\''
      },
      {
        name: 'idx_users_location_active',
        table: 'users',
        columns: ['latitude', 'longitude', 'updated_at']
      },

      // Photo analysis indexes
      {
        name: 'idx_photo_analyses_user_id_created',
        table: 'photo_analyses',
        columns: ['user_id', 'created_at']
      },
      {
        name: 'idx_photo_analyses_score_recent',
        table: 'photo_analyses',
        columns: ['score', 'created_at'],
        condition: 'WHERE created_at > NOW() - INTERVAL \'30 days\''
      },

      // Bio generation indexes
      {
        name: 'idx_generated_bios_user_id_created',
        table: 'generated_bios',
        columns: ['user_id', 'created_at']
      },
      {
        name: 'idx_generated_bios_quality_score',
        table: 'generated_bios',
        columns: ['quality_score', 'created_at']
      },

      // Success metrics indexes
      {
        name: 'idx_success_metrics_user_id_type',
        table: 'success_metrics',
        columns: ['user_id', 'metric_type', 'created_at']
      },

      // Analytics events indexes
      {
        name: 'idx_analytics_events_user_id_created',
        table: 'analytics_events',
        columns: ['user_id', 'created_at']
      },
      {
        name: 'idx_analytics_events_event_type_created',
        table: 'analytics_events',
        columns: ['event_type', 'created_at']
      },

      // Purchases indexes
      {
        name: 'idx_purchases_user_id_status',
        table: 'purchases',
        columns: ['user_id', 'status', 'created_at']
      },
      {
        name: 'idx_purchases_status_amount',
        table: 'purchases',
        columns: ['status', 'amount', 'created_at']
      }
    ];

    const createdIndexes = [];
    const errors = [];

    for (const index of indexes) {
      try {
        // Check if index already exists
        const existingIndex = await db.raw(
          `SELECT indexname FROM pg_indexes WHERE tablename = ? AND indexname = ?`,
          [index.table, index.name]
        );

        if (existingIndex.rows.length === 0) {
          const indexSQL = this.buildIndexSQL(index);
          await db.raw(indexSQL);
          createdIndexes.push(index.name);
          logger.info(`Created database index: ${index.name}`);
        } else {
          logger.debug(`Index already exists: ${index.name}`);
        }
      } catch (error) {
        errors.push({ index: index.name, error: error.message });
        logger.error(`Failed to create index ${index.name}:`, error);
      }
    }

    // Create composite indexes for dating-specific queries
    await this.createDatingSpecificIndexes();

    logger.info(`Database optimization indexes created: ${createdIndexes.length} new, ${errors.length} failed`);
    return { created: createdIndexes, errors };
  }

  /**
   * Create dating app specific composite indexes
   */
  async createDatingSpecificIndexes() {
    const datingIndexes = [
      // Matching algorithm optimization
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_matching_criteria ON users (age, latitude, longitude, updated_at) WHERE updated_at > NOW() - INTERVAL \'7 days\'',
      
      // Popular content discovery
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popular_photos_score ON photo_analyses (score DESC, created_at DESC) WHERE score > 7.0',
      
      // Recent activity tracking
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_user_activity ON analytics_events (user_id, created_at DESC) WHERE created_at > NOW() - INTERVAL \'24 hours\'',
      
      // Conversion funnel analysis
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversion_funnel ON analytics_events (event_type, user_id, created_at) WHERE event_type IN (\'profile_view\', \'photo_upload\', \'bio_generate\', \'purchase\')',
      
      // Geographic clustering for local matches
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geo_clustering ON users USING GIST (ll_to_earth(latitude, longitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    ];

    for (const indexSQL of datingIndexes) {
      try {
        await db.raw(indexSQL);
        logger.debug('Dating index created successfully');
      } catch (error) {
        // Ignore if index already exists
        if (!error.message.includes('already exists')) {
          logger.error('Dating index creation failed:', error);
        }
      }
    }
  }

  /**
   * Build index SQL from configuration
   */
  buildIndexSQL(index) {
    let sql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${index.name} ON ${index.table}`;
    
    if (index.columns.length > 0) {
      sql += ` (${index.columns.join(', ')})`;
    }
    
    if (index.condition) {
      sql += ` ${index.condition}`;
    }
    
    return sql;
  }

  /**
   * Optimized user profile query with caching
   */
  async getUserProfileOptimized(userId) {
    const cacheKey = `user_profile_${userId}`;
    
    // Check cache first
    let cached = await cacheService.get(cacheService.namespaces.PROFILES, cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    
    try {
      // Single optimized query with all related data
      const result = await db.raw(`
        SELECT 
          u.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', pa.id,
                'photo_url', pa.photo_url,
                'score', pa.score,
                'analysis_data', pa.analysis_data,
                'created_at', pa.created_at
              ) ORDER BY pa.created_at DESC
            ) FILTER (WHERE pa.id IS NOT NULL), 
            '[]'
          ) as photos,
          COALESCE(
            json_agg(
              json_build_object(
                'id', gb.id,
                'bio_text', gb.bio_text,
                'quality_score', gb.quality_score,
                'created_at', gb.created_at
              ) ORDER BY gb.created_at DESC
            ) FILTER (WHERE gb.id IS NOT NULL), 
            '[]'
          ) as bios
        FROM users u
        LEFT JOIN photo_analyses pa ON u.id = pa.user_id
        LEFT JOIN generated_bios gb ON u.id = gb.user_id
        WHERE u.id = ?
        GROUP BY u.id
      `, [userId]);

      const profile = result.rows[0] || null;
      
      if (profile) {
        // Cache the result
        await cacheService.set(
          cacheService.namespaces.PROFILES,
          cacheKey,
          profile,
          1800 // 30 minutes
        );
      }

      const queryTime = Date.now() - startTime;
      if (queryTime > this.slowQueryThreshold) {
        logger.warn(`Slow query detected - getUserProfileOptimized: ${queryTime}ms`, { userId });
      }

      return profile;
    } catch (error) {
      logger.error('Database query error in getUserProfileOptimized:', error);
      throw error;
    }
  }

  /**
   * Batch fetch user profiles with optimization
   */
  async getBatchUserProfiles(userIds, options = {}) {
    if (userIds.length === 0) return [];

    const cacheResults = await cacheService.getBatch(
      cacheService.namespaces.PROFILES,
      userIds.map(id => `user_profile_${id}`)
    );

    const cachedUserIds = Object.keys(cacheResults);
    const uncachedUserIds = userIds.filter(id => !cachedUserIds.includes(`user_profile_${id}`));
    
    let dbResults = [];
    
    if (uncachedUserIds.length > 0) {
      const startTime = Date.now();
      
      try {
        // Optimized batch query
        const result = await db.raw(`
          SELECT 
            u.id,
            row_to_json(u.*) as profile,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', pa.id,
                  'photo_url', pa.photo_url,
                  'score', pa.score
                ) ORDER BY pa.score DESC
              ) FILTER (WHERE pa.id IS NOT NULL), 
              '[]'
            ) as photos
          FROM users u
          LEFT JOIN photo_analyses pa ON u.id = pa.user_id
          WHERE u.id = ANY(?)
          GROUP BY u.id
        `, [uncachedUserIds]);

        dbResults = result.rows;
        
        // Cache the results
        const cacheOperations = {};
        dbResults.forEach(user => {
          cacheOperations[`user_profile_${user.id}`] = {
            ...user.profile,
            photos: user.photos
          };
        });
        
        if (Object.keys(cacheOperations).length > 0) {
          await cacheService.setBatch(
            cacheService.namespaces.PROFILES,
            cacheOperations,
            1800 // 30 minutes
          );
        }

        const queryTime = Date.now() - startTime;
        if (queryTime > this.slowQueryThreshold) {
          logger.warn(`Slow batch query detected: ${queryTime}ms`, { userIds: uncachedUserIds });
        }
        
      } catch (error) {
        logger.error('Batch user profiles query error:', error);
        throw error;
      }
    }

    // Combine cached and fresh results
    const allResults = [];
    
    // Add cached results
    Object.entries(cacheResults).forEach(([key, profile]) => {
      allResults.push(profile);
    });
    
    // Add fresh results
    dbResults.forEach(user => {
      allResults.push({
        ...user.profile,
        photos: user.photos
      });
    });

    return allResults;
  }

  /**
   * Optimized analytics query with aggregation
   */
  async getAnalyticsOptimized(userId, timeRange = '7d', eventTypes = []) {
    const cacheKey = `analytics_${userId}_${timeRange}_${eventTypes.join(',')}`;
    
    // Check cache
    let cached = await cacheService.get(cacheService.namespaces.ANALYTICS, cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    let timeCondition = 'created_at > NOW() - INTERVAL \'7 days\'';
    
    switch (timeRange) {
      case '24h': timeCondition = 'created_at > NOW() - INTERVAL \'24 hours\''; break;
      case '7d': timeCondition = 'created_at > NOW() - INTERVAL \'7 days\''; break;
      case '30d': timeCondition = 'created_at > NOW() - INTERVAL \'30 days\''; break;
    }

    try {
      let eventTypeCondition = '';
      const params = [userId];
      
      if (eventTypes.length > 0) {
        eventTypeCondition = ' AND event_type = ANY(?)';
        params.push(eventTypes);
      }

      const result = await db.raw(`
        SELECT 
          event_type,
          DATE_TRUNC('hour', created_at) as time_bucket,
          COUNT(*) as event_count,
          json_agg(
            json_build_object(
              'properties', event_properties,
              'created_at', created_at
            ) ORDER BY created_at DESC
          ) as events
        FROM analytics_events
        WHERE user_id = ? AND ${timeCondition} ${eventTypeCondition}
        GROUP BY event_type, time_bucket
        ORDER BY time_bucket DESC, event_type
      `, params);

      const analytics = {
        userId,
        timeRange,
        data: result.rows,
        summary: {
          totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.event_count), 0),
          eventTypes: [...new Set(result.rows.map(row => row.event_type))],
          timeSpan: timeRange
        }
      };

      // Cache the result
      await cacheService.set(
        cacheService.namespaces.ANALYTICS,
        cacheKey,
        analytics,
        300 // 5 minutes
      );

      const queryTime = Date.now() - startTime;
      if (queryTime > this.slowQueryThreshold) {
        logger.warn(`Slow analytics query: ${queryTime}ms`, { userId, timeRange });
      }

      return analytics;
    } catch (error) {
      logger.error('Analytics query error:', error);
      throw error;
    }
  }

  /**
   * Execute prepared statement with caching
   */
  async executeWithCache(queryName, params, cacheTTL = 300) {
    const query = this.commonQueries[queryName];
    if (!query) {
      throw new Error(`Unknown query: ${queryName}`);
    }

    const cacheKey = `query_${queryName}_${crypto.createHash('md5').update(params.join('|')).digest('hex')}`;
    
    // Check cache
    let cached = await cacheService.get('database', cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    
    try {
      const result = await db.raw(query, params);
      
      // Cache the result
      await cacheService.set('database', cacheKey, result.rows, cacheTTL);
      
      const queryTime = Date.now() - startTime;
      if (queryTime > this.slowQueryThreshold) {
        logger.warn(`Slow prepared query: ${queryName} - ${queryTime}ms`);
      }

      return result.rows;
    } catch (error) {
      logger.error(`Prepared query error (${queryName}):`, error);
      throw error;
    }
  }

  /**
   * Get database performance statistics
   */
  async getPerformanceStats() {
    try {
      // Get connection pool stats
      const poolStats = db.client?.pool ? {
        min: db.client.pool.min,
        max: db.client.pool.max,
        used: db.client.pool.numUsed(),
        free: db.client.pool.numFree(),
        pendingAcquires: db.client.pool.numPendingAcquires(),
        pendingCreates: db.client.pool.numPendingCreates()
      } : {};

      // Get database statistics
      const dbStats = await db.raw(`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `);

      // Get slow query info (if pg_stat_statements is enabled)
      let slowQueries = [];
      try {
        const slowQueryResult = await db.raw(`
          SELECT 
            query,
            calls,
            total_time,
            mean_time,
            rows
          FROM pg_stat_statements 
          WHERE mean_time > 1000
          ORDER BY mean_time DESC 
          LIMIT 10
        `);
        slowQueries = slowQueryResult.rows;
      } catch (error) {
        // pg_stat_statements might not be enabled
        logger.debug('pg_stat_statements not available');
      }

      // Get index usage statistics
      const indexStats = await db.raw(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
        LIMIT 20
      `);

      return {
        connectionPool: {
          ...poolStats,
          stats: this.connectionPoolStats
        },
        tableStats: dbStats.rows,
        slowQueries,
        indexStats: indexStats.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting database performance stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Optimize table statistics
   */
  async updateTableStatistics() {
    const tables = [
      'users', 
      'photo_analyses', 
      'generated_bios', 
      'success_metrics', 
      'purchases', 
      'analytics_events'
    ];

    const results = [];
    
    for (const table of tables) {
      try {
        await db.raw(`ANALYZE ${table}`);
        results.push({ table, status: 'success' });
        logger.debug(`Statistics updated for table: ${table}`);
      } catch (error) {
        results.push({ table, status: 'error', error: error.message });
        logger.error(`Failed to update statistics for ${table}:`, error);
      }
    }

    logger.info(`Table statistics update completed: ${results.length} tables processed`);
    return results;
  }

  /**
   * Clean up old analytics data
   */
  async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

    try {
      const result = await db.raw(`
        DELETE FROM analytics_events 
        WHERE created_at < ? 
        AND event_type NOT IN ('purchase', 'registration', 'profile_complete')
      `, [cutoffDate]);

      logger.info(`Cleaned up ${result.rowCount} old analytics records`);
      return result.rowCount;
    } catch (error) {
      logger.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Monitor and alert on database health
   */
  async healthCheck() {
    const health = {
      database: 'healthy',
      connectionPool: 'healthy',
      performance: 'healthy',
      issues: []
    };

    try {
      // Test basic connectivity
      await db.raw('SELECT 1');
      
      // Check connection pool health
      if (db.client?.pool) {
        const pool = db.client.pool;
        const poolUtilization = (pool.numUsed() / pool.max) * 100;
        
        if (poolUtilization > 90) {
          health.connectionPool = 'warning';
          health.issues.push('High connection pool utilization');
        }
        
        if (pool.numPendingAcquires() > 10) {
          health.connectionPool = 'critical';
          health.issues.push('High number of pending connection acquires');
        }
      }

      // Check for long-running queries
      const longQueries = await db.raw(`
        SELECT pid, now() - pg_stat_activity.query_start AS duration, query
        FROM pg_stat_activity
        WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
        AND state = 'active'
      `);

      if (longQueries.rows.length > 0) {
        health.performance = 'warning';
        health.issues.push(`${longQueries.rows.length} long-running queries detected`);
      }

    } catch (error) {
      health.database = 'critical';
      health.issues.push(`Database connectivity error: ${error.message}`);
    }

    return health;
  }
}

module.exports = new DatabaseOptimizationService();