/**
 * Performance Testing Setup
 * Monitoring and benchmarking utilities for both applications
 */

// Performance monitoring utilities
global.PerformanceMonitor = {
  marks: new Map(),
  measures: new Map(),

  /**
   * Start timing a performance metric
   */
  mark(name) {
    this.marks.set(name, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  },

  /**
   * End timing and calculate duration
   */
  measure(name) {
    const mark = this.marks.get(name);
    if (!mark) {
      throw new Error(`Performance mark "${name}" not found`);
    }

    mark.endTime = performance.now();
    mark.duration = mark.endTime - mark.startTime;
    
    this.measures.set(name, mark);
    return mark.duration;
  },

  /**
   * Get performance measurement
   */
  getMeasure(name) {
    return this.measures.get(name);
  },

  /**
   * Get all measurements
   */
  getAllMeasures() {
    return Array.from(this.measures.entries()).map(([name, measure]) => ({
      name,
      ...measure
    }));
  },

  /**
   * Clear all measurements
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
  },

  /**
   * Assert performance benchmark
   */
  assertBenchmark(name, expectedDuration, tolerance = 0.1) {
    const measure = this.measures.get(name);
    if (!measure) {
      throw new Error(`Performance measure "${name}" not found`);
    }

    const actualDuration = measure.duration;
    const toleranceMs = expectedDuration * tolerance;
    const isWithinTolerance = actualDuration <= (expectedDuration + toleranceMs);

    if (!isWithinTolerance) {
      throw new Error(
        `Performance benchmark failed for "${name}": ` +
        `expected ${expectedDuration}ms (±${toleranceMs}ms), ` +
        `got ${actualDuration.toFixed(2)}ms`
      );
    }

    return true;
  }
};

// Memory monitoring utilities
global.MemoryMonitor = {
  snapshots: [],

  /**
   * Take memory snapshot
   */
  snapshot(label = 'default') {
    const memoryUsage = process.memoryUsage();
    const snapshot = {
      label,
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers || 0
    };

    this.snapshots.push(snapshot);
    return snapshot;
  },

  /**
   * Compare two memory snapshots
   */
  compare(label1, label2) {
    const snapshot1 = this.snapshots.find(s => s.label === label1);
    const snapshot2 = this.snapshots.find(s => s.label === label2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    return {
      heapUsedDiff: snapshot2.heapUsed - snapshot1.heapUsed,
      heapTotalDiff: snapshot2.heapTotal - snapshot1.heapTotal,
      externalDiff: snapshot2.external - snapshot1.external,
      duration: snapshot2.timestamp - snapshot1.timestamp
    };
  },

  /**
   * Assert memory usage within limits
   */
  assertMemoryLimit(label, limitMB) {
    const snapshot = this.snapshots.find(s => s.label === label);
    if (!snapshot) {
      throw new Error(`Memory snapshot "${label}" not found`);
    }

    const usageMB = snapshot.heapUsed / 1024 / 1024;
    const limitBytes = limitMB * 1024 * 1024;

    if (snapshot.heapUsed > limitBytes) {
      throw new Error(
        `Memory limit exceeded for "${label}": ` +
        `${usageMB.toFixed(2)}MB > ${limitMB}MB`
      );
    }

    return true;
  },

  /**
   * Clear all snapshots
   */
  clear() {
    this.snapshots = [];
  }
};

// AI Processing Performance Benchmarks
global.AIPerformanceBenchmarks = {
  // Dating Profile Optimizer benchmarks
  PHOTO_ANALYSIS_MAX_TIME: 5000, // 5 seconds
  BIO_GENERATION_MAX_TIME: 10000, // 10 seconds
  BATCH_PROCESSING_PER_PHOTO: 2000, // 2 seconds per photo
  
  // LinkedIn Headshot Generator benchmarks
  HEADSHOT_GENERATION_MAX_TIME: 15000, // 15 seconds
  STYLE_SELECTION_MAX_TIME: 3000, // 3 seconds
  BRAND_ANALYSIS_MAX_TIME: 5000, // 5 seconds

  // General app performance benchmarks
  APP_LAUNCH_MAX_TIME: 3000, // 3 seconds
  NAVIGATION_MAX_TIME: 200, // 200ms
  UI_INTERACTION_MAX_TIME: 100, // 100ms
  IMAGE_UPLOAD_PER_MB: 2000, // 2 seconds per MB
  
  // Memory limits
  APP_MEMORY_LIMIT_MB: 150, // 150MB
  IMAGE_PROCESSING_MEMORY_LIMIT_MB: 200, // 200MB during processing
};

// Network Performance Testing
global.NetworkTester = {
  /**
   * Simulate network conditions
   */
  simulateConnection(type = 'wifi') {
    const conditions = {
      wifi: { latency: 50, bandwidth: 1000 },
      '4g': { latency: 200, bandwidth: 100 },
      '3g': { latency: 500, bandwidth: 10 },
      offline: { latency: Infinity, bandwidth: 0 }
    };

    const condition = conditions[type] || conditions.wifi;
    
    // Mock network delays
    jest.spyOn(global, 'fetch').mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (condition.bandwidth === 0) {
            reject(new Error('Network offline'));
            return;
          }

          // Simulate response based on bandwidth
          const responseSize = options?.body ? 
            JSON.stringify(options.body).length : 1000;
          const transferTime = (responseSize / condition.bandwidth) * 8; // Convert to ms

          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ success: true }),
              text: () => Promise.resolve('{"success": true}')
            });
          }, transferTime);
        }, condition.latency);
      });
    });
  },

  /**
   * Restore normal network conditions
   */
  restoreConnection() {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  }
};

// Test performance helpers
global.testPerformance = async (testName, testFn, benchmark) => {
  PerformanceMonitor.mark(testName);
  MemoryMonitor.snapshot(`${testName}-start`);

  try {
    const result = await testFn();
    
    const duration = PerformanceMonitor.measure(testName);
    MemoryMonitor.snapshot(`${testName}-end`);
    
    if (benchmark && benchmark.maxTime) {
      PerformanceMonitor.assertBenchmark(testName, benchmark.maxTime);
    }
    
    if (benchmark && benchmark.maxMemoryMB) {
      MemoryMonitor.assertMemoryLimit(`${testName}-end`, benchmark.maxMemoryMB);
    }

    return {
      result,
      performance: {
        duration,
        memory: MemoryMonitor.compare(`${testName}-start`, `${testName}-end`)
      }
    };
  } catch (error) {
    PerformanceMonitor.measure(testName);
    MemoryMonitor.snapshot(`${testName}-error`);
    throw error;
  }
};

// Cleanup after each test
afterEach(() => {
  PerformanceMonitor.clear();
  MemoryMonitor.clear();
  NetworkTester.restoreConnection();
});

// Performance test matchers
expect.extend({
  toBeWithinPerformanceBenchmark(received, benchmark) {
    const pass = received <= benchmark;
    if (pass) {
      return {
        message: () => 
          `Expected ${received}ms to exceed benchmark ${benchmark}ms`,
        pass: true
      };
    } else {
      return {
        message: () => 
          `Expected ${received}ms to be within benchmark ${benchmark}ms`,
        pass: false
      };
    }
  },

  toBeWithinMemoryLimit(received, limitMB) {
    const receivedMB = received / 1024 / 1024;
    const pass = receivedMB <= limitMB;
    
    if (pass) {
      return {
        message: () => 
          `Expected ${receivedMB.toFixed(2)}MB to exceed limit ${limitMB}MB`,
        pass: true
      };
    } else {
      return {
        message: () => 
          `Expected ${receivedMB.toFixed(2)}MB to be within limit ${limitMB}MB`,
        pass: false
      };
    }
  }
});

console.log('Performance monitoring setup completed');