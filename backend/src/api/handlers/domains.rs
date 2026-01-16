use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    Json as JsonPayload,
};
use serde_json::json;
use uuid::Uuid;
use utoipa::ToSchema;

use crate::api::routes::AppState;
use crate::db::queries;
use crate::db::models::{Domain, DomainWithStatus, DomainStatistics};
use crate::error::{AppError, AppResult};
use crate::auth::AuthExtractor;
use validator::Validate;

/// Query parameters for domain endpoints
#[derive(serde::Deserialize, ToSchema)]
pub struct DomainQueryParams {
    pub org_id: Option<Uuid>,
}

// Request types
#[derive(serde::Deserialize, Validate, ToSchema)]
pub struct CreateDomainRequest {
    /// Display name (user-friendly name for the domain)
    #[validate(length(min = 1, max = 255))]
    pub display_name: String,
    /// URL (actual domain address like https://example.com)
    #[validate(length(min = 1, max = 2048))]
    pub url: String,
}

#[derive(serde::Deserialize, ToSchema)]
pub struct UpdateDomainRequest {
    pub is_active: Option<bool>,
}

// Response types
#[derive(serde::Serialize, ToSchema)]
pub struct DomainResponse {
    pub data: Domain,
}

#[derive(serde::Serialize, ToSchema)]
pub struct DomainsResponse {
    pub data: Vec<Domain>,
}

#[derive(serde::Serialize, ToSchema)]
pub struct DomainsWithStatusResponse {
    pub data: Vec<DomainWithStatus>,
}

#[derive(serde::Serialize, ToSchema)]
pub struct DomainStatisticsResponse {
    pub data: DomainStatistics,
}

#[derive(serde::Serialize, ToSchema)]
pub struct DomainCreateResponse {
    pub data: Domain,
    pub monitors_created: Vec<String>,
}

/// List domains for an organization
#[utoipa::path(
    get,
    path = "/api/domains",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("org_id" = Option<Uuid>, Query, description = "组织ID（可选，默认使用用户的默认组织）")
    ),
    responses(
        (status = 200, description = "获取成功", body = DomainsWithStatusResponse),
        (status = 401, description = "未授权"),
        (status = 403, description = "不是组织成员")
    )
)]
pub async fn list_domains(
    State(state): State<AppState>,
    Query(params): Query<DomainQueryParams>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Use current org from auth context if not provided
    let org_id = match params.org_id {
        Some(id) => id,
        None => {
            // Try to get user's default organization
            let orgs = queries::list_user_organizations(&state.pool, auth.0.user_id).await
                .unwrap_or_default();
            orgs.first().map(|org| org.id).unwrap_or_else(Uuid::new_v4)
        }
    };

    // Check if user is a member
    let is_member = queries::is_organization_member(&state.pool, org_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("You are not a member of this organization"));
    }

    // Use enhanced query with monitoring status
    let domains = queries::list_organization_domains_with_status(&state.pool, org_id).await?;

    let response = json!({
        "data": domains
    });

    Ok(Json(response))
}

/// Create a new domain
#[utoipa::path(
    post,
    path = "/api/domains",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("org_id" = Option<Uuid>, Query, description = "组织ID（可选，默认使用用户的默认组织）")
    ),
    request_body = CreateDomainRequest,
    responses(
        (status = 201, description = "创建成功，自动创建 SSL 和 Uptime 监控器"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "无权限创建域名")
    )
)]
pub async fn create_domain(
    State(state): State<AppState>,
    Query(params): Query<DomainQueryParams>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<CreateDomainRequest>,
) -> AppResult<impl IntoResponse> {
    // Validate input
    payload.validate()
        .map_err(|e| AppError::validation(format!("Invalid input: {}", e)))?;

    // Use current org from auth context if not provided
    let org_id = match params.org_id {
        Some(id) => id,
        None => {
            // Try to get user's default organization
            let orgs = queries::list_user_organizations(&state.pool, auth.0.user_id).await
                .unwrap_or_default();
            orgs.first().map(|org| org.id).unwrap_or_else(Uuid::new_v4)
        }
    };

    // Check if user can write (not just viewer)
    let role = queries::get_user_role(&state.pool, org_id, auth.0.user_id).await?
        .ok_or_else(|| AppError::authorization("Organization not found"))?;

    if !role.can_write() {
        return Err(AppError::authorization("Viewers cannot create domains"));
    }

    // Normalize URL (remove trailing slashes)
    let url = payload.url.trim_end_matches('/').to_string();
    let normalized_name = url.to_lowercase();

    // Create domain with display_name and url
    // Note: We still pass name and normalized_name to the old create_domain function
    // After migration, the migration script will move these to display_name and url
    let domain = queries::create_domain(&state.pool, org_id, &payload.display_name, &normalized_name).await?;

    // Auto-create monitors for the new domain
    let ssl_config = json!({});
    let uptime_config = json!({});

    let _ = queries::upsert_monitor(
        &state.pool,
        domain.id,
        crate::db::models::MonitorType::SslCert,
        true,  // is_enabled
        &ssl_config,
    ).await;

    let _ = queries::upsert_monitor(
        &state.pool,
        domain.id,
        crate::db::models::MonitorType::Uptime,
        true,  // is_enabled
        &uptime_config,
    ).await;

    let response = json!({
        "data": domain,
        "monitors_created": ["ssl", "uptime"]
    });

    Ok((StatusCode::CREATED, Json(response)))
}

/// Get domain by ID
#[utoipa::path(
    get,
    path = "/api/domains/{id}",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 200, description = "获取成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "不是组织成员"),
        (status = 404, description = "域名不存在")
    )
)]
pub async fn get_domain(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    let domain = queries::find_domain_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is a member of the domain's organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("You are not a member of this organization"));
    }

    let response = json!({
        "data": domain
    });

    Ok(Json(response))
}

/// Update domain
#[utoipa::path(
    put,
    path = "/api/domains/{id}",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    request_body = UpdateDomainRequest,
    responses(
        (status = 200, description = "更新成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "无权限更新域名"),
        (status = 404, description = "域名不存在")
    )
)]
pub async fn update_domain(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<UpdateDomainRequest>,
) -> AppResult<impl IntoResponse> {
    let domain = queries::find_domain_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user can write
    let role = queries::get_user_role(&state.pool, domain.organization_id, auth.0.user_id).await?
        .ok_or_else(|| AppError::authorization("Organization not found"))?;

    if !role.can_write() {
        return Err(AppError::authorization("Viewers cannot update domains"));
    }

    // Update domain
    if let Some(is_active) = payload.is_active {
        queries::update_domain(&state.pool, id, Some(is_active)).await?;
    }

    // Fetch updated domain
    let domain = queries::find_domain_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    let response = json!({
        "data": domain
    });

    Ok(Json(response))
}

/// Delete domain
#[utoipa::path(
    delete,
    path = "/api/domains/{id}",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 204, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 403, description = "无权限删除域名"),
        (status = 404, description = "域名不存在")
    )
)]
pub async fn delete_domain(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    let domain = queries::find_domain_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is admin or owner
    let role = queries::get_user_role(&state.pool, domain.organization_id, auth.0.user_id).await?
        .ok_or_else(|| AppError::authorization("Organization not found"))?;

    if !role.is_admin() {
        return Err(AppError::authorization("Only admins can delete domains"));
    }

    queries::delete_domain(&state.pool, id).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get domain statistics (comprehensive monitoring data)
#[utoipa::path(
    get,
    path = "/api/domains/{id}/statistics",
    tag = "域名",
    security(("BearerAuth" = [])),
    params(
        ("id" = Uuid, Path, description = "域名ID")
    ),
    responses(
        (status = 200, description = "获取成功", body = DomainStatisticsResponse),
        (status = 401, description = "未授权"),
        (status = 403, description = "不是组织成员"),
        (status = 404, description = "域名不存在")
    )
)]
pub async fn get_domain_statistics(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    let domain = queries::find_domain_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Domain not found"))?;

    // Check if user is a member of the domain's organization
    let is_member = queries::is_organization_member(&state.pool, domain.organization_id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("You are not a member of this organization"));
    }

    // Get comprehensive statistics
    let stats = queries::get_domain_statistics(&state.pool, id).await?;

    let response = json!({
        "data": stats
    });

    Ok(Json(response))
}
