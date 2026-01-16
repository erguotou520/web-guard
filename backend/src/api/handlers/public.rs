use axum::{
    extract::{Path, State},
    response::{IntoResponse, Json},
};
use serde_json::json;
use utoipa::ToSchema;

use crate::api::routes::AppState;
use crate::db::queries;
use crate::db::models::OrganizationWithDomains;
use crate::error::{AppError, AppResult};

// Response types
#[derive(serde::Serialize, ToSchema)]
pub struct PublicStatusResponse {
    pub data: OrganizationWithDomains,
}

/// Get public monitoring status page by organization slug
/// This endpoint is publicly accessible without authentication
#[utoipa::path(
    get,
    path = "/api/public/status/{org_slug}",
    tag = "公开",
    params(
        ("org_slug" = String, Path, description = "组织slug（URL友好标识符）")
    ),
    responses(
        (status = 200, description = "获取成功", body = PublicStatusResponse),
        (status = 404, description = "组织不存在")
    )
)]
pub async fn get_public_status(
    State(state): State<AppState>,
    Path(org_slug): Path<String>,
) -> AppResult<impl IntoResponse> {
    // Find organization by slug and get all domains with status
    let org_with_domains = queries::find_organization_by_slug_with_domains(&state.pool, &org_slug).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    let response = json!({
        "data": org_with_domains
    });

    Ok(Json(response))
}
