const fs = require('fs').promises;
const path = require('path');

/**
 * Dating App Capacity Planning Tool
 * Specialized for dating app growth patterns and resource forecasting
 */
class DatingCapacityPlanner {
  constructor(options = {}) {
    this.options = {
      reportPath: options.reportPath || './capacity-reports',
      apiUrl: options.apiUrl || 'http://localhost:3002',
      baselineUsers: options.baselineUsers || 1000,
      projectionMonths: options.projectionMonths || 24,
      ...options
    };

    // Dating app specific growth patterns and metrics
    this.datingMetrics = {
      // User growth patterns specific to dating apps
      userGrowthPatterns: {
        organic: {
          monthlyGrowthRate: 0.15, // 15% organic growth
          seasonalMultipliers: {
            january: 1.8,    // New Year resolution spike
            february: 2.2,   // Valentine's Day peak
            march: 1.1,      // Post-Valentine decline
            april: 0.9,      // Spring dating slowdown
            may: 0.8,        // Summer prep
            june: 0.7,       // Summer activities start
            july: 0.6,       // Peak summer
            august: 0.7,     // Summer ending
            september: 1.5,  // Back to school/work
            october: 1.2,    // Fall dating season
            november: 1.0,   // Holiday prep
            december: 0.8    // Holiday distraction
          }
        },
        viral: {
          monthlyGrowthRate: 0.45, // 45% viral growth
          peakDuration: 6, // months
          decayRate: 0.85  // 15% decay per month after peak
        },
        paid: {
          monthlyGrowthRate: 0.25, // 25% paid acquisition
          costMultiplier: 1.2,     // 20% cost increase over time
          conversionRate: 0.08     // 8% conversion from ads
        }
      },

      // Dating app usage patterns
      usagePatterns: {
        dailyActive: {
          weekday: 0.35,  // 35% of users active on weekdays
          weekend: 0.55,  // 55% of users active on weekends
          peakHours: {
            '07:00-09:00': 0.8,  // Morning commute
            '12:00-14:00': 1.2,  // Lunch break
            '19:00-23:00': 2.0   // Evening peak
          }
        },
        retention: {
          day1: 0.85,   // 85% return day 1
          day7: 0.65,   // 65% return week 1
          day30: 0.35,  // 35% return month 1
          day90: 0.20,  // 20% return month 3
          day365: 0.12  // 12% return year 1
        },
        engagement: {
          averageSessionDuration: 18, // 18 minutes
          sessionsPerDay: 3.2,        // 3.2 sessions per active user
          profileViewsPerSession: 25, // 25 profiles viewed
          swipesPerSession: 20,       // 20 swipes per session
          matchesPerUser: 0.15,       // 15% match rate
          conversationsPerMatch: 0.60 // 60% matches lead to conversation
        }
      },

      // Technical resource requirements
      resourceRequirements: {
        // API requests per user per day
        apiRequestsPerUser: {
          authentication: 2,      // Login/logout
          profileBrowsing: 100,   // Profile discovery
          swipeActions: 20,       // Swipe left/right
          photoUploads: 0.5,      // Photos uploaded per day
          bioGeneration: 0.1,     // AI bio generation
          photoAnalysis: 0.3,     // AI photo analysis
          messaging: 8,           // Message send/receive
          analytics: 50           // Tracking events
        },
        
        // Database operations per user per day
        dbOperationsPerUser: {
          reads: 150,             // Profile reads, match queries
          writes: 25,             // Swipes, messages, updates
          complexQueries: 5       // Matching algorithm, analytics
        },

        // Storage requirements per user
        storagePerUser: {
          profileData: 2048,      // 2KB profile data
          photos: 5242880,        // 5MB photos average
          messages: 1024,         // 1KB messages per day
          analytics: 512          // 512 bytes analytics per day
        },

        // AI processing requirements
        aiProcessingPerUser: {
          bioGeneration: {
            requestsPerMonth: 3,
            processingTimeMs: 8000,
            cpuCores: 0.1
          },
          photoAnalysis: {
            requestsPerMonth: 10,
            processingTimeMs: 12000,
            cpuCores: 0.2
          }
        }
      }
    };

    // Infrastructure cost models
    this.costModels = {
      compute: {
        // Per vCPU per hour
        small: 0.048,   // 1-2 cores
        medium: 0.096,  // 2-4 cores
        large: 0.192,   // 4-8 cores
        xlarge: 0.384   // 8+ cores
      },
      database: {
        // Per hour
        small: 0.25,    // Up to 1000 users
        medium: 0.75,   // Up to 10000 users
        large: 2.25,    // Up to 100000 users
        xlarge: 6.75    // 100000+ users
      },
      storage: {
        // Per GB per month
        ssd: 0.10,
        objectStorage: 0.023,
        cdn: 0.085
      },
      ai: {
        // Per 1000 requests
        textGeneration: 0.50,   // Bio generation
        imageAnalysis: 1.20     // Photo analysis
      },
      networking: {
        // Per GB
        inbound: 0.00,
        outbound: 0.09,
        cdn: 0.085
      }
    };
  }

  /**
   * Generate comprehensive capacity plan
   */
  async generateCapacityPlan(scenarios = ['conservative', 'moderate', 'aggressive']) {
    console.log('🚀 Generating dating app capacity plan...');

    await this.ensureReportDirectory();

    const plans = {};
    
    for (const scenario of scenarios) {
      console.log(`📊 Processing ${scenario} growth scenario...`);
      plans[scenario] = await this.generateScenarioPlan(scenario);
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        baselineUsers: this.options.baselineUsers,
        projectionMonths: this.options.projectionMonths,
        scenarios: scenarios
      },
      summary: this.generateSummary(plans),
      scenarios: plans,
      recommendations: this.generateRecommendations(plans),
      costOptimizations: this.generateCostOptimizations(plans)
    };

    await this.saveReport(report);
    
    console.log('✅ Capacity planning completed');
    return report;
  }

  /**
   * Generate plan for specific growth scenario
   */
  async generateScenarioPlan(scenario) {
    const growthConfig = this.getGrowthConfig(scenario);
    const projections = this.calculateUserGrowth(growthConfig);
    
    const plan = {
      scenario,
      growthConfig,
      userGrowth: projections,
      resourceRequirements: {},
      costs: {},
      infrastructure: {}
    };

    // Calculate monthly projections
    for (let month = 0; month < this.options.projectionMonths; month++) {
      const userCount = projections[month];
      const monthKey = `month_${month + 1}`;
      
      plan.resourceRequirements[monthKey] = this.calculateResourceRequirements(userCount, month);
      plan.costs[monthKey] = this.calculateCosts(plan.resourceRequirements[monthKey]);
      plan.infrastructure[monthKey] = this.recommendInfrastructure(userCount, plan.resourceRequirements[monthKey]);
    }

    return plan;
  }

  /**
   * Get growth configuration for scenario
   */
  getGrowthConfig(scenario) {
    const configs = {
      conservative: {
        baseGrowthRate: 0.08,        // 8% monthly growth
        viralMultiplier: 1.0,        // No viral growth
        marketingBudgetMultiplier: 1.0,
        retentionMultiplier: 0.9,    // 10% lower retention
        seasonalVariation: 0.5       // 50% of normal seasonal effects
      },
      moderate: {
        baseGrowthRate: 0.15,        // 15% monthly growth
        viralMultiplier: 1.3,        // 30% viral boost
        marketingBudgetMultiplier: 1.5,
        retentionMultiplier: 1.0,    // Normal retention
        seasonalVariation: 1.0       // Full seasonal effects
      },
      aggressive: {
        baseGrowthRate: 0.25,        // 25% monthly growth
        viralMultiplier: 2.0,        // 100% viral boost
        marketingBudgetMultiplier: 3.0,
        retentionMultiplier: 1.1,    // 10% better retention
        seasonalVariation: 1.2       // 20% higher seasonal effects
      }
    };

    return configs[scenario] || configs.moderate;
  }

  /**
   * Calculate user growth projections
   */
  calculateUserGrowth(growthConfig) {
    const projections = [this.options.baselineUsers];
    
    for (let month = 1; month < this.options.projectionMonths; month++) {
      const previousUsers = projections[month - 1];
      const monthName = this.getMonthName(month);
      
      // Base growth
      let growthRate = growthConfig.baseGrowthRate;
      
      // Apply seasonal multipliers
      const seasonalMultiplier = this.datingMetrics.userGrowthPatterns.organic.seasonalMultipliers[monthName] || 1.0;
      growthRate *= (1 + (seasonalMultiplier - 1) * growthConfig.seasonalVariation);
      
      // Apply viral effects
      if (month >= 6 && month <= 12) { // Viral growth typically peaks 6-12 months in
        growthRate *= growthConfig.viralMultiplier;
      }
      
      // Calculate new users with retention
      const newUsers = previousUsers * growthRate;
      const retainedUsers = previousUsers * this.calculateRetentionRate(month) * growthConfig.retentionMultiplier;
      
      const totalUsers = Math.floor(retainedUsers + newUsers);
      projections.push(totalUsers);
    }
    
    return projections;
  }

  /**
   * Calculate retention rate based on cohort analysis
   */
  calculateRetentionRate(month) {
    const retention = this.datingMetrics.usagePatterns.retention;
    
    if (month <= 1) return retention.day1;
    if (month <= 3) return retention.day7;
    if (month <= 12) return retention.day30;
    
    return retention.day365;
  }

  /**
   * Calculate resource requirements for user count
   */
  calculateResourceRequirements(userCount, month) {
    const dailyActiveUsers = userCount * this.datingMetrics.usagePatterns.dailyActive.weekday;
    const peakUsers = dailyActiveUsers * 2.0; // Peak hour multiplier
    
    // API requests per day
    const apiRequests = Object.values(this.datingMetrics.resourceRequirements.apiRequestsPerUser)
      .reduce((sum, requests) => sum + requests, 0) * dailyActiveUsers;
    
    // Database operations per day
    const dbOperations = Object.values(this.datingMetrics.resourceRequirements.dbOperationsPerUser)
      .reduce((sum, ops) => sum + ops, 0) * dailyActiveUsers;
    
    // Storage requirements (cumulative)
    const totalStorage = {
      profileData: userCount * this.datingMetrics.resourceRequirements.storagePerUser.profileData,
      photos: userCount * this.datingMetrics.resourceRequirements.storagePerUser.photos,
      messages: dailyActiveUsers * this.datingMetrics.resourceRequirements.storagePerUser.messages * 30, // Monthly
      analytics: userCount * this.datingMetrics.resourceRequirements.storagePerUser.analytics * 30
    };
    
    // AI processing requirements
    const aiProcessing = {
      bioGeneration: {
        monthlyRequests: userCount * this.datingMetrics.resourceRequirements.aiProcessingPerUser.bioGeneration.requestsPerMonth,
        totalProcessingHours: (userCount * this.datingMetrics.resourceRequirements.aiProcessingPerUser.bioGeneration.requestsPerMonth * 
                              this.datingMetrics.resourceRequirements.aiProcessingPerUser.bioGeneration.processingTimeMs) / (1000 * 3600)
      },
      photoAnalysis: {
        monthlyRequests: userCount * this.datingMetrics.resourceRequirements.aiProcessingPerUser.photoAnalysis.requestsPerMonth,
        totalProcessingHours: (userCount * this.datingMetrics.resourceRequirements.aiProcessingPerUser.photoAnalysis.requestsPerMonth * 
                              this.datingMetrics.resourceRequirements.aiProcessingPerUser.photoAnalysis.processingTimeMs) / (1000 * 3600)
      }
    };
    
    // Compute requirements
    const compute = {
      apiServers: Math.ceil(apiRequests / (10000 * 24)), // 10k requests per server per hour
      backgroundWorkers: Math.ceil((aiProcessing.bioGeneration.totalProcessingHours + aiProcessing.photoAnalysis.totalProcessingHours) / (24 * 30)),
      totalCores: 0
    };
    
    compute.totalCores = compute.apiServers * 2 + compute.backgroundWorkers * 4; // 2 cores per API server, 4 per worker
    
    // Database requirements
    const database = {
      connectionPool: Math.ceil(peakUsers * 1.5), // 1.5 connections per peak user
      storage: Math.ceil((totalStorage.profileData + totalStorage.messages + totalStorage.analytics) / (1024 * 1024 * 1024)), // GB
      iops: Math.ceil(dbOperations / 60) // Operations per minute
    };
    
    // Network requirements
    const network = {
      bandwidth: Math.ceil(peakUsers * 0.5), // 0.5 Mbps per peak user
      cdnTraffic: Math.ceil(totalStorage.photos / (1024 * 1024 * 1024) * 0.1) // 10% of photos served monthly
    };
    
    return {
      userCount,
      dailyActiveUsers: Math.ceil(dailyActiveUsers),
      peakUsers: Math.ceil(peakUsers),
      apiRequests: Math.ceil(apiRequests),
      dbOperations: Math.ceil(dbOperations),
      storage: totalStorage,
      aiProcessing,
      compute,
      database,
      network
    };
  }

  /**
   * Calculate costs for resource requirements
   */
  calculateCosts(requirements) {
    const costs = {
      compute: 0,
      database: 0,
      storage: 0,
      ai: 0,
      network: 0,
      total: 0
    };
    
    // Compute costs (monthly)
    const hoursPerMonth = 24 * 30;
    costs.compute = requirements.compute.totalCores * this.costModels.compute.medium * hoursPerMonth;
    
    // Database costs (monthly)
    if (requirements.userCount < 10000) {
      costs.database = this.costModels.database.medium * hoursPerMonth;
    } else if (requirements.userCount < 100000) {
      costs.database = this.costModels.database.large * hoursPerMonth;
    } else {
      costs.database = this.costModels.database.xlarge * hoursPerMonth;
    }
    
    // Storage costs (monthly)
    const totalStorageGB = Object.values(requirements.storage).reduce((sum, bytes) => sum + bytes, 0) / (1024 * 1024 * 1024);
    costs.storage = totalStorageGB * this.costModels.storage.ssd;
    
    // AI processing costs (monthly)
    costs.ai = (requirements.aiProcessing.bioGeneration.monthlyRequests / 1000 * this.costModels.ai.textGeneration) +
               (requirements.aiProcessing.photoAnalysis.monthlyRequests / 1000 * this.costModels.ai.imageAnalysis);
    
    // Network costs (monthly)
    costs.network = requirements.network.cdnTraffic * this.costModels.networking.cdn;
    
    // Total monthly cost
    costs.total = costs.compute + costs.database + costs.storage + costs.ai + costs.network;
    
    return costs;
  }

  /**
   * Recommend infrastructure configuration
   */
  recommendInfrastructure(userCount, requirements) {
    const infrastructure = {
      kubernetes: {
        nodes: Math.ceil(requirements.compute.totalCores / 4), // 4 cores per node
        apiReplicas: Math.max(3, Math.ceil(requirements.apiRequests / (5000 * 24))), // Min 3 replicas
        workerReplicas: Math.max(2, requirements.compute.backgroundWorkers),
        hpaConfig: {
          minReplicas: Math.ceil(requirements.compute.apiServers * 0.5),
          maxReplicas: requirements.compute.apiServers * 2,
          targetCPU: 70,
          targetMemory: 80
        }
      },
      database: {
        primary: {
          size: userCount < 10000 ? 'medium' : userCount < 100000 ? 'large' : 'xlarge',
          connections: Math.min(requirements.database.connectionPool, 500),
          storage: Math.max(100, requirements.database.storage * 2), // 2x for growth
          backupRetention: 30
        },
        readReplicas: Math.max(1, Math.ceil(userCount / 50000)), // 1 replica per 50k users
        connectionPooling: {
          enabled: true,
          maxConnections: requirements.database.connectionPool,
          poolSize: Math.ceil(requirements.database.connectionPool * 0.8)
        }
      },
      cache: {
        redis: {
          size: userCount < 10000 ? 'small' : userCount < 100000 ? 'medium' : 'large',
          memory: Math.ceil(userCount * 0.001), // 1MB per 1000 users
          replicas: userCount > 50000 ? 2 : 1
        }
      },
      cdn: {
        enabled: true,
        regions: userCount > 10000 ? ['us', 'eu'] : ['us'],
        caching: {
          profileImages: '7d',
          staticAssets: '30d',
          apiResponses: '1h'
        }
      },
      monitoring: {
        metrics: ['cpu', 'memory', 'disk', 'network', 'database', 'cache'],
        alerts: ['high_cpu', 'high_memory', 'slow_queries', 'error_rate'],
        dashboards: ['overview', 'database', 'api', 'user_engagement']
      }
    };
    
    return infrastructure;
  }

  /**
   * Generate summary across all scenarios
   */
  generateSummary(plans) {
    const scenarios = Object.keys(plans);
    const finalMonthKey = `month_${this.options.projectionMonths}`;
    
    const summary = {
      userGrowth: {},
      costProjections: {},
      resourceGrowth: {},
      riskAnalysis: {}
    };
    
    // User growth summary
    scenarios.forEach(scenario => {
      const plan = plans[scenario];
      summary.userGrowth[scenario] = {
        startUsers: this.options.baselineUsers,
        endUsers: plan.userGrowth[this.options.projectionMonths - 1],
        totalGrowth: ((plan.userGrowth[this.options.projectionMonths - 1] / this.options.baselineUsers - 1) * 100).toFixed(1) + '%',
        avgMonthlyGrowth: (Math.pow(plan.userGrowth[this.options.projectionMonths - 1] / this.options.baselineUsers, 1 / this.options.projectionMonths) - 1) * 100
      };
      
      summary.costProjections[scenario] = {
        monthlyStartCost: plan.costs.month_1.total,
        monthlyEndCost: plan.costs[finalMonthKey].total,
        totalCost: Object.values(plan.costs).reduce((sum, cost) => sum + cost.total, 0),
        costPerUser: plan.costs[finalMonthKey].total / plan.userGrowth[this.options.projectionMonths - 1]
      };
    });
    
    // Risk analysis
    summary.riskAnalysis = {
      highGrowthRisks: [
        'Database connection pool exhaustion',
        'AI processing queue overflow',
        'CDN bandwidth limits',
        'Scaling cost explosion'
      ],
      lowGrowthRisks: [
        'Over-provisioned infrastructure',
        'High per-user costs',
        'Underutilized AI resources',
        'Wasted database capacity'
      ],
      technicalRisks: [
        'Single points of failure',
        'Database scaling bottlenecks',
        'AI service rate limits',
        'Photo storage costs'
      ]
    };
    
    return summary;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(plans) {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      costOptimization: []
    };
    
    // Analyze plans for recommendations
    const conservativePlan = plans.conservative;
    const aggressivePlan = plans.aggressive;
    
    // Immediate recommendations (next 3 months)
    recommendations.immediate = [
      {
        category: 'Infrastructure',
        priority: 'high',
        recommendation: 'Implement horizontal pod autoscaling with dating app specific metrics',
        reason: 'Handle traffic spikes during peak dating hours (evenings, weekends)',
        estimatedSavings: '$500-1500/month'
      },
      {
        category: 'Database',
        priority: 'high',
        recommendation: 'Set up read replicas for profile browsing queries',
        reason: 'Profile discovery is read-heavy and can benefit from read scaling',
        estimatedSavings: '30-50% query performance improvement'
      },
      {
        category: 'Caching',
        priority: 'medium',
        recommendation: 'Implement Redis caching for user profiles and matching data',
        reason: 'Reduce database load and improve response times for repeated queries',
        estimatedSavings: '40-60% database query reduction'
      }
    ];
    
    // Short-term recommendations (3-12 months)
    recommendations.shortTerm = [
      {
        category: 'AI Processing',
        priority: 'high',
        recommendation: 'Implement async processing for bio generation and photo analysis',
        reason: 'Prevent API timeouts and improve user experience during high load',
        estimatedSavings: '50-70% reduction in API timeout errors'
      },
      {
        category: 'Storage',
        priority: 'medium',
        recommendation: 'Move photo storage to object storage with CDN',
        reason: 'Reduce storage costs and improve global photo loading performance',
        estimatedSavings: '60-80% storage cost reduction'
      },
      {
        category: 'Monitoring',
        priority: 'medium',
        recommendation: 'Implement comprehensive dating app metrics dashboard',
        reason: 'Track user engagement, conversion rates, and performance in real-time',
        estimatedSavings: 'Improved operational efficiency'
      }
    ];
    
    // Long-term recommendations (12+ months)
    recommendations.longTerm = [
      {
        category: 'Architecture',
        priority: 'high',
        recommendation: 'Consider microservices architecture for AI processing',
        reason: 'Independent scaling of AI components based on demand',
        estimatedSavings: '20-40% infrastructure cost optimization'
      },
      {
        category: 'Global Scaling',
        priority: 'medium',
        recommendation: 'Implement multi-region deployment for global users',
        reason: 'Reduce latency for international users and improve matching accuracy',
        estimatedSavings: '30-50% latency reduction globally'
      },
      {
        category: 'Machine Learning',
        priority: 'low',
        recommendation: 'Develop custom recommendation engine for better matching',
        reason: 'Improve user engagement and reduce churn through better matches',
        estimatedSavings: 'Potential 15-25% increase in user retention'
      }
    ];
    
    // Cost optimization recommendations
    recommendations.costOptimization = [
      {
        strategy: 'Reserved Instances',
        description: 'Use reserved instances for baseline compute capacity',
        potentialSavings: '30-50% on compute costs',
        requirements: 'Predictable baseline load'
      },
      {
        strategy: 'Spot Instances',
        description: 'Use spot instances for AI processing batch jobs',
        potentialSavings: '60-90% on AI processing costs',
        requirements: 'Fault-tolerant AI processing pipeline'
      },
      {
        strategy: 'Storage Optimization',
        description: 'Implement intelligent photo compression and archiving',
        potentialSavings: '40-70% on storage costs',
        requirements: 'Automated image processing pipeline'
      }
    ];
    
    return recommendations;
  }

  /**
   * Generate cost optimization strategies
   */
  generateCostOptimizations(plans) {
    return {
      strategies: [
        {
          name: 'Elastic Scaling',
          description: 'Scale infrastructure based on dating app usage patterns',
          implementation: 'Implement time-based and metric-based autoscaling',
          savings: '25-40%',
          complexity: 'Medium'
        },
        {
          name: 'AI Cost Optimization',
          description: 'Batch AI requests and use cost-effective AI models',
          implementation: 'Queue AI requests and process in batches during off-peak hours',
          savings: '30-60%',
          complexity: 'High'
        },
        {
          name: 'Storage Tiering',
          description: 'Move older photos to cheaper storage tiers',
          implementation: 'Automatic lifecycle policies for photo storage',
          savings: '50-80%',
          complexity: 'Low'
        }
      ],
      timeline: {
        immediate: 'Implement basic autoscaling and caching',
        month3: 'Optimize AI processing costs',
        month6: 'Implement storage tiering',
        month12: 'Full cost optimization strategy'
      }
    };
  }

  /**
   * Utility methods
   */
  getMonthName(monthIndex) {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return months[monthIndex % 12];
  }

  async ensureReportDirectory() {
    try {
      await fs.mkdir(this.options.reportPath, { recursive: true });
    } catch (error) {
      console.error('Error creating report directory:', error);
    }
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dating-capacity-plan-${timestamp}.json`;
    const filepath = path.join(this.options.reportPath, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    // Also save a CSV summary
    const csvContent = this.generateCSV(report);
    const csvPath = path.join(this.options.reportPath, `dating-capacity-summary-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent);
    
    console.log(`📄 Capacity plan saved to: ${filepath}`);
    console.log(`📊 CSV summary saved to: ${csvPath}`);
  }

  generateCSV(report) {
    let csv = 'Month,Scenario,Users,Monthly_Cost_USD,Cumulative_Cost_USD,CPU_Cores,DB_Connections,Storage_GB\n';
    
    Object.entries(report.scenarios).forEach(([scenario, plan]) => {
      for (let month = 1; month <= this.options.projectionMonths; month++) {
        const monthKey = `month_${month}`;
        const requirements = plan.resourceRequirements[monthKey];
        const costs = plan.costs[monthKey];
        const cumulativeCost = Object.values(plan.costs)
          .slice(0, month)
          .reduce((sum, cost) => sum + cost.total, 0);
        
        csv += `${month},${scenario},${requirements.userCount},${costs.total.toFixed(2)},${cumulativeCost.toFixed(2)},${requirements.compute.totalCores},${requirements.database.connectionPool},${Math.ceil(Object.values(requirements.storage).reduce((sum, bytes) => sum + bytes, 0) / (1024 * 1024 * 1024))}\n`;
      }
    });
    
    return csv;
  }
}

// Export for use in other modules
module.exports = DatingCapacityPlanner;

// CLI usage
if (require.main === module) {
  const planner = new DatingCapacityPlanner({
    baselineUsers: parseInt(process.env.BASELINE_USERS) || 1000,
    projectionMonths: parseInt(process.env.PROJECTION_MONTHS) || 24,
    reportPath: process.env.REPORT_PATH || './capacity-reports'
  });
  
  planner.generateCapacityPlan(['conservative', 'moderate', 'aggressive'])
    .then((report) => {
      console.log('✅ Capacity planning completed successfully');
      console.log(`📈 Projected users (24 months):`);
      console.log(`  Conservative: ${report.summary.userGrowth.conservative.endUsers.toLocaleString()}`);
      console.log(`  Moderate: ${report.summary.userGrowth.moderate.endUsers.toLocaleString()}`);
      console.log(`  Aggressive: ${report.summary.userGrowth.aggressive.endUsers.toLocaleString()}`);
      
      console.log(`💰 Estimated monthly costs (24 months):`);
      console.log(`  Conservative: $${report.summary.costProjections.conservative.monthlyEndCost.toFixed(2)}`);
      console.log(`  Moderate: $${report.summary.costProjections.moderate.monthlyEndCost.toFixed(2)}`);
      console.log(`  Aggressive: $${report.summary.costProjections.aggressive.monthlyEndCost.toFixed(2)}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Capacity planning failed:', error);
      process.exit(1);
    });
}