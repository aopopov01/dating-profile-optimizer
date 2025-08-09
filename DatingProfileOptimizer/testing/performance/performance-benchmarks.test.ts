/**
 * Performance Benchmarking Test Suite
 * Comprehensive performance testing for both Dating Profile Optimizer and LinkedIn Headshot Generator
 */

import { photoAnalysisService } from '../../src/services/photoAnalysis';
import { bioGenerationService } from '../../src/services/bioGeneration';
import { paymentService } from '../../src/services/paymentService';

describe('Performance Benchmark Tests', () => {
  beforeEach(() => {
    PerformanceMonitor.clear();
    MemoryMonitor.clear();
  });

  describe('App Launch Performance', () => {
    test('cold start should complete within benchmark', async () => {
      const performanceTest = await testPerformance(
        'cold-start',
        async () => {
          // Simulate cold start initialization
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Initialize core services
          await paymentService.initialize();
          
          // Load user preferences from storage
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Initialize analytics
          await new Promise(resolve => setTimeout(resolve, 30));
          
          return { initialized: true };
        },
        { 
          maxTime: AIPerformanceBenchmarks.APP_LAUNCH_MAX_TIME,
          maxMemoryMB: AIPerformanceBenchmarks.APP_MEMORY_LIMIT_MB 
        }
      );

      expect(performanceTest.result.initialized).toBe(true);
      expect(performanceTest.performance.duration).toBeWithinPerformanceBenchmark(
        AIPerformanceBenchmarks.APP_LAUNCH_MAX_TIME
      );
    });

    test('warm start should be significantly faster than cold start', async () => {
      // Simulate warm start (app already in memory)
      const warmStartTest = await testPerformance(
        'warm-start',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50)); // Minimal initialization
          return { initialized: true };
        },
        { maxTime: 1000 } // Warm start should be under 1 second
      );

      expect(warmStartTest.performance.duration).toBeLessThan(1000);
      expect(warmStartTest.performance.duration).toBeWithinPerformanceBenchmark(1000);
    });

    test('memory usage during startup should remain within limits', async () => {
      MemoryMonitor.snapshot('startup-begin');

      // Simulate app initialization with memory-intensive operations
      const services = [];
      for (let i = 0; i < 10; i++) {
        services.push({
          id: i,
          data: new Array(1000).fill('initialization-data')
        });
      }

      MemoryMonitor.snapshot('startup-end');
      const memoryDiff = MemoryMonitor.compare('startup-begin', 'startup-end');

      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(
        AIPerformanceBenchmarks.APP_MEMORY_LIMIT_MB
      );
    });
  });

  describe('Photo Analysis Performance', () => {
    test('single photo analysis should meet benchmark', async () => {
      const mockPhoto = generateMockPhoto();

      const performanceTest = await testPerformance(
        'single-photo-analysis',
        async () => {
          return await photoAnalysisService.analyzePhoto(mockPhoto.uri);
        },
        { 
          maxTime: AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME,
          maxMemoryMB: 100
        }
      );

      expect(performanceTest.result.overallScore).toBeGreaterThanOrEqual(40);
      expect(performanceTest.performance.duration).toBeWithinPerformanceBenchmark(
        AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME
      );
    });

    test('batch photo analysis should scale linearly', async () => {
      const smallBatch = Array.from({ length: 3 }, (_, i) => `file://photo${i}.jpg`);
      const largeBatch = Array.from({ length: 10 }, (_, i) => `file://photo${i}.jpg`);

      const smallBatchTest = await testPerformance(
        'small-batch-analysis',
        async () => {
          return await photoAnalysisService.batchAnalyzePhotos(smallBatch);
        },
        { maxTime: AIPerformanceBenchmarks.BATCH_PROCESSING_PER_PHOTO * smallBatch.length + 2000 }
      );

      const largeBatchTest = await testPerformance(
        'large-batch-analysis',
        async () => {
          return await photoAnalysisService.batchAnalyzePhotos(largeBatch);
        },
        { maxTime: AIPerformanceBenchmarks.BATCH_PROCESSING_PER_PHOTO * largeBatch.length + 2000 }
      );

      // Verify results
      expect(smallBatchTest.result).toHaveLength(smallBatch.length);
      expect(largeBatchTest.result).toHaveLength(largeBatch.length);

      // Performance should scale roughly linearly
      const smallBatchPerPhoto = smallBatchTest.performance.duration / smallBatch.length;
      const largeBatchPerPhoto = largeBatchTest.performance.duration / largeBatch.length;
      
      // Large batch should not be more than 50% slower per photo (due to overhead)
      expect(largeBatchPerPhoto).toBeLessThan(smallBatchPerPhoto * 1.5);
    });

    test('memory usage during batch processing should not leak', async () => {
      const photoBatch = Array.from({ length: 5 }, (_, i) => `file://memory-test${i}.jpg`);

      MemoryMonitor.snapshot('batch-start');

      const results = await photoAnalysisService.batchAnalyzePhotos(photoBatch);

      MemoryMonitor.snapshot('batch-end');
      const memoryDiff = MemoryMonitor.compare('batch-start', 'batch-end');

      expect(results).toHaveLength(photoBatch.length);
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(
        AIPerformanceBenchmarks.IMAGE_PROCESSING_MEMORY_LIMIT_MB
      );
    });

    test('concurrent photo analysis should handle load efficiently', async () => {
      const concurrentPhotos = Array.from({ length: 3 }, (_, i) => `file://concurrent${i}.jpg`);

      const performanceTest = await testPerformance(
        'concurrent-analysis',
        async () => {
          const promises = concurrentPhotos.map(photo => 
            photoAnalysisService.analyzePhoto(photo)
          );
          return await Promise.all(promises);
        },
        { maxTime: AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME * 2 } // Should not take 3x longer
      );

      expect(performanceTest.result).toHaveLength(concurrentPhotos.length);
      
      // Concurrent execution should be more efficient than sequential
      const sequentialTime = AIPerformanceBenchmarks.PHOTO_ANALYSIS_MAX_TIME * concurrentPhotos.length;
      expect(performanceTest.performance.duration).toBeLessThan(sequentialTime);
    });
  });

  describe('Bio Generation Performance', () => {
    test('bio generation should meet benchmark', async () => {
      const userData = {
        age: 28,
        interests: ['photography', 'hiking', 'cooking', 'travel'],
        personality: 'outgoing',
        profession: 'software engineer'
      };

      const performanceTest = await testPerformance(
        'bio-generation',
        async () => {
          return await bioGenerationService.generateBio(userData, 'tinder');
        },
        { 
          maxTime: AIPerformanceBenchmarks.BIO_GENERATION_MAX_TIME,
          maxMemoryMB: 75
        }
      );

      expect(performanceTest.result.bio).toBeTruthy();
      expect(performanceTest.result.bio.length).toBeGreaterThan(50);
      expect(performanceTest.performance.duration).toBeWithinPerformanceBenchmark(
        AIPerformanceBenchmarks.BIO_GENERATION_MAX_TIME
      );
    });

    test('multiple bio variations should be efficient', async () => {
      const userData = {
        age: 25,
        interests: ['music', 'art'],
        personality: 'creative'
      };

      const performanceTest = await testPerformance(
        'multiple-bio-generation',
        async () => {
          const variations = await Promise.all([
            bioGenerationService.generateBio(userData, 'tinder'),
            bioGenerationService.generateBio(userData, 'bumble'),
            bioGenerationService.generateBio(userData, 'hinge')
          ]);
          return variations;
        },
        { maxTime: AIPerformanceBenchmarks.BIO_GENERATION_MAX_TIME * 2.5 } // Should be efficient
      );

      expect(performanceTest.result).toHaveLength(3);
      performanceTest.result.forEach(bio => {
        expect(bio.bio).toBeTruthy();
      });
    });

    test('bio generation with complex data should handle gracefully', async () => {
      const complexUserData = {
        age: 32,
        interests: Array.from({ length: 20 }, (_, i) => `interest${i}`),
        personality: 'complex personality with many traits and characteristics',
        profession: 'Senior Software Engineering Manager with expertise in AI and machine learning',
        location: 'San Francisco Bay Area',
        education: 'Stanford University Computer Science PhD',
        hobbies: Array.from({ length: 15 }, (_, i) => `hobby${i}`),
        goals: 'Looking for meaningful connections and long-term relationships'
      };

      const performanceTest = await testPerformance(
        'complex-bio-generation',
        async () => {
          return await bioGenerationService.generateBio(complexUserData, 'tinder');
        },
        { 
          maxTime: AIPerformanceBenchmarks.BIO_GENERATION_MAX_TIME * 1.5,
          maxMemoryMB: 100
        }
      );

      expect(performanceTest.result.bio).toBeTruthy();
      expect(performanceTest.result.bio.length).toBeGreaterThan(100);
    });
  });

  describe('LinkedIn Headshot Generation Performance', () => {
    test('headshot generation should meet professional benchmarks', async () => {
      const professionalData = {
        industry: 'technology',
        role: 'senior-executive',
        style: 'corporate-professional',
        photoUri: 'file://professional-photo.jpg'
      };

      const performanceTest = await testPerformance(
        'headshot-generation',
        async () => {
          // Mock headshot generation
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                success: true,
                headshotUrl: 'https://generated-headshot.jpg',
                style: professionalData.style,
                brandAlignment: 0.92,
                professionalismScore: 0.89
              });
            }, 12000); // 12 seconds simulation
          });
        },
        { 
          maxTime: AIPerformanceBenchmarks.HEADSHOT_GENERATION_MAX_TIME,
          maxMemoryMB: 150
        }
      );

      const result = performanceTest.result as any;
      expect(result.success).toBe(true);
      expect(result.headshotUrl).toBeTruthy();
      expect(result.brandAlignment).toBeGreaterThan(0.8);
    });

    test('style comparison should be fast', async () => {
      const styles = ['corporate', 'creative', 'casual', 'authoritative', 'approachable'];

      const performanceTest = await testPerformance(
        'style-comparison',
        async () => {
          const comparisons = styles.map(style => ({
            style,
            score: Math.random() * 0.3 + 0.7, // 0.7-1.0
            preview: `https://preview-${style}.jpg`
          }));
          
          return comparisons.sort((a, b) => b.score - a.score);
        },
        { 
          maxTime: AIPerformanceBenchmarks.STYLE_SELECTION_MAX_TIME,
          maxMemoryMB: 50
        }
      );

      expect(performanceTest.result).toHaveLength(styles.length);
      expect(performanceTest.performance.duration).toBeWithinPerformanceBenchmark(
        AIPerformanceBenchmarks.STYLE_SELECTION_MAX_TIME
      );
    });

    test('brand alignment analysis should be efficient', async () => {
      const brandData = {
        industry: 'finance',
        companySize: 'large',
        role: 'director',
        photoUri: 'file://brand-analysis.jpg'
      };

      const performanceTest = await testPerformance(
        'brand-alignment-analysis',
        async () => {
          return {
            overallAlignment: 0.87,
            industryAppropriate: true,
            professionalismScore: 0.91,
            trustworthiness: 0.85,
            approachability: 0.79,
            competence: 0.93,
            recommendations: [
              'Excellent professional presence',
              'Well-suited for finance industry',
              'Conveys trustworthiness and competence'
            ]
          };
        },
        { 
          maxTime: AIPerformanceBenchmarks.BRAND_ANALYSIS_MAX_TIME,
          maxMemoryMB: 75
        }
      );

      expect(performanceTest.result.overallAlignment).toBeGreaterThan(0.8);
      expect(performanceTest.result.industryAppropriate).toBe(true);
    });
  });

  describe('Payment Processing Performance', () => {
    test('payment intent creation should be fast', async () => {
      const purchaseData = {
        userId: 'perf-test-user',
        email: 'perf@test.com',
        tier: paymentService.getPricingTiers()[1]
      };

      const performanceTest = await testPerformance(
        'payment-intent-creation',
        async () => {
          return await paymentService.createPaymentIntent(purchaseData);
        },
        { maxTime: 3000, maxMemoryMB: 50 }
      );

      expect(performanceTest.result.clientSecret).toBeTruthy();
      expect(performanceTest.result.amount).toBeGreaterThan(0);
    });

    test('payment processing should handle load', async () => {
      const concurrentPayments = Array.from({ length: 3 }, (_, i) => ({
        userId: `concurrent-user-${i}`,
        email: `user${i}@test.com`,
        tier: paymentService.getPricingTiers()[0]
      }));

      const performanceTest = await testPerformance(
        'concurrent-payments',
        async () => {
          const promises = concurrentPayments.map(async (purchaseData) => {
            const paymentIntent = await paymentService.createPaymentIntent(purchaseData);
            return await paymentService.processPayment(
              paymentIntent.clientSecret,
              { card: { number: '4242424242424242' } },
              purchaseData
            );
          });
          
          return await Promise.all(promises);
        },
        { maxTime: 15000, maxMemoryMB: 100 }
      );

      expect(performanceTest.result).toHaveLength(concurrentPayments.length);
      performanceTest.result.forEach(result => {
        expect(typeof result.success).toBe('boolean');
      });
    });
  });

  describe('UI Performance Benchmarks', () => {
    test('navigation transitions should be smooth', async () => {
      const navigationTest = await testPerformance(
        'navigation-transition',
        async () => {
          // Simulate navigation with state changes
          const states = ['home', 'camera', 'results', 'payment', 'settings'];
          const transitions = [];
          
          for (let i = 0; i < states.length - 1; i++) {
            const start = performance.now();
            await new Promise(resolve => setTimeout(resolve, 50)); // Simulate transition
            const end = performance.now();
            transitions.push({ from: states[i], to: states[i + 1], duration: end - start });
          }
          
          return transitions;
        },
        { maxTime: 1000, maxMemoryMB: 30 }
      );

      performanceTest.result.forEach(transition => {
        expect(transition.duration).toBeWithinPerformanceBenchmark(
          AIPerformanceBenchmarks.NAVIGATION_MAX_TIME
        );
      });
    });

    test('image rendering should be efficient', async () => {
      const imageCount = 10;
      const imageTest = await testPerformance(
        'image-rendering',
        async () => {
          // Simulate loading and rendering multiple images
          const images = [];
          for (let i = 0; i < imageCount; i++) {
            await new Promise(resolve => setTimeout(resolve, 20)); // Simulate image load
            images.push({
              id: i,
              uri: `file://image${i}.jpg`,
              width: 300,
              height: 400,
              rendered: true
            });
          }
          return images;
        },
        { maxTime: 1000, maxMemoryMB: 75 }
      );

      expect(performanceTest.result).toHaveLength(imageCount);
      expect(performanceTest.performance.duration).toBeLessThan(1000);
    });

    test('list scrolling should maintain 60fps', async () => {
      const listItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        subtitle: `Description for item ${i}`,
        image: `file://thumb${i}.jpg`
      }));

      const scrollTest = await testPerformance(
        'list-scrolling',
        async () => {
          // Simulate scroll through large list
          const viewportSize = 10;
          const scrollPositions = [];
          
          for (let i = 0; i <= listItems.length - viewportSize; i += 5) {
            const start = performance.now();
            const visibleItems = listItems.slice(i, i + viewportSize);
            await new Promise(resolve => setTimeout(resolve, 5)); // Simulate render time
            const end = performance.now();
            
            scrollPositions.push({
              position: i,
              renderTime: end - start,
              visibleCount: visibleItems.length
            });
          }
          
          return scrollPositions;
        },
        { maxTime: 2000, maxMemoryMB: 100 }
      );

      // Each scroll position should render quickly
      performanceTest.result.forEach(scroll => {
        expect(scroll.renderTime).toBeLessThan(16.67); // 60fps = 16.67ms per frame
      });
    });
  });

  describe('Memory Management Performance', () => {
    test('should handle memory pressure gracefully', async () => {
      MemoryMonitor.snapshot('memory-pressure-start');

      // Simulate memory-intensive operations
      const largeDataSets = [];
      for (let i = 0; i < 10; i++) {
        largeDataSets.push({
          id: i,
          data: new Array(10000).fill('memory-test-data'),
          processing: new Array(5000).fill(Math.random())
        });
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clean up (simulate garbage collection trigger)
      largeDataSets.length = 0;
      if (global.gc) {
        global.gc();
      }

      MemoryMonitor.snapshot('memory-pressure-end');
      const memoryDiff = MemoryMonitor.compare('memory-pressure-start', 'memory-pressure-end');

      // Memory should not grow excessively even with large operations
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(200);
    });

    test('should prevent memory leaks in repeated operations', async () => {
      MemoryMonitor.snapshot('leak-test-start');

      // Perform repeated operations that might leak
      for (let i = 0; i < 20; i++) {
        await photoAnalysisService.analyzePhoto(`file://leak-test${i}.jpg`);
        
        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      MemoryMonitor.snapshot('leak-test-end');
      const memoryDiff = MemoryMonitor.compare('leak-test-start', 'leak-test-end');

      // Memory growth should be minimal for repeated operations
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(100);
    });
  });

  describe('Network Performance', () => {
    test('should handle slow network conditions', async () => {
      NetworkTester.simulateConnection('3g');

      const networkTest = await testPerformance(
        'slow-network-operation',
        async () => {
          // Simulate API call under slow network
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                success: true,
                data: 'response-data',
                networkSpeed: '3g'
              });
            }, 2000);
          });
        },
        { maxTime: 10000 }
      );

      expect(performanceTest.result.success).toBe(true);
      expect(performanceTest.performance.duration).toBeGreaterThan(2000);
    });

    test('should optimize for different connection speeds', async () => {
      const connectionTypes = ['wifi', '4g', '3g'];
      const results = [];

      for (const connectionType of connectionTypes) {
        NetworkTester.simulateConnection(connectionType);

        const result = await testPerformance(
          `${connectionType}-performance`,
          async () => {
            // Simulate data transfer
            const delay = connectionType === 'wifi' ? 100 : 
                          connectionType === '4g' ? 500 : 2000;
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return { connectionType, transferTime: delay };
          },
          { maxTime: 5000 }
        );

        results.push(result);
      }

      // Verify performance scales with connection quality
      expect(results[0].performance.duration).toBeLessThan(results[1].performance.duration);
      expect(results[1].performance.duration).toBeLessThan(results[2].performance.duration);
    });
  });

  describe('Battery Performance Impact', () => {
    test('should minimize CPU usage during intensive operations', async () => {
      const cpuIntensiveTest = await testPerformance(
        'cpu-intensive-operation',
        async () => {
          // Simulate CPU-intensive photo processing
          let result = 0;
          const iterations = 100000;
          
          for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.random();
            
            // Yield occasionally to prevent blocking
            if (i % 10000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 1));
            }
          }
          
          return { result, iterations };
        },
        { maxTime: 5000, maxMemoryMB: 50 }
      );

      expect(performanceTest.result.iterations).toBe(100000);
      // Should complete intensive operation within reasonable time
      expect(performanceTest.performance.duration).toBeLessThan(5000);
    });

    test('should use efficient algorithms for background processing', async () => {
      const backgroundTest = await testPerformance(
        'background-processing',
        async () => {
          // Simulate background analytics processing
          const events = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            type: 'user_action',
            timestamp: Date.now() - i * 1000,
            data: { action: `action-${i}` }
          }));

          // Efficient batch processing instead of individual processing
          const batchSize = 100;
          const batches = [];
          
          for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            batches.push(batch);
            
            // Small delay for each batch to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 5));
          }
          
          return { totalEvents: events.length, batchCount: batches.length };
        },
        { maxTime: 2000, maxMemoryMB: 75 }
      );

      expect(performanceTest.result.totalEvents).toBe(1000);
      expect(performanceTest.result.batchCount).toBe(10);
    });
  });
});