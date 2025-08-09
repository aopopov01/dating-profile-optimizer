const logger = require('../config/logger');
const db = require('../config/database');

class ABTestingService {
  constructor() {
    this.initialized = false;
    
    // Test configuration defaults
    this.defaultTestConfig = {
      confidence_level: 0.95, // 95% confidence
      minimum_sample_size: 30,
      maximum_test_duration_days: 30,
      minimum_effect_size: 0.1, // 10% minimum improvement
      early_stopping_threshold: 0.99 // 99% confidence for early stopping
    };

    // Success metrics for dating profile optimization
    this.successMetrics = {
      bio_effectiveness: {
        primary: 'engagement_rate',
        secondary: ['like_rate', 'message_rate', 'match_rate'],
        weights: {
          engagement_rate: 0.4,
          like_rate: 0.3,
          message_rate: 0.2,
          match_rate: 0.1
        }
      },
      photo_effectiveness: {
        primary: 'attractiveness_score',
        secondary: ['like_rate', 'view_duration', 'swipe_right_rate'],
        weights: {
          attractiveness_score: 0.3,
          like_rate: 0.25,
          view_duration: 0.25,
          swipe_right_rate: 0.2
        }
      }
    };

    // Test types and their configurations
    this.testTypes = {
      bio_variation: {
        name: 'Bio A/B Test',
        description: 'Test different bio variations for effectiveness',
        metrics: ['engagement_rate', 'like_rate', 'message_rate'],
        duration_days: 14,
        required_interactions: 50
      },
      photo_order: {
        name: 'Photo Order Test',
        description: 'Test different photo arrangements',
        metrics: ['swipe_right_rate', 'like_rate', 'profile_views'],
        duration_days: 7,
        required_interactions: 100
      },
      personality_matching: {
        name: 'Personality-Based Bio Test',
        description: 'Test personality-matched bio styles',
        metrics: ['compatibility_score', 'match_rate', 'conversation_length'],
        duration_days: 21,
        required_interactions: 30
      },
      platform_optimization: {
        name: 'Platform-Specific Test',
        description: 'Test platform-specific bio optimizations',
        metrics: ['platform_engagement', 'cross_platform_consistency'],
        duration_days: 14,
        required_interactions: 40
      }
    };
  }

  async initialize() {
    try {
      logger.info('Initializing A/B Testing Service...');

      // Ensure database tables exist for A/B testing
      await this.ensureTablesExist();

      // Initialize active tests tracking
      await this.loadActiveTests();

      this.initialized = true;
      logger.info('A/B Testing Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('A/B Testing Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create a new A/B test
   */
  async createTest(testConfig) {
    try {
      const {
        user_id,
        test_type,
        test_name,
        description,
        variants,
        target_metric = 'engagement_rate',
        confidence_level = this.defaultTestConfig.confidence_level,
        minimum_sample_size = this.defaultTestConfig.minimum_sample_size,
        duration_days = null,
        metadata = {}
      } = testConfig;

      // Validate test configuration
      const validation = this.validateTestConfig(testConfig);
      if (!validation.valid) {
        throw new Error(`Invalid test configuration: ${validation.errors.join(', ')}`);
      }

      // Calculate test parameters
      const testParams = this.calculateTestParameters({
        variants: variants.length,
        confidence_level,
        minimum_sample_size,
        target_metric
      });

      // Create test record
      const [test] = await db('ab_tests').insert({
        user_id,
        test_type,
        test_name,
        description,
        status: 'active',
        variants: JSON.stringify(variants),
        target_metric,
        confidence_level,
        minimum_sample_size: testParams.required_sample_size,
        max_duration_days: duration_days || this.testTypes[test_type]?.duration_days || 14,
        metadata: JSON.stringify(metadata),
        created_at: new Date(),
        started_at: new Date()
      }).returning('*');

      // Initialize variant performance tracking
      await this.initializeVariantTracking(test.id, variants);

      // Log test creation
      logger.info('A/B test created:', {
        testId: test.id,
        userId: user_id,
        testType: test_type,
        variants: variants.length,
        targetMetric: target_metric
      });

      return {
        success: true,
        test_id: test.id,
        test_config: {
          name: test_name,
          type: test_type,
          variants: variants.length,
          required_sample_size: testParams.required_sample_size,
          estimated_duration_days: testParams.estimated_duration_days,
          target_metric
        },
        next_steps: this.getTestNextSteps(test)
      };
    } catch (error) {
      logger.error('A/B test creation failed:', error);
      throw error;
    }
  }

  /**
   * Record interaction for A/B test
   */
  async recordInteraction(testId, variantId, interaction) {
    try {
      const {
        user_id,
        interaction_type,
        value = 1,
        metadata = {},
        timestamp = new Date()
      } = interaction;

      // Record the interaction
      await db('ab_test_interactions').insert({
        test_id: testId,
        variant_id: variantId,
        user_id,
        interaction_type,
        value,
        metadata: JSON.stringify(metadata),
        created_at: timestamp
      });

      // Update variant statistics
      await this.updateVariantStats(testId, variantId, interaction_type, value);

      // Check if test should be analyzed
      const shouldAnalyze = await this.shouldAnalyzeTest(testId);
      if (shouldAnalyze) {
        const analysis = await this.analyzeTest(testId);
        
        // Check for early stopping conditions
        if (analysis.can_stop_early) {
          await this.stopTest(testId, 'early_stopping', analysis);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to record A/B test interaction:', error);
      throw error;
    }
  }

  /**
   * Analyze A/B test results
   */
  async analyzeTest(testId) {
    try {
      // Get test configuration
      const test = await db('ab_tests').where('id', testId).first();
      if (!test) {
        throw new Error('Test not found');
      }

      // Get variant performance data
      const variantStats = await this.getVariantStatistics(testId);
      
      // Perform statistical analysis
      const statisticalAnalysis = this.performStatisticalAnalysis(variantStats, {
        target_metric: test.target_metric,
        confidence_level: test.confidence_level
      });

      // Calculate business impact
      const businessImpact = this.calculateBusinessImpact(variantStats, test.target_metric);

      // Determine winner and significance
      const testResults = this.determineTestResults(statisticalAnalysis, businessImpact, test);

      // Update test with results
      await this.updateTestResults(testId, {
        statistical_analysis: statisticalAnalysis,
        business_impact: businessImpact,
        results: testResults
      });

      const analysis = {
        test_id: testId,
        test_name: test.test_name,
        status: test.status,
        duration_days: this.calculateTestDuration(test),
        variants: variantStats,
        statistical_analysis: statisticalAnalysis,
        business_impact: businessImpact,
        results: testResults,
        recommendations: this.generateRecommendations(testResults, businessImpact),
        can_stop_early: testResults.is_significant && statisticalAnalysis.confidence >= 0.99
      };

      logger.info('A/B test analyzed:', {
        testId,
        winner: testResults.winner,
        isSignificant: testResults.is_significant,
        confidence: statisticalAnalysis.confidence
      });

      return analysis;
    } catch (error) {
      logger.error('A/B test analysis failed:', error);
      throw error;
    }
  }

  /**
   * Perform statistical analysis using t-test and other methods
   */
  performStatisticalAnalysis(variantStats, config) {
    try {
      const { target_metric, confidence_level } = config;
      
      // Calculate sample sizes and means for each variant
      const variants = Object.keys(variantStats).map(variantId => {
        const stats = variantStats[variantId];
        const metric = stats.metrics[target_metric] || {};
        
        return {
          id: variantId,
          name: stats.name,
          sample_size: stats.total_interactions,
          mean: metric.mean || 0,
          std: metric.std || 0,
          conversion_rate: metric.conversion_rate || 0
        };
      });

      // Perform pairwise comparisons (focusing on control vs variants)
      const comparisons = [];
      const controlVariant = variants[0]; // Assume first variant is control
      
      for (let i = 1; i < variants.length; i++) {
        const testVariant = variants[i];
        const comparison = this.performTTest(controlVariant, testVariant, confidence_level);
        comparisons.push({
          control: controlVariant.id,
          variant: testVariant.id,
          ...comparison
        });
      }

      // Calculate overall test confidence
      const overallConfidence = this.calculateOverallConfidence(comparisons);

      // Determine best performing variant
      const bestVariant = variants.reduce((best, current) => 
        current.mean > best.mean ? current : best
      );

      return {
        method: 'welch_t_test',
        confidence_level,
        overall_confidence: overallConfidence,
        comparisons,
        best_variant: bestVariant.id,
        sample_size_adequacy: this.checkSampleSizeAdequacy(variants, config),
        power_analysis: this.calculatePower(variants, config)
      };
    } catch (error) {
      logger.error('Statistical analysis failed:', error);
      return {
        error: error.message,
        confidence: 0
      };
    }
  }

  /**
   * Perform Welch's t-test for two variants
   */
  performTTest(variant1, variant2, confidenceLevel) {
    try {
      // Handle edge cases
      if (variant1.sample_size < 2 || variant2.sample_size < 2) {
        return {
          t_statistic: 0,
          p_value: 1,
          is_significant: false,
          confidence: 0,
          effect_size: 0
        };
      }

      // Calculate pooled standard error
      const se1 = Math.pow(variant1.std, 2) / variant1.sample_size;
      const se2 = Math.pow(variant2.std, 2) / variant2.sample_size;
      const pooledSE = Math.sqrt(se1 + se2);

      // Calculate t-statistic
      const meanDiff = variant2.mean - variant1.mean;
      const tStatistic = pooledSE > 0 ? meanDiff / pooledSE : 0;

      // Calculate degrees of freedom (Welch's formula)
      const df = Math.pow(se1 + se2, 2) / (
        Math.pow(se1, 2) / (variant1.sample_size - 1) +
        Math.pow(se2, 2) / (variant2.sample_size - 1)
      );

      // Approximate p-value (simplified calculation)
      const pValue = this.approximatePValue(Math.abs(tStatistic), df);
      
      // Check significance
      const alpha = 1 - confidenceLevel;
      const isSignificant = pValue < alpha;
      
      // Calculate effect size (Cohen's d)
      const pooledStd = Math.sqrt(((variant1.sample_size - 1) * Math.pow(variant1.std, 2) +
                                  (variant2.sample_size - 1) * Math.pow(variant2.std, 2)) /
                                 (variant1.sample_size + variant2.sample_size - 2));
      const effectSize = pooledStd > 0 ? meanDiff / pooledStd : 0;

      return {
        t_statistic: tStatistic,
        degrees_of_freedom: df,
        p_value: pValue,
        is_significant: isSignificant,
        confidence: 1 - pValue,
        effect_size: effectSize,
        mean_difference: meanDiff,
        relative_improvement: variant1.mean > 0 ? (meanDiff / variant1.mean) * 100 : 0
      };
    } catch (error) {
      logger.error('T-test calculation failed:', error);
      return {
        error: error.message,
        is_significant: false,
        confidence: 0
      };
    }
  }

  /**
   * Approximate p-value using simplified t-distribution
   */
  approximatePValue(tStat, df) {
    // Simplified approximation - in production, use proper statistical library
    if (df > 30) {
      // Use normal approximation for large df
      return 2 * (1 - this.normalCDF(tStat));
    } else {
      // Simplified t-distribution approximation
      const factor = Math.sqrt(df / (df + Math.pow(tStat, 2)));
      return 2 * (1 - this.normalCDF(tStat * factor));
    }
  }

  /**
   * Normal cumulative distribution function approximation
   */
  normalCDF(x) {
    // Simplified approximation using error function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  erf(x) {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Calculate business impact metrics
   */
  calculateBusinessImpact(variantStats, targetMetric) {
    try {
      const variants = Object.keys(variantStats);
      if (variants.length < 2) return {};

      const controlStats = variantStats[variants[0]];
      const controlMetric = controlStats.metrics[targetMetric]?.mean || 0;

      const impacts = [];
      
      for (let i = 1; i < variants.length; i++) {
        const variantId = variants[i];
        const variantStats = variantStats[variantId];
        const variantMetric = variantStats.metrics[targetMetric]?.mean || 0;
        
        const absoluteImprovement = variantMetric - controlMetric;
        const relativeImprovement = controlMetric > 0 ? (absoluteImprovement / controlMetric) * 100 : 0;
        
        // Estimate potential impact
        const estimatedUsers = 1000; // Estimate based on user base
        const annualImpact = this.estimateAnnualImpact(absoluteImprovement, estimatedUsers, targetMetric);
        
        impacts.push({
          variant_id: variantId,
          absolute_improvement: absoluteImprovement,
          relative_improvement: relativeImprovement,
          estimated_annual_impact: annualImpact,
          confidence_interval: this.calculateConfidenceInterval(variantStats, targetMetric)
        });
      }

      return {
        control_baseline: controlMetric,
        variant_impacts: impacts,
        best_improvement: impacts.reduce((best, current) => 
          current.relative_improvement > best.relative_improvement ? current : best, 
          impacts[0] || {}
        )
      };
    } catch (error) {
      logger.error('Business impact calculation failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Estimate annual business impact
   */
  estimateAnnualImpact(improvement, estimatedUsers, metric) {
    // Simplified impact estimation - customize based on business model
    const impactMultipliers = {
      engagement_rate: { value: 10, description: 'increased user engagement' },
      like_rate: { value: 5, description: 'more likes per user' },
      message_rate: { value: 20, description: 'more conversations' },
      match_rate: { value: 50, description: 'more successful matches' }
    };

    const multiplier = impactMultipliers[metric] || { value: 1, description: 'general improvement' };
    const annualValue = improvement * estimatedUsers * multiplier.value * 365;

    return {
      estimated_value: annualValue,
      unit: multiplier.description,
      assumptions: {
        daily_active_users: estimatedUsers,
        value_per_improvement: multiplier.value
      }
    };
  }

  /**
   * Generate test recommendations
   */
  generateRecommendations(testResults, businessImpact) {
    const recommendations = [];

    if (testResults.is_significant) {
      if (testResults.winner !== 'control') {
        recommendations.push({
          type: 'implementation',
          priority: 'high',
          action: `Implement ${testResults.winner_name} as the new default`,
          expected_impact: businessImpact.best_improvement?.relative_improvement || 0,
          confidence: testResults.confidence
        });
      } else {
        recommendations.push({
          type: 'analysis',
          priority: 'medium',
          action: 'Control variant performed best - analyze why alternatives underperformed',
          expected_impact: 0,
          confidence: testResults.confidence
        });
      }
    } else {
      recommendations.push({
        type: 'continue_testing',
        priority: 'medium',
        action: 'Results not yet significant - continue test or increase sample size',
        expected_impact: 'TBD',
        confidence: testResults.confidence
      });
    }

    // Sample size recommendations
    if (testResults.sample_size_adequate === false) {
      recommendations.push({
        type: 'sample_size',
        priority: 'high',
        action: 'Increase sample size to reach statistical significance',
        expected_impact: 'Improved confidence',
        confidence: testResults.confidence
      });
    }

    // Duration recommendations
    if (testResults.duration_adequate === false) {
      recommendations.push({
        type: 'duration',
        priority: 'medium',
        action: 'Extend test duration to capture more user behavior patterns',
        expected_impact: 'More reliable results',
        confidence: testResults.confidence
      });
    }

    return recommendations;
  }

  /**
   * Get variant statistics
   */
  async getVariantStatistics(testId) {
    try {
      const interactions = await db('ab_test_interactions')
        .where('test_id', testId)
        .select('variant_id', 'interaction_type', 'value', 'created_at');

      const variantStats = {};

      // Group by variant
      interactions.forEach(interaction => {
        const variantId = interaction.variant_id;
        
        if (!variantStats[variantId]) {
          variantStats[variantId] = {
            variant_id: variantId,
            total_interactions: 0,
            metrics: {}
          };
        }

        variantStats[variantId].total_interactions++;
        
        const metricType = interaction.interaction_type;
        if (!variantStats[variantId].metrics[metricType]) {
          variantStats[variantId].metrics[metricType] = {
            count: 0,
            total: 0,
            values: []
          };
        }

        variantStats[variantId].metrics[metricType].count++;
        variantStats[variantId].metrics[metricType].total += interaction.value;
        variantStats[variantId].metrics[metricType].values.push(interaction.value);
      });

      // Calculate statistics for each variant and metric
      Object.keys(variantStats).forEach(variantId => {
        const variant = variantStats[variantId];
        
        Object.keys(variant.metrics).forEach(metricType => {
          const metric = variant.metrics[metricType];
          const values = metric.values;
          
          if (values.length > 0) {
            metric.mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            metric.std = Math.sqrt(
              values.reduce((sum, val) => sum + Math.pow(val - metric.mean, 2), 0) / values.length
            );
            metric.conversion_rate = metric.count / variant.total_interactions;
          }
        });
      });

      return variantStats;
    } catch (error) {
      logger.error('Failed to get variant statistics:', error);
      throw error;
    }
  }

  /**
   * Stop A/B test
   */
  async stopTest(testId, reason, analysis = null) {
    try {
      const updateData = {
        status: 'completed',
        ended_at: new Date(),
        stop_reason: reason
      };

      if (analysis) {
        updateData.final_results = JSON.stringify(analysis);
      }

      await db('ab_tests')
        .where('id', testId)
        .update(updateData);

      logger.info('A/B test stopped:', { testId, reason });
      
      return { success: true, reason };
    } catch (error) {
      logger.error('Failed to stop A/B test:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  validateTestConfig(config) {
    const errors = [];
    
    if (!config.user_id) errors.push('User ID is required');
    if (!config.test_type) errors.push('Test type is required');
    if (!config.variants || config.variants.length < 2) {
      errors.push('At least 2 variants are required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  calculateTestParameters(config) {
    const { variants, confidence_level, minimum_sample_size } = config;
    
    // Simplified sample size calculation
    const requiredSampleSize = Math.max(
      minimum_sample_size * variants,
      100 * variants // Minimum 100 per variant
    );
    
    // Estimate duration based on expected traffic
    const dailyInteractions = 50; // Estimated daily interactions per user
    const estimatedDurationDays = Math.ceil(requiredSampleSize / dailyInteractions);
    
    return {
      required_sample_size: requiredSampleSize,
      estimated_duration_days: estimatedDurationDays
    };
  }

  async ensureTablesExist() {
    // This would create necessary tables if they don't exist
    // For now, assume tables are created via migrations
    return true;
  }

  async loadActiveTests() {
    // Load active tests for monitoring
    return true;
  }

  async initializeVariantTracking(testId, variants) {
    // Initialize tracking for each variant
    return true;
  }

  async updateVariantStats(testId, variantId, interactionType, value) {
    // Update real-time statistics
    return true;
  }

  async shouldAnalyzeTest(testId) {
    // Check if test has enough data for analysis
    return false; // Simplified for now
  }

  determineTestResults(statisticalAnalysis, businessImpact, test) {
    const isSignificant = statisticalAnalysis.overall_confidence >= test.confidence_level;
    const winner = isSignificant ? statisticalAnalysis.best_variant : 'inconclusive';
    
    return {
      is_significant: isSignificant,
      winner,
      winner_name: winner,
      confidence: statisticalAnalysis.overall_confidence,
      sample_size_adequate: true, // Simplified
      duration_adequate: true // Simplified
    };
  }

  calculateOverallConfidence(comparisons) {
    if (!comparisons.length) return 0;
    return comparisons.reduce((sum, comp) => sum + comp.confidence, 0) / comparisons.length;
  }

  checkSampleSizeAdequacy(variants, config) {
    return variants.every(v => v.sample_size >= config.minimum_sample_size);
  }

  calculatePower(variants, config) {
    // Simplified power analysis
    return {
      statistical_power: 0.8,
      effect_size: 'medium'
    };
  }

  calculateTestDuration(test) {
    const start = new Date(test.started_at);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  calculateConfidenceInterval(variantStats, metric) {
    // Simplified confidence interval calculation
    const metricData = variantStats.metrics[metric];
    if (!metricData) return { lower: 0, upper: 0 };
    
    const margin = 1.96 * (metricData.std / Math.sqrt(variantStats.total_interactions));
    return {
      lower: metricData.mean - margin,
      upper: metricData.mean + margin
    };
  }

  updateTestResults(testId, results) {
    // Update test with analysis results
    return db('ab_tests')
      .where('id', testId)
      .update({
        analysis_results: JSON.stringify(results),
        last_analyzed: new Date()
      });
  }

  getTestNextSteps(test) {
    return [
      'Start recording user interactions with variants',
      'Monitor test progress daily',
      'Analyze results when minimum sample size is reached'
    ];
  }

  /**
   * Get user's active tests
   */
  async getUserTests(userId, status = 'active') {
    try {
      const tests = await db('ab_tests')
        .where('user_id', userId)
        .andWhere('status', status)
        .orderBy('created_at', 'desc');

      return tests.map(test => ({
        id: test.id,
        name: test.test_name,
        type: test.test_type,
        status: test.status,
        created_at: test.created_at,
        progress: this.calculateTestProgress(test)
      }));
    } catch (error) {
      logger.error('Failed to get user tests:', error);
      throw error;
    }
  }

  calculateTestProgress(test) {
    // Calculate test progress as percentage
    const daysRunning = this.calculateTestDuration(test);
    const maxDays = test.max_duration_days;
    return Math.min(100, (daysRunning / maxDays) * 100);
  }

  /**
   * Get test dashboard data
   */
  async getTestDashboard(userId) {
    try {
      const activeTests = await this.getUserTests(userId, 'active');
      const completedTests = await this.getUserTests(userId, 'completed');
      
      // Calculate summary statistics
      const totalTests = activeTests.length + completedTests.length;
      const successfulTests = completedTests.filter(test => 
        test.final_results && JSON.parse(test.final_results).results?.is_significant
      ).length;
      
      return {
        summary: {
          total_tests: totalTests,
          active_tests: activeTests.length,
          completed_tests: completedTests.length,
          successful_tests: successfulTests,
          success_rate: completedTests.length > 0 ? (successfulTests / completedTests.length) * 100 : 0
        },
        active_tests: activeTests,
        recent_completed: completedTests.slice(0, 5)
      };
    } catch (error) {
      logger.error('Failed to get test dashboard:', error);
      throw error;
    }
  }
}

module.exports = new ABTestingService();