-- Migration: Create subscription and payment tables
-- Created: 2025-01-10
-- Description: Tables for subscription management, payments, and billing

-- Subscription Plans Table
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'premium', 'pro'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    price_yearly DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Features
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}', -- usage limits
    
    -- Plan settings
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Stripe integration
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    stripe_product_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Subscriptions Table
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    
    -- Subscription details
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'cancelled', 'past_due', 'unpaid', 'incomplete', 'trialing')
    ),
    billing_period VARCHAR(10) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    
    -- Dates
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    
    -- Stripe integration
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    
    -- Usage tracking
    usage_data JSONB DEFAULT '{}',
    last_usage_reset TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions Table
CREATE TABLE payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('subscription', 'upgrade', 'refund', 'credit', 'one_time')
    ),
    amount DECIMAL(8,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
    ),
    
    -- Payment method
    payment_method VARCHAR(50), -- 'stripe', 'paypal', 'apple_pay', etc.
    
    -- External references
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    external_transaction_id VARCHAR(255),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing Addresses Table
CREATE TABLE billing_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Address details
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    company VARCHAR(100),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
    
    -- Settings
    is_primary BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo Codes Table
CREATE TABLE promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    
    -- Discount settings
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(8,2) NOT NULL,
    max_discount_amount DECIMAL(8,2), -- For percentage discounts
    
    -- Validity
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    usage_limit INTEGER, -- NULL = unlimited
    usage_count INTEGER DEFAULT 0,
    
    -- Applicable plans
    applicable_plans INTEGER[] DEFAULT '{}', -- Array of plan IDs, empty = all plans
    billing_periods VARCHAR(10)[] DEFAULT '{}', -- empty = all periods
    
    -- Restrictions
    min_amount DECIMAL(8,2) DEFAULT 0.00,
    first_time_only BOOLEAN DEFAULT FALSE,
    
    -- Stripe integration
    stripe_coupon_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo Code Usage Table
CREATE TABLE promo_code_usage (
    id SERIAL PRIMARY KEY,
    promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    
    -- Usage details
    discount_applied DECIMAL(8,2) NOT NULL,
    original_amount DECIMAL(8,2) NOT NULL,
    final_amount DECIMAL(8,2) NOT NULL,
    
    -- Timestamps
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent multiple uses by same user
    UNIQUE(promo_code_id, user_id)
);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Free Plan', 'Basic features for getting started', 0.00, 0.00, 
 '{"bio_generations": true, "photo_analysis": true, "basic_support": true}', 
 '{"bio_generations_per_day": 3, "photo_analysis_per_day": 2, "photos_per_analysis": 3}'),

('premium', 'Premium Plan', 'Advanced features for serious daters', 9.99, 99.99, 
 '{"unlimited_bio_generations": true, "advanced_photo_analysis": true, "priority_support": true, "detailed_analytics": true, "profile_optimization": true}', 
 '{"bio_generations_per_day": -1, "photo_analysis_per_day": 10, "photos_per_analysis": 10}'),

('pro', 'Pro Plan', 'Complete toolkit for dating success', 19.99, 199.99, 
 '{"everything_in_premium": true, "ai_coaching": true, "custom_preferences": true, "white_glove_support": true, "early_access": true, "api_access": true}', 
 '{"bio_generations_per_day": -1, "photo_analysis_per_day": -1, "photos_per_analysis": -1}');

-- Indexes for user_subscriptions
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status, current_period_end);
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_period ON user_subscriptions(current_period_end);

-- Indexes for payment_transactions
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id, created_at);
CREATE INDEX idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status, created_at);
CREATE INDEX idx_payment_transactions_stripe_payment ON payment_transactions(stripe_payment_intent_id);

-- Indexes for billing_addresses
CREATE INDEX idx_billing_addresses_user_id ON billing_addresses(user_id, is_primary);

-- Indexes for promo_codes
CREATE INDEX idx_promo_codes_code ON promo_codes(code, is_active);
CREATE INDEX idx_promo_codes_validity ON promo_codes(valid_from, valid_until, is_active);

-- Indexes for promo_code_usage
CREATE INDEX idx_promo_code_usage_code ON promo_code_usage(promo_code_id, used_at);
CREATE INDEX idx_promo_code_usage_user ON promo_code_usage(user_id, used_at);

-- Update timestamp triggers
CREATE TRIGGER update_subscription_plans_updated_at 
    BEFORE UPDATE ON subscription_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_addresses_updated_at 
    BEFORE UPDATE ON billing_addresses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at 
    BEFORE UPDATE ON promo_codes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update promo code usage count
CREATE OR REPLACE FUNCTION update_promo_code_usage_count() RETURNS TRIGGER AS $$
BEGIN
    UPDATE promo_codes 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promo_code_usage_count_trigger
    AFTER INSERT ON promo_code_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_promo_code_usage_count();

-- Function to ensure only one primary billing address per user
CREATE OR REPLACE FUNCTION ensure_single_primary_billing_address() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        UPDATE billing_addresses 
        SET is_primary = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_billing_address_trigger
    BEFORE INSERT OR UPDATE ON billing_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_billing_address();

-- Comments
COMMENT ON TABLE subscription_plans IS 'Available subscription plans with features and pricing';
COMMENT ON TABLE user_subscriptions IS 'User subscription records with billing periods and status';
COMMENT ON TABLE payment_transactions IS 'All payment transactions for subscriptions and one-time purchases';
COMMENT ON TABLE billing_addresses IS 'User billing address information';
COMMENT ON TABLE promo_codes IS 'Promotional discount codes';
COMMENT ON TABLE promo_code_usage IS 'Track promo code usage to prevent abuse';

COMMENT ON COLUMN subscription_plans.features IS 'JSON object defining plan features';
COMMENT ON COLUMN subscription_plans.limits IS 'JSON object defining usage limits (-1 = unlimited)';
COMMENT ON COLUMN user_subscriptions.usage_data IS 'JSON tracking current usage against plan limits';
COMMENT ON COLUMN promo_codes.applicable_plans IS 'Array of plan IDs, empty array means all plans';
COMMENT ON COLUMN promo_codes.billing_periods IS 'Array of billing periods, empty array means all periods';