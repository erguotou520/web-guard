use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Json as JsonPayload,
};
use uuid::Uuid;

use crate::api::routes::AppState;
use crate::db::models::{OrganizationMember, MemberRole};
use crate::db::queries;
use crate::error::{AppError, AppResult};
use crate::auth::AuthExtractor;

/// Create a new organization
pub async fn create_organization(
    State(state): State<AppState>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<CreateOrganizationRequest>,
) -> AppResult<impl IntoResponse> {
    // Generate slug if not provided
    let slug = payload.slug.unwrap_or_else(|| {
        payload.name.to_lowercase()
            .replace(|c: char| !c.is_alphanumeric() && !c.is_whitespace(), "-")
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-')
            .collect()
    });

    // Create organization with the user as owner
    let org = queries::create_organization(&state.pool, &payload.name, &slug, auth.0.user_id).await?;

    let response = serde_json::json!({
        "data": org
    });

    Ok((StatusCode::CREATED, Json(response)))
}

/// List user's organizations
pub async fn list_organizations(
    State(state): State<AppState>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    let orgs = queries::list_user_organizations(&state.pool, auth.0.user_id).await?;

    let response = serde_json::json!({
        "data": orgs
    });

    Ok(Json(response))
}

/// Get organization by ID
pub async fn get_organization(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Check if user is a member of this organization
    let is_member = queries::is_organization_member(&state.pool, id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("You are not a member of this organization"));
    }

    let org = queries::find_organization_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    let response = serde_json::json!({
        "data": org
    });

    Ok(Json(response))
}

/// Update organization
pub async fn update_organization(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<UpdateOrganizationRequest>,
) -> AppResult<impl IntoResponse> {
    // Check if user is admin or owner
    let role = queries::get_user_role(&state.pool, id, auth.0.user_id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    if !role.is_admin() {
        return Err(AppError::authorization("Only admins can update organization"));
    }

    // Update fields
    if let Some(name) = &payload.name {
        sqlx::query("UPDATE organizations SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(id)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::internal(format!("Failed to update organization: {}", e)))?;
    }

    if let Some(webhook_url) = &payload.webhook_url {
        sqlx::query("UPDATE organizations SET webhook_url = $1 WHERE id = $2")
            .bind(webhook_url)
            .bind(id)
            .execute(&state.pool)
            .await
            .map_err(|e| AppError::internal(format!("Failed to update organization: {}", e)))?;
    }

    // Fetch updated organization
    let org = queries::find_organization_by_id(&state.pool, id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    let response = serde_json::json!({
        "data": org
    });

    Ok(Json(response))
}

/// Delete organization
pub async fn delete_organization(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Check if user is owner
    let role = queries::get_user_role(&state.pool, id, auth.0.user_id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    if role != MemberRole::Owner {
        return Err(AppError::authorization("Only owners can delete organization"));
    }

    queries::delete_organization(&state.pool, id).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// List organization members
pub async fn list_members(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Check if user is a member
    let is_member = queries::is_organization_member(&state.pool, id, auth.0.user_id).await?;
    if !is_member {
        return Err(AppError::authorization("You are not a member of this organization"));
    }

    let members = sqlx::query_as::<_, OrganizationMember>(
        r#"
        SELECT om.*, u.email, u.full_name
        FROM organization_members om
        INNER JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = $1
        ORDER BY om.created_at ASC
        "#
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| AppError::internal(format!("Failed to fetch members: {}", e)))?;

    let response = serde_json::json!({
        "data": members
    });

    Ok(Json(response))
}

/// Add member to organization
pub async fn add_member(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<AddMemberRequest>,
) -> AppResult<impl IntoResponse> {
    // Check if user is admin or owner
    let role = queries::get_user_role(&state.pool, id, auth.0.user_id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    if !role.is_admin() {
        return Err(AppError::authorization("Only admins can add members"));
    }

    // Find user by email
    let user = queries::find_user_by_email(&state.pool, &payload.email).await?
        .ok_or_else(|| AppError::validation("User not found"))?;

    // Check if user is already a member
    let is_member = queries::is_organization_member(&state.pool, id, user.id).await?;
    if is_member {
        return Err(AppError::validation("User is already a member"));
    }

    // Add member
    sqlx::query(
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)"
    )
    .bind(id)
    .bind(user.id)
    .bind(&payload.role.to_string())
    .execute(&state.pool)
    .await
    .map_err(|e| AppError::internal(format!("Failed to add member: {}", e)))?;

    // Fetch and return the new member
    let member = sqlx::query_as::<_, OrganizationMember>(
        r#"
        SELECT om.*, u.email, u.full_name
        FROM organization_members om
        INNER JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = $1 AND om.user_id = $2
        "#
    )
    .bind(id)
    .bind(user.id)
    .fetch_one(&state.pool)
    .await
    .map_err(|e| AppError::internal(format!("Failed to fetch member: {}", e)))?;

    let response = serde_json::json!({
        "data": member
    });

    Ok((StatusCode::CREATED, Json(response)))
}

/// Remove member from organization
pub async fn remove_member(
    State(state): State<AppState>,
    Path((id, user_id)): Path<(Uuid, Uuid)>,
    auth: AuthExtractor,
) -> AppResult<impl IntoResponse> {
    // Check if user is admin or owner
    let role = queries::get_user_role(&state.pool, id, auth.0.user_id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    if !role.is_admin() {
        return Err(AppError::authorization("Only admins can remove members"));
    }

    // Cannot remove the owner
    let target_role = queries::get_user_role(&state.pool, id, user_id).await?
        .ok_or_else(|| AppError::not_found("Member not found"))?;

    if target_role == MemberRole::Owner {
        return Err(AppError::validation("Cannot remove organization owner"));
    }

    // Remove member
    sqlx::query("DELETE FROM organization_members WHERE organization_id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::internal(format!("Failed to remove member: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

/// Update member role
pub async fn update_member_role(
    State(state): State<AppState>,
    Path((id, user_id)): Path<(Uuid, Uuid)>,
    auth: AuthExtractor,
    JsonPayload(payload): JsonPayload<UpdateMemberRoleRequest>,
) -> AppResult<impl IntoResponse> {
    // Check if user is owner (only owner can change roles)
    let role = queries::get_user_role(&state.pool, id, auth.0.user_id).await?
        .ok_or_else(|| AppError::not_found("Organization not found"))?;

    if role != MemberRole::Owner {
        return Err(AppError::authorization("Only owners can change member roles"));
    }

    // Cannot change owner role
    let target_role = queries::get_user_role(&state.pool, id, user_id).await?
        .ok_or_else(|| AppError::not_found("Member not found"))?;

    if target_role == MemberRole::Owner {
        return Err(AppError::validation("Cannot change owner role"));
    }

    // Update role
    sqlx::query("UPDATE organization_members SET role = $1 WHERE organization_id = $2 AND user_id = $3")
        .bind(&payload.role.to_string())
        .bind(id)
        .bind(user_id)
        .execute(&state.pool)
        .await
        .map_err(|e| AppError::internal(format!("Failed to update member role: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

// Request types
#[derive(serde::Deserialize)]
pub struct CreateOrganizationRequest {
    pub name: String,
    pub slug: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct UpdateOrganizationRequest {
    pub name: Option<String>,
    pub webhook_url: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct AddMemberRequest {
    pub email: String,
    pub role: MemberRole,
}

#[derive(serde::Deserialize)]
pub struct UpdateMemberRoleRequest {
    pub role: MemberRole,
}
