use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Json},
    Json as JsonPayload,
};
use serde_json::json;
use uuid::Uuid;

use crate::api::routes::AppState;
use crate::db::queries;
use crate::error::{AppError, AppResult};
use crate::auth::AuthExtractor;
use validator::Validate;

/// List domains for an organization
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

    let domains = queries::list_organization_domains(&state.pool, org_id).await?;

    let response = json!({
        "data": domains
    });

    Ok(Json(response))
}

/// Create a new domain
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

    // Normalize domain name
    let normalized_name = payload.name.to_lowercase();

    // Create domain
    let domain = queries::create_domain(&state.pool, org_id, &payload.name, &normalized_name).await?;

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

/// Query parameters for domain endpoints
#[derive(serde::Deserialize)]
pub struct DomainQueryParams {
    pub org_id: Option<Uuid>,
}

// Request types
#[derive(serde::Deserialize, Validate)]
pub struct CreateDomainRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
}

#[derive(serde::Deserialize)]
pub struct UpdateDomainRequest {
    pub is_active: Option<bool>,
}
