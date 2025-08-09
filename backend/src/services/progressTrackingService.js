const Redis = require('ioredis');
const logger = require('../config/logger');
const db = require('../config/database');

class ProgressTrackingService {
  constructor() {
    this.redis = null;
    this.initialized = false;
    this.progressSubscribers = new Map(); // jobId -> Set of subscriber functions
    
    // Progress tracking configurations
    this.progressConfigs = {
      bio_generation: {
        steps: [
          { id: 'validation', name: 'Validating profile data', weight: 10 },
          { id: 'photo_analysis', name: 'Analyzing photos', weight: 20 },
          { id: 'personality_detection', name: 'Detecting personality traits', weight: 15 },
          { id: 'bio_generation', name: 'Generating bio variations', weight: 40 },
          { id: 'optimization', name: 'Optimizing content', weight: 10 },
          { id: 'finalization', name: 'Finalizing results', weight: 5 }
        ],
        estimated_duration_seconds: 45
      },
      photo_analysis: {
        steps: [
          { id: 'preprocessing', name: 'Preprocessing image', weight: 20 },
          { id: 'quality_assessment', name: 'Assessing photo quality', weight: 25 },
          { id: 'face_detection', name: 'Detecting and analyzing faces', weight: 30 },
          { id: 'attractiveness_scoring', name: 'Calculating attractiveness score', weight: 20 },
          { id: 'recommendations', name: 'Generating recommendations', weight: 5 }
        ],
        estimated_duration_seconds: 30
      },
      batch_photo_analysis: {
        steps: [
          { id: 'validation', name: 'Validating photos', weight: 10 },
          { id: 'batch_processing', name: 'Processing photos', weight: 80 },
          { id: 'summary_generation', name: 'Generating summary', weight: 10 }
        ],
        estimated_duration_seconds: 90
      },
      ab_test_setup: {
        steps: [
          { id: 'variation_generation', name: 'Generating test variations', weight: 60 },
          { id: 'test_configuration', name: 'Configuring A/B test', weight: 30 },
          { id: 'test_activation', name: 'Activating test', weight: 10 }
        ],
        estimated_duration_seconds: 25
      }
    };

    // Status update intervals
    this.updateIntervals = {
      fast: 500,    // 0.5 seconds for quick operations
      normal: 2000, // 2 seconds for regular operations  
      slow: 5000    // 5 seconds for long operations
    };

    // Progress storage TTL (Time To Live)
    this.progressTTL = 3600; // 1 hour
  }

  async initialize() {
    try {
      logger.info('Initializing Progress Tracking Service...');

      // Initialize Redis connection for real-time updates
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });

        this.redis.on('error', (error) => {
          logger.error('Redis connection error in Progress Tracking:', error);
        });

        await this.redis.connect();
        logger.info('Redis connection established for progress tracking');
      } else {
        logger.warn('Redis not available - progress tracking will use database only');
      }

      this.initialized = true;
      logger.info('Progress Tracking Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Progress Tracking Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start tracking progress for a job
   */
  async startProgress(jobId, jobType, userId, options = {}) {
    try {
      const config = this.progressConfigs[jobType];
      if (!config) {
        throw new Error(`Unknown job type: ${jobType}`);
      }

      const progressData = {
        job_id: jobId,
        job_type: jobType,
        user_id: userId,
        status: 'started',
        current_step: 0,
        total_steps: config.steps.length,
        progress_percentage: 0,
        estimated_duration_seconds: config.estimated_duration_seconds,
        started_at: new Date().toISOString(),
        current_step_name: config.steps[0].name,
        steps: config.steps,
        metadata: options.metadata || {},
        error: null
      };

      // Store in Redis for real-time access
      if (this.redis) {
        await this.redis.setex(
          `progress:${jobId}`, 
          this.progressTTL, 
          JSON.stringify(progressData)
        );
      }

      // Store in database for persistence
      await this.storeProgressInDB(progressData);

      logger.debug('Progress tracking started:', { jobId, jobType, userId });

      return progressData;
    } catch (error) {
      logger.error('Failed to start progress tracking:', error);
      throw error;
    }
  }

  /**
   * Update progress to next step
   */
  async updateProgress(jobId, stepId, customProgress = null, metadata = {}) {
    try {
      const progressData = await this.getProgress(jobId);
      if (!progressData) {
        throw new Error('Progress data not found for job: ' + jobId);
      }

      const config = this.progressConfigs[progressData.job_type];
      const stepIndex = config.steps.findIndex(step => step.id === stepId);
      
      if (stepIndex === -1) {
        throw new Error(`Unknown step: ${stepId} for job type: ${progressData.job_type}`);
      }

      // Calculate progress percentage
      let progressPercentage;
      if (customProgress !== null) {
        progressPercentage = Math.min(100, Math.max(0, customProgress));
      } else {
        // Calculate based on completed steps weight
        let completedWeight = 0;
        for (let i = 0; i < stepIndex; i++) {
          completedWeight += config.steps[i].weight;
        }
        progressPercentage = Math.round(completedWeight);
      }

      // Update progress data
      const updatedProgress = {
        ...progressData,
        current_step: stepIndex,
        progress_percentage: progressPercentage,
        current_step_name: config.steps[stepIndex].name,
        last_updated: new Date().toISOString(),
        metadata: { ...progressData.metadata, ...metadata }
      };

      // Calculate estimated completion time
      if (progressPercentage > 0 && progressPercentage < 100) {
        const elapsed = new Date() - new Date(progressData.started_at);
        const totalEstimated = (elapsed / progressPercentage) * 100;
        const remaining = totalEstimated - elapsed;
        
        updatedProgress.estimated_completion = new Date(Date.now() + remaining).toISOString();
      }

      // Store updated progress
      await this.storeProgress(updatedProgress);

      // Notify subscribers
      this.notifySubscribers(jobId, updatedProgress);

      logger.debug('Progress updated:', {
        jobId,
        stepId,
        progress: progressPercentage,
        stepName: config.steps[stepIndex].name
      });

      return updatedProgress;
    } catch (error) {
      logger.error('Failed to update progress:', error);
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  async completeProgress(jobId, result = {}) {
    try {
      const progressData = await this.getProgress(jobId);
      if (!progressData) {
        throw new Error('Progress data not found for job: ' + jobId);
      }

      const completedProgress = {
        ...progressData,
        status: 'completed',
        progress_percentage: 100,
        current_step: progressData.total_steps - 1,
        current_step_name: 'Completed',
        completed_at: new Date().toISOString(),
        result,
        metadata: { ...progressData.metadata, completion_result: result }
      };

      // Calculate actual duration
      const actualDuration = Math.round(
        (new Date(completedProgress.completed_at) - new Date(progressData.started_at)) / 1000
      );
      completedProgress.actual_duration_seconds = actualDuration;

      await this.storeProgress(completedProgress);
      this.notifySubscribers(jobId, completedProgress);

      // Store completion metrics
      await this.recordCompletionMetrics(jobId, progressData.job_type, actualDuration);

      logger.info('Progress completed:', {
        jobId,
        jobType: progressData.job_type,
        actualDuration: `${actualDuration}s`,
        estimatedDuration: `${progressData.estimated_duration_seconds}s`
      });

      return completedProgress;
    } catch (error) {
      logger.error('Failed to complete progress:', error);
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  async failProgress(jobId, error) {
    try {
      const progressData = await this.getProgress(jobId);
      if (!progressData) {
        logger.warn('Progress data not found for failed job:', jobId);
        return;
      }

      const failedProgress = {
        ...progressData,
        status: 'failed',
        failed_at: new Date().toISOString(),
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        },
        metadata: { ...progressData.metadata, failure_reason: error.message }
      };

      await this.storeProgress(failedProgress);
      this.notifySubscribers(jobId, failedProgress);

      logger.warn('Progress marked as failed:', {
        jobId,
        jobType: progressData.job_type,
        error: error.message
      });

      return failedProgress;
    } catch (err) {
      logger.error('Failed to mark progress as failed:', err);
      throw err;
    }
  }

  /**
   * Get current progress for a job
   */
  async getProgress(jobId) {
    try {
      // Try Redis first for latest data
      if (this.redis) {
        const redisData = await this.redis.get(`progress:${jobId}`);
        if (redisData) {
          return JSON.parse(redisData);
        }
      }

      // Fallback to database
      const dbRecord = await db('job_progress').where('job_id', jobId).first();
      if (dbRecord) {
        return {
          job_id: dbRecord.job_id,
          job_type: dbRecord.job_type,
          user_id: dbRecord.user_id,
          status: dbRecord.status,
          current_step: dbRecord.current_step,
          total_steps: dbRecord.total_steps,
          progress_percentage: dbRecord.progress_percentage,
          estimated_duration_seconds: dbRecord.estimated_duration_seconds,
          actual_duration_seconds: dbRecord.actual_duration_seconds,
          started_at: dbRecord.started_at,
          completed_at: dbRecord.completed_at,
          failed_at: dbRecord.failed_at,
          current_step_name: dbRecord.current_step_name,
          last_updated: dbRecord.last_updated,
          estimated_completion: dbRecord.estimated_completion,
          steps: JSON.parse(dbRecord.steps || '[]'),
          metadata: JSON.parse(dbRecord.metadata || '{}'),
          result: JSON.parse(dbRecord.result || 'null'),
          error: JSON.parse(dbRecord.error || 'null')
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to get progress:', error);
      throw error;
    }
  }

  /**
   * Subscribe to progress updates for a job
   */
  subscribeToProgress(jobId, callback) {
    if (!this.progressSubscribers.has(jobId)) {
      this.progressSubscribers.set(jobId, new Set());
    }
    
    this.progressSubscribers.get(jobId).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.progressSubscribers.get(jobId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.progressSubscribers.delete(jobId);
        }
      }
    };
  }

  /**
   * Get progress for multiple jobs
   */
  async getBatchProgress(jobIds) {
    try {
      const progressData = {};
      
      for (const jobId of jobIds) {
        progressData[jobId] = await this.getProgress(jobId);
      }
      
      return progressData;
    } catch (error) {
      logger.error('Failed to get batch progress:', error);
      throw error;
    }
  }

  /**
   * Get user's recent job progress
   */
  async getUserRecentProgress(userId, limit = 10) {
    try {
      const records = await db('job_progress')
        .where('user_id', userId)
        .orderBy('started_at', 'desc')
        .limit(limit)
        .select([
          'job_id', 'job_type', 'status', 'progress_percentage',
          'started_at', 'completed_at', 'failed_at', 'current_step_name'
        ]);

      return records;
    } catch (error) {
      logger.error('Failed to get user recent progress:', error);
      throw error;
    }
  }

  /**
   * Get progress statistics
   */
  async getProgressStatistics(timeframe = '24h') {
    try {
      let timeCondition;
      const now = new Date();
      
      switch (timeframe) {
        case '1h':
          timeCondition = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          timeCondition = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeCondition = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          timeCondition = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const stats = await db('job_progress')
        .where('started_at', '>=', timeCondition)
        .select(
          db.raw('job_type'),
          db.raw('COUNT(*) as total_jobs'),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed_jobs', ['completed']),
          db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as failed_jobs', ['failed']),
          db.raw('AVG(actual_duration_seconds) as avg_duration'),
          db.raw('AVG(progress_percentage) as avg_progress')
        )
        .groupBy('job_type');

      const summary = {
        timeframe,
        job_types: {},
        overall: {
          total_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          success_rate: 0,
          avg_duration_seconds: 0
        }
      };

      let totalJobs = 0, totalCompleted = 0, totalFailed = 0, totalDuration = 0;
      
      stats.forEach(stat => {
        const successRate = stat.total_jobs > 0 ? (stat.completed_jobs / stat.total_jobs) * 100 : 0;
        
        summary.job_types[stat.job_type] = {
          total_jobs: parseInt(stat.total_jobs),
          completed_jobs: parseInt(stat.completed_jobs),
          failed_jobs: parseInt(stat.failed_jobs),
          success_rate: Math.round(successRate),
          avg_duration_seconds: Math.round(stat.avg_duration || 0),
          avg_progress: Math.round(stat.avg_progress || 0)
        };

        totalJobs += parseInt(stat.total_jobs);
        totalCompleted += parseInt(stat.completed_jobs);
        totalFailed += parseInt(stat.failed_jobs);
        totalDuration += (stat.avg_duration || 0) * parseInt(stat.total_jobs);
      });

      summary.overall = {
        total_jobs: totalJobs,
        completed_jobs: totalCompleted,
        failed_jobs: totalFailed,
        success_rate: totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0,
        avg_duration_seconds: totalJobs > 0 ? Math.round(totalDuration / totalJobs) : 0
      };

      return summary;
    } catch (error) {
      logger.error('Failed to get progress statistics:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  async storeProgress(progressData) {
    try {
      // Store in Redis for real-time access
      if (this.redis) {
        await this.redis.setex(
          `progress:${progressData.job_id}`,
          this.progressTTL,
          JSON.stringify(progressData)
        );
      }

      // Store/update in database for persistence
      await this.storeProgressInDB(progressData);
    } catch (error) {
      logger.error('Failed to store progress:', error);
      throw error;
    }
  }

  async storeProgressInDB(progressData) {
    try {
      const dbData = {
        job_id: progressData.job_id,
        job_type: progressData.job_type,
        user_id: progressData.user_id,
        status: progressData.status,
        current_step: progressData.current_step,
        total_steps: progressData.total_steps,
        progress_percentage: progressData.progress_percentage,
        estimated_duration_seconds: progressData.estimated_duration_seconds,
        actual_duration_seconds: progressData.actual_duration_seconds,
        started_at: progressData.started_at,
        completed_at: progressData.completed_at,
        failed_at: progressData.failed_at,
        current_step_name: progressData.current_step_name,
        last_updated: progressData.last_updated || new Date().toISOString(),
        estimated_completion: progressData.estimated_completion,
        steps: JSON.stringify(progressData.steps || []),
        metadata: JSON.stringify(progressData.metadata || {}),
        result: JSON.stringify(progressData.result || null),
        error: JSON.stringify(progressData.error || null)
      };

      // Use upsert (insert or update)
      const exists = await db('job_progress').where('job_id', progressData.job_id).first();
      
      if (exists) {
        await db('job_progress')
          .where('job_id', progressData.job_id)
          .update(dbData);
      } else {
        await db('job_progress').insert(dbData);
      }
    } catch (error) {
      logger.error('Failed to store progress in database:', error);
      throw error;
    }
  }

  notifySubscribers(jobId, progressData) {
    const subscribers = this.progressSubscribers.get(jobId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(progressData);
        } catch (error) {
          logger.error('Progress subscriber callback failed:', error);
        }
      });
    }
  }

  async recordCompletionMetrics(jobId, jobType, actualDuration) {
    try {
      // Store performance metrics for analysis
      const config = this.progressConfigs[jobType];
      if (config) {
        const performanceRatio = actualDuration / config.estimated_duration_seconds;
        
        // Log if significantly over/under estimated time
        if (performanceRatio > 1.5 || performanceRatio < 0.5) {
          logger.warn('Job duration significantly different from estimate:', {
            jobId,
            jobType,
            estimated: config.estimated_duration_seconds,
            actual: actualDuration,
            ratio: performanceRatio.toFixed(2)
          });
        }
      }
    } catch (error) {
      logger.error('Failed to record completion metrics:', error);
    }
  }

  /**
   * Cleanup old progress records
   */
  async cleanupOldProgress(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await db('job_progress')
        .where('started_at', '<', cutoffDate)
        .whereIn('status', ['completed', 'failed'])
        .del();

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old progress records`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old progress records:', error);
      return 0;
    }
  }

  /**
   * Create a progress wrapper for async operations
   */
  createProgressWrapper(jobId, jobType, userId, options = {}) {
    let currentStep = 0;
    const config = this.progressConfigs[jobType];
    
    if (!config) {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    return {
      start: async () => {
        return await this.startProgress(jobId, jobType, userId, options);
      },
      
      nextStep: async (stepId, metadata = {}) => {
        return await this.updateProgress(jobId, stepId, null, metadata);
      },
      
      updateCustomProgress: async (percentage, metadata = {}) => {
        const stepId = config.steps[currentStep]?.id || 'custom';
        return await this.updateProgress(jobId, stepId, percentage, metadata);
      },
      
      complete: async (result = {}) => {
        return await this.completeProgress(jobId, result);
      },
      
      fail: async (error) => {
        return await this.failProgress(jobId, error);
      },
      
      getCurrentProgress: async () => {
        return await this.getProgress(jobId);
      }
    };
  }

  /**
   * Get progress tracking configurations
   */
  getAvailableJobTypes() {
    return Object.keys(this.progressConfigs).map(jobType => ({
      job_type: jobType,
      steps: this.progressConfigs[jobType].steps.length,
      estimated_duration: this.progressConfigs[jobType].estimated_duration_seconds,
      step_details: this.progressConfigs[jobType].steps
    }));
  }

  /**
   * Estimate completion time based on current progress
   */
  estimateCompletion(progressData) {
    if (!progressData || progressData.progress_percentage === 0) {
      return null;
    }

    const elapsed = new Date() - new Date(progressData.started_at);
    const totalEstimated = (elapsed / progressData.progress_percentage) * 100;
    const remaining = Math.max(0, totalEstimated - elapsed);
    
    return new Date(Date.now() + remaining);
  }

  /**
   * Check if a job is still active (not completed or failed)
   */
  async isJobActive(jobId) {
    try {
      const progress = await this.getProgress(jobId);
      return progress && !['completed', 'failed'].includes(progress.status);
    } catch (error) {
      logger.error('Failed to check if job is active:', error);
      return false;
    }
  }
}

module.exports = new ProgressTrackingService();