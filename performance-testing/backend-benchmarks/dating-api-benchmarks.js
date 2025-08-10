const autocannon = require('autocannon');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * Comprehensive API Benchmarking Suite for Dating Profile Optimizer
 * Specialized benchmarks for dating app endpoints with realistic scenarios
 */
class DatingAPIBenchmarks {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3002';
    this.apiVersion = '/api/v1';
    this.authTokens = new Map();
    this.testResults = [];
    this.reportPath = options.reportPath || './benchmark-results';
    
    // Dating app specific benchmark configurations
    this.benchmarkConfigs = {
      // User authentication endpoints
      auth: {
        register: {
          duration: 30,
          connections: 20,
          pipelining: 1,
          method: 'POST',
          path: '/auth/register',
          expectedStatus: [201, 400], // 400 for duplicate emails
          body: () => this.generateUserRegistration()
        },
        login: {
          duration: 60,
          connections: 50,
          pipelining: 2,
          method: 'POST',
          path: '/auth/login',
          expectedStatus: [200, 401],
          body: () => this.generateUserLogin()
        }
      },
      
      // Profile management endpoints
      profiles: {
        get_profile: {
          duration: 60,
          connections: 100,
          pipelining: 5,
          method: 'GET',
          path: '/profiles/me',
          expectedStatus: [200],
          setupAuth: true
        },
        update_profile: {
          duration: 45,
          connections: 30,
          pipelining: 1,
          method: 'PUT',
          path: '/profiles',
          expectedStatus: [200],
          setupAuth: true,
          body: () => this.generateProfileUpdate()
        },
        discover_profiles: {
          duration: 120,
          connections: 150,
          pipelining: 3,
          method: 'GET',
          path: '/profiles/discover?limit=20&offset=0',
          expectedStatus: [200],
          setupAuth: true
        },
        search_profiles: {
          duration: 60,
          connections: 80,
          pipelining: 2,
          method: 'GET',
          path: () => `/profiles/search?${this.generateSearchParams()}`,
          expectedStatus: [200],
          setupAuth: true
        }
      },
      
      // Photo management endpoints
      photos: {
        upload_photo: {
          duration: 60,
          connections: 25,
          pipelining: 1,
          method: 'POST',
          path: '/photos',
          expectedStatus: [201],
          setupAuth: true,
          body: () => this.generatePhotoUpload()
        },
        analyze_photo: {
          duration: 120,
          connections: 15,
          pipelining: 1,
          method: 'POST',
          path: '/photos/analyze',
          expectedStatus: [200, 202], // 202 for async processing
          setupAuth: true,
          body: () => this.generatePhotoAnalysis(),
          timeout: 30000 // 30 second timeout for AI processing
        },
        get_photos: {
          duration: 45,
          connections: 60,
          pipelining: 4,
          method: 'GET',
          path: '/photos',
          expectedStatus: [200],
          setupAuth: true
        }
      },
      
      // Bio generation endpoints
      bios: {
        generate_bio: {
          duration: 180,
          connections: 10,
          pipelining: 1,
          method: 'POST',
          path: '/bios/generate',
          expectedStatus: [200, 202],
          setupAuth: true,
          body: () => this.generateBioRequest(),
          timeout: 45000 // 45 second timeout for AI processing
        },
        get_bios: {
          duration: 30,
          connections: 40,
          pipelining: 3,
          method: 'GET',
          path: '/bios',
          expectedStatus: [200],
          setupAuth: true
        },
        rate_bio: {
          duration: 30,
          connections: 50,
          pipelining: 2,
          method: 'POST',
          path: '/bios/rate',
          expectedStatus: [200],
          setupAuth: true,
          body: () => this.generateBioRating()
        }
      },
      
      // Matching and swiping endpoints
      matching: {
        swipe_action: {
          duration: 90,
          connections: 200,
          pipelining: 1,
          method: 'POST',
          path: '/swipes',
          expectedStatus: [200, 201],
          setupAuth: true,
          body: () => this.generateSwipeAction()
        },
        get_matches: {
          duration: 60,
          connections: 100,
          pipelining: 3,
          method: 'GET',
          path: '/matches',
          expectedStatus: [200],
          setupAuth: true
        },
        match_details: {
          duration: 45,
          connections: 80,
          pipelining: 2,
          method: 'GET',
          path: () => `/matches/${this.generateMatchId()}`,
          expectedStatus: [200, 404],
          setupAuth: true
        }
      },
      
      // Analytics endpoints
      analytics: {
        track_event: {
          duration: 60,
          connections: 300,
          pipelining: 5,
          method: 'POST',
          path: '/analytics/events',
          expectedStatus: [200, 202],
          setupAuth: true,
          body: () => this.generateAnalyticsEvent()
        },
        get_insights: {
          duration: 30,
          connections: 20,
          pipelining: 1,
          method: 'GET',
          path: '/analytics/insights',
          expectedStatus: [200],
          setupAuth: true
        }
      },
      
      // Payment endpoints
      payments: {
        create_payment_intent: {
          duration: 45,
          connections: 15,
          pipelining: 1,
          method: 'POST',
          path: '/payments/create-intent',
          expectedStatus: [200],
          setupAuth: true,
          body: () => this.generatePaymentIntent()
        },
        get_subscription_status: {
          duration: 30,
          connections: 40,
          pipelining: 2,
          method: 'GET',
          path: '/payments/subscription',
          expectedStatus: [200],
          setupAuth: true
        }
      }
    };
    
    this.testUsers = [];
    this.setupComplete = false;
  }

  /**
   * Initialize benchmark suite with test data
   */
  async initialize() {
    console.log('🚀 Initializing Dating API Benchmarks...');
    
    // Ensure report directory exists
    await this.ensureReportDirectory();
    
    // Create test users for authenticated endpoints
    await this.createTestUsers(50);
    
    // Health check
    await this.healthCheck();
    
    this.setupComplete = true;
    console.log('✅ Benchmark suite initialized successfully');
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDirectory() {
    try {
      await fs.mkdir(this.reportPath, { recursive: true });
    } catch (error) {
      console.error('Error creating report directory:', error);
      throw error;
    }
  }

  /**
   * Health check to ensure API is ready
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
      
      console.log('✅ API health check passed');
    } catch (error) {
      console.error('❌ API health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Create test users for authenticated benchmarks
   */
  async createTestUsers(count = 50) {
    console.log(`Creating ${count} test users...`);
    
    const userPromises = [];
    for (let i = 0; i < count; i++) {
      const userData = this.generateUserRegistration(i);
      userPromises.push(this.createTestUser(userData, i));
    }
    
    const results = await Promise.allSettled(userPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Created ${successful}/${count} test users`);
    
    if (successful < count * 0.8) {
      throw new Error('Failed to create sufficient test users for benchmarking');
    }
  }

  /**
   * Create individual test user
   */
  async createTestUser(userData, index) {
    try {
      const response = await axios.post(
        `${this.baseUrl}${this.apiVersion}/auth/register`,
        userData,
        { timeout: 10000 }
      );
      
      if (response.data.token) {
        const userInfo = {
          ...userData,
          token: response.data.token,
          userId: response.data.user.id
        };
        
        this.testUsers.push(userInfo);
        this.authTokens.set(index, response.data.token);
        
        return userInfo;
      }
    } catch (error) {
      // Handle duplicate email errors gracefully
      if (error.response?.status === 400) {
        // Try to login instead
        try {
          const loginResponse = await axios.post(
            `${this.baseUrl}${this.apiVersion}/auth/login`,
            {
              email: userData.email,
              password: userData.password
            },
            { timeout: 10000 }
          );
          
          if (loginResponse.data.token) {
            const userInfo = {
              ...userData,
              token: loginResponse.data.token,
              userId: loginResponse.data.user.id
            };
            
            this.testUsers.push(userInfo);
            this.authTokens.set(index, loginResponse.data.token);
            
            return userInfo;
          }
        } catch (loginError) {
          console.error(`Failed to login test user ${index}:`, loginError.message);
          throw loginError;
        }
      } else {
        console.error(`Failed to create test user ${index}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Run comprehensive benchmarks for all endpoint categories
   */
  async runAllBenchmarks() {
    if (!this.setupComplete) {
      await this.initialize();
    }
    
    console.log('🏁 Starting comprehensive API benchmarks...');
    
    const categories = Object.keys(this.benchmarkConfigs);
    const results = {};
    
    for (const category of categories) {
      console.log(`\n📊 Benchmarking ${category} endpoints...`);
      results[category] = await this.runCategoryBenchmarks(category);
    }
    
    // Generate comprehensive report
    const report = await this.generateReport(results);
    await this.saveReport(report);
    
    console.log('✅ All benchmarks completed successfully');
    console.log(`📄 Report saved to: ${this.reportPath}`);
    
    return results;
  }

  /**
   * Run benchmarks for specific category
   */
  async runCategoryBenchmarks(category) {
    const endpoints = this.benchmarkConfigs[category];
    const categoryResults = {};
    
    for (const [endpointName, config] of Object.entries(endpoints)) {
      console.log(`  🔄 Testing ${endpointName}...`);
      
      try {
        const result = await this.runSingleBenchmark(endpointName, config);
        categoryResults[endpointName] = result;
        
        // Brief pause between tests to avoid overwhelming the server
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`  ❌ ${endpointName} benchmark failed:`, error.message);
        categoryResults[endpointName] = {
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return categoryResults;
  }

  /**
   * Run single endpoint benchmark
   */
  async runSingleBenchmark(endpointName, config) {
    const benchmarkConfig = {
      url: `${this.baseUrl}${this.apiVersion}`,
      duration: config.duration,
      connections: config.connections,
      pipelining: config.pipelining || 1,
      timeout: config.timeout || 10000,
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add authentication if required
    if (config.setupAuth && this.testUsers.length > 0) {
      const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)];
      benchmarkConfig.headers['Authorization'] = `Bearer ${randomUser.token}`;
    }
    
    // Configure request path
    if (typeof config.path === 'function') {
      benchmarkConfig.path = config.path();
    } else {
      benchmarkConfig.path = config.path;
    }
    
    // Configure request body
    if (config.body) {
      benchmarkConfig.body = JSON.stringify(config.body());
    }
    
    // Add request customization
    if (config.setupAuth || config.body) {
      benchmarkConfig.setupClient = (client) => {
        client.setBody = (req) => {
          if (config.setupAuth && this.testUsers.length > 0) {
            const randomUser = this.testUsers[Math.floor(Math.random() * this.testUsers.length)];
            req.setHeader('Authorization', `Bearer ${randomUser.token}`);
          }
          
          if (config.body) {
            req.setBody(JSON.stringify(config.body()));
          }
          
          return req;
        };
      };
    }
    
    // Run the benchmark
    const result = await autocannon(benchmarkConfig);
    
    // Process and enhance results
    const processedResult = this.processResults(result, endpointName, config);
    
    console.log(`    ✅ ${endpointName}: ${processedResult.summary.rps} req/s, ${processedResult.summary.latencyP95}ms P95`);
    
    return processedResult;
  }

  /**
   * Process benchmark results
   */
  processResults(result, endpointName, config) {
    const processed = {
      endpoint: endpointName,
      config: {
        duration: config.duration,
        connections: config.connections,
        method: config.method,
        path: config.path
      },
      timestamp: new Date().toISOString(),
      summary: {
        rps: Math.round(result.requests.average),
        totalRequests: result.requests.total,
        totalBytes: result.throughput.total,
        duration: result.duration,
        latencyMean: Math.round(result.latency.mean * 100) / 100,
        latencyP50: result.latency.p50,
        latencyP90: result.latency.p90,
        latencyP95: result.latency.p95,
        latencyP99: result.latency.p99,
        latencyMax: result.latency.max,
        throughputMean: Math.round(result.throughput.mean),
        errors: result.errors,
        timeouts: result.timeouts,
        successRate: ((result.requests.total - result.errors - result.timeouts) / result.requests.total * 100).toFixed(2)
      },
      detailed: {
        requests: result.requests,
        latency: result.latency,
        throughput: result.throughput,
        errors: result.errors,
        timeouts: result.timeouts,
        start: result.start,
        finish: result.finish
      }
    };
    
    // Add dating app specific analysis
    processed.analysis = this.analyzeDatingAppMetrics(processed, endpointName);
    
    return processed;
  }

  /**
   * Analyze results for dating app specific insights
   */
  analyzeDatingAppMetrics(result, endpointName) {
    const analysis = {
      performance_grade: 'A',
      recommendations: [],
      dating_app_impact: 'low'
    };
    
    // Performance grading
    if (result.summary.latencyP95 > 5000) {
      analysis.performance_grade = 'F';
      analysis.dating_app_impact = 'critical';
    } else if (result.summary.latencyP95 > 3000) {
      analysis.performance_grade = 'D';
      analysis.dating_app_impact = 'high';
    } else if (result.summary.latencyP95 > 1500) {
      analysis.performance_grade = 'C';
      analysis.dating_app_impact = 'medium';
    } else if (result.summary.latencyP95 > 800) {
      analysis.performance_grade = 'B';
      analysis.dating_app_impact = 'low';
    }
    
    // Endpoint-specific analysis
    switch (endpointName) {
      case 'generate_bio':
        if (result.summary.latencyP95 > 15000) {
          analysis.recommendations.push('Bio generation is too slow for good UX');
          analysis.recommendations.push('Consider implementing async processing with webhooks');
        }
        if (result.summary.successRate < 90) {
          analysis.recommendations.push('Bio generation failure rate is too high');
        }
        break;
        
      case 'analyze_photo':
        if (result.summary.latencyP95 > 20000) {
          analysis.recommendations.push('Photo analysis is too slow');
          analysis.recommendations.push('Implement background processing');
        }
        break;
        
      case 'discover_profiles':
        if (result.summary.latencyP95 > 1000) {
          analysis.recommendations.push('Profile discovery should be under 1s for good UX');
          analysis.recommendations.push('Consider implementing profile caching');
        }
        if (result.summary.rps < 100) {
          analysis.recommendations.push('Profile discovery throughput is low for a dating app');
        }
        break;
        
      case 'swipe_action':
        if (result.summary.latencyP95 > 300) {
          analysis.recommendations.push('Swipe actions should be near-instantaneous');
          analysis.recommendations.push('Consider async processing for match calculations');
        }
        break;
        
      case 'upload_photo':
        if (result.summary.latencyP95 > 8000) {
          analysis.recommendations.push('Photo upload is too slow');
          analysis.recommendations.push('Implement progressive upload or direct S3 upload');
        }
        break;
    }
    
    // General recommendations
    if (parseFloat(result.summary.successRate) < 95) {
      analysis.recommendations.push('Error rate is too high for production');
    }
    
    if (result.summary.rps < 10) {
      analysis.recommendations.push('Throughput is very low - investigate bottlenecks');
    }
    
    return analysis;
  }

  /**
   * Generate comprehensive benchmark report
   */
  async generateReport(results) {
    const timestamp = new Date().toISOString();
    const report = {
      metadata: {
        title: 'Dating Profile Optimizer API Benchmark Report',
        timestamp,
        baseUrl: this.baseUrl,
        totalTestUsers: this.testUsers.length,
        reportVersion: '1.0.0'
      },
      summary: this.generateSummary(results),
      detailed_results: results,
      recommendations: this.generateRecommendations(results),
      appendix: {
        test_configuration: this.benchmarkConfigs,
        environment_info: await this.getEnvironmentInfo()
      }
    };
    
    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(results) {
    const allResults = [];
    
    // Flatten all results
    Object.values(results).forEach(category => {
      Object.values(category).forEach(result => {
        if (result.summary) {
          allResults.push(result);
        }
      });
    });
    
    if (allResults.length === 0) {
      return { error: 'No valid results to summarize' };
    }
    
    const summary = {
      total_endpoints_tested: allResults.length,
      overall_metrics: {
        avg_rps: Math.round(allResults.reduce((sum, r) => sum + r.summary.rps, 0) / allResults.length),
        avg_latency_p95: Math.round(allResults.reduce((sum, r) => sum + r.summary.latencyP95, 0) / allResults.length),
        avg_success_rate: (allResults.reduce((sum, r) => sum + parseFloat(r.summary.successRate), 0) / allResults.length).toFixed(2),
        total_requests: allResults.reduce((sum, r) => sum + r.summary.totalRequests, 0)
      },
      performance_distribution: {
        grade_A: allResults.filter(r => r.analysis?.performance_grade === 'A').length,
        grade_B: allResults.filter(r => r.analysis?.performance_grade === 'B').length,
        grade_C: allResults.filter(r => r.analysis?.performance_grade === 'C').length,
        grade_D: allResults.filter(r => r.analysis?.performance_grade === 'D').length,
        grade_F: allResults.filter(r => r.analysis?.performance_grade === 'F').length
      },
      top_performers: allResults
        .sort((a, b) => b.summary.rps - a.summary.rps)
        .slice(0, 5)
        .map(r => ({ endpoint: r.endpoint, rps: r.summary.rps, latency_p95: r.summary.latencyP95 })),
      bottlenecks: allResults
        .sort((a, b) => b.summary.latencyP95 - a.summary.latencyP95)
        .slice(0, 5)
        .map(r => ({ endpoint: r.endpoint, latency_p95: r.summary.latencyP95, success_rate: r.summary.successRate }))
    };
    
    return summary;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(results) {
    const recommendations = {
      critical: [],
      high_priority: [],
      medium_priority: [],
      low_priority: []
    };
    
    Object.values(results).forEach(category => {
      Object.values(category).forEach(result => {
        if (result.analysis?.recommendations) {
          result.analysis.recommendations.forEach(rec => {
            const recommendation = {
              endpoint: result.endpoint,
              recommendation: rec,
              current_p95: result.summary?.latencyP95,
              current_rps: result.summary?.rps,
              success_rate: result.summary?.successRate
            };
            
            // Categorize by impact
            if (result.analysis.dating_app_impact === 'critical') {
              recommendations.critical.push(recommendation);
            } else if (result.analysis.dating_app_impact === 'high') {
              recommendations.high_priority.push(recommendation);
            } else if (result.analysis.dating_app_impact === 'medium') {
              recommendations.medium_priority.push(recommendation);
            } else {
              recommendations.low_priority.push(recommendation);
            }
          });
        }
      });
    });
    
    // Add general system recommendations
    const summary = this.generateSummary(results);
    if (summary.overall_metrics.avg_latency_p95 > 2000) {
      recommendations.high_priority.push({
        endpoint: 'system_wide',
        recommendation: 'Overall system latency is high - consider horizontal scaling',
        current_p95: summary.overall_metrics.avg_latency_p95
      });
    }
    
    if (parseFloat(summary.overall_metrics.avg_success_rate) < 95) {
      recommendations.critical.push({
        endpoint: 'system_wide',
        recommendation: 'System-wide error rate is too high for production',
        success_rate: summary.overall_metrics.avg_success_rate
      });
    }
    
    return recommendations;
  }

  /**
   * Get environment information
   */
  async getEnvironmentInfo() {
    return {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory_limit: process.memoryUsage(),
      test_timestamp: new Date().toISOString(),
      api_base_url: this.baseUrl
    };
  }

  /**
   * Save report to files
   */
  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = path.join(this.reportPath, `dating-api-benchmark-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlPath = path.join(this.reportPath, `dating-api-benchmark-${timestamp}.html`);
    const htmlContent = this.generateHTMLReport(report);
    await fs.writeFile(htmlPath, htmlContent);
    
    // Save CSV summary
    const csvPath = path.join(this.reportPath, `dating-api-benchmark-summary-${timestamp}.csv`);
    const csvContent = this.generateCSVSummary(report);
    await fs.writeFile(csvPath, csvContent);
    
    console.log(`📄 Reports saved:`);
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - HTML: ${htmlPath}`);
    console.log(`  - CSV: ${csvPath}`);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Dating API Benchmark Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
    .summary { margin: 20px 0; }
    .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9e9e9; border-radius: 3px; }
    .grade-A { background: #d4edda; }
    .grade-B { background: #d1ecf1; }
    .grade-C { background: #fff3cd; }
    .grade-D { background: #f8d7da; }
    .grade-F { background: #f5c6cb; }
    .recommendations { margin: 20px 0; }
    .critical { color: #721c24; background: #f8d7da; padding: 10px; border-radius: 3px; margin: 5px 0; }
    .high { color: #856404; background: #fff3cd; padding: 10px; border-radius: 3px; margin: 5px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Dating Profile Optimizer API Benchmark Report</h1>
    <p>Generated: ${report.metadata.timestamp}</p>
    <p>API URL: ${report.metadata.baseUrl}</p>
    <p>Test Users: ${report.metadata.totalTestUsers}</p>
  </div>
  
  <div class="summary">
    <h2>Summary</h2>
    <div class="metric">Endpoints Tested: ${report.summary.total_endpoints_tested}</div>
    <div class="metric">Average RPS: ${report.summary.overall_metrics.avg_rps}</div>
    <div class="metric">Average P95 Latency: ${report.summary.overall_metrics.avg_latency_p95}ms</div>
    <div class="metric">Average Success Rate: ${report.summary.overall_metrics.avg_success_rate}%</div>
  </div>
  
  <div class="recommendations">
    <h2>Critical Issues</h2>
    ${report.recommendations.critical.map(rec => `
      <div class="critical">
        <strong>${rec.endpoint}</strong>: ${rec.recommendation}
        ${rec.current_p95 ? `(Current P95: ${rec.current_p95}ms)` : ''}
      </div>
    `).join('')}
    
    <h2>High Priority Issues</h2>
    ${report.recommendations.high_priority.map(rec => `
      <div class="high">
        <strong>${rec.endpoint}</strong>: ${rec.recommendation}
        ${rec.current_p95 ? `(Current P95: ${rec.current_p95}ms)` : ''}
      </div>
    `).join('')}
  </div>
  
  <h2>Top Performers</h2>
  <table>
    <tr><th>Endpoint</th><th>RPS</th><th>P95 Latency (ms)</th></tr>
    ${report.summary.top_performers.map(p => `
      <tr><td>${p.endpoint}</td><td>${p.rps}</td><td>${p.latency_p95}</td></tr>
    `).join('')}
  </table>
  
  <h2>Bottlenecks</h2>
  <table>
    <tr><th>Endpoint</th><th>P95 Latency (ms)</th><th>Success Rate (%)</th></tr>
    ${report.summary.bottlenecks.map(b => `
      <tr><td>${b.endpoint}</td><td>${b.latency_p95}</td><td>${b.success_rate}</td></tr>
    `).join('')}
  </table>
</body>
</html>`;
  }

  /**
   * Generate CSV summary
   */
  generateCSVSummary(report) {
    let csv = 'Endpoint,Category,RPS,P95_Latency_ms,P99_Latency_ms,Success_Rate_%,Total_Requests,Performance_Grade\n';
    
    Object.entries(report.detailed_results).forEach(([category, endpoints]) => {
      Object.values(endpoints).forEach(result => {
        if (result.summary) {
          csv += `${result.endpoint},${category},${result.summary.rps},${result.summary.latencyP95},${result.summary.latencyP99},${result.summary.successRate},${result.summary.totalRequests},${result.analysis?.performance_grade || 'N/A'}\n`;
        }
      });
    });
    
    return csv;
  }

  /**
   * Data generation methods for realistic testing
   */
  generateUserRegistration(index = 0) {
    const names = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage'];
    const domains = ['test.com', 'example.org', 'demo.net'];
    const timestamp = Date.now();
    
    return {
      email: `user${index}_${timestamp}@${domains[index % domains.length]}`,
      password: 'testpass123',
      name: `${names[index % names.length]} User${index}`,
      age: 22 + (index % 20),
      gender: ['male', 'female', 'other'][index % 3]
    };
  }

  generateUserLogin() {
    if (this.testUsers.length === 0) {
      return this.generateUserRegistration();
    }
    
    const user = this.testUsers[Math.floor(Math.random() * this.testUsers.length)];
    return {
      email: user.email,
      password: user.password
    };
  }

  generateProfileUpdate() {
    const bios = [
      'Love hiking and good coffee',
      'Yoga instructor and travel enthusiast',
      'Software engineer who loves cooking',
      'Artist looking for adventure',
      'Fitness enthusiast and foodie'
    ];
    
    const interests = ['hiking', 'yoga', 'travel', 'cooking', 'art', 'fitness', 'music', 'reading'];
    
    return {
      bio: bios[Math.floor(Math.random() * bios.length)],
      interests: interests.slice(0, 3 + Math.floor(Math.random() * 3)),
      location: 'San Francisco, CA'
    };
  }

  generatePhotoUpload() {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1494790108755-2616b332cdde?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
    ];
    
    return {
      photo_url: samplePhotos[Math.floor(Math.random() * samplePhotos.length)],
      is_primary: Math.random() < 0.3
    };
  }

  generatePhotoAnalysis() {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1494790108755-2616b332cdde?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
    ];
    
    return {
      photo_url: samplePhotos[Math.floor(Math.random() * samplePhotos.length)],
      analysis_type: ['attractiveness', 'authenticity', 'lifestyle'][Math.floor(Math.random() * 3)]
    };
  }

  generateBioRequest() {
    const styles = ['casual', 'professional', 'creative', 'adventurous'];
    const personalities = [
      ['outgoing', 'adventurous'],
      ['intellectual', 'creative'],
      ['athletic', 'outdoorsy'],
      ['artistic', 'introspective']
    ];
    
    return {
      style: styles[Math.floor(Math.random() * styles.length)],
      personality: personalities[Math.floor(Math.random() * personalities.length)],
      userProfile: {
        age: 25 + Math.floor(Math.random() * 15),
        occupation: 'Software Engineer',
        location: 'San Francisco, CA',
        interests: ['technology', 'music', 'travel']
      }
    };
  }

  generateBioRating() {
    return {
      bio_id: Math.floor(Math.random() * 1000) + 1,
      rating: 1 + Math.floor(Math.random() * 5),
      feedback: 'Generated feedback for testing'
    };
  }

  generateSwipeAction() {
    return {
      target_user_id: Math.floor(Math.random() * 1000) + 1,
      action: Math.random() > 0.3 ? 'like' : 'pass' // 70% like rate
    };
  }

  generateMatchId() {
    return Math.floor(Math.random() * 500) + 1;
  }

  generateAnalyticsEvent() {
    const events = [
      'profile_view', 'swipe_action', 'match_created', 'message_sent',
      'photo_upload', 'bio_generated', 'purchase_made', 'subscription_started'
    ];
    
    return {
      event_type: events[Math.floor(Math.random() * events.length)],
      properties: {
        timestamp: Date.now(),
        user_agent: 'Benchmark Test Agent',
        platform: 'web'
      }
    };
  }

  generatePaymentIntent() {
    return {
      amount: [999, 1999, 4999][Math.floor(Math.random() * 3)], // $9.99, $19.99, $49.99
      currency: 'usd',
      payment_method_types: ['card']
    };
  }

  generateSearchParams() {
    const params = new URLSearchParams({
      age_min: '22',
      age_max: '35',
      distance: '50',
      interests: 'hiking,coffee,travel'
    });
    
    return params.toString();
  }

  /**
   * Utility method to pause execution
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
module.exports = DatingAPIBenchmarks;

// CLI usage
if (require.main === module) {
  const benchmarks = new DatingAPIBenchmarks({
    baseUrl: process.env.API_URL || 'http://localhost:3002',
    reportPath: process.env.REPORT_PATH || './benchmark-results'
  });
  
  benchmarks.runAllBenchmarks()
    .then(() => {
      console.log('✅ Benchmarks completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}