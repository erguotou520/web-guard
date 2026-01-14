use axum::{
    Router,
    routing::{get, post, put, delete},
};
use sqlx::PgPool;

use crate::auth::{JwtService, auth_middleware};
use crate::api::handlers;
use crate::Config;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_service: JwtService,
    pub config: Config,
}

/// Create the main application router
pub fn create_router(
    pool: PgPool,
    jwt_service: JwtService,
    config: Config,
) -> Router {
    let state = AppState {
        pool,
        jwt_service,
        config,
    };

    // Public routes (no auth required)
    let public_routes = Router::new()
        // Health check
        .route("/health", get(handlers::auth::health_check))
        // Auth routes
        .route("/auth/register", post(handlers::auth::register))
        .route("/auth/login", post(handlers::auth::login))
        .route("/auth/refresh", post(handlers::auth::refresh_token));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // Organization routes
        .route("/api/organizations", post(handlers::organizations::create_organization))
        .route("/api/organizations", get(handlers::organizations::list_organizations))
        .route("/api/organizations/:id", get(handlers::organizations::get_organization))
        .route("/api/organizations/:id", put(handlers::organizations::update_organization))
        .route("/api/organizations/:id", delete(handlers::organizations::delete_organization))
        .route("/api/organizations/:id/members", get(handlers::organizations::list_members))
        .route("/api/organizations/:id/members", post(handlers::organizations::add_member))
        .route("/api/organizations/:id/members/:user_id", delete(handlers::organizations::remove_member))
        .route("/api/organizations/:id/members/:user_id/role", put(handlers::organizations::update_member_role))
        // Domain routes
        .route("/api/domains", get(handlers::domains::list_domains))
        .route("/api/domains", post(handlers::domains::create_domain))
        .route("/api/domains/:id", get(handlers::domains::get_domain))
        .route("/api/domains/:id", put(handlers::domains::update_domain))
        .route("/api/domains/:id", delete(handlers::domains::delete_domain))
        .route_layer(axum::middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Combine all routes
    public_routes
        .merge(protected_routes)
        .with_state(state)
}
