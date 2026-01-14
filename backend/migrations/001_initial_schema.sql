-- Web-Guard Database Schema
-- Initial schema for multi-tenant domain monitoring platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- Users & Authentication
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- Organizations (Teams)
-- ============================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    webhook_url VARCHAR(2048),
    webhook_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    max_monitors INTEGER DEFAULT 10
);

CREATE INDEX idx_orgs_slug ON organizations(slug);

-- ============================================================================
-- Organization Members (RBAC)
-- ============================================================================

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- ============================================================================
-- Domains
-- ============================================================================

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(organization_id, normalized_name)
);

CREATE INDEX idx_domains_org ON domains(organization_id);
CREATE INDEX idx_domains_active ON domains(is_active);

-- ============================================================================
-- Monitors
-- ============================================================================

CREATE TABLE monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('domain_dns', 'ssl_cert', 'uptime', 'security_headers')),
    is_enabled BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain_id, type)
);

CREATE INDEX idx_monitors_domain ON monitors(domain_id);
CREATE INDEX idx_monitors_type ON monitors(type);
CREATE INDEX idx_monitors_enabled ON monitors(is_enabled);

-- ============================================================================
-- Tasks (Job Queue)
-- ============================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_id UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_status_scheduled ON tasks(status, scheduled_at);
CREATE INDEX idx_tasks_monitor ON tasks(monitor_id);
CREATE INDEX idx_tasks_priority ON tasks(priority DESC, scheduled_at ASC);

-- ============================================================================
-- DNS Snapshots
-- ============================================================================

CREATE TABLE domain_dns_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_resolvable BOOLEAN NOT NULL,
    a_records TEXT[] DEFAULT '{}',
    aaaa_records TEXT[] DEFAULT '{}',
    cname_records TEXT[] DEFAULT '{}',
    nameservers TEXT[] DEFAULT '{}',
    registrar VARCHAR(255),
    registry_expires_at TIMESTAMPTZ,
    registry_status VARCHAR(50)[],
    has_changed_since_last BOOLEAN DEFAULT false,
    changes JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_dns_snapshots_domain_time ON domain_dns_snapshots(domain_id, check_time DESC);
CREATE INDEX idx_dns_snapshots_expires ON domain_dns_snapshots(registry_expires_at);

-- ============================================================================
-- SSL Certificate Snapshots
-- ============================================================================

CREATE TABLE ssl_cert_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_valid BOOLEAN NOT NULL,
    issuer VARCHAR(255),
    subject VARCHAR(255),
    sans TEXT[] DEFAULT '{}',
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    days_until_expiry INTEGER,
    is_expiring_soon BOOLEAN DEFAULT false,
    is_expired BOOLEAN DEFAULT false,
    chain_is_valid BOOLEAN DEFAULT false,
    hostname_matches BOOLEAN DEFAULT false
);

CREATE INDEX idx_ssl_snapshots_domain_time ON ssl_cert_snapshots(domain_id, check_time DESC);
CREATE INDEX idx_ssl_snapshots_expiry ON ssl_cert_snapshots(valid_until);
CREATE INDEX idx_ssl_snapshots_expiring ON ssl_cert_snapshots(is_expiring_soon, valid_until);

-- ============================================================================
-- Uptime Snapshots
-- ============================================================================

CREATE TABLE uptime_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status_code INTEGER,
    response_time_ms INTEGER,
    is_up BOOLEAN NOT NULL,
    error_type VARCHAR(100),
    consecutive_failures INTEGER DEFAULT 0
);

CREATE INDEX idx_uptime_snapshots_domain_time ON uptime_snapshots(domain_id, check_time DESC);
CREATE INDEX idx_uptime_snapshots_status ON uptime_snapshots(is_up, check_time);

-- ============================================================================
-- Uptime Aggregates (Pre-computed Statistics)
-- ============================================================================

CREATE TABLE uptime_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_checks INTEGER NOT NULL,
    successful_checks INTEGER NOT NULL,
    uptime_percentage DECIMAL(5,2) NOT NULL,
    avg_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),
    UNIQUE(domain_id, period_start, period_type)
);

CREATE INDEX idx_uptime_agg_domain_period ON uptime_aggregates(domain_id, period_start DESC);

-- ============================================================================
-- Security Header Snapshots
-- ============================================================================

CREATE TABLE security_header_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    has_https_redirect BOOLEAN DEFAULT false,
    has_csp BOOLEAN DEFAULT false,
    has_hsts BOOLEAN DEFAULT false,
    has_x_frame_options BOOLEAN DEFAULT false,
    has_x_content_type_options BOOLEAN DEFAULT false,
    csp_header TEXT,
    hsts_header TEXT,
    score INTEGER DEFAULT 0
);

CREATE INDEX idx_sec_snapshots_domain_time ON security_header_snapshots(domain_id, check_time DESC);
CREATE INDEX idx_sec_snapshots_score ON security_header_snapshots(score);

-- ============================================================================
-- Alerts (Webhook Event Log)
-- ============================================================================

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    webhook_sent_at TIMESTAMPTZ,
    webhook_status_code INTEGER,
    webhook_success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_org_time ON alerts(organization_id, created_at DESC);
CREATE INDEX idx_alerts_domain ON alerts(domain_id);
CREATE INDEX idx_alerts_type_severity ON alerts(alert_type, severity);
CREATE INDEX idx_alerts_webhook_failed ON alerts(webhook_success, created_at);

-- ============================================================================
-- Refresh Tokens
-- ============================================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitors_updated_at BEFORE UPDATE ON monitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
