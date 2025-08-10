const os = require('os');
const cluster = require('cluster');
const EventEmitter = require('events');
const logger = require('../config/logger');
const cacheService = require('./advancedCacheService');
const databaseService = require('./databaseOptimizationService');

/**
 * Comprehensive Performance Monitoring Service for Dating Profile Optimizer
 * Specialized for dating app metrics and real-time performance tracking
 */
class PerformanceMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = new Map();
    this.intervalId = null;
    this.monitoringInterval = 30000; // 30 seconds
    this.alertCooldowns = new Map();
    this.alertCooldownTime = 300000; // 5 minutes
    
    // Dating app specific metrics
    this.datingMetrics = {
      userEngagement: {
        profileViews: 0,
        photoUploads: 0,
        bioGenerations: 0,
        matches: 0,
        conversations: 0
      },
      aiPerformance: {
        bioGenerationLatency: [],
        photoAnalysisLatency: [],
        aiSuccessRate: 0,
        aiErrorRate: 0,
        totalAiRequests: 0
      },
      conversionFunnel: {
        registrations: 0,
        profileCompletions: 0,
        firstPhotoUpload: 0,
        firstBioGeneration: 0,
        firstPurchase: 0,
        subscriptions: 0
      },
      systemHealth: {
        responseTime: [],
        errorRate: 0,
        throughput: 0,
        activeUsers: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };

    // Performance thresholds for dating app
    this.thresholds = {
      responseTime: {
        warning: 1000, // 1 second
        critical: 3000 // 3 seconds
      },
      errorRate: {
        warning: 0.05, // 5%
        critical: 0.10 // 10%
      },
      memoryUsage: {
        warning: 0.80, // 80%
        critical: 0.90 // 90%
      },
      cpuUsage: {
        warning: 0.80, // 80%
        critical: 0.90 // 90%
      },
      aiLatency: {
        bioGeneration: {
          warning: 5000, // 5 seconds
          critical: 10000 // 10 seconds
        },
        photoAnalysis: {
          warning: 8000, // 8 seconds
          critical: 15000 // 15 seconds
        }
      },
      conversionRates: {
        profileCompletion: {
          warning: 0.70, // Below 70%
          critical: 0.50 // Below 50%
        },
        bioGeneration: {
          warning: 0.60, // Below 60%
          critical: 0.40 // Below 40%
        }
      }
    };

    this.requestTracker = new Map();
    this.startTime = Date.now();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.intervalId) {
      logger.warn('Performance monitoring already running');
      return;
    }

    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.monitoringInterval);

    // Start real-time metric collection
    this.startRealTimeTracking();
    
    logger.info('Performance monitoring started for dating app');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    logger.info('Performance monitoring stopped');
  }

  /**
   * Start real-time tracking of requests
   */
  startRealTimeTracking() {
    // Track request start
    this.trackRequestStart = (req) => {
      const requestId = `${req.method}_${req.path}_${Date.now()}_${Math.random()}`;
      this.requestTracker.set(requestId, {
        startTime: Date.now(),
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      req.performanceRequestId = requestId;
    };

    // Track request end
    this.trackRequestEnd = (req, res) => {
      const requestId = req.performanceRequestId;
      if (!requestId || !this.requestTracker.has(requestId)) {
        return;
      }

      const requestData = this.requestTracker.get(requestId);
      const duration = Date.now() - requestData.startTime;
      const isError = res.statusCode >= 400;

      // Update metrics
      this.recordResponseTime(duration);
      this.recordThroughput();
      
      if (isError) {
        this.recordError(req, res, duration);
      }

      // Track dating-specific endpoints
      this.trackDatingEndpoints(req.path, duration, isError, req.user?.id);

      // Clean up
      this.requestTracker.delete(requestId);
    };
  }

  /**
   * Track dating app specific endpoints
   */
  trackDatingEndpoints(path, duration, isError, userId) {
    // Bio generation tracking
    if (path.includes('/bios/generate')) {
      this.datingMetrics.userEngagement.bioGenerations++;
      this.datingMetrics.aiPerformance.bioGenerationLatency.push(duration);
      this.datingMetrics.aiPerformance.totalAiRequests++;
      
      if (isError) {
        this.datingMetrics.aiPerformance.aiErrorRate++;
      }
    }

    // Photo analysis tracking
    if (path.includes('/photos/analyze')) {
      this.datingMetrics.aiPerformance.photoAnalysisLatency.push(duration);
      this.datingMetrics.aiPerformance.totalAiRequests++;
      
      if (isError) {
        this.datingMetrics.aiPerformance.aiErrorRate++;
      }
    }

    // Photo upload tracking
    if (path.includes('/photos') && !path.includes('analyze')) {
      this.datingMetrics.userEngagement.photoUploads++;
    }

    // Profile view tracking
    if (path.includes('/profiles') && path.includes('GET')) {
      this.datingMetrics.userEngagement.profileViews++;
    }

    // Purchase tracking
    if (path.includes('/payments') || path.includes('/purchases')) {
      this.trackConversionEvent('purchase', userId);
    }
  }

  /**
   * Track conversion funnel events
   */
  trackConversionEvent(eventType, userId) {
    switch (eventType) {
      case 'registration':
        this.datingMetrics.conversionFunnel.registrations++;
        break;
      case 'profile_completion':
        this.datingMetrics.conversionFunnel.profileCompletions++;
        break;
      case 'first_photo':
        this.datingMetrics.conversionFunnel.firstPhotoUpload++;
        break;
      case 'first_bio':
        this.datingMetrics.conversionFunnel.firstBioGeneration++;
        break;
      case 'purchase':
        this.datingMetrics.conversionFunnel.firstPurchase++;
        break;
      case 'subscription':
        this.datingMetrics.conversionFunnel.subscriptions++;
        break;
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(duration) {
    this.datingMetrics.systemHealth.responseTime.push(duration);
    
    // Keep only last 1000 entries
    if (this.datingMetrics.systemHealth.responseTime.length > 1000) {
      this.datingMetrics.systemHealth.responseTime = 
        this.datingMetrics.systemHealth.responseTime.slice(-1000);
    }
  }

  /**
   * Record throughput
   */
  recordThroughput() {
    this.datingMetrics.systemHealth.throughput++;
  }

  /**
   * Record error
   */
  recordError(req, res, duration) {
    this.datingMetrics.systemHealth.errorRate++;
    
    logger.warn('API Error recorded', {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectMetrics() {
    try {
      // System metrics
      const systemMetrics = this.collectSystemMetrics();
      
      // Database metrics
      const dbMetrics = await this.collectDatabaseMetrics();
      
      // Cache metrics
      const cacheMetrics = await this.collectCacheMetrics();
      
      // Dating app specific metrics
      const datingMetrics = this.calculateDatingMetrics();
      
      // AI performance metrics
      const aiMetrics = this.calculateAIMetrics();

      const allMetrics = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        system: systemMetrics,
        database: dbMetrics,
        cache: cacheMetrics,
        dating: datingMetrics,
        ai: aiMetrics
      };

      // Store metrics
      this.metrics.set(Date.now(), allMetrics);
      
      // Keep only last 24 hours of metrics (assuming 30s intervals = 2880 entries)
      if (this.metrics.size > 2880) {
        const oldestKey = Math.min(...this.metrics.keys());
        this.metrics.delete(oldestKey);
      }

      // Cache current metrics for API access
      await cacheService.set(
        cacheService.namespaces.ANALYTICS,
        'current_performance_metrics',
        allMetrics,
        60 // 1 minute cache
      );

      // Check for alerts
      this.checkAlerts(allMetrics);

      // Emit metrics for real-time monitoring
      this.emit('metrics', allMetrics);
      
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
    }
  }

  /**
   * Collect system performance metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        heapUtilization: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        utilization: this.calculateCPUUsage()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        loadAvg: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        title: process.title,
        argv: process.argv.length,
        execPath: process.execPath.length
      }
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      Object.values(cpu.times).forEach(tick => totalTick += tick);
      totalIdle += cpu.times.idle;
    });

    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  /**
   * Collect database performance metrics
   */
  async collectDatabaseMetrics() {
    try {
      const dbStats = await databaseService.getPerformanceStats();
      return {
        connectionPool: dbStats.connectionPool,
        slowQueries: dbStats.slowQueries?.length || 0,
        indexEfficiency: this.calculateIndexEfficiency(dbStats.indexStats),
        healthStatus: (await databaseService.healthCheck()).database
      };
    } catch (error) {
      logger.error('Error collecting database metrics:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate index efficiency from database stats
   */
  calculateIndexEfficiency(indexStats) {
    if (!indexStats || indexStats.length === 0) {
      return 100; // Assume good if no data
    }

    const totalReads = indexStats.reduce((sum, idx) => sum + (idx.idx_tup_read || 0), 0);
    const totalFetches = indexStats.reduce((sum, idx) => sum + (idx.idx_tup_fetch || 0), 0);
    
    return totalReads > 0 ? (totalFetches / totalReads) * 100 : 100;
  }

  /**
   * Collect cache performance metrics
   */
  async collectCacheMetrics() {
    try {
      const cacheStats = await cacheService.getStats();
      return {
        status: cacheStats.error ? 'error' : 'healthy',
        circuitBreaker: cacheStats.circuitBreaker,
        keyspace: this.parseCacheKeyspace(cacheStats.keyspace),
        memory: this.parseCacheMemory(cacheStats.memory)
      };
    } catch (error) {
      logger.error('Error collecting cache metrics:', error);
      return { error: error.message };
    }
  }

  /**
   * Parse Redis keyspace info
   */
  parseCacheKeyspace(keyspaceInfo) {
    if (!keyspaceInfo) return {};
    
    const lines = keyspaceInfo.split('\r\n');
    const parsed = {};
    
    lines.forEach(line => {
      if (line.startsWith('db0:')) {
        const matches = line.match(/keys=(\d+),expires=(\d+),avg_ttl=(\d+)/);
        if (matches) {
          parsed.totalKeys = parseInt(matches[1]);
          parsed.keysWithExpiry = parseInt(matches[2]);
          parsed.avgTTL = parseInt(matches[3]);
        }
      }
    });
    
    return parsed;
  }

  /**
   * Parse Redis memory info
   */
  parseCacheMemory(memoryInfo) {
    if (!memoryInfo) return {};
    
    const lines = memoryInfo.split('\r\n');
    const parsed = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key === 'used_memory') {
        parsed.usedMemory = parseInt(value);
      } else if (key === 'used_memory_human') {
        parsed.usedMemoryHuman = value;
      } else if (key === 'used_memory_peak') {
        parsed.peakMemory = parseInt(value);
      }
    });
    
    return parsed;
  }

  /**
   * Calculate dating app specific metrics
   */
  calculateDatingMetrics() {
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;
    
    // Calculate conversion rates
    const conversionRates = {
      profileCompletion: this.datingMetrics.conversionFunnel.profileCompletions / 
        Math.max(this.datingMetrics.conversionFunnel.registrations, 1),
      photoUpload: this.datingMetrics.conversionFunnel.firstPhotoUpload / 
        Math.max(this.datingMetrics.conversionFunnel.profileCompletions, 1),
      bioGeneration: this.datingMetrics.conversionFunnel.firstBioGeneration / 
        Math.max(this.datingMetrics.conversionFunnel.firstPhotoUpload, 1),
      purchase: this.datingMetrics.conversionFunnel.firstPurchase / 
        Math.max(this.datingMetrics.conversionFunnel.firstBioGeneration, 1)
    };

    // Calculate engagement rates
    const engagement = {
      ...this.datingMetrics.userEngagement,
      avgProfileViewsPerUser: this.datingMetrics.userEngagement.profileViews / 
        Math.max(this.datingMetrics.systemHealth.activeUsers, 1),
      avgPhotosPerUser: this.datingMetrics.userEngagement.photoUploads / 
        Math.max(this.datingMetrics.systemHealth.activeUsers, 1)
    };

    // Reset counters for next period
    this.resetPeriodCounters();

    return {
      engagement,
      conversions: this.datingMetrics.conversionFunnel,
      conversionRates,
      activeUsers: this.datingMetrics.systemHealth.activeUsers
    };
  }

  /**
   * Calculate AI performance metrics
   */
  calculateAIMetrics() {
    const bioLatencies = this.datingMetrics.aiPerformance.bioGenerationLatency;
    const photoLatencies = this.datingMetrics.aiPerformance.photoAnalysisLatency;
    
    const aiMetrics = {
      bioGeneration: {
        avgLatency: bioLatencies.length > 0 ? 
          bioLatencies.reduce((a, b) => a + b, 0) / bioLatencies.length : 0,
        p95Latency: this.calculatePercentile(bioLatencies, 95),
        p99Latency: this.calculatePercentile(bioLatencies, 99),
        throughput: bioLatencies.length
      },
      photoAnalysis: {
        avgLatency: photoLatencies.length > 0 ? 
          photoLatencies.reduce((a, b) => a + b, 0) / photoLatencies.length : 0,
        p95Latency: this.calculatePercentile(photoLatencies, 95),
        p99Latency: this.calculatePercentile(photoLatencies, 99),
        throughput: photoLatencies.length
      },
      overall: {
        totalRequests: this.datingMetrics.aiPerformance.totalAiRequests,
        errorRate: this.datingMetrics.aiPerformance.totalAiRequests > 0 ?
          this.datingMetrics.aiPerformance.aiErrorRate / this.datingMetrics.aiPerformance.totalAiRequests : 0,
        successRate: this.datingMetrics.aiPerformance.totalAiRequests > 0 ?
          1 - (this.datingMetrics.aiPerformance.aiErrorRate / this.datingMetrics.aiPerformance.totalAiRequests) : 1
      }
    };

    // Reset AI latency arrays for next period
    this.datingMetrics.aiPerformance.bioGenerationLatency = [];
    this.datingMetrics.aiPerformance.photoAnalysisLatency = [];
    
    return aiMetrics;
  }

  /**
   * Calculate percentile from array of values
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Reset period-based counters
   */
  resetPeriodCounters() {
    this.datingMetrics.systemHealth.throughput = 0;
    this.datingMetrics.systemHealth.errorRate = 0;
  }

  /**
   * Check for performance alerts
   */
  checkAlerts(metrics) {
    const alerts = [];

    // Response time alerts
    const avgResponseTime = metrics.system.memory.heapUtilization > 0 ? 
      this.calculateAverageResponseTime() : 0;
    
    if (avgResponseTime > this.thresholds.responseTime.critical) {
      alerts.push({
        type: 'critical',
        metric: 'response_time',
        value: avgResponseTime,
        threshold: this.thresholds.responseTime.critical,
        message: `Critical: Average response time is ${avgResponseTime}ms`
      });
    } else if (avgResponseTime > this.thresholds.responseTime.warning) {
      alerts.push({
        type: 'warning',
        metric: 'response_time',
        value: avgResponseTime,
        threshold: this.thresholds.responseTime.warning,
        message: `Warning: Average response time is ${avgResponseTime}ms`
      });
    }

    // Memory usage alerts
    const memoryUsage = metrics.system.memory.heapUtilization / 100;
    if (memoryUsage > this.thresholds.memoryUsage.critical) {
      alerts.push({
        type: 'critical',
        metric: 'memory_usage',
        value: memoryUsage,
        threshold: this.thresholds.memoryUsage.critical,
        message: `Critical: Memory usage is ${(memoryUsage * 100).toFixed(1)}%`
      });
    } else if (memoryUsage > this.thresholds.memoryUsage.warning) {
      alerts.push({
        type: 'warning',
        metric: 'memory_usage',
        value: memoryUsage,
        threshold: this.thresholds.memoryUsage.warning,
        message: `Warning: Memory usage is ${(memoryUsage * 100).toFixed(1)}%`
      });
    }

    // AI performance alerts
    if (metrics.ai && metrics.ai.bioGeneration.avgLatency > this.thresholds.aiLatency.bioGeneration.critical) {
      alerts.push({
        type: 'critical',
        metric: 'ai_bio_latency',
        value: metrics.ai.bioGeneration.avgLatency,
        threshold: this.thresholds.aiLatency.bioGeneration.critical,
        message: `Critical: Bio generation latency is ${metrics.ai.bioGeneration.avgLatency}ms`
      });
    }

    // Conversion rate alerts
    if (metrics.dating && metrics.dating.conversionRates.profileCompletion < this.thresholds.conversionRates.profileCompletion.critical) {
      alerts.push({
        type: 'critical',
        metric: 'conversion_rate',
        value: metrics.dating.conversionRates.profileCompletion,
        threshold: this.thresholds.conversionRates.profileCompletion.critical,
        message: `Critical: Profile completion rate is ${(metrics.dating.conversionRates.profileCompletion * 100).toFixed(1)}%`
      });
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Process performance alert
   */
  processAlert(alert) {
    const alertKey = `${alert.metric}_${alert.type}`;
    const now = Date.now();
    
    // Check cooldown
    if (this.alertCooldowns.has(alertKey)) {
      const lastAlert = this.alertCooldowns.get(alertKey);
      if (now - lastAlert < this.alertCooldownTime) {
        return; // Skip alert due to cooldown
      }
    }

    // Store alert
    this.alerts.set(now, alert);
    this.alertCooldowns.set(alertKey, now);
    
    // Log alert
    logger[alert.type === 'critical' ? 'error' : 'warn']('Performance Alert', alert);
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Keep only last 100 alerts
    if (this.alerts.size > 100) {
      const oldestKey = Math.min(...this.alerts.keys());
      this.alerts.delete(oldestKey);
    }
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime() {
    const responseTimes = this.datingMetrics.systemHealth.responseTime;
    if (responseTimes.length === 0) return 0;
    
    return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics() {
    const latestTimestamp = Math.max(...this.metrics.keys());
    return this.metrics.get(latestTimestamp) || null;
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(timeRange = '1h') {
    const now = Date.now();
    let startTime;
    
    switch (timeRange) {
      case '15m': startTime = now - (15 * 60 * 1000); break;
      case '1h': startTime = now - (60 * 60 * 1000); break;
      case '6h': startTime = now - (6 * 60 * 60 * 1000); break;
      case '24h': startTime = now - (24 * 60 * 60 * 1000); break;
      default: startTime = now - (60 * 60 * 1000); break;
    }
    
    const filteredMetrics = [];
    for (const [timestamp, metrics] of this.metrics.entries()) {
      if (timestamp >= startTime) {
        filteredMetrics.push({ timestamp, ...metrics });
      }
    }
    
    return filteredMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const now = Date.now();
    const recentAlerts = [];
    
    for (const [timestamp, alert] of this.alerts.entries()) {
      if (now - timestamp < this.alertCooldownTime) {
        recentAlerts.push({ timestamp, ...alert });
      }
    }
    
    return recentAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generate performance report
   */
  generateReport(timeRange = '24h') {
    const metrics = this.getHistoricalMetrics(timeRange);
    const current = this.getCurrentMetrics();
    const alerts = this.getActiveAlerts();
    
    if (!current || metrics.length === 0) {
      return { error: 'Insufficient data for report generation' };
    }

    // Calculate aggregations
    const avgResponseTime = this.calculateAverageResponseTime();
    const p95ResponseTime = this.calculatePercentile(
      this.datingMetrics.systemHealth.responseTime, 95
    );
    
    return {
      summary: {
        timeRange,
        dataPoints: metrics.length,
        currentStatus: alerts.filter(a => a.type === 'critical').length === 0 ? 'healthy' : 'critical',
        avgResponseTime,
        p95ResponseTime,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.type === 'critical').length
      },
      current,
      trends: {
        responseTime: metrics.map(m => ({
          timestamp: m.timestamp,
          value: this.calculateAverageResponseTime()
        })),
        memoryUsage: metrics.map(m => ({
          timestamp: m.timestamp,
          value: m.system?.memory?.heapUtilization || 0
        })),
        throughput: metrics.map(m => ({
          timestamp: m.timestamp,
          value: m.dating?.engagement?.profileViews || 0
        }))
      },
      alerts: alerts.slice(0, 10), // Last 10 alerts
      recommendations: this.generateRecommendations(current, alerts)
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(currentMetrics, alerts) {
    const recommendations = [];
    
    if (!currentMetrics) return recommendations;

    // Memory recommendations
    if (currentMetrics.system?.memory?.heapUtilization > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Consider increasing memory allocation or implementing garbage collection optimization'
      });
    }

    // AI performance recommendations
    if (currentMetrics.ai?.bioGeneration?.avgLatency > 5000) {
      recommendations.push({
        type: 'ai_performance',
        priority: 'medium',
        message: 'Bio generation latency is high. Consider implementing batch processing or upgrading AI service tier'
      });
    }

    // Database recommendations
    if (currentMetrics.database?.slowQueries > 10) {
      recommendations.push({
        type: 'database',
        priority: 'high',
        message: 'High number of slow queries detected. Review query optimization and indexing strategy'
      });
    }

    // Conversion rate recommendations
    if (currentMetrics.dating?.conversionRates?.profileCompletion < 0.7) {
      recommendations.push({
        type: 'business',
        priority: 'medium',
        message: 'Profile completion rate is below target. Consider improving onboarding flow'
      });
    }

    return recommendations;
  }

  /**
   * Export metrics to external monitoring systems
   */
  async exportMetrics(format = 'json') {
    const current = this.getCurrentMetrics();
    if (!current) return null;

    switch (format) {
      case 'prometheus':
        return this.formatPrometheusMetrics(current);
      case 'datadog':
        return this.formatDatadogMetrics(current);
      case 'json':
      default:
        return current;
    }
  }

  /**
   * Format metrics for Prometheus
   */
  formatPrometheusMetrics(metrics) {
    const prometheusMetrics = [];
    
    // System metrics
    prometheusMetrics.push(
      `# HELP dating_app_memory_heap_used_bytes Memory heap used in bytes`,
      `# TYPE dating_app_memory_heap_used_bytes gauge`,
      `dating_app_memory_heap_used_bytes ${metrics.system.memory.heapUsed}`
    );
    
    // Response time metrics
    prometheusMetrics.push(
      `# HELP dating_app_response_time_avg_ms Average response time in milliseconds`,
      `# TYPE dating_app_response_time_avg_ms gauge`,
      `dating_app_response_time_avg_ms ${this.calculateAverageResponseTime()}`
    );
    
    // Dating specific metrics
    prometheusMetrics.push(
      `# HELP dating_app_bio_generations_total Total bio generations`,
      `# TYPE dating_app_bio_generations_total counter`,
      `dating_app_bio_generations_total ${metrics.dating.engagement.bioGenerations}`
    );
    
    return prometheusMetrics.join('\n');
  }

  /**
   * Format metrics for Datadog
   */
  formatDatadogMetrics(metrics) {
    return {
      series: [
        {
          metric: 'dating.app.memory.heap.utilization',
          type: 'gauge',
          points: [[Date.now() / 1000, metrics.system.memory.heapUtilization]]
        },
        {
          metric: 'dating.app.response.time.avg',
          type: 'gauge',
          points: [[Date.now() / 1000, this.calculateAverageResponseTime()]]
        },
        {
          metric: 'dating.app.bio.generations',
          type: 'count',
          points: [[Date.now() / 1000, metrics.dating.engagement.bioGenerations]]
        }
      ]
    };
  }

  /**
   * Health check for monitoring service
   */
  healthCheck() {
    return {
      status: this.intervalId ? 'running' : 'stopped',
      metricsCollected: this.metrics.size,
      activeAlerts: this.alerts.size,
      uptime: Date.now() - this.startTime,
      lastCollection: this.metrics.size > 0 ? Math.max(...this.metrics.keys()) : null
    };
  }
}

module.exports = new PerformanceMonitoringService();