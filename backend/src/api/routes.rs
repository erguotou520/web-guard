use axum::{
    Router,
    routing::{get, post, put, delete},
    Json,
};
use sqlx::PgPool;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

use crate::auth::{JwtService, auth_middleware};
use crate::api::handlers;
use crate::api::openapi::ApiDoc;
use crate::Config;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub jwt_service: JwtService,
    pub config: Config,
}

/// Handler to serve OpenAPI JSON
async fn openapi_json() -> Json<utoipa::openapi::OpenApi> {
    Json(ApiDoc::openapi())
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
        // OpenAPI JSON
        .route("/api-docs/openapi.json", get(openapi_json))
        // Auth routes
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/refresh", post(handlers::auth::refresh_token))
        // Public status page
        .route("/api/public/status/:org_slug", get(handlers::public::get_public_status));

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
        // Organization statistics and alerts
        .route("/api/organizations/:id/stats", get(handlers::organizations::get_organization_stats))
        .route("/api/organizations/:id/alerts", get(handlers::organizations::list_organization_alerts))
        // Domain routes
        .route("/api/domains", get(handlers::domains::list_domains))
        .route("/api/domains", post(handlers::domains::create_domain))
        .route("/api/domains/:id", get(handlers::domains::get_domain))
        .route("/api/domains/:id", put(handlers::domains::update_domain))
        .route("/api/domains/:id", delete(handlers::domains::delete_domain))
        // Domain statistics
        .route("/api/domains/:id/statistics", get(handlers::domains::get_domain_statistics))
        // Monitoring routes
        .route("/api/domains/:id/monitoring/uptime/latest", get(handlers::monitoring::get_latest_uptime))
        .route("/api/domains/:id/monitoring/ssl/latest", get(handlers::monitoring::get_latest_ssl))
        .route("/api/domains/:id/monitoring/uptime/history", get(handlers::monitoring::get_uptime_history))
        .route("/api/domains/:id/monitoring/uptime/aggregate", get(handlers::monitoring::get_uptime_aggregate))
        .route("/api/domains/:id/monitoring/check", post(handlers::monitoring::trigger_check))
        .route_layer(axum::middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Combine all routes with state
    Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .with_state(state)
}
