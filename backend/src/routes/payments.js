const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const logger = require('../config/logger');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Mock Stripe service (replace with real Stripe when API keys are available)
const mockStripe = {
  isUsingRealStripe: () => {
    return process.env.STRIPE_SECRET_KEY && 
           process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key';
  },

  async createPaymentIntent(amount, currency, metadata) {
    // Simulate Stripe payment intent creation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(amount * 100), // Stripe uses cents
      currency,
      status: 'requires_payment_method',
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 16)}`,
      metadata
    };
  },

  async createCustomer(email, name) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `cus_mock_${Date.now()}_${Math.random().toString(36).substr(2, 14)}`,
      email,
      name
    };
  },

  async createSubscription(customerId, priceId, trialDays = null) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const now = new Date();
    const trialEnd = trialDays ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
    
    return {
      id: `sub_mock_${Date.now()}_${Math.random().toString(36).substr(2, 14)}`,
      status: trialEnd ? 'trialing' : 'active',
      current_period_start: Math.floor(now.getTime() / 1000),
      current_period_end: Math.floor((trialEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)).getTime() / 1000),
      trial_start: trialEnd ? Math.floor(now.getTime() / 1000) : null,
      trial_end: trialEnd ? Math.floor(trialEnd.getTime() / 1000) : null,
      customer: customerId,
      items: {
        data: [{ price: { id: priceId } }]
      }
    };
  },

  getUpgradeInstructions: () => ({
    message: "To enable real Stripe payments, update your environment variables",
    steps: [
      "1. Create a Stripe account at https://stripe.com",
      "2. Get your API keys from the Stripe dashboard",
      "3. Update STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in your .env file",
      "4. Set up your products and prices in Stripe dashboard",
      "5. Update the price IDs in subscription_plans table",
      "6. Configure webhook endpoints for payment events",
      "7. Restart your application"
    ],
    testCards: [
      "4242424242424242 - Visa (success)",
      "4000000000000002 - Visa (declined)",
      "4000000000009995 - Visa (insufficient funds)"
    ]
  })
};

// Validation middleware
const paymentIntentValidation = [
  body('planId')
    .isInt()
    .withMessage('Plan ID must be a valid integer'),
  
  body('billingPeriod')
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing period must be monthly or yearly'),
  
  body('promoCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Promo code must be between 3 and 50 characters')
];

const subscriptionValidation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required'),
  
  body('planId')
    .isInt()
    .withMessage('Plan ID must be a valid integer'),
  
  body('billingPeriod')
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing period must be monthly or yearly')
];

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await db('subscription_plans')
      .select('*')
      .where({ is_active: true })
      .orderBy('sort_order');

    // Add service information
    const serviceInfo = {
      isUsingRealStripe: mockStripe.isUsingRealStripe(),
      ...(mockStripe.isUsingRealStripe() ? {} : { upgradeInstructions: mockStripe.getUpgradeInstructions() })
    };

    res.json({
      success: true,
      data: {
        plans,
        serviceInfo
      }
    });

  } catch (error) {
    logger.error('Get plans error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription plans',
      code: 'PLANS_FETCH_ERROR'
    });
  }
});

// Create payment intent for subscription
router.post('/create-payment-intent', authenticateToken, paymentIntentValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const { planId, billingPeriod, promoCode } = req.body;

    // Get plan details
    const plan = await db('subscription_plans')
      .where({ id: planId, is_active: true })
      .first();

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }

    // Calculate amount
    let amount = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;
    let originalAmount = amount;
    let discountApplied = 0;
    let promoCodeRecord = null;

    // Apply promo code if provided
    if (promoCode) {
      promoCodeRecord = await db('promo_codes')
        .where({ 
          code: promoCode,
          is_active: true
        })
        .where('valid_from', '<=', new Date())
        .where(function() {
          this.whereNull('valid_until').orWhere('valid_until', '>=', new Date());
        })
        .first();

      if (!promoCodeRecord) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired promo code',
          code: 'INVALID_PROMO_CODE'
        });
      }

      // Check usage limits
      if (promoCodeRecord.usage_limit && promoCodeRecord.usage_count >= promoCodeRecord.usage_limit) {
        return res.status(400).json({
          success: false,
          error: 'Promo code usage limit exceeded',
          code: 'PROMO_CODE_LIMIT_EXCEEDED'
        });
      }

      // Check if user already used this code
      const existingUsage = await db('promo_code_usage')
        .where({ promo_code_id: promoCodeRecord.id, user_id: userId })
        .first();

      if (existingUsage) {
        return res.status(400).json({
          success: false,
          error: 'Promo code already used',
          code: 'PROMO_CODE_ALREADY_USED'
        });
      }

      // Check plan restrictions
      if (promoCodeRecord.applicable_plans.length > 0 && 
          !promoCodeRecord.applicable_plans.includes(planId)) {
        return res.status(400).json({
          success: false,
          error: 'Promo code not applicable to this plan',
          code: 'PROMO_CODE_INVALID_PLAN'
        });
      }

      // Calculate discount
      if (promoCodeRecord.discount_type === 'percent') {
        discountApplied = amount * (promoCodeRecord.discount_value / 100);
        if (promoCodeRecord.max_discount_amount) {
          discountApplied = Math.min(discountApplied, promoCodeRecord.max_discount_amount);
        }
      } else {
        discountApplied = Math.min(promoCodeRecord.discount_value, amount);
      }

      amount = Math.max(0, amount - discountApplied);
    }

    // Check minimum amount
    if (amount < 0.50) { // Stripe minimum
      amount = 0.50;
    }

    // Create or get Stripe customer
    let stripeCustomerId = req.user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await mockStripe.createCustomer(
        req.user.email,
        `${req.user.firstName} ${req.user.lastName}`
      );
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await db('users')
        .where({ id: userId })
        .update({ stripe_customer_id: stripeCustomerId });
    }

    // Create payment intent
    const paymentIntent = await mockStripe.createPaymentIntent(
      amount,
      plan.currency || 'USD',
      {
        userId: userId.toString(),
        planId: planId.toString(),
        billingPeriod,
        promoCode: promoCode || null,
        originalAmount: originalAmount.toString(),
        discountApplied: discountApplied.toString()
      }
    );

    logger.info('Payment intent created', {
      userId,
      planId,
      billingPeriod,
      amount,
      originalAmount,
      discountApplied,
      promoCode,
      paymentIntentId: paymentIntent.id
    });

    res.json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        },
        plan,
        pricing: {
          originalAmount,
          discountApplied,
          finalAmount: amount,
          currency: plan.currency || 'USD'
        },
        promoCode: promoCodeRecord ? {
          code: promoCodeRecord.code,
          description: promoCodeRecord.description,
          discountType: promoCodeRecord.discount_type,
          discountValue: promoCodeRecord.discount_value
        } : null,
        serviceInfo: {
          isUsingRealStripe: mockStripe.isUsingRealStripe(),
          ...(mockStripe.isUsingRealStripe() ? {} : { upgradeInstructions: mockStripe.getUpgradeInstructions() })
        }
      }
    });

  } catch (error) {
    logger.error('Create payment intent error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      planId: req.body.planId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      code: 'PAYMENT_INTENT_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Confirm payment and create subscription
router.post('/confirm-subscription', authenticateToken, subscriptionValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user.id;
    const { paymentIntentId, planId, billingPeriod } = req.body;

    // Get plan details
    const plan = await db('subscription_plans')
      .where({ id: planId, is_active: true })
      .first();

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }

    // In real implementation, verify payment with Stripe here
    // For mock, we simulate successful payment

    // Check if user already has an active subscription
    const existingSubscription = await db('user_subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription',
        code: 'EXISTING_SUBSCRIPTION'
      });
    }

    // Create subscription record
    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Get Stripe price ID (in real implementation)
    const stripePriceId = billingPeriod === 'yearly' ? 
      plan.stripe_price_id_yearly : 
      plan.stripe_price_id_monthly;

    // Create Stripe subscription (mock)
    const stripeSubscription = await mockStripe.createSubscription(
      req.user.stripe_customer_id,
      stripePriceId,
      plan.name === 'premium' ? 7 : null // 7 day trial for premium
    );

    // Create subscription in database
    const subscriptionData = {
      user_id: userId,
      plan_id: planId,
      status: stripeSubscription.status,
      billing_period: billingPeriod,
      starts_at: now,
      current_period_start: new Date(stripeSubscription.current_period_start * 1000),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000),
      stripe_subscription_id: stripeSubscription.id,
      stripe_customer_id: stripeSubscription.customer,
      trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      created_at: now,
      updated_at: now
    };

    const [subscriptionId] = await db('user_subscriptions').insert(subscriptionData).returning('id');

    // Update user subscription status
    await db('users')
      .where({ id: userId })
      .update({ 
        subscription_status: plan.name,
        subscription_expires: subscriptionData.current_period_end,
        updated_at: now
      });

    // Record payment transaction
    const amount = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly;
    await db('payment_transactions').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      transaction_type: 'subscription',
      amount,
      currency: plan.currency || 'USD',
      description: `${plan.display_name} - ${billingPeriod} subscription`,
      status: 'completed',
      payment_method: 'stripe',
      stripe_payment_intent_id: paymentIntentId,
      external_transaction_id: stripeSubscription.id,
      processed_at: now,
      created_at: now
    });

    logger.info('Subscription created successfully', {
      userId,
      subscriptionId,
      planId,
      billingPeriod,
      amount,
      stripeSubscriptionId: stripeSubscription.id,
      trialEnd: stripeSubscription.trial_end
    });

    res.json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription: {
          id: subscriptionId,
          plan: plan.name,
          displayName: plan.display_name,
          status: stripeSubscription.status,
          billingPeriod,
          currentPeriodStart: subscriptionData.current_period_start,
          currentPeriodEnd: subscriptionData.current_period_end,
          trialStart: subscriptionData.trial_start,
          trialEnd: subscriptionData.trial_end
        },
        payment: {
          amount,
          currency: plan.currency || 'USD',
          paymentIntentId
        }
      }
    });

  } catch (error) {
    logger.error('Confirm subscription error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      paymentIntentId: req.body.paymentIntentId
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      code: 'SUBSCRIPTION_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get user's current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await db('user_subscriptions')
      .leftJoin('subscription_plans', 'user_subscriptions.plan_id', 'subscription_plans.id')
      .select(
        'user_subscriptions.*',
        'subscription_plans.name as plan_name',
        'subscription_plans.display_name',
        'subscription_plans.description as plan_description',
        'subscription_plans.features',
        'subscription_plans.limits'
      )
      .where({ 'user_subscriptions.user_id': userId })
      .orderBy('user_subscriptions.created_at', 'desc')
      .first();

    if (!subscription) {
      // Return free plan info
      const freePlan = await db('subscription_plans')
        .where({ name: 'free' })
        .first();

      return res.json({
        success: true,
        data: {
          subscription: null,
          currentPlan: freePlan,
          usage: await getUserUsage(userId)
        }
      });
    }

    // Parse JSON fields
    const subscriptionData = {
      ...subscription,
      features: JSON.parse(subscription.features || '{}'),
      limits: JSON.parse(subscription.limits || '{}'),
      usage_data: JSON.parse(subscription.usage_data || '{}')
    };

    res.json({
      success: true,
      data: {
        subscription: subscriptionData,
        currentPlan: {
          id: subscription.plan_id,
          name: subscription.plan_name,
          displayName: subscription.display_name,
          description: subscription.plan_description,
          features: subscriptionData.features,
          limits: subscriptionData.limits
        },
        usage: await getUserUsage(userId)
      }
    });

  } catch (error) {
    logger.error('Get subscription error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription',
      code: 'SUBSCRIPTION_FETCH_ERROR'
    });
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await db('user_subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    // In real implementation, cancel with Stripe
    // For mock, we just update the database

    await db('user_subscriptions')
      .where({ id: subscription.id })
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date()
      });

    // Don't immediately downgrade - let them use until period end
    logger.info('Subscription cancelled', {
      userId,
      subscriptionId: subscription.id,
      periodEnd: subscription.current_period_end
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        message: 'Your subscription will remain active until the end of your current billing period',
        accessUntil: subscription.current_period_end
      }
    });

  } catch (error) {
    logger.error('Cancel subscription error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
      code: 'SUBSCRIPTION_CANCEL_ERROR'
    });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    const transactions = await db('payment_transactions')
      .leftJoin('user_subscriptions', 'payment_transactions.subscription_id', 'user_subscriptions.id')
      .leftJoin('subscription_plans', 'user_subscriptions.plan_id', 'subscription_plans.id')
      .select(
        'payment_transactions.*',
        'subscription_plans.display_name as plan_name'
      )
      .where({ 'payment_transactions.user_id': userId })
      .orderBy('payment_transactions.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalCount = await db('payment_transactions')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    const totalPages = Math.ceil(totalCount.count / limit);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults: parseInt(totalCount.count),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Payment history error', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history',
      code: 'PAYMENT_HISTORY_ERROR'
    });
  }
});

// Helper function to get user usage
async function getUserUsage(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await db('user_ai_usage')
    .select('service_type', 'usage_count', 'date')
    .where({ user_id: userId })
    .where('date', '>=', today);

  const usageMap = {};
  usage.forEach(u => {
    if (!usageMap[u.service_type]) {
      usageMap[u.service_type] = 0;
    }
    usageMap[u.service_type] += u.usage_count;
  });

  return {
    bioGenerations: usageMap.bio_generation || 0,
    photoAnalyses: usageMap.photo_analysis || 0,
    date: today.toISOString().split('T')[0]
  };
}

module.exports = router;