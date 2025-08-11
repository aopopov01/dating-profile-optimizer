-- Migration: Create users table
-- Created: 2025-01-10
-- Description: Core users table with comprehensive profile fields

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    
    -- Basic Info
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile Details
    date_of_birth DATE NOT NULL,
    age INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))
    ) STORED,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
    interested_in VARCHAR(20) NOT NULL CHECK (interested_in IN ('men', 'women', 'both', 'non-binary')),
    location VARCHAR(100),
    
    -- Extended Profile
    bio TEXT,
    interests JSONB DEFAULT '[]',
    occupation VARCHAR(100),
    education VARCHAR(100),
    height INTEGER, -- in centimeters
    
    -- Lifestyle
    drinking VARCHAR(20) CHECK (drinking IN ('never', 'rarely', 'socially', 'regularly')),
    smoking VARCHAR(20) CHECK (smoking IN ('never', 'rarely', 'socially', 'regularly')),
    relationship_type VARCHAR(20) CHECK (relationship_type IN ('casual', 'serious', 'both')),
    has_kids BOOLEAN DEFAULT FALSE,
    wants_kids VARCHAR(20) CHECK (wants_kids IN ('yes', 'no', 'maybe', 'someday')),
    
    -- Account Status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    
    -- Subscription
    subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'pro')),
    subscription_expires TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    
    -- Profile Analytics
    profile_completion_score INTEGER DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
    profile_views INTEGER DEFAULT 0,
    profile_likes INTEGER DEFAULT 0,
    
    -- Activity Tracking
    last_login_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Privacy Settings
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "public",
        "show_age": true,
        "show_location": true,
        "allow_messages": true,
        "show_last_active": false
    }'
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_age ON users(age);
CREATE INDEX idx_users_gender_interested ON users(gender, interested_in);
CREATE INDEX idx_users_subscription ON users(subscription_status, subscription_expires);
CREATE INDEX idx_users_active ON users(is_active, email_verified);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_activity ON users(last_activity_at);

-- Partial index for active, verified users
CREATE INDEX idx_users_active_verified ON users(id) WHERE is_active = TRUE AND email_verified = TRUE;

-- GIN index for interests JSONB
CREATE INDEX idx_users_interests_gin ON users USING GIN(interests);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'Core users table storing profile information and account details';
COMMENT ON COLUMN users.age IS 'Automatically calculated from date_of_birth';
COMMENT ON COLUMN users.interests IS 'Array of user interests stored as JSON';
COMMENT ON COLUMN users.profile_completion_score IS 'Percentage score (0-100) indicating profile completeness';
COMMENT ON COLUMN users.privacy_settings IS 'JSON object containing user privacy preferences';