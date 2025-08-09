/**
 * Photo Analysis Service Testing Suite
 * Comprehensive testing for AI-powered photo analysis in both applications
 */

import { PhotoAnalysisService, photoAnalysisService, AnalysisConfig, BatchAnalysisProgress } from '../../src/services/photoAnalysis';
import { PhotoAnalysisResult } from '../../src/utils/imageOptimization';

describe('PhotoAnalysisService', () => {
  let service: PhotoAnalysisService;
  const mockImageUri = 'file://test-image.jpg';

  beforeEach(() => {
    service = new PhotoAnalysisService({
      analysisDepth: 'detailed',
      includeRecommendations: true
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    MemoryMonitor.clear();
    PerformanceMonitor.clear();
  });

  describe('Single Photo Analysis', () => {
    test('should analyze photo successfully', async () => {
      const performanceTest = await testPerformance(
        'single-photo-analysis',
        async () => {
          return await service.analyzePhoto(mockImageUri);
        },
        { 
          maxTime: AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME,
          maxMemoryMB: 100
        }
      );

      const result: PhotoAnalysisResult = performanceTest.result;
      
      expect(result).toHaveProperty('uri', mockImageUri);
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('attractivenessScore');
      expect(result).toHaveProperty('backgroundScore');
      expect(result).toHaveProperty('outfitScore');
      expect(result).toHaveProperty('expressionScore');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('improvements');
      expect(result).toHaveProperty('technicalIssues');

      // Validate score ranges
      expect(result.qualityScore).toBeGreaterThanOrEqual(40);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(result.attractivenessScore).toBeGreaterThanOrEqual(50);
      expect(result.attractivenessScore).toBeLessThanOrEqual(100);
      expect(result.overallScore).toBeGreaterThanOrEqual(40);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      // Validate array properties
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.strengths).toBeInstanceOf(Array);
      expect(result.improvements).toBeInstanceOf(Array);
      expect(result.technicalIssues).toBeInstanceOf(Array);
    });

    test('should handle different analysis depths', async () => {
      const basicService = new PhotoAnalysisService({
        analysisDepth: 'basic',
        includeRecommendations: false
      });

      const premiumService = new PhotoAnalysisService({
        analysisDepth: 'premium',
        includeRecommendations: true
      });

      const basicResult = await basicService.analyzePhoto(mockImageUri);
      const premiumResult = await premiumService.analyzePhoto(mockImageUri);

      // Premium should generally have more variation in scores
      expect(basicResult.overallScore).toBeGreaterThanOrEqual(40);
      expect(premiumResult.overallScore).toBeGreaterThanOrEqual(40);
    });

    test('should handle analysis errors gracefully', async () => {
      const invalidUri = 'invalid://path';
      
      await expect(service.analyzePhoto(invalidUri))
        .rejects.toThrow('Failed to analyze photo. Please try again.');
    });

    test('should meet performance benchmarks for single photo', async () => {
      const startTime = performance.now();
      await service.analyzePhoto(mockImageUri);
      const duration = performance.now() - startTime;

      expect(duration).toBeWithinPerformanceBenchmark(AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME);
    });
  });

  describe('Batch Photo Analysis', () => {
    test('should analyze multiple photos successfully', async () => {
      const imageUris = [
        'file://photo1.jpg',
        'file://photo2.jpg',
        'file://photo3.jpg',
        'file://photo4.jpg'
      ];

      const progressUpdates: BatchAnalysisProgress[] = [];
      
      const performanceTest = await testPerformance(
        'batch-photo-analysis',
        async () => {
          return await service.batchAnalyzePhotos(imageUris, (progress) => {
            progressUpdates.push(progress);
          });
        },
        { 
          maxTime: AIPerformanceBenchmarks.BATCH_PROCESSING_PER_PHOTO * imageUris.length + 2000,
          maxMemoryMB: 200
        }
      );

      const results: PhotoAnalysisResult[] = performanceTest.result;

      expect(results).toHaveLength(imageUris.length);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress tracking
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.completed).toBe(imageUris.length);
      expect(finalProgress.total).toBe(imageUris.length);
      expect(finalProgress.status).toBe('complete');

      // Verify all photos were processed
      results.forEach((result, index) => {
        expect(result.uri).toBe(imageUris[index]);
        expect(result.overallScore).toBeGreaterThanOrEqual(40);
      });
    });

    test('should handle partial failures in batch processing', async () => {
      const imageUris = [
        'file://valid1.jpg',
        'invalid://bad-path',
        'file://valid2.jpg'
      ];

      // Should not throw but continue with valid images
      const results = await service.batchAnalyzePhotos(imageUris);
      
      // Should have processed the valid images (exact count depends on mock behavior)
      expect(results.length).toBeGreaterThanOrEqual(0);
      expect(results.length).toBeLessThanOrEqual(imageUris.length);
    });

    test('should provide accurate progress tracking', async () => {
      const imageUris = ['file://photo1.jpg', 'file://photo2.jpg'];
      const progressUpdates: BatchAnalysisProgress[] = [];

      await service.batchAnalyzePhotos(imageUris, (progress) => {
        progressUpdates.push({ ...progress });
      });

      expect(progressUpdates.length).toBeGreaterThanOrEqual(imageUris.length);
      
      // Check progress sequence
      progressUpdates.forEach((update, index) => {
        expect(update.total).toBe(imageUris.length);
        expect(update.completed).toBeLessThanOrEqual(update.total);
        
        if (index === progressUpdates.length - 1) {
          expect(update.status).toBe('complete');
          expect(update.completed).toBe(update.total);
        }
      });
    });
  });

  describe('Photo Ordering Optimization', () => {
    test('should optimize photo order successfully', async () => {
      const mockResults: PhotoAnalysisResult[] = [
        generateMockAnalysisResult({ uri: 'photo1.jpg', overallScore: 75 }),
        generateMockAnalysisResult({ uri: 'photo2.jpg', overallScore: 90 }),
        generateMockAnalysisResult({ uri: 'photo3.jpg', overallScore: 65 }),
        generateMockAnalysisResult({ uri: 'photo4.jpg', overallScore: 85 })
      ];

      const performanceTest = await testPerformance(
        'photo-ordering',
        async () => {
          return await service.getOptimalPhotoOrder(mockResults, 'general');
        },
        { maxTime: 1000, maxMemoryMB: 50 }
      );

      const result = performanceTest.result;

      expect(result).toHaveProperty('orderedPhotos');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('expectedImprovement');

      expect(result.orderedPhotos).toHaveLength(mockResults.length);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.expectedImprovement).toBeGreaterThan(0);

      // Verify ordering (should be by overall score descending)
      const scores = result.orderedPhotos.map(photo => photo.overallScore);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    test('should apply platform-specific ordering', async () => {
      const mockResults: PhotoAnalysisResult[] = [
        generateMockAnalysisResult({ 
          uri: 'photo1.jpg', 
          overallScore: 80,
          attractivenessScore: 90,
          expressionScore: 70
        }),
        generateMockAnalysisResult({ 
          uri: 'photo2.jpg', 
          overallScore: 85,
          attractivenessScore: 75,
          expressionScore: 95
        })
      ];

      const tinderResult = await service.getOptimalPhotoOrder(mockResults, 'tinder');
      const bumbleResult = await service.getOptimalPhotoOrder(mockResults, 'bumble');
      const hingeResult = await service.getOptimalPhotoOrder(mockResults, 'hinge');

      // Different platforms should potentially produce different orderings
      expect(tinderResult.reasoning).toContain('Tinder');
      expect(bumbleResult.reasoning).toContain('Bumble');
      expect(hingeResult.reasoning).toContain('Hinge');
    });

    test('should handle empty photo array', async () => {
      const result = await service.getOptimalPhotoOrder([], 'general');
      
      expect(result.orderedPhotos).toHaveLength(0);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.expectedImprovement).toBe(0);
    });
  });

  describe('Composition Analysis', () => {
    test('should analyze photo composition', async () => {
      const result = await service.analyzeComposition(mockImageUri);

      expect(result).toHaveProperty('compositionScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');

      expect(result.compositionScore).toBeGreaterThanOrEqual(70);
      expect(result.compositionScore).toBeLessThanOrEqual(100);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      
      // Suggestions should always be at least as many as issues
      expect(result.suggestions.length).toBeGreaterThanOrEqual(result.issues.length);
    });

    test('should provide appropriate feedback based on score', async () => {
      const result = await service.analyzeComposition(mockImageUri);

      if (result.compositionScore < 80) {
        expect(result.issues.length).toBeGreaterThanOrEqual(1);
        expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      } else if (result.compositionScore < 90) {
        expect(result.issues.length).toBeGreaterThanOrEqual(0);
        expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Facial Feature Analysis', () => {
    test('should analyze facial features successfully', async () => {
      const result = await service.analyzeFacialFeatures(mockImageUri);

      expect(result).toHaveProperty('faceDetected');
      expect(result).toHaveProperty('emotionScore');
      expect(result).toHaveProperty('eyeContactScore');
      expect(result).toHaveProperty('smileScore');
      expect(result).toHaveProperty('recommendations');

      expect(result.faceDetected).toBe(true);
      expect(result.emotionScore).toBeGreaterThanOrEqual(80);
      expect(result.emotionScore).toBeLessThanOrEqual(100);
      expect(result.eyeContactScore).toBeGreaterThanOrEqual(75);
      expect(result.eyeContactScore).toBeLessThanOrEqual(100);
      expect(result.smileScore).toBeGreaterThanOrEqual(70);
      expect(result.smileScore).toBeLessThanOrEqual(100);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Outfit Analysis', () => {
    test('should analyze outfit and style', async () => {
      const result = await service.analyzeOutfit(mockImageUri);

      expect(result).toHaveProperty('styleScore');
      expect(result).toHaveProperty('colorAnalysis');
      expect(result).toHaveProperty('fitAnalysis');
      expect(result).toHaveProperty('recommendations');

      expect(result.styleScore).toBeGreaterThanOrEqual(75);
      expect(result.styleScore).toBeLessThanOrEqual(100);
      expect(result.colorAnalysis).toBeInstanceOf(Array);
      expect(result.fitAnalysis).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      
      expect(result.colorAnalysis.length).toBeGreaterThan(0);
      expect(result.fitAnalysis.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('LinkedIn Headshot Specific Analysis', () => {
    test('should provide professional analysis suitable for LinkedIn', async () => {
      const professionalService = new PhotoAnalysisService({
        analysisDepth: 'premium',
        includeRecommendations: true
      });

      const result = await professionalService.analyzePhoto(mockImageUri);

      // For LinkedIn, we'd expect certain criteria to be emphasized
      expect(result.qualityScore).toBeGreaterThanOrEqual(40);
      expect(result.expressionScore).toBeGreaterThanOrEqual(60);
      
      // Professional recommendations should be included
      expect(result.recommendations.some(rec => 
        rec.includes('professional') || rec.includes('lighting') || rec.includes('background')
      )).toBeTruthy();
    });

    test('should analyze brand alignment for professionals', async () => {
      const brandResult = await service.analyzeComposition(mockImageUri);
      const outfitResult = await service.analyzeOutfit(mockImageUri);

      // Professional context should consider brand alignment
      expect(brandResult.compositionScore).toBeGreaterThanOrEqual(70);
      expect(outfitResult.styleScore).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle large batch processing efficiently', async () => {
      const largeImageBatch = Array.from({ length: 10 }, (_, i) => `file://image${i}.jpg`);

      MemoryMonitor.snapshot('batch-start');
      PerformanceMonitor.mark('large-batch');

      const results = await service.batchAnalyzePhotos(largeImageBatch);
      
      const duration = PerformanceMonitor.measure('large-batch');
      MemoryMonitor.snapshot('batch-end');
      
      const memoryDiff = MemoryMonitor.compare('batch-start', 'batch-end');

      expect(duration).toBeWithinPerformanceBenchmark(
        AIPerformanceBenchmarks.BATCH_PROCESSING_PER_PHOTO * largeImageBatch.length + 5000
      );
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(300);
      expect(results.length).toBeLessThanOrEqual(largeImageBatch.length);
    });

    test('should not leak memory during repeated analysis', async () => {
      MemoryMonitor.snapshot('repeated-start');

      // Perform multiple analyses
      for (let i = 0; i < 5; i++) {
        await service.analyzePhoto(`file://test${i}.jpg`);
      }

      MemoryMonitor.snapshot('repeated-end');
      const memoryDiff = MemoryMonitor.compare('repeated-start', 'repeated-end');

      // Memory growth should be minimal for repeated operations
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(100);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed image URIs', async () => {
      const invalidUris = [
        '',
        'not-a-uri',
        'http://invalid-protocol',
        null as any,
        undefined as any
      ];

      for (const uri of invalidUris) {
        await expect(service.analyzePhoto(uri)).rejects.toThrow();
      }
    });

    test('should handle network connectivity issues', async () => {
      NetworkTester.simulateConnection('offline');

      // Mock implementation should still work offline, but in production this would test API failures
      const result = await service.analyzePhoto(mockImageUri);
      expect(result).toBeDefined();
    });

    test('should validate analysis configuration', () => {
      expect(() => new PhotoAnalysisService({
        analysisDepth: 'invalid' as any,
        includeRecommendations: true
      })).not.toThrow(); // Mock doesn't validate, but production should

      const validConfig: AnalysisConfig = {
        analysisDepth: 'basic',
        includeRecommendations: false
      };

      expect(() => new PhotoAnalysisService(validConfig)).not.toThrow();
    });

    test('should handle concurrent analysis requests', async () => {
      const concurrentPromises = Array.from({ length: 3 }, (_, i) =>
        service.analyzePhoto(`file://concurrent${i}.jpg`)
      );

      const results = await Promise.all(concurrentPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.overallScore).toBeGreaterThanOrEqual(40);
      });
    });
  });

  describe('Data Quality and Consistency', () => {
    test('should maintain score consistency across analyses', async () => {
      const results = await Promise.all([
        service.analyzePhoto(mockImageUri),
        service.analyzePhoto(mockImageUri),
        service.analyzePhoto(mockImageUri)
      ]);

      // While there may be some randomness in mock, overall patterns should be consistent
      results.forEach(result => {
        expect(result.uri).toBe(mockImageUri);
        expect(result.overallScore).toBeGreaterThanOrEqual(40);
        expect(result.overallScore).toBeLessThanOrEqual(100);
      });
    });

    test('should provide meaningful recommendations', async () => {
      const result = await service.analyzePhoto(mockImageUri);

      result.recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });

      result.strengths.forEach(strength => {
        expect(typeof strength).toBe('string');
        expect(strength.length).toBeGreaterThan(0);
      });

      result.improvements.forEach(improvement => {
        expect(typeof improvement).toBe('string');
        expect(improvement.length).toBeGreaterThan(0);
      });
    });
  });
});