use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use utoipa::ToSchema;

// ============================================================================
// User & Organization Models
// ============================================================================

/// User account
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub is_active: bool,
}

/// Organization (team)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct Organization {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub webhook_url: Option<String>,
    #[serde(skip_serializing)]
    pub webhook_secret: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub max_monitors: i32,
}

/// Organization member with role
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct OrganizationMember {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub user_id: Uuid,
    pub role: MemberRole,
    pub created_at: DateTime<Utc>,
}

/// Member role in an organization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum MemberRole {
    Owner,
    Admin,
    Member,
    Viewer,
}

impl MemberRole {
    /// Check if this role can perform admin actions
    #[must_use]
    pub const fn is_admin(&self) -> bool {
        matches!(self, Self::Owner | Self::Admin)
    }

    /// Check if this role can write (not just read)
    #[must_use]
    pub const fn can_write(&self) -> bool {
        matches!(self, Self::Owner | Self::Admin | Self::Member)
    }
}

impl std::fmt::Display for MemberRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Owner => write!(f, "owner"),
            Self::Admin => write!(f, "admin"),
            Self::Member => write!(f, "member"),
            Self::Viewer => write!(f, "viewer"),
        }
    }
}

impl std::str::FromStr for MemberRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "member" => Ok(Self::Member),
            "viewer" => Ok(Self::Viewer),
            _ => Err(format!("Invalid role: {}", s)),
        }
    }
}

// ============================================================================
// Domain & Monitor Models
// ============================================================================

/// Domain being monitored
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct Domain {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub normalized_name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// Monitor configuration for a domain
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Monitor {
    pub id: Uuid,
    pub domain_id: Uuid,
    #[serde(rename = "type")]
    #[sqlx(rename = "type")]
    pub monitor_type: MonitorType,
    pub is_enabled: bool,
    pub config: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Type of monitor
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
pub enum MonitorType {
    DomainDns,
    SslCert,
    Uptime,
    SecurityHeaders,
}

impl std::fmt::Display for MonitorType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DomainDns => write!(f, "domain_dns"),
            Self::SslCert => write!(f, "ssl_cert"),
            Self::Uptime => write!(f, "uptime"),
            Self::SecurityHeaders => write!(f, "security_headers"),
        }
    }
}

impl std::str::FromStr for MonitorType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "domain_dns" => Ok(Self::DomainDns),
            "ssl_cert" => Ok(Self::SslCert),
            "uptime" => Ok(Self::Uptime),
            "security_headers" => Ok(Self::SecurityHeaders),
            _ => Err(format!("Invalid monitor type: {}", s)),
        }
    }
}

// ============================================================================
// Task Models
// ============================================================================

/// Task in the job queue
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub monitor_id: Uuid,
    #[serde(rename = "type")]
    pub task_type: String,
    pub status: TaskStatus,
    pub priority: i32,
    pub scheduled_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub attempt_count: i32,
    pub max_attempts: i32,
    pub error_message: Option<String>,
    pub result: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// Task status in the queue
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Running => write!(f, "running"),
            Self::Completed => write!(f, "completed"),
            Self::Failed => write!(f, "failed"),
            Self::Cancelled => write!(f, "cancelled"),
        }
    }
}

// ============================================================================
// Snapshot Models
// ============================================================================

/// DNS monitoring snapshot
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DomainDnsSnapshot {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: DateTime<Utc>,
    pub is_resolvable: bool,
    pub a_records: Vec<String>,
    pub aaaa_records: Vec<String>,
    pub cname_records: Vec<String>,
    pub nameservers: Vec<String>,
    pub registrar: Option<String>,
    pub registry_expires_at: Option<DateTime<Utc>>,
    pub registry_status: Option<Vec<String>>,
    pub has_changed_since_last: bool,
    pub changes: serde_json::Value,
}

/// SSL certificate monitoring snapshot
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SslCertSnapshot {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: DateTime<Utc>,
    pub is_valid: bool,
    pub issuer: Option<String>,
    pub subject: Option<String>,
    pub sans: Vec<String>,
    pub valid_from: Option<DateTime<Utc>>,
    pub valid_until: Option<DateTime<Utc>>,
    pub days_until_expiry: Option<i32>,
    pub is_expiring_soon: bool,
    pub is_expired: bool,
    pub chain_is_valid: bool,
    pub hostname_matches: bool,
}

/// Uptime monitoring snapshot
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UptimeSnapshot {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: DateTime<Utc>,
    pub status_code: Option<i32>,
    pub response_time_ms: Option<i32>,
    pub is_up: bool,
    pub error_type: Option<String>,
    pub consecutive_failures: i32,
}

/// Pre-computed uptime statistics
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UptimeAggregate {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub total_checks: i32,
    pub successful_checks: i32,
    pub uptime_percentage: rust_decimal::Decimal,
    pub avg_response_time_ms: Option<i32>,
    pub p95_response_time_ms: Option<i32>,
    pub p99_response_time_ms: Option<i32>,
    #[serde(rename = "type")]
    pub period_type: AggregatePeriod,
}

/// Time period for aggregates
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum AggregatePeriod {
    Hour,
    Day,
    Week,
    Month,
}

impl std::fmt::Display for AggregatePeriod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Hour => write!(f, "hour"),
            Self::Day => write!(f, "day"),
            Self::Week => write!(f, "week"),
            Self::Month => write!(f, "month"),
        }
    }
}

/// Security header monitoring snapshot
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SecurityHeaderSnapshot {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: DateTime<Utc>,
    pub has_https_redirect: bool,
    pub has_csp: bool,
    pub has_hsts: bool,
    pub has_x_frame_options: bool,
    pub has_x_content_type_options: bool,
    pub csp_header: Option<String>,
    pub hsts_header: Option<String>,
    pub score: i32,
}

// ============================================================================
// Alert Models
// ============================================================================

/// Alert event
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct Alert {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub domain_id: Uuid,
    #[serde(rename = "type")]
    pub alert_type: String,
    pub severity: AlertSeverity,
    pub title: String,
    pub description: Option<String>,
    pub metadata: serde_json::Value,
    pub webhook_sent_at: Option<DateTime<Utc>>,
    pub webhook_status_code: Option<i32>,
    pub webhook_success: Option<bool>,
    pub created_at: DateTime<Utc>,
}

/// Alert severity level
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, ToSchema)]
#[sqlx(type_name = "varchar", rename_all = "lowercase")]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

impl std::fmt::Display for AlertSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Info => write!(f, "info"),
            Self::Warning => write!(f, "warning"),
            Self::Critical => write!(f, "critical"),
        }
    }
}

// ============================================================================
// Authentication Models
// ============================================================================

/// Refresh token for JWT
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    #[serde(skip_serializing)]
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub is_revoked: bool,
}

// ============================================================================
// Create/Update DTOs
// ============================================================================

/// Create a new user
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct CreateUser {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
    pub full_name: Option<String>,
}

/// Create a new organization
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct CreateOrganization {
    #[validate(length(min = 1, max = 100))]
    pub name: String,
    #[validate(length(min = 1, max = 50))]
    pub slug: Option<String>,
}

/// Update an organization
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct UpdateOrganization {
    pub name: Option<String>,
    pub webhook_url: Option<String>,
}

/// Create a new domain
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct CreateDomain {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
}

/// Update a domain
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateDomain {
    pub is_active: Option<bool>,
}

/// Create a new monitor
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct CreateMonitor {
    #[serde(rename = "type")]
    pub monitor_type: MonitorType,
    pub is_enabled: Option<bool>,
    pub config: serde_json::Value,
}

/// Update a monitor
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateMonitor {
    pub is_enabled: Option<bool>,
    pub config: Option<serde_json::Value>,
}

/// Login request
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 1))]
    pub password: String,
}

/// Add a member to organization
#[derive(Debug, Clone, Deserialize, validator::Validate)]
pub struct AddMember {
    #[validate(email)]
    pub email: String,
    pub role: MemberRole,
}

/// Refresh token request
#[derive(Debug, Clone, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

// ============================================================================
// Statistics & Analytics Models
// ============================================================================

/// Organization-level statistics
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct OrganizationStats {
    pub total_domains: i64,
    pub active_domains: i64,
    pub online_domains: i64,
    pub ssl_valid_domains: i64,
    pub critical_alerts_24h: i64,
    pub avg_uptime_7d: Option<rust_decimal::Decimal>,
}

/// Domain with monitoring status (enhanced domain list response)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct DomainWithStatus {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String, // This will be display_name after migration
    pub url: String, // This will be the actual URL after migration
    pub normalized_name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // Uptime status
    pub uptime_is_up: Option<bool>,
    pub uptime_response_time_ms: Option<i32>,
    pub uptime_status_code: Option<i32>,
    pub uptime_consecutive_failures: Option<i32>,
    // SSL status
    pub ssl_is_valid: Option<bool>,
    pub ssl_days_until_expiry: Option<i32>,
    pub ssl_is_expiring_soon: Option<bool>,
    pub ssl_is_expired: Option<bool>,
}

/// Domain comprehensive statistics (for detail page)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct DomainStatistics {
    // Latest uptime
    pub latest_is_up: Option<bool>,
    pub latest_response_time_ms: Option<i32>,
    pub latest_status_code: Option<i32>,
    pub latest_check_time: Option<DateTime<Utc>>,
    // SSL
    pub ssl_is_valid: Option<bool>,
    pub ssl_days_until_expiry: Option<i32>,
    pub ssl_is_expiring_soon: Option<bool>,
    pub ssl_is_expired: Option<bool>,
    // 7-day aggregate
    pub uptime_7d: Option<rust_decimal::Decimal>,
    pub avg_response_time_7d: Option<i32>,
    pub successful_checks_7d: Option<i32>,
    pub total_checks_7d: Option<i32>,
}

/// Public domain status for status page
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
pub struct PublicDomainStatus {
    pub id: Uuid,
    pub name: String,
    pub url: String,
    pub is_active: bool,
    pub is_up: Option<bool>,
    pub response_time_ms: Option<i32>,
    pub last_check_time: Option<DateTime<Utc>>,
    pub uptime_7d: Option<rust_decimal::Decimal>,
    pub uptime_30d: Option<rust_decimal::Decimal>,
}

/// Organization with domains for public status page
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct OrganizationWithDomains {
    pub organization: Organization,
    pub domains: Vec<PublicDomainStatus>,
}
