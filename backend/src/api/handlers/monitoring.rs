use axum::{
    extract::{Path, Query, State},
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{
    api::routes::AppState,
    auth::AuthExtractor,
    db::{models::*, queries},
    error::{AppError, AppResult},
    monitors::{uptime, ssl},
};

// ============================================================================
// Request/Response Models
// ============================================================================

#[derive(Debug, Deserialize, IntoParams, ToSchema)]
pub struct HistoryQuery {
    #[serde(default = "default_hours")]
    pub hours: i64,
    #[serde(default = "default_interval_minutes")]
    pub interval_minutes: i64,
}

fn default_hours() -> i64 {
    24
}

fn default_interval_minutes() -> i64 {
    30
}

#[derive(Debug, Deserialize, IntoParams, ToSchema)]
pub struct AggregateQuery {
    #[serde(default = "default_period")]
    pub period: String,
}

fn default_period() -> String {
    "week".to_string()
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UptimeStatusResponse {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: chrono::DateTime<chrono::Utc>,
    pub is_up: bool,
    pub status_code: Option<i32>,
    pub response_time_ms: Option<i32>,
    pub consecutive_failures: i32,
    pub error_type: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SslStatusResponse {
    pub id: Uuid,
    pub domain_id: Uuid,
    pub check_time: chrono::DateTime<chrono::Utc>,
    pub is_valid: bool,
    pub issuer: Option<String>,
    pub subject: Option<String>,
    pub sans: Vec<String>,
    pub valid_from: Option<chrono::DateTime<chrono::Utc>>,
    pub valid_until: Option<chrono::DateTime<chrono::Utc>>,
    pub days_until_expiry: Option<i32>,
    pub is_expiring_soon: bool,
    pub is_expired: bool,
    pub chain_is_valid: bool,
    pub hostname_matches: bool,
}

// ============================================================================
// Handlers
// ============================================================================

#[utoipa::path(
    get,
    path = "/api/domains/{id}/monitoring/uptime/latest",
    tag = "监控",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 200, description = "获取最新可用性状态成功", body = UptimeStatusResponse),
        (status = 404, description = "域名不存在或无监控数据"),
        (status = 403, description = "无权访问该域名"),
    )
)]
/// GET /api/domains/{id}/monitoring/uptime/latest
/// Get the latest uptime status for a domain
pub async fn get_latest_uptime(
    State(state): State<AppState>,
    Path(domain_id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Verify domain exists and user has access
    let domain = queries::find_domain_by_id(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is member of the organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("Not a member of this organization"));
    }

    // Get latest uptime snapshot
    let snapshot = queries::get_latest_uptime_snapshot(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("No uptime data available"))?;

    let response = UptimeStatusResponse {
        id: snapshot.id,
        domain_id: snapshot.domain_id,
        check_time: snapshot.check_time,
        is_up: snapshot.is_up,
        status_code: snapshot.status_code,
        response_time_ms: snapshot.response_time_ms,
        consecutive_failures: snapshot.consecutive_failures,
        error_type: snapshot.error_type,
    };

    Ok(Json(json!({ "data": response })))
}

#[utoipa::path(
    get,
    path = "/api/domains/{id}/monitoring/ssl/latest",
    tag = "监控",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 200, description = "获取最新SSL状态成功", body = SslStatusResponse),
        (status = 404, description = "域名不存在或无SSL数据"),
        (status = 403, description = "无权访问该域名"),
    )
)]
/// GET /api/domains/{id}/monitoring/ssl/latest
/// Get the latest SSL certificate status for a domain
pub async fn get_latest_ssl(
    State(state): State<AppState>,
    Path(domain_id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Verify domain exists and user has access
    let domain = queries::find_domain_by_id(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is member of the organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("Not a member of this organization"));
    }

    // Get latest SSL snapshot
    let snapshot = queries::get_latest_ssl_snapshot(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("No SSL data available"))?;

    let response = SslStatusResponse {
        id: snapshot.id,
        domain_id: snapshot.domain_id,
        check_time: snapshot.check_time,
        is_valid: snapshot.is_valid,
        issuer: snapshot.issuer,
        subject: snapshot.subject,
        sans: snapshot.sans,
        valid_from: snapshot.valid_from,
        valid_until: snapshot.valid_until,
        days_until_expiry: snapshot.days_until_expiry,
        is_expiring_soon: snapshot.is_expiring_soon,
        is_expired: snapshot.is_expired,
        chain_is_valid: snapshot.chain_is_valid,
        hostname_matches: snapshot.hostname_matches,
    };

    Ok(Json(json!({ "data": response })))
}

#[utoipa::path(
    get,
    path = "/api/domains/{id}/monitoring/uptime/history",
    tag = "监控",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID"),
        HistoryQuery
    ),
    responses(
        (status = 200, description = "获取历史可用性数据成功"),
        (status = 404, description = "域名不存在"),
        (status = 403, description = "无权访问该域名"),
    )
)]
/// GET /api/domains/{id}/monitoring/uptime/history
/// Get historical uptime data with time bucketing
pub async fn get_uptime_history(
    State(state): State<AppState>,
    Path(domain_id): Path<Uuid>,
    Query(query): Query<HistoryQuery>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Verify domain exists and user has access
    let domain = queries::find_domain_by_id(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is member of the organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("Not a member of this organization"));
    }

    // Get historical data
    let snapshots = queries::get_uptime_history(
        &state.pool,
        domain_id,
        query.hours,
        query.interval_minutes,
    )
    .await?;

    let response: Vec<UptimeStatusResponse> = snapshots
        .into_iter()
        .map(|s| UptimeStatusResponse {
            id: s.id,
            domain_id: s.domain_id,
            check_time: s.check_time,
            is_up: s.is_up,
            status_code: s.status_code,
            response_time_ms: s.response_time_ms,
            consecutive_failures: s.consecutive_failures,
            error_type: s.error_type,
        })
        .collect();

    Ok(Json(json!({ "data": response })))
}

#[utoipa::path(
    get,
    path = "/api/domains/{id}/monitoring/uptime/aggregate",
    tag = "监控",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID"),
        AggregateQuery
    ),
    responses(
        (status = 200, description = "获取聚合统计数据成功"),
        (status = 404, description = "域名不存在"),
        (status = 403, description = "无权访问该域名"),
    )
)]
/// GET /api/domains/{id}/monitoring/uptime/aggregate
/// Get aggregated uptime statistics
pub async fn get_uptime_aggregate(
    State(state): State<AppState>,
    Path(domain_id): Path<Uuid>,
    Query(query): Query<AggregateQuery>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Verify domain exists and user has access
    let domain = queries::find_domain_by_id(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is member of the organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("Not a member of this organization"));
    }

    // Get the aggregate
    let aggregate = queries::get_latest_uptime_aggregate(&state.pool, domain_id, &query.period).await?;

    Ok(Json(json!({ "data": aggregate })))
}

#[utoipa::path(
    post,
    path = "/api/domains/{id}/monitoring/check",
    tag = "监控",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 200, description = "手动触发监控检查成功"),
        (status = 404, description = "域名不存在"),
        (status = 403, description = "无权访问该域名"),
    )
)]
/// POST /api/domains/{id}/monitoring/check
/// Manually trigger a monitoring check
pub async fn trigger_check(
    State(state): State<AppState>,
    Path(domain_id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Verify domain exists and user has access
    let domain = queries::find_domain_by_id(&state.pool, domain_id)
        .await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is member of the organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("Not a member of this organization"));
    }

    // Trigger uptime check
    let uptime_result = match uptime::check_uptime(&domain.normalized_name, None).await {
        Ok(result) => {
            // Save the snapshot
            let snapshot = UptimeSnapshot {
                id: Uuid::new_v4(),
                domain_id,
                check_time: chrono::Utc::now(),
                status_code: result.status_code.map(|c| c as i32),
                response_time_ms: Some(result.response_time_ms as i32),
                is_up: result.is_up,
                error_type: result.error_message,
                consecutive_failures: 0,
            };
            queries::save_uptime_snapshot(&state.pool, &snapshot).await?;
            json!({
                "success": true,
                "is_up": result.is_up,
                "response_time_ms": result.response_time_ms,
                "status_code": result.status_code
            })
        }
        Err(e) => {
            json!({
                "success": false,
                "error": e.to_string()
            })
        }
    };

    // Trigger SSL check
    let ssl_result = match ssl::check_ssl_certificate(&domain.normalized_name).await {
        Ok(cert_info) => {
            // Save the snapshot
            let snapshot = SslCertSnapshot {
                id: Uuid::new_v4(),
                domain_id,
                check_time: chrono::Utc::now(),
                is_valid: cert_info.is_valid,
                issuer: Some(cert_info.issuer),
                subject: Some(cert_info.subject),
                sans: vec![], // TODO: Extract SANs from cert_info
                valid_from: Some(cert_info.valid_from),
                valid_until: Some(cert_info.valid_until),
                days_until_expiry: Some(cert_info.days_until_expiry as i32),
                is_expiring_soon: cert_info.days_until_expiry <= 30,
                is_expired: cert_info.is_expired,
                chain_is_valid: !cert_info.is_self_signed,
                hostname_matches: true, // TODO: Implement hostname matching
            };
            queries::save_ssl_snapshot(&state.pool, &snapshot).await?;
            json!({
                "success": true,
                "is_valid": cert_info.is_valid,
                "days_until_expiry": cert_info.days_until_expiry
            })
        }
        Err(e) => {
            json!({
                "success": false,
                "error": e.to_string()
            })
        }
    };

    Ok(Json(json!({
        "data": {
            "uptime": uptime_result,
            "ssl": ssl_result
        }
    })))
}
