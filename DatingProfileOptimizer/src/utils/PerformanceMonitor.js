import { InteractionManager, PixelRatio, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * Mobile Performance Monitor for Dating Profile Optimizer
 * Specialized for React Native dating app performance tracking
 */
class MobilePerformanceMonitor {
  constructor() {
    this.isInitialized = false;
    this.startupTime = Date.now();
    this.metrics = {
      startup: {},
      memory: [],
      rendering: [],
      navigation: [],
      userInteractions: [],
      networkRequests: [],
      imageLoading: [],
      aiOperations: []
    };
    
    // Dating app specific performance thresholds
    this.thresholds = {
      startup: {
        appReady: 3000, // 3 seconds
        firstScreen: 5000, // 5 seconds
        critical: 8000 // 8 seconds
      },
      rendering: {
        frameTime: 16.67, // 60 FPS target
        warning: 33.33, // 30 FPS warning
        critical: 66.67 // 15 FPS critical
      },
      memory: {
        warning: 200 * 1024 * 1024, // 200MB
        critical: 400 * 1024 * 1024 // 400MB
      },
      navigation: {
        screenTransition: 300, // 300ms
        tabSwitch: 150, // 150ms
        warning: 500, // 500ms warning
        critical: 1000 // 1000ms critical
      },
      imageLoading: {
        thumbnail: 500, // 500ms for thumbnails
        profile: 1500, // 1.5s for profile photos
        gallery: 2000, // 2s for gallery images
        warning: 3000, // 3s warning
        critical: 5000 // 5s critical
      },
      aiProcessing: {
        bioGeneration: 5000, // 5s for bio generation
        photoAnalysis: 8000, // 8s for photo analysis
        warning: 10000, // 10s warning
        critical: 15000 // 15s critical
      }
    };

    this.performanceObserver = null;
    this.memoryMonitorInterval = null;
    this.renderingFrameTracker = null;
    this.activeTransitions = new Map();
    this.deviceCapabilities = {};
  }

  /**
   * Initialize performance monitoring
   */
  async initialize() {
    if (this.isInitialized) {
      logger.debug('Performance monitor already initialized');
      return;
    }

    try {
      // Collect device capabilities for context
      this.deviceCapabilities = await this.collectDeviceCapabilities();
      
      // Start monitoring systems
      this.startMemoryMonitoring();
      this.startRenderingMonitoring();
      this.setupNavigationTracking();
      
      // Track startup completion
      this.trackStartupMetrics();
      
      this.isInitialized = true;
      logger.info('Mobile performance monitor initialized');
      
    } catch (error) {
      logger.error('Failed to initialize performance monitor:', error);
    }
  }

  /**
   * Collect device capabilities for performance context
   */
  async collectDeviceCapabilities() {
    try {
      const [
        model,
        totalMemory,
        availableMemory,
        systemName,
        systemVersion,
        isTablet,
        deviceType,
        apiLevel
      ] = await Promise.all([
        DeviceInfo.getModel(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getAvailableMemory(),
        DeviceInfo.getSystemName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.isTablet(),
        DeviceInfo.getDeviceType(),
        DeviceInfo.getApiLevel()
      ]);

      const { width, height } = Dimensions.get('window');
      const pixelDensity = PixelRatio.get();
      
      return {
        model,
        totalMemory,
        availableMemory,
        systemName,
        systemVersion,
        isTablet,
        deviceType,
        apiLevel,
        screenWidth: width,
        screenHeight: height,
        pixelDensity,
        screenResolution: `${width * pixelDensity}x${height * pixelDensity}`,
        performanceClass: this.calculatePerformanceClass(totalMemory, apiLevel, model)
      };
    } catch (error) {
      logger.error('Error collecting device capabilities:', error);
      return {};
    }
  }

  /**
   * Calculate device performance class for adaptive optimizations
   */
  calculatePerformanceClass(totalMemory, apiLevel, model) {
    let score = 0;
    
    // Memory scoring
    if (totalMemory > 8 * 1024 * 1024 * 1024) score += 40; // 8GB+
    else if (totalMemory > 6 * 1024 * 1024 * 1024) score += 35; // 6GB+
    else if (totalMemory > 4 * 1024 * 1024 * 1024) score += 30; // 4GB+
    else if (totalMemory > 3 * 1024 * 1024 * 1024) score += 20; // 3GB+
    else if (totalMemory > 2 * 1024 * 1024 * 1024) score += 10; // 2GB+
    
    // API level scoring (Android) or system version (iOS)
    if (apiLevel) {
      if (apiLevel >= 30) score += 30; // Android 11+
      else if (apiLevel >= 28) score += 25; // Android 9+
      else if (apiLevel >= 26) score += 20; // Android 8+
      else if (apiLevel >= 24) score += 15; // Android 7+
      else score += 5;
    } else {
      // iOS scoring based on model patterns
      if (model.includes('iPhone 13') || model.includes('iPhone 14') || model.includes('iPhone 15')) score += 30;
      else if (model.includes('iPhone 11') || model.includes('iPhone 12')) score += 25;
      else if (model.includes('iPhone X') || model.includes('iPhone 8')) score += 20;
      else score += 10;
    }
    
    // Device type scoring
    if (model.toLowerCase().includes('pro')) score += 10;
    
    if (score >= 70) return 'high';
    else if (score >= 50) return 'medium';
    else if (score >= 30) return 'low';
    else return 'minimal';
  }

  /**
   * Track startup performance metrics
   */
  trackStartupMetrics() {
    const startupMetrics = {
      startTime: this.startupTime,
      deviceCapabilities: this.deviceCapabilities
    };

    // Track when JavaScript execution begins
    startupMetrics.jsInitTime = Date.now();
    startupMetrics.jsInitDuration = startupMetrics.jsInitTime - this.startupTime;

    // Track when first screen is ready
    InteractionManager.runAfterInteractions(() => {
      startupMetrics.firstScreenTime = Date.now();
      startupMetrics.firstScreenDuration = startupMetrics.firstScreenTime - this.startupTime;
      
      // Track app ready state
      setTimeout(() => {
        startupMetrics.appReadyTime = Date.now();
        startupMetrics.appReadyDuration = startupMetrics.appReadyTime - this.startupTime;
        
        this.metrics.startup = startupMetrics;
        this.evaluateStartupPerformance(startupMetrics);
        
        logger.info('Startup performance tracked', {
          jsInit: startupMetrics.jsInitDuration,
          firstScreen: startupMetrics.firstScreenDuration,
          appReady: startupMetrics.appReadyDuration
        });
      }, 100);
    });
  }

  /**
   * Evaluate startup performance against thresholds
   */
  evaluateStartupPerformance(metrics) {
    const issues = [];
    
    if (metrics.appReadyDuration > this.thresholds.startup.critical) {
      issues.push({
        type: 'critical',
        metric: 'startup_time',
        value: metrics.appReadyDuration,
        threshold: this.thresholds.startup.critical,
        message: 'Critical startup time detected'
      });
    } else if (metrics.appReadyDuration > this.thresholds.startup.appReady) {
      issues.push({
        type: 'warning',
        metric: 'startup_time',
        value: metrics.appReadyDuration,
        threshold: this.thresholds.startup.appReady,
        message: 'Slow startup time detected'
      });
    }

    if (issues.length > 0) {
      this.reportPerformanceIssues('startup', issues);
    }
  }

  /**
   * Start memory usage monitoring
   */
  startMemoryMonitoring() {
    this.memoryMonitorInterval = setInterval(async () => {
      try {
        const memoryInfo = await this.collectMemoryMetrics();
        this.metrics.memory.push(memoryInfo);
        
        // Keep only last 100 memory samples
        if (this.metrics.memory.length > 100) {
          this.metrics.memory = this.metrics.memory.slice(-100);
        }
        
        // Check for memory issues
        this.evaluateMemoryUsage(memoryInfo);
        
      } catch (error) {
        logger.error('Error collecting memory metrics:', error);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Collect memory usage metrics
   */
  async collectMemoryMetrics() {
    try {
      const [availableMemory, totalMemory, usedMemory] = await Promise.all([
        DeviceInfo.getAvailableMemory(),
        DeviceInfo.getTotalMemory(),
        DeviceInfo.getUsedMemory()
      ]);

      return {
        timestamp: Date.now(),
        availableMemory,
        totalMemory,
        usedMemory,
        memoryPressure: (usedMemory / totalMemory) * 100,
        appMemoryEstimate: totalMemory - availableMemory // Rough estimate
      };
    } catch (error) {
      logger.error('Error collecting memory metrics:', error);
      return {
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Evaluate memory usage for performance issues
   */
  evaluateMemoryUsage(memoryInfo) {
    if (memoryInfo.error) return;

    const issues = [];
    
    if (memoryInfo.appMemoryEstimate > this.thresholds.memory.critical) {
      issues.push({
        type: 'critical',
        metric: 'memory_usage',
        value: memoryInfo.appMemoryEstimate,
        threshold: this.thresholds.memory.critical,
        message: 'Critical memory usage detected'
      });
    } else if (memoryInfo.appMemoryEstimate > this.thresholds.memory.warning) {
      issues.push({
        type: 'warning',
        metric: 'memory_usage',
        value: memoryInfo.appMemoryEstimate,
        threshold: this.thresholds.memory.warning,
        message: 'High memory usage detected'
      });
    }

    if (issues.length > 0) {
      this.reportPerformanceIssues('memory', issues);
    }
  }

  /**
   * Start rendering performance monitoring
   */
  startRenderingMonitoring() {
    // Note: In a real implementation, you would use libraries like:
    // - Flipper for detailed frame analysis
    // - React Native Performance addon
    // - Custom native modules for frame time tracking
    
    // Simplified rendering monitoring
    this.renderingFrameTracker = setInterval(() => {
      this.trackRenderingFrame();
    }, 1000); // Every second
  }

  /**
   * Track rendering frame performance (simplified)
   */
  trackRenderingFrame() {
    const frameMetric = {
      timestamp: Date.now(),
      // In real implementation, this would be actual frame time measurement
      estimatedFrameTime: this.estimateFrameTime(),
      droppedFrames: 0 // Would be calculated from actual frame data
    };

    this.metrics.rendering.push(frameMetric);
    
    // Keep only last 60 samples (1 minute at 1 second intervals)
    if (this.metrics.rendering.length > 60) {
      this.metrics.rendering = this.metrics.rendering.slice(-60);
    }
  }

  /**
   * Estimate frame time based on system load (simplified)
   */
  estimateFrameTime() {
    // This is a simplified estimation - real implementation would measure actual frames
    const baseFrameTime = 16.67; // 60 FPS target
    const systemLoad = Math.random(); // Would be actual system metrics
    
    return baseFrameTime * (1 + systemLoad * 0.5);
  }

  /**
   * Track navigation performance
   */
  trackNavigation(screenName, startTime) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const navigationMetric = {
      timestamp: endTime,
      screenName,
      duration,
      startTime,
      endTime
    };

    this.metrics.navigation.push(navigationMetric);
    
    // Keep only last 50 navigation events
    if (this.metrics.navigation.length > 50) {
      this.metrics.navigation = this.metrics.navigation.slice(-50);
    }

    // Evaluate navigation performance
    this.evaluateNavigationPerformance(navigationMetric);
    
    logger.debug(`Navigation to ${screenName}: ${duration}ms`);
  }

  /**
   * Evaluate navigation performance
   */
  evaluateNavigationPerformance(metric) {
    const issues = [];
    
    if (metric.duration > this.thresholds.navigation.critical) {
      issues.push({
        type: 'critical',
        metric: 'navigation_time',
        value: metric.duration,
        threshold: this.thresholds.navigation.critical,
        screen: metric.screenName,
        message: `Critical navigation time to ${metric.screenName}`
      });
    } else if (metric.duration > this.thresholds.navigation.warning) {
      issues.push({
        type: 'warning',
        metric: 'navigation_time',
        value: metric.duration,
        threshold: this.thresholds.navigation.warning,
        screen: metric.screenName,
        message: `Slow navigation to ${metric.screenName}`
      });
    }

    if (issues.length > 0) {
      this.reportPerformanceIssues('navigation', issues);
    }
  }

  /**
   * Setup navigation performance tracking
   */
  setupNavigationTracking() {
    // This would integrate with React Navigation to automatically track screen transitions
    // For now, it provides methods that can be called manually
    
    this.startTransition = (screenName) => {
      const transitionId = `${screenName}_${Date.now()}`;
      this.activeTransitions.set(transitionId, {
        screenName,
        startTime: Date.now()
      });
      return transitionId;
    };

    this.endTransition = (transitionId) => {
      if (this.activeTransitions.has(transitionId)) {
        const transition = this.activeTransitions.get(transitionId);
        this.trackNavigation(transition.screenName, transition.startTime);
        this.activeTransitions.delete(transitionId);
      }
    };
  }

  /**
   * Track user interaction performance
   */
  trackUserInteraction(interactionType, element, startTime, endTime) {
    const duration = endTime - startTime;
    
    const interactionMetric = {
      timestamp: endTime,
      type: interactionType,
      element,
      duration,
      startTime,
      endTime
    };

    this.metrics.userInteractions.push(interactionMetric);
    
    // Keep only last 100 interactions
    if (this.metrics.userInteractions.length > 100) {
      this.metrics.userInteractions = this.metrics.userInteractions.slice(-100);
    }

    logger.debug(`${interactionType} on ${element}: ${duration}ms`);
  }

  /**
   * Track image loading performance (critical for dating apps)
   */
  trackImageLoading(imageType, imageUrl, startTime, endTime, success = true) {
    const duration = endTime - startTime;
    
    const imageMetric = {
      timestamp: endTime,
      type: imageType, // 'thumbnail', 'profile', 'gallery'
      url: imageUrl,
      duration,
      success,
      startTime,
      endTime
    };

    this.metrics.imageLoading.push(imageMetric);
    
    // Keep only last 200 image loading events
    if (this.metrics.imageLoading.length > 200) {
      this.metrics.imageLoading = this.metrics.imageLoading.slice(-200);
    }

    // Evaluate image loading performance
    this.evaluateImageLoadingPerformance(imageMetric);
    
    logger.debug(`Image ${imageType} loading: ${duration}ms, success: ${success}`);
  }

  /**
   * Evaluate image loading performance
   */
  evaluateImageLoadingPerformance(metric) {
    if (!metric.success) {
      this.reportPerformanceIssues('image_loading', [{
        type: 'error',
        metric: 'image_load_failure',
        imageType: metric.type,
        url: metric.url,
        message: `Failed to load ${metric.type} image`
      }]);
      return;
    }

    const threshold = this.thresholds.imageLoading[metric.type] || this.thresholds.imageLoading.warning;
    const issues = [];
    
    if (metric.duration > this.thresholds.imageLoading.critical) {
      issues.push({
        type: 'critical',
        metric: 'image_load_time',
        value: metric.duration,
        threshold: this.thresholds.imageLoading.critical,
        imageType: metric.type,
        message: `Critical image loading time for ${metric.type}`
      });
    } else if (metric.duration > threshold) {
      issues.push({
        type: 'warning',
        metric: 'image_load_time',
        value: metric.duration,
        threshold: threshold,
        imageType: metric.type,
        message: `Slow image loading for ${metric.type}`
      });
    }

    if (issues.length > 0) {
      this.reportPerformanceIssues('image_loading', issues);
    }
  }

  /**
   * Track AI operation performance (bio generation, photo analysis)
   */
  trackAIOperation(operationType, operationId, startTime, endTime, success = true, metadata = {}) {
    const duration = endTime - startTime;
    
    const aiMetric = {
      timestamp: endTime,
      type: operationType, // 'bio_generation', 'photo_analysis'
      operationId,
      duration,
      success,
      metadata,
      startTime,
      endTime
    };

    this.metrics.aiOperations.push(aiMetric);
    
    // Keep only last 100 AI operations
    if (this.metrics.aiOperations.length > 100) {
      this.metrics.aiOperations = this.metrics.aiOperations.slice(-100);
    }

    // Evaluate AI operation performance
    this.evaluateAIOperationPerformance(aiMetric);
    
    logger.debug(`AI ${operationType}: ${duration}ms, success: ${success}`);
  }

  /**
   * Evaluate AI operation performance
   */
  evaluateAIOperationPerformance(metric) {
    if (!metric.success) {
      this.reportPerformanceIssues('ai_operations', [{
        type: 'error',
        metric: 'ai_operation_failure',
        operationType: metric.type,
        operationId: metric.operationId,
        message: `AI ${metric.type} operation failed`
      }]);
      return;
    }

    const threshold = this.thresholds.aiProcessing[metric.type] || this.thresholds.aiProcessing.warning;
    const issues = [];
    
    if (metric.duration > this.thresholds.aiProcessing.critical) {
      issues.push({
        type: 'critical',
        metric: 'ai_operation_time',
        value: metric.duration,
        threshold: this.thresholds.aiProcessing.critical,
        operationType: metric.type,
        message: `Critical AI ${metric.type} time`
      });
    } else if (metric.duration > threshold) {
      issues.push({
        type: 'warning',
        metric: 'ai_operation_time',
        value: metric.duration,
        threshold: threshold,
        operationType: metric.type,
        message: `Slow AI ${metric.type} operation`
      });
    }

    if (issues.length > 0) {
      this.reportPerformanceIssues('ai_operations', issues);
    }
  }

  /**
   * Report performance issues
   */
  reportPerformanceIssues(category, issues) {
    issues.forEach(issue => {
      const logLevel = issue.type === 'critical' ? 'error' : 'warn';
      logger[logLevel](`Performance Issue [${category}]:`, issue);
    });

    // In production, you would send these to your analytics/monitoring service
    // For now, we'll store them locally for debugging
    this.storePerformanceIssues(category, issues);
  }

  /**
   * Store performance issues for later analysis
   */
  async storePerformanceIssues(category, issues) {
    try {
      const storageKey = `perf_issues_${category}`;
      const existingIssues = await AsyncStorage.getItem(storageKey);
      const issuesList = existingIssues ? JSON.parse(existingIssues) : [];
      
      issuesList.push(...issues.map(issue => ({
        ...issue,
        timestamp: Date.now(),
        deviceCapabilities: this.deviceCapabilities
      })));
      
      // Keep only last 50 issues per category
      const recentIssues = issuesList.slice(-50);
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(recentIssues));
    } catch (error) {
      logger.error('Error storing performance issues:', error);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const now = Date.now();
    const last5Minutes = now - (5 * 60 * 1000);
    
    // Calculate recent averages
    const recentMemory = this.metrics.memory.filter(m => m.timestamp > last5Minutes);
    const recentNavigation = this.metrics.navigation.filter(n => n.timestamp > last5Minutes);
    const recentImages = this.metrics.imageLoading.filter(i => i.timestamp > last5Minutes);
    const recentAI = this.metrics.aiOperations.filter(a => a.timestamp > last5Minutes);

    return {
      timestamp: now,
      deviceCapabilities: this.deviceCapabilities,
      startup: this.metrics.startup,
      recentMetrics: {
        memory: {
          count: recentMemory.length,
          avgUsage: recentMemory.length > 0 ? 
            recentMemory.reduce((sum, m) => sum + (m.appMemoryEstimate || 0), 0) / recentMemory.length : 0
        },
        navigation: {
          count: recentNavigation.length,
          avgDuration: recentNavigation.length > 0 ? 
            recentNavigation.reduce((sum, n) => sum + n.duration, 0) / recentNavigation.length : 0
        },
        imageLoading: {
          count: recentImages.length,
          avgDuration: recentImages.length > 0 ? 
            recentImages.reduce((sum, i) => sum + i.duration, 0) / recentImages.length : 0,
          successRate: recentImages.length > 0 ? 
            recentImages.filter(i => i.success).length / recentImages.length : 1
        },
        aiOperations: {
          count: recentAI.length,
          avgDuration: recentAI.length > 0 ? 
            recentAI.reduce((sum, a) => sum + a.duration, 0) / recentAI.length : 0,
          successRate: recentAI.length > 0 ? 
            recentAI.filter(a => a.success).length / recentAI.length : 1
        }
      }
    };
  }

  /**
   * Export performance data for analysis
   */
  async exportPerformanceData() {
    const summary = this.getPerformanceSummary();
    const detailedMetrics = {
      summary,
      rawMetrics: {
        startup: this.metrics.startup,
        memory: this.metrics.memory.slice(-50), // Last 50 samples
        navigation: this.metrics.navigation.slice(-50),
        imageLoading: this.metrics.imageLoading.slice(-100),
        aiOperations: this.metrics.aiOperations.slice(-50)
      }
    };

    try {
      await AsyncStorage.setItem('performance_export', JSON.stringify(detailedMetrics));
      logger.info('Performance data exported successfully');
      return detailedMetrics;
    } catch (error) {
      logger.error('Error exporting performance data:', error);
      throw error;
    }
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    if (this.renderingFrameTracker) {
      clearInterval(this.renderingFrameTracker);
      this.renderingFrameTracker = null;
    }
    
    this.activeTransitions.clear();
    
    logger.info('Performance monitor cleaned up');
  }
}

export default new MobilePerformanceMonitor();