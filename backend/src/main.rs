use std::time::Duration;
use tokio::net::TcpListener;
use tower_http::{
    trace::TraceLayer,
    cors::{CorsLayer, Any},
    compression::CompressionLayer,
};

use web_guard::{
    Config,
    JwtService,
    db::create_pool,
    api::create_router,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load configuration
    let config = Config::from_env()?;

    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .init();

    tracing::info!("Starting WebGuard v{}", env!("CARGO_PKG_VERSION"));
    tracing::info!("Configuration loaded successfully");

    // Create database connection pool
    tracing::info!("Connecting to database...");
    let pool = create_pool(&config).await?;
    tracing::info!("Database connection pool created");

    // Run database migrations
    tracing::info!("Running database migrations...");
    web_guard::db::run_migrations(&pool).await?;
    tracing::info!("Database migrations completed");

    // Create JWT service
    let jwt_service = JwtService::new(
        &config.auth.jwt_secret,
        config.auth.access_token_duration,
        config.auth.refresh_token_duration,
    );

    // Build application router
    let app = create_router(pool, jwt_service, config.clone())
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|_request: &axum::http::Request<_>| {
                    tracing::info_span!("http_request")
                })
                .on_response(|_response: &axum::http::Response<_>, latency: Duration, _span: &tracing::Span| {
                    _span.record("http.latency_ms", latency.as_millis());
                    tracing::info!("Response sent in {}ms", latency.as_millis())
                }),
        )
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .layer(CompressionLayer::new());

    // Bind to address
    let addr = config.server_address();
    let listener = TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on {}", addr);

    // Start server
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("Server shutdown complete");
    Ok(())
}

/// Wait for CTRL+C signal
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install CTRL+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("CTRL+C received, shutting down gracefully...");
        },
        _ = terminate => {
            tracing::info!("TERM signal received, shutting down gracefully...");
        },
    }
}
