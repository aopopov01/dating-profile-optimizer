-- Migration: Create authentication-related tables
-- Created: 2025-01-10
-- Description: Tables for refresh tokens, password resets, and 2FA

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    device_info JSONB DEFAULT '{}', -- Store device/browser info
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens Table
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Two-Factor Authentication Table
CREATE TABLE user_2fa (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret_key VARCHAR(255) NOT NULL,
    backup_codes TEXT[], -- Array of backup codes
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login Attempts Table (for rate limiting and security)
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', etc.
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security Events Table (audit log)
CREATE TABLE security_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'password_change', 'email_change', etc.
    event_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(is_revoked, expires_at);

-- Indexes for password_reset_tokens
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_used ON password_reset_tokens(is_used);

-- Indexes for login_attempts
CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success, attempted_at);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempted_at);

-- Indexes for security_events
CREATE INDEX idx_security_events_user_id ON security_events(user_id, created_at);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at);
CREATE INDEX idx_security_events_time ON security_events(created_at);

-- Update timestamp trigger for user_2fa
CREATE TRIGGER update_user_2fa_updated_at 
    BEFORE UPDATE ON user_2fa 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS void AS $$
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = TRUE;
    
    -- Delete used or expired password reset tokens older than 24 hours
    DELETE FROM password_reset_tokens 
    WHERE (expires_at < CURRENT_TIMESTAMP OR is_used = TRUE) 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    -- Delete old login attempts (keep 30 days)
    DELETE FROM login_attempts 
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Delete old security events (keep 1 year)
    DELETE FROM security_events 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for secure authentication';
COMMENT ON TABLE password_reset_tokens IS 'One-time tokens for password reset functionality';
COMMENT ON TABLE user_2fa IS 'Two-factor authentication settings for users';
COMMENT ON TABLE login_attempts IS 'Audit log of all login attempts for security monitoring';
COMMENT ON TABLE security_events IS 'Comprehensive audit log of security-related events';

COMMENT ON COLUMN refresh_tokens.device_info IS 'JSON containing device/browser information';
COMMENT ON COLUMN user_2fa.backup_codes IS 'Array of one-time backup codes for 2FA recovery';
COMMENT ON COLUMN security_events.event_details IS 'JSON containing event-specific information';