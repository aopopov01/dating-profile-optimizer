-- Migration: Create photo-related tables
-- Created: 2025-01-10
-- Description: Tables for user photos, analysis, and moderation

-- User Photos Table
CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    display_order INTEGER NOT NULL DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Photo metadata
    original_filename VARCHAR(255),
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    
    -- Upload info
    upload_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'social_import', 'camera'
    cloudinary_public_id VARCHAR(255), -- For Cloudinary integration
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (
        moderation_status IN ('pending', 'approved', 'rejected', 'flagged')
    ),
    moderation_score DECIMAL(3,2), -- 0.00 to 1.00
    moderation_flags JSONB DEFAULT '[]',
    moderated_at TIMESTAMP,
    moderated_by VARCHAR(50), -- 'system', 'admin', user_id
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo Analysis Table
CREATE TABLE photo_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_ids JSONB NOT NULL, -- Array of photo IDs or 'temp_analysis' for uploaded photos
    
    -- Analysis settings
    analysis_options JSONB DEFAULT '{}',
    
    -- Results
    results JSONB NOT NULL, -- Full AI analysis results
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Analysis metadata
    is_temporary BOOLEAN DEFAULT FALSE, -- True for upload analysis, false for profile analysis
    processing_time_ms INTEGER,
    ai_model_used VARCHAR(100),
    confidence_score DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Analysis cost tracking
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(8,4) DEFAULT 0.0000
);

-- Bio Generations Table
CREATE TABLE bio_generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Generation settings
    preferences JSONB DEFAULT '{}', -- tone, length, focus, etc.
    
    -- Results
    generated_bio TEXT NOT NULL,
    variations JSONB DEFAULT '[]', -- Array of alternative bios
    analysis JSONB DEFAULT '{}', -- Quality metrics, suggestions
    
    -- Usage
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    
    -- Generation metadata
    processing_time_ms INTEGER,
    ai_model_used VARCHAR(100) DEFAULT 'mock-gpt-4-turbo',
    confidence_score DECIMAL(3,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cost tracking
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(8,4) DEFAULT 0.0000
);

-- AI Usage Tracking Table
CREATE TABLE user_ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'bio_generation', 'photo_analysis'
    
    -- Usage metrics
    usage_count INTEGER DEFAULT 1,
    tokens_used INTEGER DEFAULT 0,
    cost_estimate DECIMAL(8,4) DEFAULT 0.0000,
    
    -- Date tracking (for daily/monthly limits)
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate entries per day
    UNIQUE(user_id, service_type, date)
);

-- Photo Reports Table (for user reporting)
CREATE TABLE photo_reports (
    id SERIAL PRIMARY KEY,
    photo_id INTEGER NOT NULL REFERENCES user_photos(id) ON DELETE CASCADE,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Report details
    report_reason VARCHAR(50) NOT NULL CHECK (
        report_reason IN ('inappropriate', 'fake', 'spam', 'copyright', 'other')
    ),
    report_description TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'reviewed', 'resolved', 'dismissed')
    ),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_photos
CREATE INDEX idx_user_photos_user_id ON user_photos(user_id, display_order);
CREATE INDEX idx_user_photos_primary ON user_photos(user_id, is_primary);
CREATE INDEX idx_user_photos_moderation ON user_photos(moderation_status, created_at);
CREATE INDEX idx_user_photos_created ON user_photos(created_at);
CREATE UNIQUE INDEX idx_user_photos_primary_unique ON user_photos(user_id) 
    WHERE is_primary = TRUE; -- Only one primary photo per user

-- Indexes for photo_analyses
CREATE INDEX idx_photo_analyses_user_id ON photo_analyses(user_id, created_at);
CREATE INDEX idx_photo_analyses_temporary ON photo_analyses(is_temporary, created_at);
CREATE INDEX idx_photo_analyses_score ON photo_analyses(overall_score, created_at);

-- Indexes for bio_generations
CREATE INDEX idx_bio_generations_user_id ON bio_generations(user_id, created_at);
CREATE INDEX idx_bio_generations_used ON bio_generations(is_used, used_at);

-- Indexes for user_ai_usage
CREATE INDEX idx_user_ai_usage_user_service ON user_ai_usage(user_id, service_type, date);
CREATE INDEX idx_user_ai_usage_date ON user_ai_usage(date, service_type);

-- Indexes for photo_reports
CREATE INDEX idx_photo_reports_photo_id ON photo_reports(photo_id, status);
CREATE INDEX idx_photo_reports_status ON photo_reports(status, created_at);

-- Update timestamp triggers
CREATE TRIGGER update_user_photos_updated_at 
    BEFORE UPDATE ON user_photos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one primary photo per user
CREATE OR REPLACE FUNCTION ensure_single_primary_photo() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        -- Remove primary flag from other photos of the same user
        UPDATE user_photos 
        SET is_primary = FALSE 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_photo_trigger
    BEFORE INSERT OR UPDATE ON user_photos
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_primary_photo();

-- Function to update display order
CREATE OR REPLACE FUNCTION update_photo_display_order() RETURNS TRIGGER AS $$
BEGIN
    -- If no display_order specified, set it to max + 1
    IF NEW.display_order IS NULL THEN
        SELECT COALESCE(MAX(display_order), 0) + 1 
        INTO NEW.display_order
        FROM user_photos 
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photo_display_order_trigger
    BEFORE INSERT ON user_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_display_order();

-- Comments
COMMENT ON TABLE user_photos IS 'User profile photos with metadata and moderation info';
COMMENT ON TABLE photo_analyses IS 'AI analysis results for user photos';
COMMENT ON TABLE bio_generations IS 'AI-generated bio suggestions and variations';
COMMENT ON TABLE user_ai_usage IS 'Tracking table for AI service usage and costs';
COMMENT ON TABLE photo_reports IS 'User reports for inappropriate photos';

COMMENT ON COLUMN user_photos.moderation_flags IS 'Array of moderation flags from AI/manual review';
COMMENT ON COLUMN photo_analyses.photo_ids IS 'Array of photo IDs analyzed or "temp_analysis" for uploads';
COMMENT ON COLUMN bio_generations.variations IS 'Array of alternative bio suggestions';
COMMENT ON COLUMN user_ai_usage.date IS 'Date for tracking daily usage limits';