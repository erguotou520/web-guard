use sqlx::PgPool;
use uuid::Uuid;
use crate::db::models::*;
use crate::error::{AppError, AppResult};

// ============================================================================
// User Queries
// ============================================================================

/// Find a user by email
pub async fn find_user_by_email(pool: &PgPool, email: &str) -> AppResult<Option<User>> {
    sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = $1 AND is_active = true"
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Find a user by ID
pub async fn find_user_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = $1 AND is_active = true"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Create a new user
pub async fn create_user(
    pool: &PgPool,
    email: &str,
    password_hash: &str,
    full_name: Option<&str>,
) -> AppResult<User> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (email, password_hash, full_name)
        VALUES ($1, $2, $3)
        RETURNING *
        "#
    )
    .bind(email)
    .bind(password_hash)
    .bind(full_name)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(user)
}

/// Update user's last login time
pub async fn update_last_login(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query(
        "UPDATE users SET last_login_at = NOW() WHERE id = $1"
    )
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

// ============================================================================
// Organization Queries
// ============================================================================

/// Find an organization by ID
pub async fn find_organization_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Organization>> {
    sqlx::query_as::<_, Organization>(
        "SELECT * FROM organizations WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Find an organization by slug
pub async fn find_organization_by_slug(pool: &PgPool, slug: &str) -> AppResult<Option<Organization>> {
    sqlx::query_as::<_, Organization>(
        "SELECT * FROM organizations WHERE slug = $1"
    )
    .bind(slug)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Create a new organization
pub async fn create_organization(
    pool: &PgPool,
    name: &str,
    slug: &str,
    owner_id: Uuid,
) -> AppResult<Organization> {
    let mut tx = pool.begin().await.map_err(AppError::from)?;

    let org = sqlx::query_as::<_, Organization>(
        r#"
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        RETURNING *
        "#
    )
    .bind(name)
    .bind(slug)
    .fetch_one(&mut *tx)
    .await
    .map_err(AppError::from)?;

    // Add the owner as a member
    sqlx::query(
        r#"
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, 'owner')
        "#
    )
    .bind(org.id)
    .bind(owner_id)
    .execute(&mut *tx)
    .await
    .map_err(AppError::from)?;

    tx.commit().await.map_err(AppError::from)?;

    Ok(org)
}

/// List organizations for a user
pub async fn list_user_organizations(pool: &PgPool, user_id: Uuid) -> AppResult<Vec<Organization>> {
    sqlx::query_as::<_, Organization>(
        r#"
        SELECT o.* FROM organizations o
        INNER JOIN organization_members om ON o.id = om.organization_id
        WHERE om.user_id = $1
        ORDER BY o.created_at DESC
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Get user's role in an organization
pub async fn get_user_role(
    pool: &PgPool,
    organization_id: Uuid,
    user_id: Uuid,
) -> AppResult<Option<MemberRole>> {
    let role = sqlx::query_scalar::<_, MemberRole>(
        r#"
        SELECT role FROM organization_members
        WHERE organization_id = $1 AND user_id = $2
        "#
    )
    .bind(organization_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)?;

    Ok(role)
}

/// Check if user is member of organization
pub async fn is_organization_member(
    pool: &PgPool,
    organization_id: Uuid,
    user_id: Uuid,
) -> AppResult<bool> {
    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM organization_members
            WHERE organization_id = $1 AND user_id = $2
        )
        "#
    )
    .bind(organization_id)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(exists)
}

/// Delete an organization
pub async fn delete_organization(pool: &PgPool, organization_id: Uuid) -> AppResult<()> {
    let mut tx = pool.begin().await.map_err(AppError::from)?;

    // Delete all members
    sqlx::query("DELETE FROM organization_members WHERE organization_id = $1")
        .bind(organization_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::from)?;

    // Delete the organization
    sqlx::query("DELETE FROM organizations WHERE id = $1")
        .bind(organization_id)
        .execute(&mut *tx)
        .await
        .map_err(AppError::from)?;

    tx.commit().await.map_err(AppError::from)?;
    Ok(())
}

// ============================================================================
// Domain Queries
// ============================================================================

/// List domains for an organization
pub async fn list_organization_domains(
    pool: &PgPool,
    organization_id: Uuid,
) -> AppResult<Vec<Domain>> {
    sqlx::query_as::<_, Domain>(
        "SELECT * FROM domains WHERE organization_id = $1 ORDER BY created_at DESC"
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Find a domain by ID
pub async fn find_domain_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Domain>> {
    sqlx::query_as::<_, Domain>(
        "SELECT * FROM domains WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Create a new domain
pub async fn create_domain(
    pool: &PgPool,
    organization_id: Uuid,
    name: &str,
    normalized_name: &str,
) -> AppResult<Domain> {
    let domain = sqlx::query_as::<_, Domain>(
        r#"
        INSERT INTO domains (organization_id, name, normalized_name)
        VALUES ($1, $2, $3)
        RETURNING *
        "#
    )
    .bind(organization_id)
    .bind(name)
    .bind(normalized_name)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(domain)
}

/// Update a domain
pub async fn update_domain(
    pool: &PgPool,
    domain_id: Uuid,
    is_active: Option<bool>,
) -> AppResult<()> {
    if is_active.is_some() {
        sqlx::query(
            "UPDATE domains SET is_active = $1 WHERE id = $2"
        )
        .bind(is_active.unwrap())
        .bind(domain_id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;
    }

    Ok(())
}

/// Delete a domain
pub async fn delete_domain(pool: &PgPool, domain_id: Uuid) -> AppResult<()> {
    sqlx::query("DELETE FROM domains WHERE id = $1")
        .bind(domain_id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;

    Ok(())
}

// ============================================================================
// Monitor Queries
// ============================================================================

/// List monitors for a domain
pub async fn list_domain_monitors(pool: &PgPool, domain_id: Uuid) -> AppResult<Vec<Monitor>> {
    sqlx::query_as::<_, Monitor>(
        "SELECT * FROM monitors WHERE domain_id = $1"
    )
    .bind(domain_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Find a monitor by ID
pub async fn find_monitor_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<Monitor>> {
    sqlx::query_as::<_, Monitor>(
        "SELECT * FROM monitors WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Create or update a monitor
pub async fn upsert_monitor(
    pool: &PgPool,
    domain_id: Uuid,
    monitor_type: MonitorType,
    is_enabled: bool,
    config: &serde_json::Value,
) -> AppResult<Monitor> {
    let monitor = sqlx::query_as::<_, Monitor>(
        r#"
        INSERT INTO monitors (domain_id, type, is_enabled, config)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (domain_id, type)
        DO UPDATE SET is_enabled = $3, config = $4, updated_at = NOW()
        RETURNING *
        "#
    )
    .bind(domain_id)
    .bind(monitor_type)
    .bind(is_enabled)
    .bind(config)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(monitor)
}

/// Update monitor
pub async fn update_monitor(
    pool: &PgPool,
    monitor_id: Uuid,
    is_enabled: Option<bool>,
    config: Option<&serde_json::Value>,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE monitors
        SET is_enabled = COALESCE($1, is_enabled),
            config = COALESCE($2, config),
            updated_at = NOW()
        WHERE id = $3
        "#
    )
    .bind(is_enabled)
    .bind(config)
    .bind(monitor_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Delete a monitor
pub async fn delete_monitor(pool: &PgPool, monitor_id: Uuid) -> AppResult<()> {
    sqlx::query("DELETE FROM monitors WHERE id = $1")
        .bind(monitor_id)
        .execute(pool)
        .await
        .map_err(AppError::from)?;

    Ok(())
}

/// Get all active monitors with their domain information
pub async fn get_all_active_monitors(pool: &PgPool) -> AppResult<Vec<Monitor>> {
    sqlx::query_as::<_, Monitor>(
        r#"
        SELECT m.*, d.name as "domain_name?"
        FROM monitors m
        INNER JOIN domains d ON d.id = m.domain_id
        WHERE m.is_enabled = true AND d.is_active = true
        ORDER BY m.created_at ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// List all active monitors (without domain name)
pub async fn list_all_active_monitors(pool: &PgPool) -> AppResult<Vec<Monitor>> {
    sqlx::query_as::<_, Monitor>(
        r#"
        SELECT m.*
        FROM monitors m
        INNER JOIN domains d ON d.id = m.domain_id
        WHERE m.is_enabled = true AND d.is_active = true
        ORDER BY m.created_at ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

// ============================================================================
// Task Queries
// ============================================================================

/// Fetch pending tasks for execution
pub async fn fetch_pending_tasks(
    pool: &PgPool,
    limit: i64,
) -> AppResult<Vec<Task>> {
    sqlx::query_as::<_, Task>(
        r#"
        SELECT * FROM tasks
        WHERE status = 'pending' AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        "#
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Update task status to running
pub async fn update_task_status(
    pool: &PgPool,
    task_id: Uuid,
    status: TaskStatus,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE tasks
        SET status = $1,
            started_at = CASE WHEN $1 = 'running' THEN NOW() ELSE started_at END,
            completed_at = CASE WHEN $1 IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
        WHERE id = $2
        "#
    )
    .bind(status)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Complete a task with result
pub async fn complete_task(
    pool: &PgPool,
    task_id: Uuid,
    result: &serde_json::Value,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE tasks
        SET status = 'completed',
            completed_at = NOW(),
            result = $1
        WHERE id = $2
        "#
    )
    .bind(result)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Fail a task with error
pub async fn fail_task(
    pool: &PgPool,
    task_id: Uuid,
    error_message: &str,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE tasks
        SET status = 'failed',
            completed_at = NOW(),
            error_message = $1,
            attempt_count = attempt_count + 1
        WHERE id = $2
        "#
    )
    .bind(error_message)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Increment task attempt count and retry
pub async fn retry_task(
    pool: &PgPool,
    task_id: Uuid,
    retry_after_seconds: i64,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE tasks
        SET status = 'pending',
            attempt_count = attempt_count + 1,
            scheduled_at = NOW() + INTERVAL '1 second' * $1
        WHERE id = $2
        "#
    )
    .bind(retry_after_seconds)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Create a new task
pub async fn create_task(
    pool: &PgPool,
    monitor_id: Uuid,
    task_type: &str,
    scheduled_at: chrono::DateTime<chrono::Utc>,
) -> AppResult<Task> {
    let task = sqlx::query_as::<_, Task>(
        r#"
        INSERT INTO tasks (monitor_id, type, status, scheduled_at)
        VALUES ($1, $2, 'pending', $3)
        RETURNING *
        "#
    )
    .bind(monitor_id)
    .bind(task_type)
    .bind(scheduled_at)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(task)
}

// ============================================================================
// Snapshot Queries
// ============================================================================

/// Get latest DNS snapshot for a domain
pub async fn get_latest_dns_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
) -> AppResult<Option<DomainDnsSnapshot>> {
    sqlx::query_as::<_, DomainDnsSnapshot>(
        r#"
        SELECT * FROM domain_dns_snapshots
        WHERE domain_id = $1
        ORDER BY check_time DESC
        LIMIT 1
        "#
    )
    .bind(domain_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Save DNS snapshot
pub async fn save_dns_snapshot(
    pool: &PgPool,
    snapshot: &DomainDnsSnapshot,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO domain_dns_snapshots (
            domain_id, check_time, is_resolvable, a_records, aaaa_records,
            cname_records, nameservers, registrar, registry_expires_at,
            registry_status, has_changed_since_last, changes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#
    )
    .bind(snapshot.domain_id)
    .bind(snapshot.check_time)
    .bind(snapshot.is_resolvable)
    .bind(&snapshot.a_records)
    .bind(&snapshot.aaaa_records)
    .bind(&snapshot.cname_records)
    .bind(&snapshot.nameservers)
    .bind(&snapshot.registrar)
    .bind(snapshot.registry_expires_at)
    .bind(&snapshot.registry_status)
    .bind(snapshot.has_changed_since_last)
    .bind(&snapshot.changes)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Get latest SSL snapshot for a domain
pub async fn get_latest_ssl_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
) -> AppResult<Option<SslCertSnapshot>> {
    sqlx::query_as::<_, SslCertSnapshot>(
        r#"
        SELECT * FROM ssl_cert_snapshots
        WHERE domain_id = $1
        ORDER BY check_time DESC
        LIMIT 1
        "#
    )
    .bind(domain_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Save SSL snapshot
pub async fn save_ssl_snapshot(
    pool: &PgPool,
    snapshot: &SslCertSnapshot,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ssl_cert_snapshots (
            domain_id, check_time, is_valid, issuer, subject, sans,
            valid_from, valid_until, days_until_expiry, is_expiring_soon,
            is_expired, chain_is_valid, hostname_matches
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#
    )
    .bind(snapshot.domain_id)
    .bind(snapshot.check_time)
    .bind(snapshot.is_valid)
    .bind(&snapshot.issuer)
    .bind(&snapshot.subject)
    .bind(&snapshot.sans)
    .bind(snapshot.valid_from)
    .bind(snapshot.valid_until)
    .bind(snapshot.days_until_expiry)
    .bind(snapshot.is_expiring_soon)
    .bind(snapshot.is_expired)
    .bind(snapshot.chain_is_valid)
    .bind(snapshot.hostname_matches)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Create SSL certificate snapshot (helper for scheduler)
pub async fn create_ssl_cert_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
    issuer: &str,
    subject: &str,
    valid_from: chrono::DateTime<chrono::Utc>,
    valid_until: chrono::DateTime<chrono::Utc>,
    is_expired: bool,
    days_until_expiry: i64,
    is_self_signed: bool,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO ssl_cert_snapshots (
            domain_id, check_time, is_valid, issuer, subject,
            valid_from, valid_until, days_until_expiry, is_expired
        )
        VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)
        "#
    )
    .bind(domain_id)
    .bind(!is_expired)
    .bind(issuer)
    .bind(subject)
    .bind(valid_from)
    .bind(valid_until)
    .bind(days_until_expiry)
    .bind(is_expired)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Get uptime snapshots for a domain
pub async fn get_uptime_snapshots(
    pool: &PgPool,
    domain_id: Uuid,
    limit: i64,
) -> AppResult<Vec<UptimeSnapshot>> {
    sqlx::query_as::<_, UptimeSnapshot>(
        r#"
        SELECT * FROM uptime_snapshots
        WHERE domain_id = $1
        ORDER BY check_time DESC
        LIMIT $2
        "#
    )
    .bind(domain_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Save uptime snapshot
pub async fn save_uptime_snapshot(
    pool: &PgPool,
    snapshot: &UptimeSnapshot,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO uptime_snapshots (
            domain_id, check_time, status_code, response_time_ms,
            is_up, error_type, consecutive_failures
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#
    )
    .bind(snapshot.domain_id)
    .bind(snapshot.check_time)
    .bind(snapshot.status_code)
    .bind(snapshot.response_time_ms)
    .bind(snapshot.is_up)
    .bind(&snapshot.error_type)
    .bind(snapshot.consecutive_failures)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Create uptime snapshot (helper for scheduler)
pub async fn create_uptime_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
    is_up: bool,
    status_code: Option<i32>,
    response_time_ms: i32,
    error_message: Option<&str>,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO uptime_snapshots (
            domain_id, check_time, is_up, status_code, response_time_ms, error_type
        )
        VALUES ($1, NOW(), $2, $3, $4, $5)
        "#
    )
    .bind(domain_id)
    .bind(is_up)
    .bind(status_code)
    .bind(response_time_ms)
    .bind(error_message)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Get security header snapshot for a domain
pub async fn get_latest_security_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
) -> AppResult<Option<SecurityHeaderSnapshot>> {
    sqlx::query_as::<_, SecurityHeaderSnapshot>(
        r#"
        SELECT * FROM security_header_snapshots
        WHERE domain_id = $1
        ORDER BY check_time DESC
        LIMIT 1
        "#
    )
    .bind(domain_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Save security header snapshot
pub async fn save_security_snapshot(
    pool: &PgPool,
    snapshot: &SecurityHeaderSnapshot,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO security_header_snapshots (
            domain_id, check_time, has_https_redirect, has_csp, has_hsts,
            has_x_frame_options, has_x_content_type_options, csp_header, hsts_header, score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#
    )
    .bind(snapshot.domain_id)
    .bind(snapshot.check_time)
    .bind(snapshot.has_https_redirect)
    .bind(snapshot.has_csp)
    .bind(snapshot.has_hsts)
    .bind(snapshot.has_x_frame_options)
    .bind(snapshot.has_x_content_type_options)
    .bind(&snapshot.csp_header)
    .bind(&snapshot.hsts_header)
    .bind(snapshot.score)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

// ============================================================================
// Alert Queries
// ============================================================================

/// List alerts for an organization
pub async fn list_organization_alerts(
    pool: &PgPool,
    organization_id: Uuid,
    limit: i64,
) -> AppResult<Vec<Alert>> {
    sqlx::query_as::<_, Alert>(
        r#"
        SELECT * FROM alerts
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        "#
    )
    .bind(organization_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Create an alert
pub async fn create_alert(
    pool: &PgPool,
    organization_id: Uuid,
    domain_id: Uuid,
    alert_type: &str,
    severity: AlertSeverity,
    title: &str,
    description: Option<&str>,
    metadata: &serde_json::Value,
) -> AppResult<Alert> {
    let alert = sqlx::query_as::<_, Alert>(
        r#"
        INSERT INTO alerts (
            organization_id, domain_id, alert_type, severity, title, description, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#
    )
    .bind(organization_id)
    .bind(domain_id)
    .bind(alert_type)
    .bind(severity)
    .bind(title)
    .bind(description)
    .bind(metadata)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(alert)
}

/// Create a simple alert (helper function for scheduler)
pub async fn create_simple_alert(
    pool: &PgPool,
    domain_id: Uuid,
    title: &str,
    description: &str,
) -> AppResult<Alert> {
    // Get organization_id from domain
    let domain = find_domain_by_id(pool, domain_id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    create_alert(
        pool,
        domain.organization_id,
        domain_id,
        "monitoring",
        AlertSeverity::Warning,
        title,
        Some(description),
        &serde_json::json!({}),
    ).await
}

/// Update alert webhook status
pub async fn update_alert_webhook_status(
    pool: &PgPool,
    alert_id: Uuid,
    success: bool,
    status_code: Option<i32>,
) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE alerts
        SET webhook_sent_at = NOW(),
            webhook_success = $1,
            webhook_status_code = $2
        WHERE id = $3
        "#
    )
    .bind(success)
    .bind(status_code)
    .bind(alert_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

// ============================================================================
// Refresh Token Queries
// ============================================================================

/// Create a refresh token
pub async fn create_refresh_token(
    pool: &PgPool,
    user_id: Uuid,
    token_hash: &str,
    expires_at: chrono::DateTime<chrono::Utc>,
) -> AppResult<RefreshToken> {
    let token = sqlx::query_as::<_, RefreshToken>(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING *
        "#
    )
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)?;

    Ok(token)
}

/// Find a refresh token by hash
pub async fn find_refresh_token(pool: &PgPool, token_hash: &str) -> AppResult<Option<RefreshToken>> {
    sqlx::query_as::<_, RefreshToken>(
        r#"
        SELECT * FROM refresh_tokens
        WHERE token_hash = $1
        AND is_revoked = false
        AND expires_at > NOW()
        "#
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Revoke a refresh token
pub async fn revoke_refresh_token(pool: &PgPool, token_id: Uuid) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = NOW()
        WHERE id = $1
        "#
    )
    .bind(token_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Revoke all refresh tokens for a user
pub async fn revoke_all_user_tokens(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE refresh_tokens
        SET is_revoked = true, revoked_at = NOW()
        WHERE user_id = $1 AND is_revoked = false
        "#
    )
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

// ============================================================================
// Enhanced Monitoring Queries
// ============================================================================

/// Get latest uptime snapshot for a domain
pub async fn get_latest_uptime_snapshot(
    pool: &PgPool,
    domain_id: Uuid,
) -> AppResult<Option<UptimeSnapshot>> {
    sqlx::query_as::<_, UptimeSnapshot>(
        r#"
        SELECT * FROM uptime_snapshots
        WHERE domain_id = $1
        ORDER BY check_time DESC
        LIMIT 1
        "#
    )
    .bind(domain_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Get uptime history for a domain with time bucketing
/// Returns data points grouped by the specified interval
pub async fn get_uptime_history(
    pool: &PgPool,
    domain_id: Uuid,
    hours_back: i64,
    interval_minutes: i64,
) -> AppResult<Vec<UptimeSnapshot>> {
    sqlx::query_as::<_, UptimeSnapshot>(
        r#"
        WITH time_buckets AS (
            SELECT
                date_trunc('minute',
                    check_time - INTERVAL '1 minute' * (
                        EXTRACT(MINUTE FROM check_time)::int % $3
                    )
                ) as bucket_time,
                bool_and(is_up) as is_up,
                COALESCE(avg(response_time_ms)::int, 0) as avg_response_time_ms,
                max(status_code) as status_code,
                (array_agg(id ORDER BY check_time DESC))[1] as id,
                $1 as domain_id,
                max(check_time) as check_time,
                max(consecutive_failures) as consecutive_failures,
                (array_agg(error_type ORDER BY check_time DESC))[1] as error_type
            FROM uptime_snapshots
            WHERE domain_id = $1
              AND check_time >= NOW() - INTERVAL '1 hour' * $2
            GROUP BY bucket_time
            ORDER BY bucket_time DESC
        )
        SELECT
            id, domain_id, check_time, status_code,
            avg_response_time_ms as response_time_ms,
            is_up, error_type, consecutive_failures
        FROM time_buckets
        "#
    )
    .bind(domain_id)
    .bind(hours_back)
    .bind(interval_minutes)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Compute and save uptime aggregate statistics
pub async fn compute_uptime_aggregate(
    pool: &PgPool,
    domain_id: Uuid,
    period_start: chrono::DateTime<chrono::Utc>,
    period_end: chrono::DateTime<chrono::Utc>,
    period_type: &str,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO uptime_aggregates (
            domain_id, period_type, period_start, period_end,
            uptime_percentage, avg_response_time_ms,
            total_checks, successful_checks
        )
        SELECT
            $1 as domain_id,
            $2 as period_type,
            $3 as period_start,
            $4 as period_end,
            CASE
                WHEN COUNT(*) = 0 THEN 0
                ELSE (COUNT(*) FILTER (WHERE is_up = true)::float / COUNT(*)::float * 100)
            END as uptime_percentage,
            COALESCE(AVG(response_time_ms) FILTER (WHERE is_up = true), 0)::int as avg_response_time_ms,
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE is_up = true) as successful_checks
        FROM uptime_snapshots
        WHERE domain_id = $1
          AND check_time >= $3
          AND check_time < $4
        ON CONFLICT (domain_id, period_start, period_type)
        DO UPDATE SET
            period_end = EXCLUDED.period_end,
            uptime_percentage = EXCLUDED.uptime_percentage,
            avg_response_time_ms = EXCLUDED.avg_response_time_ms,
            total_checks = EXCLUDED.total_checks,
            successful_checks = EXCLUDED.successful_checks
        "#
    )
    .bind(domain_id)
    .bind(period_type)
    .bind(period_start)
    .bind(period_end)
    .execute(pool)
    .await
    .map_err(AppError::from)?;

    Ok(())
}

/// Get uptime aggregates for a domain
pub async fn get_uptime_aggregates(
    pool: &PgPool,
    domain_id: Uuid,
    period_type: &str,
    limit: i64,
) -> AppResult<Vec<UptimeAggregate>> {
    sqlx::query_as::<_, UptimeAggregate>(
        r#"
        SELECT * FROM uptime_aggregates
        WHERE domain_id = $1 AND period_type = $2
        ORDER BY period_start DESC
        LIMIT $3
        "#
    )
    .bind(domain_id)
    .bind(period_type)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Get latest uptime aggregate for a domain (typically used for dashboard)
pub async fn get_latest_uptime_aggregate(
    pool: &PgPool,
    domain_id: Uuid,
    period_type: &str,
) -> AppResult<Option<UptimeAggregate>> {
    sqlx::query_as::<_, UptimeAggregate>(
        r#"
        SELECT * FROM uptime_aggregates
        WHERE domain_id = $1 AND period_type = $2
        ORDER BY period_start DESC
        LIMIT 1
        "#
    )
    .bind(domain_id)
    .bind(period_type)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// List all active domains (for scheduler)
pub async fn list_all_active_domains(pool: &PgPool) -> AppResult<Vec<Domain>> {
    sqlx::query_as::<_, Domain>(
        "SELECT * FROM domains WHERE is_active = true ORDER BY created_at ASC"
    )
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

// ============================================================================
// Statistics & Analytics Queries
// ============================================================================

/// Get organization-level statistics
pub async fn get_organization_stats(
    pool: &PgPool,
    organization_id: Uuid,
) -> AppResult<OrganizationStats> {
    sqlx::query_as::<_, OrganizationStats>(
        r#"
        WITH domain_stats AS (
            SELECT
                d.id,
                d.is_active,
                us.is_up,
                ssl.is_valid,
                ssl.is_expired
            FROM domains d
            LEFT JOIN LATERAL (
                SELECT is_up
                FROM uptime_snapshots
                WHERE domain_id = d.id
                ORDER BY check_time DESC
                LIMIT 1
            ) us ON true
            LEFT JOIN LATERAL (
                SELECT is_valid, is_expired
                FROM ssl_cert_snapshots
                WHERE domain_id = d.id
                ORDER BY check_time DESC
                LIMIT 1
            ) ssl ON true
            WHERE d.organization_id = $1
        )
        SELECT
            COUNT(*)::bigint as total_domains,
            COUNT(*) FILTER (WHERE is_active = true)::bigint as active_domains,
            COUNT(*) FILTER (WHERE is_up = true AND is_active = true)::bigint as online_domains,
            COUNT(*) FILTER (WHERE is_valid = true AND is_expired = false)::bigint as ssl_valid_domains,
            (
                SELECT COUNT(*)::bigint
                FROM alerts
                WHERE organization_id = $1
                  AND severity = 'critical'
                  AND created_at > NOW() - INTERVAL '24 hours'
            ) as critical_alerts_24h,
            (
                SELECT AVG(uptime_percentage)::decimal(5,2)
                FROM uptime_aggregates ua
                INNER JOIN domains d ON d.id = ua.domain_id
                WHERE d.organization_id = $1
                  AND ua.period_type = 'week'
                  AND ua.period_start >= NOW() - INTERVAL '7 days'
            ) as avg_uptime_7d
        FROM domain_stats
        "#
    )
    .bind(organization_id)
    .fetch_one(pool)
    .await
    .map_err(AppError::from)
}

/// List domains with monitoring status (enhanced for domain list page)
pub async fn list_organization_domains_with_status(
    pool: &PgPool,
    organization_id: Uuid,
) -> AppResult<Vec<DomainWithStatus>> {
    sqlx::query_as::<_, DomainWithStatus>(
        r#"
        SELECT
            d.id,
            d.organization_id,
            d.name,
            COALESCE(d.url, d.normalized_name) as url,
            d.normalized_name,
            d.is_active,
            d.created_at,
            d.updated_at,
            us.is_up as uptime_is_up,
            us.response_time_ms as uptime_response_time_ms,
            us.status_code as uptime_status_code,
            us.consecutive_failures as uptime_consecutive_failures,
            ssl.is_valid as ssl_is_valid,
            ssl.days_until_expiry as ssl_days_until_expiry,
            ssl.is_expiring_soon as ssl_is_expiring_soon,
            ssl.is_expired as ssl_is_expired
        FROM domains d
        LEFT JOIN LATERAL (
            SELECT is_up, response_time_ms, status_code, consecutive_failures
            FROM uptime_snapshots
            WHERE domain_id = d.id
            ORDER BY check_time DESC
            LIMIT 1
        ) us ON true
        LEFT JOIN LATERAL (
            SELECT is_valid, days_until_expiry, is_expiring_soon, is_expired
            FROM ssl_cert_snapshots
            WHERE domain_id = d.id
            ORDER BY check_time DESC
            LIMIT 1
        ) ssl ON true
        WHERE d.organization_id = $1
        ORDER BY d.created_at DESC
        "#
    )
    .bind(organization_id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)
}

/// Get comprehensive domain statistics (for domain detail page)
pub async fn get_domain_statistics(
    pool: &PgPool,
    domain_id: Uuid,
) -> AppResult<Option<DomainStatistics>> {
    sqlx::query_as::<_, DomainStatistics>(
        r#"
        WITH latest_uptime AS (
            SELECT
                is_up,
                response_time_ms,
                status_code,
                check_time
            FROM uptime_snapshots
            WHERE domain_id = $1
            ORDER BY check_time DESC
            LIMIT 1
        ),
        latest_ssl AS (
            SELECT
                is_valid,
                days_until_expiry,
                is_expiring_soon,
                is_expired
            FROM ssl_cert_snapshots
            WHERE domain_id = $1
            ORDER BY check_time DESC
            LIMIT 1
        ),
        week_aggregate AS (
            SELECT
                uptime_percentage,
                avg_response_time_ms,
                successful_checks,
                total_checks
            FROM uptime_aggregates
            WHERE domain_id = $1
              AND period_type = 'week'
              AND period_start >= NOW() - INTERVAL '7 days'
            ORDER BY period_start DESC
            LIMIT 1
        )
        SELECT
            lu.is_up as latest_is_up,
            lu.response_time_ms as latest_response_time_ms,
            lu.status_code as latest_status_code,
            lu.check_time as latest_check_time,
            ls.is_valid as ssl_is_valid,
            ls.days_until_expiry as ssl_days_until_expiry,
            ls.is_expiring_soon as ssl_is_expiring_soon,
            ls.is_expired as ssl_is_expired,
            wa.uptime_percentage as uptime_7d,
            wa.avg_response_time_ms as avg_response_time_7d,
            wa.successful_checks as successful_checks_7d,
            wa.total_checks as total_checks_7d
        FROM latest_uptime lu
        FULL OUTER JOIN latest_ssl ls ON true
        FULL OUTER JOIN week_aggregate wa ON true
        "#
    )
    .bind(domain_id)
    .fetch_optional(pool)
    .await
    .map_err(AppError::from)
}

/// Get organization with domains for public status page
pub async fn find_organization_by_slug_with_domains(
    pool: &PgPool,
    slug: &str,
) -> AppResult<Option<OrganizationWithDomains>> {
    // Get organization
    let org = match find_organization_by_slug(pool, slug).await? {
        Some(o) => o,
        None => return Ok(None),
    };

    // Get domains with latest status
    let domains = sqlx::query_as::<_, PublicDomainStatus>(
        r#"
        SELECT
            d.id,
            d.name,
            COALESCE(d.url, d.normalized_name) as url,
            d.is_active,
            us.is_up,
            us.response_time_ms,
            us.check_time as last_check_time,
            (
                SELECT AVG(uptime_percentage)::decimal(5,2)
                FROM uptime_aggregates
                WHERE domain_id = d.id
                  AND period_type = 'day'
                  AND period_start >= NOW() - INTERVAL '7 days'
            ) as uptime_7d,
            (
                SELECT AVG(uptime_percentage)::decimal(5,2)
                FROM uptime_aggregates
                WHERE domain_id = d.id
                  AND period_type = 'day'
                  AND period_start >= NOW() - INTERVAL '30 days'
            ) as uptime_30d
        FROM domains d
        LEFT JOIN LATERAL (
            SELECT is_up, response_time_ms, check_time
            FROM uptime_snapshots
            WHERE domain_id = d.id
            ORDER BY check_time DESC
            LIMIT 1
        ) us ON true
        WHERE d.organization_id = $1 AND d.is_active = true
        ORDER BY d.name
        "#
    )
    .bind(org.id)
    .fetch_all(pool)
    .await
    .map_err(AppError::from)?;

    Ok(Some(OrganizationWithDomains {
        organization: org,
        domains,
    }))
}
