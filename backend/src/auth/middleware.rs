use axum::{
    extract::{Request, State, Extension},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use crate::api::routes::AppState;

/// Context containing authenticated user information
#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: Uuid,
    pub org_id: Option<Uuid>,
    pub role: String,
}

/// Authentication middleware
///
/// Validates JWT token from Authorization header and adds auth context to request extensions
pub async fn auth_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Get Authorization header
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            header.trim_start_matches("Bearer ")
        }
        _ => {
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Validate token
    let claims = state.jwt_service
        .validate_token(token)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Check if it's a refresh token (refresh tokens shouldn't access API endpoints)
    if claims.role == "refresh" {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Add auth context to request extensions
    let auth_context = AuthContext {
        user_id: claims.sub,
        org_id: claims.org,
        role: claims.role,
    };

    request.extensions_mut().insert(auth_context);

    Ok(next.run(request).await)
}

/// Type alias for AuthContext Extension extractor
pub type AuthExtractor = Extension<AuthContext>;
