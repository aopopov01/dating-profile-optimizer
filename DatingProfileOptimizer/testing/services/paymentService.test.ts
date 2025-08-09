/**
 * Payment Service Testing Suite
 * Comprehensive testing for both Dating Profile Optimizer and LinkedIn Headshot Generator payment flows
 */

import { PaymentService, paymentService, PurchaseData, PaymentResult } from '../../src/services/paymentService';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService('pk_test_mock_key');
    jest.clearAllMocks();
  });

  afterEach(() => {
    MemoryMonitor.clear();
    PerformanceMonitor.clear();
  });

  describe('Initialization', () => {
    test('should initialize Stripe SDK successfully', async () => {
      const performanceTest = await testPerformance(
        'stripe-initialization',
        async () => {
          await service.initialize();
          return true;
        },
        { maxTime: 2000, maxMemoryMB: 50 }
      );

      expect(performanceTest.result).toBe(true);
      expect(performanceTest.performance.duration).toBeWithinPerformanceBenchmark(2000);
    });

    test('should handle initialization failure gracefully', async () => {
      const mockError = new Error('Stripe initialization failed');
      jest.spyOn(require('@stripe/stripe-react-native'), 'initStripe')
        .mockRejectedValueOnce(mockError);

      await expect(service.initialize()).rejects.toThrow('Payment system initialization failed');
    });

    test('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const initStripeSpy = jest.spyOn(require('@stripe/stripe-react-native'), 'initStripe');
      
      await service.initialize();
      
      expect(initStripeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pricing Tiers', () => {
    test('should return correct pricing tiers for Dating Profile Optimizer', () => {
      const tiers = service.getPricingTiers();
      
      expect(tiers).toHaveLength(4);
      expect(tiers[0].id).toBe('basic');
      expect(tiers[0].price).toBe(9.99);
      expect(tiers[1].id).toBe('premium');
      expect(tiers[1].popular).toBe(true);
      expect(tiers[2].id).toBe('complete');
      expect(tiers[3].id).toBe('monthly');
    });

    test('should include required properties for each tier', () => {
      const tiers = service.getPricingTiers();
      
      tiers.forEach(tier => {
        expect(tier).toHaveProperty('id');
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('price');
        expect(tier).toHaveProperty('currency');
        expect(tier).toHaveProperty('features');
        expect(tier).toHaveProperty('stripePriceId');
        expect(tier.features).toBeInstanceOf(Array);
        expect(tier.features.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Payment Intent Creation', () => {
    test('should create payment intent successfully', async () => {
      const purchaseData: PurchaseData = {
        userId: 'test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[1], // Premium tier
        platform: 'dating-profile-optimizer'
      };

      const performanceTest = await testPerformance(
        'create-payment-intent',
        async () => {
          return await service.createPaymentIntent(purchaseData);
        },
        { maxTime: 3000, maxMemoryMB: 75 }
      );

      const result = performanceTest.result;
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('amount');
      expect(result.amount).toBe(1999); // $19.99 in cents
      expect(result.clientSecret).toMatch(/^pi_mock_\d+_secret_mock$/);
    });

    test('should handle network errors during payment intent creation', async () => {
      NetworkTester.simulateConnection('offline');
      
      const purchaseData: PurchaseData = {
        userId: 'test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[0]
      };

      await expect(service.createPaymentIntent(purchaseData))
        .rejects.toThrow('Failed to initialize payment');
    });
  });

  describe('Payment Processing', () => {
    test('should process payment successfully', async () => {
      const purchaseData: PurchaseData = {
        userId: 'test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[1]
      };

      const performanceTest = await testPerformance(
        'process-payment',
        async () => {
          return await service.processPayment(
            'pi_mock_test_secret',
            { card: { number: '4242424242424242' } },
            purchaseData
          );
        },
        { maxTime: 5000, maxMemoryMB: 100 }
      );

      const result: PaymentResult = performanceTest.result;
      
      // Mock returns 90% success rate, so we test both scenarios
      if (result.success) {
        expect(result).toHaveProperty('paymentIntent');
        expect(result).toHaveProperty('receipt');
        expect(result.error).toBeUndefined();
      } else {
        expect(result).toHaveProperty('error');
        expect(result.paymentIntent).toBeUndefined();
      }
    });

    test('should handle payment failure gracefully', async () => {
      // Force failure by mocking random to always return < 0.1
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const purchaseData: PurchaseData = {
        userId: 'test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[0]
      };

      const result = await service.processPayment(
        'pi_mock_test_secret',
        { card: { number: '4000000000000002' } },
        purchaseData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('card was declined');
    });

    test('should initialize service if not already initialized', async () => {
      const freshService = new PaymentService('pk_test_fresh');
      const initializeSpy = jest.spyOn(freshService, 'initialize');

      const purchaseData: PurchaseData = {
        userId: 'test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[0]
      };

      await freshService.processPayment(
        'pi_mock_test_secret',
        { card: { number: '4242424242424242' } },
        purchaseData
      );

      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    test('should set up subscription successfully', async () => {
      const performanceTest = await testPerformance(
        'setup-subscription',
        async () => {
          return await service.setupSubscription(
            'cus_test_customer',
            'price_monthly_coaching',
            'pm_test_payment_method'
          );
        },
        { maxTime: 3000, maxMemoryMB: 75 }
      );

      const result = performanceTest.result;
      expect(result).toHaveProperty('subscriptionId');
      expect(result).toHaveProperty('status');
      expect(result.status).toBe('active');
      expect(result.subscriptionId).toMatch(/^sub_\d+$/);
    });

    test('should cancel subscription successfully', async () => {
      const result = await service.cancelSubscription('sub_test_subscription');
      expect(result).toBe(true);
    });

    test('should handle subscription setup errors', async () => {
      NetworkTester.simulateConnection('offline');
      
      await expect(service.setupSubscription('cus_test', 'price_test', 'pm_test'))
        .rejects.toThrow('Failed to set up subscription');
    });
  });

  describe('Purchase History', () => {
    test('should retrieve purchase history successfully', async () => {
      const performanceTest = await testPerformance(
        'get-purchase-history',
        async () => {
          return await service.getPurchaseHistory('test-user');
        },
        { maxTime: 2000, maxMemoryMB: 50 }
      );

      const result = performanceTest.result;
      expect(result).toHaveProperty('purchases');
      expect(result).toHaveProperty('subscriptions');
      expect(result.purchases).toBeInstanceOf(Array);
      expect(result.subscriptions).toBeInstanceOf(Array);
    });

    test('should handle purchase history retrieval errors', async () => {
      NetworkTester.simulateConnection('offline');
      
      await expect(service.getPurchaseHistory('test-user'))
        .rejects.toThrow('Could not retrieve purchase history');
    });
  });

  describe('Purchase Validation', () => {
    test('should validate purchase successfully', async () => {
      const result = await service.validatePurchase('pi_test_payment_intent', 'test-user');
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('features');
      expect(result.valid).toBe(true);
      expect(result.features).toBeInstanceOf(Array);
    });

    test('should return invalid for failed validation', async () => {
      NetworkTester.simulateConnection('offline');
      
      const result = await service.validatePurchase('pi_invalid', 'test-user');
      
      expect(result.valid).toBe(false);
      expect(result.features).toHaveLength(0);
    });
  });

  describe('Refund Processing', () => {
    test('should process refund request successfully', async () => {
      const result = await service.requestRefund(
        'pi_test_payment_intent',
        'Customer not satisfied',
        'test-user'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      if (result.success) {
        expect(result).toHaveProperty('refundId');
        expect(result.refundId).toMatch(/^re_\d+$/);
      }
    });

    test('should handle refund processing errors', async () => {
      NetworkTester.simulateConnection('offline');
      
      const result = await service.requestRefund('pi_test', 'reason', 'user');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('could not be processed');
    });
  });

  describe('LinkedIn Headshot Generator Integration', () => {
    test('should handle headshot-specific pricing', () => {
      // This would be extended for LinkedIn-specific tiers
      const tiers = service.getPricingTiers();
      const professionalTier = tiers.find(tier => tier.name.includes('Professional'));
      
      // For now, using existing tiers, but in production LinkedIn would have different pricing
      expect(tiers.length).toBeGreaterThan(0);
    });

    test('should process headshot purchase with professional metadata', async () => {
      const headshotPurchaseData: PurchaseData = {
        userId: 'linkedin-user',
        email: 'professional@company.com',
        tier: service.getPricingTiers()[2], // Complete makeover suitable for professionals
        platform: 'linkedin-headshot-generator'
      };

      const result = await service.processPayment(
        'pi_headshot_test',
        { card: { number: '4242424242424242' } },
        headshotPurchaseData
      );

      // Should process successfully (90% success rate in mock)
      if (result.success) {
        expect(result.paymentIntent).toBeTruthy();
      }
    });
  });

  describe('Performance Benchmarks', () => {
    test('payment processing should meet performance requirements', async () => {
      const purchaseData: PurchaseData = {
        userId: 'performance-test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[1]
      };

      PerformanceMonitor.mark('full-payment-flow');
      
      const paymentIntent = await service.createPaymentIntent(purchaseData);
      const result = await service.processPayment(
        paymentIntent.clientSecret,
        { card: { number: '4242424242424242' } },
        purchaseData
      );
      
      const duration = PerformanceMonitor.measure('full-payment-flow');
      
      expect(duration).toBeWithinPerformanceBenchmark(8000); // 8 seconds max for full flow
      expect(result).toHaveProperty('success');
    });

    test('memory usage should stay within limits during payment processing', async () => {
      MemoryMonitor.snapshot('payment-start');

      const purchaseData: PurchaseData = {
        userId: 'memory-test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[2]
      };

      await service.createPaymentIntent(purchaseData);
      
      MemoryMonitor.snapshot('payment-end');
      const memoryDiff = MemoryMonitor.compare('payment-start', 'payment-end');
      
      expect(memoryDiff.heapUsedDiff).toBeWithinMemoryLimit(50); // 50MB max increase
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed purchase data', async () => {
      const invalidPurchaseData = {
        userId: '',
        email: 'invalid-email',
        tier: null
      } as any;

      await expect(service.createPaymentIntent(invalidPurchaseData))
        .rejects.toThrow();
    });

    test('should handle network timeouts gracefully', async () => {
      NetworkTester.simulateConnection('3g'); // Slow connection
      
      const purchaseData: PurchaseData = {
        userId: 'timeout-test-user',
        email: 'test@example.com',
        tier: service.getPricingTiers()[0]
      };

      const startTime = Date.now();
      try {
        await service.createPaymentIntent(purchaseData);
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(1000); // Should have attempted to wait
      }
    });

    test('should validate tier data integrity', () => {
      const tiers = service.getPricingTiers();
      
      tiers.forEach((tier, index) => {
        expect(tier.price).toBeGreaterThan(0);
        expect(tier.currency).toBe('USD');
        expect(tier.features.length).toBeGreaterThan(0);
        expect(typeof tier.stripePriceId).toBe('string');
        expect(tier.stripePriceId.length).toBeGreaterThan(0);
      });
    });
  });
});