use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde_json::json;
use uuid::Uuid;
use chrono::{Utc, Duration as ChronoDuration};
use sha2::{Sha256, Digest};
use utoipa::ToSchema;

use crate::api::routes::AppState;
use crate::db::queries;
use crate::auth::{hash_password, verify_password};
use crate::AppError;

/// Helper function to compute SHA-256 hash
fn sha256_hash(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Request/response types for auth endpoints
#[derive(serde::Deserialize, ToSchema)]
pub struct RegisterRequestJson {
    pub email: String,
    pub password: String,
    pub full_name: Option<String>,
}

#[derive(serde::Deserialize, ToSchema)]
pub struct LoginRequestJson {
    pub email: String,
    pub password: String,
}

#[derive(serde::Deserialize, ToSchema)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(serde::Serialize, ToSchema)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserResponse,
}

#[derive(serde::Serialize, ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: Option<String>,
    pub created_at: String,
    pub last_login_at: Option<String>,
}

impl From<crate::db::models::User> for UserResponse {
    fn from(user: crate::db::models::User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at.to_rfc3339(),
            last_login_at: user.last_login_at.map(|t| t.to_rfc3339()),
        }
    }
}

/// Register a new user
#[utoipa::path(
    post,
    path = "/api/auth/register",
    tag = "认证",
    request_body = RegisterRequestJson,
    responses(
        (status = 201, description = "注册成功", body = AuthResponse),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse)
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequestJson>,
) -> Result<impl IntoResponse, AppError> {
    // Check if user already exists
    let existing_user = queries::find_user_by_email(&state.pool, &payload.email).await?;
    if existing_user.is_some() {
        return Err(AppError::validation("User with this email already exists"));
    }

    // Hash password
    let password_hash = hash_password(&payload.password, state.config.auth.bcrypt_rounds)?;

    // Create user
    let user = queries::create_user(
        &state.pool,
        &payload.email,
        &password_hash,
        payload.full_name.as_deref(),
    ).await?;

    // Generate tokens
    let access_token = state.jwt_service.generate_access_token(user.id, None, "user")?;
    let refresh_token = state.jwt_service.generate_refresh_token(user.id)?;

    // Hash refresh token and store
    let token_hash = sha256_hash(&refresh_token);
    let expires_at = Utc::now() + ChronoDuration::from_std(state.config.auth.refresh_token_duration)
        .map_err(|e| AppError::internal(format!("Invalid duration: {}", e)))?;
    queries::create_refresh_token(&state.pool, user.id, &token_hash, expires_at).await?;

    let response = AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse::from(user),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Login
#[utoipa::path(
    post,
    path = "/api/auth/login",
    tag = "认证",
    request_body = LoginRequestJson,
    responses(
        (status = 200, description = "登录成功", body = AuthResponse),
        (status = 401, description = "认证失败", body = crate::error::ErrorResponse)
    )
)]
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequestJson>,
) -> Result<impl IntoResponse, AppError> {
    // Find user
    let user = queries::find_user_by_email(&state.pool, &payload.email).await?
        .ok_or_else(|| AppError::auth("Invalid email or password"))?;

    // Verify password
    let is_valid = verify_password(&payload.password, &user.password_hash)?;
    if !is_valid {
        return Err(AppError::auth("Invalid email or password"));
    }

    // Update last login
    let _ = queries::update_last_login(&state.pool, user.id).await;

    // Get user's default organization (first one)
    let orgs = queries::list_user_organizations(&state.pool, user.id).await?;
    let org_id = orgs.first().map(|org| org.id);

    // Generate tokens
    let access_token = state.jwt_service.generate_access_token(
        user.id,
        org_id,
        "user",
    )?;
    let refresh_token = state.jwt_service.generate_refresh_token(user.id)?;

    // Hash refresh token and store
    let token_hash = sha256_hash(&refresh_token);
    let expires_at = Utc::now() + ChronoDuration::from_std(state.config.auth.refresh_token_duration)
        .map_err(|e| AppError::internal(format!("Invalid duration: {}", e)))?;
    queries::create_refresh_token(&state.pool, user.id, &token_hash, expires_at).await?;

    let response = AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse::from(user),
    };

    Ok(Json(response))
}

/// Refresh access token
#[utoipa::path(
    post,
    path = "/api/auth/refresh",
    tag = "认证",
    request_body = RefreshTokenRequest,
    responses(
        (status = 200, description = "刷新成功", body = AuthResponse),
        (status = 401, description = "刷新令牌无效或已过期", body = crate::error::ErrorResponse)
    )
)]
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<impl IntoResponse, AppError> {
    // Validate refresh token
    let claims = state.jwt_service.validate_token(&payload.refresh_token)?;

    // Check if it's actually a refresh token
    if claims.role != "refresh" {
        return Err(AppError::auth("Invalid refresh token"));
    }

    // Verify token exists in database and is not revoked
    let token_hash = sha256_hash(&payload.refresh_token);
    let stored_token = queries::find_refresh_token(&state.pool, &token_hash).await?
        .ok_or_else(|| AppError::auth("Invalid or expired refresh token"))?;

    // Check if token belongs to the same user
    if stored_token.user_id != claims.sub {
        return Err(AppError::auth("Token mismatch"));
    }

    // Find user
    let user = queries::find_user_by_id(&state.pool, claims.sub).await?
        .ok_or_else(|| AppError::auth("User not found"))?;

    // Get user's default organization
    let orgs = queries::list_user_organizations(&state.pool, user.id).await?;
    let org_id = orgs.first().map(|org| org.id);

    // Generate new tokens
    let access_token = state.jwt_service.generate_access_token(
        user.id,
        org_id,
        "user",
    )?;
    let new_refresh_token = state.jwt_service.generate_refresh_token(user.id)?;

    // Revoke old token
    queries::revoke_refresh_token(&state.pool, stored_token.id).await?;

    // Store new refresh token
    let new_token_hash = sha256_hash(&new_refresh_token);
    let expires_at = Utc::now() + ChronoDuration::from_std(state.config.auth.refresh_token_duration)
        .map_err(|e| AppError::internal(format!("Invalid duration: {}", e)))?;
    queries::create_refresh_token(&state.pool, user.id, &new_token_hash, expires_at).await?;

    let response = AuthResponse {
        access_token,
        refresh_token: new_refresh_token,
        user: UserResponse::from(user),
    };

    Ok(Json(response))
}

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/health",
    tag = "认证",
    responses(
        (status = 200, description = "服务正常")
    )
)]
pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "timestamp": Utc::now().to_rfc3339(),
    }))
}
