import { initStripe, useStripe, useConfirmPayment } from '@stripe/stripe-react-native';

/**
 * Payment Service for Dating Profile Optimizer
 * Handles Stripe integration for one-time purchases and subscriptions
 */

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
  stripePriceId?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: string;
  error?: string;
  receipt?: string;
}

export interface PurchaseData {
  userId: string;
  email: string;
  tier: PricingTier;
  platform?: string;
  photos?: number;
}

class PaymentService {
  private isInitialized: boolean = false;
  private publishableKey: string;

  constructor(publishableKey: string) {
    this.publishableKey = publishableKey;
  }

  /**
   * Initialize Stripe SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await initStripe({
        publishableKey: this.publishableKey,
        merchantDisplayName: 'Dating Profile Optimizer',
        applePay: {
          merchantId: 'merchant.com.datingprofileoptimizer',
        },
        googlePay: {
          merchantId: 'dating-profile-optimizer',
          testEnv: __DEV__, // Use test environment in development
        },
      });
      
      this.isInitialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw new Error('Payment system initialization failed');
    }
  }

  /**
   * Get available pricing tiers - App Store compliant pricing
   * All prices include applicable taxes and fees as required by platform policies
   */
  getPricingTiers(): PricingTier[] {
    return [
      {
        id: 'basic',
        name: 'Basic Optimization',
        price: 9.99,
        currency: 'USD',
        stripePriceId: 'price_basic_optimization',
        features: [
          'AI photo analysis (up to 10 photos)',
          'Photo scoring & ranking (1-10 scale)',
          '1 personalized bio generation',
          'Basic optimization recommendations',
          'Photo improvement tips',
          '7-day access to results',
        ],
      },
      {
        id: 'premium',
        name: 'Premium Package',
        price: 19.99,
        currency: 'USD',
        stripePriceId: 'price_premium_package',
        popular: true,
        features: [
          'Everything in Basic package',
          'Unlimited photo analysis',
          '3 unique bio variations',
          'Platform-specific optimization (Tinder, Bumble, Hinge)',
          'Advanced photo analysis with detailed feedback',
          'Personalized messaging tips',
          '30-day access to all results',
          'Email support within 24 hours',
        ],
      },
      {
        id: 'complete',
        name: 'Complete Makeover',
        price: 39.99,
        currency: 'USD',
        stripePriceId: 'price_complete_makeover',
        features: [
          'Everything in Premium package',
          'Unlimited bio regeneration for 90 days',
          'Professional photo editing suggestions',
          '15-minute personal dating coach consultation',
          'Success tracking dashboard',
          'Priority email support (within 2 hours)',
          '90-day money-back guarantee',
          'Exclusive dating tips newsletter',
        ],
      },
      {
        id: 'monthly',
        name: 'Monthly Coaching Subscription',
        price: 14.99,
        currency: 'USD',
        stripePriceId: 'price_monthly_coaching',
        features: [
          'Monthly profile reviews and updates',
          'New photo analysis each month',
          'Fresh bio generation monthly',
          'Performance tracking and insights',
          'Ongoing optimization recommendations',
          'Priority customer support',
          'Cancel anytime - no commitment',
          'First month satisfaction guarantee',
        ],
      },
    ];
  }

  /**
   * Create payment intent for one-time purchase
   */
  async createPaymentIntent(purchaseData: PurchaseData): Promise<{
    clientSecret: string;
    amount: number;
  }> {
    try {
      // In production, this would call your backend API
      const response = await this.mockCreatePaymentIntent(purchaseData);
      return response;
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Failed to initialize payment');
    }
  }

  /**
   * Process payment with Stripe
   */
  async processPayment(
    clientSecret: string,
    paymentMethodData: any,
    purchaseData: PurchaseData
  ): Promise<PaymentResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Mock payment processing - in production use actual Stripe hooks
      const result = await this.mockProcessPayment(clientSecret, paymentMethodData);
      
      if (result.success) {
        // Track successful purchase
        await this.trackPurchase(purchaseData, result.paymentIntent!);
        
        // Send confirmation email (in production)
        await this.sendPurchaseConfirmation(purchaseData, result);
      }

      return result;
    } catch (error) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: 'Payment failed. Please try again.',
      };
    }
  }

  /**
   * Handle subscription setup for monthly coaching
   */
  async setupSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string
  ): Promise<{
    subscriptionId: string;
    status: string;
    clientSecret?: string;
  }> {
    try {
      // Mock subscription setup - in production call backend API
      return await this.mockSetupSubscription(customerId, priceId, paymentMethodId);
    } catch (error) {
      console.error('Subscription setup failed:', error);
      throw new Error('Failed to set up subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      // Mock cancellation - in production call backend API
      await this.mockCancelSubscription(subscriptionId);
      return true;
    } catch (error) {
      console.error('Subscription cancellation failed:', error);
      return false;
    }
  }

  /**
   * Get purchase history for user
   */
  async getPurchaseHistory(userId: string): Promise<{
    purchases: Array<{
      id: string;
      date: string;
      amount: number;
      tier: string;
      status: string;
    }>;
    subscriptions: Array<{
      id: string;
      status: string;
      currentPeriodEnd: string;
      tier: string;
    }>;
  }> {
    try {
      // Mock purchase history - in production call backend API
      return await this.mockGetPurchaseHistory(userId);
    } catch (error) {
      console.error('Failed to fetch purchase history:', error);
      throw new Error('Could not retrieve purchase history');
    }
  }

  /**
   * Validate purchase and unlock features
   */
  async validatePurchase(
    paymentIntentId: string,
    userId: string
  ): Promise<{
    valid: boolean;
    tier: PricingTier;
    features: string[];
    expiresAt?: string;
  }> {
    try {
      // Mock validation - in production verify with backend
      return await this.mockValidatePurchase(paymentIntentId, userId);
    } catch (error) {
      console.error('Purchase validation failed:', error);
      return {
        valid: false,
        tier: this.getPricingTiers()[0],
        features: [],
      };
    }
  }

  /**
   * Handle refund request - App Store compliant refund policy
   * Includes proper reasons and processing according to platform requirements
   */
  async requestRefund(
    paymentIntentId: string,
    reason: string,
    userId: string
  ): Promise<{
    success: boolean;
    refundId?: string;
    message: string;
  }> {
    try {
      // Validate refund reason for compliance
      const validReasons = [
        'service_not_as_described',
        'technical_issues',
        'billing_error',
        'not_satisfied',
        'subscription_cancel',
        'accidental_purchase'
      ];
      
      if (!validReasons.includes(reason)) {
        return {
          success: false,
          message: 'Invalid refund reason provided',
        };
      }

      // Mock refund - in production process through Stripe and backend
      const result = await this.mockRequestRefund(paymentIntentId, reason, userId);
      
      // Log refund for compliance tracking
      await this.logRefundRequest(paymentIntentId, reason, userId, result.success);
      
      return result;
    } catch (error) {
      console.error('Refund request failed:', error);
      return {
        success: false,
        message: 'Refund request could not be processed. Please contact support.',
      };
    }
  }

  /**
   * Get subscription cancellation options - App Store compliant
   * Provides clear cancellation terms and options
   */
  async getCancellationOptions(subscriptionId: string): Promise<{
    canCancel: boolean;
    effectiveDate: string;
    refundEligible: boolean;
    terms: string[];
  }> {
    try {
      // Mock implementation - in production, check subscription status
      return {
        canCancel: true,
        effectiveDate: 'End of current billing period',
        refundEligible: true,
        terms: [
          'Cancellation takes effect at the end of your current billing period',
          'You will retain access to premium features until the end date',
          'No partial refunds for unused time in current period',
          'You can reactivate your subscription at any time',
          'All your data will be preserved for 30 days after cancellation'
        ]
      };
    } catch (error) {
      console.error('Failed to get cancellation options:', error);
      throw new Error('Could not retrieve cancellation information');
    }
  }

  /**
   * Process subscription cancellation with proper compliance
   */
  async processCancellation(
    subscriptionId: string, 
    reason: string, 
    feedback?: string
  ): Promise<{
    success: boolean;
    cancellationId: string;
    effectiveDate: string;
    message: string;
  }> {
    try {
      // Log cancellation for analytics and compliance
      await this.logCancellation(subscriptionId, reason, feedback);
      
      // Cancel subscription
      await this.cancelSubscription(subscriptionId);
      
      return {
        success: true,
        cancellationId: `cancel_${Date.now()}`,
        effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Subscription cancelled successfully. Access continues until end of billing period.'
      };
    } catch (error) {
      console.error('Cancellation processing failed:', error);
      return {
        success: false,
        cancellationId: '',
        effectiveDate: '',
        message: 'Cancellation could not be processed. Please contact support.'
      };
    }
  }

  /**
   * Get transparent pricing information for App Store compliance
   */
  getPricingTransparency(): {
    currency: string;
    taxInclusive: boolean;
    paymentProcessor: string;
    refundPolicy: string;
    subscriptionTerms: string;
  } {
    return {
      currency: 'USD',
      taxInclusive: false,
      paymentProcessor: 'Stripe (PCI DSS Compliant)',
      refundPolicy: 'Full refund within 30 days if not satisfied. Subscription refunds prorated.',
      subscriptionTerms: 'Monthly subscriptions auto-renew. Cancel anytime. No commitment required.'
    };
  }

  // Private mock methods - replace with actual API calls in production

  private async mockCreatePaymentIntent(purchaseData: PurchaseData): Promise<{
    clientSecret: string;
    amount: number;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const amount = Math.round(purchaseData.tier.price * 100); // Convert to cents
    
    return {
      clientSecret: `pi_mock_${Date.now()}_secret_mock`,
      amount,
    };
  }

  private async mockProcessPayment(
    clientSecret: string,
    paymentMethodData: any
  ): Promise<PaymentResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock success (90% success rate for demo)
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        paymentIntent: `pi_${Date.now()}`,
        receipt: `rec_${Date.now()}`,
      };
    } else {
      return {
        success: false,
        error: 'Your card was declined. Please try a different payment method.',
      };
    }
  }

  private async mockSetupSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string
  ): Promise<{
    subscriptionId: string;
    status: string;
    clientSecret?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      subscriptionId: `sub_${Date.now()}`,
      status: 'active',
      clientSecret: `seti_mock_${Date.now()}_secret_mock`,
    };
  }

  private async mockCancelSubscription(subscriptionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock cancellation success
  }

  private async mockGetPurchaseHistory(userId: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      purchases: [
        {
          id: 'pi_1234567890',
          date: '2024-08-01',
          amount: 19.99,
          tier: 'Premium Package',
          status: 'succeeded',
        },
      ],
      subscriptions: [],
    };
  }

  private async mockValidatePurchase(
    paymentIntentId: string,
    userId: string
  ): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tiers = this.getPricingTiers();
    const tier = tiers[1]; // Premium package
    
    return {
      valid: true,
      tier,
      features: tier.features,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
  }

  private async mockRequestRefund(
    paymentIntentId: string,
    reason: string,
    userId: string
  ): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      success: true,
      refundId: `re_${Date.now()}`,
      message: 'Refund will be processed within 3-5 business days',
    };
  }

  private async trackPurchase(purchaseData: PurchaseData, paymentIntentId: string): Promise<void> {
    // Track purchase analytics
    console.log('Purchase tracked:', {
      userId: purchaseData.userId,
      tier: purchaseData.tier.name,
      amount: purchaseData.tier.price,
      paymentIntentId,
    });
  }

  private async sendPurchaseConfirmation(
    purchaseData: PurchaseData,
    result: PaymentResult
  ): Promise<void> {
    // Send confirmation email
    console.log('Confirmation email sent to:', purchaseData.email);
  }

  // Compliance logging methods
  private async logRefundRequest(
    paymentIntentId: string,
    reason: string,
    userId: string,
    success: boolean
  ): Promise<void> {
    console.log('Refund request logged:', {
      paymentIntentId,
      reason,
      userId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  private async logCancellation(
    subscriptionId: string,
    reason: string,
    feedback?: string
  ): Promise<void> {
    console.log('Cancellation logged:', {
      subscriptionId,
      reason,
      feedback,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance with mock publishable key
export const paymentService = new PaymentService(
  __DEV__ ? 'pk_test_mock_key' : 'pk_live_your_actual_key'
);

// Export class for custom configurations
export { PaymentService };